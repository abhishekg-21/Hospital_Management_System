"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

/* ─── Constants ───────────────────────────────────────────────────────────── */

const API_LOGIN = "http://localhost:5000/api/auth/login";
const API_REGISTER = "http://localhost:5000/api/auth/register";

const ROLE_ROUTES: Record<string, string> = {
  SUPER_ADMIN: "/admin/dashboard",
  ADMIN: "/admin/dashboard",
  DOCTOR: "/doctor/dashboard",
  RECEPTIONIST: "/receptionist/dashboard",
  PATIENT: "/patient/dashboard",
};

const GENDERS = ["Male", "Female", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

/* ─── Types ───────────────────────────────────────────────────────────────── */

type View = "login" | "register";

interface LoginForm {
  email: string;
  password: string;
}

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  gender: string;
  age: string;
  address: string;
  bloodGroup: string;
  emergencyPhone: string;
}

type LoginErrors = Partial<Record<keyof LoginForm, string>> & {
  general?: string;
};
type RegisterErrors = Partial<Record<keyof RegisterForm, string>> & {
  general?: string;
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const saveAuthState = (data: {
  token: string;
  user: Record<string, unknown>;
}) => {
  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.user.role as string);
  localStorage.setItem("user", JSON.stringify(data.user));
  if (data.user.patientId)
    localStorage.setItem("profileId", data.user.patientId as string);
  if (data.user.doctorId)
    localStorage.setItem("profileId", data.user.doctorId as string);
};

