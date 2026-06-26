// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import { mkdirSync } from 'fs'
import { join } from 'path'

export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads')
mkdirSync(join(UPLOADS_DIR, 'photos'), { recursive: true })
