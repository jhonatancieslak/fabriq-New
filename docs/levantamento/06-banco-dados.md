# 06 — Modelagem de Dados

> Squad: c-level-squad + data-squad

---

## Entidades Principais

### tenants (multi-tenant base)
```
id            UUID PK
slug          VARCHAR UNIQUE (ex: "empresa-xyz")
name          VARCHAR
plan          ENUM (starter, pro, factory, enterprise)
subdomain     VARCHAR UNIQUE NULLABLE
custom_domain VARCHAR UNIQUE NULLABLE
is_active     BOOLEAN DEFAULT true
settings      JSONB (logo, cores white-label, SMTP, Evolution API)
created_at    TIMESTAMP
```

### users (admins, financeiros, solicitadores)
```
id            UUID PK
tenant_id     UUID FK tenants
name          VARCHAR
email         VARCHAR
password_hash VARCHAR (bcrypt rounds 12)
role          ENUM (admin, financial, requester, viewer)
is_active     BOOLEAN
last_login_at TIMESTAMP
created_at    TIMESTAMP
```

### operators (perfil separado — acesso via PWA)
```
id            UUID PK
tenant_id     UUID FK tenants
name          VARCHAR
username      VARCHAR (único por tenant)
password_hash VARCHAR (bcrypt rounds 12)
phone         VARCHAR NULLABLE (WhatsApp com DDI)
email         VARCHAR NULLABLE
machine_id    UUID FK machines NULLABLE
is_active     BOOLEAN
created_at    TIMESTAMP
```

### clients
```
id            UUID PK
tenant_id     UUID FK tenants
name          VARCHAR
tax_id        VARCHAR NULLABLE (NIF/CNPJ)
email         VARCHAR NULLABLE
phone         VARCHAR NULLABLE
address       TEXT NULLABLE
created_at    TIMESTAMP
```

### requesters (solicitadores — quem pede e recebe notificações)
```
id            UUID PK
tenant_id     UUID FK tenants
name          VARCHAR
email         VARCHAR NULLABLE
phone         VARCHAR NULLABLE (WhatsApp)
notify_whatsapp BOOLEAN DEFAULT true
notify_email    BOOLEAN DEFAULT true
created_at    TIMESTAMP
```

### projects (obras)
```
id            UUID PK
tenant_id     UUID FK tenants
client_id     UUID FK clients
code          VARCHAR (ex: OB-2026-001)
name          VARCHAR
description   TEXT NULLABLE
status        ENUM (open, in_progress, completed, invoiced)
created_by    UUID FK users
created_at    TIMESTAMP
```

### machines
```
id            UUID PK
tenant_id     UUID FK tenants
name          VARCHAR
type          ENUM (laser_cnc, bending, guillotine)
model         VARCHAR NULLABLE
serial        VARCHAR NULLABLE
is_active     BOOLEAN DEFAULT true
created_at    TIMESTAMP
```

### materials
```
id            UUID PK
tenant_id     UUID FK tenants
name          VARCHAR (ex: "Aço Carbono", "Inox 304")
type          ENUM (steel, stainless, aluminum, copper, brass, other)
is_active     BOOLEAN DEFAULT true
```

