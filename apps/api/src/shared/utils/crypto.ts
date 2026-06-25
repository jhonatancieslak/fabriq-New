// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import bcrypt from 'bcryptjs'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const SALT_ROUNDS = 12
const ALGORITHM = 'aes-256-gcm'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function encryptData(text: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'hex').slice(0, 32)
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptData(payload: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'hex').slice(0, 32)
  const [ivHex, tagHex, encryptedHex] = payload.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
}
