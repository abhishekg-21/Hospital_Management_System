/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface MenuItem {
  name: string;
  path: string;
  icon: string;
  badge?: number;
}

interface MenuGroup {
  label: string;
  icon: string;
  items: MenuItem[];
}

/* ─── Role menus (all existing paths preserved exactly) ──────────────────── */

const ROLE_MENUS: Record<string, MenuGroup[]> = {
  ADMIN: [
    {
      label: "Overview",
      icon: "◈",
      items: [{ name: "Dashboard", path: "/admin/dashboard", icon: "⊞" }],
    },
    {
      label: "People",
      icon: "♟",
      items: [
        { name: "Patients", path: "/admin/patients", icon: "🧑" },
        { name: "Doctors", path: "/admin/doctors", icon: "🩺" },
        { name: "Users", path: "/admin/users", icon: "👤" },
      ],
    },
    {
      label: "Clinical",
      icon: "✚",
      items: [
        { name: "Departments", path: "/admin/departments", icon: "🏥" },
        { name: "Appointments", path: "/admin/appointments", icon: "📅" },
        { name: "IPD Management", path: "/admin/ipd", icon: "🛏" },
      ],
    },
    {
      label: "Finance",
      icon: "₹",
      items: [{ name: "Billing", path: "/admin/billing", icon: "💰" }],
    },
  ],

  SUPER_ADMIN: [
    {
      label: "Overview",
      icon: "◈",
      items: [{ name: "Dashboard", path: "/admin/dashboard", icon: "⊞" }],
    },
    {
      label: "Management",
      icon: "♟",
      items: [
        { name: "User Management", path: "/admin/users", icon: "👤" },
        { name: "Doctors", path: "/admin/doctors", icon: "🩺" },
        { name: "Patients", path: "/admin/patients", icon: "🧑" },
        { name: "Departments", path: "/admin/departments", icon: "🏥" },
      ],
    },
    {
      label: "Operations",
      icon: "✚",
      items: [
        { name: "Appointments", path: "/admin/appointments", icon: "📅" },
        { name: "Billing", path: "/admin/billing", icon: "💰" },
      ],
    },
  ],

  DOCTOR: [
    {
      label: "Overview",
      icon: "◈",
      items: [{ name: "Dashboard", path: "/doctor/dashboard", icon: "⊞" }],
    },
    {
      label: "Clinical",
      icon: "✚",
      items: [
        { name: "Appointments", path: "/doctor/appointments", icon: "📅" },
        { name: "Patients", path: "/doctor/patients", icon: "🧑" },
        { name: "Consultations", path: "/doctor/consultations", icon: "💬" },
        { name: "Prescriptions", path: "/doctor/prescriptions", icon: "💊" },
        { name: "IPD Patients", path: "/doctor/ipd", icon: "🛏" },
        { name: "Follow Ups", path: "/doctor/followups", icon: "🔁" },
      ],
    },
    {
      label: "Reports",
      icon: "📋",
      items: [
        { name: "Lab Reports", path: "/doctor/lab-reports", icon: "🧪" },
        { name: "Analytics", path: "/doctor/analytics", icon: "📊" },
      ],
    },
    {
      label: "Communication",
      icon: "✉",
      items: [{ name: "Messages", path: "/doctor/messages", icon: "✉" }],
    },
  ],

  RECEPTIONIST: [
    {
      label: "Overview",
      icon: "◈",
      items: [
        { name: "Dashboard", path: "/receptionist/dashboard", icon: "⊞" },
      ],
    },
    {
      label: "Patients",
      icon: "🧑",
      items: [
        {
          name: "Register Patient",
          path: "/receptionist/patients",
          icon: "🧑",
        },
        { name: "Check-In", path: "/receptionist/checkin", icon: "✔" },
      ],
    },
    {
      label: "Appointments",
      icon: "📅",
      items: [
        {
          name: "Book Appointment",
          path: "/receptionist/appointments",
          icon: "📅",
        },
      ],
    },
    {
      label: "Finance",
      icon: "💰",
      items: [{ name: "Billing", path: "/receptionist/billing", icon: "💰" }],
    },
  ],

  PATIENT: [
    {
      label: "My Health",
      icon: "❤",
      items: [
        { name: "Dashboard", path: "/patient/dashboard", icon: "⊞" },
        { name: "Appointments", path: "/patient/appointments", icon: "📅" },
        { name: "Prescriptions", path: "/patient/prescriptions", icon: "💊" },
        { name: "Reports", path: "/patient/reports", icon: "🧪" },
        { name: "Payments", path: "/patient/payments", icon: "💰" },
      ],
    },
  ],
};

