// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
// Reset semanal da conta demo — executado toda segunda-feira às 08h00

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log(`[reset-demo] Início: ${new Date().toISOString()}`)

  const tenant = await prisma.tenant.findUnique({ where: { slug: 'demo' } })
  if (!tenant) { console.error('[reset-demo] Tenant demo não encontrado'); process.exit(1) }

  const tenantId = tenant.id

  // ── 1. Apagar dados variáveis (em ordem por dependências) ─────────────────
  await prisma.notificationLog.deleteMany({ where: { tenantId } })
  await prisma.auditLog.deleteMany({ where: { tenantId } })
  await prisma.loginAttempt.deleteMany({ where: { tenantId } })
  await prisma.blockedIp.deleteMany({ where: { tenantId } })

  // Apagar fotos físicas e registos
  const photos = await prisma.orderPhoto.findMany({
    where: { orderStage: { tenantId } },
  })
  if (photos.length > 0) {
    const { unlink } = await import('fs/promises')
    const { join } = await import('path')
    const uploadsDir = process.env.UPLOADS_DIR ?? '/var/www/fabriq/apps/api/uploads/photos'
    for (const photo of photos) {
      await unlink(join(uploadsDir, photo.storagePath)).catch(() => {})
    }
  }

  await prisma.orderPhoto.deleteMany({ where: { orderStage: { tenantId } } })
  await prisma.invoicing.deleteMany({ where: { tenantId } })
  await prisma.orderItem.deleteMany({ where: { tenantId } })
  await prisma.orderStage.deleteMany({ where: { tenantId } })
  await prisma.serviceOrder.deleteMany({ where: { tenantId } })

  // Apagar projetos/obras (criar novos depois)
  await prisma.project.deleteMany({ where: { tenantId } })

  console.log('[reset-demo] Dados variáveis apagados')

  // ── 2. Garantir clientes, máquinas, materiais e operadores ────────────────
  // Clientes
  const clientNames = ['Construções Ribeiro Lda', 'MetalPro Indústria SA', 'Estruturas Pinto & Filhos']
  const clients: Record<string, string> = {}
  for (const name of clientNames) {
    const existing = await prisma.client.findFirst({ where: { tenantId, name } })
    if (existing) {
      clients[name] = existing.id
    } else {
      const c = await prisma.client.create({ data: { tenantId, name, email: `${name.toLowerCase().replace(/\s+/g, '.')}@demo.pt` } })
      clients[name] = c.id
    }
  }

  // Máquinas
  const machinesDef = [
    { name: 'Laser Fibra A', type: 'laser_cnc' },
    { name: 'Quinadeira B',  type: 'bending' },
    { name: 'Guilhotina C',  type: 'guillotine' },
  ]
  const machines: Record<string, string> = {}
  for (const m of machinesDef) {
    const existing = await prisma.machine.findFirst({ where: { tenantId, name: m.name } })
    if (existing) {
      machines[m.name] = existing.id
    } else {
      const created = await prisma.machine.create({ data: { tenantId, name: m.name, type: m.type as never } })
      machines[m.name] = created.id
    }
  }

  // Materiais
  const materialsDef = [
    { name: 'Aço Carbono S235', type: 'steel',     costPerKg: 1.2 },
    { name: 'Inox 304',        type: 'stainless',  costPerKg: 3.8 },
    { name: 'Alumínio 5052',   type: 'aluminum',   costPerKg: 2.5 },
  ]
  const materials: Record<string, string> = {}
  for (const m of materialsDef) {
    const existing = await prisma.material.findFirst({ where: { tenantId, name: m.name } })
    if (existing) {
      materials[m.name] = existing.id
    } else {
      const created = await prisma.material.create({ data: { tenantId, name: m.name, type: m.type as never, costPerKg: m.costPerKg } })
      materials[m.name] = created.id
    }
  }

  // Operador
  let operatorId: string
  const existingOp = await prisma.operator.findFirst({ where: { tenantId, username: 'joao.silva' } })
  if (existingOp) {
    operatorId = existingOp.id
  } else {
    const { hashPassword } = await import('../shared/utils/crypto.js')
    const hash = await hashPassword('operador123')
    const op = await prisma.operator.create({
      data: { tenantId, name: 'João Silva', username: 'joao.silva', passwordHash: hash, phone: '+351910000001' },
    })
    operatorId = op.id
  }

  console.log('[reset-demo] Estrutura base verificada')

  // Admin user (necessário para createdById)
  const adminUser = await prisma.user.findFirst({ where: { tenantId, role: 'admin' } })

  // ── 3. Criar obras demo ───────────────────────────────────────────────────
  const projectsData = [
    { name: 'Estrutura Armazém Norte', code: 'OB-001', clientKey: 'Construções Ribeiro Lda' },
    { name: 'Cobertura Industrial SA',  code: 'OB-002', clientKey: 'MetalPro Indústria SA' },
    { name: 'Portões e Vedações',       code: 'OB-003', clientKey: 'Estruturas Pinto & Filhos' },
  ]
  const projects: Record<string, string> = {}
  for (const p of projectsData) {
    const proj = await prisma.project.create({
      data: { tenantId, name: p.name, code: p.code, clientId: clients[p.clientKey], createdById: adminUser?.id ?? '' },
    })
    projects[p.code] = proj.id
  }

  // ── 4. Criar ordens demo com estados variados ─────────────────────────────
  const now = new Date()
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000)
  const hoursAgo = (n: number) => new Date(now.getTime() - n * 3600000)

  const ordersToCreate = [
    // Ordem concluída — 5 dias atrás
    {
      orderNumber: 'OS-0001', status: 'completed', projectKey: 'OB-001',
      clientKey: 'Construções Ribeiro Lda', notes: 'Urgente — entrega no cliente amanhã',
      createdAt: daysAgo(5), completedAt: daysAgo(3),
      stages: [
        { type: 'laser_cnc', status: 'completed', stageNumber: 1, machineKey: 'Laser Fibra A', startedAt: daysAgo(5), completedAt: daysAgo(4) },
        { type: 'bending',   status: 'completed', stageNumber: 2, machineKey: 'Quinadeira B',  startedAt: daysAgo(4), completedAt: daysAgo(3) },
      ],
      items: [
        { description: 'Chapa lateral esquerda', thicknessMm: 3, widthMm: 1000, heightMm: 500, quantityPlanned: 4, materialKey: 'Aço Carbono S235' },
        { description: 'Chapa lateral direita',  thicknessMm: 3, widthMm: 1000, heightMm: 500, quantityPlanned: 4, materialKey: 'Aço Carbono S235' },
        { description: 'Reforço horizontal',      thicknessMm: 5, widthMm: 800,  heightMm: 80,  quantityPlanned: 8, materialKey: 'Aço Carbono S235' },
      ],
    },
    // Ordem em progresso — etapa 1 concluída, etapa 2 em curso
    {
      orderNumber: 'OS-0002', status: 'in_progress', projectKey: 'OB-002',
      clientKey: 'MetalPro Indústria SA', notes: null,
      createdAt: daysAgo(2), completedAt: null,
      stages: [
        { type: 'guillotine', status: 'completed',   stageNumber: 1, machineKey: 'Guilhotina C', startedAt: daysAgo(2), completedAt: daysAgo(1) },
        { type: 'bending',    status: 'in_progress', stageNumber: 2, machineKey: 'Quinadeira B', startedAt: hoursAgo(3), completedAt: null },
      ],
      items: [
        { description: 'Perfil U 60×30', thicknessMm: 2, widthMm: 1200, heightMm: 60, quantityPlanned: 20, materialKey: 'Inox 304' },
        { description: 'Placa de base',   thicknessMm: 4, widthMm: 200,  heightMm: 200, quantityPlanned: 10, materialKey: 'Inox 304' },
      ],
    },
    // Ordem pendente — criada hoje
    {
      orderNumber: 'OS-0003', status: 'pending', projectKey: 'OB-003',
      clientKey: 'Estruturas Pinto & Filhos', notes: 'Material em stock. Arrancar assim que possível.',
      createdAt: hoursAgo(2), completedAt: null,
      stages: [
        { type: 'laser_cnc',  status: 'pending', stageNumber: 1, machineKey: 'Laser Fibra A', startedAt: null, completedAt: null },
        { type: 'guillotine', status: 'pending', stageNumber: 2, machineKey: 'Guilhotina C',  startedAt: null, completedAt: null },
      ],
      items: [
        { description: 'Chapa portão principal', thicknessMm: 2, widthMm: 2000, heightMm: 1800, quantityPlanned: 2, materialKey: 'Alumínio 5052' },
        { description: 'Travessa superior',       thicknessMm: 3, widthMm: 2000, heightMm: 80,   quantityPlanned: 2, materialKey: 'Alumínio 5052' },
      ],
    },
    // Ordem concluída mais antiga — 10 dias
    {
      orderNumber: 'OS-0004', status: 'invoiced', projectKey: 'OB-001',
      clientKey: 'Construções Ribeiro Lda', notes: null,
      createdAt: daysAgo(10), completedAt: daysAgo(8),
      stages: [
        { type: 'laser_cnc', status: 'completed', stageNumber: 1, machineKey: 'Laser Fibra A', startedAt: daysAgo(10), completedAt: daysAgo(9) },
      ],
      items: [
        { description: 'Flange redonda ø200',  thicknessMm: 6, widthMm: 200, heightMm: 200, quantityPlanned: 6, materialKey: 'Aço Carbono S235' },
        { description: 'Tampa de inspeção',     thicknessMm: 4, widthMm: 300, heightMm: 300, quantityPlanned: 3, materialKey: 'Aço Carbono S235' },
      ],
    },
    // Ordem cancelada
    {
      orderNumber: 'OS-0005', status: 'cancelled', projectKey: 'OB-002',
      clientKey: 'MetalPro Indústria SA', notes: 'Cliente alterou projecto',
      createdAt: daysAgo(7), completedAt: null,
      stages: [
        { type: 'laser_cnc', status: 'pending', stageNumber: 1, machineKey: 'Laser Fibra A', startedAt: null, completedAt: null },
      ],
      items: [
        { description: 'Suporte mural',  thicknessMm: 3, widthMm: 400, heightMm: 200, quantityPlanned: 5, materialKey: 'Aço Carbono S235' },
      ],
    },
  ]

  let orderSeq = 1
  for (const od of ordersToCreate) {
    const authCode = `DEMO-${String(orderSeq++).padStart(4, '0')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    const accessToken = Math.random().toString(36).slice(2, 18)

    const order = await prisma.serviceOrder.create({
      data: {
        tenantId,
        orderNumber: od.orderNumber,
        status: od.status as never,
        authCode,
        accessToken,
        notes: od.notes ?? undefined,
        clientId: clients[od.clientKey],
        projectId: projects[od.projectKey],
        createdById: adminUser?.id ?? '',
        createdAt: od.createdAt,
        completedAt: od.completedAt ?? undefined,
        stages: {
          create: od.stages.map(s => ({
            tenantId,
            stageNumber: s.stageNumber,
            type: s.type as never,
            status: s.status as never,
            machineId: machines[s.machineKey],
            operatorId: s.status !== 'pending' ? operatorId : undefined,
            startedAt: s.startedAt ?? undefined,
            completedAt: s.completedAt ?? undefined,
          })),
        },
        items: {
          create: od.items.map((item, i) => ({
            tenantId,
            description: item.description,
            thicknessMm: item.thicknessMm,
            widthMm: item.widthMm,
            heightMm: item.heightMm,
            quantityPlanned: item.quantityPlanned,
            sortOrder: i,
            filename: '',
            material: { connect: { id: materials[item.materialKey] } },
          })),
        },
      },
    })

    // Invoicing para OS-0004 (faturada)
    if (od.status === 'invoiced') {
      await prisma.invoicing.create({
        data: {
          tenantId,
          serviceOrderId: order.id,
          status: 'invoiced',
          type: 'material_and_labor',
          costValue: 285.50,
          invoiceDate: daysAgo(7),
          notes: 'Fatura emitida no sistema contabilístico',
        },
      })
    }
  }

  console.log(`[reset-demo] ${ordersToCreate.length} ordens demo criadas`)
  console.log(`[reset-demo] Concluído: ${new Date().toISOString()}`)
}

main()
  .catch(e => { console.error('[reset-demo] ERRO:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
