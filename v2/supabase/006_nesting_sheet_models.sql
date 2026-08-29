-- Catálogo de tamanhos de chapa reutilizáveis por material, para o módulo Nesting.

create table sheet_models (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  material_id uuid references materials(id),
  nome text not null,
  largura_mm numeric(10,2) not null,
  altura_mm numeric(10,2) not null,
  espessura_mm numeric(8,3),
  created_at timestamptz not null default now()
);

create index on sheet_models (company_id, material_id);

alter table sheet_models enable row level security;

create policy tenant_isolation on sheet_models for all using (company_id = auth_company_id());
