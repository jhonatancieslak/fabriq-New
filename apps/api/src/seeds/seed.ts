// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../shared/utils/crypto.js'

const prisma = new PrismaClient()

async function main() {
  console.log('A iniciar seed...')

  // Tenant principal
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      name: 'MetalPro — Demo FABRIQ',
      plan: 'factory',
      subdomain: 'demo',
      settings: {
        logoUrl: null,
        primaryColor: '#EAB308',
        smtpHost: null,
        evolutionApiUrl: null,
        evolutionApiKey: null,
      },
    },
  })
  console.log(`✔ Tenant: ${tenant.name} (${tenant.slug})`)

  // Utilizador admin
  const adminHash = await hashPassword('admin123')
  const admin = await prisma.user.upsert({
    where: { id: 'seed-admin-001' },
    update: {},
    create: {
      id: 'seed-admin-001',
      tenantId: tenant.id,
      name: 'Administrador',
      email: 'admin@demo.fabriq.pt',
      passwordHash: adminHash,
      role: 'admin',
    },
  })
  console.log(`✔ Admin: ${admin.email} / admin123`)

  // Utilizador financeiro
  const finHash = await hashPassword('financeiro123')
  const financial = await prisma.user.upsert({
    where: { id: 'seed-financial-001' },
    update: {},
    create: {
      id: 'seed-financial-001',
      tenantId: tenant.id,
      name: 'Financeiro',
      email: 'financeiro@demo.fabriq.pt',
      passwordHash: finHash,
      role: 'financial',
    },
  })
  console.log(`✔ Financeiro: ${financial.email} / financeiro123`)

  // Máquinas
  const laserA = await prisma.machine.upsert({
    where: { id: 'seed-machine-001' },
    update: {},
    create: {
      id: 'seed-machine-001',
      tenantId: tenant.id,
      name: 'Laser Fibra A',
      type: 'laser_cnc',
      model: 'Raytools BM110',
      serial: 'RT-2024-001',
    },
  })
  const quinadeira = await prisma.machine.upsert({
    where: { id: 'seed-machine-002' },
    update: {},
    create: {
      id: 'seed-machine-002',
      tenantId: tenant.id,
      name: 'Quinadeira B',
      type: 'bending',
      model: 'Bystronic PR 100',
    },
  })
  const guilhotina = await prisma.machine.upsert({
    where: { id: 'seed-machine-003' },
    update: {},
    create: {
      id: 'seed-machine-003',
      tenantId: tenant.id,
      name: 'Guilhotina C',
      type: 'guillotine',
      model: 'Haco ATS 3006',
    },
  })
  console.log(`✔ Máquinas: ${laserA.name}, ${quinadeira.name}, ${guilhotina.name}`)

  // Operador
  const opHash = await hashPassword('operador123')
  const operator = await prisma.operator.upsert({
    where: { id: 'seed-operator-001' },
    update: {},
    create: {
      id: 'seed-operator-001',
      tenantId: tenant.id,
      name: 'João Silva',
      username: 'joao.silva',
      passwordHash: opHash,
      phone: '+351912345678',
      machineId: laserA.id,
    },
  })
  console.log(`✔ Operador: ${operator.username} / operador123`)

  // Materiais
  const materials = [
    { id: 'seed-mat-001', name: 'Aço Carbono S235', type: 'steel' as const },
    { id: 'seed-mat-002', name: 'Inox 304', type: 'stainless' as const },
    { id: 'seed-mat-003', name: 'Alumínio 5052', type: 'aluminum' as const },
  ]
  for (const mat of materials) {
    await prisma.material.upsert({
      where: { id: mat.id },
      update: {},
      create: { ...mat, tenantId: tenant.id },
    })
  }
  console.log(`✔ Materiais: ${materials.map(m => m.name).join(', ')}`)

  // Solicitador
  const requester = await prisma.requester.upsert({
    where: { id: 'seed-requester-001' },
    update: {},
    create: {
      id: 'seed-requester-001',
      tenantId: tenant.id,
      name: 'Carlos Ferreira',
      email: 'carlos@demo.fabriq.pt',
      phone: '+351961234567',
    },
  })
  console.log(`✔ Solicitador: ${requester.name}`)

  // Cliente
  const client = await prisma.client.upsert({
    where: { id: 'seed-client-001' },
    update: {},
    create: {
      id: 'seed-client-001',
      tenantId: tenant.id,
      name: 'Construções Ribeiro Lda',
      taxId: '500123456',
      email: 'geral@construcoesribeiro.pt',
      phone: '+351253456789',
    },
  })
  console.log(`✔ Cliente: ${client.name}`)

  // Obra
  await prisma.project.upsert({
    where: { id: 'seed-project-001' },
    update: {},
    create: {
      id: 'seed-project-001',
      tenantId: tenant.id,
      clientId: client.id,
      code: 'OB-2026-001',
      name: 'Estrutura Metálica — Armazém Braga',
      description: 'Fornecimento de peças cortadas para estrutura de armazém industrial',
      createdById: admin.id,
    },
  })
  console.log(`✔ Obra: OB-2026-001`)

  // Parâmetros IA base
  const params = [
    { materialType: 'steel' as const, thicknessMm: 1, speedMmMin: 9000, powerPercent: 60, gasPressureBar: 0.6, gasType: 'oxygen' as const, nozzleMm: 1.5 },
    { materialType: 'steel' as const, thicknessMm: 2, speedMmMin: 6000, powerPercent: 72, gasPressureBar: 0.8, gasType: 'oxygen' as const, nozzleMm: 1.5 },
    { materialType: 'steel' as const, thicknessMm: 3, speedMmMin: 4200, powerPercent: 82, gasPressureBar: 1.0, gasType: 'oxygen' as const, nozzleMm: 2.0 },
    { materialType: 'steel' as const, thicknessMm: 5, speedMmMin: 2800, powerPercent: 90, gasPressureBar: 1.2, gasType: 'oxygen' as const, nozzleMm: 2.0 },
    { materialType: 'stainless' as const, thicknessMm: 1, speedMmMin: 8000, powerPercent: 65, gasPressureBar: 12, gasType: 'nitrogen' as const, nozzleMm: 1.5 },
    { materialType: 'stainless' as const, thicknessMm: 2, speedMmMin: 5000, powerPercent: 78, gasPressureBar: 14, gasType: 'nitrogen' as const, nozzleMm: 2.0 },
    { materialType: 'stainless' as const, thicknessMm: 3, speedMmMin: 3200, powerPercent: 88, gasPressureBar: 16, gasType: 'nitrogen' as const, nozzleMm: 2.0 },
    { materialType: 'aluminum' as const, thicknessMm: 1, speedMmMin: 10000, powerPercent: 55, gasPressureBar: 8, gasType: 'nitrogen' as const, nozzleMm: 1.5 },
    { materialType: 'aluminum' as const, thicknessMm: 2, speedMmMin: 7000, powerPercent: 68, gasPressureBar: 10, gasType: 'nitrogen' as const, nozzleMm: 2.0 },
    { materialType: 'aluminum' as const, thicknessMm: 3, speedMmMin: 4500, powerPercent: 80, gasPressureBar: 12, gasType: 'nitrogen' as const, nozzleMm: 2.0 },
  ]
  for (const p of params) {
    await prisma.cuttingParam.create({
      data: { ...p, machineType: 'laser_cnc', source: 'fabriq_default', confidence: 0.85 },
    }).catch(() => { /* ignorar duplicados */ })
  }
  console.log(`✔ Parâmetros IA: ${params.length} registos`)

  console.log('\n✅ Seed concluído!')
  console.log('\n─── Credenciais de acesso ───')
  console.log(`Admin:      admin@demo.fabriq.pt   / admin123`)
  console.log(`Financeiro: financeiro@demo.fabriq.pt / financeiro123`)
  console.log(`Operador:   joao.silva (PWA)        / operador123`)
  console.log(`Tenant slug: demo`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
