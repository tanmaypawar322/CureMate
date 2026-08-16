# CureMate — Healthcare Management SaaS

**Target:** India | Multi-tenant SaaS | Web-first | Subscription-per-org

---

## 1. Overview

CureMate is a multi-tenant Healthcare Management SaaS platform for hospitals, clinics, pharmacies, and diagnostic laboratories across India.

- **Phase 0 (Foundation)**: Multi-tenancy with PostgreSQL Row-Level Security (RLS), JWT access + refresh tokens, per-org Role-Based Access Control (RBAC), and non-superuser application database role.
- **Phase 1 (Core Clinical Loop)**: Hospital/Clinic organization onboarding, doctor profiles, live weekly availability slot engine, global patient health profiles, public doctor & clinic search, appointment booking with database-level double-booking prevention, and digital prescriptions with structured medicine items.

---

## 2. Project Structure

```
CureMate/
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI build workflow
├── backend/                       # NestJS + TypeScript + Prisma
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (users, orgs, doctors, patients, appts, prescriptions)
│   │   └── migrations/            # SQL migrations with FORCE RLS & partial unique indexes
│   ├── src/
│   │   ├── appointments/          # Appointment booking & double-booking prevention
│   │   ├── auth/                  # JWT auth, refresh tokens, bcrypt
│   │   ├── common/                # Tenant context, guards, decorators, RLS interceptor
│   │   ├── doctors/               # Doctor profiles, weekly availability & slot engine
│   │   ├── organizations/         # Org profiles & onboarding
│   │   ├── patients/              # Global patient health profiles
│   │   ├── prescriptions/         # Digital prescriptions & structured medicine items
│   │   ├── prisma/                # Prisma client with transaction-scoped tenant context
│   │   ├── search/                # Public search across doctors & clinics
│   │   ├── users/                 # Users module (GET /me)
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── .env.example
│   └── package.json
├── frontend/                      # Next.js 14 + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/            # Login & Signup pages
│   │   │   ├── appointments/      # Patient's My Appointments page
│   │   │   ├── dashboard/         # Role-aware dashboard
│   │   │   ├── doctor/            # Doctor profile, availability editor & queue
│   │   │   ├── doctors/[id]/      # Doctor public profile & live slot booking
│   │   │   ├── org-settings/      # Org Admin profile management
│   │   │   ├── patient/profile/   # Patient global health profile setup
│   │   │   ├── prescriptions/     # Patient's My Prescriptions page
│   │   │   ├── search/            # Public doctor & clinic discovery
│   │   │   └── layout.tsx
│   │   └── lib/                   # Typed API client & Auth context
│   ├── .env.example
│   └── package.json
├── docker-compose.yml             # PostgreSQL 16 + Redis 7
├── .env.example
└── README.md
```

---

## 3. Getting Started Locally

### Prerequisites
- **Node.js**: v18+ (tested on v20/v24)
- **Docker & Docker Compose**

### Step 1: Start Database & Redis
```bash
docker compose up -d
```

### Step 2: Set Up Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```
The backend API will start on **`http://localhost:4000`**.

### Step 3: Run Backend E2E Tests
```bash
npm run test:e2e
```

### Step 4: Set Up Frontend
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The frontend application will start on **`http://localhost:3000`**.

---

## 4. Phase 1 API Endpoints

### Organizations
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/organizations` | Create org (creator becomes `admin`) | Yes (JWT) |
| `PATCH` | `/organizations/:orgId` | Org admin updates clinic details | Yes (Admin in Org) |
| `GET` | `/organizations/:orgId/public` | Public profile (name, type, city, address) | No |
| `GET` | `/organizations/:orgId` | Internal org lookup | Yes (Member in Org) |

### Doctor Profiles & Availability
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/doctors/profile` | Doctor creates profile in affiliated org | Yes (Doctor in Org) |
| `PATCH` | `/doctors/profile` | Doctor updates own profile | Yes (Doctor in Org) |
| `GET` | `/doctors/:id/public` | Public doctor profile & fees | No |
| `POST` | `/doctors/availability` | Doctor sets weekly working windows | Yes (Doctor in Org) |
| `GET` | `/doctors/:id/availability` | Public weekly schedule | No |
| `GET` | `/doctors/:id/available-slots?date=YYYY-MM-DD` | Computed live open slots (minus booked) | No |

### Patients (Global Identity)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/patients/profile` | Create global patient health profile | Yes (JWT) |
| `PATCH` | `/patients/profile` | Update patient health profile | Yes (JWT) |
| `GET` | `/patients/profile` | View patient health profile | Yes (JWT) |

### Public Discovery
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/search/doctors` | Search doctors by specialization, city, keyword | No |
| `GET` | `/search/organizations` | Search hospitals/clinics by type, city | No |

### Appointments
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/appointments` | Patient books appointment slot | Yes (JWT) |
| `GET` | `/appointments/mine` | Patient views all their appointments (across all orgs) | Yes (JWT) |
| `GET` | `/appointments/org` | Doctor/staff views org queue | Yes (Member in Org) |
| `PATCH` | `/appointments/:id/status` | Doctor/admin updates status (`confirmed`, `completed`, `cancelled`) | Yes (Doctor/Admin) |

### Prescriptions
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/prescriptions` | Doctor issues prescription with structured medicine items | Yes (Doctor) |
| `GET` | `/prescriptions/mine` | Patient views all their prescriptions (across all orgs) | Yes (JWT) |
| `GET` | `/prescriptions/:id` | Doctor or owning patient views prescription | Yes (Owner/Doctor/Admin) |

---

## 5. Architectural Highlights

- **Double-Booking Engine Constraint**: Enforced by a database-level Partial Unique Index:
  ```sql
  CREATE UNIQUE INDEX "appointments_doctor_scheduled_active_key" 
  ON "appointments" ("doctor_id", "scheduled_at") 
  WHERE "status" != 'cancelled';
  ```
- **Dual-Mode PostgreSQL RLS**: Tenant-scoped tables (`doctor_profiles`, `doctor_availability`, `appointments`, `prescriptions`, `prescription_items`, `org_memberships`) have `ENABLE` and `FORCE ROW LEVEL SECURITY` enabled. Staff queries enforce `org_id = current_tenant_id`, while global patient queries enforce `patient_id = current_user_id`.
- **Transaction-Local Parameters**: Both `app.current_tenant_id` and `app.current_user_id` are set via `SELECT set_config(..., is_local=true)` inside interactive transactions, eliminating connection pool context leakage.
