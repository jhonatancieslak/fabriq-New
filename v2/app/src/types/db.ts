export type UserRole = 'admin' | 'gestor' | 'vendedor' | 'operador'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'blocked' | 'canceled'
export type MachineType = 'laser' | 'guilhotina' | 'quinagem'
export type GasType = 'oxigenio' | 'nitrogenio' | 'ar_comprimido'
export type MaterialName = 'aco_carbono' | 'aco_inoxidavel' | 'aluminio' | 'cobre' | 'bronze'
export type DobraPricingMode = 'por_batida' | 'por_kg'

export const MACHINE_TYPE_LABELS: Record<MachineType, string> = {
  laser: 'Laser',
  guilhotina: 'Guilhotina',
  quinagem: 'Quinagem',
}

export const GAS_TYPE_LABELS: Record<GasType, string> = {
  oxigenio: 'Oxigénio',
  nitrogenio: 'Nitrogénio',
  ar_comprimido: 'Ar comprimido',
}

export const MATERIAL_NAME_LABELS: Record<MaterialName, string> = {
  aco_carbono: 'Aço carbono',
  aco_inoxidavel: 'Aço inoxidável',
  aluminio: 'Alumínio',
  cobre: 'Cobre',
  bronze: 'Bronze',
}

export interface Machine {
  id: string
  company_id: string
  nome: string
  tipo: MachineType
  created_at: string
}

export interface Material {
  id: string
  company_id: string
  nome: MaterialName
  preco_kg: number
  peso_especifico: number
  created_at: string
}

export interface MachineParameter {
  id: string
  company_id: string
  machine_id: string
  material_id: string
  espessura_mm: number
  tipo_gas: GasType | null
  consumo_gas_m3h: number | null
  preco_gas_m3: number | null
  valor_hora_maquina: number
  taxa_minima: number
  fator_penalizacao: number
  diametro_min_furo_mm: number | null
  velocidade_corte_mms: number | null
  velocidade_vaporizacao_mms: number | null
  parada_por_furo_s: number | null
  entrada_contorno_mm: number | null
  velocidade_deslocamento_mms: number | null
  aceleracao_deslocamento_mms2: number | null
  frequencia_filtro_corte_hz: number | null
}

export type QuoteStatus = 'rascunho' | 'enviado' | 'aprovado' | 'rejeitado'
export type QuoteItemOrigem = 'dxf' | 'parametrica'
export type GeometriaTipo = 'retangulo' | 'circulo'

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

export interface Geometria {
  tipo: GeometriaTipo
  largura_mm?: number
  altura_mm?: number
  diametro_mm?: number
  furos?: number
}

export interface Quote {
  id: string
  company_id: string
  client_id: string | null
  vendedor_id: string | null
  pricing_preset_id: string | null
  status: QuoteStatus
  desconto_pct: number
  iva_pct: number
  currency: string
  total_liquido: number
  total_iva: number
  total_bruto: number
  pdf_url: string | null
  created_at: string
  updated_at: string
}

export interface QuoteItem {
  id: string
  company_id: string
  quote_id: string
  material_id: string | null
  machine_id: string | null
  espessura_mm: number | null
  dxf_url: string | null
  descricao: string | null
  quantidade: number
  peso_kg: number | null
  perimetro_mm: number | null
  tempo_corte_s: number | null
  custo_calculado: number | null
  custo_mo_calculado: number | null
  chapa_cliente: boolean
  geometria: Geometria | null
  origem: QuoteItemOrigem
}

export type ProductionOrderStatus = 'aguardando' | 'em_producao' | 'concluido' | 'cancelado'

