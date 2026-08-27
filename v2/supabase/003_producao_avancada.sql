-- FABRIQ v2 — produção avançada
-- Referência: modelo já validado em produção no fabriq atual (apps/api/prisma/schema.prisma:
-- OrderStage, OrderItem, OrderFile, OrderPhoto, OrderSheet, NestingJob, OrderBatch).
-- Adaptado ao schema v2 (company_id em vez de tenant_id, nomes PT, RLS).
-- NÃO é cópia do iCut — iCut não tem nada disto (só orçamento).

create type stage_status as enum ('pendente', 'em_curso', 'pausado', 'concluido');
create type batch_status as enum ('planeado', 'em_curso', 'concluido', 'cancelado');
create type sheet_origin as enum ('nossa', 'cliente');

-- ============================================================
-- Etapas de produção (uma ordem pode ter várias, ex: laser → quinagem)
-- ============================================================

create table production_order_stages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  production_order_id uuid not null references production_orders(id) on delete cascade,
  numero_etapa integer not null default 1,
  tipo machine_type not null,
  machine_id uuid references machines(id),
  operador_id uuid references users(id),
  status stage_status not null default 'pendente',
  iniciado_em timestamptz,
  pausado_em timestamptz,
  concluido_em timestamptz,
  tempo_corte_s numeric(12,3),
  notas text,
  assinatura_operador text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Ficheiros DXF/DWG das peças (com geometria extraída)
-- ============================================================

create table production_order_files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  production_order_item_id uuid references production_order_items(id) on delete cascade,
  nome_original text not null,
  storage_path text not null,
  preview_path text,
  tamanho_bytes integer not null,
  mime_type text not null,
  tipo_ficheiro text, -- 'dxf' | 'dwg' | 'pdf' | 'image'
  area_m2 numeric(12,4),
  bbox_largura_mm numeric(10,3),
  bbox_altura_mm numeric(10,3),
  perimetro_mm numeric(12,3),
  processado boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Fotos tiradas durante a produção (por etapa)
-- ============================================================

create table production_order_photos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  production_order_stage_id uuid not null references production_order_stages(id) on delete cascade,
  storage_path text not null,
  thumbnail_path text,
  tirada_por uuid references users(id),
  tirada_em timestamptz not null default now()
);

-- ============================================================
-- Chapas usadas por ordem — rastreabilidade por número de colada
-- ============================================================

create table production_order_sheets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  production_order_id uuid not null references production_orders(id) on delete cascade,
  material_id uuid references materials(id),
  origem sheet_origin not null default 'nossa',
  largura_mm numeric(10,2),
  comprimento_mm numeric(10,2),
  espessura_mm numeric(8,3),
  numero_colada text,
  ordem_visual integer not null default 0,
  created_at timestamptz not null default now()
);

create index on production_order_sheets (company_id, numero_colada);

-- ============================================================
-- Lotes de produção (agrupam várias ordens para correr juntas numa máquina)
-- ============================================================

create table order_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  nome text not null,
  machine_id uuid references machines(id),
  operador_id uuid references users(id),
  agendado_para timestamptz,
  status batch_status not null default 'planeado',
  notas text,
  criado_por uuid references users(id),
  created_at timestamptz not null default now()
);

create table order_batch_orders (
  batch_id uuid not null references order_batches(id) on delete cascade,
  production_order_id uuid not null references production_orders(id) on delete cascade,
  ordem_visual integer not null default 0,
  primary key (batch_id, production_order_id)
);

-- ============================================================
-- Enriquecer tabelas já existentes
-- ============================================================

alter table production_order_items
  add column if not exists largura_mm numeric(10,3),
  add column if not exists altura_mm numeric(10,3),
  add column if not exists area_m2 numeric(12,4),
  add column if not exists perimetro_mm numeric(12,3),
  add column if not exists quantidade_concluida integer,
  add column if not exists ordem_visual integer not null default 0,
  add column if not exists notas text;

alter table nesting_jobs
  add column if not exists gap_mm numeric(6,2) default 2,
  add column if not exists pecas_count integer,
  add column if not exists chapas_necessarias integer,
  add column if not exists pecas_por_chapa integer,
  add column if not exists pecas_nao_encaixadas integer default 0,
  add column if not exists preview_path text,
  add column if not exists layout_json jsonb;

-- ============================================================
-- RLS
-- ============================================================

alter table production_order_stages enable row level security;
alter table production_order_files enable row level security;
alter table production_order_photos enable row level security;
alter table production_order_sheets enable row level security;
alter table order_batches enable row level security;
alter table order_batch_orders enable row level security;

create policy tenant_isolation on production_order_stages for all using (company_id = auth_company_id());
create policy tenant_isolation on production_order_files for all using (company_id = auth_company_id());
create policy tenant_isolation on production_order_photos for all using (company_id = auth_company_id());
create policy tenant_isolation on production_order_sheets for all using (company_id = auth_company_id());
create policy tenant_isolation on order_batches for all using (company_id = auth_company_id());
create policy tenant_isolation on order_batch_orders for all using (
  batch_id in (select id from order_batches where company_id = auth_company_id())
);

create index on production_order_stages (company_id, production_order_id);
create index on production_order_files (company_id, production_order_item_id);
create index on production_order_photos (company_id, production_order_stage_id);
create index on order_batches (company_id);
