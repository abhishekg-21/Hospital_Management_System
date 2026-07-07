/**
 * patientAppointmentController.js
 *
 * Handles all patient-facing appointment endpoints.
 * Assumes Express + Mongoose (or Sequelize — swap model calls accordingly).
 * Auth middleware populates req.user.id with the authenticated patient's ID.
 *
 * Route wiring example (appointments.routes.js):
 *   router.get("/",                    authenticate, getAppointments);
 *   router.get("/summary",             authenticate, getAppointmentSummary);
 *   router.get("/:id",                 authenticate, getAppointmentById);
 *   router.get("/:id/confirmation",    authenticate, downloadConfirmation);
 *   router.post("/",                   authenticate, upload.array("reports",5), bookAppointment);
 *   router.patch("/:id/cancel",        authenticate, cancelAppointment);
 *   router.patch("/:id/reschedule",    authenticate, rescheduleAppointment);
 *   router.get("/doctors",             authenticate, getDoctors);
 *   router.get("/doctors/:id/availability", authenticate, getDoctorAvailability);
 *   router.get("/notifications",       authenticate, getNotifications);
 */

const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const Notification = require("../models/Notification");
const { generateAppointmentPDF } = require("../services/pdfService");
const { sendAppointmentEmail } = require("../services/emailService");
const { createCalendarEvent } = require("../services/calendarService");
const { uploadToStorage } = require("../services/storageService");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no-show",
];
const ALLOWED_TYPES = ["online", "inperson"];
const ALLOWED_SORT = {
  newest: { appointmentDate: -1, createdAt: -1 },
  oldest: { appointmentDate: 1, createdAt: 1 },
  "date-asc": { appointmentDate: 1 },
};
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 50;

// ─── Helper: enforce patient owns the appointment ─────────────────────────────

async function assertOwnership(appointmentId, patientId) {
  const appt = await Appointment.findById(appointmentId).lean();
  if (!appt) throw new AppError("Appointment not found.", 404);
  if (String(appt.patient) !== String(patientId)) {
    throw new AppError(
      "You do not have permission to access this appointment.",
      403,
    );
  }
  return appt;
}

// ─── GET /patient/appointments ────────────────────────────────────────────────

/**
 * List appointments for the authenticated patient with search, filter, sort,
 * and server-side pagination.
 *
 * Query params:
 *   page           number   default 1
 *   limit          number   default 8, max 50
 *   search         string   matched against doctor name, department, appointment number
 *   status         string   one of ALLOWED_STATUSES
 *   type           string   "online" | "inperson"
 *   sortBy         string   "newest" | "oldest" | "date-asc"
 *   dateFrom       ISO date filter start
 *   dateTo         ISO date filter end
 */
