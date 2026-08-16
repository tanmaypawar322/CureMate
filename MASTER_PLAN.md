# Healthcare Management SaaS — Master Plan

**Target:** India | Multi-tenant SaaS | Web-first | Subscription-per-org

---

## 1. Vision

One platform. Many organizations (hospitals, clinics, pharmacies, labs) each run their own space. Patients exist independently and connect to whichever orgs/doctors they choose — a patient is *not* locked to one tenant. A platform admin oversees everything: org onboarding, billing, compliance, support.

---

## 2. User Roles

| Role | Belongs to | Core need |
|---|---|---|
| **Platform Admin** | Platform itself | Approve orgs, manage subscriptions, global analytics, support, compliance oversight |
| **Org Admin** (hospital/clinic owner) | One org | Manage staff, schedules, org billing, org analytics |
| **Doctor** | One or more orgs | Availability, appointments, patient history, write prescriptions |
| **Patient** | Global (not tenant-locked) | Book appointments, view prescriptions, order medicines, book lab tests, health records |
| **Pharmacy Owner** | One org | Inventory, fulfill prescription orders, invoicing |
| **Lab Owner** | One org | Test catalog, receive orders, upload reports |
| **Staff/Receptionist** (later) | One org | Scheduling support, front-desk tasks |

---

## 3. Architecture Decisions

**Multi-tenancy model:** Single shared PostgreSQL database with a `tenant_id` (org_id) on every tenant-scoped table, enforced via **Row-Level Security (RLS)**. This is cheaper and simpler to operate than schema-per-tenant, and scales comfortably to hundreds/low-thousands of orgs. Revisit only if a large enterprise customer demands physical data isolation.

**Patient identity is global**, not tenant-scoped — a patient has one profile and one ABHA-linked record, and can consult multiple hospitals, order from multiple pharmacies, and book multiple labs. A join table (`patient_org_links`) tracks relationships/consent per org.

**A single user can hold different roles at different orgs** (e.g., a doctor who also owns a pharmacy). Roles are assigned per `(user_id, org_id)` pair, not globally on the user.

---

## 4. Recommended Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js (React + TypeScript)**, Tailwind CSS | SEO-friendly for public doctor/org pages, fast dev, one language across stack |
| Backend | **NestJS (Node.js + TypeScript)** | Structured, modular — maps well to role-based modules; shares types with frontend |
| Database | **PostgreSQL** | RLS support for multi-tenancy, strong relational integrity for medical records |
| Auth | Custom JWT + refresh tokens, RBAC middleware | Full control needed for per-org role logic; add OAuth later for ABDM |
| File storage | **AWS S3** (or Cloudflare R2) | Prescriptions, lab reports, profile docs |
| Background jobs | Redis + BullMQ | Notifications, ABDM sync, reminders |
| Notifications | MSG91/Gupshup (SMS+WhatsApp), AWS SES (email) | Standard for India |
| Payments | **Razorpay** | Handles India subscriptions + GST invoicing |
| Hosting | AWS (ECS/Fargate or Cloud Run equivalent) | Simple to start, containerized for later K8s migration if needed |
| Monitoring | Sentry + basic CloudWatch/Grafana | Errors + infra health |

---

## 5. Compliance Track — ABDM (India)

This runs as its own workstream, not blocking core launch:

- **ABHA ID** creation/linking for every patient (via ABDM sandbox → production APIs)
- Org registration as **HIP** (Health Information Provider) and/or **HIU** (Health Information User)
- **Consent Manager** integration — patients must explicitly consent before records are shared between orgs
- Encryption at rest (DB-level) and in transit (TLS everywhere)
- Full **audit logging**: every read/write of patient health data logged with who/when/why
- Data retention & deletion policy aligned with India's DPDP Act, 2023

ABDM sandbox certification has its own approval timeline outside your control — start that application early, in parallel with Phase 1–2 dev, not after.

---

## 6. Core Data Model (high level)

