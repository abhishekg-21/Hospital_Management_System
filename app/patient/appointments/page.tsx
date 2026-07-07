/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react/jsx-key */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  department: string;
  experience: string;
  photo?: string;
  consultationFee: number;
  languages: string[];
  hospital: string;
  rating?: number;
}

interface Appointment {
  id: string;
  appointmentNumber: string;
  bookingDate: string;
  appointmentDate: string;
  appointmentTime: string;
  estimatedDuration: number;
  doctor: Doctor;
  consultationType: "online" | "inperson";
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no-show";
  paymentStatus: "paid" | "unpaid" | "refunded";
  consultationFee: number;
  visitReason: string;
  notes?: string;
  prescription?: string;
  followUpRecommendation?: string;
  meetingLink?: string;
}

interface AppointmentSummary {
  total: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  pending: number;
  nextAppointment?: Appointment;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface FilterState {
  search: string;
  status: string;
  consultationType: string;
  sortBy: string;
  page: number;
  limit: number;
}

interface BookingForm {
  department: string;
  doctorId: string;
  date: string;
  timeSlot: string;
  consultationType: "online" | "inperson";
  visitReason: string;
  files: File[];
}

type ModalType = "detail" | "book" | "cancel" | null;

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  confirmed: {
    label: "Confirmed",
    className:
      "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    dot: "bg-green-500",
  },
  pending: {
    label: "Pending",
    className:
      "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  completed: {
    label: "Completed",
    className:
      "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    dot: "bg-slate-400",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    dot: "bg-red-500",
  },
  "no-show": {
    label: "No-show",
    className:
      "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
    dot: "bg-orange-400",
  },
};

