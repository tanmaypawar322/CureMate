-- CreateEnum
CREATE TYPE "org_type" AS ENUM ('hospital', 'clinic', 'pharmacy', 'lab');

-- CreateEnum
CREATE TYPE "org_role" AS ENUM ('admin', 'doctor', 'pharmacy_owner', 'lab_owner', 'staff');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "abha_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" "org_type" NOT NULL,
    "subscription_plan_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "role" "org_role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "org_memberships_org_id_idx" ON "org_memberships"("org_id");

-- CreateIndex
CREATE INDEX "org_memberships_user_id_idx" ON "org_memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "org_memberships_user_id_org_id_role_key" ON "org_memberships"("user_id", "org_id", "role");

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable and FORCE Row Level Security (RLS) on tenant-scoped table
ALTER TABLE "org_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "org_memberships" FORCE ROW LEVEL SECURITY;

-- Tenant Isolation Policy via app.current_tenant_id session config
CREATE POLICY "org_memberships_tenant_isolation" ON "org_memberships"
  FOR ALL
  USING (
    -- If tenant context is explicitly set, strictly match org_id
    (
      current_setting('app.current_tenant_id', true) IS NOT NULL 
      AND current_setting('app.current_tenant_id', true) <> ''
      AND org_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
    -- If no tenant is set, allow access for user-scoped or system operations
    OR (
      (current_setting('app.current_tenant_id', true) IS NULL OR current_setting('app.current_tenant_id', true) = '')
      AND (
        current_setting('app.current_user_id', true) IS NULL 
        OR current_setting('app.current_user_id', true) = ''
        OR user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      )
    )
  )
  WITH CHECK (
    (
      current_setting('app.current_tenant_id', true) IS NOT NULL 
      AND current_setting('app.current_tenant_id', true) <> ''
      AND org_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
    OR (
      (current_setting('app.current_tenant_id', true) IS NULL OR current_setting('app.current_tenant_id', true) = '')
      AND (
        current_setting('app.current_user_id', true) IS NULL 
        OR current_setting('app.current_user_id', true) = ''
        OR user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      )
    )
  );

-- Create Non-Superuser Application Role (Cannot bypass RLS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'curemate_app') THEN
    CREATE ROLE curemate_app WITH LOGIN PASSWORD 'curemate_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO curemate_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO curemate_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO curemate_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO curemate_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO curemate_app;
