"use client";

/**
 * Patient Prescriptions Page
 * Route: /patient/prescriptions
 *
 * Follows the same architecture as appointments/page.tsx:
 *  - api from @/services/api
 *  - Tailwind + dark mode classes
 *  - Inline sub-components for clarity
 *  - useCallback + debounced search
 *  - Modal pattern with Escape-to-close
 */

import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Medicine {
  _id: string;
  medicineName: string;
  genericName?: string;
  strength?: string;
  dosage: string;
  frequency: string;
  frequencyCustom?: string;
  duration: string;
  quantity?: string;
  foodInstruction: string;
  route: string;
  specialInstructions?: string;
}

interface FollowUp {
  required: boolean;
  date?: string;
  notes?: string;
  department?: string;
}

interface PrescriptionDoctor {
  id: string;
  name: string;
  specialization: string;
  department: string;
  hospital: string;
  phone: string;
  registrationNo: string;
}

interface PrescriptionPatient {
  id: string;
  name: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  bloodGroup?: string;
  allergies?: string[];
}

interface AppointmentRef {
  id: string;
  appointmentNumber: string;
  appointmentDate?: string;
  appointmentTime?: string;
}

interface Prescription {
  id: string;
  prescriptionNumber: string;
  status: "draft" | "issued";
  issuedAt?: string;
  createdAt: string;
  verificationId?: string;
  diagnosis: string;
  symptoms: string[];
  clinicalNotes?: string;
  advice?: string;
  medicines: Medicine[];
  followUp: FollowUp;
  medicineCount: number;
  doctor: PrescriptionDoctor;
  patient: PrescriptionPatient;
  appointment: AppointmentRef;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface FilterState {
  search: string;
  sortBy: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FOOD_ICONS: Record<string, string> = {
  "Before food": "🌅",
  "After food": "🍽️",
  "With food": "🥗",
  "Empty stomach": "⏳",
  "No restriction": "✅",
};

const ROUTE_ICONS: Record<string, string> = {
  Oral: "💊",
  "Injection (IV)": "💉",
  "Injection (IM)": "💉",
  "Injection (SC)": "💉",
  Topical: "🧴",
  Inhalation: "🌬️",
  Sublingual: "👅",
  Nasal: "👃",
  Ophthalmic: "👁️",
};

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function calcAge(dob?: string) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "draft" | "issued" }) {
  return status === "issued" ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      Issued
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Draft
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
      </div>
      <div className="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
      <div className="h-3 w-36 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
      <div className="flex gap-2">
        <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <p className="text-base font-medium text-slate-700 dark:text-slate-300 mb-1">
        No prescriptions found
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        Try adjusting your search or filters.
      </p>
      <button
        onClick={onClear}
        className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
      >
        Clear filters
      </button>
    </div>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-3xl",
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
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
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
        className={`relative w-full ${maxWidth} bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[92vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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

// ─── Prescription card ────────────────────────────────────────────────────────

function PrescriptionCard({
  rx,
  onOpen,
  onDownload,
  downloading,
}: {
  rx: Prescription;
  onOpen: (p: Prescription) => void;
  onDownload: (id: string) => void;
  downloading: boolean;
}) {
  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer group"
      role="listitem"
      tabIndex={0}
      onClick={() => onOpen(rx)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(rx);
        }
      }}
      aria-label={`Prescription ${rx.prescriptionNumber}, ${rx.diagnosis}`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <span className="font-mono text-xs text-slate-400">
            {rx.prescriptionNumber}
          </span>
          <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 leading-tight">
            {rx.diagnosis}
          </p>
        </div>
        <StatusBadge status={rx.status} />
      </div>

      {/* Doctor + date */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mb-3">
        <span className="flex items-center gap-1">
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          {rx.doctor.name}
        </span>
        <span className="flex items-center gap-1">
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {rx.doctor.department}
        </span>
        <span className="flex items-center gap-1">
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {formatDate(rx.issuedAt ?? rx.createdAt)}
        </span>
      </div>

      {/* Medicine pill chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {rx.medicines.slice(0, 4).map((m) => (
          <span
            key={m._id}
            className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800"
          >
            {m.medicineName}
          </span>
        ))}
        {rx.medicineCount > 4 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
            +{rx.medicineCount - 4} more
          </span>
        )}
      </div>

      {/* Actions */}
      <div
        className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs text-slate-400">
          {rx.medicineCount} {rx.medicineCount === 1 ? "medicine" : "medicines"}
          {rx.followUp?.required && (
            <span className="ml-3 text-amber-600 dark:text-amber-400">
              · Follow-up: {formatDate(rx.followUp.date)}
            </span>
          )}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => onOpen(rx)}
            className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors"
          >
            View details
          </button>
          {rx.status === "issued" && (
            <button
              onClick={() => onDownload(rx.id)}
              disabled={downloading}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
              aria-label="Download PDF"
            >
              {downloading ? (
                <svg
                  className="w-3 h-3 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
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
              ) : (
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              )}
              PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Detail modal content ─────────────────────────────────────────────────────

function PrescriptionDetail({
  rx,
  onDownload,
  downloading,
}: {
  rx: Prescription;
  onDownload: (id: string) => void;
  downloading: boolean;
}) {
  return (
    <div className="px-6 py-5 space-y-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-slate-400">
              {rx.prescriptionNumber}
            </span>
            <StatusBadge status={rx.status} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Issued {formatDate(rx.issuedAt ?? rx.createdAt)} · Verification:{" "}
            {rx.verificationId ?? "—"}
          </p>
        </div>
        {rx.status === "issued" && (
          <button
            onClick={() => onDownload(rx.id)}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {downloading ? (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
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
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            )}
            Download PDF
          </button>
        )}
      </div>

      {/* Doctor / patient info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-2">
            Doctor
          </p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {rx.doctor.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {rx.doctor.specialization} · {rx.doctor.department}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {rx.doctor.hospital}
          </p>
          {rx.doctor.registrationNo && (
            <p className="text-xs text-slate-400 mt-0.5">
              Reg. No: {rx.doctor.registrationNo}
            </p>
          )}
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            Patient
          </p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {rx.patient.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {[
              rx.patient.gender,
              rx.patient.dateOfBirth
                ? `${calcAge(rx.patient.dateOfBirth)} yrs`
                : null,
              rx.patient.bloodGroup,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {rx.patient.allergies && rx.patient.allergies.length > 0 && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              ⚠ Allergies: {rx.patient.allergies.join(", ")}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-0.5">
            Appt: {rx.appointment.appointmentNumber} ·{" "}
            {formatDate(rx.appointment.appointmentDate)}
          </p>
        </div>
      </div>

      {/* Diagnosis */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Diagnosis
        </p>
        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
          {rx.diagnosis}
        </p>
        {rx.symptoms.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {rx.symptoms.map((s) => (
              <span
                key={s}
                className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Medicines table */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Rx Medicines ({rx.medicineCount})
        </p>
        <div className="space-y-2">
          {rx.medicines.map((m, i) => (
            <div
              key={m._id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mr-2">
                    {i + 1}.
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {m.medicineName}
                  </span>
                  {m.strength && (
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      {m.strength}
                    </span>
                  )}
                  {m.genericName && (
                    <span className="ml-2 text-xs text-slate-400 italic">
                      ({m.genericName})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs" title={m.route}>
                    {ROUTE_ICONS[m.route] ?? "💊"}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {m.route}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                {[
                  { label: "Dosage", value: m.dosage },
                  {
                    label: "Frequency",
                    value:
                      m.frequency === "Custom"
                        ? m.frequencyCustom
                        : m.frequency,
                  },
                  { label: "Duration", value: m.duration },
                  { label: "Quantity", value: m.quantity || "—" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">
                      {label}
                    </p>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs">
                  {FOOD_ICONS[m.foodInstruction] ?? ""}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {m.foodInstruction}
                </span>
                {m.specialInstructions && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 ml-2 italic">
                    · {m.specialInstructions}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clinical notes */}
      {rx.clinicalNotes && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Clinical Notes
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            {rx.clinicalNotes}
          </p>
        </div>
      )}

      {/* Advice */}
      {rx.advice && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Doctor's Advice
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
            {rx.advice}
          </p>
        </div>
      )}

      {/* Follow-up */}
      {rx.followUp?.required && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
            Follow-up Required
          </p>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            {formatDate(rx.followUp.date)}
            {rx.followUp.department && ` · ${rx.followUp.department}`}
          </p>
          {rx.followUp.notes && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              {rx.followUp.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PatientPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    sortBy: "newest",
    dateFrom: "",
    dateTo: "",
    page: 1,
    limit: 10,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(filters.page),
        limit: String(filters.limit),
        sortBy: filters.sortBy,
        ...(filters.search && { search: filters.search }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
      });
      const res = await api.get(`/patient/prescriptions?${params}`);
      if (Array.isArray(res.data)) {
        setPrescriptions(res.data);
        setPagination({
          total: res.data.length,
          page: 1,
          limit: filters.limit,
          totalPages: 1,
        });
      } else {
        setPrescriptions(res.data.data ?? []);
        if (res.data.meta) setPagination(res.data.meta);
      }
    } catch {
      setError("Failed to load prescriptions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function setFilter(key: keyof FilterState, value: string | number) {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  }

  function handleSearch(value: string) {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => setFilter("search", value), 300);
  }

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  function openDetail(rx: Prescription) {
    setSelectedRx(rx);
    setDetailOpen(true);
  }

  async function handleDownload(id: string) {
    setDownloadingId(id);
    try {
      const res = await api.get(`/patient/prescriptions/${id}/pdf`, {
        responseType: "blob",
      });
      const rx = prescriptions.find((p) => p.id === id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prescription-${rx?.prescriptionNumber ?? id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Prescription downloaded.");
    } catch {
      showToast("Download failed. Please try again.", "error");
    } finally {
      setDownloadingId(null);
    }
  }

  function clearFilters() {
    setFilters({
      search: "",
      sortBy: "newest",
      dateFrom: "",
      dateTo: "",
      page: 1,
      limit: 10,
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            My prescriptions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            View, download, and manage your prescriptions from all consultations
          </p>
        </div>

        {/* Summary stat */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Total", value: pagination.total },
            {
              label: "Issued",
              value: prescriptions.filter((p) => p.status === "issued").length,
            },
            {
              label: "Pending follow-up",
              value: prescriptions.filter((p) => p.followUp?.required).length,
            },
          ].map((c) => (
            <div
              key={c.label}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4"
            >
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                {c.label}
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {c.value}
              </p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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
              placeholder="Search by ID, diagnosis, doctor, or medicine…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400"
              onChange={(e) => handleSearch(e.target.value)}
              aria-label="Search prescriptions"
            />
          </div>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilter("dateFrom", e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            aria-label="From date"
            title="From date"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilter("dateTo", e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            aria-label="To date"
            title="To date"
          />
          <select
            value={filters.sortBy}
            onChange={(e) => setFilter("sortBy", e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            aria-label="Sort prescriptions"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="date-asc">Date ascending</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div
            className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
            role="alert"
          >
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={fetchPrescriptions}
              className="ml-auto text-sm font-medium text-red-700 dark:text-red-400 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* List */}
        <div className="space-y-3" role="list" aria-label="Prescription list">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          ) : prescriptions.length === 0 ? (
            <EmptyState onClear={clearFilters} />
          ) : (
            prescriptions.map((rx) => (
              <PrescriptionCard
                key={rx.id}
                rx={rx}
                onOpen={openDetail}
                onDownload={handleDownload}
                downloading={downloadingId === rx.id}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && !loading && (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total}
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setFilter("page", filters.page - 1)}
                disabled={filters.page === 1}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${i + 1 === filters.page ? "bg-indigo-600 text-white" : "border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
                  aria-current={i + 1 === filters.page ? "page" : undefined}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setFilter("page", filters.page + 1)}
                disabled={filters.page === pagination.totalPages}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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
      </div>

      {/* Detail modal */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={
          selectedRx
            ? `Prescription — ${selectedRx.prescriptionNumber}`
            : "Prescription details"
        }
        maxWidth="max-w-3xl"
      >
        {selectedRx && (
          <>
            <PrescriptionDetail
              rx={selectedRx}
              onDownload={handleDownload}
              downloading={downloadingId === selectedRx.id}
            />
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <p className="text-xs text-slate-400">
                {selectedRx.appointment.appointmentNumber &&
                  `Appointment ref: ${selectedRx.appointment.appointmentNumber}`}
              </p>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium rounded-lg transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Print
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-lg text-sm font-medium z-50 ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
        >
          {toast.type === "success" ? (
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
          {toast.msg}
        </div>
      )}
    </main>
  );
}
