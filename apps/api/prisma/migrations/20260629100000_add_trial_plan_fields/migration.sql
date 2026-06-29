-- Add trial to TenantPlan enum
ALTER TYPE "TenantPlan" ADD VALUE IF NOT EXISTS 'trial' BEFORE 'starter';

-- Add trial_ends_at and plan_expires_at to tenants
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMP(3);
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "plan_expires_at" TIMESTAMP(3);
