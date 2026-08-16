-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- AlterTable organizations
ALTER TABLE "organizations" ADD COLUMN "address" TEXT;
ALTER TABLE "organizations" ADD COLUMN "contact_number" TEXT;
ALTER TABLE "organizations" ADD COLUMN "city" TEXT;
ALTER TABLE "organizations" ADD COLUMN "description" TEXT;

-- CreateTable patient_profiles (Global, not tenant-scoped)
CREATE TABLE "patient_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "date_of_birth" TIMESTAMP(3),
    "gender" TEXT,
    "address" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable doctor_profiles (Tenant-scoped)
CREATE TABLE "doctor_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "specialization" TEXT NOT NULL,
    "license_no" TEXT NOT NULL,
    "consultation_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bio" TEXT,
    "years_experience" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable doctor_availability (Tenant-scoped)
CREATE TABLE "doctor_availability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doctor_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "slot_duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable appointments (Tenant-scoped)
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "appointment_status" NOT NULL DEFAULT 'confirmed',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable prescriptions (Tenant-scoped)
CREATE TABLE "prescriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable prescription_items (Tenant-scoped)
CREATE TABLE "prescription_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "prescription_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "medicine_name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- Indexes & Unique Constraints
CREATE UNIQUE INDEX "patient_profiles_user_id_key" ON "patient_profiles"("user_id");

CREATE INDEX "doctor_profiles_org_id_idx" ON "doctor_profiles"("org_id");
CREATE INDEX "doctor_profiles_user_id_idx" ON "doctor_profiles"("user_id");
CREATE INDEX "doctor_profiles_specialization_idx" ON "doctor_profiles"("specialization");
CREATE UNIQUE INDEX "doctor_profiles_user_id_org_id_key" ON "doctor_profiles"("user_id", "org_id");

CREATE INDEX "doctor_availability_org_id_idx" ON "doctor_availability"("org_id");
CREATE INDEX "doctor_availability_doctor_id_idx" ON "doctor_availability"("doctor_id");
CREATE INDEX "doctor_availability_doctor_id_day_of_week_idx" ON "doctor_availability"("doctor_id", "day_of_week");

CREATE INDEX "appointments_org_id_idx" ON "appointments"("org_id");
CREATE INDEX "appointments_patient_id_idx" ON "appointments"("patient_id");
CREATE INDEX "appointments_doctor_id_idx" ON "appointments"("doctor_id");
CREATE INDEX "appointments_scheduled_at_idx" ON "appointments"("scheduled_at");

-- Database-Level Double-Booking Prevention: Partial Unique Index
CREATE UNIQUE INDEX "appointments_doctor_scheduled_active_key" 
ON "appointments" ("doctor_id", "scheduled_at") 
WHERE "status" != 'cancelled';

CREATE UNIQUE INDEX "prescriptions_appointment_id_key" ON "prescriptions"("appointment_id");
CREATE INDEX "prescriptions_org_id_idx" ON "prescriptions"("org_id");
CREATE INDEX "prescriptions_patient_id_idx" ON "prescriptions"("patient_id");
CREATE INDEX "prescriptions_doctor_id_idx" ON "prescriptions"("doctor_id");

CREATE INDEX "prescription_items_prescription_id_idx" ON "prescription_items"("prescription_id");
CREATE INDEX "prescription_items_org_id_idx" ON "prescription_items"("org_id");

-- Foreign Keys
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "doctor_availability" ADD CONSTRAINT "doctor_availability_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "doctor_availability" ADD CONSTRAINT "doctor_availability_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_org_fkey" FOREIGN KEY ("doctor_id", "org_id") REFERENCES "doctor_profiles"("user_id", "org_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable and FORCE Row Level Security (RLS) on all tenant-scoped tables
ALTER TABLE "doctor_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "doctor_profiles" FORCE ROW LEVEL SECURITY;

ALTER TABLE "doctor_availability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "doctor_availability" FORCE ROW LEVEL SECURITY;

ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointments" FORCE ROW LEVEL SECURITY;

ALTER TABLE "prescriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prescriptions" FORCE ROW LEVEL SECURITY;

ALTER TABLE "prescription_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prescription_items" FORCE ROW LEVEL SECURITY;

