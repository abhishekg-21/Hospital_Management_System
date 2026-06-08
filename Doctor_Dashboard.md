If you're building an **HMS (Hospital Management System)** and currently working on the **Doctor Dashboard**, the goal is to help doctors quickly see what needs their attention and perform their daily tasks efficiently.

## Core Sections for a Doctor Dashboard

### 1. Dashboard Overview (Home Screen)

Show important summary cards:

- Today's Appointments
- Pending Consultations
- Admitted Patients
- New Lab Reports
- Pending Prescriptions
- Emergency Cases
- Follow-up Patients

Example:

| Metric            | Count |
| ----------------- | ----- |
| Today's Patients  | 24    |
| Pending Reports   | 8     |
| Admitted Patients | 12    |
| Follow-ups        | 5     |

---

### 2. Appointment Management

Doctors should be able to:

- View today's schedule
- Filter by date
- Start consultation
- Mark patient as completed
- Reschedule appointments
- Cancel appointments

Fields:

- Patient Name
- Appointment Time
- Department
- Status
- Consultation Type (OPD/Online)

---

### 3. Patient List

Provide quick access to assigned patients.

Columns:

- Patient ID
- Name
- Age/Gender
- Contact
- Last Visit
- Current Status

Actions:

- View Profile
- View Medical History
- Start Consultation

---

### 4. Patient Medical Record (Very Important)

Doctor should see:

#### Basic Information

- Name
- Age
- Gender
- Blood Group
- Allergies

#### Medical History

- Previous Diseases
- Surgeries
- Medications
- Family History

#### Previous Visits

- Date
- Diagnosis
- Prescription

---

### 5. Consultation Module

During consultation doctor can:

#### Symptoms

- Fever
- Cough
- Pain etc.

#### Diagnosis

- Diagnosis notes

#### Vitals

- Blood Pressure
- Pulse
- Temperature
- Weight
- Height
- Oxygen Saturation

#### Clinical Notes

Rich text editor for observations.

---

### 6. Prescription Management

Doctor should be able to:

- Create prescription
- Add medicines
- Dosage
- Frequency
- Duration
- Instructions

Example:

| Medicine    | Dosage | Frequency   | Duration |
| ----------- | ------ | ----------- | -------- |
| Paracetamol | 500mg  | 3 times/day | 5 days   |

Additional:

- Download PDF
- Digital Signature
- Print Prescription

---

### 7. Lab & Diagnostic Reports

Features:

- View requested tests
- View results
- Download reports
- Compare old reports

Examples:

- CBC
- X-Ray
- MRI
- CT Scan
- Blood Sugar

---

### 8. Inpatient (IPD) Management

For admitted patients:

- Bed Details
- Ward Details
- Daily Notes
- Treatment Plan
- Discharge Summary

---

### 9. Follow-up Management

Doctor can:

- Schedule next visit
- Set reminders
- View pending follow-ups

---

### 10. Notifications Center

Show alerts for:

- New appointments
- Emergency admissions
- Lab reports available
- Follow-up due

---

### 11. Messaging / Communication

Optional but useful:

- Doctor ↔ Reception
- Doctor ↔ Nurse
- Doctor ↔ Lab

---

### 12. Analytics & Performance

Provide insights:

- Patients seen today
- Monthly consultations
- Revenue generated
- Most common diagnoses
- Follow-up rate

Charts:

- Daily Patients
- Monthly Visits
- Disease Trends

---

## Suggested Sidebar Menu

```text
Dashboard
Appointments
Patients
Consultations
Prescriptions
Lab Reports
IPD Patients
Follow-ups
Messages
Analytics
Settings
```

---

## Database Tables You Will Likely Need

```text
doctors
patients
appointments
consultations
prescriptions
prescription_items
medical_records
lab_tests
lab_reports
admissions
beds
followups
notifications
```

---

## If You're Building a Modern HMS (Recommended Flow)

1. Doctor logs in.
2. Dashboard shows today's appointments.
3. Doctor opens patient.
4. Reviews history.
5. Conducts consultation.
6. Creates diagnosis.
7. Generates prescription.
8. Orders lab tests if needed.
9. Schedules follow-up.
10. Consultation marked complete.

This workflow covers about 80–90% of a doctor's daily activities and is usually the best starting point for an HMS doctor dashboard.

app/doctor/dashboard/page.tsx

app/doctor/appointments/page.tsx

app/doctor/patients/page.tsx

app/doctor/consultations/page.tsx

app/doctor/prescriptions/page.tsx

app/doctor/lab-reports/page.tsx

app/doctor/ipd/page.tsx

app/doctor/followups/page.tsx

app/doctor/messages/page.tsx

app/doctor/analytics/page.tsx

app/doctor/settings/page.tsx
