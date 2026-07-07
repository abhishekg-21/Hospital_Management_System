/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface DoctorSummary {
  id: string;
  doctorCode: string;
  name: string;
  specialization: string;
  phone: string;
  gender: string | null;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  code: string; // derived server-side: "CARD", "NEURO", etc.
  doctorCount: number; // from _count.doctors
  doctors: DoctorSummary[];
}

interface DeptStats {
  doctorCount: number;
  totalAppointments: number;
  todayAppointments: number;
  pendingAppointments: number;
  uniquePatients: number;
}

interface Toast {
  id: string;
  type: "success" | "error" | "warning";
  message: string;
}

type ModalMode = "create" | "edit" | "view";
type SortField = "name" | "createdAt" | "doctorCount";
type SortOrder = "asc" | "desc";

/* ─── Constants ───────────────────────────────────────────────────────────── */

const API = "http://localhost:5000/api/departments";
const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});
const genId = () => Math.random().toString(36).slice(2);

/* Colour palette for department cards — cycles by index */
const CARD_PALETTES = [
  { bg: "#eef2ff", border: "#c7d2fe", icon: "#6366f1", text: "#4338ca" },
  { bg: "#e0f2fe", border: "#bae6fd", icon: "#0ea5e9", text: "#0369a1" },
  { bg: "#d1fae5", border: "#a7f3d0", icon: "#10b981", text: "#065f46" },
  { bg: "#fce7f3", border: "#fbcfe8", icon: "#ec4899", text: "#9d174d" },
  { bg: "#fef9c3", border: "#fde68a", icon: "#f59e0b", text: "#92400e" },
  { bg: "#f3e8ff", border: "#e9d5ff", icon: "#8b5cf6", text: "#5b21b6" },
  { bg: "#ffedd5", border: "#fed7aa", icon: "#f97316", text: "#9a3412" },
  { bg: "#f0fdf4", border: "#bbf7d0", icon: "#22c55e", text: "#14532d" },
];

/* ─── Toast ───────────────────────────────────────────────────────────────── */

function ToastContainer({
  toasts,
  remove,
}: {
  toasts: Toast[];
  remove: (id: string) => void;
}) {
  const pal = {
    success: { border: "#22c55e", bg: "#f0fdf4", icon: "✓" },
    error: { border: "#ef4444", bg: "#fef2f2", icon: "✕" },
    warning: { border: "#f59e0b", bg: "#fffbeb", icon: "⚠" },
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

/* ─── Department Icon (letter avatar) ────────────────────────────────────── */

function DeptIcon({
  code,
  palette,
  size = 44,
}: {
  code: string;
  palette: (typeof CARD_PALETTES)[0];
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: palette.icon,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 800,
        fontSize: size * 0.28,
        letterSpacing: -0.5,
        flexShrink: 0,
      }}
    >
      {code.slice(0, 4)}
    </div>
  );
}

/* ─── Department Card (grid view) ────────────────────────────────────────── */

