-- Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
-- FABRIQ v2 — pipeline de etapas de produção (corte → quinagem/guilhotina → acabamento → finalizado)
-- Estende production_order_stages (003_producao_avancada.sql) com etapa lógica separada da
-- máquina física (tipo/machine_id), pois acabamento e finalizado não correspondem a uma machine_type.

create type etapa_producao as enum ('corte', 'quinagem', 'guilhotina', 'acabamento', 'finalizado');

alter table production_order_stages
  add column if not exists etapa etapa_producao;

update production_order_stages
set etapa = case tipo
  when 'laser' then 'corte'::etapa_producao
  when 'quinagem' then 'quinagem'::etapa_producao
  when 'guilhotina' then 'guilhotina'::etapa_producao
end
where etapa is null;

alter table production_order_stages
  alter column etapa set not null;

-- máquina deixa de ser obrigatória: etapas de acabamento/finalização não têm machine_type
alter table production_order_stages
  alter column tipo drop not null;

create index if not exists production_order_stages_etapa_idx
  on production_order_stages (company_id, production_order_id, etapa);
