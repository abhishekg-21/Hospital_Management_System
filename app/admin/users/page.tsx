/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

/* ─── Types ───────────────────────────────────────────────────────────────── */

type Role = "SUPER_ADMIN" | "ADMIN" | "DOCTOR" | "RECEPTIONIST" | "PATIENT";

interface PatientProfile {
  id: string;
  patientCode: string;
  phone: string;
  gender: string;
}
interface DoctorProfile {
  id: string;
  doctorCode: string;
  specialization: string;
  phone: string;
  department?: { name: string };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  patient?: PatientProfile | null;
  doctor?: DoctorProfile | null;
}

interface UserStats {
  total: number;
  newThisMonth: number;
  byRole: Record<Role, number>;
}

interface Toast {
  id: string;
  type: "success" | "error" | "warning";
  message: string;
}

type SortField = "name" | "createdAt" | "email";
type SortOrder = "asc" | "desc";

/* ─── Constants ───────────────────────────────────────────────────────────── */

const API = "http://localhost:5000/api/users";
const authHdr = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});
const genId = () => Math.random().toString(36).slice(2);
const PAGE_LIMIT = 15;

const ROLE_META: Record<string, { label: string; color: string; bg: string }> =
  {
    SUPER_ADMIN: { label: "Super Admin", color: "#8b5cf6", bg: "#f3e8ff" },
    ADMIN: { label: "Admin", color: "#6366f1", bg: "#eef2ff" },
    DOCTOR: { label: "Doctor", color: "#0ea5e9", bg: "#e0f2fe" },
    RECEPTIONIST: { label: "Receptionist", color: "#10b981", bg: "#d1fae5" },
    PATIENT: { label: "Patient", color: "#f59e0b", bg: "#fef9c3" },
  };

const ALL_ROLES: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "DOCTOR",
  "RECEPTIONIST",
  "PATIENT",
];

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  role: "DOCTOR" as Role,
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function UserAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const COLORS = [
    "#6366f1",
    "#0ea5e9",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#ef4444",
  ];
  const bg = COLORS[name.charCodeAt(0) % COLORS.length];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.32,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const m = ROLE_META[role] ?? { label: role, color: "#475569", bg: "#f1f5f9" };
  return (
    <span
      style={{
        background: m.bg,
        color: m.color,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {m.label}
    </span>
  );
}

function Sk({
  w = "100%",
  h = 14,
  r = 6,
}: {
  w?: string | number;
  h?: number;
  r?: number;
}) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background:
          "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
      }}
    />
  );
}

/* ─── Toast ───────────────────────────────────────────────────────────────── */

