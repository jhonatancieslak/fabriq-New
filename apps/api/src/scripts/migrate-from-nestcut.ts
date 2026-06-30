// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
// Script de migração: NestCut (nesting_db) → FABRIQ (fabriq_db)
// Uso: cd apps/api && npx tsx src/scripts/migrate-from-nestcut.ts [--dry-run] [--tenant pipesolutions]

import { PrismaClient } from '@prisma/client'
import pg from 'pg'
import crypto from 'crypto'

const TARGET_TENANT_SLUG = process.argv.includes('--tenant')
  ? process.argv[process.argv.indexOf('--tenant') + 1]
  : 'pipesolutions'

const DRY_RUN = process.argv.includes('--dry-run')

const OLD_DB_URL = 'postgresql://nesting:Jcieslak%403202@localhost/nesting_db'

const prisma = new PrismaClient()
const oldDb  = new pg.Client({ connectionString: OLD_DB_URL })

function genAuthCode(seed: string): string {
  return crypto.createHash('sha256').update(`${seed}${Date.now()}`).digest('hex').slice(0, 12).toUpperCase()
}

function parseTimeSecs(val: unknown): number | null {
  if (val == null) return null
  if (typeof val === 'number') return Math.round(val)
  const str = String(val)
  // HH:MM:SS
  const hms = str.match(/^(\d+):(\d+):(\d+)$/)
  if (hms) return parseInt(hms[1]) * 3600 + parseInt(hms[2]) * 60 + parseInt(hms[3])
  // seconds number
  const n = parseFloat(str)
  if (!isNaN(n)) return Math.round(n)
  return null
}

