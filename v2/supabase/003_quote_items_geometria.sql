-- Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
-- Geometria paramétrica em quote_items (retângulo/círculo/etc + furos), além de dxf_url.
-- geometria: {"tipo":"retangulo","largura_mm":..,"altura_mm":..} | {"tipo":"circulo","diametro_mm":..}
--            furos opcional: [{"tipo":"circulo","diametro_mm":..,"x_mm":..,"y_mm":..}, ...]

alter table quote_items
  add column geometria jsonb,
  add column origem text not null default 'dxf' check (origem in ('dxf', 'parametrica'));

comment on column quote_items.geometria is 'Forma paramétrica quando origem=parametrica: {tipo, dims..., furos:[...]}';
comment on column quote_items.origem is 'dxf: ficheiro importado (dxf_url); parametrica: geometria definida por formulário (geometria)';
