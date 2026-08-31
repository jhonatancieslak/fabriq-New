-- Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
-- Necessário pro upsert (production_order_id, etapa) no fluxo de conclusão com foto.
create unique index if not exists production_order_stages_order_etapa_key
  on production_order_stages (production_order_id, etapa);