async function main() {
  await oldDb.connect()
  console.log('✓ Ligado ao nesting_db (antigo)')

  const tenant = await prisma.tenant.findFirst({ where: { slug: TARGET_TENANT_SLUG } })
  if (!tenant) { console.error(`Tenant "${TARGET_TENANT_SLUG}" não encontrado`); process.exit(1) }
  const tenantId  = tenant.id
  const adminUser = await prisma.user.findFirst({ where: { tenantId, role: 'admin' } })
  if (!adminUser) { console.error('Admin user não encontrado'); process.exit(1) }
  const adminId = adminUser.id
  console.log(`✓ Tenant: ${tenant.name} | Admin: ${adminUser.email}`)

  if (DRY_RUN) console.log('\n⚠️  DRY RUN — nada será escrito na base de dados\n')

  // ─── 1. Clientes ────────────────────────────────────────────────────────────
  console.log('\n── Clientes ──')
  const { rows: oldClients } = await oldDb.query('SELECT * FROM clientes ORDER BY id')
  const existingClients = await prisma.client.findMany({ where: { tenantId } })
  const clientMap = new Map<number, string>()

  for (const oc of oldClients) {
    const existing = existingClients.find(c => c.name.toLowerCase().trim() === oc.nome?.toLowerCase().trim())
    if (existing) { clientMap.set(oc.id, existing.id); console.log(`  SKIP: ${oc.nome}`); continue }
    if (DRY_RUN)  { clientMap.set(oc.id, `dr-${oc.id}`); console.log(`  [DRY] ${oc.nome}`); continue }
    const nc = await prisma.client.create({ data: { tenantId, name: oc.nome, email: oc.email || null, phone: oc.telefone || null } })
    clientMap.set(oc.id, nc.id)
    console.log(`  ✓ ${nc.name}`)
  }

  // ─── 2. Obras ───────────────────────────────────────────────────────────────
  console.log('\n── Obras ──')
  const { rows: oldObras } = await oldDb.query('SELECT * FROM obras ORDER BY id')
  const existingProjects = await prisma.project.findMany({ where: { tenantId } })
  const projectMap = new Map<number, string>()
  const statusProjectMap: Record<string, string> = { ativa: 'open', concluida: 'completed', cancelada: 'cancelled', pausa: 'on_hold' }

  for (const oo of oldObras) {
    const clientId = clientMap.get(oo.cliente_id)
    if (!clientId) { console.log(`  SKIP obra ${oo.numero}: cliente ${oo.cliente_id} não mapeado`); continue }
    const existing = existingProjects.find(p => p.code === oo.numero)
    if (existing) { projectMap.set(oo.id, existing.id); console.log(`  SKIP: ${oo.numero}`); continue }
    if (DRY_RUN)  { projectMap.set(oo.id, `dr-${oo.id}`); console.log(`  [DRY] ${oo.numero} — ${oo.nome}`); continue }
    const np = await prisma.project.create({
      data: {
        tenantId, clientId,
        code:        oo.numero,
        name:        oo.nome,
        description: oo.descricao || null,
        status:      statusProjectMap[oo.estado] ?? 'open' as never,
        createdById: adminId,
        createdAt:   oo.criado_em ? new Date(oo.criado_em) : new Date(),
      },
    })
    projectMap.set(oo.id, np.id)
    console.log(`  ✓ ${np.code} — ${np.name}`)
  }

  // ─── 3. Solicitadores ───────────────────────────────────────────────────────
  console.log('\n── Solicitadores ──')
  const { rows: oldSolic } = await oldDb.query('SELECT * FROM solicitadores ORDER BY id').catch(() => ({ rows: [] as any[] }))
  const existingReq = await prisma.requester.findMany({ where: { tenantId } })
  const requesterMap = new Map<number, string>()

  for (const os of oldSolic) {
    const existing = existingReq.find(r => r.name.toLowerCase().trim() === os.nome?.toLowerCase().trim())
    if (existing) { requesterMap.set(os.id, existing.id); continue }
    if (DRY_RUN)  { requesterMap.set(os.id, `dr-${os.id}`); console.log(`  [DRY] ${os.nome}`); continue }
    const nr = await prisma.requester.create({ data: { tenantId, name: os.nome, email: os.email || null, phone: os.whatsapp || null } })
    requesterMap.set(os.id, nr.id)
    console.log(`  ✓ ${nr.name}`)
  }

  // ─── 4. Materiais ───────────────────────────────────────────────────────────
  console.log('\n── Materiais ──')
  const { rows: oldMats } = await oldDb.query('SELECT * FROM materiais ORDER BY id')
  const existingMats = await prisma.material.findMany({ where: { tenantId } })
  const materialMap = new Map<number, string>()
  const matTypeMap: Record<string, string> = { aco: 'steel', inox: 'stainless', aluminio: 'aluminum', cobre: 'copper', laton: 'brass' }

  for (const om of oldMats) {
    const fullName = [om.nome, om.qualidade].filter(Boolean).join(' ').trim() || `Material ${om.id}`
    const existing = existingMats.find(m => m.name.toLowerCase().trim() === fullName.toLowerCase().trim())
    if (existing) { materialMap.set(om.id, existing.id); continue }
    if (DRY_RUN)  { materialMap.set(om.id, `dr-${om.id}`); console.log(`  [DRY] ${fullName}`); continue }
    const nm = await prisma.material.create({ data: { tenantId, name: fullName, type: matTypeMap[om.tipo] ?? 'other' as never, isActive: om.ativo ?? true } })
    materialMap.set(om.id, nm.id)
    console.log(`  ✓ ${nm.name}`)
  }

  const fallbackMaterialId = existingMats[0]?.id ?? (await prisma.material.findFirst({ where: { tenantId } }))?.id ?? ''

  // ─── 5. Ordens de Corte ─────────────────────────────────────────────────────
  console.log('\n── Ordens de Corte ──')
  const { rows: oldOrdens } = await oldDb.query('SELECT * FROM ordens_corte ORDER BY id')
  console.log(`  → ${oldOrdens.length} ordens`)

  const existingNums = new Set(
    (await prisma.serviceOrder.findMany({ where: { tenantId }, select: { orderNumber: true } })).map(o => o.orderNumber)
  )

  const statusOrderMap: Record<string, string> = {
    pendente: 'pending', em_execucao: 'in_progress', concluida: 'completed',
    cancelada: 'cancelled', faturada: 'invoiced',
  }

  let created = 0, skipped = 0, errors = 0

  for (const oo of oldOrdens) {
    const orderNumber = oo.numero_ordem || `OLD-${oo.id}`
    if (existingNums.has(orderNumber)) { skipped++; continue }

    const projectId   = oo.obra_id ? projectMap.get(oo.obra_id) : undefined
    const requesterId = oo.solicitador_id ? requesterMap.get(oo.solicitador_id) : undefined
    // clientId from project or avulso
    let clientId: string | null = null
    if (projectId && !DRY_RUN) {
      const proj = await prisma.project.findUnique({ where: { id: projectId }, select: { clientId: true } })
      clientId = proj?.clientId ?? null
    }

    const orderStatus = statusOrderMap[oo.estado] ?? 'pending'

    if (DRY_RUN) {
      console.log(`  [DRY] ${orderNumber} — ${oo.estado}`)
      created++
      continue
    }

    try {
      // Itens desta ordem
      const { rows: oldItems } = await oldDb.query(
        'SELECT * FROM itens_ordem_corte WHERE ordem_corte_id = $1 ORDER BY posicao, id', [oo.id]
      )

      await prisma.$transaction(async tx => {
        await tx.serviceOrder.create({
          data: {
            tenantId,
            orderNumber,
            authCode:    genAuthCode(orderNumber),
            projectId:   projectId ?? null,
            clientId:    clientId  ?? null,
            requesterId: requesterId ?? null,
            status:      orderStatus as never,
            notes:       oo.observacoes || null,
            sheetBatch:  oo.colada_chapa || null,
            processes:   ['laser_cut'],
            requestedAt: oo.data_solicitacao ? new Date(oo.data_solicitacao) : null,
            scheduledAt: oo.data_programada  ? new Date(oo.data_programada)  : (oo.data_corte ? new Date(oo.data_corte) : null),
            isUrgent:    oo.urgente ?? false,
            drawingTimeSecs: parseTimeSecs(oo.tempo_desenho),
            createdById: adminId,
            createdAt:   oo.criado_em ? new Date(oo.criado_em) : new Date(),
            completedAt: (oo.estado === 'concluida' && oo.hora_fim) ? new Date(oo.hora_fim) : null,
            stages: {
              create: [{
                tenantId,
                stageNumber: 1,
                type: 'laser_cnc' as never,
                status: (orderStatus === 'completed' ? 'completed' : orderStatus === 'cancelled' ? 'completed' : 'pending') as never,
                cuttingTime: parseTimeSecs(oo.tempo_corte),
                startedAt:   oo.hora_inicio ? new Date(oo.hora_inicio) : null,
                completedAt: oo.hora_fim    ? new Date(oo.hora_fim)    : null,
              }],
            },
            // Peças: usar itens_ordem_corte se existirem, senão criar 1 peça com dados da própria ordem
            items: oldItems.length > 0 ? {
              create: oldItems.map((oi, i) => {
                const matId = materialMap.get(oi.material_id ?? 0) ?? fallbackMaterialId
                const itemProjectId = oi.obra_id ? projectMap.get(oi.obra_id) : undefined
                return {
                  tenantId,
                  description:     oi.nome_peca || `Peça ${i + 1}`,
                  filename:        oi.nome_ficheiro || '',
                  materialId:      matId,
                  thicknessMm:     parseFloat(oi.espessura) || 3,
                  quantityPlanned: parseInt(oi.quantidade)  || 1,
                  widthMm:         oi.bbox_largura_mm  ? parseFloat(oi.bbox_largura_mm) : null,
                  heightMm:        oi.bbox_altura_mm   ? parseFloat(oi.bbox_altura_mm)  : null,
                  areaM2:          oi.area_m2           ? parseFloat(oi.area_m2)         : null,
                  perimeterMm:     oi.perimetro_mm     ? parseFloat(oi.perimetro_mm)    : null,
                  notes:           oi.observacoes      || null,
                  projectId:       itemProjectId       ?? null,
                  clientFreeText:  oi.nome_cliente_avulso || null,
                  sortOrder:       i,
                }
              }),
            } : {
              // Ordem antiga tinha peça directamente no registo
              create: [{
                tenantId,
                description:     oo.nome_peca || 'Peça principal',
                filename:        oo.nome_ficheiro || '',
                materialId:      materialMap.get(oo.material_id ?? 0) ?? fallbackMaterialId,
                thicknessMm:     parseFloat(oo.espessura) || 3,
                quantityPlanned: parseInt(oo.quantidade)  || 1,
                widthMm:         oo.chapa_largura     ? parseFloat(oo.chapa_largura)    : null,
                heightMm:        oo.chapa_comprimento  ? parseFloat(oo.chapa_comprimento) : null,
                clientFreeText:  oo.nome_cliente_avulso || null,
                sortOrder:       0,
              }],
            },
          },
        })
      })

      created++
      if (created % 20 === 0) process.stdout.write(` ${created}`)
    } catch (e) {
      errors++
      console.error(`\n  ✗ ${orderNumber}: ${(e as Error).message}`)
    }
  }

  console.log(`\n\n  Resultado: ${created} criadas | ${skipped} já existiam | ${errors} erros`)
  console.log('\n══════════════════════════════')
  console.log('MIGRAÇÃO CONCLUÍDA')
  console.log(`  Clientes:      ${clientMap.size}`)
  console.log(`  Obras:         ${projectMap.size}`)
  console.log(`  Solicitadores: ${requesterMap.size}`)
  console.log(`  Materiais:     ${materialMap.size}`)
  console.log(`  Ordens:        ${created} importadas`)
  console.log('══════════════════════════════\n')

  await oldDb.end()
  await prisma.$disconnect()
}

main().catch(e => { console.error('ERRO:', e); process.exit(1) })
