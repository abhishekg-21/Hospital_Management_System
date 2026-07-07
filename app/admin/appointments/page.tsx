/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Patient {
  id: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  mobileNumber?: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  lastVisit?: string;
}

interface Doctor {
  id: string;
  doctorCode: string;
  name: string;
  specialization?: string;
  consultationFee?: number;
  photo?: string;
  availableSlots?: string[];
}

interface Appointment {
  id: string;
  appointmentCode: string;
  patient: Patient;
  doctor: Doctor;
  date: string;
  time: string;
  status: string;
}

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
}

interface NewPatientForm {
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  mobileNumber: string;
  email: string;
  address: string;
  bloodGroup: string;
  emergencyContact: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API = "http://localhost:5000/api";
const token = () => localStorage.getItem("token");
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

function calcAge(dob: string): number | null {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function generateId() {
  return Math.random().toString(36).slice(2);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  remove,
}: {
  toasts: Toast[];
  remove: (id: string) => void;
}) {
  const colors: Record<string, string> = {
    success: "#22c55e",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  };
  const icons: Record<string, string> = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
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
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#fff",
            border: `1.5px solid ${colors[t.type]}`,
            borderLeft: `4px solid ${colors[t.type]}`,
            borderRadius: 10,
            padding: "12px 16px",
            minWidth: 280,
            maxWidth: 360,
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            animation: "slideIn 0.25s ease",
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: colors[t.type],
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {icons[t.type]}
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
              fontSize: 16,
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

function Skeleton({
  w = "100%",
  h = 16,
  radius = 6,
}: {
  w?: string | number;
  h?: number;
  radius?: number;
}) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background:
          "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
      }}
    />
  );
}

function Badge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    scheduled: { bg: "#dbeafe", color: "#1d4ed8" },
    pending: { bg: "#fef9c3", color: "#a16207" },
    confirmed: { bg: "#dcfce7", color: "#15803d" },
    cancelled: { bg: "#fee2e2", color: "#b91c1c" },
    completed: { bg: "#f3e8ff", color: "#6d28d9" },
  };
  const style = map[status?.toLowerCase()] || {
    bg: "#f1f5f9",
    color: "#475569",
  };
  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

function EmptyState({ message, icon }: { message: string; icon: string }) {
  return (
    <div
      style={{ padding: "56px 24px", textAlign: "center", color: "#94a3b8" }}
    >
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 500 }}>{message}</div>
    </div>
  );
}

// ─── Searchable Dropdown ──────────────────────────────────────────────────────

