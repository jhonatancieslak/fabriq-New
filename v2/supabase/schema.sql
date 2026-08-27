-- FABRIQ v2 — schema inicial (Supabase/Postgres)
-- Mercado: Portugal. Moeda EUR, imposto IVA, identificação fiscal NIF, idioma pt-PT.
-- Multi-tenant por company_id, RLS em toda tabela.

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('admin', 'gestor', 'vendedor', 'operador');
create type machine_type as enum ('laser', 'guilhotina', 'quinagem');
create type gas_type as enum ('oxigenio', 'nitrogenio', 'ar_comprimido');
create type material_name as enum ('aco_carbono', 'aco_inoxidavel', 'aluminio', 'cobre', 'bronze');
create type subscription_status as enum ('trial', 'active', 'past_due', 'blocked', 'canceled');
create type quote_status as enum ('rascunho', 'enviado', 'aprovado', 'rejeitado');
create type production_order_status as enum ('aguardando', 'em_producao', 'concluido', 'cancelado');
create type dobra_pricing_mode as enum ('por_batida', 'por_kg');

-- ============================================================
-- CORE: empresas, subscrição, utilizadores
-- ============================================================

create table companies (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text,
  nif text not null,
  maquina_potencia text,
  maquina_dimensao text,
  locale text not null default 'pt-PT',
  currency text not null default 'EUR',
  logo_url text,
  tema text not null default 'claro',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  plano text not null default 'trial',
  status subscription_status not null default 'trial',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  provider_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id)
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  nome_completo text not null,
  email text not null,
  telefone text,
  role user_role not null default 'operador',
  created_at timestamptz not null default now()
);

-- ============================================================
-- MÁQUINAS E PARÂMETROS
-- ============================================================

create table machines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  nome text not null,
  tipo machine_type not null,
  created_at timestamptz not null default now()
);

create table materials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  nome material_name not null,
  preco_kg numeric(12,4) not null default 0,
  peso_especifico numeric(8,4) not null default 0, -- g/cm3
  created_at timestamptz not null default now()
);

create table machine_parameters (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  machine_id uuid not null references machines(id) on delete cascade,
  material_id uuid not null references materials(id) on delete cascade,
  espessura_mm numeric(8,3) not null,
  tipo_gas gas_type,
  consumo_gas_m3h numeric(10,4),
  preco_gas_m3 numeric(12,4),
  valor_hora_maquina numeric(12,4) not null default 0,
  taxa_minima numeric(12,4) not null default 0,
  fator_penalizacao numeric(6,4) not null default 1.0,
  diametro_min_furo_mm numeric(8,3),
  velocidade_corte_mms numeric(10,3),
  velocidade_vaporizacao_mms numeric(10,3) default 200,
  parada_por_furo_s numeric(8,3),
  entrada_contorno_mm numeric(8,3) default 0,
  velocidade_deslocamento_mms numeric(10,3) default 500,
  aceleracao_deslocamento_mms2 numeric(10,3) default 4000,
  frequencia_filtro_corte_hz numeric(8,3) default 4,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PRECIFICAÇÃO
-- ============================================================

create table pricing_presets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  nome text not null,
  mo_pct numeric(6,3) not null default 0,  -- mão de obra
  mp_pct numeric(6,3) not null default 0,  -- matéria-prima
  se_pct numeric(6,3) not null default 0,  -- serviço/extra
  iva_pct numeric(6,3) not null default 23, -- IVA padrão PT (taxa normal)
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table company_settings (
  company_id uuid primary key references companies(id) on delete cascade,
  desconto_opcao1_pct numeric(6,3),
  desconto_opcao2_pct numeric(6,3),
  dobra_pricing_mode dobra_pricing_mode not null default 'por_batida',
  preco_dobra numeric(12,4) default 0,
  preco_kg_dobra numeric(12,4) default 0,
  custo_setup_hora numeric(12,4) default 0,
  tempo_setup_padrao_min numeric(8,2) default 0,
  cliente_inativo_dias integer default 90,
  condicao_pagamento_padrao text,
  observacao_padrao text,
  pdf_orientacao text default 'vertical',
  pdf_densidade text default 'normal',
  pdf_tamanho_desenho text default 'medio',
  pdf_listras_zebradas boolean default false,
  pdf_mostrar_logo boolean default true,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CLIENTES
-- ============================================================

create table clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  empresa text not null,
  contacto text,
  vendedor_id uuid references users(id),
  nif text,
  email text,
  telefone text,
  endereco text,
  cidade text,
  codigo_postal text,
  condicao_pagamento text,
  pricing_preset_id uuid references pricing_presets(id),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ORÇAMENTOS
-- ============================================================

create table quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id),
  vendedor_id uuid references users(id),
  pricing_preset_id uuid references pricing_presets(id),
  status quote_status not null default 'rascunho',
  desconto_pct numeric(6,3) default 0,
  iva_pct numeric(6,3) not null default 23,
  currency text not null default 'EUR',
  total_liquido numeric(14,4) default 0,
  total_iva numeric(14,4) default 0,
  total_bruto numeric(14,4) default 0,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table quote_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  quote_id uuid not null references quotes(id) on delete cascade,
  material_id uuid references materials(id),
  espessura_mm numeric(8,3),
  dxf_url text,
  descricao text,
  quantidade integer not null default 1,
  peso_kg numeric(12,4),
  tempo_corte_s numeric(12,3),
  custo_calculado numeric(14,4),
  created_at timestamptz not null default now()
);

