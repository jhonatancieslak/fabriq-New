// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import { z } from 'zod'

export const createOrderSchema = z.object({
  projectId: z.string().uuid(),
  clientId: z.string().uuid(),
  requesterId: z.string().uuid().optional(),
  notes: z.string().optional(),
  stages: z.array(z.object({
    type: z.enum(['laser_cnc', 'bending', 'guillotine']),
    machineId: z.string().uuid().optional(),
    operatorId: z.string().uuid().optional(),
  })).min(1, 'É necessária pelo menos uma etapa'),
  items: z.array(z.object({
    description: z.string().min(1),
    filename: z.string().min(1),
    materialId: z.string().uuid(),
    thicknessMm: z.number().positive(),
    quantityPlanned: z.number().int().positive(),
    widthMm: z.number().positive().optional(),
    heightMm: z.number().positive().optional(),
  })).min(1, 'É necessário pelo menos um item'),
})

export const startStageSchema = z.object({
  operatorId: z.string().uuid().optional(),
})

export const completeStageSchema = z.object({
  quantityDone: z.number().int().nonnegative(),
  cuttingTime: z.number().int().positive(),
  notes: z.string().optional(),
  operatorSignature: z.string().optional(),
})

export const cancelOrderSchema = z.object({
  reason: z.string().min(5),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type CompleteStageInput = z.infer<typeof completeStageSchema>
