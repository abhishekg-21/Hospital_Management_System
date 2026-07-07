/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface Department {
  id: string;
  name: string;
}

interface Doctor {
  id: string;
  doctorCode: string;
  name: string;
  email: string;
  specialization: string;
  experience: number;
  qualification: string | null;
  phone: string;
  gender: string | null;
  address: string | null;
  departmentId: string;
  department: Department;
  createdAt: string;
}

interface DoctorStats {
  totalAppointments: number;
  completedAppointments: number;
  totalPatients: number;
}

interface SlotInfo {
  time: string;
  available: boolean;
  status: string | null;
  patient: string | null;
}

interface Toast {
  id: string;
  type: "success" | "error" | "warning";
  message: string;
}

type ModalMode = "create" | "edit" | "view";
type SortField = "name" | "experience" | "createdAt" | "specialization";
type SortOrder = "asc" | "desc";

/* ─── Constants ───────────────────────────────────────────────────────────── */

const API_DOCTORS = "http://localhost:5000/api/doctors";
const API_DEPARTMENTS = "http://localhost:5000/api/departments";

const GENDERS = ["Male", "Female", "Other"];

const SPECIALIZATIONS = [
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Gynecology",
  "Dermatology",
  "Ophthalmology",
  "ENT",
  "Psychiatry",
  "Radiology",
  "Anesthesiology",
  "Urology",
  "Gastroenterology",
  "Endocrinology",
  "Pulmonology",
  "Nephrology",
  "Oncology",
  "General Surgery",
  "Internal Medicine",
  "Emergency Medicine",
];

const QUALIFICATIONS = [
  "MBBS",
  "MD",
  "MS",
  "DM",
  "MCh",
  "DNB",
  "FRCS",
  "MRCP",
  "PhD",
  "BDS",
  "MDS",
];

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EMPTY_FORM = {
  name: "",
  email: "",
  specialization: "",
  experience: "",
  qualification: "",
  phone: "",
  gender: "",
  address: "",
  departmentId: "",
  /* UI-only fields not yet in schema — submitted to frontend state only */
  workingDays: [] as string[], // e.g. ["Mon","Tue","Wed"]
  slotStart: "09:00",
  slotEnd: "17:00",
};

type FormData = typeof EMPTY_FORM;
type FormErrors = Partial<
  Record<keyof Omit<FormData, "workingDays" | "slotStart" | "slotEnd">, string>
>;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const genId = () => Math.random().toString(36).slice(2);

/* ─── Toast ───────────────────────────────────────────────────────────────── */

function ToastContainer({
  toasts,
  remove,
}: {
  toasts: Toast[];
  remove: (id: string) => void;
}) {
  const pal = {
    success: { border: "#22c55e", icon: "✓", bg: "#f0fdf4" },
    error: { border: "#ef4444", icon: "✕", bg: "#fef2f2" },
    warning: { border: "#f59e0b", icon: "⚠", bg: "#fffbeb" },
  };
  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const p = pal[t.type];
        return (
          <div
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: p.bg,
              border: `1.5px solid ${p.border}`,
              borderLeft: `4px solid ${p.border}`,
              borderRadius: 10,
              padding: "12px 16px",
              minWidth: 280,
              maxWidth: 380,
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              pointerEvents: "all",
              animation: "slideIn 0.2s ease",
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: p.border,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {p.icon}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 13.5,
                color: "#1e293b",
                fontWeight: 500,
              }}
            >
              {t.message}
            </span>
            <button
              onClick={() => remove(t.id)}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "#94a3b8",
                fontSize: 14,
                padding: 0,
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Skeleton ────────────────────────────────────────────────────────────── */

function Skeleton({ w = "100%", h = 14 }: { w?: string | number; h?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 6,
        background:
          "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
      }}
    />
  );
}

/* ─── Avatar ──────────────────────────────────────────────────────────────── */

function DoctorAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const colors = [
    "#6366f1",
    "#0ea5e9",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.35,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

/* ─── Badge ───────────────────────────────────────────────────────────────── */

function Badge({ label, color }: { label: string; color: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    blue: { bg: "#dbeafe", text: "#1d4ed8" },
    pink: { bg: "#fce7f3", text: "#9d174d" },
    purple: { bg: "#f3e8ff", text: "#6d28d9" },
    green: { bg: "#dcfce7", text: "#15803d" },
    yellow: { bg: "#fef9c3", text: "#a16207" },
    gray: { bg: "#f1f5f9", text: "#475569" },
  };
  const s = map[color] || map.gray;
  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

/* ─── Step Indicator ──────────────────────────────────────────────────────── */

function StepIndicator({
  step,
  total,
  labels,
}: {
  step: number;
  total: number;
  labels: string[];
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "0 28px 20px",
      }}
    >
      {labels.map((label, i) => {
        const num = i + 1;
        const done = num < step;
        const active = num === step;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              flex: i < total - 1 ? 1 : 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: done || active ? "#6366f1" : "#f1f5f9",
                  color: done || active ? "#fff" : "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  border: active ? "2px solid #6366f1" : "none",
                  transition: "all 0.2s",
                }}
              >
                {done ? "✓" : num}
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: active ? "#6366f1" : "#94a3b8",
                  fontWeight: active ? 700 : 400,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </div>
            {i < total - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: done ? "#6366f1" : "#f1f5f9",
                  margin: "0 8px",
                  marginBottom: 18,
                  transition: "background 0.2s",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Slot Availability Visual ────────────────────────────────────────────── */

function SlotGrid({ slots }: { slots: SlotInfo[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {slots.map((slot) => (
        <div
          key={slot.time}
          title={slot.patient ? `Booked: ${slot.patient}` : "Available"}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: `1.5px solid ${slot.available ? "#bbf7d0" : "#fecaca"}`,
            background: slot.available ? "#f0fdf4" : "#fff5f5",
            color: slot.available ? "#15803d" : "#b91c1c",
            fontSize: 12.5,
            fontWeight: 500,
            cursor: "default",
          }}
        >
          {slot.time}
          <span style={{ marginLeft: 6, fontSize: 10 }}>
            {slot.available ? "✓" : "✕"}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Doctor View Panel ───────────────────────────────────────────────────── */

function DoctorViewPanel({
  doctor,
  stats,
  slots,
  slotsDate,
  onSlotsDateChange,
  loadingSlots,
}: {
  doctor: Doctor;
  stats: DoctorStats | null;
  slots: SlotInfo[];
  slotsDate: string;
  onSlotsDateChange: (d: string) => void;
  loadingSlots: boolean;
}) {
  const stat = (
    icon: string,
    label: string,
    value: number | string,
    color: string,
  ) => (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "16px 18px",
        border: "1px solid #f1f5f9",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );

  const row = (label: string, value: string | number | null | undefined) =>
    value ? (
      <div
        style={{
          display: "flex",
          padding: "8px 0",
          borderBottom: "1px solid #f8fafc",
          fontSize: 13.5,
        }}
      >
        <span style={{ color: "#64748b", width: 160, flexShrink: 0 }}>
          {label}
        </span>
        <span style={{ fontWeight: 600, color: "#1e293b" }}>{value}</span>
      </div>
    ) : null;

  return (
    <div
      style={{
        padding: "4px 28px 28px",
        overflowY: "auto",
        maxHeight: "calc(90vh - 80px)",
      }}
    >
      {/* Header card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
          borderRadius: 14,
          padding: "20px 24px",
          marginBottom: 20,
          color: "#fff",
        }}
      >
        <DoctorAvatar name={doctor.name} size={56} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{doctor.name}</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
            {doctor.specialization} · {doctor.department?.name}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            {doctor.doctorCode}
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {stat("📋", "Total Appts", stats.totalAppointments, "#6366f1")}
          {stat("✅", "Completed", stats.completedAppointments, "#10b981")}
          {stat("👥", "Patients", stats.totalPatients, "#0ea5e9")}
        </div>
      )}

      {/* Details */}
      <div
        style={{
          background: "#f8fafc",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#374151",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 10,
          }}
        >
          Professional Details
        </div>
        {row("Qualification", doctor.qualification)}
        {row(
          "Experience",
          doctor.experience ? `${doctor.experience} years` : null,
        )}
        {row("Email", doctor.email)}
        {row("Phone", doctor.phone)}
        {row("Gender", doctor.gender)}
        {row("Address", doctor.address)}
      </div>

      {/* Slot viewer */}
      <div
        style={{
          background: "#f8fafc",
          borderRadius: 12,
          padding: "16px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#374151",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Slot Availability
          </div>
          <input
            type="date"
            value={slotsDate}
            onChange={(e) => onSlotsDateChange(e.target.value)}
            style={{
              border: "1.5px solid #e2e8f0",
              borderRadius: 8,
              padding: "5px 10px",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>
        {loadingSlots ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} w={80} h={34} />
            ))}
          </div>
        ) : slots.length > 0 ? (
          <SlotGrid slots={slots} />
        ) : (
          <div
            style={{
              color: "#94a3b8",
              fontSize: 13,
              textAlign: "center",
              padding: 16,
            }}
          >
            Select a date to view slot availability
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Doctor Form (multi-step) ────────────────────────────────────────────── */

const STEP_LABELS = ["Personal Info", "Professional", "Schedule"];

function DoctorForm({
  mode,
  initial,
  editId,
  departments,
  onClose,
  onSuccess,
  addToast,
}: {
  mode: "create" | "edit";
  initial: FormData;
  editId?: string;
  departments: Department[];
  onClose: () => void;
  onSuccess: (doctor: Doctor, isEdit: boolean) => void;
  addToast: (type: Toast["type"], msg: string) => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const set =
    (k: keyof FormData) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      setErrors((err) => ({ ...err, [k]: "" }));
    };

  const toggleDay = (day: string) => {
    setForm((f) => ({
      ...f,
      workingDays: f.workingDays.includes(day)
        ? f.workingDays.filter((d) => d !== day)
        : [...f.workingDays, day],
    }));
  };

  /* ── Step 1 validation ── */
  const validateStep1 = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.phone.trim()) e.phone = "Phone is required";
    if (!form.gender) e.gender = "Gender is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Step 2 validation ── */
  const validateStep2 = (): boolean => {
    const e: FormErrors = {};
    if (!form.specialization) e.specialization = "Specialization is required";
    if (!form.departmentId) e.departmentId = "Department is required";
    if (form.experience === "") e.experience = "Experience is required";
    else {
      const exp = Number(form.experience);
      if (isNaN(exp) || exp < 0 || exp > 70)
        e.experience = "Enter a valid number (0–70)";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(s + 1, 3));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) {
      setStep(1);
      return;
    }
    setSaving(true);
    try {
      /* Only send schema-supported fields to the backend */
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        gender: form.gender || undefined,
        specialization: form.specialization,
        experience: Number(form.experience),
        qualification: form.qualification || undefined,
        departmentId: form.departmentId,
        address: form.address || undefined,
      };

      let doctor: Doctor;
      if (mode === "edit" && editId) {
        const resp = await axios.put(`${API_DOCTORS}/${editId}`, payload, {
          headers: authHeaders(),
        });
        doctor = resp.data?.data ?? resp.data;
        addToast("success", `Dr. ${doctor.name} updated successfully`);
      } else {
        const resp = await axios.post(API_DOCTORS, payload, {
          headers: authHeaders(),
        });
        doctor = resp.data?.data ?? resp.data;
        addToast("success", `Dr. ${doctor.name} added successfully`);
      }

      onSuccess(doctor, mode === "edit");
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Operation failed. Please try again.";
      addToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  /* ── Field style helpers ── */
  const inp = (key: keyof FormErrors): React.CSSProperties => ({
    width: "100%",
    border: `1.5px solid ${errors[key] ? "#ef4444" : "#e2e8f0"}`,
    borderRadius: 9,
    padding: "9px 12px",
    fontSize: 13.5,
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    transition: "border 0.15s",
  });

  const lbl = (text: string, required = false) => (
    <label
      style={{
        display: "block",
        fontSize: 12,
        fontWeight: 600,
        color: "#374151",
        marginBottom: 5,
      }}
    >
      {text}
      {required && <span style={{ color: "#ef4444" }}> *</span>}
    </label>
  );

  const errMsg = (key: keyof FormErrors) =>
    errors[key] ? (
      <span
        style={{
          color: "#ef4444",
          fontSize: 11.5,
          marginTop: 3,
          display: "block",
        }}
      >
        {errors[key]}
      </span>
    ) : null;

  const row2 = (children: React.ReactNode) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 14,
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );

  /* ── Step panels ── */
  const step1 = (
    <>
      {row2(
        <>
          <div>
            {lbl("Full Name", true)}
            <input
              value={form.name}
              onChange={set("name")}
              style={inp("name")}
              placeholder="Dr. John Smith"
            />
            {errMsg("name")}
          </div>
          <div>
            {lbl("Email", true)}
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              style={inp("email")}
              placeholder="doctor@hospital.com"
            />
            {errMsg("email")}
          </div>
        </>,
      )}
      {row2(
        <>
          <div>
            {lbl("Phone", true)}
            <input
              type="tel"
              value={form.phone}
              onChange={set("phone")}
              style={inp("phone")}
            />
            {errMsg("phone")}
          </div>
          <div>
            {lbl("Gender", true)}
            <select
              value={form.gender}
              onChange={set("gender")}
              style={{ ...inp("gender"), appearance: "auto" as any }}
            >
              <option value="">Select gender</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            {errMsg("gender")}
          </div>
        </>,
      )}
      <div style={{ marginBottom: 14 }}>
        {lbl("Address")}
        <textarea
          value={form.address}
          onChange={set("address")}
          rows={2}
          style={{ ...inp("address"), resize: "vertical" }}
        />
      </div>
    </>
  );

  const step2 = (
    <>
      {row2(
        <>
          <div>
            {lbl("Specialization", true)}
            <select
              value={form.specialization}
              onChange={set("specialization")}
              style={{ ...inp("specialization"), appearance: "auto" as any }}
            >
              <option value="">Select specialization</option>
              {SPECIALIZATIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errMsg("specialization")}
          </div>
          <div>
            {lbl("Department", true)}
            <select
              value={form.departmentId}
              onChange={set("departmentId")}
              style={{ ...inp("departmentId"), appearance: "auto" as any }}
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {errMsg("departmentId")}
          </div>
        </>,
      )}
      {row2(
        <>
          <div>
            {lbl("Qualification")}
            <select
              value={form.qualification}
              onChange={set("qualification")}
              style={{ ...inp("qualification"), appearance: "auto" as any }}
            >
              <option value="">Select qualification</option>
              {QUALIFICATIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>
          <div>
            {lbl("Experience (years)", true)}
            <input
              type="number"
              min={0}
              max={70}
              value={form.experience}
              onChange={set("experience")}
              style={inp("experience")}
              placeholder="e.g. 8"
            />
            {errMsg("experience")}
          </div>
        </>,
      )}
    </>
  );

  const step3 = (
    <>
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#374151",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 10,
          }}
        >
          Working Days
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {WEEK_DAYS.map((day) => {
            const active = form.workingDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: `1.5px solid ${active ? "#6366f1" : "#e2e8f0"}`,
                  background: active ? "#6366f1" : "#fff",
                  color: active ? "#fff" : "#374151",
                  fontSize: 13,
                  fontWeight: active ? 700 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>
          ℹ️ Working days are stored locally for display. A dedicated schedule
          schema column will be needed for full persistence.
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#374151",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 10,
          }}
        >
          Consultation Hours
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 5,
              }}
            >
              Start Time
            </label>
            <input
              type="time"
              value={form.slotStart}
              onChange={set("slotStart")}
              style={{
                width: "100%",
                border: "1.5px solid #e2e8f0",
                borderRadius: 9,
                padding: "9px 12px",
                fontSize: 13.5,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 5,
              }}
            >
              End Time
            </label>
            <input
              type="time"
              value={form.slotEnd}
              onChange={set("slotEnd")}
              style={{
                width: "100%",
                border: "1.5px solid #e2e8f0",
                borderRadius: 9,
                padding: "9px 12px",
                fontSize: 13.5,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div
        style={{
          background: "#f8faff",
          border: "1.5px solid #e0e7ff",
          borderRadius: 12,
          padding: "16px 18px",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#6366f1",
            marginBottom: 10,
          }}
        >
          Profile Summary
        </div>
        {[
          ["Name", form.name],
          ["Email", form.email],
          ["Phone", form.phone],
          ["Gender", form.gender],
          ["Specialization", form.specialization],
          ["Experience", form.experience ? `${form.experience} yrs` : ""],
          ["Qualification", form.qualification],
          ["Working Days", form.workingDays.join(", ") || "Not set"],
          [
            "Hours",
            form.slotStart && form.slotEnd
              ? `${form.slotStart} – ${form.slotEnd}`
              : "",
          ],
        ].map(([label, val]) =>
          val ? (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 0",
                fontSize: 13,
              }}
            >
              <span style={{ color: "#64748b" }}>{label}</span>
              <span
                style={{
                  fontWeight: 600,
                  color: "#1e293b",
                  maxWidth: "55%",
                  textAlign: "right",
                }}
              >
                {val}
              </span>
            </div>
          ) : null,
        )}
      </div>
    </>
  );

  return (
    <>
      <StepIndicator step={step} total={3} labels={STEP_LABELS} />

      <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 20px" }}>
        {step === 1 && step1}
        {step === 2 && step2}
        {step === 3 && step3}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "14px 28px",
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          justifyContent: "space-between",
          background: "#fff",
          gap: 12,
        }}
      >
        <button
          onClick={step === 1 ? onClose : prevStep}
          style={{
            border: "1.5px solid #e2e8f0",
            borderRadius: 10,
            background: "#fff",
            padding: "9px 22px",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500,
            color: "#374151",
          }}
        >
          {step === 1 ? "Cancel" : "← Back"}
        </button>

        {step < 3 ? (
          <button
            onClick={nextStep}
            style={{
              border: "none",
              borderRadius: 10,
              background: "#6366f1",
              color: "#fff",
              padding: "9px 22px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              border: "none",
              borderRadius: 10,
              background: saving ? "#a5b4fc" : "#6366f1",
              color: "#fff",
              padding: "9px 22px",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 700,
              minWidth: 140,
            }}
          >
            {saving
              ? "Saving…"
              : mode === "edit"
                ? "Save Changes"
                : "Create Doctor"}
          </button>
        )}
      </div>
    </>
  );
}

/* ─── Modal Wrapper ───────────────────────────────────────────────────────── */

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          width: "100%",
          maxWidth: 640,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          animation: "popIn 0.22s ease",
        }}
      >
        <div
          style={{
            padding: "22px 28px 18px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: "#1e293b",
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                style={{ margin: "4px 0 0", fontSize: 12.5, color: "#94a3b8" }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#f1f5f9",
              borderRadius: 8,
              width: 34,
              height: 34,
              cursor: "pointer",
              fontSize: 16,
              color: "#64748b",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Delete Confirm ──────────────────────────────────────────────────────── */

function DeleteConfirm({
  doctor,
  onConfirm,
  onCancel,
  deleting,
}: {
  doctor: Doctor;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1001,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 32,
          maxWidth: 400,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
          animation: "popIn 0.22s ease",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#fee2e2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: 24,
          }}
        >
          🗑️
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "#1e293b" }}>
          Delete Doctor?
        </h3>
        <p
          style={{
            color: "#64748b",
            fontSize: 14,
            marginBottom: 24,
            lineHeight: 1.6,
          }}
        >
          Are you sure you want to remove <strong>{doctor.name}</strong> (
          {doctor.doctorCode})? This cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={onCancel}
            style={{
              border: "1.5px solid #e2e8f0",
              borderRadius: 10,
              background: "#fff",
              padding: "9px 22px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{
              border: "none",
              borderRadius: 10,
              background: deleting ? "#fca5a5" : "#ef4444",
              color: "#fff",
              padding: "9px 22px",
              cursor: deleting ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {deleting ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sort Icon ───────────────────────────────────────────────────────────── */

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  return (
    <span
      style={{
        marginLeft: 4,
        fontSize: 10,
        color: active ? "#6366f1" : "#cbd5e1",
      }}
    >
      {active ? (order === "asc" ? "▲" : "▼") : "⇅"}
    </span>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */

export default function DoctorsPage() {
  /* ── Data ── */
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Filters ── */
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  /* ── Modal ── */
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [modalInitial, setModalInitial] = useState<FormData>({ ...EMPTY_FORM });
  const [editId, setEditId] = useState<string | undefined>();
  const [viewDoctor, setViewDoctor] = useState<Doctor | null>(null);
  const [viewStats, setViewStats] = useState<DoctorStats | null>(null);
  const [viewSlots, setViewSlots] = useState<SlotInfo[]>([]);
  const [viewSlotsDate, setViewSlotsDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [loadingSlots, setLoadingSlots] = useState(false);

  /* ── Delete ── */
  const [deleteTarget, setDeleteTarget] = useState<Doctor | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Toasts ── */
  const [toasts, setToasts] = useState<Toast[]>([]);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = genId();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const removeToast = useCallback(
    (id: string) => setToasts((t) => t.filter((x) => x.id !== id)),
    [],
  );

  /* ── Fetch doctors ── */
  const fetchDoctors = useCallback(
    async (params?: {
      search?: string;
      dept?: string;
      gender?: string;
      page?: number;
      sortBy?: SortField;
      sortOrder?: SortOrder;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const p = params || {};
        const resp = await axios.get(API_DOCTORS, {
          headers: authHeaders(),
          params: {
            search: p.search ?? search,
            departmentId: p.dept ?? deptFilter,
            gender: p.gender ?? genderFilter,
            page: p.page ?? page,
            limit: LIMIT,
            sortBy: p.sortBy ?? sortBy,
            sortOrder: p.sortOrder ?? sortOrder,
          },
        });

        const body = resp.data;
        /* Handle both legacy raw array and new envelope */
        if (Array.isArray(body)) {
          setDoctors(body);
          setTotal(body.length);
        } else if (body?.success && body?.data?.doctors) {
          setDoctors(body.data.doctors);
          setTotal(body.data.pagination?.total ?? body.data.doctors.length);
        } else if (Array.isArray(body?.data)) {
          setDoctors(body.data);
          setTotal(body.data.length);
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message || "Failed to load doctors.";
        setError(msg);
        addToast("error", msg);
      } finally {
        setLoading(false);
      }
    },
    [search, deptFilter, genderFilter, page, sortBy, sortOrder, addToast],
  );

  /* ── Fetch departments ── */
  const fetchDepartments = useCallback(async () => {
    try {
      const resp = await axios.get(API_DEPARTMENTS, { headers: authHeaders() });
      const body = resp.data;
      if (Array.isArray(body)) setDepartments(body);
      else if (body?.success && Array.isArray(body?.data))
        setDepartments(body.data);
    } catch {
      addToast(
        "warning",
        "Could not load departments. The department selector may be empty.",
      );
    }
  }, [addToast]);

  useEffect(() => {
    fetchDoctors();
    fetchDepartments();
  }, [page, sortBy, sortOrder, deptFilter, genderFilter]);

  /* Debounced search */
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      fetchDoctors({ search, page: 1 });
    }, 400);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search]);

  /* ── Fetch slots for view panel ── */
  const fetchSlots = useCallback(async (doctorId: string, date: string) => {
    if (!doctorId || !date) return;
    setLoadingSlots(true);
    try {
      const resp = await axios.get(`${API_DOCTORS}/${doctorId}/slots`, {
        headers: authHeaders(),
        params: { date },
      });
      setViewSlots(resp.data?.data?.slots ?? []);
    } catch {
      setViewSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (viewDoctor) fetchSlots(viewDoctor.id, viewSlotsDate);
  }, [viewSlotsDate, viewDoctor, fetchSlots]);

  /* ── Sorting ── */
  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  /* ── Modal helpers ── */
  const openCreate = () => {
    setModalInitial({ ...EMPTY_FORM });
    setEditId(undefined);
    setModalMode("create");
  };

  const openEdit = (doctor: Doctor) => {
    setModalInitial({
      name: doctor.name,
      email: doctor.email,
      specialization: doctor.specialization,
      experience: String(doctor.experience),
      qualification: doctor.qualification ?? "",
      phone: doctor.phone,
      gender: doctor.gender ?? "",
      address: doctor.address ?? "",
      departmentId: doctor.departmentId,
      workingDays: [],
      slotStart: "09:00",
      slotEnd: "17:00",
    });
    setEditId(doctor.id);
    setModalMode("edit");
  };

  const openView = async (doctor: Doctor) => {
    setViewDoctor(doctor);
    setViewStats(null);
    setViewSlots([]);
    setModalMode("view");
    try {
      const resp = await axios.get(`${API_DOCTORS}/${doctor.id}`, {
        headers: authHeaders(),
      });
      const data = resp.data?.data ?? resp.data;
      setViewStats(data.stats ?? null);
    } catch {
      /* stats unavailable is non-fatal */
    }
    fetchSlots(doctor.id, viewSlotsDate);
  };

  /* ── After create/edit success ── */
  const handleSuccess = (doctor: Doctor, isEdit: boolean) => {
    if (isEdit) {
      setDoctors((prev) => prev.map((d) => (d.id === doctor.id ? doctor : d)));
    } else {
      setDoctors((prev) => [doctor, ...prev]);
      setTotal((t) => t + 1);
    }
  };

  /* ── Delete ── */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_DOCTORS}/${deleteTarget.id}`, {
        headers: authHeaders(),
      });
      setDoctors((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setTotal((t) => t - 1);
      addToast("success", `Dr. ${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
    } catch (err: any) {
      addToast(
        "error",
        err?.response?.data?.message || "Failed to delete doctor.",
      );
    } finally {
      setDeleting(false);
    }
  };

  /* ── Render ── */
  const clearFilters = () => {
    setSearch("");
    setDeptFilter("");
    setGenderFilter("");
    setPage(1);
  };
  const hasFilters = search || deptFilter || genderFilter;

  const thStyle = (field: SortField): React.CSSProperties => ({
    padding: "13px 16px",
    textAlign: "left",
    fontSize: 11.5,
    fontWeight: 700,
    color: sortBy === field ? "#6366f1" : "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    background: "#f8fafc",
    borderBottom: "1px solid #f1f5f9",
  });
  const thPlain: React.CSSProperties = {
    padding: "13px 16px",
    textAlign: "left",
    fontSize: 11.5,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
    background: "#f8fafc",
    borderBottom: "1px solid #f1f5f9",
  };

  const totalPages = Math.ceil(total / LIMIT) || 1;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "'Inter','Segoe UI',sans-serif",
      }}
    >
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes slideIn { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes popIn   { from{transform:scale(0.9);opacity:0} to{transform:scale(1);opacity:1} }
        * { box-sizing: border-box; }
        input:focus, select:focus, textarea:focus { border-color:#6366f1!important; outline:none; }
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:#f1f5f9;border-radius:3px}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
      `}</style>

      <ToastContainer toasts={toasts} remove={removeToast} />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 28,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 800,
                color: "#1e293b",
                letterSpacing: "-0.02em",
              }}
            >
              Doctors
            </h1>
            <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>
              {loading
                ? "Loading…"
                : `${total} doctor${total !== 1 ? "s" : ""} registered`}
            </p>
          </div>
          <button
            onClick={openCreate}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "11px 22px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
              boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
              transition: "transform 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "translateY(-1px)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
          >
            <span style={{ fontSize: 18 }}>+</span> Add Doctor
          </button>
        </div>

        {/* ── Stats Cards ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
            gap: 14,
            marginBottom: 24,
          }}
        >
          {[
            {
              label: "Total",
              value: total,
              icon: "🩺",
              color: "#6366f1",
              bg: "#eef2ff",
            },
            {
              label: "Departments",
              value: departments.length,
              icon: "🏥",
              color: "#0ea5e9",
              bg: "#e0f2fe",
            },
            {
              label: "Male",
              value: doctors.filter((d) => d.gender === "Male").length,
              icon: "👨‍⚕️",
              color: "#10b981",
              bg: "#d1fae5",
            },
            {
              label: "Female",
              value: doctors.filter((d) => d.gender === "Female").length,
              icon: "👩‍⚕️",
              color: "#ec4899",
              bg: "#fce7f3",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: "16px 20px",
                boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                border: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#94a3b8",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 5,
                  }}
                >
                  {s.label}
                </div>
                {loading ? (
                  <Skeleton w={40} h={26} />
                ) : (
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: s.color,
                      lineHeight: 1,
                    }}
                  >
                    {s.value}
                  </div>
                )}
              </div>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: s.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                {s.icon}
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            padding: "14px 18px",
            marginBottom: 18,
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            border: "1px solid #f1f5f9",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 15,
                color: "#94a3b8",
              }}
            >
              🔍
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, specialization, code…"
              style={{
                width: "100%",
                border: "1.5px solid #e2e8f0",
                borderRadius: 10,
                padding: "9px 12px 9px 36px",
                fontSize: 13.5,
                outline: "none",
              }}
            />
          </div>
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            style={{
              border: "1.5px solid #e2e8f0",
              borderRadius: 10,
              padding: "9px 14px",
              fontSize: 13.5,
              background: "#fff",
              outline: "none",
              cursor: "pointer",
              color: "#374151",
            }}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value);
              setPage(1);
            }}
            style={{
              border: "1.5px solid #e2e8f0",
              borderRadius: 10,
              padding: "9px 14px",
              fontSize: 13.5,
              background: "#fff",
              outline: "none",
              cursor: "pointer",
              color: "#374151",
            }}
          >
            <option value="">All Genders</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{
                border: "1.5px solid #e2e8f0",
                borderRadius: 10,
                background: "#fff",
                padding: "9px 14px",
                cursor: "pointer",
                fontSize: 13,
                color: "#64748b",
              }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            border: "1px solid #f1f5f9",
            overflow: "hidden",
          }}
        >
          {error ? (
            <div
              style={{
                padding: "56px 24px",
                textAlign: "center",
                color: "#ef4444",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                Failed to load doctors
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
                {error}
              </div>
              <button
                onClick={() => fetchDoctors()}
                style={{
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 10,
                  background: "#fff",
                  padding: "9px 20px",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Try Again
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 820,
                }}
              >
                <thead>
                  <tr>
                    <th style={thPlain}>Doctor</th>
                    <th style={thPlain}>Department</th>
                    <th
                      style={thStyle("specialization")}
                      onClick={() => toggleSort("specialization")}
                    >
                      Specialization{" "}
                      <SortIcon
                        active={sortBy === "specialization"}
                        order={sortOrder}
                      />
                    </th>
                    <th
                      style={thStyle("experience")}
                      onClick={() => toggleSort("experience")}
                    >
                      Exp{" "}
                      <SortIcon
                        active={sortBy === "experience"}
                        order={sortOrder}
                      />
                    </th>
                    <th style={thPlain}>Phone</th>
                    <th style={thPlain}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #f8fafc" }}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} style={{ padding: "16px" }}>
                            <Skeleton />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : doctors.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div
                          style={{
                            padding: "56px 24px",
                            textAlign: "center",
                            color: "#94a3b8",
                          }}
                        >
                          <div style={{ fontSize: 48, marginBottom: 12 }}>
                            {search ? "🔍" : "🩺"}
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 500 }}>
                            {search
                              ? `No doctors match "${search}"`
                              : "No doctors registered yet"}
                          </div>
                          {!search && (
                            <button
                              onClick={openCreate}
                              style={{
                                marginTop: 16,
                                border: "none",
                                borderRadius: 10,
                                background: "#6366f1",
                                color: "#fff",
                                padding: "9px 20px",
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: 600,
                              }}
                            >
                              Add First Doctor
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    doctors.map((doctor) => (
                      <tr
                        key={doctor.id}
                        style={{
                          borderTop: "1px solid #f8fafc",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#fafbff")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <td style={{ padding: "14px 16px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <DoctorAvatar name={doctor.name} size={38} />
                            <div>
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: 13.5,
                                  color: "#1e293b",
                                }}
                              >
                                {doctor.name}
                              </div>
                              <div
                                style={{
                                  fontSize: 11.5,
                                  color: "#94a3b8",
                                  marginTop: 1,
                                }}
                              >
                                {doctor.doctorCode}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <Badge
                            label={doctor.department?.name ?? "—"}
                            color="blue"
                          />
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            fontSize: 13.5,
                            color: "#374151",
                          }}
                        >
                          {doctor.specialization}
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            fontSize: 13.5,
                            color: "#374151",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {doctor.experience} yrs
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            fontSize: 13.5,
                            color: "#374151",
                          }}
                        >
                          {doctor.phone}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => openView(doctor)}
                              title="View profile"
                              style={{
                                border: "1.5px solid #e2e8f0",
                                borderRadius: 8,
                                background: "#fff",
                                color: "#64748b",
                                padding: "5px 10px",
                                cursor: "pointer",
                                fontSize: 13,
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#f1f5f9";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#fff";
                              }}
                            >
                              👁
                            </button>
                            <button
                              onClick={() => openEdit(doctor)}
                              title="Edit"
                              style={{
                                border: "1.5px solid #fef9c3",
                                borderRadius: 8,
                                background: "#fefce8",
                                color: "#a16207",
                                padding: "5px 10px",
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: 600,
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#fef08a";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#fefce8";
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setDeleteTarget(doctor)}
                              title="Delete"
                              style={{
                                border: "1.5px solid #fee2e2",
                                borderRadius: 8,
                                background: "#fff5f5",
                                color: "#ef4444",
                                padding: "5px 10px",
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: 600,
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#fee2e2";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#fff5f5";
                              }}
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && totalPages > 1 && (
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 13, color: "#64748b" }}>
                Showing {Math.min((page - 1) * LIMIT + 1, total)}–
                {Math.min(page * LIMIT, total)} of {total}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 8,
                    background: page <= 1 ? "#f8fafc" : "#fff",
                    color: page <= 1 ? "#cbd5e1" : "#374151",
                    padding: "7px 14px",
                    cursor: page <= 1 ? "not-allowed" : "pointer",
                    fontSize: 13,
                  }}
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) =>
                  Math.max(1, Math.min(page - 2 + i, totalPages)),
                )
                  .filter((p, i, arr) => arr.indexOf(p) === i)
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{
                        border: `1.5px solid ${page === p ? "#6366f1" : "#e2e8f0"}`,
                        borderRadius: 8,
                        background: page === p ? "#6366f1" : "#fff",
                        color: page === p ? "#fff" : "#374151",
                        padding: "7px 12px",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: page === p ? 700 : 400,
                        minWidth: 36,
                      }}
                    >
                      {p}
                    </button>
                  ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 8,
                    background: page >= totalPages ? "#f8fafc" : "#fff",
                    color: page >= totalPages ? "#cbd5e1" : "#374151",
                    padding: "7px 14px",
                    cursor: page >= totalPages ? "not-allowed" : "pointer",
                    fontSize: 13,
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {!loading && !error && doctors.length > 0 && totalPages <= 1 && (
            <div
              style={{
                padding: "10px 20px",
                borderTop: "1px solid #f1f5f9",
                fontSize: 12.5,
                color: "#94a3b8",
              }}
            >
              {doctors.length} doctor{doctors.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {(modalMode === "create" || modalMode === "edit") && (
        <Modal
          title={modalMode === "create" ? "Add New Doctor" : "Edit Doctor"}
          subtitle={
            modalMode === "create"
              ? "Complete all steps to register a doctor"
              : "Update doctor information"
          }
          onClose={() => setModalMode(null)}
        >
          <DoctorForm
            mode={modalMode}
            initial={modalInitial}
            editId={editId}
            departments={departments}
            onClose={() => setModalMode(null)}
            onSuccess={handleSuccess}
            addToast={addToast}
          />
        </Modal>
      )}

      {/* ── View Modal ── */}
      {modalMode === "view" && viewDoctor && (
        <Modal
          title={`Dr. ${viewDoctor.name}`}
          subtitle="Doctor profile and availability"
          onClose={() => setModalMode(null)}
        >
          <DoctorViewPanel
            doctor={viewDoctor}
            stats={viewStats}
            slots={viewSlots}
            slotsDate={viewSlotsDate}
            onSlotsDateChange={setViewSlotsDate}
            loadingSlots={loadingSlots}
          />
        </Modal>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <DeleteConfirm
          doctor={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