/* ─── Reusable input components ───────────────────────────────────────────── */

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 12.5,
          fontWeight: 600,
          color: "#374151",
          marginBottom: 5,
        }}
      >
        {label}
        {required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && (
        <span
          style={{
            display: "block",
            fontSize: 11.5,
            color: "#ef4444",
            marginTop: 4,
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: "100%",
  border: `1.5px solid ${hasError ? "#ef4444" : "#e2e8f0"}`,
  borderRadius: 9,
  padding: "9px 12px",
  fontSize: 13.5,
  outline: "none",
  background: "#fff",
  color: "#0f172a",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
});

const selectStyle = (hasError: boolean): React.CSSProperties => ({
  ...inputStyle(hasError),
  appearance: "auto",
  cursor: "pointer",
});

/* ─── Step indicator for register form ───────────────────────────────────── */

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 8,
        marginBottom: 24,
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            borderRadius: 99,
            background:
              i === current ? "#6366f1" : i < current ? "#a5b4fc" : "#e2e8f0",
            transition: "all 0.25s ease",
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOGIN FORM
═══════════════════════════════════════════════════════════════════════════ */

function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const router = useRouter();

  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set =
    (k: keyof LoginForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      setErrors((err) => ({ ...err, [k]: "", general: "" }));
    };

  const validate = (): boolean => {
    const e: LoginErrors = {};
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const resp = await axios.post(API_LOGIN, {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      saveAuthState(resp.data);

      const dest = ROLE_ROUTES[resp.data.user.role];
      if (dest) {
        router.push(dest);
      } else {
        localStorage.clear();
        setErrors({
          general: "Unrecognised account role. Please contact support.",
        });
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setErrors({
          general:
            err.response?.data?.message ||
            "Login failed. Please check your credentials.",
        });
      } else {
        setErrors({ general: "Something went wrong. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      {/* General error */}
      {errors.general && (
        <div
          style={{
            background: "#fef2f2",
            border: "1.5px solid #fecaca",
            borderRadius: 10,
            padding: "11px 14px",
            fontSize: 13.5,
            color: "#b91c1c",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <span>{errors.general}</span>
        </div>
      )}

      <Field label="Email Address" error={errors.email} required>
        <input
          type="email"
          value={form.email}
          onChange={set("email")}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={loading}
          style={inputStyle(!!errors.email)}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = errors.email
              ? "#ef4444"
              : "#e2e8f0")
          }
        />
      </Field>

      <Field label="Password" error={errors.password} required>
        <div style={{ position: "relative" }}>
          <input
            type={showPw ? "text" : "password"}
            value={form.password}
            onChange={set("password")}
            placeholder="Your password"
            autoComplete="current-password"
            disabled={loading}
            style={{ ...inputStyle(!!errors.password), paddingRight: 44 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = errors.password
                ? "#ef4444"
                : "#e2e8f0")
            }
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((v) => !v)}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "#94a3b8",
              fontSize: 16,
              padding: 0,
            }}
          >
            {showPw ? "🙈" : "👁"}
          </button>
        </div>
      </Field>

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          border: "none",
          borderRadius: 10,
          background: loading
            ? "#a5b4fc"
            : "linear-gradient(135deg,#6366f1,#8b5cf6)",
          color: "#fff",
          padding: "12px",
          fontSize: 15,
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: loading ? "none" : "0 4px 14px rgba(99,102,241,0.3)",
          transition: "all 0.2s",
          marginTop: 4,
        }}
      >
        {loading ? "Signing in…" : "Sign In →"}
      </button>

      {/* Switch to register */}
      <p
        style={{
          textAlign: "center",
          fontSize: 13.5,
          color: "#64748b",
          margin: 0,
        }}
      >
        New patient?{" "}
        <button
          type="button"
          onClick={onSwitchToRegister}
          style={{
            border: "none",
            background: "none",
            color: "#6366f1",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 13.5,
            padding: 0,
          }}
        >
          Create an account
        </button>
      </p>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   REGISTER FORM  —  2 steps
   Step 1: Account details (name, email, password)
   Step 2: Patient details (phone, gender, age, address, optional fields)
═══════════════════════════════════════════════════════════════════════════ */

const EMPTY_REG: RegisterForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  gender: "",
  age: "",
  address: "",
  bloodGroup: "",
  emergencyPhone: "",
};

function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const router = useRouter();

  const [step, setStep] = useState<0 | 1>(0);
  const [form, setForm] = useState<RegisterForm>(EMPTY_REG);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);

  const set =
    (k: keyof RegisterForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      setErrors((err) => ({ ...err, [k]: "", general: "" }));
    };

  /* ── Step 0 validation ── */
  const validateStep0 = (): boolean => {
    const e: RegisterErrors = {};
    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.lastName.trim()) e.lastName = "Last name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "Minimum 6 characters";
    if (!form.confirmPassword)
      e.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Step 1 validation ── */
  const validateStep1 = (): boolean => {
    const e: RegisterErrors = {};
    if (!form.phone.trim()) e.phone = "Phone number is required";
    else if (!/^\d{7,15}$/.test(form.phone.replace(/[\s\-+()]/g, "")))
      e.phone = "Enter a valid phone number";
    if (!form.gender) e.gender = "Please select a gender";
    if (!form.age.trim()) e.age = "Age is required";
    else {
      const n = parseInt(form.age, 10);
      if (isNaN(n) || n < 0 || n > 120) e.age = "Enter a valid age (0–120)";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep0()) setStep(1);
  };

  const handleBack = () => {
    setErrors({});
    setStep(0);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validateStep1()) return;
    setLoading(true);

    try {
      const resp = await axios.post(API_REGISTER, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        phone: form.phone.trim(),
        gender: form.gender,
        age: parseInt(form.age, 10),
        address: form.address.trim() || undefined,
        bloodGroup: form.bloodGroup.trim() || undefined,
        emergencyPhone: form.emergencyPhone.trim() || undefined,
      });

      saveAuthState(resp.data);
      router.push(ROLE_ROUTES.PATIENT);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message || "Registration failed.";
        /* If duplicate email, go back to step 0 so they can correct it */
        if (
          err.response?.status === 409 &&
          msg.toLowerCase().includes("email")
        ) {
          setStep(0);
          setErrors({
            email: "This email is already registered. Please log in.",
            general: "",
          });
        } else {
          setErrors({ general: msg });
        }
      } else {
        setErrors({ general: "Something went wrong. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Shared focus handlers ── */
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = "#6366f1");
  const onBlur =
    (key: keyof RegisterErrors) =>
    (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
      (e.currentTarget.style.borderColor = errors[key] ? "#ef4444" : "#e2e8f0");

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{ display: "flex", flexDirection: "column", gap: 0 }}
    >
      <StepDots current={step} total={2} />

      {/* General error */}
      {errors.general && (
        <div
          style={{
            background: "#fef2f2",
            border: "1.5px solid #fecaca",
            borderRadius: 10,
            padding: "11px 14px",
            fontSize: 13.5,
            color: "#b91c1c",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <span>{errors.general}</span>
        </div>
      )}

      {/* ── STEP 0: Account Details ── */}
      {step === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <Field label="First Name" error={errors.firstName} required>
              <input
                value={form.firstName}
                onChange={set("firstName")}
                placeholder="John"
                style={inputStyle(!!errors.firstName)}
                onFocus={onFocus}
                onBlur={onBlur("firstName")}
              />
            </Field>
            <Field label="Last Name" error={errors.lastName} required>
              <input
                value={form.lastName}
                onChange={set("lastName")}
                placeholder="Smith"
                style={inputStyle(!!errors.lastName)}
                onFocus={onFocus}
                onBlur={onBlur("lastName")}
              />
            </Field>
          </div>

          <Field label="Email Address" error={errors.email} required>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="you@example.com"
              autoComplete="email"
              style={inputStyle(!!errors.email)}
              onFocus={onFocus}
              onBlur={onBlur("email")}
            />
          </Field>

          <Field label="Password" error={errors.password} required>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                placeholder="Min 6 characters"
                autoComplete="new-password"
                style={{ ...inputStyle(!!errors.password), paddingRight: 44 }}
                onFocus={onFocus}
                onBlur={onBlur("password")}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw((v) => !v)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  fontSize: 16,
                  padding: 0,
                }}
              >
                {showPw ? "🙈" : "👁"}
              </button>
            </div>
          </Field>

          <Field
            label="Confirm Password"
            error={errors.confirmPassword}
            required
          >
            <div style={{ position: "relative" }}>
              <input
                type={showCPw ? "text" : "password"}
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
                placeholder="Repeat password"
                autoComplete="new-password"
                style={{
                  ...inputStyle(!!errors.confirmPassword),
                  paddingRight: 44,
                }}
                onFocus={onFocus}
                onBlur={onBlur("confirmPassword")}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowCPw((v) => !v)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  fontSize: 16,
                  padding: 0,
                }}
              >
                {showCPw ? "🙈" : "👁"}
              </button>
            </div>
          </Field>

          {/* Password strength bar */}
          {form.password && (
            <div>
              {(() => {
                const len = form.password.length;
                const hasUpper = /[A-Z]/.test(form.password);
                const hasNum = /\d/.test(form.password);
                const score =
                  (len >= 8 ? 1 : 0) +
                  (len >= 12 ? 1 : 0) +
                  (hasUpper ? 1 : 0) +
                  (hasNum ? 1 : 0);
                const labels = ["", "Weak", "Fair", "Good", "Strong"];
                const colors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];
                return (
                  <div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: 4,
                            borderRadius: 99,
                            background: i <= score ? colors[score] : "#f1f5f9",
                            transition: "background 0.2s",
                          }}
                        />
                      ))}
                    </div>
                    {score > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          color: colors[score],
                          fontWeight: 600,
                        }}
                      >
                        {labels[score]}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          <button
            type="button"
            onClick={handleNext}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 10,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff",
              padding: "12px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
              marginTop: 4,
            }}
          >
            Next: Patient Details →
          </button>
        </div>
      )}

      {/* ── STEP 1: Patient Details ── */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <Field label="Phone Number" error={errors.phone} required>
              <input
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="9876543210"
                style={inputStyle(!!errors.phone)}
                onFocus={onFocus}
                onBlur={onBlur("phone")}
              />
            </Field>
            <Field label="Age" error={errors.age} required>
              <input
                type="number"
                min="0"
                max="120"
                value={form.age}
                onChange={set("age")}
                placeholder="e.g. 32"
                style={inputStyle(!!errors.age)}
                onFocus={onFocus}
                onBlur={onBlur("age")}
              />
            </Field>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <Field label="Gender" error={errors.gender} required>
              <select
                value={form.gender}
                onChange={set("gender")}
                style={selectStyle(!!errors.gender)}
                onFocus={onFocus}
                onBlur={onBlur("gender")}
              >
                <option value="">Select gender</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Blood Group">
              <select
                value={form.bloodGroup}
                onChange={set("bloodGroup")}
                style={selectStyle(false)}
                onFocus={onFocus}
                onBlur={() => {}}
              >
                <option value="">Select (optional)</option>
                {BLOOD_GROUPS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Address">
            <input
              value={form.address}
              onChange={set("address")}
              placeholder="Your home address (optional)"
              style={inputStyle(false)}
              onFocus={onFocus}
              onBlur={() => {}}
            />
          </Field>

          <Field label="Emergency Contact Phone">
            <input
              type="tel"
              value={form.emergencyPhone}
              onChange={set("emergencyPhone")}
              placeholder="Emergency number (optional)"
              style={inputStyle(false)}
              onFocus={onFocus}
              onBlur={() => {}}
            />
          </Field>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={handleBack}
              style={{
                flex: 1,
                border: "1.5px solid #e2e8f0",
                borderRadius: 10,
                background: "#fff",
                color: "#374151",
                padding: "11px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                border: "none",
                borderRadius: 10,
                background: loading
                  ? "#a5b4fc"
                  : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff",
                padding: "11px",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 4px 14px rgba(99,102,241,0.3)",
              }}
            >
              {loading ? "Creating account…" : "✓ Create My Account"}
            </button>
          </div>
        </div>
      )}

      {/* Switch to login */}
      <p
        style={{
          textAlign: "center",
          fontSize: 13.5,
          color: "#64748b",
          margin: "16px 0 0",
        }}
      >
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          style={{
            border: "none",
            background: "none",
            color: "#6366f1",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 13.5,
            padding: 0,
          }}
        >
          Sign in
        </button>
      </p>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE SHELL  —  toggles between Login and Register