function ToastContainer({
  toasts,
  remove,
}: {
  toasts: Toast[];
  remove: (id: string) => void;
}) {
  const pal = {
    success: { b: "#22c55e", bg: "#f0fdf4", i: "✓" },
    error: { b: "#ef4444", bg: "#fef2f2", i: "✕" },
    warning: { b: "#f59e0b", bg: "#fffbeb", i: "⚠" },
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
        const s = pal[t.type];
        return (
          <div
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: s.bg,
              border: `1.5px solid ${s.b}`,
              borderLeft: `4px solid ${s.b}`,
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
                background: s.b,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {s.i}
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

/* ─── User Form Modal ─────────────────────────────────────────────────────── */

function UserFormModal({
  mode,
  initial,
  editId,
  viewerRole,
  onClose,
  onSuccess,
  addToast,
}: {
  mode: "create" | "edit";
  initial: typeof EMPTY_FORM;
  editId?: string;
  viewerRole: string;
  onClose: () => void;
  onSuccess: (user: User, isEdit: boolean) => void;
  addToast: (type: Toast["type"], msg: string) => void;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Partial<typeof EMPTY_FORM>>({});
  const [saving, setSaving] = useState(false);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      setErrors((err) => ({ ...err, [k]: "" }));
    };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
    if (mode === "create" && !form.password)
      e.password = "Password is required";
    if (mode === "create" && form.password && form.password.length < 6)
      e.password = "Min 6 characters";
    if (mode === "edit" && form.password && form.password.length < 6)
      e.password = "Min 6 characters (leave blank to keep current)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
      };
      if (form.password) payload.password = form.password;

      let user: User;
      if (mode === "edit" && editId) {
        const resp = await axios.put(`${API}/${editId}`, payload, {
          headers: authHdr(),
        });
        user = resp.data?.data ?? resp.data;
        addToast("success", `${user.name} updated successfully`);
      } else {
        const resp = await axios.post(API, payload, { headers: authHdr() });
        user = resp.data?.data ?? resp.data;
        addToast("success", `${user.name} created successfully`);
      }
      onSuccess(user, mode === "edit");
      onClose();
    } catch (err: any) {
      addToast("error", err?.response?.data?.message || "Operation failed.");
    } finally {
      setSaving(false);
    }
  };

  /* Roles visible to the current viewer */
  const availableRoles = ALL_ROLES.filter((r) => {
    if (viewerRole === "SUPER_ADMIN") return true;
    if (viewerRole === "ADMIN") return r !== "SUPER_ADMIN" && r !== "ADMIN";
    return false;
  });

  const inp = (key: keyof typeof errors): React.CSSProperties => ({
    width: "100%",
    border: `1.5px solid ${errors[key] ? "#ef4444" : "#e2e8f0"}`,
    borderRadius: 9,
    padding: "9px 12px",
    fontSize: 13.5,
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
    transition: "border 0.15s",
  });

  const lbl = (text: string, req = false) => (
    <label
      style={{
        display: "block",
        fontSize: 12,
        fontWeight: 700,
        color: "#374151",
        marginBottom: 6,
      }}
    >
      {text}
      {req && <span style={{ color: "#ef4444" }}> *</span>}
    </label>
  );

  const errMsg = (key: keyof typeof errors) =>
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
          maxWidth: 460,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          animation: "popIn 0.22s ease",
          overflow: "hidden",
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
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            {mode === "create" ? "Add New User" : "Edit User"}
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

        <div
          style={{
            padding: "20px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div>
            {lbl("Full Name", true)}
            <input
              value={form.name}
              onChange={set("name")}
              placeholder="Dr. John Smith"
              style={inp("name")}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = errors.name
                  ? "#ef4444"
                  : "#e2e8f0")
              }
            />
            {errMsg("name")}
          </div>
          <div>
            {lbl("Email", true)}
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="user@hospital.com"
              style={inp("email")}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = errors.email
                  ? "#ef4444"
                  : "#e2e8f0")
              }
            />
            {errMsg("email")}
          </div>
          <div>
            {lbl(
              mode === "edit"
                ? "New Password (leave blank to keep)"
                : "Password",
              mode === "create",
            )}
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder={
                mode === "edit"
                  ? "Leave blank to keep current"
                  : "Min 6 characters"
              }
              style={inp("password")}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = errors.password
                  ? "#ef4444"
                  : "#e2e8f0")
              }
            />
            {errMsg("password")}
          </div>
          <div>
            {lbl("Role", true)}
            <select
              value={form.role}
              onChange={set("role")}
              style={{ ...inp("role"), appearance: "auto" as any }}
            >
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_META[r]?.label ?? r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          style={{
            padding: "14px 28px 24px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            borderTop: "1px solid #f1f5f9",
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
              fontWeight: 700,
              minWidth: 120,
            }}
          >
            {saving
              ? "Saving…"
              : mode === "edit"
                ? "Save Changes"
                : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Reset Password Modal ────────────────────────────────────────────────── */

function ResetPasswordModal({
  user,
  onClose,
  addToast,
}: {
  user: User;
  onClose: () => void;
  addToast: (type: Toast["type"], msg: string) => void;
}) {
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async () => {
    if (!pw || pw.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    try {
      await axios.patch(
        `${API}/${user.id}/reset-password`,
        { newPassword: pw },
        { headers: authHdr() },
      );
      addToast("success", `Password reset for ${user.name}`);
      onClose();
    } catch (err: any) {
      addToast("error", err?.response?.data?.message || "Reset failed.");
    } finally {
      setSaving(false);
    }
  };

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
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 32,
          maxWidth: 380,
          width: "100%",
          boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
          animation: "popIn 0.22s ease",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "#fef9c3",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
            fontSize: 24,
          }}
        >
          🔑
        </div>
        <h3 style={{ margin: "0 0 6px", fontSize: 17, color: "#0f172a" }}>
          Reset Password
        </h3>
        <p style={{ color: "#64748b", fontSize: 13.5, marginBottom: 18 }}>
          Set a new password for <strong>{user.name}</strong>
        </p>
        <input
          type="password"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setError("");
          }}
          placeholder="New password (min 6 chars)"
          style={{
            width: "100%",
            border: `1.5px solid ${error ? "#ef4444" : "#e2e8f0"}`,
            borderRadius: 9,
            padding: "10px 12px",
            fontSize: 13.5,
            outline: "none",
            boxSizing: "border-box",
            marginBottom: error ? 4 : 16,
          }}
        />
        {error && (
          <span
            style={{
              color: "#ef4444",
              fontSize: 12,
              display: "block",
              marginBottom: 12,
            }}
          >
            {error}
          </span>
        )}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              border: "1.5px solid #e2e8f0",
              borderRadius: 10,
              background: "#fff",
              padding: "9px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleReset}
            disabled={saving}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 10,
              background: saving ? "#a5b4fc" : "#6366f1",
              color: "#fff",
              padding: "9px",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {saving ? "Resetting…" : "Reset"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Delete Confirm ──────────────────────────────────────────────────────── */

function DeleteConfirm({
  user,
  onConfirm,
  onCancel,
  deleting,
}: {
  user: User;
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
        <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "#0f172a" }}>
          Delete User?
        </h3>
        <p
          style={{
            color: "#64748b",
            fontSize: 14,
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          Permanently delete <strong>{user.name}</strong> ({user.email})?
          <br />
          This cannot be undone.
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

/* ─── Main Page ───────────────────────────────────────────────────────────── */

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  /* Filters */
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);

  /* Modals */
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [formInitial, setFormInitial] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | undefined>();
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* Toasts */
  const [toasts, setToasts] = useState<Toast[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Viewer role */
  const viewerRole =
    typeof window !== "undefined" ? (localStorage.getItem("role") ?? "") : "";

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = genId();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const removeToast = useCallback(
    (id: string) => setToasts((t) => t.filter((x) => x.id !== id)),
    [],
  );

  /* ── Fetch users ── */
  const fetchUsers = useCallback(
    async (params?: {
      search?: string;
      role?: string;
      page?: number;
      sortBy?: SortField;
      sortOrder?: SortOrder;
    }) => {
      setLoading(true);
      setError(null);
      const p = params || {};
      try {
        const resp = await axios.get(API, {
          headers: authHdr(),
          params: {
            search: p.search ?? search,
            role: p.role ?? roleFilter,
            page: p.page ?? page,
            limit: PAGE_LIMIT,
            sortBy: p.sortBy ?? sortBy,
            sortOrder: p.sortOrder ?? sortOrder,
          },
        });
        const body = resp.data;
        if (Array.isArray(body)) {
          setUsers(body);
          setTotal(body.length);
        } else if (body?.success && body?.data?.users) {
          setUsers(body.data.users);
          setTotal(body.data.pagination?.total ?? body.data.users.length);
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message || "Failed to load users.";
        setError(msg);
        addToast("error", msg);
      } finally {
        setLoading(false);
      }
    },
    [search, roleFilter, page, sortBy, sortOrder, addToast],
  );

  /* ── Fetch stats ── */
  const fetchStats = useCallback(async () => {
    try {
      const resp = await axios.get(`${API}/stats`, { headers: authHdr() });
      setStats(resp.data?.data ?? resp.data);
    } catch {
      /* stats non-fatal */
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [page, sortBy, sortOrder, roleFilter]);

  /* Debounced search */
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchUsers({ search, page: 1 });
    }, 380);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  /* ── Sort toggle ── */
  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  /* ── Permission helpers ── */
  const canEdit = (target: User) => {
    if (viewerRole === "SUPER_ADMIN") return true;
    if (viewerRole === "ADMIN")
      return target.role !== "SUPER_ADMIN" && target.role !== "ADMIN";
    return false;
  };
  const canCreate = viewerRole === "SUPER_ADMIN" || viewerRole === "ADMIN";

  /* ── After create/edit ── */
  const handleSuccess = (user: User, isEdit: boolean) => {
    if (isEdit)
      setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
    else {
      setUsers((prev) => [user, ...prev]);
      setTotal((t) => t + 1);
      fetchStats();
    }
  };

  /* ── Delete ── */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/${deleteTarget.id}`, { headers: authHdr() });
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setTotal((t) => t - 1);
      addToast("success", `${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
      fetchStats();
    } catch (err: any) {
      addToast(
        "error",
        err?.response?.data?.message || "Failed to delete user.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_LIMIT) || 1;

  const thS = (field: SortField): React.CSSProperties => ({
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
  const thP: React.CSSProperties = {
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
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      }}
    >
      <style>{`
        @keyframes shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes slideIn  { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes popIn    { from{transform:scale(0.9);opacity:0} to{transform:scale(1);opacity:1} }
        * { box-sizing:border-box; }
        input:focus,select:focus { border-color:#6366f1!important; outline:none; }
        ::-webkit-scrollbar{width:5px;height:5px} ::-webkit-scrollbar-track{background:#f1f5f9;border-radius:3px} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
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
                color: "#0f172a",
                letterSpacing: "-0.02em",
              }}
            >
              Users
            </h1>
            <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 14 }}>
              {loading
                ? "Loading…"
                : `${total} user${total !== 1 ? "s" : ""} in the system`}
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => {
                setFormInitial(EMPTY_FORM);
                setEditId(undefined);
                setFormMode("create");
              }}
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
              <span style={{ fontSize: 18 }}>+</span> Add User
            </button>
          )}
        </div>

        {/* ── Stats cards ── */}
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
              label: "Total Users",
              value: stats?.total ?? total,
              icon: "👥",
              color: "#6366f1",
              bg: "#eef2ff",
            },
            {
              label: "Doctors",
              value: stats?.byRole.DOCTOR ?? 0,
              icon: "🩺",
              color: "#0ea5e9",
              bg: "#e0f2fe",
            },
            {
              label: "Patients",
              value: stats?.byRole.PATIENT ?? 0,
              icon: "🧑",
              color: "#10b981",
              bg: "#d1fae5",
            },
            {
              label: "Admins",
              value:
                (stats?.byRole.ADMIN ?? 0) + (stats?.byRole.SUPER_ADMIN ?? 0),
              icon: "🛡",
              color: "#8b5cf6",
              bg: "#f3e8ff",
            },
            {
              label: "New This Month",
              value: stats?.newThisMonth ?? 0,
              icon: "✨",
              color: "#f59e0b",
              bg: "#fef9c3",
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
                  <Sk w={40} h={26} />
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

        {/* ── Search & filter bar ── */}
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
              placeholder="Search by name or email…"
              style={{
                width: "100%",
                border: "1.5px solid #e2e8f0",
                borderRadius: 10,
                padding: "9px 12px 9px 36px",
                fontSize: 13.5,
                outline: "none",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  fontSize: 13,
                }}
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
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
            <option value="">All Roles</option>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_META[r].label}
              </option>
            ))}
          </select>
          {(search || roleFilter) && (
            <button
              onClick={() => {
                setSearch("");
                setRoleFilter("");
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
            <div
              style={{
                padding: "56px 24px",
                textAlign: "center",
                color: "#ef4444",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{error}</div>
              <button
                onClick={() => fetchUsers()}
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
                Retry
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 720,
                }}
              >
                <thead>
                  <tr>
                    <th style={thS("name")} onClick={() => toggleSort("name")}>
                      User{" "}
                      <span
                        style={{
                          fontSize: 10,
                          color: sortBy === "name" ? "#6366f1" : "#cbd5e1",
                        }}
                      >
                        {sortBy === "name"
                          ? sortOrder === "asc"
                            ? "▲"
                            : "▼"
                          : "⇅"}
                      </span>
                    </th>
                    <th style={thP}>Role</th>
                    <th style={thP}>Profile</th>
                    <th
                      style={thS("createdAt")}
                      onClick={() => toggleSort("createdAt")}
                    >
                      Joined{" "}
                      <span
                        style={{
                          fontSize: 10,
                          color: sortBy === "createdAt" ? "#6366f1" : "#cbd5e1",
                        }}
                      >
                        {sortBy === "createdAt"
                          ? sortOrder === "asc"
                            ? "▲"
                            : "▼"
                          : "⇅"}
                      </span>
                    </th>
                    <th style={thP}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #f8fafc" }}>
                        {[44, "70%", "50%", "30%", "80px"].map((w, j) => (
                          <td key={j} style={{ padding: "16px" }}>
                            <Sk
                              w={w}
                              h={j === 0 ? 44 : 14}
                              r={j === 0 ? 22 : 6}
                            />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
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
                              ? `No users match "${search}"`
                              : "No users found"}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    users
                      .filter((u) => {
                        /* Client-side RBAC visibility filter */
                        if (viewerRole === "ADMIN" && u.role === "SUPER_ADMIN")
                          return false;
                        return true;
                      })
                      .map((user) => (
                        <tr
                          key={user.id}
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
                          {/* User col */}
                          <td style={{ padding: "14px 16px" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                              }}
                            >
                              <UserAvatar name={user.name} />
                              <div>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 13.5,
                                    color: "#0f172a",
                                  }}
                                >
                                  {user.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "#64748b",
                                    marginTop: 1,
                                  }}
                                >
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td style={{ padding: "14px 16px" }}>
                            <RoleBadge role={user.role} />
                          </td>

                          {/* Linked profile */}
                          <td
                            style={{
                              padding: "14px 16px",
                              fontSize: 12.5,
                              color: "#374151",
                            }}
                          >
                            {user.doctor && (
                              <div>
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    color: "#6366f1",
                                    fontSize: 12,
                                    background: "#eef2ff",
                                    padding: "1px 6px",
                                    borderRadius: 5,
                                  }}
                                >
                                  {user.doctor.doctorCode}
                                </span>
                                <div
                                  style={{
                                    fontSize: 11.5,
                                    color: "#94a3b8",
                                    marginTop: 2,
                                  }}
                                >
                                  {user.doctor.specialization} ·{" "}
                                  {user.doctor.department?.name}
                                </div>
                              </div>
                            )}
                            {user.patient && (
                              <div>
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    color: "#10b981",
                                    fontSize: 12,
                                    background: "#d1fae5",
                                    padding: "1px 6px",
                                    borderRadius: 5,
                                  }}
                                >
                                  {user.patient.patientCode}
                                </span>
                                <div
                                  style={{
                                    fontSize: 11.5,
                                    color: "#94a3b8",
                                    marginTop: 2,
                                  }}
                                >
                                  {user.patient.gender} · {user.patient.phone}
                                </div>
                              </div>
                            )}
                            {!user.doctor && !user.patient && (
                              <span style={{ color: "#cbd5e1", fontSize: 12 }}>
                                —
                              </span>
                            )}
                          </td>

                          {/* Joined */}
                          <td
                            style={{
                              padding: "14px 16px",
                              fontSize: 13,
                              color: "#64748b",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {new Date(user.createdAt).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "14px 16px" }}>
                            {canEdit(user) ? (
                              <div style={{ display: "flex", gap: 7 }}>
                                <button
                                  onClick={() => {
                                    setFormInitial({
                                      name: user.name,
                                      email: user.email,
                                      password: "",
                                      role: user.role,
                                    });
                                    setEditId(user.id);
                                    setFormMode("edit");
                                  }}
                                  style={{
                                    border: "1.5px solid #fde68a",
                                    borderRadius: 8,
                                    background: "#fefce8",
                                    color: "#a16207",
                                    padding: "5px 10px",
                                    cursor: "pointer",
                                    fontSize: 12.5,
                                    fontWeight: 600,
                                    transition: "all 0.15s",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                      "#fef08a")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background =
                                      "#fefce8")
                                  }
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => setResetTarget(user)}
                                  style={{
                                    border: "1.5px solid #bfdbfe",
                                    borderRadius: 8,
                                    background: "#eff6ff",
                                    color: "#1d4ed8",
                                    padding: "5px 10px",
                                    cursor: "pointer",
                                    fontSize: 12.5,
                                    fontWeight: 600,
                                    transition: "all 0.15s",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                      "#dbeafe")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background =
                                      "#eff6ff")
                                  }
                                  title="Reset password"
                                >
                                  🔑
                                </button>
                                {viewerRole === "SUPER_ADMIN" && (
                                  <button
                                    onClick={() => setDeleteTarget(user)}
                                    style={{
                                      border: "1.5px solid #fee2e2",
                                      borderRadius: 8,
                                      background: "#fff5f5",
                                      color: "#ef4444",
                                      padding: "5px 10px",
                                      cursor: "pointer",
                                      fontSize: 12.5,
                                      fontWeight: 600,
                                      transition: "all 0.15s",
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.background =
                                        "#fee2e2")
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.background =
                                        "#fff5f5")
                                    }
                                  >
                                    🗑
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: "#cbd5e1" }}>
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {!loading && !error && users.length > 0 && (
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 12.5, color: "#94a3b8" }}>
                Showing {Math.min((page - 1) * PAGE_LIMIT + 1, total)}–
                {Math.min(page * PAGE_LIMIT, total)} of {total} users
              </span>
              {totalPages > 1 && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    style={{
                      border: "1.5px solid #e2e8f0",
                      borderRadius: 8,
                      background: page <= 1 ? "#f8fafc" : "#fff",
                      color: page <= 1 ? "#cbd5e1" : "#374151",
                      padding: "6px 13px",
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
                          padding: "6px 12px",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: page === p ? 700 : 400,
                          minWidth: 35,
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
                      padding: "6px 13px",
                      cursor: page >= totalPages ? "not-allowed" : "pointer",
                      fontSize: 13,
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {formMode && (
        <UserFormModal
          mode={formMode}
          initial={formInitial}
          editId={editId}
          viewerRole={viewerRole}
          onClose={() => setFormMode(null)}
          onSuccess={handleSuccess}
          addToast={addToast}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          addToast={addToast}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          user={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