### service_orders (ordens de serviço)
```
id              UUID PK
tenant_id       UUID FK tenants
order_number    VARCHAR UNIQUE (OS-YYYYMM-XXXX)
project_id      UUID FK projects
client_id       UUID FK clients
requester_id    UUID FK requesters NULLABLE
status          ENUM (draft, pending, in_progress, completed, awaiting_invoice, invoiced, cancelled)
auth_code       VARCHAR UNIQUE (FBRQ-YYYYMM-XXXX-RAND) ← código de autenticidade
access_token    UUID UNIQUE ← QR code de acesso
notes           TEXT NULLABLE
cancel_reason   TEXT NULLABLE
created_by      UUID FK users
completed_at    TIMESTAMP NULLABLE
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### order_stages (etapas da ordem — multi-etapa)
```
id              UUID PK
tenant_id       UUID FK tenants
service_order_id UUID FK service_orders
stage_number    INTEGER (1, 2, 3...)
type            ENUM (laser_cnc, bending, guillotine)
machine_id      UUID FK machines NULLABLE
operator_id     UUID FK operators NULLABLE
status          ENUM (pending, in_progress, paused, completed)
started_at      TIMESTAMP NULLABLE
paused_at       TIMESTAMP NULLABLE
completed_at    TIMESTAMP NULLABLE
cutting_time    INTEGER NULLABLE (minutos reais)
notes           TEXT NULLABLE
operator_signature TEXT NULLABLE (base64 ou URL)
created_at      TIMESTAMP
```

### order_items (peças/itens da ordem)
```
id              UUID PK
tenant_id       UUID FK tenants
service_order_id UUID FK service_orders
filename        VARCHAR (nome do DXF/DWG original)
description     VARCHAR
width_mm        DECIMAL NULLABLE (detectado do DXF)
height_mm       DECIMAL NULLABLE
area_m2         DECIMAL NULLABLE
material_id     UUID FK materials
thickness_mm    DECIMAL
quantity_planned INTEGER
quantity_done   INTEGER NULLABLE (preenchido ao concluir)
sort_order      INTEGER
```

### order_files (ficheiros DXF/DWG)
```
id              UUID PK
tenant_id       UUID FK tenants
order_item_id   UUID FK order_items
original_name   VARCHAR
storage_path    VARCHAR (S3/MinIO path)
preview_path    VARCHAR NULLABLE (PNG gerado)
size_bytes      INTEGER
mime_type       VARCHAR
created_at      TIMESTAMP
```

### order_photos (fotos tiradas pelo operador)
```
id              UUID PK
tenant_id       UUID FK tenants
order_stage_id  UUID FK order_stages
storage_path    VARCHAR
thumbnail_path  VARCHAR NULLABLE
taken_by        UUID FK operators
taken_at        TIMESTAMP
```

### cutting_params (base IA de parâmetros)
```
id              UUID PK
tenant_id       UUID FK tenants NULLABLE (NULL = parâmetros globais FABRIQ)
material_type   ENUM
thickness_mm    DECIMAL
machine_type    ENUM
speed_mm_min    INTEGER
power_percent   DECIMAL
gas_pressure_bar DECIMAL
gas_type        ENUM (nitrogen, oxygen, air)
nozzle_mm       DECIMAL
frequency       INTEGER NULLABLE
notes           TEXT NULLABLE
source          ENUM (fabriq_default, operator_feedback, admin_manual)
confidence      DECIMAL DEFAULT 1.0 (0-1, aumenta com feedback positivo)
created_at      TIMESTAMP
```

### cutting_params_feedback
```
id              UUID PK
tenant_id       UUID FK tenants
param_id        UUID FK cutting_params
operator_id     UUID FK operators
order_stage_id  UUID FK order_stages
result          ENUM (worked, adjusted, failed)
actual_speed    INTEGER NULLABLE
actual_power    DECIMAL NULLABLE
actual_pressure DECIMAL NULLABLE
notes           TEXT NULLABLE
created_at      TIMESTAMP
```

### invoicing (faturação)
```
id              UUID PK
tenant_id       UUID FK tenants
service_order_id UUID FK service_orders UNIQUE
type            ENUM (material_and_labor, labor_only)
cost_value      DECIMAL NULLABLE
invoice_date    DATE NULLABLE
invoiced_by     UUID FK users NULLABLE
status          ENUM (pending, invoiced, cancelled)
notes           TEXT NULLABLE
created_at      TIMESTAMP
```

### audit_logs (auditoria imutável)
```
id              UUID PK
tenant_id       UUID FK tenants NULLABLE
user_id         UUID NULLABLE
operator_id     UUID NULLABLE
action          VARCHAR (ex: "order.created", "stage.completed")
entity_type     VARCHAR
entity_id       UUID NULLABLE
ip_address      INET
user_agent      TEXT
payload         JSONB (dados da ação)
created_at      TIMESTAMP
```

### notifications_log
```
id              UUID PK
tenant_id       UUID FK tenants
channel         ENUM (whatsapp, email)
recipient_phone VARCHAR NULLABLE
recipient_email VARCHAR NULLABLE
template        VARCHAR
status          ENUM (sent, failed, pending)
error_message   TEXT NULLABLE
sent_at         TIMESTAMP NULLABLE
created_at      TIMESTAMP
```

### refresh_tokens
```
id              UUID PK
user_id         UUID NULLABLE FK users
operator_id     UUID NULLABLE FK operators
token_hash      VARCHAR UNIQUE
expires_at      TIMESTAMP
revoked_at      TIMESTAMP NULLABLE
created_at      TIMESTAMP
```

---

## Índices Críticos

```sql
-- Multi-tenant (obrigatório em todas as tabelas)
CREATE INDEX idx_service_orders_tenant ON service_orders(tenant_id);
CREATE INDEX idx_order_stages_tenant ON order_stages(tenant_id);

-- Lookups frequentes
CREATE INDEX idx_service_orders_status ON service_orders(tenant_id, status);
CREATE INDEX idx_service_orders_project ON service_orders(project_id);
CREATE INDEX idx_order_stages_order ON order_stages(service_order_id);
CREATE INDEX idx_order_stages_operator ON order_stages(operator_id, status);

-- Auth
CREATE UNIQUE INDEX idx_users_email_tenant ON users(tenant_id, email);
CREATE UNIQUE INDEX idx_operators_username_tenant ON operators(tenant_id, username);

-- Verificação pública (sem tenant filter)
CREATE UNIQUE INDEX idx_service_orders_auth_code ON service_orders(auth_code);
CREATE UNIQUE INDEX idx_service_orders_access_token ON service_orders(access_token);

-- Parâmetros IA
CREATE INDEX idx_cutting_params_lookup ON cutting_params(material_type, thickness_mm, machine_type);
```