-- 1. RLS Policy for doctor_profiles
CREATE POLICY "doctor_profiles_isolation" ON "doctor_profiles"
  FOR ALL
  USING (
    current_setting('app.current_tenant_id', true) IS NULL 
    OR current_setting('app.current_tenant_id', true) = '' 
    OR org_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) IS NULL 
    OR current_setting('app.current_tenant_id', true) = '' 
    OR org_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );

-- 2. RLS Policy for doctor_availability
CREATE POLICY "doctor_availability_isolation" ON "doctor_availability"
  FOR ALL
  USING (
    current_setting('app.current_tenant_id', true) IS NULL 
    OR current_setting('app.current_tenant_id', true) = '' 
    OR org_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) IS NULL 
    OR current_setting('app.current_tenant_id', true) = '' 
    OR org_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );

-- 3. RLS Policy for appointments (Dual-Mode: Org staff OR Global Patient)
CREATE POLICY "appointments_isolation_policy" ON "appointments"
  FOR ALL
  USING (
    (
      current_setting('app.current_tenant_id', true) IS NOT NULL 
      AND current_setting('app.current_tenant_id', true) <> ''
      AND org_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
    OR
    (
      (current_setting('app.current_tenant_id', true) IS NULL OR current_setting('app.current_tenant_id', true) = '')
      AND (
        current_setting('app.current_user_id', true) IS NULL 
        OR current_setting('app.current_user_id', true) = ''
        OR patient_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      )
    )
  )
  WITH CHECK (
    (
      current_setting('app.current_tenant_id', true) IS NOT NULL 
      AND current_setting('app.current_tenant_id', true) <> ''
      AND org_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
    OR
    (
      (current_setting('app.current_tenant_id', true) IS NULL OR current_setting('app.current_tenant_id', true) = '')
      AND (
        current_setting('app.current_user_id', true) IS NULL 
        OR current_setting('app.current_user_id', true) = ''
        OR patient_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      )
    )
  );

-- 4. RLS Policy for prescriptions (Dual-Mode: Org staff OR Global Patient)
CREATE POLICY "prescriptions_isolation_policy" ON "prescriptions"
  FOR ALL
  USING (
    (
      current_setting('app.current_tenant_id', true) IS NOT NULL 
      AND current_setting('app.current_tenant_id', true) <> ''
      AND org_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
    OR
    (
      (current_setting('app.current_tenant_id', true) IS NULL OR current_setting('app.current_tenant_id', true) = '')
      AND (
        current_setting('app.current_user_id', true) IS NULL 
        OR current_setting('app.current_user_id', true) = ''
        OR patient_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      )
    )
  )
  WITH CHECK (
    (
      current_setting('app.current_tenant_id', true) IS NOT NULL 
      AND current_setting('app.current_tenant_id', true) <> ''
      AND org_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
    OR
    (
      (current_setting('app.current_tenant_id', true) IS NULL OR current_setting('app.current_tenant_id', true) = '')
      AND (
        current_setting('app.current_user_id', true) IS NULL 
        OR current_setting('app.current_user_id', true) = ''
        OR patient_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      )
    )
  );

-- 5. RLS Policy for prescription_items
CREATE POLICY "prescription_items_isolation_policy" ON "prescription_items"
  FOR ALL
  USING (
    (
      current_setting('app.current_tenant_id', true) IS NOT NULL 
      AND current_setting('app.current_tenant_id', true) <> ''
      AND org_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
    OR
    (
      (current_setting('app.current_tenant_id', true) IS NULL OR current_setting('app.current_tenant_id', true) = '')
      AND (
        current_setting('app.current_user_id', true) IS NULL 
        OR current_setting('app.current_user_id', true) = ''
        OR EXISTS (
          SELECT 1 FROM "prescriptions" p
          WHERE p.id = prescription_id
          AND p.patient_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        )
      )
    )
  )
  WITH CHECK (
    (
      current_setting('app.current_tenant_id', true) IS NOT NULL 
      AND current_setting('app.current_tenant_id', true) <> ''
      AND org_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
    OR
    (
      (current_setting('app.current_tenant_id', true) IS NULL OR current_setting('app.current_tenant_id', true) = '')
      AND (
        current_setting('app.current_user_id', true) IS NULL 
        OR current_setting('app.current_user_id', true) = ''
        OR EXISTS (
          SELECT 1 FROM "prescriptions" p
          WHERE p.id = prescription_id
          AND p.patient_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        )
      )
    )
  );

-- Grant permissions to application role curemate_app
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO curemate_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO curemate_app;
