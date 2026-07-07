/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/immutability */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface Overview {
  totalPatients: number;
  totalDoctors: number;
  totalDepartments: number;
  totalUsers: number;
}

interface AppointmentStats {
  today: number;
  week: number;
  month: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  total: number;
  statusDistribution: { label: string; count: number; color: string }[];
}

interface PatientStats {
  newToday: number;
  newWeek: number;
  newMonth: number;
}

interface BillingStats {
  collectedMonth: number;
  totalBilledMonth: number;
}

interface DayPoint {
  date: string;
  label: string;
  count: number;
}

interface ScheduleItem {
  id: string;
  time: string;
  status: string;
  patient: { firstName: string; lastName: string; patientCode: string };
  doctor: { name: string; specialization: string };
}

interface TopDoctor {
  doctor: {
    id: string;
    name: string;
    specialization: string;
    doctorCode: string;
  };
  appointmentCount: number;
}

interface DeptStat {
  id: string;
  name: string;
  doctorCount: number;
}

interface ActivityItem {
  id: string;
  time: string;
  status: string;
  createdAt: string;
  patient: { firstName: string; lastName: string };
  doctor: { name: string };
}

interface DashboardData {
  overview: Overview;
  appointments: AppointmentStats;
  patients: PatientStats;
  billing: BillingStats;
  last7Days: DayPoint[];
  todaySchedule: ScheduleItem[];
  topDoctors: TopDoctor[];
  departments: DeptStat[];
  recentActivity: ActivityItem[];
}

/* ─── Constants ───────────────────────────────────────────────────────────── */

const API_SUMMARY = "http://localhost:5000/api/dashboard";
const API_STATS = "http://localhost:5000/api/dashboard/stats"; // legacy fallback
const REFRESH_MS = 60_000; // refresh every 60 s — not 3 s

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const fmt = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const STATUS_META: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  PENDING: { label: "Pending", bg: "#fef9c3", color: "#a16207" },
  CONFIRMED: { label: "Confirmed", bg: "#dbeafe", color: "#1d4ed8" },
  CHECKED_IN: { label: "Checked In", bg: "#d1fae5", color: "#065f46" },
  COMPLETED: { label: "Completed", bg: "#dcfce7", color: "#15803d" },
  CANCELLED: { label: "Cancelled", bg: "#fee2e2", color: "#b91c1c" },
};

/* ─── Skeleton ────────────────────────────────────────────────────────────── */

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

/* ─── Inline Sparkline (SVG, no library) ─────────────────────────────────── */

function Sparkline({
  data,
  color,
  height = 40,
}: {
  data: number[];
  color: string;
  height?: number;
}) {
  if (!data.length) return null;
  const w = 120;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - (v / max) * (height - 6) - 3;
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");
  const area =
    `${pts[0].split(",")[0]},${height} ` +
    polyline +
    ` ${pts[pts.length - 1].split(",")[0]},${height}`;
  return (
    <svg width={w} height={height} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${color.slice(1)})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((v, i) => {
        const [x, y] = pts[i].split(",").map(Number);
        return i === data.length - 1 ? (
          <circle key={i} cx={x} cy={y} r={3} fill={color} />
        ) : null;
      })}
    </svg>
  );
}

/* ─── Mini Bar Chart (SVG, no library) ────────────────────────────────────── */