═══════════════════════════════════════════════════════════════════════════ */

export default function LoginPage() {
  const [view, setView] = useState<View>("login");

  const toLogin = () => setView("login");
  const toRegister = () => setView("register");

  const TITLES = {
    login: { heading: "Welcome back", sub: "Sign in to your hospital account" },
    register: {
      heading: "Create patient account",
      sub: "Register to book appointments and manage your health",
    },
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#f8fafc 0%,#eef2ff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      }}
    >
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        * { box-sizing:border-box; }
        input::placeholder, select::placeholder { color:#94a3b8; }
        input:focus, select:focus { box-shadow:0 0 0 3px rgba(99,102,241,0.1); }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: view === "register" ? 480 : 420,
          animation: "fadeUp 0.3s ease",
        }}
      >
        {/* ── Card ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "36px 36px 32px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.1)",
            border: "1px solid #f1f5f9",
          }}
        >
          {/* ── Logo + heading ── */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 15,
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
                fontSize: 26,
                boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
              }}
            >
              🏥
            </div>
            <h1
              style={{
                margin: "0 0 6px",
                fontSize: 21,
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.02em",
              }}
            >
              {TITLES[view].heading}
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, color: "#64748b" }}>
              {TITLES[view].sub}
            </p>
          </div>

          {/* ── Tab switcher ── */}
          <div
            style={{
              display: "flex",
              background: "#f8fafc",
              borderRadius: 10,
              padding: 4,
              marginBottom: 24,
              gap: 4,
            }}
          >
            {(["login", "register"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 8,
                  background: view === v ? "#fff" : "transparent",
                  color: view === v ? "#6366f1" : "#64748b",
                  padding: "8px",
                  fontSize: 13.5,
                  fontWeight: view === v ? 700 : 500,
                  cursor: "pointer",
                  boxShadow: view === v ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.18s",
                }}
              >
                {v === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* ── Form ── */}
          <div key={view} style={{ animation: "fadeIn 0.2s ease" }}>
            {view === "login" ? (
              <LoginForm onSwitchToRegister={toRegister} />
            ) : (
              <RegisterForm onSwitchToLogin={toLogin} />
            )}
          </div>
        </div>

        {/* ── Footer note ── */}
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "#94a3b8",
            marginTop: 18,
          }}
        >
          {view === "register"
            ? "By registering, you agree to our terms and privacy policy."
            : "MediCore Hospital Management System © " +
              new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