const PAYMENT_CONFIG: Record<string, { label: string; className: string }> = {
  paid: {
    label: "Paid",
    className:
      "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  unpaid: {
    label: "Unpaid",
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  refunded: {
    label: "Refunded",
    className:
      "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
};

const DEPARTMENTS = [
  "Cardiology",
  "Orthopedics",
  "Dermatology",
  "Neurology",
  "General Medicine",
  "Pediatrics",
  "Gynecology",
  "Ophthalmology",
  "ENT",
  "Psychiatry",
];

const CANCEL_REASONS = [
  "Schedule conflict",
  "Feeling better",
  "Doctor unavailable",
  "Personal reasons",
  "Financial reasons",
  "Other",
];

// ─── Utility helpers ──────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatFee(amount: number) {
  return "₹" + amount.toLocaleString("en-IN");
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter((_, i) => i > 0)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isUpcoming(dateStr: string) {
  return new Date(dateStr) >= new Date();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}
      role="status"
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}
        aria-hidden="true"
      />
      {cfg.label}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const cfg = PAYMENT_CONFIG[status] ?? PAYMENT_CONFIG.unpaid;
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function DoctorAvatar({
  doctor,
  size = "md",
}: {
  doctor: Doctor;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = {
    sm: "w-9 h-9 text-sm",
    md: "w-11 h-11 text-sm",
    lg: "w-16 h-16 text-lg",
  }[size];
  if (doctor.photo) {
    return (
      <img
        src={doctor.photo}
        alt={doctor.name}
        className={`${sizeClass} rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-semibold flex-shrink-0 border border-indigo-200 dark:border-indigo-800`}
      aria-hidden="true"
    >
      {getInitials(doctor.name)}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/5" />
        </div>
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-full w-20" />
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24" />
        <div className="flex gap-2">
          <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded w-16" />
          <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onBook }: { onBook: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <p className="text-base font-medium text-slate-700 dark:text-slate-300 mb-1">
        No appointments found
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        Adjust your filters or book a new appointment to get started.
      </p>
      <button
        onClick={onBook}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Book appointment
      </button>
    </div>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`relative w-full ${maxWidth} bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            aria-label="Close dialog"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

export default function Appointments() {
  // State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [summary, setSummary] = useState<AppointmentSummary | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 8,
    totalPages: 1,
  });
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "",
    consultationType: "",
    sortBy: "newest",
    page: 1,
    limit: 8,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"appointments" | "notifications">(
    "appointments",
  );
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Booking wizard state
  const [bookStep, setBookStep] = useState(1);
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [availableSlots, setAvailableSlots] = useState<
    { time: string; available: boolean }[]
  >([]);
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    department: "",
    doctorId: "",
    date: "",
    timeSlot: "",
    consultationType: "inperson",
    visitReason: "",
    files: [],
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(filters.page),
        limit: String(filters.limit),
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.consultationType && { type: filters.consultationType }),
        sortBy: filters.sortBy,
      });
      const res = await api.get(`/patient/appointments?${params}`);
      // Support both paginated { data, meta } and plain array responses
      if (Array.isArray(res.data)) {
        setAppointments(res.data);
        setPagination({
          total: res.data.length,
          page: 1,
          limit: filters.limit,
          totalPages: 1,
        });
      } else {
        setAppointments(res.data.data ?? res.data.appointments ?? []);
        if (res.data.meta || res.data.pagination) {
          setPagination(res.data.meta ?? res.data.pagination);
        }
      }
    } catch {
      setError("Failed to load appointments. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get("/patient/appointments/summary");
      setSummary(res.data);
    } catch {
      // Summary is non-critical — derive from list if endpoint is unavailable
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/patient/notifications");
      setNotifications(res.data ?? []);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchNotifications();
  }, [fetchSummary, fetchNotifications]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ── Filter helpers ──────────────────────────────────────────────────────────

  function handleSearchChange(value: string) {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setFilters((f) => ({ ...f, search: value, page: 1 }));
    }, 300);
  }

  function setFilter(key: keyof FilterState, value: string | number) {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  function openDetail(appt: Appointment) {
    setSelectedAppt(appt);
    setModal("detail");
  }

  function openCancel(appt: Appointment) {
    setSelectedAppt(appt);
    setCancelReason("");
    setModal("cancel");
  }

  async function executeCancel() {
    if (!selectedAppt) return;
    setCancelLoading(true);
    try {
      await api.patch(`/patient/appointments/${selectedAppt.id}/cancel`, {
        reason: cancelReason,
      });
      setModal(null);
      showToast("Appointment cancelled.");
      fetchAppointments();
      fetchSummary();
    } catch {
      showToast("Failed to cancel. Please try again.", "error");
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleReschedule(appt: Appointment) {
    setSelectedAppt(appt);
    setBookingForm({
      department: appt.doctor.department,
      doctorId: appt.doctor.id,
      date: "",
      timeSlot: "",
      consultationType: appt.consultationType,
      visitReason: appt.visitReason,
      files: [],
    });
    await loadDoctorsForDept(appt.doctor.department);
    setBookStep(2);
    setModal("book");
  }

  async function loadDoctorsForDept(dept: string) {
    if (!dept) {
      setAvailableDoctors([]);
      return;
    }
    try {
      const res = await api.get(`/patient/doctors?department=${dept}`);
      setAvailableDoctors(res.data ?? []);
    } catch {
      setAvailableDoctors([]);
    }
  }

  async function loadTimeSlots(doctorId: string, date: string) {
    if (!doctorId || !date) {
      setAvailableSlots([]);
      return;
    }
    try {
      const res = await api.get(
        `/patient/doctors/${doctorId}/availability?date=${date}`,
      );
      setAvailableSlots(res.data?.slots ?? []);
    } catch {
      setAvailableSlots([]);
    }
  }

  async function confirmBooking() {
    setBookingLoading(true);
    try {
      const formData = new FormData();
      formData.append("doctorId", bookingForm.doctorId);
      formData.append("date", bookingForm.date);
      formData.append("time", bookingForm.timeSlot);
      formData.append("consultationType", bookingForm.consultationType);
      formData.append("visitReason", bookingForm.visitReason);
      bookingForm.files.forEach((f) => formData.append("reports", f));
      await api.post("/patient/appointments", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setModal(null);
      showToast("Appointment booked — awaiting confirmation from the doctor.");
      fetchAppointments();
      fetchSummary();
    } catch {
      showToast("Failed to book appointment. Please try again.", "error");
    } finally {
      setBookingLoading(false);
    }
  }

  function downloadConfirmation(apptId: string) {
    api
      .get(`/patient/appointments/${apptId}/confirmation`, {
        responseType: "blob",
      })
      .then((res) => {
        const url = URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = `appointment-${apptId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => showToast("Download failed. Please try again.", "error"));
  }

  function addToCalendar(appt: Appointment) {
    const start = new Date(`${appt.appointmentDate}T${appt.appointmentTime}`);
    const end = new Date(start.getTime() + appt.estimatedDuration * 60000);
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Appointment: ${appt.doctor.name}`)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(appt.visitReason)}&location=${encodeURIComponent(appt.doctor.hospital)}`;
    window.open(url, "_blank", "noopener");
  }

  // ── Derived summary (fallback if API unavailable) ────────────────────────────

  const derivedSummary: AppointmentSummary = summary ?? {
    total: appointments.length,
    upcoming: appointments.filter(
      (a) =>
        ["confirmed", "pending"].includes(a.status) &&
        isUpcoming(a.appointmentDate),
    ).length,
    completed: appointments.filter((a) => a.status === "completed").length,
    cancelled: appointments.filter((a) => a.status === "cancelled").length,
    pending: appointments.filter((a) => a.status === "pending").length,
    nextAppointment: appointments.find(
      (a) =>
        ["confirmed", "pending"].includes(a.status) &&
        isUpcoming(a.appointmentDate),
    ),
  };

  const nextAppt = derivedSummary.nextAppointment;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              My appointments
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Manage your healthcare visits and consultations
            </p>
          </div>
          <button
            onClick={() => {
              setBookStep(1);
              setBookingForm({
                department: "",
                doctorId: "",
                date: "",
                timeSlot: "",
                consultationType: "inperson",
                visitReason: "",
                files: [],
              });
              setModal("book");
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Book appointment
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              label: "Total",
              value: derivedSummary.total,
              color: "text-slate-700 dark:text-slate-300",
            },
            {
              label: "Upcoming",
              value: derivedSummary.upcoming,
              color: "text-indigo-600 dark:text-indigo-400",
            },
            {
              label: "Completed",
              value: derivedSummary.completed,
              color: "text-green-600 dark:text-green-400",
            },
            {
              label: "Pending",
              value: derivedSummary.pending,
              color: "text-amber-600 dark:text-amber-400",
            },
            {
              label: "Cancelled",
              value: derivedSummary.cancelled,
              color: "text-red-600 dark:text-red-400",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4"
            >
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                {card.label}
              </p>
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Next appointment banner */}
        {nextAppt && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-4 sm:p-5 flex items-center gap-4 flex-wrap">
            <div className="w-11 h-11 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                Next appointment
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                {nextAppt.doctor.name} · {nextAppt.doctor.department}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {formatDate(nextAppt.appointmentDate)} ·{" "}
                {nextAppt.appointmentTime} ·{" "}
                {nextAppt.consultationType === "online"
                  ? "Online"
                  : "In-person"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {nextAppt.consultationType === "online" &&
                nextAppt.meetingLink && (
                  <a
                    href={nextAppt.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Join
                  </a>
                )}
              <button
                onClick={() => addToCalendar(nextAppt)}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add to calendar
              </button>
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 gap-0">
          {(["appointments", "notifications"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab}
              {tab === "notifications" && notifications.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs rounded-full">
                  {notifications.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Appointments tab */}
        {activeTab === "appointments" && (
          <section aria-label="Your appointments">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 mb-5">
              <div className="relative flex-1 min-w-[220px]">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="search"
                  placeholder="Search by doctor, department, or ID…"
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400"
                  onChange={(e) => handleSearchChange(e.target.value)}
                  aria-label="Search appointments"
                />
              </div>
              <select
                className="px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                onChange={(e) => setFilter("status", e.target.value)}
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no-show">No-show</option>
              </select>
              <select
                className="px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                onChange={(e) => setFilter("consultationType", e.target.value)}
                aria-label="Filter by consultation type"
              >
                <option value="">All types</option>
                <option value="online">Online</option>
                <option value="inperson">In-person</option>
              </select>
              <select
                className="px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                onChange={(e) => setFilter("sortBy", e.target.value)}
                aria-label="Sort appointments"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="date-asc">Date ascending</option>
              </select>
            </div>

            {/* Error state */}
            {error && (
              <div
                className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4"
                role="alert"
              >
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-400">
                  {error}
                </p>
                <button
                  onClick={fetchAppointments}
                  className="ml-auto text-sm font-medium text-red-700 dark:text-red-400 underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
            )}

            {/* List */}
            <div
              className="space-y-3"
              role="list"
              aria-label="Appointment list"
            >
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))
              ) : appointments.length === 0 ? (
                <EmptyState onBook={() => setModal("book")} />
              ) : (
                appointments.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    onOpenDetail={openDetail}
                    onCancel={openCancel}
                    onReschedule={handleReschedule}
                    onDownload={downloadConfirmation}
                    onAddToCalendar={addToCalendar}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && !loading && (
              <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  of {pagination.total}
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setFilter("page", filters.page - 1)}
                    disabled={filters.page === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  {Array.from({ length: pagination.totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setFilter("page", i + 1)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        i + 1 === filters.page
                          ? "bg-indigo-600 text-white"
                          : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                      aria-label={`Page ${i + 1}`}
                      aria-current={i + 1 === filters.page ? "page" : undefined}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setFilter("page", filters.page + 1)}
                    disabled={filters.page === pagination.totalPages}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Notifications tab */}
        {activeTab === "notifications" && (
          <section aria-label="Reminders and alerts">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
              Reminders and alerts
            </p>
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-12">
                No new notifications.
              </p>
            ) : (
              <div className="space-y-3">
                {notifications.map((n, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        n.type === "reminder"
                          ? "bg-amber-100 dark:bg-amber-900/30"
                          : n.type === "confirm"
                            ? "bg-green-100 dark:bg-green-900/30"
                            : "bg-red-100 dark:bg-red-900/30"
                      }`}
                    >
                      <span className="text-sm">
                        {n.type === "confirm"
                          ? "✓"
                          : n.type === "cancel"
                            ? "✕"
                            : "🔔"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {n.body}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {n.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* ── Appointment detail modal ─────────────────────────────────────────── */}
      <Modal
        open={modal === "detail"}
        onClose={() => setModal(null)}
        title="Appointment details"
        maxWidth="max-w-2xl"
      >
        {selectedAppt && (
          <>
            <div className="px-6 py-5 space-y-5">
              {/* Doctor profile */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <DoctorAvatar doctor={selectedAppt.doctor} size="lg" />
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {selectedAppt.doctor.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedAppt.doctor.department} ·{" "}
                    {selectedAppt.doctor.experience} experience
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                      {selectedAppt.doctor.hospital}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                      {formatFee(selectedAppt.doctor.consultationFee)}/visit
                    </span>
                    {selectedAppt.doctor.languages.map((l) => (
                      <span
                        key={l}
                        className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Appointment fields */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Appointment information
                </p>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[
                    {
                      key: "Appointment ID",
                      val: (
                        <span className="font-mono text-xs">
                          {selectedAppt.appointmentNumber}
                        </span>
                      ),
                    },
                    {
                      key: "Date & time",
                      val: `${formatDate(selectedAppt.appointmentDate)} · ${selectedAppt.appointmentTime}`,
                    },
                    {
                      key: "Duration",
                      val: `${selectedAppt.estimatedDuration} minutes`,
                    },
                    {
                      key: "Type",
                      val:
                        selectedAppt.consultationType === "online"
                          ? "Online consultation"
                          : "In-person visit",
                    },
                    {
                      key: "Status",
                      val: <StatusBadge status={selectedAppt.status} />,
                    },
                    { key: "Visit reason", val: selectedAppt.visitReason },
                    ...(selectedAppt.notes
                      ? [{ key: "Notes", val: selectedAppt.notes }]
                      : []),
                    ...(selectedAppt.followUpRecommendation
                      ? [
                          {
                            key: "Follow-up",
                            val: selectedAppt.followUpRecommendation,
                          },
                        ]
                      : []),
                  ].map(({ key, val }) => (
                    <div
                      key={key}
                      className="flex items-start justify-between gap-4 py-3"
                    >
                      <span className="text-sm text-slate-500 dark:text-slate-400 flex-shrink-0 min-w-[130px]">
                        {key}
                      </span>
                      <span className="text-sm text-slate-800 dark:text-slate-200 text-right flex-1">
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Payment
                </p>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Consultation fee
                    </span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {formatFee(selectedAppt.consultationFee)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Payment status
                    </span>
                    <PaymentBadge status={selectedAppt.paymentStatus} />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-2 justify-end">
              {selectedAppt.consultationType === "online" &&
                selectedAppt.status === "confirmed" &&
                selectedAppt.meetingLink && (
                  <a
                    href={selectedAppt.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Join consultation
                  </a>
                )}
              <button
                onClick={() => downloadConfirmation(selectedAppt.id)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium rounded-lg transition-colors"
              >
                Download
              </button>
              <button
                onClick={() => addToCalendar(selectedAppt)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium rounded-lg transition-colors"
              >
                Add to calendar
              </button>
              {["confirmed", "pending"].includes(selectedAppt.status) && (
                <button
                  onClick={() => {
                    setModal(null);
                    openCancel(selectedAppt);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel appointment
                </button>
              )}
            </div>
          </>
        )}
      </Modal>

      {/* ── Booking modal ────────────────────────────────────────────────────── */}
      <Modal
        open={modal === "book"}
        onClose={() => setModal(null)}
        title="Book an appointment"
        maxWidth="max-w-xl"
      >
        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 pt-5 pb-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  bookStep === step
                    ? "bg-indigo-600 text-white"
                    : bookStep > step
                      ? "bg-green-500 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                }`}
              >
                {bookStep > step ? "✓" : step}
              </div>
              {step < 3 && (
                <div
                  className={`flex-1 h-0.5 w-8 ${bookStep > step ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"}`}
                />
              )}
            </div>
          ))}
          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
            {bookStep === 1
              ? "Select doctor"
              : bookStep === 2
                ? "Choose time"
                : "Review & confirm"}
          </span>
        </div>

        <div className="px-6 pb-2">
          {/* Step 1 */}
          {bookStep === 1 && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="b-dept"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Department
                </label>
                <select
                  id="b-dept"
                  value={bookingForm.department}
                  onChange={async (e) => {
                    const dept = e.target.value;
                    setBookingForm((f) => ({
                      ...f,
                      department: dept,
                      doctorId: "",
                    }));
                    await loadDoctorsForDept(dept);
                  }}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="b-doc"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Doctor
                </label>
                <select
                  id="b-doc"
                  value={bookingForm.doctorId}
                  onChange={(e) =>
                    setBookingForm((f) => ({ ...f, doctorId: e.target.value }))
                  }
                  disabled={!bookingForm.department}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select doctor</option>
                  {availableDoctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {formatFee(d.consultationFee)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="b-type"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Consultation type
                </label>
                <select
                  id="b-type"
                  value={bookingForm.consultationType}
                  onChange={(e) =>
                    setBookingForm((f) => ({
                      ...f,
                      consultationType: e.target.value as "online" | "inperson",
                    }))
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="inperson">In-person visit</option>
                  <option value="online">Online consultation</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="b-reason"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Reason for visit
                </label>
                <textarea
                  id="b-reason"
                  rows={3}
                  value={bookingForm.visitReason}
                  onChange={(e) =>
                    setBookingForm((f) => ({
                      ...f,
                      visitReason: e.target.value,
                    }))
                  }
                  placeholder="Describe your symptoms or reason for the visit…"
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {bookStep === 2 && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="b-date"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Preferred date
                </label>
                <input
                  type="date"
                  id="b-date"
                  value={bookingForm.date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={async (e) => {
                    const date = e.target.value;
                    setBookingForm((f) => ({ ...f, date, timeSlot: "" }));
                    await loadTimeSlots(bookingForm.doctorId, date);
                  }}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              {availableSlots.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Available time slots
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() =>
                          setBookingForm((f) => ({ ...f, timeSlot: slot.time }))
                        }
                        className={`py-2 text-sm font-medium rounded-lg border transition-colors ${
                          bookingForm.timeSlot === slot.time
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : slot.available
                              ? "border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300"
                              : "border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed line-through"
                        }`}
                        aria-label={`${slot.time}${!slot.available ? " — unavailable" : ""}`}
                        aria-pressed={bookingForm.timeSlot === slot.time}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3 */}
          {bookStep === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Review your booking
                </p>
                {[
                  {
                    label: "Doctor",
                    val:
                      availableDoctors.find(
                        (d) => d.id === bookingForm.doctorId,
                      )?.name ?? bookingForm.doctorId,
                  },
                  { label: "Department", val: bookingForm.department },
                  {
                    label: "Date",
                    val: bookingForm.date ? formatDate(bookingForm.date) : "",
                  },
                  { label: "Time", val: bookingForm.timeSlot },
                  {
                    label: "Type",
                    val:
                      bookingForm.consultationType === "online"
                        ? "Online consultation"
                        : "In-person visit",
                  },
                  { label: "Reason", val: bookingForm.visitReason },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {label}
                    </span>
                    <span className="text-sm text-slate-800 dark:text-slate-200 text-right">
                      {val}
                    </span>
                  </div>
                ))}
              </div>
              <div>
                <label
                  htmlFor="b-files"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Upload previous reports{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="file"
                  id="b-files"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) =>
                    setBookingForm((f) => ({
                      ...f,
                      files: Array.from(e.target.files ?? []),
                    }))
                  }
                  className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-400"
                  aria-label="Upload previous medical reports"
                />
                <p className="text-xs text-slate-400 mt-1">
                  PDF, JPG, PNG up to 10 MB each
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between gap-2">
          <button
            onClick={() => {
              if (bookStep > 1) setBookStep(bookStep - 1);
              else setModal(null);
            }}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium rounded-lg transition-colors"
          >
            {bookStep === 1 ? "Cancel" : "Back"}
          </button>
          {bookStep < 3 ? (
            <button
              onClick={() => {
                if (
                  bookStep === 1 &&
                  (!bookingForm.department || !bookingForm.doctorId)
                ) {
                  showToast("Please select a department and doctor.", "error");
                  return;
                }
                if (bookStep === 2 && !bookingForm.timeSlot) {
                  showToast("Please select a time slot.", "error");
                  return;
                }
                setBookStep(bookStep + 1);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={confirmBooking}
              disabled={bookingLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {bookingLoading && (
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
              )}
              Confirm booking
            </button>
          )}
        </div>
      </Modal>

      {/* ── Cancel modal ─────────────────────────────────────────────────────── */}
      <Modal
        open={modal === "cancel"}
        onClose={() => setModal(null)}
        title="Cancel appointment"
        maxWidth="max-w-sm"
      >
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to cancel your appointment with{" "}
            <span className="font-medium text-slate-900 dark:text-white">
              {selectedAppt?.doctor.name}
            </span>{" "}
            on {selectedAppt ? formatDate(selectedAppt.appointmentDate) : ""}?
            This cannot be undone.
          </p>
          <div>
            <label
              htmlFor="cancel-reason"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Reason{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <select
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="">Select a reason</option>
              {CANCEL_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
          <button
            onClick={() => setModal(null)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium rounded-lg transition-colors"
          >
            Keep appointment
          </button>
          <button
            onClick={executeCancel}
            disabled={cancelLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {cancelLoading && (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            )}
            Cancel appointment
          </button>
        </div>
      </Modal>

      {/* ── Toast notification ───────────────────────────────────────────────── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-lg text-sm font-medium z-50 transition-all ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </main>
  );
}

// ─── Appointment card (extracted for clarity) ─────────────────────────────────

function AppointmentCard({
  appt,
  onOpenDetail,
  onCancel,
  onReschedule,
  onDownload,
  onAddToCalendar,
}: {
  appt: Appointment;
  onOpenDetail: (a: Appointment) => void;
  onCancel: (a: Appointment) => void;
  onReschedule: (a: Appointment) => void;
  onDownload: (id: string) => void;
  onAddToCalendar: (a: Appointment) => void;
}) {
  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
      role="listitem"
      tabIndex={0}
      onClick={() => onOpenDetail(appt)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail(appt);
        }
      }}
      aria-label={`Appointment with ${appt.doctor.name} on ${formatDate(appt.appointmentDate)}, status: ${appt.status}`}
    >
      <div className="flex items-start gap-3">
        <DoctorAvatar doctor={appt.doctor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {appt.doctor.name}
            </span>
            <StatusBadge status={appt.status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {appt.doctor.department}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {formatDate(appt.appointmentDate)}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {appt.appointmentTime}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                appt.consultationType === "online"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {appt.consultationType === "online" ? "Online" : "In-person"}
            </span>
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex-wrap gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-mono text-xs text-slate-400">
            {appt.appointmentNumber}
          </span>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {formatFee(appt.consultationFee)}
          </span>
          <PaymentBadge status={appt.paymentStatus} />
        </div>

        <div
          className="flex items-center gap-1.5 flex-wrap"
          role="group"
          aria-label={`Actions for ${appt.doctor.name}`}
        >
          {appt.consultationType === "online" &&
            appt.status === "confirmed" &&
            appt.meetingLink && (
              <a
                href={appt.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
                aria-label="Join online consultation"
              >
                Join
              </a>
            )}
          {["confirmed", "pending"].includes(appt.status) && (
            <button
              onClick={() => onReschedule(appt)}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors"
              aria-label="Reschedule appointment"
            >
              Reschedule
            </button>
          )}
          {["confirmed", "pending"].includes(appt.status) && (
            <button
              onClick={() => onCancel(appt)}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium rounded-lg transition-colors"
              aria-label="Cancel appointment"
            >
              Cancel
            </button>
          )}
          {appt.status === "completed" && (
            <button
              onClick={() => onDownload(appt.id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors"
              aria-label="Download receipt"
            >
              Receipt
            </button>
          )}
          <button
            onClick={() => onAddToCalendar(appt)}
            className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors"
            aria-label="Add to calendar"
          >
            + Calendar
          </button>
        </div>
      </div>
    </div>
  );
}