const getAppointments = catchAsync(async (req, res) => {
  const patientId = req.user.id;

  // Pagination
  const page = Math.max(1, parseInt(req.query.page) || DEFAULT_PAGE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT),
  );
  const skip = (page - 1) * limit;

  // Build match stage
  const match = { patient: patientId };

  if (req.query.status && ALLOWED_STATUSES.includes(req.query.status)) {
    match.status = req.query.status;
  }

  if (req.query.type && ALLOWED_TYPES.includes(req.query.type)) {
    match.consultationType = req.query.type;
  }

  if (req.query.dateFrom || req.query.dateTo) {
    match.appointmentDate = {};
    if (req.query.dateFrom)
      match.appointmentDate.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo)
      match.appointmentDate.$lte = new Date(req.query.dateTo);
  }

  const sort = ALLOWED_SORT[req.query.sortBy] || ALLOWED_SORT.newest;

  // Text search — applied after populating doctor
  const search = (req.query.search || "").trim().toLowerCase();

  // Fetch with doctor populated
  let query = Appointment.find(match)
    .sort(sort)
    .populate(
      "doctor",
      "name specialization department experience photo consultationFee languages hospital rating",
    )
    .lean();

  // If no text search, use DB-level pagination for efficiency
  if (!search) {
    const [appointments, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Appointment.countDocuments(match),
    ]);
    return res.json({
      data: appointments.map(formatAppointment),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }

  // With text search, fetch a larger set then filter in JS
  // (Use MongoDB Atlas Search or a $lookup + $search stage in production for scale)
  const allMatching = await query;
  const filtered = allMatching.filter((a) => {
    const doctor = a.doctor || {};
    return (
      (doctor.name || "").toLowerCase().includes(search) ||
      (doctor.department || "").toLowerCase().includes(search) ||
      (a.appointmentNumber || "").toLowerCase().includes(search)
    );
  });

  const total = filtered.length;
  const page_data = filtered.slice(skip, skip + limit);

  res.json({
    data: page_data.map(formatAppointment),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
});

// ─── GET /patient/appointments/summary ───────────────────────────────────────

/**
 * Returns stat-card counts and the next upcoming appointment.
 * This is a cheap aggregation — safe to call on every page load.
 */
const getAppointmentSummary = catchAsync(async (req, res) => {
  const patientId = req.user.id;
  const now = new Date();

  const [counts, nextAppointment] = await Promise.all([
    Appointment.aggregate([
      { $match: { patient: patientId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
    Appointment.findOne({
      patient: patientId,
      status: { $in: ["confirmed", "pending"] },
      appointmentDate: { $gte: now },
    })
      .sort({ appointmentDate: 1 })
      .populate("doctor", "name department photo consultationFee hospital")
      .lean(),
  ]);

  // Pivot the aggregate into a flat object
  const summary = {
    total: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0,
    pending: 0,
  };
  for (const row of counts) {
    summary.total += row.count;
    if (row._id === "completed") summary.completed = row.count;
    if (row._id === "cancelled") summary.cancelled = row.count;
    if (row._id === "pending") summary.pending = row.count;
    if (["confirmed", "pending"].includes(row._id))
      summary.upcoming += row.count;
  }

  res.json({
    ...summary,
    nextAppointment: nextAppointment
      ? formatAppointment(nextAppointment)
      : null,
  });
});

// ─── GET /patient/appointments/:id ───────────────────────────────────────────

/**
 * Fetch full detail for a single appointment.
 * Enforces ownership — patients can only see their own appointments.
 */
const getAppointmentById = catchAsync(async (req, res) => {
  await assertOwnership(req.params.id, req.user.id);

  const appt = await Appointment.findById(req.params.id)
    .populate(
      "doctor",
      "name specialization department experience photo consultationFee languages hospital rating",
    )
    .populate("patient", "name dateOfBirth phone email")
    .lean();

  res.json(formatAppointment(appt));
});

// ─── POST /patient/appointments ───────────────────────────────────────────────

/**
 * Book a new appointment.
 * Body (multipart/form-data):
 *   doctorId         string  required
 *   date             ISO     required
 *   time             string  required  e.g. "10:30 AM"
 *   consultationType string  required
 *   visitReason      string  required
 *   reports          files   optional, up to 5
 */
const bookAppointment = catchAsync(async (req, res) => {
  const patientId = req.user.id;
  const { doctorId, date, time, consultationType, visitReason } = req.body;

  // Input validation
  if (!doctorId || !date || !time || !consultationType || !visitReason) {
    throw new AppError(
      "doctorId, date, time, consultationType, and visitReason are required.",
      400,
    );
  }
  if (!ALLOWED_TYPES.includes(consultationType)) {
    throw new AppError("consultationType must be 'online' or 'inperson'.", 400);
  }

  const appointmentDate = new Date(date);
  if (isNaN(appointmentDate.getTime()) || appointmentDate < new Date()) {
    throw new AppError("Appointment date must be a valid future date.", 400);
  }

  // Verify doctor exists
  const doctor = await Doctor.findById(doctorId).lean();
  if (!doctor) throw new AppError("Doctor not found.", 404);

  // Check slot availability (assumes availability model — adjust to your schema)
  const slotTaken = await Appointment.exists({
    doctor: doctorId,
    appointmentDate,
    appointmentTime: time,
    status: { $in: ["confirmed", "pending"] },
  });
  if (slotTaken) {
    throw new AppError(
      "This time slot is no longer available. Please choose another.",
      409,
    );
  }

  // Upload any attached reports
  const reportUrls = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      // Validate type and size server-side
      const allowed = ["application/pdf", "image/jpeg", "image/png"];
      if (!allowed.includes(file.mimetype)) {
        throw new AppError(`Unsupported file type: ${file.originalname}`, 415);
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new AppError(
          `File too large: ${file.originalname} (max 10 MB)`,
          413,
        );
      }
      const url = await uploadToStorage(file, `appointments/${patientId}`);
      reportUrls.push(url);
    }
  }

  // Generate a human-readable appointment number
  const count = await Appointment.countDocuments({ patient: patientId });
  const appointmentNumber = `APT-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const newAppt = await Appointment.create({
    patient: patientId,
    doctor: doctorId,
    appointmentNumber,
    bookingDate: new Date(),
    appointmentDate,
    appointmentTime: time,
    estimatedDuration: doctor.defaultDuration || 30,
    consultationType,
    consultationFee: doctor.consultationFee,
    visitReason: visitReason.trim().slice(0, 500),
    status: "pending",
    paymentStatus: "unpaid",
    medicalReports: reportUrls,
  });

  // Async side-effects (fire-and-forget — don't block the response)
  Promise.allSettled([
    sendAppointmentEmail({
      patientId,
      doctorId,
      appointment: newAppt,
      type: "booked",
    }),
    createNotification(
      patientId,
      "Appointment booked",
      `Your appointment with Dr. ${doctor.name} on ${date} at ${time} is pending confirmation.`,
      "info",
    ),
  ]).catch(console.error);

  res.status(201).json({
    message: "Appointment booked successfully and is pending confirmation.",
    appointment: formatAppointment(await newAppt.populate("doctor")),
  });
});

// ─── PATCH /patient/appointments/:id/cancel ───────────────────────────────────

/**
 * Cancel an appointment.
 * Body:
 *   reason  string  optional
 */
const cancelAppointment = catchAsync(async (req, res) => {
  const appt = await assertOwnership(req.params.id, req.user.id);

  if (!["confirmed", "pending"].includes(appt.status)) {
    throw new AppError(
      `Cannot cancel an appointment with status '${appt.status}'.`,
      400,
    );
  }

  // Cancellation window check — e.g. no cancellations within 2 hours
  const now = new Date();
  const apptDateTime = new Date(
    `${appt.appointmentDate.toDateString()} ${appt.appointmentTime}`,
  );
  if (apptDateTime - now < 2 * 60 * 60 * 1000) {
    throw new AppError(
      "Appointments cannot be cancelled within 2 hours of the scheduled time.",
      400,
    );
  }

  const updated = await Appointment.findByIdAndUpdate(
    req.params.id,
    {
      status: "cancelled",
      cancelledAt: now,
      cancellationReason: (req.body.reason || "").trim().slice(0, 200),
      cancelledBy: "patient",
    },
    { new: true },
  )
    .populate("doctor", "name department")
    .lean();

  // Async side-effects
  Promise.allSettled([
    sendAppointmentEmail({
      patientId: req.user.id,
      appointment: updated,
      type: "cancelled",
    }),
    createNotification(
      req.user.id,
      "Appointment cancelled",
      `Your appointment with Dr. ${updated.doctor.name} has been cancelled.`,
      "warning",
    ),
  ]).catch(console.error);

  res.json({
    message: "Appointment cancelled.",
    appointment: formatAppointment(updated),
  });
});

// ─── PATCH /patient/appointments/:id/reschedule ───────────────────────────────

/**
 * Reschedule an existing appointment.
 * Body:
 *   date  ISO string  required
 *   time  string      required
 */
const rescheduleAppointment = catchAsync(async (req, res) => {
  const appt = await assertOwnership(req.params.id, req.user.id);

  if (!["confirmed", "pending"].includes(appt.status)) {
    throw new AppError(
      `Cannot reschedule an appointment with status '${appt.status}'.`,
      400,
    );
  }

  const { date, time } = req.body;
  if (!date || !time) throw new AppError("date and time are required.", 400);

  const newDate = new Date(date);
  if (isNaN(newDate.getTime()) || newDate < new Date()) {
    throw new AppError("Rescheduled date must be a valid future date.", 400);
  }

  // Check new slot availability
  const slotTaken = await Appointment.exists({
    _id: { $ne: req.params.id },
    doctor: appt.doctor,
    appointmentDate: newDate,
    appointmentTime: time,
    status: { $in: ["confirmed", "pending"] },
  });
  if (slotTaken)
    throw new AppError(
      "That slot is already taken. Please choose another.",
      409,
    );

  const updated = await Appointment.findByIdAndUpdate(
    req.params.id,
    {
      appointmentDate: newDate,
      appointmentTime: time,
      status: "pending", // reset to pending until doctor re-confirms
      rescheduledAt: new Date(),
      rescheduledBy: "patient",
    },
    { new: true },
  )
    .populate("doctor", "name department")
    .lean();

  Promise.allSettled([
    sendAppointmentEmail({
      patientId: req.user.id,
      appointment: updated,
      type: "rescheduled",
    }),
    createNotification(
      req.user.id,
      "Appointment rescheduled",
      `Your appointment with Dr. ${updated.doctor.name} has been moved to ${date} at ${time}.`,
      "info",
    ),
  ]).catch(console.error);

  res.json({
    message: "Appointment rescheduled. Awaiting confirmation from the doctor.",
    appointment: formatAppointment(updated),
  });
});

// ─── GET /patient/appointments/:id/confirmation ───────────────────────────────

/**
 * Stream a PDF confirmation for a specific appointment.
 */
const downloadConfirmation = catchAsync(async (req, res) => {
  await assertOwnership(req.params.id, req.user.id);

  const appt = await Appointment.findById(req.params.id)
    .populate("doctor", "name department hospital")
    .populate("patient", "name email phone")
    .lean();

  const pdfBuffer = await generateAppointmentPDF(appt);

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="appointment-${appt.appointmentNumber}.pdf"`,
    "Content-Length": pdfBuffer.length,
    "Cache-Control": "private, no-cache",
  });
  res.end(pdfBuffer);
});

// ─── GET /patient/doctors ─────────────────────────────────────────────────────

/**
 * List available doctors, optionally filtered by department.
 * Query params:
 *   department  string
 *   search      string
 */
const getDoctors = catchAsync(async (req, res) => {
  const filter = { isActive: true };

  if (req.query.department) {
    filter.department = req.query.department;
  }

  if (req.query.search) {
    const q = req.query.search.trim();
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { specialization: { $regex: q, $options: "i" } },
    ];
  }

  const doctors = await Doctor.find(filter)
    .select(
      "name specialization department experience photo consultationFee languages hospital rating defaultDuration",
    )
    .sort({ rating: -1, name: 1 })
    .lean();

  res.json(doctors);
});