function SearchableDropdown<T extends { id: string }>({
  items,
  value,
  onSelect,
  placeholder,
  renderOption,
  renderSelected,
  searchKeys,
  loading,
  onAddNew,
  addNewLabel,
}: {
  items: T[];
  value: T | null;
  onSelect: (item: T | null) => void;
  placeholder: string;
  renderOption: (item: T) => React.ReactNode;
  renderSelected: (item: T) => string;
  searchKeys: (keyof T)[];
  loading?: boolean;
  onAddNew?: () => void;
  addNewLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = items.filter((item) =>
    searchKeys.some((k) =>
      String(item[k] ?? "")
        .toLowerCase()
        .includes(search.toLowerCase()),
    ),
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          padding: "10px 14px",
          border: "1.5px solid #e2e8f0",
          borderRadius: 10,
          background: "#fff",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 14,
          color: value ? "#1e293b" : "#94a3b8",
          transition: "border 0.15s",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value ? renderSelected(value) : placeholder}
        </span>
        <span style={{ marginLeft: 8, fontSize: 10, color: "#94a3b8" }}>▼</span>
      </button>

      {value && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(null);
            setSearch("");
          }}
          style={{
            position: "absolute",
            right: 32,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#94a3b8",
            fontSize: 14,
            padding: 4,
          }}
        >
          ✕
        </button>
      )}

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1.5px solid #e2e8f0",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          <div
            style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}
          >
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              style={{
                width: "100%",
                border: "1.5px solid #e2e8f0",
                borderRadius: 8,
                padding: "7px 10px",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 16 }}>
                <Skeleton />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center" }}>
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: 13,
                    marginBottom: onAddNew ? 12 : 0,
                  }}
                >
                  No results for "{search}"
                </div>
                {onAddNew && (
                  <button
                    onClick={() => {
                      onAddNew();
                      setOpen(false);
                    }}
                    style={{
                      background: "#6366f1",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 16px",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    + {addNewLabel || "Add New"}
                  </button>
                )}
              </div>
            ) : (
              <>
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      setOpen(false);
                      setSearch("");
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "10px 14px",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f8fafc")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                  >
                    {renderOption(item)}
                  </button>
                ))}
                {onAddNew && (
                  <button
                    onClick={() => {
                      onAddNew();
                      setOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "10px 14px",
                      border: "none",
                      borderTop: "1px solid #f1f5f9",
                      background: "#fafbff",
                      cursor: "pointer",
                      color: "#6366f1",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>+</span>{" "}
                    {addNewLabel || "Add New"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Time Slot Picker ─────────────────────────────────────────────────────────

const DEFAULT_SLOTS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

function TimeSlotPicker({
  value,
  onChange,
  slots,
}: {
  value: string;
  onChange: (v: string) => void;
  slots?: string[];
}) {
  const available = slots && slots.length > 0 ? slots : DEFAULT_SLOTS;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {available.map((slot) => {
        const selected = value === slot;
        return (
          <button
            key={slot}
            type="button"
            onClick={() => onChange(slot)}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: selected ? "2px solid #6366f1" : "1.5px solid #e2e8f0",
              background: selected ? "#6366f1" : "#fff",
              color: selected ? "#fff" : "#374151",
              fontSize: 13,
              fontWeight: selected ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {slot}
          </button>
        );
      })}
    </div>
  );
}

// ─── Confirmation Dialog ──────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 10001,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 32,
          maxWidth: 380,
          width: "90%",
          textAlign: "center",
          boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
        <h3 style={{ margin: "0 0 12px", fontSize: 18, color: "#1e293b" }}>
          Confirm Appointment
        </h3>
        <p
          style={{
            color: "#64748b",
            fontSize: 14,
            marginBottom: 24,
            lineHeight: 1.6,
          }}
        >
          {message}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "10px 24px",
              border: "1.5px solid #e2e8f0",
              borderRadius: 10,
              background: "#fff",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              color: "#374151",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 24px",
              border: "none",
              borderRadius: 10,
              background: "#6366f1",
              color: "#fff",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Confirm Booking
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Success Animation ────────────────────────────────────────────────────────

function SuccessModal({
  appointmentCode,
  onClose,
  onPrint,
}: {
  appointmentCode: string;
  onClose: () => void;
  onPrint: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(appointmentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 10002,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: 40,
          maxWidth: 400,
          width: "90%",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          animation: "popIn 0.3s ease",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 32,
          }}
        >
          ✓
        </div>
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: 22,
            color: "#1e293b",
            fontWeight: 700,
          }}
        >
          Appointment Booked!
        </h2>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
          Your appointment has been scheduled successfully.
        </p>

        <div
          style={{
            background: "#f8faff",
            border: "1.5px dashed #6366f1",
            borderRadius: 12,
            padding: "14px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ textAlign: "left" }}>
            <div
              style={{
                fontSize: 11,
                color: "#94a3b8",
                fontWeight: 600,
                marginBottom: 2,
              }}
            >
              APPOINTMENT ID
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#6366f1",
                letterSpacing: 1,
              }}
            >
              {appointmentCode}
            </div>
          </div>
          <button
            onClick={copyCode}
            style={{
              border: "1.5px solid #6366f1",
              borderRadius: 8,
              background: copied ? "#6366f1" : "#fff",
              color: copied ? "#fff" : "#6366f1",
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={onPrint}
            style={{
              border: "1.5px solid #e2e8f0",
              borderRadius: 10,
              background: "#fff",
              padding: "10px 20px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
            }}
          >
            🖨 Print Slip
          </button>
          <button
            onClick={onClose}
            style={{
              border: "none",
              borderRadius: 10,
              background: "#6366f1",
              color: "#fff",
              padding: "10px 20px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Patient Modal ────────────────────────────────────────────────────────

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const GENDERS = ["Male", "Female", "Other"];

function AddPatientModal({
  onClose,
  onSuccess,
  addToast,
}: {
  onClose: () => void;
  onSuccess: (patient: Patient) => void;
  addToast: (type: Toast["type"], message: string) => void;
}) {
  const [form, setForm] = useState<NewPatientForm>({
    firstName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
    mobileNumber: "",
    email: "",
    address: "",
    bloodGroup: "",
    emergencyContact: "",
  });
  const [errors, setErrors] = useState<Partial<NewPatientForm>>({});
  const [saving, setSaving] = useState(false);

  const set =
    (k: keyof NewPatientForm) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      setErrors((err) => ({ ...err, [k]: "" }));
    };

  const validate = (): boolean => {
    const e: Partial<NewPatientForm> = {};
    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.lastName.trim()) e.lastName = "Last name is required";
    if (!form.gender) e.gender = "Gender is required";
    if (!form.mobileNumber.trim()) e.mobileNumber = "Mobile number is required";
    else if (!/^\d{10,15}$/.test(form.mobileNumber.replace(/\s/g, "")))
      e.mobileNumber = "Enter a valid mobile number";
    if (form.email && !/\S+@\S+\.\S+/.test(form.email))
      e.email = "Enter a valid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const resp = await axios.post(`${API}/patient`, form, {
        headers: authHeaders(),
      });
      addToast("success", "Patient created successfully");
      onSuccess(resp.data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to create patient";
      addToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const field = (
    label: string,
    key: keyof NewPatientForm,
    type = "text",
    required = false,
  ) => (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: "#374151",
          marginBottom: 6,
        }}
      >
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={set(key)}
        style={{
          width: "100%",
          border: `1.5px solid ${errors[key] ? "#ef4444" : "#e2e8f0"}`,
          borderRadius: 9,
          padding: "9px 12px",
          fontSize: 13.5,
          outline: "none",
          boxSizing: "border-box",
          transition: "border 0.15s",
        }}
        onFocus={(e) => {
          if (!errors[key]) e.currentTarget.style.borderColor = "#6366f1";
        }}
        onBlur={(e) => {
          if (!errors[key]) e.currentTarget.style.borderColor = "#e2e8f0";
        }}
      />
      {errors[key] && (
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
      )}
    </div>
  );

  const select = (
    label: string,
    key: keyof NewPatientForm,
    options: string[],
    required = false,
  ) => (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: "#374151",
          marginBottom: 6,
        }}
      >
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <select
        value={form[key]}
        onChange={set(key)}
        style={{
          width: "100%",
          border: `1.5px solid ${errors[key] ? "#ef4444" : "#e2e8f0"}`,
          borderRadius: 9,
          padding: "9px 12px",
          fontSize: 13.5,
          outline: "none",
          background: "#fff",
          boxSizing: "border-box",
        }}
      >
        <option value="">Select {label}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {errors[key] && (
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
      )}
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 10001,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "22px 28px 18px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 1,
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
              Add New Patient
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#94a3b8" }}>
              Fill in the details to register a new patient
            </p>
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
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "24px 28px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 16,
            }}
          >
            {field("First Name", "firstName", "text", true)}
            {field("Last Name", "lastName", "text", true)}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 16,
            }}
          >
            {select("Gender", "gender", GENDERS, true)}
            {field("Date of Birth", "dateOfBirth", "date")}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 16,
            }}
          >
            {field("Mobile Number", "mobileNumber", "tel", true)}
            {field("Email", "email", "email")}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 16,
            }}
          >
            {select("Blood Group", "bloodGroup", BLOOD_GROUPS)}
            {field("Emergency Contact", "emergencyContact", "tel")}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Address
            </label>
            <textarea
              value={form.address}
              onChange={set("address")}
              rows={2}
              style={{
                width: "100%",
                border: "1.5px solid #e2e8f0",
                borderRadius: 9,
                padding: "9px 12px",
                fontSize: 13.5,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div
          style={{
            padding: "16px 28px 24px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            borderTop: "1px solid #f1f5f9",
            position: "sticky",
            bottom: 0,
            background: "#fff",
          }}
        >
          <button
            onClick={onClose}
            style={{
              border: "1.5px solid #e2e8f0",
              borderRadius: 10,
              background: "#fff",
              padding: "10px 22px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              color: "#374151",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              border: "none",
              borderRadius: 10,
              background: saving ? "#a5b4fc" : "#6366f1",
              color: "#fff",
              padding: "10px 22px",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {saving ? "Creating…" : "Create Patient"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Book Appointment Drawer ──────────────────────────────────────────────────

function BookDrawer({
  onClose,
  patients,
  doctors,
  onBooked,
  addToast,
}: {
  onClose: () => void;
  patients: Patient[];
  doctors: Doctor[];
  onBooked: (appt: Appointment) => void;
  addToast: (type: Toast["type"], message: string) => void;
}) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successCode, setSuccessCode] = useState("");
  const [localPatients, setLocalPatients] = useState<Patient[]>(patients);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalPatients(patients);
  }, [patients]);

  const today = new Date().toISOString().split("T")[0];

  const handleBook = async () => {
    if (!selectedPatient || !selectedDoctor || !date || !time) {
      addToast("warning", "Please fill in all required fields");
      return;
    }
    setShowConfirm(true);
  };

  const confirmBook = async () => {
    setShowConfirm(false);
    setSaving(true);
    try {
      const resp = await axios.post(
        `${API}/appointments`,
        {
          patientId: selectedPatient!.id,
          doctorId: selectedDoctor!.id,
          date,
          time,
        },
        { headers: authHeaders() },
      );
      const newAppt = resp.data;
      setSuccessCode(newAppt.appointmentCode || "APT-" + Date.now());
      setShowSuccess(true);
      onBooked(newAppt);
    } catch (err: any) {
      addToast(
        "error",
        err?.response?.data?.message || "Failed to book appointment",
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePatientAdded = (patient: Patient) => {
    setLocalPatients((p) => [patient, ...p]);
    setSelectedPatient(patient);
    setShowAddPatient(false);
  };

  const isReady = selectedPatient && selectedDoctor && date && time;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 1000,
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: "min(620px, 100vw)",
          background: "#fff",
          zIndex: 1001,
          overflowY: "auto",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          animation: "slideRight 0.25s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 28px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 2,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: "#1e293b",
              }}
            >
              Book Appointment
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#94a3b8" }}>
              Fill in the details below to schedule
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#f1f5f9",
              borderRadius: 8,
              width: 36,
              height: 36,
              cursor: "pointer",
              fontSize: 18,
              color: "#64748b",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            flex: 1,
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* ── Patient Section ── */}
          <section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#374151",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Patient
              </h3>
              <button
                onClick={() => setShowAddPatient(true)}
                style={{
                  border: "1.5px solid #6366f1",
                  borderRadius: 8,
                  background: "#fff",
                  color: "#6366f1",
                  padding: "5px 12px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                + New Patient
              </button>
            </div>
            <SearchableDropdown
              items={localPatients}
              value={selectedPatient}
              onSelect={setSelectedPatient}
              placeholder="Search patient by name, mobile or ID…"
              searchKeys={[
                "firstName",
                "lastName",
                "patientCode",
                "mobileNumber",
              ]}
              renderSelected={(p) =>
                `${p.firstName} ${p.lastName} · ${p.patientCode}`
              }
              renderOption={(p) => (
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13.5,
                      color: "#1e293b",
                    }}
                  >
                    {p.firstName} {p.lastName}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    {p.patientCode}
                    {p.mobileNumber ? ` · ${p.mobileNumber}` : ""}
                  </div>
                </div>
              )}
              onAddNew={() => setShowAddPatient(true)}
              addNewLabel="Add New Patient"
            />

            {/* Patient Info Card */}
            {selectedPatient && (
              <div
                style={{
                  marginTop: 12,
                  background: "#f8faff",
                  border: "1.5px solid #e0e7ff",
                  borderRadius: 12,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px 20px",
                    fontSize: 13,
                  }}
                >
                  {selectedPatient.gender && (
                    <div>
                      <span style={{ color: "#94a3b8" }}>Gender: </span>
                      <strong>{selectedPatient.gender}</strong>
                    </div>
                  )}
                  {selectedPatient.dateOfBirth && (
                    <div>
                      <span style={{ color: "#94a3b8" }}>Age: </span>
                      <strong>
                        {calcAge(selectedPatient.dateOfBirth)} yrs
                      </strong>
                    </div>
                  )}
                  {selectedPatient.mobileNumber && (
                    <div>
                      <span style={{ color: "#94a3b8" }}>Mobile: </span>
                      <strong>{selectedPatient.mobileNumber}</strong>
                    </div>
                  )}
                  {selectedPatient.bloodGroup && (
                    <div>
                      <span style={{ color: "#94a3b8" }}>Blood: </span>
                      <strong>{selectedPatient.bloodGroup}</strong>
                    </div>
                  )}
                  {selectedPatient.lastVisit && (
                    <div style={{ gridColumn: "1/-1" }}>
                      <span style={{ color: "#94a3b8" }}>Last Visit: </span>
                      <strong>{formatDate(selectedPatient.lastVisit)}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ── Doctor Section ── */}
          <section>
            <h3
              style={{
                margin: "0 0 10px",
                fontSize: 13,
                fontWeight: 700,
                color: "#374151",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Doctor
            </h3>
            <SearchableDropdown
              items={doctors}
              value={selectedDoctor}
              onSelect={setSelectedDoctor}
              placeholder="Search doctor by name or specialization…"
              searchKeys={["name", "doctorCode", "specialization"]}
              renderSelected={(d) =>
                `Dr. ${d.name}${d.specialization ? ` · ${d.specialization}` : ""}`
              }
              renderOption={(d) => (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 14,
                      flexShrink: 0,
                      overflow: "hidden",
                    }}
                  >
                    {d.photo ? (
                      <img
                        src={d.photo}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      d.name[0]
                    )}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13.5,
                        color: "#1e293b",
                      }}
                    >
                      Dr. {d.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      {d.specialization || d.doctorCode}
                      {d.consultationFee ? ` · ₹${d.consultationFee}` : ""}
                    </div>
                  </div>
                </div>
              )}
            />

            {/* Doctor Info Card */}
            {selectedDoctor && (
              <div
                style={{
                  marginTop: 12,
                  background: "#fafbff",
                  border: "1.5px solid #e0e7ff",
                  borderRadius: 12,
                  padding: "14px 16px",
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 20,
                    flexShrink: 0,
                    overflow: "hidden",
                  }}
                >
                  {selectedDoctor.photo ? (
                    <img
                      src={selectedDoctor.photo}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    selectedDoctor.name[0]
                  )}
                </div>
                <div>
                  <div
                    style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}
                  >
                    Dr. {selectedDoctor.name}
                  </div>
                  {selectedDoctor.specialization && (
                    <div
                      style={{
                        fontSize: 13,
                        color: "#6366f1",
                        fontWeight: 500,
                      }}
                    >
                      {selectedDoctor.specialization}
                    </div>
                  )}
                  {selectedDoctor.consultationFee && (
                    <div
                      style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}
                    >
                      Consultation Fee:{" "}
                      <strong>₹{selectedDoctor.consultationFee}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ── Date & Time ── */}
          <section>
            <h3
              style={{
                margin: "0 0 14px",
                fontSize: 13,
                fontWeight: 700,
                color: "#374151",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Date & Time
            </h3>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 6,
                }}
              >
                Date <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: "100%",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 9,
                  padding: "9px 12px",
                  fontSize: 13.5,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Time Slot <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <TimeSlotPicker
                value={time}
                onChange={setTime}
                slots={selectedDoctor?.availableSlots}
              />
            </div>
          </section>

          {/* ── Live Summary ── */}
          {(selectedPatient || selectedDoctor || date || time) && (
            <section>
              <h3
                style={{
                  margin: "0 0 12px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#374151",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Appointment Summary
              </h3>
              <div
                style={{
                  background: "#f8faff",
                  border: "1.5px solid #e0e7ff",
                  borderRadius: 14,
                  padding: "18px 20px",
                }}
              >
                <SummaryRow
                  icon="👤"
                  label="Patient"
                  value={
                    selectedPatient
                      ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                      : "—"
                  }
                />
                <SummaryRow
                  icon="🩺"
                  label="Doctor"
                  value={selectedDoctor ? `Dr. ${selectedDoctor.name}` : "—"}
                />
                {selectedDoctor?.specialization && (
                  <SummaryRow
                    icon="🏥"
                    label="Specialization"
                    value={selectedDoctor.specialization}
                  />
                )}
                <SummaryRow
                  icon="📅"
                  label="Date"
                  value={date ? formatDate(date) : "—"}
                />
                <SummaryRow icon="⏰" label="Time" value={time || "—"} />
                {selectedDoctor?.consultationFee && (
                  <>
                    <div
                      style={{
                        borderTop: "1px dashed #e0e7ff",
                        margin: "10px 0",
                      }}
                    />
                    <SummaryRow
                      icon="💰"
                      label="Consultation Fee"
                      value={`₹${selectedDoctor.consultationFee}`}
                      highlight
                    />
                  </>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Sticky Footer */}
        <div
          style={{
            padding: "16px 28px",
            borderTop: "1px solid #f1f5f9",
            position: "sticky",
            bottom: 0,
            background: "#fff",
            display: "flex",
            gap: 12,
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              border: "1.5px solid #e2e8f0",
              borderRadius: 10,
              background: "#fff",
              padding: "11px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              color: "#374151",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleBook}
            disabled={!isReady || saving}
            style={{
              flex: 2,
              border: "none",
              borderRadius: 10,
              background: isReady
                ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                : "#e2e8f0",
              color: isReady ? "#fff" : "#94a3b8",
              padding: "11px",
              cursor: isReady ? "pointer" : "not-allowed",
              fontSize: 14,
              fontWeight: 700,
              transition: "all 0.2s",
              boxShadow: isReady ? "0 4px 14px rgba(99,102,241,0.35)" : "none",
            }}
          >
            {saving ? "Booking…" : "Book Appointment"}
          </button>
        </div>
      </div>

      {showAddPatient && (
        <AddPatientModal
          onClose={() => setShowAddPatient(false)}
          onSuccess={handlePatientAdded}
          addToast={addToast}
        />
      )}

      {showConfirm && (
        <ConfirmDialog
          message={`Book appointment for ${selectedPatient?.firstName} ${selectedPatient?.lastName} with Dr. ${selectedDoctor?.name} on ${formatDate(date)} at ${time}?`}
          onConfirm={confirmBook}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {showSuccess && (
        <SuccessModal
          appointmentCode={successCode}
          onClose={() => {
            setShowSuccess(false);
            onClose();
          }}
          onPrint={() => window.print()}
        />
      )}
    </>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "5px 0",
        fontSize: 13.5,
      }}
    >
      <span
        style={{
          color: "#64748b",
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        <span style={{ fontSize: 14 }}>{icon}</span>
        {label}
      </span>
      <span
        style={{ fontWeight: 600, color: highlight ? "#6366f1" : "#1e293b" }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = generateId();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [apptRes, patRes, docRes] = await Promise.all([
        axios.get(`${API}/appointments`, { headers: authHeaders() }),
        axios.get(`${API}/patients`, { headers: authHeaders() }),
        axios.get(`${API}/doctors`, { headers: authHeaders() }),
      ]);
      setAppointments(apptRes.data.data.appointments);
      setPatients(patRes.data.data.patients);
      setDoctors(docRes.data);
    } catch {
      addToast("error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const deleteAppointment = async (id: string) => {
    if (!window.confirm("Delete this appointment?")) return;
    try {
      await axios.delete(`${API}/appointments/${id}`, {
        headers: authHeaders(),
      });
      setAppointments((a) => a.filter((x) => x.id !== id));
      addToast("success", "Appointment deleted");
    } catch {
      addToast("error", "Failed to delete appointment");
    }
  };

  const handleBooked = (appt: Appointment) => {
    setAppointments((a) => [appt, ...a]);
    addToast("success", "Appointment booked successfully");
  };

  const filtered = appointments.filter((a) => {
    const matchStatus =
      filterStatus === "all" || a.status?.toLowerCase() === filterStatus;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      a.appointmentCode?.toLowerCase().includes(q) ||
      `${a.patient.firstName} ${a.patient.lastName}`
        .toLowerCase()
        .includes(q) ||
      a.doctor.name.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const statuses = [
    "all",
    ...Array.from(
      new Set(appointments.map((a) => a.status?.toLowerCase()).filter(Boolean)),
    ),
  ];

  // Stats
  const total = appointments.length;
  const todayCount = appointments.filter((a) =>
    a.date?.startsWith(new Date().toISOString().slice(0, 10)),
  ).length;
  const pending = appointments.filter(
    (a) => a.status?.toLowerCase() === "pending",
  ).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes slideIn { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes slideRight { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes popIn { from{transform:scale(0.85);opacity:0} to{transform:scale(1);opacity:1} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 3px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
        }
      `}</style>

      <ToastContainer toasts={toasts} remove={removeToast} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
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
              Appointments
            </h1>
            <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>
              Manage and schedule patient appointments
            </p>
          </div>
          <button
            className="no-print"
            onClick={() => setShowDrawer(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "11px 22px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
              boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "translateY(-1px)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
          >
            <span style={{ fontSize: 18 }}>+</span> Book Appointment
          </button>
        </div>

        {/* ── Stats Cards ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 16,
            marginBottom: 28,
          }}
          className="no-print"
        >
          {[
            {
              label: "Total",
              value: total,
              icon: "📋",
              color: "#6366f1",
              bg: "#eef2ff",
            },
            {
              label: "Today",
              value: todayCount,
              icon: "📅",
              color: "#0ea5e9",
              bg: "#e0f2fe",
            },
            {
              label: "Pending",
              value: pending,
              icon: "⏳",
              color: "#f59e0b",
              bg: "#fef9c3",
            },
            {
              label: "Doctors",
              value: doctors.length,
              icon: "🩺",
              color: "#10b981",
              bg: "#d1fae5",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: "18px 20px",
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
                    fontSize: 12,
                    color: "#94a3b8",
                    fontWeight: 600,
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {stat.label}
                </div>
                {loading ? (
                  <Skeleton w={40} h={28} />
                ) : (
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: stat.color,
                      lineHeight: 1,
                    }}
                  >
                    {stat.value}
                  </div>
                )}
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: stat.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                }}
              >
                {stat.icon}
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters & Search ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            padding: "16px 20px",
            marginBottom: 20,
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            border: "1px solid #f1f5f9",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
          className="no-print"
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
              placeholder="Search by code, patient, or doctor…"
              style={{
                width: "100%",
                border: "1.5px solid #e2e8f0",
                borderRadius: 10,
                padding: "9px 12px 9px 36px",
                fontSize: 13.5,
                outline: "none",
                transition: "border 0.15s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: `1.5px solid ${filterStatus === s ? "#6366f1" : "#e2e8f0"}`,
                  background: filterStatus === s ? "#6366f1" : "#fff",
                  color: filterStatus === s ? "#fff" : "#64748b",
                  fontSize: 13,
                  fontWeight: filterStatus === s ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  textTransform: "capitalize",
                }}
              >
                {s}
              </button>
            ))}
          </div>
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
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 700,
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {[
                    "Code",
                    "Patient",
                    "Doctor",
                    "Date",
                    "Time",
                    "Status",
                    "Action",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "14px 16px",
                        textAlign: "left",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} style={{ padding: "16px" }}>
                          <Skeleton h={14} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={search ? "🔍" : "📋"}
                        message={
                          search
                            ? `No appointments match "${search}"`
                            : "No appointments yet. Book the first one!"
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((appt) => (
                    <tr
                      key={appt.id}
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
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: 13,
                            color: "#6366f1",
                            fontWeight: 600,
                            background: "#eef2ff",
                            padding: "3px 8px",
                            borderRadius: 6,
                          }}
                        >
                          {appt.appointmentCode}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 13.5,
                            color: "#1e293b",
                          }}
                        >
                          {appt.patient
                            ? `${appt.patient.firstName} ${appt.patient.lastName}`
                            : "Unknown Patient"}
                        </div>
                        {appt.patient?.patientCode && (
                          <div
                            style={{
                              fontSize: 11.5,
                              color: "#94a3b8",
                              marginTop: 2,
                            }}
                          >
                            {appt.patient.patientCode}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div
                          style={{
                            fontWeight: 500,
                            fontSize: 13.5,
                            color: "#1e293b",
                          }}
                        >
                          Dr. {appt.doctor?.name ?? "Unknown Doctor"}
                        </div>
                        {appt.doctor?.doctorCode && (
                          <div
                            style={{
                              fontSize: 11.5,
                              color: "#94a3b8",
                              marginTop: 2,
                            }}
                          >
                            {appt.doctor.doctorCode}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          fontSize: 13.5,
                          color: "#374151",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(appt.date)}
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          fontSize: 13.5,
                          color: "#374151",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {appt.time}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <Badge status={appt.status} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <button
                          onClick={() => deleteAppointment(appt.id)}
                          style={{
                            border: "1.5px solid #fee2e2",
                            borderRadius: 8,
                            background: "#fff",
                            color: "#ef4444",
                            padding: "6px 14px",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#ef4444";
                            e.currentTarget.style.color = "#fff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#fff";
                            e.currentTarget.style.color = "#ef4444";
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {!loading && filtered.length > 0 && (
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid #f1f5f9",
                fontSize: 12.5,
                color: "#94a3b8",
              }}
            >
              Showing {filtered.length} of {appointments.length} appointment
              {appointments.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* ── Book Drawer ── */}
      {showDrawer && (
        <BookDrawer
          onClose={() => setShowDrawer(false)}
          patients={patients}
          doctors={doctors}
          onBooked={handleBooked}
          addToast={addToast}
        />
      )}
    </div>
  );
}
