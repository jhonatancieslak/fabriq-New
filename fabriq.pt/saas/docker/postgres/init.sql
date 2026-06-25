-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('starter', 'pro', 'factory', 'enterprise');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'financial', 'requester', 'viewer');

-- CreateEnum
CREATE TYPE "MachineType" AS ENUM ('laser_cnc', 'bending', 'guillotine');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('steel', 'stainless', 'aluminum', 'copper', 'brass', 'other');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('draft', 'pending', 'in_progress', 'completed', 'awaiting_invoice', 'invoiced', 'cancelled');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('pending', 'in_progress', 'paused', 'completed');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('material_and_labor', 'labor_only');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('pending', 'invoiced', 'cancelled');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('whatsapp', 'email');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "ParamSource" AS ENUM ('fabriq_default', 'operator_feedback', 'admin_manual');

-- CreateEnum
CREATE TYPE "ParamFeedbackResult" AS ENUM ('worked', 'adjusted', 'failed');

-- CreateEnum
CREATE TYPE "GasType" AS ENUM ('nitrogen', 'oxygen', 'air');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('open', 'in_progress', 'completed', 'invoiced');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" "TenantPlan" NOT NULL DEFAULT 'starter',
    "subdomain" TEXT,
    "custom_domain" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operators" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "machine_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tax_id" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requesters" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notify_whatsapp" BOOLEAN NOT NULL DEFAULT true,
    "notify_email" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requesters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'open',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MachineType" NOT NULL,
    "model" TEXT,
    "serial" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MaterialType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "requester_id" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'draft',
    "auth_code" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "notes" TEXT,
    "cancel_reason" TEXT,
    "created_by" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_stages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "stage_number" INTEGER NOT NULL,
    "type" "MachineType" NOT NULL,
    "machine_id" TEXT,
    "operator_id" TEXT,
    "status" "StageStatus" NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP(3),
    "paused_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cutting_time" INTEGER,
    "notes" TEXT,
    "operator_signature" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "width_mm" DECIMAL(65,30),
    "height_mm" DECIMAL(65,30),
    "area_m2" DECIMAL(65,30),
    "thickness_mm" DECIMAL(65,30) NOT NULL,
    "quantity_planned" INTEGER NOT NULL,
    "quantity_done" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_files" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "preview_path" TEXT,
    "size_bytes" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_photos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_stage_id" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "thumbnail_path" TEXT,
    "taken_by" TEXT NOT NULL,
    "taken_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cutting_params" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "material_type" "MaterialType" NOT NULL,
    "thickness_mm" DECIMAL(65,30) NOT NULL,
    "machine_type" "MachineType" NOT NULL,
    "speed_mm_min" INTEGER NOT NULL,
    "power_percent" DECIMAL(65,30) NOT NULL,
    "gas_pressure_bar" DECIMAL(65,30) NOT NULL,
    "gas_type" "GasType" NOT NULL,
    "nozzle_mm" DECIMAL(65,30) NOT NULL,
    "frequency" INTEGER,
    "notes" TEXT,
    "source" "ParamSource" NOT NULL DEFAULT 'fabriq_default',
    "confidence" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cutting_params_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cutting_param_feedbacks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "param_id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "order_stage_id" TEXT NOT NULL,
    "result" "ParamFeedbackResult" NOT NULL,
    "actual_speed" INTEGER,
    "actual_power" DECIMAL(65,30),
    "actual_pressure" DECIMAL(65,30),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cutting_param_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoicing" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "cost_value" DECIMAL(65,30),
    "invoice_date" TIMESTAMP(3),
    "invoiced_by" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoicing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "operator_id" TEXT,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_id" TEXT,
    "operator_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipient_phone" TEXT,
    "recipient_email" TEXT,
    "template" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_custom_domain_key" ON "tenants"("custom_domain");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "operators_tenant_id_idx" ON "operators"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "operators_tenant_id_username_key" ON "operators"("tenant_id", "username");

-- CreateIndex
CREATE INDEX "clients_tenant_id_idx" ON "clients"("tenant_id");

-- CreateIndex
CREATE INDEX "requesters_tenant_id_idx" ON "requesters"("tenant_id");

-- CreateIndex
CREATE INDEX "projects_tenant_id_idx" ON "projects"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_tenant_id_code_key" ON "projects"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "machines_tenant_id_idx" ON "machines"("tenant_id");

-- CreateIndex
CREATE INDEX "materials_tenant_id_idx" ON "materials"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_order_number_key" ON "service_orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_auth_code_key" ON "service_orders"("auth_code");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_access_token_key" ON "service_orders"("access_token");

-- CreateIndex
CREATE INDEX "service_orders_tenant_id_idx" ON "service_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "service_orders_tenant_id_status_idx" ON "service_orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "service_orders_project_id_idx" ON "service_orders"("project_id");

-- CreateIndex
CREATE INDEX "order_stages_tenant_id_idx" ON "order_stages"("tenant_id");

-- CreateIndex
CREATE INDEX "order_stages_service_order_id_idx" ON "order_stages"("service_order_id");

-- CreateIndex
CREATE INDEX "order_stages_operator_id_status_idx" ON "order_stages"("operator_id", "status");

-- CreateIndex
CREATE INDEX "order_items_service_order_id_idx" ON "order_items"("service_order_id");

-- CreateIndex
CREATE INDEX "cutting_params_material_type_thickness_mm_machine_type_idx" ON "cutting_params"("material_type", "thickness_mm", "machine_type");

-- CreateIndex
CREATE UNIQUE INDEX "invoicing_service_order_id_key" ON "invoicing"("service_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "notification_logs_tenant_id_idx" ON "notification_logs"("tenant_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operators" ADD CONSTRAINT "operators_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operators" ADD CONSTRAINT "operators_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requesters" ADD CONSTRAINT "requesters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machines" ADD CONSTRAINT "machines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "requesters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_stages" ADD CONSTRAINT "order_stages_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_stages" ADD CONSTRAINT "order_stages_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_stages" ADD CONSTRAINT "order_stages_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_files" ADD CONSTRAINT "order_files_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_photos" ADD CONSTRAINT "order_photos_order_stage_id_fkey" FOREIGN KEY ("order_stage_id") REFERENCES "order_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_photos" ADD CONSTRAINT "order_photos_taken_by_fkey" FOREIGN KEY ("taken_by") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cutting_params" ADD CONSTRAINT "cutting_params_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cutting_param_feedbacks" ADD CONSTRAINT "cutting_param_feedbacks_param_id_fkey" FOREIGN KEY ("param_id") REFERENCES "cutting_params"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cutting_param_feedbacks" ADD CONSTRAINT "cutting_param_feedbacks_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cutting_param_feedbacks" ADD CONSTRAINT "cutting_param_feedbacks_order_stage_id_fkey" FOREIGN KEY ("order_stage_id") REFERENCES "order_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoicing" ADD CONSTRAINT "invoicing_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