// ─── GET /patient/doctors/:id/availability ────────────────────────────────────

/**
 * Return time slots for a doctor on a given date.
 * Query params:
 *   date  ISO date  required
 */
const getDoctorAvailability = catchAsync(async (req, res) => {
  const { date } = req.query;
  if (!date) throw new AppError("date query param is required.", 400);

  const doctorId = req.params.id;

  const doctor = await Doctor.findById(doctorId).lean();
  if (!doctor) throw new AppError("Doctor not found.", 404);

  const targetDate = new Date(date);
  if (isNaN(targetDate.getTime()))
    throw new AppError("Invalid date format.", 400);

  // Get already-booked slots for that day
  const bookedSlots = await Appointment.find({
    doctor: doctorId,
    appointmentDate: targetDate,
    status: { $in: ["confirmed", "pending"] },
  })
    .select("appointmentTime")
    .lean();

  const bookedTimes = new Set(bookedSlots.map((a) => a.appointmentTime));

  // Generate slots from doctor's working hours (default: 9 AM – 5 PM, 30-min intervals)
  const workStart = doctor.workStartHour ?? 9;
  const workEnd = doctor.workEndHour ?? 17;
  const slotMins = doctor.slotDuration ?? 30;
  const breakStart = doctor.breakStartHour ?? 13;
  const breakEnd = doctor.breakEndHour ?? 14;

  const slots = [];
  const now = new Date();

  for (let h = workStart; h < workEnd; h++) {
    for (let m = 0; m < 60; m += slotMins) {
      // Skip lunch break
      if (h >= breakStart && h < breakEnd) continue;

      const slotDate = new Date(targetDate);
      slotDate.setHours(h, m, 0, 0);

      const label = slotDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const available = !bookedTimes.has(label) && slotDate > now;

      slots.push({ time: label, available });
    }
  }

  res.json({ date, doctorId, slots });
});

