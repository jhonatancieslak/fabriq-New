// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import type { Geometria, Material, PricingPreset, QuoteItem } from '../types/db'

// v1 simplificado: custo por peso de material. Tempo/custo de máquina entra
// quando o item passar pelo módulo Nesting (ainda não interliga aqui).
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

export function itemCustoMateriaPrima(peso: number, material: Material | null): number {
  if (!material) return 0
  return peso * Number(material.preco_kg)
}

export interface QuoteTotals {
  subtotalMp: number
  totalLiquido: number
  totalIva: number
  totalBruto: number
}

export function computeQuoteTotals(items: QuoteItem[], preset: PricingPreset | null, descontoPct: number, ivaPct: number): QuoteTotals {
  const subtotalMp = items.reduce((sum, it) => sum + (Number(it.custo_calculado) || 0) * it.quantidade, 0)
  const moPct = preset ? Number(preset.mo_pct) : 0
  const mpPct = preset ? Number(preset.mp_pct) : 0
  const sePct = preset ? Number(preset.se_pct) : 0

  const comMargem = subtotalMp * (1 + (moPct + mpPct + sePct) / 100)
  const totalLiquido = comMargem * (1 - descontoPct / 100)
  const totalIva = totalLiquido * (ivaPct / 100)
  const totalBruto = totalLiquido + totalIva

  return { subtotalMp, totalLiquido, totalIva, totalBruto }
}
