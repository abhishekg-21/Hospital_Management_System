/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface User {
  name: string;
  email: string;
  role: string;
}

interface Notification {
  id: string;
  type: "appointment" | "patient" | "billing" | "system" | "doctor";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

interface HeaderProps {
  onMobileMenuOpen: () => void;
}

/* ─── Route → Page title map ─────────────────────────────────────────────── */

const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/patients": "Patients",
  "/admin/doctors": "Doctors",
  "/admin/users": "Users",
  "/admin/departments": "Departments",
  "/admin/appointments": "Appointments",
  "/admin/billing": "Billing",
  "/admin/ipd": "IPD Management",
  "/doctor/dashboard": "Dashboard",
  "/doctor/appointments": "Appointments",
  "/doctor/patients": "Patients",
  "/doctor/consultations": "Consultations",
  "/doctor/prescriptions": "Prescriptions",
  "/doctor/lab-reports": "Lab Reports",
  "/doctor/ipd": "IPD Patients",
  "/doctor/followups": "Follow Ups",
  "/doctor/messages": "Messages",
  "/doctor/analytics": "Analytics",
  "/receptionist/dashboard": "Dashboard",
  "/receptionist/patients": "Register Patient",
  "/receptionist/appointments": "Book Appointment",
  "/receptionist/checkin": "Check-In",
  "/receptionist/billing": "Billing",
  "/patient/dashboard": "Dashboard",
  "/patient/appointments": "My Appointments",
  "/patient/prescriptions": "Prescriptions",
  "/patient/reports": "Reports",
  "/patient/payments": "Payments",
};

const ROLE_META: Record<string, { label: string; color: string; bg: string }> =
  {
    ADMIN: { label: "Admin", color: "#6366f1", bg: "#eef2ff" },
    SUPER_ADMIN: { label: "Super Admin", color: "#8b5cf6", bg: "#f3e8ff" },
    DOCTOR: { label: "Doctor", color: "#0ea5e9", bg: "#e0f2fe" },
    RECEPTIONIST: { label: "Receptionist", color: "#10b981", bg: "#d1fae5" },
    PATIENT: { label: "Patient", color: "#f59e0b", bg: "#fef9c3" },
  };

/* ─── Demo notifications (replace with real API call) ────────────────────── */

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "appointment",
    title: "New Appointment",
    body: "Patient Rohan Mehta booked with Dr. Sharma at 10:30 AM",
    time: "2 min ago",
    read: false,
  },
  {
    id: "2",
    type: "patient",
    title: "New Patient Registered",
    body: "Priya Patel has been registered by reception",
    time: "15 min ago",
    read: false,
  },
  {
    id: "3",
    type: "billing",
    title: "Invoice Overdue",
    body: "Invoice #INV-0042 is overdue by 3 days",
    time: "1 hr ago",
    read: false,
  },
  {
    id: "4",
    type: "appointment",
    title: "Appointment Cancelled",
    body: "Appointment APT-0089 has been cancelled by the patient",
    time: "2 hr ago",
    read: true,
  },
  {
    id: "5",
    type: "system",
    title: "System Update",
    body: "Scheduled maintenance tonight 11 PM – 1 AM",
    time: "3 hr ago",
    read: true,
  },
];