```
User (id, email, phone, password_hash, abha_id)
Organization (id, name, type: hospital|clinic|pharmacy|lab, subscription_plan_id)
OrgMembership (user_id, org_id, role: admin|doctor|pharmacy_owner|lab_owner|staff)
PatientProfile (user_id, dob, gender, address, abha_id, ...)
DoctorProfile (user_id, org_id, specialization, license_no, consultation_fee)
Appointment (id, patient_id, doctor_id, org_id, datetime, status)
Prescription (id, appointment_id, doctor_id, patient_id, notes, created_at)
PrescriptionItem (prescription_id, medicine_name, dosage, frequency, duration)
MedicineOrder (id, prescription_id, pharmacy_org_id, patient_id, status)
LabOrder (id, patient_id, doctor_id?, lab_org_id, test_ids[], status)
LabReport (id, lab_order_id, file_url, uploaded_at)
SubscriptionPlan (id, org_id, tier, billing_cycle, status)
AuditLog (id, actor_user_id, action, resource_type, resource_id, timestamp)
```

---

## 7. Module Breakdown

**Platform Admin:** Org approval workflow, subscription/plan management, global analytics dashboard, user management, support ticket queue, compliance/audit console.

**Org Admin:** Staff onboarding & role assignment, schedule config, org-level billing, org analytics.

**Doctor:** Profile + availability calendar, appointment queue, patient history view (with consent), prescription builder (structured medicine items, not free text), consult notes.

**Patient:** Profile + ABHA linking, doctor/org search & booking, prescription history, medicine reminders, order medicines from linked prescriptions, book lab tests, view lab reports, unified health timeline.

**Pharmacy Owner:** Inventory management, incoming prescription-order queue, fulfillment status updates, invoicing.

**Lab Owner:** Test catalog & pricing, incoming order queue, report upload, turnaround tracking.

---

## 8. Billing Model

Subscription **per hospital/org**, tiered by staff count and feature access:

| Tier | Fits | Example limits |
|---|---|---|
| Basic | Small clinic | 1–5 doctors, core appointment+prescription only |
| Pro | Mid hospital | Up to 30 staff, + pharmacy/lab modules, analytics |
| Enterprise | Large hospital chain | Unlimited staff, priority support, custom SLA |

Razorpay handles recurring billing + GST invoicing. Patients, in this model, are **free** — the org pays; this maximizes patient-side adoption, which is what makes the org's subscription valuable.

---

## 9. Phase-Wise Roadmap

Sequenced so every later phase builds on a working foundation — this still gets you to "everything," just without rebuilding auth/multi-tenancy three times.

**Phase 0 — Foundations (2–3 weeks)**
Repo, CI/CD, infra setup, auth service, RBAC middleware, multi-tenant org model (RLS), base user profile. *Nothing else can be built safely without this.*

**Phase 1 — Core Clinical Loop (3–4 weeks)**
Org onboarding (hospital/clinic type), doctor profile + availability, patient profile + doctor search, appointment booking, structured prescription creation.

**Phase 2 — Pharmacy & Lab (3–4 weeks, can start once Phase 1 data model is stable)**
Pharmacy org onboarding + inventory, prescription → order flow, lab org onboarding + test catalog, lab order → report flow.

**Phase 3 — Platform Admin & Billing (2–3 weeks, parallel with Phase 2)**
Admin dashboard, org approval workflow, subscription plans, Razorpay integration, global analytics.

**Phase 4 — ABDM Integration & Compliance (3–4 weeks, run in parallel starting Phase 1)**
ABHA creation/linking, HIP/HIU registration, consent manager, audit logging, encryption hardening. *Start the ABDM sandbox application immediately — approval time is outside your control.*

**Phase 5 — Notifications, Polish, Launch (2–3 weeks)**
SMS/WhatsApp/email notifications, medicine reminders, QA pass, security review, load testing, soft launch with 1–2 pilot orgs.

**Total: ~4–5 months** with a small team (2–4 developers), assuming Phases 2–4 overlap where noted.

---

## 10. Immediate Next Steps

1. Confirm the data model above (especially the patient-is-global decision — this is the hardest thing to change later)
2. I can scaffold Phase 0 (auth + multi-tenant foundation) in code right now if you want to start
3. Decide initial subscription tier pricing (can be placeholder for now)
4. Start the ABDM sandbox registration in parallel — it's slow and shouldn't block dev

---

*This document is meant to be a living plan — update it as decisions change during build.*
