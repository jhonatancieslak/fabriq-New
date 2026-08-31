// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import type { Geometria, MachineParameter, Material, PricingPreset, QuoteItem } from '../types/db'

export function perimetroMm(geometria: Geometria | null): number {
  if (!geometria) return 0
  if (geometria.tipo === 'retangulo') {
    const l = geometria.largura_mm ?? 0
    const a = geometria.altura_mm ?? 0
    return 2 * (l + a)
  }
  if (geometria.tipo === 'circulo') {
    const d = geometria.diametro_mm ?? 0
    return Math.PI * d
  }
  return 0
}

// Tempo de corte estimado a partir do perímetro + velocidade de corte da máquina
// (mesmo modelo do v1: services/nesting OrcamentoItem.custo_corte, adaptado pra usar
// machine_parameters em vez de uma config global única).
export function tempoCorteS(perimetroMmValor: number, furos: number, param: MachineParameter | null): number {
  if (!param || !param.velocidade_corte_mms) return 0
  const tempoContornoS = perimetroMmValor / param.velocidade_corte_mms
  const tempoFurosS = furos * (param.parada_por_furo_s ?? 0)
  return tempoContornoS + tempoFurosS
}

export function itemCustoMaoDeObra(tempoS: number, param: MachineParameter | null): number {
  if (!param) return 0
  const custoPorSegundo = Number(param.valor_hora_maquina) / 3600
  const custoTempo = tempoS * custoPorSegundo * (param.fator_penalizacao || 1)
  return Math.max(custoTempo, Number(param.taxa_minima) || 0)
}

export function areaM2(geometria: Geometria | null): number {
  if (!geometria) return 0
  if (geometria.tipo === 'retangulo') {
    const l = geometria.largura_mm ?? 0
    const a = geometria.altura_mm ?? 0
    return (l * a) / 1_000_000
  }
  if (geometria.tipo === 'circulo') {
    const d = geometria.diametro_mm ?? 0
    return (Math.PI * (d / 2) ** 2) / 1_000_000
  }
  return 0
}

export function pesoKg(geometria: Geometria | null, espessuraMm: number | null, material: Material | null): number {
  if (!material || !espessuraMm) return 0
  const volumeCm3 = areaM2(geometria) * 10000 * (espessuraMm / 10)
  return (volumeCm3 * material.peso_especifico) / 1000
}

export function itemCustoMateriaPrima(peso: number, material: Material | null, chapaCliente = false): number {
  if (!material || chapaCliente) return 0
  return peso * Number(material.preco_kg)
}

export interface QuoteTotals {
  subtotalMp: number
  subtotalMo: number
  totalLiquido: number
  totalIva: number
  totalBruto: number
}

export function computeQuoteTotals(items: QuoteItem[], preset: PricingPreset | null, descontoPct: number, ivaPct: number): QuoteTotals {
  const subtotalMp = items.reduce((sum, it) => sum + (Number(it.custo_calculado) || 0) * it.quantidade, 0)
  const subtotalMo = items.reduce((sum, it) => sum + (Number(it.custo_mo_calculado) || 0) * it.quantidade, 0)
  const moPct = preset ? Number(preset.mo_pct) : 0
  const mpPct = preset ? Number(preset.mp_pct) : 0
  const sePct = preset ? Number(preset.se_pct) : 0
  const outrasTaxasPct = preset ? Number(preset.outras_taxas_pct) : 0
  const comissaoPct = preset ? Number(preset.comissao_pct) : 0

  const comMargem = (subtotalMp + subtotalMo) * (1 + (moPct + mpPct + sePct + outrasTaxasPct + comissaoPct) / 100)
  const totalLiquido = comMargem * (1 - descontoPct / 100)
  const totalIva = totalLiquido * (ivaPct / 100)
  const totalBruto = totalLiquido + totalIva

  return { subtotalMp, subtotalMo, totalLiquido, totalIva, totalBruto }
}