const NOTIF_ICON: Record<string, string> = {
  appointment: "📅",
  patient: "🧑",
  billing: "💰",
  system: "⚙️",
  doctor: "🩺",
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const useOutsideClick = (
  ref: React.RefObject<HTMLElement | null>,
  cb: () => void,
) => {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, cb]);
};

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function Header({ onMobileMenuOpen }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  /* User — read on first render to avoid flash */
  /* User */
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  /* Notifications */
  const [notifs, setNotifs] = useState<Notification[]>(DEMO_NOTIFICATIONS);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  useOutsideClick(notifRef, () => setNotifOpen(false));

  /* Profile dropdown */
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  useOutsideClick(profileRef, () => setProfileOpen(false));

  /* Search */
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  /* Load user after mount */
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");

      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMounted(true);
    }
  }, []);

  /* Derived */
  const pageTitle = PAGE_TITLES[pathname] ?? "Hospital Management System";
  const unreadCount = notifs.filter((n) => !n.read).length;
  const roleMeta = ROLE_META[user?.role ?? ""] ?? null;
  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "U";

  {
    mounted ? (user?.name ?? "User") : "User";
  }

  /* Breadcrumbs — split pathname */
  const crumbs = pathname
    .split("/")
    .filter(Boolean)
    .map((seg, i, arr) => ({
      label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
      path: "/" + arr.slice(0, i + 1).join("/"),
    }));

  /* Handlers */
  const logout = useCallback(() => {
    localStorage.clear();
    router.push("/login");
  }, [router]);

  const markAllRead = () =>
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));

  const markRead = (id: string) =>
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );

  /* Keyboard shortcut: Cmd/Ctrl + K → focus search */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <style>{`
        @keyframes dropDown  { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes notifSlide{ from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .hdr-btn:hover { background:#f1f5f9!important; }
      `}</style>

      <header
        style={{
          height: 60,
          background: "#fff",
          borderBottom: "1px solid #f1f5f9",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 20px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          flexShrink: 0,
        }}
      >
        {/* ── Mobile hamburger ── */}
        <button
          className="md:hidden hdr-btn"
          onClick={onMobileMenuOpen}
          style={{
            width: 36,
            height: 36,
            border: "1.5px solid #f1f5f9",
            borderRadius: 9,
            background: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            color: "#374151",
            flexShrink: 0,
          }}
          aria-label="Open menu"
        >
          ☰
        </button>

        {/* ── Page title + breadcrumbs ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#0f172a",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {pageTitle}
          </div>
          <nav
            aria-label="Breadcrumb"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11.5,
              color: "#94a3b8",
              marginTop: 1,
            }}
          >
            <span style={{ color: "#94a3b8" }}>Home</span>
            {crumbs.map((c, i) => (
              <span
                key={c.path}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <span style={{ fontSize: 9, color: "#cbd5e1" }}>›</span>
                <span
                  style={{
                    color: i === crumbs.length - 1 ? "#6366f1" : "#94a3b8",
                    fontWeight: i === crumbs.length - 1 ? 600 : 400,
                  }}
                >
                  {c.label}
                </span>
              </span>
            ))}
          </nav>
        </div>

        {/* ── Global search (hidden on xs) ── */}
        <div className="hidden sm:flex" style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 14,
              color: "#94a3b8",
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setTimeout(() => setSearchFocus(false), 150)}
            placeholder="Search…"
            aria-label="Global search"
            style={{
              width: searchFocus ? 240 : 180,
              border: `1.5px solid ${searchFocus ? "#6366f1" : "#f1f5f9"}`,
              borderRadius: 10,
              padding: "7px 40px 7px 32px",
              fontSize: 13,
              outline: "none",
              background: "#f8fafc",
              color: "#374151",
              transition: "all 0.2s",
            }}
          />
          <span
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 10,
              color: "#cbd5e1",
              pointerEvents: "none",
              fontFamily: "monospace",
              background: "#f1f5f9",
              padding: "1px 5px",
              borderRadius: 4,
            }}
          >
            ⌘K
          </span>

          {/* Search dropdown placeholder */}
          {searchFocus && searchQuery && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 0,
                background: "#fff",
                border: "1.5px solid #f1f5f9",
                borderRadius: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                padding: "12px 14px",
                animation: "dropDown 0.18s ease",
                zIndex: 200,
                fontSize: 13,
                color: "#64748b",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 0",
                }}
              >
                <span>🔍</span> Search for{" "}
                <strong style={{ color: "#0f172a" }}>"{searchQuery}"</strong>{" "}
                across patients, doctors &amp; appointments…
              </div>
            </div>
          )}
        </div>

        {/* ── Notification bell ── */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button
            onClick={() => {
              setNotifOpen((o) => !o);
              setProfileOpen(false);
            }}
            className="hdr-btn"
            style={{
              width: 36,
              height: 36,
              border: "1.5px solid #f1f5f9",
              borderRadius: 9,
              background: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              position: "relative",
              flexShrink: 0,
            }}
            aria-label={`Notifications (${unreadCount} unread)`}
          >
            🔔
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #fff",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 8px)",
                width: 340,
                background: "#fff",
                border: "1.5px solid #f1f5f9",
                borderRadius: 14,
                boxShadow: "0 12px 36px rgba(0,0,0,0.12)",
                zIndex: 300,
                animation: "notifSlide 0.18s ease",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "14px 16px 10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <div
                  style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}
                >
                  Notifications
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      fontSize: 12,
                      color: "#6366f1",
                      fontWeight: 600,
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {notifs.length === 0 ? (
                  <div
                    style={{
                      padding: "32px 16px",
                      textAlign: "center",
                      color: "#94a3b8",
                      fontSize: 13,
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
                    No notifications
                  </div>
                ) : (
                  notifs.map((n, i) => (
                    <div
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: "12px 16px",
                        borderBottom:
                          i < notifs.length - 1 ? "1px solid #f8fafc" : "none",
                        background: n.read ? "#fff" : "#fafbff",
                        cursor: "pointer",
                        transition: "background 0.13s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#f8fafc")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = n.read
                          ? "#fff"
                          : "#fafbff")
                      }
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          background: n.read ? "#f1f5f9" : "#eef2ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                          flexShrink: 0,
                        }}
                      >
                        {NOTIF_ICON[n.type]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: n.read ? 500 : 700,
                            color: "#0f172a",
                            marginBottom: 2,
                          }}
                        >
                          {n.title}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#64748b",
                            lineHeight: 1.4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {n.body}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#94a3b8",
                            marginTop: 3,
                          }}
                        >
                          {n.time}
                        </div>
                      </div>
                      {!n.read && (
                        <div
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#6366f1",
                            marginTop: 5,
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "10px 16px",
                  borderTop: "1px solid #f1f5f9",
                  textAlign: "center",
                }}
              >
                <button
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontSize: 12.5,
                    color: "#6366f1",
                    fontWeight: 600,
                  }}
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Profile dropdown ── */}
        <div ref={profileRef} style={{ position: "relative" }}>
          <button
            onClick={() => {
              setProfileOpen((o) => !o);
              setNotifOpen(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: "1.5px solid #f1f5f9",
              borderRadius: 10,
              background: "#fff",
              padding: "4px 10px 4px 5px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            aria-label="User profile"
          >
            {/* Avatar */}
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            {/* Name + role — hidden on mobile */}
            <div className="hidden sm:block" style={{ textAlign: "left" }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                  maxWidth: 120,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user?.name ?? "User"}
              </div>
              {roleMeta && (
                <div
                  style={{
                    fontSize: 10.5,
                    color: roleMeta.color,
                    fontWeight: 600,
                  }}
                >
                  {roleMeta.label}
                </div>
              )}
            </div>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>▾</span>
          </button>

          {profileOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 8px)",
                width: 228,
                background: "#fff",
                border: "1.5px solid #f1f5f9",
                borderRadius: 14,
                boxShadow: "0 12px 36px rgba(0,0,0,0.12)",
                zIndex: 300,
                animation: "dropDown 0.18s ease",
                overflow: "hidden",
              }}
            >
              {/* Profile card */}
              <div
                style={{
                  padding: "16px",
                  borderBottom: "1px solid #f1f5f9",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: "#0f172a",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user?.name ?? "User"}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "#64748b",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user?.email}
                  </div>
                  {roleMeta && (
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: 3,
                        background: roleMeta.bg,
                        color: roleMeta.color,
                        fontSize: 10,
                        fontWeight: 700,
                        borderRadius: 99,
                        padding: "1px 7px",
                      }}
                    >
                      {roleMeta.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Menu items */}
              {[
                { icon: "👤", label: "View Profile", action: () => {} },
                { icon: "⚙️", label: "Account Settings", action: () => {} },
                { icon: "🔑", label: "Change Password", action: () => {} },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    item.action();
                    setProfileOpen(false);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 16px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontSize: 13.5,
                    color: "#374151",
                    textAlign: "left",
                    transition: "background 0.13s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f8fafc")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  <span style={{ fontSize: 15 }}>{item.icon}</span> {item.label}
                </button>
              ))}

              {/* Divider */}
              <div
                style={{ height: 1, background: "#f1f5f9", margin: "4px 0" }}
              />

              {/* Logout */}
              <button
                onClick={logout}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 16px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: 13.5,
                  color: "#ef4444",
                  fontWeight: 600,
                  textAlign: "left",
                  transition: "background 0.13s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#fef2f2")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                <span style={{ fontSize: 15 }}>🚪</span> Logout
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
