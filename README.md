# CureMate — Healthcare Management SaaS (Phase 0 Foundation)

**Target:** India | Multi-tenant SaaS | Web-first | Subscription-per-org

---

## 1. Overview

CureMate is a multi-tenant Healthcare Management SaaS platform for hospitals, clinics, pharmacies, and diagnostic laboratories.
Phase 0 delivers the core architectural foundation:
- **Global User Identity**: Patients and practitioners have single global identities across multiple tenants.
- **Multi-Tenancy with PostgreSQL Row-Level Security (RLS)**: Tenant-scoped data is isolated using PostgreSQL RLS policies and transaction-local session variables (`app.current_tenant_id`).
- **Role-Based Access Control (RBAC)**: Per-organization role assignments (`admin`, `doctor`, `pharmacy_owner`, `lab_owner`, `staff`).
- **Authentication**: JWT access token + refresh token rotation with bcrypt password hashing.
- **Frontend**: Next.js (App Router, Tailwind CSS) providing end-to-end authentication, dashboard, and organization onboarding.

---

## 2. Project Structure

```
CureMate/
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI build workflow
├── backend/                       # NestJS + TypeScript + Prisma
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (users, orgs, memberships)
│   │   └── migrations/            # SQL migrations with RLS policies
│   ├── src/
│   │   ├── auth/                  # JWT auth, refresh tokens, bcrypt, guards
│   │   ├── common/                # Tenant context, decorators (@Roles, @CurrentUser), guards
│   │   ├── organizations/         # Org management & admin assignment
│   │   ├── prisma/                # Prisma client with tenant transaction support
│   │   ├── users/                 # Users module (GET /me)
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── .env.example
│   └── package.json
├── frontend/                      # Next.js 14 + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/      # Login page
│   │   │   ├── (auth)/signup/     # Signup page
│   │   │   ├── dashboard/         # Dashboard (GET /me + Create Org)
│   │   │   └── layout.tsx
│   │   └── lib/                   # API client & Auth provider
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
Start PostgreSQL 16 and Redis 7 in the background:
```bash
docker compose up -d
```

### Step 2: Set Up Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init_and_rls
npm run start:dev
```
The backend API will start on **`http://localhost:4000`**.

### Step 3: Set Up Frontend
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The frontend application will start on **`http://localhost:3000`**.

---

## 4. API Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/signup` | Register new user account | No |
| `POST` | `/auth/login` | Log in and receive JWT token pair | No |
| `POST` | `/auth/refresh` | Rotate access & refresh tokens | No |
| `GET` | `/me` | Get current user profile + org memberships & roles | Yes (Bearer JWT) |
| `POST` | `/organizations` | Create an org (creator becomes `admin`) | Yes (Bearer JWT) |
| `GET` | `/organizations/:orgId` | Fetch org details (requires membership role) | Yes (Bearer JWT) |

---

## 5. Architectural & Implementation Decisions

- **ORM Selection**: **Prisma** was selected for its strong end-to-end TypeScript type inference, declarative schema, and seamless migration runner that applies custom SQL DDL for PostgreSQL Row-Level Security policies.
- **Connection-Pooling-Safe RLS**: PostgreSQL session variables set via `SET app.current_tenant_id` can contaminate pooled connections. We utilize transaction-local configuration via `SELECT set_config('app.current_tenant_id', $orgId, true)` within Prisma interactive transactions (`PrismaService.withTenant`). The `is_local = true` flag ensures PostgreSQL automatically clears the tenant context immediately upon transaction commit or rollback.
- **Per-Org Role Assignment**: Role permissions are checked per `(user_id, org_id)` pair, allowing single users to hold distinct roles (e.g. Doctor in one clinic and Admin in another).
