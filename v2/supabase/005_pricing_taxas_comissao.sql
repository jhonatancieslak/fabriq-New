-- Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
-- Paridade fiscal PT em pricing_presets: outras taxas e comissão globais por preset
-- (modelo simplificado — PT não tem impostos distintos por categoria M.O./M.P./S.E. como o BR,
-- por isso não replicamos bloco fiscal por categoria, só os dois campos que faltavam)

alter table pricing_presets
  add column if not exists outras_taxas_pct numeric(6,3) not null default 0,
  add column if not exists comissao_pct numeric(6,3) not null default 0;