function MiniBarChart({
  data,
  color = "#6366f1",
}: {
  data: DayPoint[];
  color?: string;
}) {
  const h = 64;
  const gap = 6;
  const max = Math.max(...data.map((d) => d.count), 1);
  const barW = Math.floor((240 - gap * (data.length - 1)) / data.length);

  return (
    <svg width={240} height={h + 20} style={{ overflow: "visible" }}>
      {data.map((d, i) => {
        const barH = Math.max(4, (d.count / max) * h);
        const x = i * (barW + gap);
        const y = h - barH;
        const isLast = i === data.length - 1;
        return (
          <g key={d.date}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={3}
              fill={isLast ? color : `${color}66`}
            />
            <text
              x={x + barW / 2}
              y={h + 14}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={9}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Donut Chart (SVG, no library) ──────────────────────────────────────── */

function DonutChart({
  slices,
  size = 88,
}: {
  slices: { label: string; count: number; color: string }[];
  size?: number;
}) {
  const total = slices.reduce((s, x) => s + x.count, 0);
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const stroke = 14;

  if (total === 0) {
    return (
      <svg width={size} height={size}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={stroke}
        />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fill="#cbd5e1"
          fontSize={10}
        >
          No data
        </text>
      </svg>
    );
  }

  let offset = 0;
  const circ = 2 * Math.PI * r;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth={stroke}
      />
      {slices.map((s) => {
        const dash = (s.count / total) * circ;
        const gap = circ - dash;
        const el = (
          <circle
            key={s.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

/* ─── Stat Card ───────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
  bg,
  sparkData,
  loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  color: string;
  bg: string;
  sparkData?: number[];
  loading?: boolean;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "20px 22px",
        border: "1px solid #f1f5f9",
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            {label}
          </div>
          {loading ? (
            <Sk w={80} h={30} />
          ) : (
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {fmt(Number(value))}
            </div>
          )}
          {sub && !loading && (
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 5 }}>
              {sub}
            </div>
          )}
        </div>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 13,
            background: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
      {sparkData && !loading && (
        <div style={{ marginTop: 4 }}>
          <Sparkline data={sparkData} color={color} />
        </div>
      )}
    </div>
  );
}

/* ─── Section Header ──────────────────────────────────────────────────────── */

function SectionHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
          {title}
        </div>
        {sub && (
          <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}

/* ─── Status Badge ────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? {
    label: status,
    bg: "#f1f5f9",
    color: "#475569",
  };
  return (
    <span
      style={{
        background: m.bg,
        color: m.color,
        padding: "3px 9px",
        borderRadius: 20,
        fontSize: 11.5,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {m.label}
    </span>
  );
}

/* ─── Doctor Avatar ───────────────────────────────────────────────────────── */

function DocAvatar({ name, size = 34 }: { name: string; size?: number }) {
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
  const bg = colors[name.charCodeAt(0) % colors.length];
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

/* ─── Quick Action Button ─────────────────────────────────────────────────── */

function QuickAction({
  icon,
  label,
  color,
  bg,
  href,
}: {
  icon: string;
  label: string;
  color: string;
  bg: string;
  href?: string;
}) {
  const [hov, setHov] = useState(false);
  const el = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        background: hov ? bg : "#fff",
        border: `1.5px solid ${hov ? color : "#f1f5f9"}`,
        borderRadius: 14,
        padding: "18px 12px",
        cursor: "pointer",
        transition: "all 0.17s",
        textDecoration: "none",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: hov ? color : "#374151",
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {label}
      </span>
    </div>
  );
  return href ? (
    <a href={href} style={{ textDecoration: "none" }}>
      {el}
    </a>
  ) : (
    el
  );
}

/* ─── Progress Bar ────────────────────────────────────────────────────────── */

function ProgressBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      style={{
        background: "#f1f5f9",
        borderRadius: 99,
        height: 6,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          borderRadius: 99,
          transition: "width 0.6s ease",
        }}
      />
    </div>
  );
}

/* ─── Main Dashboard ──────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchingRef = useRef(false); // guard against overlapping fetches

  const fetchData = useCallback(async () => {
    /* Skip if a fetch is already in-flight */
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const resp = await axios.get(API_SUMMARY, { headers: authHeaders() });
      const body = resp.data;
      /* Handle both plain data and {success, data} envelope */
      setData(body?.success ? body.data : body);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      /* If summary endpoint doesn't exist yet, fall back to the legacy stats call */
      if (err?.response?.status === 404) {
        try {
          const legacy = await axios.get(API_STATS, { headers: authHeaders() });
          const s = legacy.data;
          /* Construct a minimal DashboardData shape from legacy response */
          setData({
            overview: {
              totalPatients: s.totalPatients,
              totalDoctors: s.totalDoctors,
              totalDepartments: 0,
              totalUsers: s.totalUsers,
            },
            appointments: {
              today: 0,
              week: 0,
              month: 0,
              pending: 0,
              confirmed: 0,
              completed: 0,
              cancelled: 0,
              total: 0,
              statusDistribution: [],
            },
            patients: { newToday: 0, newWeek: 0, newMonth: 0 },
            billing: { collectedMonth: 0, totalBilledMonth: 0 },
            last7Days: [],
            todaySchedule: [],
            topDoctors: [],
            departments: [],
            recentActivity: [],
          });
          setLastUpdated(new Date());
          setError(null);
        } catch {
          setError("Failed to load dashboard data.");
        }
      } else {
        setError(
          err?.response?.data?.message || "Failed to load dashboard data.",
        );
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchData();

    /* Refresh every 60 s — only when tab is visible */
    timerRef.current = setInterval(() => {
      if (!document.hidden) fetchData();
    }, REFRESH_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData]);

  const d = data;

  /* Sparkline data from last 7 days */
  const sparkAppt = d?.last7Days.map((x) => x.count) ?? [];

  /* Donut total */
  const donutTotal = d?.appointments.total ?? 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
        color: "#0f172a",
      }}
    >
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#f1f5f9;border-radius:3px}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
      `}</style>

      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "32px 24px",
          animation: "fadeUp 0.3s ease",
        }}
      >
        {/* ── Page header ── */}
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
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "#0f172a",
              }}
            >
              Dashboard
            </h1>
            <p style={{ margin: "5px 0 0", fontSize: 13.5, color: "#64748b" }}>
              {loading
                ? "Loading hospital overview…"
                : lastUpdated
                  ? `Last updated ${timeAgo(lastUpdated.toISOString())}`
                  : "Hospital management overview"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {lastUpdated && (
              <div
                style={{
                  fontSize: 12,
                  color: "#94a3b8",
                  background: "#fff",
                  border: "1px solid #f1f5f9",
                  borderRadius: 8,
                  padding: "6px 12px",
                }}
              >
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            )}
            <button
              onClick={fetchData}
              style={{
                border: "1.5px solid #e2e8f0",
                borderRadius: 10,
                background: "#fff",
                padding: "7px 16px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1.5px solid #fecaca",
              borderRadius: 12,
              padding: "14px 18px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 13.5,
              color: "#b91c1c",
            }}
          >
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span style={{ flex: 1 }}>{error}</span>
            <button
              onClick={fetchData}
              style={{
                border: "1.5px solid #fecaca",
                borderRadius: 8,
                background: "#fff",
                padding: "5px 12px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                color: "#b91c1c",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ROW 1 — Overview stat cards (4)
        ══════════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <StatCard
            label="Total Patients"
            value={d?.overview.totalPatients ?? 0}
            sub={`+${d?.patients.newMonth ?? 0} this month`}
            icon="🧑‍⚕️"
            color="#6366f1"
            bg="#eef2ff"
            sparkData={sparkAppt}
            loading={loading}
          />
          <StatCard
            label="Total Doctors"
            value={d?.overview.totalDoctors ?? 0}
            sub={`Across ${d?.overview.totalDepartments ?? 0} departments`}
            icon="🩺"
            color="#0ea5e9"
            bg="#e0f2fe"
            loading={loading}
          />
          <StatCard
            label="Today's Appts"
            value={d?.appointments.today ?? 0}
            sub={`${d?.appointments.pending ?? 0} pending`}
            icon="📅"
            color="#10b981"
            bg="#d1fae5"
            sparkData={sparkAppt}
            loading={loading}
          />
          <StatCard
            label="Monthly Revenue"
            value={fmtCurrency(d?.billing.collectedMonth ?? 0)}
            sub={`of ${fmtCurrency(d?.billing.totalBilledMonth ?? 0)} billed`}
            icon="💰"
            color="#f59e0b"
            bg="#fef9c3"
            loading={loading}
          />
        </div>

        {/* ══════════════════════════════════════════════════════════════
            ROW 2 — Appointment metric strip (5 small cards)
        ══════════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {[
            {
              label: "This Week",
              value: d?.appointments.week,
              color: "#6366f1",
              bg: "#eef2ff",
              icon: "📆",
            },
            {
              label: "This Month",
              value: d?.appointments.month,
              color: "#8b5cf6",
              bg: "#f3e8ff",
              icon: "🗓",
            },
            {
              label: "Pending",
              value: d?.appointments.pending,
              color: "#f59e0b",
              bg: "#fef9c3",
              icon: "⏳",
            },
            {
              label: "Completed",
              value: d?.appointments.completed,
              color: "#22c55e",
              bg: "#dcfce7",
              icon: "✅",
            },
            {
              label: "Cancelled",
              value: d?.appointments.cancelled,
              color: "#ef4444",
              bg: "#fee2e2",
              icon: "❌",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "#fff",
                borderRadius: 13,
                padding: "14px 16px",
                border: "1px solid #f1f5f9",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 8,
                }}
              >
                {s.label}
              </div>
              {loading ? (
                <Sk w={40} h={22} />
              ) : (
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: s.color,
                    lineHeight: 1,
                  }}
                >
                  {s.value ?? 0}
                </div>
              )}
              <div
                style={{
                  width: 28,
                  height: 4,
                  borderRadius: 99,
                  background: s.bg,
                  marginTop: 8,
                }}
              />
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            ROW 3 — Charts row: bar chart + donut + patient growth
        ══════════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
            marginBottom: 20,
          }}
        >
          {/* 7-day bar chart */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "22px 24px",
              border: "1px solid #f1f5f9",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
              gridColumn: "span 1",
            }}
          >
            <SectionHeader
              title="Appointments — last 7 days"
              sub="Daily volume"
            />
            {loading ? (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-end",
                  height: 84,
                }}
              >
                {Array.from({ length: 7 }).map((_, i) => (
                  <Sk key={i} w={28} h={30 + i * 8} />
                ))}
              </div>
            ) : d?.last7Days.length ? (
              <MiniBarChart data={d.last7Days} />
            ) : (
              <div
                style={{
                  height: 84,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#cbd5e1",
                  fontSize: 13,
                }}
              >
                No data yet
              </div>
            )}
          </div>

          {/* Donut chart */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "22px 24px",
              border: "1px solid #f1f5f9",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            }}
          >
            <SectionHeader
              title="Status breakdown"
              sub="All-time distribution"
            />
            {loading ? (
              <Sk h={88} r={99} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <DonutChart
                    slices={d?.appointments.statusDistribution ?? []}
                    size={88}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color: "#0f172a",
                        lineHeight: 1,
                      }}
                    >
                      {fmt(donutTotal)}
                    </div>
                    <div
                      style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}
                    >
                      TOTAL
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {(d?.appointments.statusDistribution ?? []).map((s) => (
                    <div
                      key={s.label}
                      style={{ display: "flex", alignItems: "center", gap: 7 }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: s.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.label}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#0f172a",
                        }}
                      >
                        {s.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Patient growth mini-card */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "22px 24px",
              border: "1px solid #f1f5f9",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            }}
          >
            <SectionHeader title="Patient intake" sub="New registrations" />
            {loading ? (
              <Sk h={88} />
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                {[
                  {
                    label: "Today",
                    value: d?.patients.newToday ?? 0,
                    color: "#6366f1",
                  },
                  {
                    label: "This week",
                    value: d?.patients.newWeek ?? 0,
                    color: "#0ea5e9",
                  },
                  {
                    label: "This month",
                    value: d?.patients.newMonth ?? 0,
                    color: "#10b981",
                  },
                ].map((s) => (
                  <div key={s.label}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 5,
                      }}
                    >
                      <span style={{ fontSize: 12.5, color: "#64748b" }}>
                        {s.label}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: s.color,
                        }}
                      >
                        {s.value}
                      </span>
                    </div>
                    <ProgressBar
                      value={s.value}
                      max={Math.max(d?.patients.newMonth ?? 1, 1)}
                      color={s.color}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            ROW 4 — Today's schedule + Quick actions
        ══════════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 260px",
            gap: 16,
            marginBottom: 20,
          }}
        >
          {/* Today's schedule */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "22px 24px",
              border: "1px solid #f1f5f9",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            <SectionHeader
              title="Today's Schedule"
              sub={`${d?.todaySchedule.length ?? 0} appointments`}
            />
            {loading ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <Sk key={i} h={48} />
                ))}
              </div>
            ) : !d?.todaySchedule.length ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 0",
                  color: "#94a3b8",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>
                  No appointments scheduled for today
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  maxHeight: 340,
                  overflowY: "auto",
                }}
              >
                {d.todaySchedule.map((appt, i) => (
                  <div
                    key={appt.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "11px 0",
                      borderBottom:
                        i < d.todaySchedule.length - 1
                          ? "1px solid #f8fafc"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        minWidth: 46,
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: "#6366f1",
                        fontFamily: "monospace",
                        background: "#eef2ff",
                        padding: "4px 6px",
                        borderRadius: 7,
                        textAlign: "center",
                      }}
                    >
                      {appt.time}
                    </div>
                    <DocAvatar
                      name={`${appt.patient.firstName} ${appt.patient.lastName}`}
                      size={32}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13.5,
                          color: "#0f172a",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {appt.patient.firstName} {appt.patient.lastName}
                      </div>
                      <div
                        style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}
                      >
                        Dr. {appt.doctor.name} · {appt.doctor.specialization}
                      </div>
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "22px 24px",
              border: "1px solid #f1f5f9",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            }}
          >
            <SectionHeader title="Quick Actions" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <QuickAction
                icon="🩺"
                label="Add Doctor"
                color="#0ea5e9"
                bg="#e0f2fe"
                href="/admin/doctors"
              />
              <QuickAction
                icon="🧑"
                label="Add Patient"
                color="#6366f1"
                bg="#eef2ff"
                href="/admin/patients"
              />
              <QuickAction
                icon="📅"
                label="Book Appt"
                color="#10b981"
                bg="#d1fae5"
                href="/admin/appointments"
              />
              <QuickAction
                icon="🏥"
                label="Add Dept"
                color="#8b5cf6"
                bg="#f3e8ff"
                href="/admin/departments"
              />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            ROW 5 — Top doctors + Department load + Recent activity
        ══════════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
          }}
        >
          {/* Top doctors */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "22px 24px",
              border: "1px solid #f1f5f9",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            }}
          >
            <SectionHeader
              title="Top Doctors"
              sub="By appointments this month"
            />
            {loading ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <Sk key={i} h={40} />
                ))}
              </div>
            ) : !d?.topDoctors.length ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px 0",
                  color: "#94a3b8",
                  fontSize: 13,
                }}
              >
                No appointment data yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {d.topDoctors.map((t, i) => {
                  const maxCount = d.topDoctors[0]?.appointmentCount ?? 1;
                  const RANK_COLORS = [
                    "#f59e0b",
                    "#94a3b8",
                    "#cd7c2f",
                    "#6366f1",
                    "#10b981",
                  ];
                  return (
                    <div
                      key={t.doctor.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 0",
                        borderBottom:
                          i < d.topDoctors.length - 1
                            ? "1px solid #f8fafc"
                            : "none",
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: RANK_COLORS[i] ?? "#e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </div>
                      <DocAvatar name={t.doctor.name} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 13,
                            color: "#0f172a",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {t.doctor.name}
                        </div>
                        <ProgressBar
                          value={t.appointmentCount}
                          max={maxCount}
                          color={RANK_COLORS[i] ?? "#6366f1"}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#0f172a",
                          flexShrink: 0,
                        }}
                      >
                        {t.appointmentCount}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Department load */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "22px 24px",
              border: "1px solid #f1f5f9",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            }}
          >
            <SectionHeader title="Departments" sub="Doctor distribution" />
            {loading ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <Sk key={i} h={36} />
                ))}
              </div>
            ) : !d?.departments.length ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px 0",
                  color: "#94a3b8",
                  fontSize: 13,
                }}
              >
                No departments found
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  maxHeight: 300,
                  overflowY: "auto",
                }}
              >
                {d.departments.map((dept, i) => {
                  const maxDocs = Math.max(
                    ...d.departments.map((x) => x.doctorCount),
                    1,
                  );
                  const DEPT_COLORS = [
                    "#6366f1",
                    "#0ea5e9",
                    "#10b981",
                    "#f59e0b",
                    "#ef4444",
                    "#8b5cf6",
                    "#ec4899",
                    "#f97316",
                  ];
                  const col = DEPT_COLORS[i % DEPT_COLORS.length];
                  return (
                    <div
                      key={dept.id}
                      style={{
                        padding: "8px 0",
                        borderBottom:
                          i < d.departments.length - 1
                            ? "1px solid #f8fafc"
                            : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 5,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12.5,
                            color: "#374151",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "70%",
                          }}
                        >
                          {dept.name}
                        </span>
                        <span
                          style={{
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: col,
                          }}
                        >
                          {dept.doctorCount} 🩺
                        </span>
                      </div>
                      <ProgressBar
                        value={dept.doctorCount}
                        max={maxDocs}
                        color={col}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "22px 24px",
              border: "1px solid #f1f5f9",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            }}
          >
            <SectionHeader
              title="Recent Activity"
              sub="Latest appointments booked"
            />
            {loading ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <Sk key={i} h={44} />
                ))}
              </div>
            ) : !d?.recentActivity.length ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px 0",
                  color: "#94a3b8",
                  fontSize: 13,
                }}
              >
                No activity yet
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  maxHeight: 320,
                  overflowY: "auto",
                }}
              >
                {d.recentActivity.map((a, i) => (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "9px 0",
                      borderBottom:
                        i < d.recentActivity.length - 1
                          ? "1px solid #f8fafc"
                          : "none",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: STATUS_META[a.status]?.color ?? "#94a3b8",
                        marginTop: 5,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#0f172a",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {a.patient.firstName} {a.patient.lastName}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "#64748b",
                          marginTop: 1,
                        }}
                      >
                        Dr. {a.doctor.name}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <StatusBadge status={a.status} />
                      <div
                        style={{
                          fontSize: 10.5,
                          color: "#94a3b8",
                          marginTop: 4,
                        }}
                      >
                        {timeAgo(a.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