function DeptCard({
  dept,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  dept: Department;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pal = CARD_PALETTES[index % CARD_PALETTES.length];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: `1.5px solid ${hovered ? pal.border : "#f1f5f9"}`,
        boxShadow: hovered
          ? "0 8px 24px rgba(0,0,0,0.1)"
          : "0 1px 6px rgba(0,0,0,0.06)",
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        transition: "all 0.18s",
        cursor: "default",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <DeptIcon code={dept.code} palette={pal} />
        <span
          style={{
            background: pal.bg,
            color: pal.text,
            border: `1px solid ${pal.border}`,
            borderRadius: 8,
            padding: "3px 10px",
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: "0.05em",
          }}
        >
          {dept.code}
        </span>
      </div>

      {/* Name & description */}
      <div>
        <div
          style={{
            fontSize: 15.5,
            fontWeight: 700,
            color: "#1e293b",
            marginBottom: 5,
            lineHeight: 1.3,
          }}
        >
          {dept.name}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#64748b",
            lineHeight: 1.6,
            minHeight: 40,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {dept.description || (
            <span style={{ color: "#cbd5e1", fontStyle: "italic" }}>
              No description provided
            </span>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "flex", gap: 8 }}>
        <div
          style={{
            flex: 1,
            background: pal.bg,
            borderRadius: 10,
            padding: "8px 12px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, color: pal.icon }}>
            {dept.doctorCount}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              fontWeight: 500,
              marginTop: 1,
            }}
          >
            Doctors
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
        <button
          onClick={onView}
          style={{
            flex: 1,
            border: `1.5px solid ${pal.border}`,
            borderRadius: 9,
            background: pal.bg,
            color: pal.text,
            padding: "7px 0",
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: 600,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = pal.icon;
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.borderColor = pal.icon;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = pal.bg;
            e.currentTarget.style.color = pal.text;
            e.currentTarget.style.borderColor = pal.border;
          }}
        >
          👁 View
        </button>
        <button
          onClick={onEdit}
          style={{
            flex: 1,
            border: "1.5px solid #fde68a",
            borderRadius: 9,
            background: "#fefce8",
            color: "#a16207",
            padding: "7px 0",
            cursor: "pointer",
            fontSize: 12.5,
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
          ✏️ Edit
        </button>
        <button
          onClick={onDelete}
          style={{
            border: "1.5px solid #fee2e2",
            borderRadius: 9,
            background: "#fff5f5",
            color: "#ef4444",
            padding: "7px 12px",
            cursor: "pointer",
            fontSize: 13,
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
    </div>
  );
}

/* ─── Department View Panel ───────────────────────────────────────────────── */

function DeptViewPanel({
  dept,
  stats,
  loadingStats,
  index,
  onEdit,
}: {
  dept: Department;
  stats: DeptStats | null;
  loadingStats: boolean;
  index: number;
  onEdit: () => void;
}) {
  const pal = CARD_PALETTES[index % CARD_PALETTES.length];

  const statCard = (
    icon: string,
    label: string,
    value: number | string,
    color: string,
  ) => (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "14px 16px",
        border: "1px solid #f1f5f9",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      {loadingStats ? (
        <Skeleton w={40} h={24} />
      ) : (
        <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>
          {value}
        </div>
      )}
      <div
        style={{
          fontSize: 11.5,
          color: "#94a3b8",
          marginTop: 4,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
    </div>
  );

  return (
    <div
      style={{
        padding: "0 28px 28px",
        overflowY: "auto",
        maxHeight: "calc(90vh - 90px)",
      }}
    >
      {/* Hero banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: `linear-gradient(135deg, ${pal.icon}, ${pal.icon}cc)`,
          borderRadius: 14,
          padding: "20px 24px",
          marginBottom: 20,
          color: "#fff",
        }}
      >
        <DeptIcon
          code={dept.code}
          palette={{ ...pal, icon: "#ffffff33" }}
          size={52}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em" }}
          >
            {dept.name}
          </div>
          <div style={{ fontSize: 13, opacity: 0.82, marginTop: 3 }}>
            {dept.description || "No description"}
          </div>
        </div>
        <button
          onClick={onEdit}
          style={{
            border: "1.5px solid rgba(255,255,255,0.4)",
            borderRadius: 9,
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            padding: "7px 16px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            backdropFilter: "blur(4px)",
          }}
        >
          ✏️ Edit
        </button>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {statCard(
          "🩺",
          "Doctors",
          stats?.doctorCount ?? dept.doctorCount,
          pal.icon,
        )}
        {statCard(
          "📋",
          "Total Appts",
          stats?.totalAppointments ?? "—",
          "#6366f1",
        )}
        {statCard("📅", "Today", stats?.todayAppointments ?? "—", "#0ea5e9")}
        {statCard(
          "⏳",
          "Pending",
          stats?.pendingAppointments ?? "—",
          "#f59e0b",
        )}
        {statCard("👥", "Patients", stats?.uniquePatients ?? "—", "#10b981")}
      </div>

      {/* Doctors list */}
      <div
        style={{
          background: "#f8fafc",
          borderRadius: 12,
          padding: "16px 18px",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#374151",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 12,
          }}
        >
          Assigned Doctors ({dept.doctors.length})
        </div>

        {dept.doctors.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8" }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🩺</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              No doctors assigned to this department
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {dept.doctors.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "#fff",
                  borderRadius: 10,
                  padding: "10px 14px",
                  border: "1px solid #f1f5f9",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: pal.icon,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {doc.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13.5,
                      color: "#1e293b",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {doc.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>
                    {doc.specialization}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "#94a3b8",
                      fontFamily: "monospace",
                    }}
                  >
                    {doc.doctorCode}
                  </div>
                  <div
                    style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}
                  >
                    {doc.phone}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Department Form ─────────────────────────────────────────────────────── */

function DeptForm({
  mode,
  initial,
  editId,
  onClose,
  onSuccess,
  addToast,
}: {
  mode: "create" | "edit";
  initial: { name: string; description: string };
  editId?: string;
  onClose: () => void;
  onSuccess: (dept: Department, isEdit: boolean) => void;
  addToast: (type: Toast["type"], msg: string) => void;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Department name is required";
    else if (form.name.trim().length < 2)
      e.name = "Name must be at least 2 characters";
    else if (form.name.trim().length > 80)
      e.name = "Name must be under 80 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      };
      let dept: Department;
      if (mode === "edit" && editId) {
        const resp = await axios.put(`${API}/${editId}`, payload, {
          headers: authHeaders(),
        });
        dept = resp.data?.data ?? resp.data;
        addToast("success", `"${dept.name}" updated successfully`);
      } else {
        const resp = await axios.post(API, payload, { headers: authHeaders() });
        dept = resp.data?.data ?? resp.data;
        addToast("success", `"${dept.name}" department created`);
      }
      onSuccess(dept, mode === "edit");
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Operation failed. Please try again.";
      addToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const inp = (hasError: boolean): React.CSSProperties => ({
    width: "100%",
    border: `1.5px solid ${hasError ? "#ef4444" : "#e2e8f0"}`,
    borderRadius: 9,
    padding: "10px 13px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    transition: "border 0.15s",
    color: "#1e293b",
  });

  return (
    <>
      <div style={{ padding: "20px 28px 8px", flex: 1 }}>
        {/* Preview badge */}
        {form.name.trim() && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#f8faff",
              border: "1.5px solid #e0e7ff",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#6366f1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: -0.3,
              }}
            >
              {/* derive code preview client-side */}
              {(() => {
                const words = form.name.trim().split(/\s+/);
                return words.length === 1
                  ? words[0].slice(0, 4).toUpperCase()
                  : words
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 5)
                      .toUpperCase();
              })()}
            </div>
            <div>
              <div
                style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b" }}
              >
                {form.name.trim()}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Code preview</div>
            </div>
          </div>
        )}

        {/* Name */}
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
            Department Name <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
              setErrors({});
            }}
            placeholder="e.g. Cardiology, Neurology, Orthopedics"
            style={inp(!!errors.name)}
            autoFocus
          />
          {errors.name && (
            <span
              style={{
                color: "#ef4444",
                fontSize: 11.5,
                marginTop: 4,
                display: "block",
              }}
            >
              {errors.name}
            </span>
          )}
        </div>

        {/* Description */}
        <div style={{ marginBottom: 8 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 6,
            }}
          >
            Description{" "}
            <span style={{ color: "#94a3b8", fontWeight: 400 }}>
              (optional)
            </span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Brief overview of the department's scope and services…"
            rows={4}
            style={{ ...inp(false), resize: "vertical" }}
          />
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "14px 28px",
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
          background: "#fff",
          borderRadius: "0 0 18px 18px",
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
            padding: "9px 26px",
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: 14,
            fontWeight: 700,
            minWidth: 130,
          }}
        >
          {saving
            ? "Saving…"
            : mode === "edit"
              ? "Save Changes"
              : "Create Department"}
        </button>
      </div>
    </>
  );
}

/* ─── Modal ───────────────────────────────────────────────────────────────── */

function Modal({
  title,
  subtitle,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
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
          maxWidth: wide ? 680 : 500,
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
  dept,
  onConfirm,
  onCancel,
  deleting,
}: {
  dept: Department;
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
          maxWidth: 420,
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
          Delete Department?
        </h3>
        <p
          style={{
            color: "#64748b",
            fontSize: 14,
            marginBottom: 8,
            lineHeight: 1.6,
          }}
        >
          You are about to delete <strong>"{dept.name}"</strong>.
        </p>
        {dept.doctorCount > 0 && (
          <div
            style={{
              background: "#fff7ed",
              border: "1.5px solid #fed7aa",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 13,
              color: "#9a3412",
              textAlign: "left",
            }}
          >
            ⚠️ This department has{" "}
            <strong>
              {dept.doctorCount} doctor{dept.doctorCount > 1 ? "s" : ""}
            </strong>{" "}
            assigned. The backend will block deletion — reassign them first.
          </div>
        )}
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

/* ─── Sort Button ─────────────────────────────────────────────────────────── */

function SortBtn({
  label,
  field,
  active,
  order,
  onClick,
}: {
  label: string;
  field: SortField;
  active: boolean;
  order: SortOrder;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1.5px solid ${active ? "#6366f1" : "#e2e8f0"}`,
        borderRadius: 9,
        background: active ? "#eef2ff" : "#fff",
        color: active ? "#6366f1" : "#374151",
        padding: "7px 14px",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: active ? 700 : 400,
        display: "flex",
        alignItems: "center",
        gap: 5,
        transition: "all 0.15s",
      }}
    >
      {label}
      <span style={{ fontSize: 10, color: active ? "#6366f1" : "#cbd5e1" }}>
        {active ? (order === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </button>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */

export default function DepartmentsPage() {
  /* ── Data ── */
  const [departments, setDepartments] = useState<Department[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Filters / sort ── */
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [page, setPage] = useState(1);
  const LIMIT = 12;

  /* ── Modal ── */
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [modalInitial, setModalInitial] = useState({
    name: "",
    description: "",
  });
  const [editId, setEditId] = useState<string | undefined>();
  const [viewDept, setViewDept] = useState<Department | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const [viewStats, setViewStats] = useState<DeptStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  /* ── Delete ── */
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Toasts ── */
  const [toasts, setToasts] = useState<Toast[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = genId();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const removeToast = useCallback(
    (id: string) => setToasts((t) => t.filter((x) => x.id !== id)),
    [],
  );

  /* ── Fetch ── */
  const fetchDepartments = useCallback(
    async (params?: {
      search?: string;
      page?: number;
      sortBy?: SortField;
      sortOrder?: SortOrder;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const p = params || {};
        const resp = await axios.get(API, {
          headers: authHeaders(),
          params: {
            search: p.search ?? search,
            page: p.page ?? page,
            limit: LIMIT,
            sortBy: p.sortBy ?? sortBy,
            sortOrder: p.sortOrder ?? sortOrder,
          },
        });

        const body = resp.data;

        /* Handle three possible response shapes */
        if (Array.isArray(body)) {
          /* Legacy raw array OR backward-compat path from updated backend */
          setDepartments(body);
          setTotal(body.length);
        } else if (body?.success && body?.data?.departments) {
          setDepartments(body.data.departments);
          setTotal(body.data.pagination?.total ?? body.data.departments.length);
        } else if (Array.isArray(body?.data)) {
          setDepartments(body.data);
          setTotal(body.data.length);
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.message || "Failed to load departments.";
        setError(msg);
        addToast("error", msg);
      } finally {
        setLoading(false);
      }
    },
    [search, page, sortBy, sortOrder, addToast],
  );

  useEffect(() => {
    fetchDepartments();
  }, [page, sortBy, sortOrder]);

  /* Debounced search */
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchDepartments({ search, page: 1 });
    }, 380);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  /* ── Fetch stats for view panel ── */
  const fetchStats = useCallback(async (deptId: string) => {
    setLoadingStats(true);
    setViewStats(null);
    try {
      const resp = await axios.get(`${API}/${deptId}/stats`, {
        headers: authHeaders(),
      });
      setViewStats(resp.data?.data ?? null);
    } catch {
      /* Stats unavailable is non-fatal */
    } finally {
      setLoadingStats(false);
    }
  }, []);

  /* ── Sort toggle ── */
  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortOrder(field === "name" ? "asc" : "desc");
    }
    setPage(1);
  };

  /* ── Modal helpers ── */
  const openCreate = () => {
    setModalInitial({ name: "", description: "" });
    setEditId(undefined);
    setModalMode("create");
  };

  const openEdit = (dept: Department) => {
    setModalInitial({ name: dept.name, description: dept.description ?? "" });
    setEditId(dept.id);
    setModalMode("edit");
  };

  const openView = (dept: Department, index: number) => {
    setViewDept(dept);
    setViewIndex(index);
    setViewStats(null);
    setModalMode("view");
    fetchStats(dept.id);
  };

  /* ── After create/edit success ── */
  const handleSuccess = (dept: Department, isEdit: boolean) => {
    /* Ensure code and doctorCount are present (backend may not return _count) */
    const enriched: Department = {
      ...dept,
      code:
        dept.code ??
        dept.name
          .trim()
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .slice(0, 5)
          .toUpperCase(),
      doctorCount: dept.doctorCount ?? dept.doctors?.length ?? 0,
      doctors: dept.doctors ?? [],
    };

    if (isEdit) {
      setDepartments((prev) =>
        prev.map((d) => (d.id === enriched.id ? enriched : d)),
      );
      /* If view panel is open for this dept, update it */
      if (viewDept?.id === enriched.id) setViewDept(enriched);
    } else {
      setDepartments((prev) => [enriched, ...prev]);
      setTotal((t) => t + 1);
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
      setDepartments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setTotal((t) => t - 1);
      addToast("success", `"${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      if (viewDept?.id === deleteTarget.id) setModalMode(null);
    } catch (err: any) {
      addToast(
        "error",
        err?.response?.data?.message || "Failed to delete department.",
      );
    } finally {
      setDeleting(false);
    }
  };

  /* ── Derived values ── */
  const totalPages = Math.ceil(total / LIMIT) || 1;
  const totalDoctors = departments.reduce(
    (s, d) => s + (d.doctorCount ?? 0),
    0,
  );
  const hasFilters = !!search;
  const clearFilters = () => {
    setSearch("");
    setPage(1);
  };

  /* ── Skeleton cards ── */
  const skeletonCards = Array.from({ length: 6 }).map((_, i) => (
    <div
      key={i}
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1.5px solid #f1f5f9",
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Skeleton w={44} h={44} />
        <Skeleton w={48} h={22} />
      </div>
      <div>
        <Skeleton w="70%" h={16} />
        <div style={{ marginTop: 8 }}>
          <Skeleton h={12} />
        </div>
        <div style={{ marginTop: 5 }}>
          <Skeleton w="80%" h={12} />
        </div>
      </div>
      <Skeleton h={52} />
      <div style={{ display: "flex", gap: 8 }}>
        <Skeleton h={34} />
        <Skeleton h={34} />
        <Skeleton w={38} h={34} />
      </div>
    </div>
  ));

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "'Inter','Segoe UI',sans-serif",
      }}
    >
      <style>{`
        @keyframes shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes slideIn  { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes popIn    { from{transform:scale(0.9);opacity:0} to{transform:scale(1);opacity:1} }
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
              Departments
            </h1>
            <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>
              {loading
                ? "Loading…"
                : `${total} department${total !== 1 ? "s" : ""} · ${totalDoctors} doctors assigned`}
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
            <span style={{ fontSize: 18 }}>+</span> Add Department
          </button>
        </div>

        {/* ── Summary stat cards ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
            gap: 14,
            marginBottom: 24,
          }}
        >
          {[
            {
              label: "Total Depts",
              value: total,
              icon: "🏥",
              color: "#6366f1",
              bg: "#eef2ff",
            },
            {
              label: "Doctors",
              value: totalDoctors,
              icon: "🩺",
              color: "#0ea5e9",
              bg: "#e0f2fe",
            },
            {
              label: "Avg / Dept",
              value: total > 0 ? (totalDoctors / total).toFixed(1) : "0",
              icon: "📊",
              color: "#10b981",
              bg: "#d1fae5",
            },
            {
              label: "Empty Depts",
              value: departments.filter((d) => d.doctorCount === 0).length,
              icon: "⚠️",
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

        {/* ── Search, sort, filter bar ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            padding: "14px 18px",
            marginBottom: 22,
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
              placeholder="Search by department name or description…"
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

          {/* Sort buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <SortBtn
              label="Name"
              field="name"
              active={sortBy === "name"}
              order={sortOrder}
              onClick={() => toggleSort("name")}
            />
            <SortBtn
              label="Doctors"
              field="doctorCount"
              active={sortBy === "doctorCount"}
              order={sortOrder}
              onClick={() => toggleSort("doctorCount")}
            />
            <SortBtn
              label="Newest"
              field="createdAt"
              active={sortBy === "createdAt"}
              order={sortOrder}
              onClick={() => toggleSort("createdAt")}
            />
          </div>

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

        {/* ── Error state ── */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1.5px solid #fecaca",
              borderRadius: 14,
              padding: "24px",
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontWeight: 600, color: "#b91c1c", marginBottom: 8 }}>
              Failed to load departments
            </div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
            <button
              onClick={() => fetchDepartments()}
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
        )}

        {/* ── Department grid ── */}
        {!error && (
          <>
            {loading ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
                  gap: 18,
                }}
              >
                {skeletonCards}
              </div>
            ) : departments.length === 0 ? (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: "64px 24px",
                  textAlign: "center",
                  border: "1.5px dashed #e2e8f0",
                }}
              >
                <div style={{ fontSize: 56, marginBottom: 14 }}>
                  {search ? "🔍" : "🏥"}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#1e293b",
                    marginBottom: 8,
                  }}
                >
                  {search
                    ? `No departments match "${search}"`
                    : "No departments yet"}
                </div>
                <div
                  style={{ fontSize: 14, color: "#94a3b8", marginBottom: 22 }}
                >
                  {search
                    ? "Try a different search term."
                    : "Create your first department to get started."}
                </div>
                {!search && (
                  <button
                    onClick={openCreate}
                    style={{
                      border: "none",
                      borderRadius: 10,
                      background: "#6366f1",
                      color: "#fff",
                      padding: "10px 22px",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    + Add First Department
                  </button>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
                  gap: 18,
                }}
              >
                {departments.map((dept, i) => (
                  <DeptCard
                    key={dept.id}
                    dept={dept}
                    index={i}
                    onView={() => openView(dept, i)}
                    onEdit={() => openEdit(dept)}
                    onDelete={() => setDeleteTarget(dept)}
                  />
                ))}
              </div>
            )}

            {/* ── Pagination ── */}
            {!loading && totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 24,
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 13, color: "#64748b" }}>
                  Showing {Math.min((page - 1) * LIMIT + 1, total)}–
                  {Math.min(page * LIMIT, total)} of {total} departments
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
          </>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {(modalMode === "create" || modalMode === "edit") && (
        <Modal
          title={
            modalMode === "create" ? "Add New Department" : "Edit Department"
          }
          subtitle={
            modalMode === "create"
              ? "Fill in the details to create a department"
              : "Update department information"
          }
          onClose={() => setModalMode(null)}
        >
          <DeptForm
            mode={modalMode}
            initial={modalInitial}
            editId={editId}
            onClose={() => setModalMode(null)}
            onSuccess={handleSuccess}
            addToast={addToast}
          />
        </Modal>
      )}

      {/* ── View Modal ── */}
      {modalMode === "view" && viewDept && (
        <Modal
          title={viewDept.name}
          subtitle={`Code: ${viewDept.code} · ${viewDept.doctorCount} doctor${viewDept.doctorCount !== 1 ? "s" : ""}`}
          onClose={() => setModalMode(null)}
          wide
        >
          <DeptViewPanel
            dept={viewDept}
            stats={viewStats}
            loadingStats={loadingStats}
            index={viewIndex}
            onEdit={() => {
              setModalMode(null);
              setTimeout(() => openEdit(viewDept), 50);
            }}
          />
        </Modal>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <DeleteConfirm
          dept={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
