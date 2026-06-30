// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
// Script: Migrar ficheiros DXF do sistema NestCut → FABRIQ biblioteca de ficheiros
// Uso: node scripts/migrate-dxf-files.js

const { PrismaClient } = require('./apps/api/node_modules/@prisma/client')
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const OLD_DXF_DIR  = '/var/www/pipesolutions/app/static/uploads/dxf'
const NEW_DXF_DIR  = '/var/www/fabriq/apps/api/uploads/dxf'
const NEW_PREV_DIR = '/var/www/fabriq/apps/api/uploads/previews'

const TENANT_SLUG = 'pipesolutions'

async function main() {
  const prisma = new PrismaClient()
  const pg = new Client({ connectionString: 'postgresql://nesting:Jcieslak%403202@localhost/nesting_db' })
  await pg.connect()

  // Get tenant
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } })
  if (!tenant) { console.error('Tenant não encontrado'); process.exit(1) }

  console.log(`Tenant: ${tenant.name} (${tenant.id})`)

  // Get all DXF files from old DB with order and item info
  const { rows: files } = await pg.query(`
    SELECT
      f.id,
      f.nome_original,
      f.nome_ficheiro,
      f.preview_ficheiro,
      f.tamanho,
      f.tipo,
      f.area_m2,
      f.bbox_largura_mm,
      f.bbox_altura_mm,
      f.perimetro_mm,
      f.criado_em,
      i.nome_peca,
      i.quantidade,
      i.espessura,
      o.numero_ordem,
      cl.nome as cliente_nome
    FROM ficheiros_dxf f
    LEFT JOIN itens_ordem_corte i ON i.ficheiro_dxf_id = f.id
    LEFT JOIN ordens_corte o ON o.id = f.ordem_corte_id
    LEFT JOIN obras ob ON ob.id = i.obra_id
    LEFT JOIN clientes cl ON cl.id = ob.cliente_id
    ORDER BY f.criado_em ASC
  `)

  console.log(`\nFicheiros encontrados no sistema antigo: ${files.length}`)

  // Ensure target dirs exist
  fs.mkdirSync(path.join(NEW_DXF_DIR, tenant.id), { recursive: true })
  fs.mkdirSync(path.join(NEW_PREV_DIR, tenant.id), { recursive: true })

  let copied = 0, skipped = 0, errors = 0

  for (const f of files) {
    const oldDxfPath  = path.join(OLD_DXF_DIR, f.nome_ficheiro)
    const oldPrevPath = f.preview_ficheiro ? path.join(OLD_DXF_DIR, f.preview_ficheiro) : null

    if (!fs.existsSync(oldDxfPath)) {
      console.log(`  [SKIP] DXF não encontrado: ${f.nome_ficheiro}`)
      skipped++
      continue
    }

    // Check if already migrated (by original name + tenant)
    const existing = await prisma.orderFile.findFirst({
      where: { tenantId: tenant.id, originalName: f.nome_original ?? f.nome_ficheiro }
    })
    if (existing) {
      skipped++
      continue
    }

    try {
      // New filenames
      const newId    = require('crypto').randomUUID()
      const ext      = path.extname(f.nome_ficheiro).toLowerCase() || '.dxf'
      const newFile  = `${newId}${ext}`
      const newPrev  = oldPrevPath && fs.existsSync(oldPrevPath) ? `${newId}.png` : null

      const newDxfDest  = path.join(NEW_DXF_DIR, tenant.id, newFile)
      const newPrevDest = newPrev ? path.join(NEW_PREV_DIR, tenant.id, newPrev) : null

      // Copy files
      fs.copyFileSync(oldDxfPath, newDxfDest)
      if (oldPrevPath && fs.existsSync(oldPrevPath) && newPrevDest) {
        fs.copyFileSync(oldPrevPath, newPrevDest)
      }

      // Create OrderFile record (standalone — not linked to order/item)
      await prisma.orderFile.create({
        data: {
          tenantId:       tenant.id,
          serviceOrderId: null,        // standalone na biblioteca
          orderItemId:    null,
          originalName:   f.nome_original ?? f.nome_ficheiro,
          storagePath:    path.join(NEW_DXF_DIR, tenant.id, newFile),
          previewPath:    newPrevDest ?? null,
          sizeBytes:      f.tamanho ?? 0,
          fileType:       (f.tipo ?? 'dxf').toLowerCase(),
          areaM2:         f.area_m2 ? parseFloat(f.area_m2) : null,
          bboxWidthMm:    f.bbox_largura_mm ? parseFloat(f.bbox_largura_mm) : null,
          bboxHeightMm:   f.bbox_altura_mm ? parseFloat(f.bbox_altura_mm) : null,
          perimeterMm:    f.perimetro_mm ? parseFloat(f.perimetro_mm) : null,
          processed:      !!(f.area_m2),
          createdAt:      f.criado_em ? new Date(f.criado_em) : new Date(),
        },
      })

      copied++
      if (copied % 20 === 0) console.log(`  [OK] ${copied} ficheiros migrados...`)
    } catch (e) {
      console.error(`  [ERR] ${f.nome_ficheiro}: ${e.message}`)
      errors++
    }
  }

  await pg.end()
  await prisma.$disconnect()

  console.log(`\n━━━ Migração concluída ━━━`)
  console.log(`  Copiados: ${copied}`)
  console.log(`  Ignorados: ${skipped}`)
  console.log(`  Erros: ${errors}`)
}

main().catch(e => { console.error(e); process.exit(1) })
