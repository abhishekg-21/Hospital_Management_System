/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

/* ─── Types ───────────────────────────────────────────────────
   Matches the Prisma Patient model exactly.
   address, email, etc. are all included so Edit never loses data.
──────────────────────────────────────────────────────────────── */
interface Patient {
  id: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  phone: string;
  email?: string | null;
  address: string;
  bloodGroup?: string | null;
  emergencyPhone?: string | null;
  allergies?: string | null;
  diseaseHistory?: string | null;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type SortField = "firstName" | "lastName" | "age" | "patientCode" | "createdAt";
type SortOrder = "asc" | "desc";
type ModalMode = "create" | "edit" | "view";

interface Toast {
  id: string;
  type: "success" | "error" | "warning";
  message: string;
}

/* ─── Constants ──────────────────────────────────────────────── */
const API = "http://localhost:5000/api/patients";
const GENDERS = ["Male", "Female", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  age: "",
  gender: "Male",
  phone: "",
  email: "",
  address: "",
  bloodGroup: "",
  emergencyPhone: "",
  allergies: "",
  diseaseHistory: "",
};

/* ─── Helpers ─────────────────────────────────────────────────── */
const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const genId = () => Math.random().toString(36).slice(2);

/* ─── Sub-components ──────────────────────────────────────────── */

function ToastContainer({
  toasts,
  remove,
}: {
  toasts: Toast[];
  remove: (id: string) => void;
}) {
  const palette = {
    success: { bg: "#f0fdf4", border: "#22c55e", icon: "✓", iconBg: "#22c55e" },
    error: { bg: "#fef2f2", border: "#ef4444", icon: "✕", iconBg: "#ef4444" },
    warning: { bg: "#fffbeb", border: "#f59e0b", icon: "⚠", iconBg: "#f59e0b" },
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
        const p = palette[t.type];
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
              maxWidth: 360,
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
                background: p.iconBg,
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
                pointerEvents: "all",
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

function Badge({ label, color }: { label: string; color: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    blue: { bg: "#dbeafe", text: "#1d4ed8" },
    pink: { bg: "#fce7f3", text: "#9d174d" },
    purple: { bg: "#f3e8ff", text: "#6d28d9" },
    green: { bg: "#dcfce7", text: "#15803d" },
    gray: { bg: "#f1f5f9", text: "#475569" },
  };
  const style = map[color] || map.gray;
  return (
    <span
      style={{
        background: style.bg,
        color: style.text,
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

function genderColor(gender: string) {
  if (gender === "Male") return "blue";
  if (gender === "Female") return "pink";
  return "purple";
}

/* ─── Patient Form ────────────────────────────────────────────── */

type FormData = typeof EMPTY_FORM;
type FormErrors = Partial<Record<keyof FormData, string>>;

function PatientForm({
  mode,
  initial,
  onClose,
  onSuccess,
  addToast,
}: {
  mode: ModalMode;
  initial: FormData;
  onClose: () => void;
  onSuccess: (patient: Patient, isEdit: boolean) => void;
  addToast: (type: Toast["type"], msg: string) => void;
}) {
  const [form, setForm] = useState<FormData>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const isView = mode === "view";

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

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.lastName.trim()) e.lastName = "Last name is required";
    if (!form.gender) e.gender = "Gender is required";
    if (!form.address.trim()) e.address = "Address is required";
    if (!form.phone.trim()) {
      e.phone = "Phone number is required";
    } else if (!/^\d{7,15}$/.test(form.phone.replace(/[\s\-+()]/g, ""))) {
      e.phone = "Enter a valid phone number";
    }
    const ageNum = parseInt(form.age, 10);
    if (form.age === "" || isNaN(ageNum)) {
      e.age = "Age is required";
    } else if (ageNum < 0 || ageNum > 150) {
      e.age = "Age must be between 0 and 150";
    }
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      e.email = "Enter a valid email address";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        age: parseInt(form.age, 10),
        email: form.email || undefined,
        bloodGroup: form.bloodGroup || undefined,
        emergencyPhone: form.emergencyPhone || undefined,
        allergies: form.allergies || undefined,
        diseaseHistory: form.diseaseHistory || undefined,
      };

      let patient: Patient;
      if (mode === "edit" && (initial as any).__id) {
        const resp = await axios.put(
          `${API}/${(initial as any).__id}`,
          payload,
          { headers: authHeaders() },
        );
        patient = resp.data.data ?? resp.data;
        addToast("success", "Patient updated successfully");
      } else {
        const resp = await axios.post(API, payload, { headers: authHeaders() });
        patient = resp.data.data ?? resp.data;
        addToast("success", "Patient created successfully");
      }

      onSuccess(patient, mode === "edit");
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Operation failed. Please try again.";
      addToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  /* ── Field helpers ── */
  const inputStyle = (key: keyof FormData) => ({
    width: "100%",
    border: `1.5px solid ${errors[key] ? "#ef4444" : "#e2e8f0"}`,
    borderRadius: 9,
    padding: "9px 12px",
    fontSize: 13.5,
    outline: "none",
    boxSizing: "border-box" as const,
    background: isView ? "#f8fafc" : "#fff",
    color: "#1e293b",
    transition: "border 0.15s",
  });

  const label = (text: string, required = false) => (
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
      {required && !isView && <span style={{ color: "#ef4444" }}> *</span>}
    </label>
  );

  const errorMsg = (key: keyof FormData) =>
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

  return (
    <>
      {/* Scrollable body */}
      <div style={{ padding: "20px 28px", flex: 1, overflowY: "auto" }}>
        {row2(
          <>
            <div>
              {label("First Name", true)}
              <input
                value={form.firstName}
                onChange={set("firstName")}
                disabled={isView}
                style={inputStyle("firstName")}
              />
              {errorMsg("firstName")}
            </div>
            <div>
              {label("Last Name", true)}
              <input
                value={form.lastName}
                onChange={set("lastName")}
                disabled={isView}
                style={inputStyle("lastName")}
              />
              {errorMsg("lastName")}
            </div>
          </>,
        )}

        {row2(
          <>
            <div>
              {label("Age", true)}
              <input
                type="number"
                min={0}
                max={150}
                value={form.age}
                onChange={set("age")}
                disabled={isView}
                style={inputStyle("age")}
              />
              {errorMsg("age")}
            </div>
            <div>
              {label("Gender", true)}
              <select
                value={form.gender}
                onChange={set("gender")}
                disabled={isView}
                style={{ ...inputStyle("gender"), appearance: "auto" }}
              >
                <option value="">Select gender</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              {errorMsg("gender")}
            </div>
          </>,
        )}

        {row2(
          <>
            <div>
              {label("Phone", true)}
              <input
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                disabled={isView}
                style={inputStyle("phone")}
              />
              {errorMsg("phone")}
            </div>
            <div>
              {label("Email")}
              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                disabled={isView}
                style={inputStyle("email")}
              />
              {errorMsg("email")}
            </div>
          </>,
        )}

        {row2(
          <>
            <div>
              {label("Blood Group")}
              <select
                value={form.bloodGroup}
                onChange={set("bloodGroup")}
                disabled={isView}
                style={{ ...inputStyle("bloodGroup"), appearance: "auto" }}
              >
                <option value="">Select blood group</option>
                {BLOOD_GROUPS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              {label("Emergency Phone")}
              <input
                type="tel"
                value={form.emergencyPhone}
                onChange={set("emergencyPhone")}
                disabled={isView}
                style={inputStyle("emergencyPhone")}
              />
            </div>
          </>,
        )}

        <div style={{ marginBottom: 14 }}>
          {label("Address", true)}
          <textarea
            value={form.address}
            onChange={set("address")}
            disabled={isView}
            rows={2}
            style={{
              ...inputStyle("address"),
              resize: "vertical",
            }}
          />
          {errorMsg("address")}
        </div>

        {row2(
          <>
            <div>
              {label("Allergies")}
              <textarea
                value={form.allergies}
                onChange={set("allergies")}
                disabled={isView}
                rows={2}
                style={{ ...inputStyle("allergies"), resize: "vertical" }}
              />
            </div>
            <div>
              {label("Disease History")}
              <textarea
                value={form.diseaseHistory}
                onChange={set("diseaseHistory")}
                disabled={isView}
                rows={2}
                style={{
                  ...inputStyle("diseaseHistory"),
                  resize: "vertical",
                }}
              />
            </div>
          </>,
        )}
      </div>

      {/* Sticky footer */}
      {!isView && (
        <div
          style={{
            padding: "14px 28px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            background: "#fff",
          }}
        >
          <button
            onClick={onClose}
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
              padding: "9px 22px",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
              minWidth: 120,
            }}
          >
            {saving
              ? "Saving…"
              : mode === "edit"
                ? "Save Changes"
                : "Create Patient"}
          </button>
        </div>
      )}
    </>
  );
}

/* ─── Modal Wrapper ───────────────────────────────────────────── */

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Close on Escape
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
          maxWidth: 600,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          animation: "popIn 0.22s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "22px 28px 16px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
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

        {children}
      </div>
    </div>
  );
}

/* ─── Delete Confirm ──────────────────────────────────────────── */

function DeleteConfirm({
  patient,
  onConfirm,
  onCancel,
  deleting,
}: {
  patient: Patient;
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
            fontSize: 26,
          }}
        >
          🗑️
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "#1e293b" }}>
          Delete Patient?
        </h3>
        <p
          style={{
            color: "#64748b",
            fontSize: 14,
            marginBottom: 24,
            lineHeight: 1.6,
          }}
        >
          Are you sure you want to delete{" "}
          <strong>
            {patient.firstName} {patient.lastName}
          </strong>{" "}
          ({patient.patientCode})? This action cannot be undone.
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
              color: "#374151",
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