-- ============================================================
-- NESTING
-- ============================================================

create table nesting_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  quote_id uuid references quotes(id),
  production_order_id uuid, -- fk adicionada após criar production_orders
  chapa_largura_mm numeric(10,2),
  chapa_altura_mm numeric(10,2),
  aproveitamento_pct numeric(6,3),
  layout_url text,
  status text not null default 'pendente',
  created_at timestamptz not null default now()
);

-- ============================================================
-- ORDENS DE PRODUÇÃO
-- ============================================================

create table production_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  quote_id uuid references quotes(id),
  tipo machine_type not null,
  status production_order_status not null default 'aguardando',
  qr_code text not null default encode(gen_random_bytes(12), 'hex'),
  label_printed_at timestamptz,
  iniciado_em timestamptz,
  concluido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (qr_code)
);

alter table nesting_jobs
  add constraint nesting_jobs_production_order_fk
  foreign key (production_order_id) references production_orders(id) on delete set null;

create table production_order_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  production_order_id uuid not null references production_orders(id) on delete cascade,
  quote_item_id uuid references quote_items(id),
  material_id uuid references materials(id),
  quantidade integer not null default 1,
  materia_prima_consumida_kg numeric(12,4),
  created_at timestamptz not null default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

create index on subscriptions (company_id);
create index on users (company_id);
create index on machines (company_id);
create index on materials (company_id);
create index on machine_parameters (company_id, machine_id, material_id);
create index on pricing_presets (company_id);
create index on clients (company_id);
create index on quotes (company_id, client_id);
create index on quote_items (company_id, quote_id);
create index on nesting_jobs (company_id, quote_id);
create index on production_orders (company_id, quote_id);
create index on production_order_items (company_id, production_order_id);

-- ============================================================
-- RLS — isolamento por tenant (company_id) via users.company_id
-- ============================================================

-- security definer: evita recursão de RLS (esta função é usada nas policies da própria tabela users)
create or replace function auth_company_id() returns uuid
language sql stable
security definer
set search_path = public
as $$
  select company_id from users where id = auth.uid();
$$;

alter table companies enable row level security;
alter table subscriptions enable row level security;
alter table users enable row level security;
alter table machines enable row level security;
alter table materials enable row level security;
alter table machine_parameters enable row level security;
alter table pricing_presets enable row level security;
alter table company_settings enable row level security;
alter table clients enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;
alter table nesting_jobs enable row level security;
alter table production_orders enable row level security;
alter table production_order_items enable row level security;

create policy tenant_isolation on companies for all using (id = auth_company_id());
create policy tenant_isolation on subscriptions for all using (company_id = auth_company_id());
create policy tenant_isolation on users for all using (company_id = auth_company_id());
create policy tenant_isolation on machines for all using (company_id = auth_company_id());
create policy tenant_isolation on materials for all using (company_id = auth_company_id());
create policy tenant_isolation on machine_parameters for all using (company_id = auth_company_id());
create policy tenant_isolation on pricing_presets for all using (company_id = auth_company_id());
create policy tenant_isolation on company_settings for all using (company_id = auth_company_id());
create policy tenant_isolation on clients for all using (company_id = auth_company_id());
create policy tenant_isolation on quotes for all using (company_id = auth_company_id());
create policy tenant_isolation on quote_items for all using (company_id = auth_company_id());
create policy tenant_isolation on nesting_jobs for all using (company_id = auth_company_id());
create policy tenant_isolation on production_orders for all using (company_id = auth_company_id());
create policy tenant_isolation on production_order_items for all using (company_id = auth_company_id());