// ─── GET /patient/notifications ──────────────────────────────────────────────

/**
 * Return appointment-related notifications for the patient.
 */
const getNotifications = catchAsync(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user.id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  res.json(notifications);
});

// ─── Internal helper: create a notification record ────────────────────────────

async function createNotification(recipientId, title, body, type = "info") {
  try {
    await Notification.create({ recipient: recipientId, title, body, type });
  } catch (err) {
    console.error("Failed to create notification:", err.message);
  }
}

// ─── Format helper: shape appointment for frontend ────────────────────────────

function formatAppointment(appt) {
  if (!appt) return null;
  const doc = appt.doctor || {};
  return {
    id: String(appt._id),
    appointmentNumber: appt.appointmentNumber,
    bookingDate: appt.bookingDate,
    appointmentDate: appt.appointmentDate,
    appointmentTime: appt.appointmentTime,
    estimatedDuration: appt.estimatedDuration,
    consultationType: appt.consultationType,
    status: appt.status,
    paymentStatus: appt.paymentStatus,
    consultationFee: appt.consultationFee,
    visitReason: appt.visitReason,
    notes: appt.notes ?? null,
    prescription: appt.prescription ?? null,
    followUpRecommendation: appt.followUpRecommendation ?? null,
    meetingLink: appt.meetingLink ?? null,
    medicalReports: appt.medicalReports ?? [],
    doctor: {
      id: String(doc._id ?? ""),
      name: doc.name ?? "",
      specialization: doc.specialization ?? "",
      department: doc.department ?? "",
      experience: doc.experience ?? "",
      photo: doc.photo ?? null,
      consultationFee: doc.consultationFee ?? appt.consultationFee,
      languages: doc.languages ?? [],
      hospital: doc.hospital ?? "",
      rating: doc.rating ?? null,
    },
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getAppointments,
  getAppointmentSummary,
  getAppointmentById,
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  downloadConfirmation,
  getDoctors,
  getDoctorAvailability,
  getNotifications,
};
