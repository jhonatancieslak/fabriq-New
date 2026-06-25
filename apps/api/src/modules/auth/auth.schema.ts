// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const operatorLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
  tenantSlug: z.string().min(1),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export type LoginInput = z.infer<typeof loginSchema>
export type OperatorLoginInput = z.infer<typeof operatorLoginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
