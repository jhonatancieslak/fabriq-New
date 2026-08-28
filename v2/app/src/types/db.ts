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

export interface PricingPreset {
  id: string
  company_id: string
  nome: string
  mo_pct: number
  mp_pct: number
  se_pct: number
  iva_pct: number
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

export interface AppUser {
  id: string
  company_id: string
  nome_completo: string
  email: string
  telefone: string | null
  role: UserRole
}
