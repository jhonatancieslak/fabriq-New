// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
/**
 * Motor de cálculo de custo de corte laser.
 * Espelha a lógica do NestCut (calcular_custo) com lookup em CostTable.
 *
 * Hierarquia de preço de material:
 *   1. CostTable com materialType + thicknessMm exacta  → preço preciso
 *   2. CostTable com materialType + thicknessMm = 0     → fallback sem espessura
 *   3. Material.costPerM2 (campo genérico do material)  → último recurso
 */

import { PrismaClient, type MaterialType } from '@prisma/client'

const prisma = new PrismaClient()

export interface CostInput {
  tenantId: string
  /** Tempo real de corte em segundos (cuttingTime da stage) */
  cuttingTimeSecs?: number | null
  /** Custo da máquina por minuto (€/min) */
  machineMinuteCost?: number | null
  /** Tempo mínimo cobrado em minutos */
  minBilledMinutes?: number | null
  /** Custo fixo até ao mínimo (€) */
  minBilledCost?: number | null
  /** Margem % sobre o total (ex: 20 = +20%) */
  marginPercent?: number | null
  /** Tipo de material (aco, inox, aluminio, cobre, outro) */
  materialType?: MaterialType | null
  /** Espessura da peça em mm (para lookup na CostTable) */
  thicknessMm?: number | null
  /** Área total das peças em m² */
  areaM2?: number | null
  /** Chapa fornecida pelo cliente → sem custo de material */
  sheetClientOwned?: boolean
}

export interface CostResult {
  cuttingCost: number     // custo de corte (máquina + MO)
  materialCost: number    // custo de material
  totalCost: number       // total com margem
  costPerM2Used: number   // €/m² aplicado
  minBilledApplied: boolean  // true se foi cobrado o mínimo
  marginApplied: number   // € de margem adicionados
  tableHit: 'exact' | 'fallback' | 'material' | 'none'
}

/** Lookup do preço de material na CostTable do tenant */
async function lookupMaterialCost(
  tenantId: string,
  materialType: MaterialType,
  thicknessMm: number | null,
): Promise<{ costPerM2: number; hit: 'exact' | 'fallback' | 'none' }> {
  // 1. Lookup exacto (material + espessura)
  if (thicknessMm) {
    const exact = await prisma.costTable.findFirst({
      where: { tenantId, materialType, thicknessMm, isActive: true },
    })
    if (exact) return { costPerM2: Number(exact.costPerM2), hit: 'exact' }
  }

  // 2. Fallback: linha com thicknessMm = 0 (preço genérico do material)
  const fallback = await prisma.costTable.findFirst({
    where: { tenantId, materialType, thicknessMm: 0, isActive: true },
  })
  if (fallback) return { costPerM2: Number(fallback.costPerM2), hit: 'fallback' }

  return { costPerM2: 0, hit: 'none' }
}

export async function calculateCost(input: CostInput): Promise<CostResult> {
  const {
    tenantId,
    cuttingTimeSecs,
    machineMinuteCost,
    minBilledMinutes,
    minBilledCost,
    marginPercent,
    materialType,
    thicknessMm,
    areaM2,
    sheetClientOwned = false,
  } = input

  // ── Custo de corte (máquina / mão de obra) ────────────────────────────────
  let cuttingCost = 0
  let minBilledApplied = false

  if (cuttingTimeSecs && machineMinuteCost) {
    const totalMin = cuttingTimeSecs / 60
    const minMin = minBilledMinutes ?? 0
    const minCost = minBilledCost ?? 0

    if (minMin > 0 && totalMin <= minMin) {
      // Cobrar o mínimo
      cuttingCost = minCost > 0 ? minCost : minMin * Number(machineMinuteCost)
      minBilledApplied = true
    } else if (minMin > 0 && minCost > 0) {
      // Mínimo + excedente
      const extraMin = totalMin - minMin
      cuttingCost = minCost + extraMin * Number(machineMinuteCost)
    } else {
      cuttingCost = totalMin * Number(machineMinuteCost)
    }
  }

  // ── Custo de material ─────────────────────────────────────────────────────
  let materialCost = 0
  let costPerM2Used = 0
  let tableHit: CostResult['tableHit'] = 'none'

  if (!sheetClientOwned && areaM2 && areaM2 > 0 && materialType) {
    const lookup = await lookupMaterialCost(tenantId, materialType, thicknessMm ?? null)
    if (lookup.hit !== 'none') {
      costPerM2Used = lookup.costPerM2
      tableHit = lookup.hit
    }
    materialCost = areaM2 * costPerM2Used
  }

  // ── Margem ────────────────────────────────────────────────────────────────
  const subtotal = cuttingCost + materialCost
  const marginApplied = marginPercent ? subtotal * (Number(marginPercent) / 100) : 0
  const totalCost = subtotal + marginApplied

  return {
    cuttingCost: round2(cuttingCost),
    materialCost: round2(materialCost),
    totalCost: round2(totalCost),
    costPerM2Used: round4(costPerM2Used),
    minBilledApplied,
    marginApplied: round2(marginApplied),
    tableHit,
  }
}

/** Calcula custo directamente para uma ordem completa (busca dados do DB) */
export async function calculateOrderCost(
  tenantId: string,
  orderId: string,
): Promise<CostResult | null> {
  const order = await prisma.serviceOrder.findFirst({
    where: { id: orderId, tenantId },
    include: {
      stages: { include: { machine: true } },
      items: { include: { material: true } },
    },
  })
  if (!order) return null

  // Tempo total de corte (soma de todas as stages)
  const cuttingTimeSecs = order.stages.reduce((s, st) => s + (st.cuttingTime ?? 0), 0)

  // Máquina principal (primeira stage com máquina)
  const mainStage = order.stages.find(s => s.machine)
  const machine = mainStage?.machine

  // Área total das peças
  const areaM2 = order.items.reduce((s, i) => {
    const a = i.areaM2 ? Number(i.areaM2) * i.quantityPlanned : 0
    return s + a
  }, 0)

  // Material e espessura dominante (item com mais peças)
  let dominantItem = order.items[0]
  for (const item of order.items) {
    if (item.quantityPlanned > (dominantItem?.quantityPlanned ?? 0)) dominantItem = item
  }

  return calculateCost({
    tenantId,
    cuttingTimeSecs: cuttingTimeSecs || null,
    machineMinuteCost: machine?.costPerMinute
      ? Number(machine.costPerMinute)
      : machine?.costPerHour
        ? Number(machine.costPerHour) / 60
        : null,
    minBilledMinutes: machine?.minBilledMinutes ?? null,
    minBilledCost: machine?.minBilledCost ? Number(machine.minBilledCost) : null,
    marginPercent: machine?.marginPercent ? Number(machine.marginPercent) : null,
    materialType: dominantItem?.material?.type ?? null,
    thicknessMm: dominantItem?.thicknessMm ? Number(dominantItem.thicknessMm) : null,
    areaM2: areaM2 || null,
    sheetClientOwned: order.sheetClientOwned,
  })
}

function round2(n: number) { return Math.round(n * 100) / 100 }
function round4(n: number) { return Math.round(n * 10000) / 10000 }