/* ─── Sort Icon ───────────────────────────────────────────────── */

function SortIcon({
  field,
  active,
  order,
}: {
  field: string;
  active: boolean;
  order: SortOrder;
}) {
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

/* ─── Main Page ───────────────────────────────────────────────── */

export default function PatientsPage() {
  /* ── Data state ── */
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Filter / sort state ── */
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  /* ── Modal state ── */
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [modalInitial, setModalInitial] = useState<
    FormData & { __id?: string }
  >(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Toast state ── */
  const [toasts, setToasts] = useState<Toast[]>([]);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Toast helpers ── */
  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = genId();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  /* ── Fetch ── */
  const fetchPatients = useCallback(
    async (params?: {
      search?: string;
      gender?: string;
      page?: number;
      sortBy?: SortField;
      sortOrder?: SortOrder;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const p = params || {};
        const response = await axios.get(API, {
          headers: authHeaders(),
          params: {
            search: p.search ?? search,
            gender: p.gender ?? genderFilter,
            page: p.page ?? page,
            limit: LIMIT,
            sortBy: p.sortBy ?? sortBy,
            sortOrder: p.sortOrder ?? sortOrder,
          },
        });

        /*
          Handle both response shapes:
          - New envelope: { success: true, data: { patients, pagination } }
          - Legacy raw array: Patient[]
        */
        const body = response.data;
        if (body?.success && body?.data?.patients) {
          setPatients(body.data.patients);
          setPagination(body.data.pagination);
        } else if (Array.isArray(body)) {
          // Legacy fallback — backend not yet updated
          setPatients(body);
          setPagination({
            total: body.length,
            page: 1,
            limit: body.length,
            totalPages: 1,
          });
        } else if (Array.isArray(body?.data)) {
          setPatients(body.data);
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message || "Failed to load patients.";
        setError(msg);
        addToast("error", msg);
      } finally {
        setLoading(false);
      }
    },
    [search, genderFilter, page, sortBy, sortOrder, addToast],
  );

  useEffect(() => {
    fetchPatients();
  }, [page, sortBy, sortOrder, genderFilter]);

  /* Debounce search so we don't fire on every keystroke */
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      fetchPatients({ search, page: 1 });
    }, 400);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search]);

  /* ── Sort toggle ── */
  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  /* ── Modal helpers ── */
  const openCreate = () => {
    setModalInitial({ ...EMPTY_FORM });
    setModalMode("create");
  };

  const openEdit = (patient: Patient) => {
    setModalInitial({
      __id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      age: String(patient.age),
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email ?? "",
      address: patient.address ?? "",
      bloodGroup: patient.bloodGroup ?? "",
      emergencyPhone: patient.emergencyPhone ?? "",
      allergies: patient.allergies ?? "",
      diseaseHistory: patient.diseaseHistory ?? "",
    } as any);
    setModalMode("edit");
  };

  const openView = (patient: Patient) => {
    setModalInitial({
      __id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      age: String(patient.age),
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email ?? "",
      address: patient.address ?? "",
      bloodGroup: patient.bloodGroup ?? "",
      emergencyPhone: patient.emergencyPhone ?? "",
      allergies: patient.allergies ?? "",
      diseaseHistory: patient.diseaseHistory ?? "",
    } as any);
    setModalMode("view");
  };

  /* ── After create/edit success ── */
  const handleSuccess = (patient: Patient, isEdit: boolean) => {
    if (isEdit) {
      setPatients((prev) =>
        prev.map((p) => (p.id === patient.id ? patient : p)),
      );
    } else {
      /* Prepend new patient and re-fetch page 1 for fresh pagination count */
      setPage(1);
      fetchPatients({ page: 1 });
    }
  };

  /* ── Delete ── */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/${deleteTarget.id}`, {
        headers: authHeaders(),
      });
      setPatients((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      addToast(
        "success",
        `${deleteTarget.firstName} ${deleteTarget.lastName} deleted.`,
      );
      setDeleteTarget(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to delete patient.";
      addToast("error", msg);
    } finally {
      setDeleting(false);
    }
  };

  /* ── Render ── */
  const modalTitle =
    modalMode === "create"
      ? "Add New Patient"
      : modalMode === "edit"
        ? "Edit Patient"
        : "Patient Details";

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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "'Inter','Segoe UI',sans-serif",
      }}
    >
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes popIn {
          from { transform: scale(0.9); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        * { box-sizing: border-box; }
        input:focus, select:focus, textarea:focus {
          border-color: #6366f1 !important;
          outline: none;
        }
        ::-webkit-scrollbar       { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 3px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
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
              Patients
            </h1>
            <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>
              {loading
                ? "Loading…"
                : `${pagination.total} patient${pagination.total !== 1 ? "s" : ""} registered`}
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
            <span style={{ fontSize: 18 }}>+</span> Add Patient
          </button>
        </div>

        {/* ── Stats ── */}
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
              value: pagination.total,
              icon: "👥",
              color: "#6366f1",
              bg: "#eef2ff",
            },
            {
              label: "Male",
              value: patients.filter((p) => p.gender === "Male").length,
              icon: "👨",
              color: "#0ea5e9",
              bg: "#e0f2fe",
            },
            {
              label: "Female",
              value: patients.filter((p) => p.gender === "Female").length,
              icon: "👩",
              color: "#ec4899",
              bg: "#fce7f3",
            },
            {
              label: "Other",
              value: patients.filter((p) => p.gender === "Other").length,
              icon: "🧑",
              color: "#8b5cf6",
              bg: "#f3e8ff",
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

        {/* ── Search & Filters ── */}
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
          {/* Search */}
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
              placeholder="Search by name, code, or phone…"
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

          {/* Gender filter */}
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
              color: "#374151",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="">All Genders</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Clear filters */}
          {(search || genderFilter) && (
            <button
              onClick={() => {
                setSearch("");
                setGenderFilter("");
                setPage(1);
              }}
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
            /* Error state */
            <div
              style={{
                padding: "56px 24px",
                textAlign: "center",
                color: "#ef4444",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                Failed to load patients
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#94a3b8",
                  marginBottom: 20,
                }}
              >
                {error}
              </div>
              <button
                onClick={() => fetchPatients()}
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
                  minWidth: 760,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={thStyle("patientCode")}
                      onClick={() => toggleSort("patientCode")}
                    >
                      Code
                      <SortIcon
                        field="patientCode"
                        active={sortBy === "patientCode"}
                        order={sortOrder}
                      />
                    </th>
                    <th
                      style={thStyle("firstName")}
                      onClick={() => toggleSort("firstName")}
                    >
                      Name
                      <SortIcon
                        field="firstName"
                        active={sortBy === "firstName"}
                        order={sortOrder}
                      />
                    </th>
                    <th
                      style={thStyle("age")}
                      onClick={() => toggleSort("age")}
                    >
                      Age
                      <SortIcon
                        field="age"
                        active={sortBy === "age"}
                        order={sortOrder}
                      />
                    </th>
                    <th style={thPlain}>Gender</th>
                    <th style={thPlain}>Phone</th>
                    <th style={thPlain}>Blood</th>
                    <th style={thPlain}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #f8fafc" }}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} style={{ padding: "16px" }}>
                            <Skeleton />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : patients.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div
                          style={{
                            padding: "56px 24px",
                            textAlign: "center",
                            color: "#94a3b8",
                          }}
                        >
                          <div style={{ fontSize: 48, marginBottom: 12 }}>
                            {search ? "🔍" : "👥"}
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 500 }}>
                            {search
                              ? `No patients match "${search}"`
                              : "No patients registered yet"}
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
                              Add First Patient
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    patients.map((patient) => (
                      <tr
                        key={patient.id}
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
                              fontSize: 12.5,
                              color: "#6366f1",
                              fontWeight: 600,
                              background: "#eef2ff",
                              padding: "3px 8px",
                              borderRadius: 6,
                            }}
                          >
                            {patient.patientCode}
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
                            {patient.firstName} {patient.lastName}
                          </div>
                          {patient.email && (
                            <div
                              style={{
                                fontSize: 11.5,
                                color: "#94a3b8",
                                marginTop: 2,
                              }}
                            >
                              {patient.email}
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            fontSize: 13.5,
                            color: "#374151",
                          }}
                        >
                          {patient.age} yrs
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <Badge
                            label={patient.gender}
                            color={genderColor(patient.gender)}
                          />
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            fontSize: 13.5,
                            color: "#374151",
                          }}
                        >
                          {patient.phone}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          {patient.bloodGroup ? (
                            <Badge label={patient.bloodGroup} color="green" />
                          ) : (
                            <span style={{ color: "#cbd5e1", fontSize: 13 }}>
                              —
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => openView(patient)}
                              title="View"
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
                              onClick={() => openEdit(patient)}
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
                              onClick={() => setDeleteTarget(patient)}
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

          {/* ── Pagination footer ── */}
          {!loading && !error && pagination.totalPages > 1 && (
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
                Showing {Math.min((page - 1) * LIMIT + 1, pagination.total)}–
                {Math.min(page * LIMIT, pagination.total)} of {pagination.total}{" "}
                patients
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
                    fontWeight: 500,
                  }}
                >
                  ← Prev
                </button>

                {/* Page number chips */}
                {Array.from(
                  { length: Math.min(5, pagination.totalPages) },
                  (_, i) => {
                    const p = Math.max(
                      1,
                      Math.min(page - 2 + i, pagination.totalPages),
                    );
                    return p;
                  },
                )
                  .filter((p, i, arr) => arr.indexOf(p) === i)
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{
                        border: `1.5px solid ${
                          page === p ? "#6366f1" : "#e2e8f0"
                        }`,
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
                  onClick={() =>
                    setPage((p) => Math.min(pagination.totalPages, p + 1))
                  }
                  disabled={page >= pagination.totalPages}
                  style={{
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 8,
                    background:
                      page >= pagination.totalPages ? "#f8fafc" : "#fff",
                    color:
                      page >= pagination.totalPages ? "#cbd5e1" : "#374151",
                    padding: "7px 14px",
                    cursor:
                      page >= pagination.totalPages ? "not-allowed" : "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Row count when only one page */}
          {!loading &&
            !error &&
            patients.length > 0 &&
            pagination.totalPages <= 1 && (
              <div
                style={{
                  padding: "10px 20px",
                  borderTop: "1px solid #f1f5f9",
                  fontSize: 12.5,
                  color: "#94a3b8",
                }}
              >
                {patients.length} patient{patients.length !== 1 ? "s" : ""}
              </div>
            )}
        </div>
      </div>

      {/* ── Create / Edit / View Modal ── */}
      {modalMode && (
        <Modal title={modalTitle} onClose={() => setModalMode(null)}>
          <PatientForm
            mode={modalMode}
            initial={modalInitial}
            onClose={() => setModalMode(null)}
            onSuccess={handleSuccess}
            addToast={addToast}
          />
        </Modal>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <DeleteConfirm
          patient={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
