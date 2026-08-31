-- Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
-- Modelo de cobrança flexível: mão-de-obra (tempo de máquina) separada de matéria-prima,
-- cliente pode trazer o próprio material (custo de material zerado), discriminação
-- configurável por empresa. Referência: v1 (services/nesting) OrcamentoItem.custo_corte
-- + ConfiguracaoCusto (custo_minuto/tempo_minimo/velocidade_media), adaptado pra usar
-- machine_parameters (por máquina+material+espessura) em vez de config global única.

alter table quote_items
  add column if not exists machine_id uuid references machines(id),
  add column if not exists chapa_cliente boolean not null default false,
  add column if not exists perimetro_mm numeric(12,2),
  add column if not exists custo_mo_calculado numeric(14,4);

alter table company_settings
  add column if not exists discriminar_mo_mp boolean not null default true;