export const PRODUCTION_ORDER_STATUS_LABELS: Record<ProductionOrderStatus, string> = {
  aguardando: 'Aguardando',
  em_producao: 'Em Produção',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

export interface ProductionOrder {
  id: string
  company_id: string
  quote_id: string | null
  tipo: MachineType
  status: ProductionOrderStatus
  qr_code: string
  label_printed_at: string | null
  iniciado_em: string | null
  concluido_em: string | null
  created_at: string
  updated_at: string
}

export interface ProductionOrderItem {
  id: string
  company_id: string
  production_order_id: string
  quote_item_id: string | null
  material_id: string | null
  quantidade: number
  materia_prima_consumida_kg: number | null
  created_at: string
}

export type EtapaProducao = 'corte' | 'quinagem' | 'guilhotina' | 'acabamento' | 'finalizado'

export const ETAPA_PRODUCAO_LABELS: Record<EtapaProducao, string> = {
  corte: 'Corte',
  quinagem: 'Quinagem',
  guilhotina: 'Guilhotina',
  acabamento: 'Acabamento',
  finalizado: 'Finalizado',
}

export type StageStatus = 'pendente' | 'em_curso' | 'pausado' | 'concluido'

export interface ProductionOrderStage {
  id: string
  company_id: string
  production_order_id: string
  numero_etapa: number
  etapa: EtapaProducao
  tipo: MachineType | null
  machine_id: string | null
  operador_id: string | null
  status: StageStatus
  iniciado_em: string | null
  pausado_em: string | null
  concluido_em: string | null
  tempo_corte_s: number | null
  notas: string | null
  assinatura_operador: string | null
  created_at: string
}

export interface ProductionOrderPhoto {
  id: string
  company_id: string
  production_order_stage_id: string
  storage_path: string
  thumbnail_path: string | null
  tirada_por: string | null
  tirada_em: string
}

export interface Client {
  id: string
  company_id: string
  empresa: string
  contacto: string | null
  vendedor_id: string | null
  nif: string | null
  email: string | null
  telefone: string | null
  endereco: string | null
  cidade: string | null
  codigo_postal: string | null
  condicao_pagamento: string | null
  pricing_preset_id: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface PricingPreset {
  id: string
  company_id: string
  nome: string
  mo_pct: number
  mp_pct: number
  se_pct: number
  iva_pct: number
  outras_taxas_pct: number
  comissao_pct: number
  is_default: boolean
}

export interface CompanySettings {
  company_id: string
  desconto_opcao1_pct: number | null
  desconto_opcao2_pct: number | null
  dobra_pricing_mode: DobraPricingMode
  preco_dobra: number | null
  preco_kg_dobra: number | null
  custo_setup_hora: number | null
  tempo_setup_padrao_min: number | null
  cliente_inativo_dias: number | null
  condicao_pagamento_padrao: string | null
  observacao_padrao: string | null
  pdf_orientacao: string | null
  pdf_densidade: string | null
  pdf_tamanho_desenho: string | null
  pdf_listras_zebradas: boolean
  pdf_mostrar_logo: boolean
  discriminar_mo_mp: boolean
}

export interface Company {
  id: string
  razao_social: string
  nome_fantasia: string | null
  nif: string
  maquina_potencia: string | null
  maquina_dimensao: string | null
  locale: string
  currency: string
  logo_url: string | null
  tema: string
}

export interface Subscription {
  id: string
  company_id: string
  plano: string
  status: SubscriptionStatus
  trial_ends_at: string | null
  current_period_end: string | null
}

export type NestingJobStatus = 'pendente' | 'concluido' | 'erro'

export const NESTING_JOB_STATUS_LABELS: Record<NestingJobStatus, string> = {
  pendente: 'Pendente',
  concluido: 'Concluído',
  erro: 'Erro',
}

export interface SheetModel {
  id: string
  company_id: string
  material_id: string | null
  nome: string
  largura_mm: number
  altura_mm: number
  espessura_mm: number | null
}

export interface NestingLayoutPeca {
  id: string
  x: number
  y: number
  largura: number
  altura: number
  rotacionada: boolean
}

export interface NestingLayout {
  chapas: { pecas: NestingLayoutPeca[]; aproveitamento_pct: number }[]
}

export interface NestingJob {
  id: string
  company_id: string
  quote_id: string | null
  production_order_id: string | null
  chapa_largura_mm: number | null
  chapa_altura_mm: number | null
  gap_mm: number
  aproveitamento_pct: number | null
  pecas_count: number | null
  chapas_necessarias: number | null
  pecas_por_chapa: number | null
  pecas_nao_encaixadas: number
  layout_json: NestingLayout | null
  status: NestingJobStatus
  created_at: string
}

export interface AppUser {
  id: string
  company_id: string
  nome_completo: string
  email: string
  telefone: string | null
  role: UserRole
}
