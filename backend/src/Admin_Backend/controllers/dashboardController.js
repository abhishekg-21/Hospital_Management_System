/* eslint-disable @typescript-eslint/no-require-imports */
// backend/src/Admin_Backend/controllers/dashboardController.js

const prisma = require("../../database/prisma");

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const ok = (res, data, message = "Success", status = 200) =>
  res.status(status).json({ success: true, message, data });

const fail = (res, message = "Something went wrong", status = 500) =>
  res.status(status).json({ success: false, message });

const dayStart = (d = new Date()) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};
const dayEnd = (d = new Date()) => {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
};

const weekStart = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const monthStart = () => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/* ─── LEGACY ENDPOINT — kept 100% intact ─────────────────────────────────
   GET /api/dashboard/stats
   The original frontend calls this. We keep it working exactly as before
   so nothing breaks during the migration to the new summary endpoint.
─────────────────────────────────────────────────────────────────────────── */

exports.getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalDoctors, totalPatients, totalReceptionists] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: "DOCTOR" } }),
        prisma.patient.count(),
        prisma.user.count({ where: { role: "RECEPTIONIST" } }),
      ]);

    res.json({ totalUsers, totalDoctors, totalPatients, totalReceptionists });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ─── MAIN DASHBOARD SUMMARY ──────────────────────────────────────────────
   GET /api/dashboard/summary
   Single aggregated call — replaces 3 s polling with one efficient query.
   All Prisma calls run in parallel via Promise.all so response time is
   bounded by the slowest single query, not their sum.
─────────────────────────────────────────────────────────────────────────── */

exports.getDashboardSummary = async (req, res) => {
  try {
    const now = new Date();
    const tS = dayStart(now);
    const tE = dayEnd(now);
    const wS = weekStart();
    const mS = monthStart();

    /* ── Run everything in parallel ──────────────────────────────────── */
    const [
      /* Counts */
      totalPatients,
      totalDoctors,
      totalDepartments,
      totalUsers,

      /* Appointment buckets */
      apptToday,
      apptWeek,
      apptMonth,
      apptPending,
      apptConfirmed,
      apptCompleted,
      apptCancelled,

      /* New patients */
      newPatientsToday,
      newPatientsWeek,
      newPatientsMonth,

      /* Billing */
      billingMonth,

      /* Today's appointments with patient + doctor */
      todaySchedule,

      /* Top 5 doctors by appointment count */
      topDoctorRows,

      /* Department doctor counts */
      departments,

      /* Last 7 days appointment counts for sparkline */
      last7Days,

      /* Recent activity — last 8 appointments created */
      recentActivity,
    ] = await Promise.all([
      /* ── Core counts ── */
      prisma.patient.count(),
      prisma.doctor.count(),
      prisma.department.count(),
      prisma.user.count(),

      /* ── Appointment buckets ── */
      prisma.appointment.count({ where: { date: { gte: tS, lte: tE } } }),
      prisma.appointment.count({ where: { date: { gte: wS } } }),
      prisma.appointment.count({ where: { date: { gte: mS } } }),
      prisma.appointment.count({ where: { status: "PENDING" } }),
      prisma.appointment.count({ where: { status: "CONFIRMED" } }),
      prisma.appointment.count({ where: { status: "COMPLETED" } }),
      prisma.appointment.count({ where: { status: "CANCELLED" } }),

      /* ── New patients ── */
      prisma.patient.count({ where: { createdAt: { gte: tS, lte: tE } } }),
      prisma.patient.count({ where: { createdAt: { gte: wS } } }),
      prisma.patient.count({ where: { createdAt: { gte: mS } } }),

      /* ── Billing this month (sum of paidAmount) ── */
      prisma.bill.aggregate({
        _sum: { paidAmount: true, totalAmount: true },
        where: { createdAt: { gte: mS } },
      }),

      /* ── Today's schedule (first 10 by time) ── */
      prisma.appointment.findMany({
        where: { date: { gte: tS, lte: tE } },
        include: {
          patient: {
            select: { firstName: true, lastName: true, patientCode: true },
          },
          doctor: { select: { name: true, specialization: true } },
        },
        orderBy: { time: "asc" },
        take: 10,
      }),

      /* ── Top doctors — appointments this month ── */
      prisma.appointment.groupBy({
        by: ["doctorId"],
        where: { date: { gte: mS } },
        _count: { _all: true },
        orderBy: { _count: { doctorId: "desc" } },
        take: 5,
      }),

      /* ── Departments with doctor counts ── */
      prisma.department.findMany({
        include: {
          _count: { select: { doctors: true } },
        },
        orderBy: { name: "asc" },
      }),

      /* ── Last 7 days appointment counts ── */
      (async () => {
        const results = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setUTCDate(d.getUTCDate() - i);
          const count = await prisma.appointment.count({
            where: { date: { gte: dayStart(d), lte: dayEnd(d) } },
          });
          results.push({
            date: d.toISOString().slice(0, 10),
            label: d.toLocaleDateString("en-US", { weekday: "short" }),
            count,
          });
        }
        return results;
      })(),

      /* ── Recent appointments (activity feed) ── */
      prisma.appointment.findMany({
        include: {
          patient: { select: { firstName: true, lastName: true } },
          doctor: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

    /* ── Hydrate top doctors with names ── */
    const doctorIds = topDoctorRows.map((r) => r.doctorId);
    const doctorDetails = await prisma.doctor.findMany({
      where: { id: { in: doctorIds } },
      select: { id: true, name: true, specialization: true, doctorCode: true },
    });
    const docMap = Object.fromEntries(doctorDetails.map((d) => [d.id, d]));

    const topDoctors = topDoctorRows.map((r) => ({
      doctor: docMap[r.doctorId] ?? { name: "Unknown", specialization: "" },
      appointmentCount: r._count._all,
    }));

    /* ── Appointment status distribution (for pie chart) ── */
    const apptTotal =
      apptPending + apptConfirmed + apptCompleted + apptCancelled;
    const statusDistribution = [
      { label: "Pending", count: apptPending, color: "#f59e0b" },
      { label: "Confirmed", count: apptConfirmed, color: "#6366f1" },
      { label: "Completed", count: apptCompleted, color: "#22c55e" },
      { label: "Cancelled", count: apptCancelled, color: "#ef4444" },
    ];

    /* ── Assemble response ── */
    return ok(res, {
      /* Snapshot counts */
      overview: {
        totalPatients,
        totalDoctors,
        totalDepartments,
        totalUsers,
      },

      /* Appointment metrics */
      appointments: {
        today: apptToday,
        week: apptWeek,
        month: apptMonth,
        pending: apptPending,
        confirmed: apptConfirmed,
        completed: apptCompleted,
        cancelled: apptCancelled,
        total: apptTotal,
        statusDistribution,
      },

      /* Patient growth */
      patients: {
        newToday: newPatientsToday,
        newWeek: newPatientsWeek,
        newMonth: newPatientsMonth,
      },

      /* Revenue */
      billing: {
        collectedMonth: billingMonth._sum.paidAmount ?? 0,
        totalBilledMonth: billingMonth._sum.totalAmount ?? 0,
      },

      /* Charts */
      last7Days,

      /* Lists */
      todaySchedule,
      topDoctors,
      departments: departments.map((d) => ({
        id: d.id,
        name: d.name,
        doctorCount: d._count.doctors,
      })),
      recentActivity,
    });
  } catch (error) {
    console.error("[getDashboardSummary]", error);
    return fail(res, error.message);
  }
};