/* ─── Role display labels & colours ──────────────────────────────────────── */

const ROLE_META: Record<string, { label: string; color: string; bg: string }> =
  {
    ADMIN: { label: "Admin", color: "#6366f1", bg: "#eef2ff" },
    SUPER_ADMIN: { label: "Super Admin", color: "#8b5cf6", bg: "#f3e8ff" },
    DOCTOR: { label: "Doctor", color: "#0ea5e9", bg: "#e0f2fe" },
    RECEPTIONIST: { label: "Receptionist", color: "#10b981", bg: "#d1fae5" },
    PATIENT: { label: "Patient", color: "#f59e0b", bg: "#fef9c3" },
  };

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const isActive = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(path + "/");

/* ─── Component ───────────────────────────────────────────────────────────── */

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({
  collapsed,
  onCollapse,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();

  /* Role — read synchronously on first render to avoid flash */
  const [role, setRole] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("role") ?? "";
  });

  /* Track which groups are open (by label). Default: all open */
  const groups = useMemo(() => ROLE_MENUS[role] ?? [], [role]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((ROLE_MENUS[role] ?? []).map((g) => [g.label, true])),
  );

  /* Search query */
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("role");
    if (stored && stored !== role) setRole(stored);
  }, [role]);

  /* Persist collapsed state */
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  /* Filter items by search */
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => i.name.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, search]);

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const rm = ROLE_META[role];
  const W = collapsed ? 68 : 256;

  /* ── Sidebar inner content ── */
  const sidebarContent = (
    <div
      style={{
        width: W,
        height: "100vh",
        background: "#fff",
        borderRight: "1px solid #f1f5f9",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
        boxShadow: "2px 0 12px rgba(0,0,0,0.04)",
        position: "relative",
      }}
    >
      {/* ── Logo area ── */}
      <div
        style={{
          padding: collapsed ? "20px 0" : "20px 18px",
          borderBottom: "1px solid #f1f5f9",
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: collapsed ? "center" : "flex-start",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 900,
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          H
        </div>
        {!collapsed && (
          <div style={{ overflow: "hidden" }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.02em",
                whiteSpace: "nowrap",
              }}
            >
              MediCore
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: "#94a3b8",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              Hospital Management
            </div>
          </div>
        )}
      </div>

      {/* ── Search (visible only when expanded) ── */}
      {!collapsed && (
        <div style={{ padding: "12px 14px 8px", flexShrink: 0 }}>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 13,
                color: "#94a3b8",
              }}
            >
              🔍
            </span>
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu…"
              style={{
                width: "100%",
                border: "1.5px solid #f1f5f9",
                borderRadius: 9,
                padding: "7px 10px 7px 30px",
                fontSize: 13,
                outline: "none",
                background: "#f8fafc",
                color: "#374151",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#f1f5f9")}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  fontSize: 13,
                  padding: 0,
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Navigation groups ── */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: collapsed ? "8px 0" : "8px 10px",
        }}
      >
        {filteredGroups.map((group) => {
          const groupOpen = openGroups[group.label] !== false;
          const anyActive = group.items.some((i) => isActive(pathname, i.path));

          return (
            <div key={group.label} style={{ marginBottom: 4 }}>
              {/* Group header */}
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.label)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    borderRadius: 8,
                    transition: "background 0.13s",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f8fafc")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      flex: 1,
                    }}
                  >
                    {group.label}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "#cbd5e1",
                      transition: "transform 0.18s",
                      display: "inline-block",
                      transform: groupOpen ? "rotate(0deg)" : "rotate(-90deg)",
                    }}
                  >
                    ▾
                  </span>
                </button>
              ) : (
                /* Collapsed: show a thin separator with tooltip on hover */
                <div
                  title={group.label}
                  style={{
                    height: 1,
                    background: "#f1f5f9",
                    margin: "8px 12px",
                  }}
                />
              )}

              {/* Items */}
              {(groupOpen || collapsed) &&
                group.items.map((item) => {
                  const active = isActive(pathname, item.path);
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      title={collapsed ? item.name : undefined}
                      onClick={onMobileClose}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: collapsed ? 0 : 10,
                        justifyContent: collapsed ? "center" : "flex-start",
                        padding: collapsed ? "10px 0" : "9px 10px",
                        borderRadius: 10,
                        marginBottom: 2,
                        textDecoration: "none",
                        background: active
                          ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                          : anyActive && !active
                            ? "transparent"
                            : "transparent",
                        color: active ? "#fff" : "#475569",
                        fontWeight: active ? 700 : 500,
                        fontSize: 13.5,
                        transition: "all 0.15s",
                        position: "relative",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => {
                        if (!active)
                          e.currentTarget.style.background = "#f1f5f9";
                      }}
                      onMouseLeave={(e) => {
                        if (!active)
                          e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <span
                        style={{
                          fontSize: collapsed ? 18 : 15,
                          lineHeight: 1,
                          flexShrink: 0,
                        }}
                      >
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <span
                          style={{
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.name}
                        </span>
                      )}
                      {!collapsed &&
                        item.badge !== undefined &&
                        item.badge > 0 && (
                          <span
                            style={{
                              background: active
                                ? "rgba(255,255,255,0.3)"
                                : "#ef4444",
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: 700,
                              borderRadius: 99,
                              padding: "1px 6px",
                              minWidth: 18,
                              textAlign: "center",
                            }}
                          >
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                      {/* Active left accent when not collapsed */}
                      {active && !collapsed && (
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            top: "20%",
                            bottom: "20%",
                            width: 3,
                            borderRadius: 99,
                            background: "#fff",
                            opacity: 0.6,
                          }}
                        />
                      )}
                    </Link>
                  );
                })}
            </div>
          );
        })}

        {/* Empty search result */}
        {search && filteredGroups.length === 0 && (
          <div
            style={{
              padding: "24px 12px",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            No menu items match "{search}"
          </div>
        )}
      </nav>

      {/* ── User role chip ── */}
      {!collapsed && rm && (
        <div
          style={{
            padding: "10px 14px",
            borderTop: "1px solid #f1f5f9",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: rm.bg,
              borderRadius: 10,
              padding: "8px 12px",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: rm.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              {rm.label[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: rm.color,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {rm.label}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {typeof window !== "undefined"
                  ? (JSON.parse(localStorage.getItem("user") ?? "{}").name ??
                    "—")
                  : "—"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Collapse toggle button ── */}
      <button
        onClick={() => onCollapse(!collapsed)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{
          margin: "10px auto",
          width: 32,
          height: 32,
          border: "1.5px solid #f1f5f9",
          borderRadius: 8,
          background: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: 14,
          flexShrink: 0,
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#f1f5f9";
          e.currentTarget.style.color = "#6366f1";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#fff";
          e.currentTarget.style.color = "#94a3b8";
        }}
      >
        {collapsed ? "→" : "←"}
      </button>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes sidebarSlide { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        nav::-webkit-scrollbar{width:3px}
        nav::-webkit-scrollbar-track{background:transparent}
        nav::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:3px}
      `}</style>

      {/* ── Desktop sidebar ── */}
      <div
        className="hidden md:block"
        style={{
          flexShrink: 0,
          width: W,
          transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {sidebarContent}
      </div>

      {/* ── Mobile: backdrop + slide-in drawer ── */}
      {mobileOpen && (
        <div
          className="md:hidden"
          style={{ position: "fixed", inset: 0, zIndex: 999 }}
        >
          {/* Backdrop */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
            }}
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              animation: "sidebarSlide 0.22s ease",
              zIndex: 1,
            }}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
