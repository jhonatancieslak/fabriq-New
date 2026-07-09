// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import { z } from 'zod'

const PROCESS_TYPES = ['laser_cut', 'guillotine', 'bending', 'welding', 'assembly', 'other'] as const
const MACHINE_TYPES = ['laser_cnc', 'cnc_router', 'plasma', 'waterjet', 'bending', 'guillotine', 'welding', 'turning', 'milling', 'other'] as const
const SHEET_ORIGINS = ['ours', 'offcut', 'client'] as const

export const createOrderSchema = z.object({
  // Identificação da ordem
  projectId:   z.string().uuid().optional(),
  clientId:    z.string().uuid().optional(),
  requesterId: z.string().uuid().optional(),
  requestedAt: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(), // data de corte
  notes:       z.string().optional(),
  isUrgent:    z.boolean().optional(),

  // Colada / chapas
  sheetBatch:       z.string().optional(),
  sheetClientOwned: z.boolean().optional(),

  // Tempos
  estimatedTimeSecs: z.number().int().positive().optional(),
  drawingTimeSecs:   z.number().int().positive().optional(),

  // Processos selecionados
  processes: z.array(z.enum(PROCESS_TYPES)).optional(),

  // Chapas
  sheets: z.array(z.object({
    origin:     z.enum(SHEET_ORIGINS).default('ours'),
    materialId: z.string().uuid().optional(),
    widthMm:    z.number().positive().optional(),
    lengthMm:   z.number().positive().optional(),
    thicknessMm: z.number().positive().optional(),
    batchNumber: z.string().optional(), // etiqueta da colada (1 por espessura distinta)
  })).optional(),

  // Etapas (geradas automaticamente a partir de processes ou definidas manualmente)
  stages: z.array(z.object({
    type:       z.enum(MACHINE_TYPES),
    machineId:  z.string().uuid().optional(),
    operatorId: z.string().uuid().optional(),
  })).min(1, 'É necessária pelo menos uma etapa'),

  // Peças
  items: z.array(z.object({
    description:    z.string().min(1),
    filename:       z.string().optional().default(''),
    materialId:     z.string().uuid(),
    thicknessMm:    z.number().positive(),
    quantityPlanned: z.number().int().positive(),
    widthMm:        z.number().positive().optional(),
    heightMm:       z.number().positive().optional(),
    notes:          z.string().optional(),
    projectId:      z.string().uuid().optional(),
    clientFreeText: z.string().optional(),
  })).min(1, 'É necessário pelo menos um item'),
})

export const startStageSchema = z.object({
  operatorId: z.string().uuid().optional(),
})

export const completeStageSchema = z.object({
  quantityDone:      z.number().int().nonnegative(),
  cuttingTime:       z.number().int().positive().optional(),
  notes:             z.string().optional(),
  operatorSignature: z.string().optional(),
  incompleteItems:   z.array(z.object({
    itemId:      z.string(),
    description: z.string(),
    qtyPlanned:  z.number().int(),
    qtyMissing:  z.number().int(),
    obs:         z.string().optional(),
  })).optional(),
})

export const cancelOrderSchema = z.object({
  reason: z.string().min(5),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type CompleteStageInput = z.infer<typeof completeStageSchema>
