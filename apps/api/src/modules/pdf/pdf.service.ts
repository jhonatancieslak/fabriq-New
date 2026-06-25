// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import { randomBytes } from 'crypto'
import type { PrismaClient } from '@prisma/client'

// Gera o HTML da folha de corte — convertido para PDF via Puppeteer ou enviado como HTML
export async function generateCuttingSheetHtml(
  prisma: PrismaClient,
  orderId: string,
  tenantId: string,
): Promise<string> {
  const order = await prisma.serviceOrder.findFirst({
    where: { id: orderId, tenantId },
    include: {
      client: true,
      project: true,
      requester: true,
      stages: {
        orderBy: { stageNumber: 'asc' },
        include: { operator: { select: { name: true } }, machine: { select: { name: true, type: true } } },
      },
      items: {
        orderBy: { sortOrder: 'asc' },
        include: { material: true },
      },
    },
  })

  if (!order) throw new Error('ORDER_NOT_FOUND')

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, settings: true },
  })

  const stageTypeLabel: Record<string, string> = {
    laser_cnc: 'Corte CNC Laser',
    bending: 'Quinagem',
    guillotine: 'Guilhotina',
  }

  const statusLabel: Record<string, string> = {
    pending: 'Pendente',
    in_progress: 'Em execução',
    completed: 'Concluída',
    cancelled: 'Cancelada',
  }

  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })

  const stagesHtml = order.stages.map(s => `
    <tr>
      <td>${s.stageNumber}</td>
      <td>${stageTypeLabel[s.type] ?? s.type}</td>
      <td>${s.machine?.name ?? '—'}</td>
      <td>${s.operator?.name ?? 'Não atribuído'}</td>
      <td>${statusLabel[s.status] ?? s.status}</td>
    </tr>
  `).join('')

  const itemsHtml = order.items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.description}</td>
      <td>${item.material.name}</td>
      <td>${item.thicknessMm} mm</td>
      <td>${item.widthMm ? `${item.widthMm} × ${item.heightMm}` : '—'}</td>
      <td style="text-align:center"><strong>${item.quantityPlanned}</strong></td>
      <td style="text-align:center">___</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e40af; padding-bottom: 12px; margin-bottom: 16px; }
  .logo { font-family: Arial, sans-serif; font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; }
  .logo span { color: #EAB308; }
  .order-number { font-size: 18px; font-weight: bold; color: #1e40af; }
  .auth-code { font-size: 10px; color: #64748b; margin-top: 2px; font-family: monospace; }
  .section { margin-bottom: 14px; }
  .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 8px; letter-spacing: 0.5px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .field label { font-size: 9px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 1px; }
  .field span { font-size: 11px; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; color: #64748b; padding: 5px 8px; text-align: left; border: 1px solid #e2e8f0; }
  td { padding: 6px 8px; border: 1px solid #e2e8f0; vertical-align: middle; }
  tr:nth-child(even) td { background: #f8fafc; }
  .qr-section { display: flex; gap: 16px; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
  .qr-placeholder { width: 80px; height: 80px; border: 2px dashed #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #94a3b8; text-align: center; border-radius: 4px; flex-shrink: 0; }
  .signature-block { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }
  .signature-line { border-bottom: 1px solid #334155; margin: 24px 0 4px 0; }
  .signature-label { font-size: 9px; color: #64748b; text-align: center; }
  .via-badge { background: #1e40af; color: white; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: bold; display: inline-block; margin-bottom: 8px; }
  .footer { margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; }
  @media print { body { padding: 10px; } }
</style>
</head>
<body>

<!-- CABEÇALHO -->
<div class="header">
  <div>
    <div class="logo">FABRIQ<span>.IA</span></div>
    <div style="font-size:10px;color:#64748b;margin-top:2px">${(tenant?.name as string) ?? 'FABRIQ'}</div>
  </div>
  <div style="text-align:right">
    <div class="order-number">${order.orderNumber}</div>
    <div class="auth-code">Cód. autenticidade: ${order.authCode}</div>
    <div style="font-size:9px;color:#94a3b8;margin-top:2px">Emitida: ${dateStr} às ${timeStr}</div>
  </div>
</div>

<!-- CLIENTE & OBRA -->
<div class="section">
  <div class="section-title">Cliente e Obra</div>
  <div class="grid-2">
    <div class="field"><label>Cliente</label><span>${order.client.name}</span></div>
    <div class="field"><label>Obra</label><span>${order.project.code} — ${order.project.name}</span></div>
    ${order.requester ? `<div class="field"><label>Solicitador</label><span>${order.requester.name}</span></div>` : ''}
    ${order.notes ? `<div class="field"><label>Observações gerais</label><span>${order.notes}</span></div>` : ''}
  </div>
</div>

<!-- ETAPAS -->
<div class="section">
  <div class="section-title">Etapas de Produção</div>
  <table>
    <thead>
      <tr><th>#</th><th>Tipo</th><th>Máquina</th><th>Operador</th><th>Estado</th></tr>
    </thead>
    <tbody>${stagesHtml}</tbody>
  </table>
</div>

<!-- PEÇAS -->
<div class="section">
  <div class="section-title">Itens / Peças</div>
  <table>
    <thead>
      <tr><th>#</th><th>Descrição</th><th>Material</th><th>Espessura</th><th>Dimensão (mm)</th><th style="text-align:center">Qtd. Planeada</th><th style="text-align:center">Qtd. Cortada</th></tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>
</div>

<!-- QR CODE -->
<div class="section qr-section">
  <div class="qr-placeholder">QR CODE<br/>ACESSO<br/>OPERADOR</div>
  <div>
    <div style="font-weight:bold;margin-bottom:4px">Acesso rápido via QR Code</div>
    <div style="color:#64748b;font-size:10px;margin-bottom:4px">O operador deve digitalizar este código para iniciar o apontamento sem necessidade de login.</div>
    <div style="font-family:monospace;font-size:9px;color:#475569">Token: ${order.accessToken}</div>
  </div>
</div>

<!-- ASSINATURAS — VIA 1 (Operador) -->
<div class="section" style="margin-top:16px">
  <div class="via-badge">VIA 1 — OPERADOR</div>
  <div class="signature-block">
    <div class="grid-2">
      <div>
        <div class="signature-line"></div>
        <div class="signature-label">Assinatura do Operador</div>
      </div>
      <div>
        <div class="signature-line"></div>
        <div class="signature-label">Data e Hora de Conclusão</div>
      </div>
    </div>
  </div>
</div>

<!-- ASSINATURAS — VIA 2 (Retirada) -->
<div class="section" style="margin-top:16px">
  <div class="via-badge" style="background:#64748b">VIA 2 — RETIRADA DE MATERIAL</div>
  <div class="signature-block">
    <div class="grid-2">
      <div>
        <div class="signature-line"></div>
        <div class="signature-label">Assinatura de quem retira</div>
      </div>
      <div>
        <div class="signature-line"></div>
        <div class="signature-label">Data de retirada</div>
      </div>
    </div>
  </div>
</div>

<div class="footer">
  <span>FABRIQ.IA — Sistema de Gestão de Produção</span>
  <span>${order.orderNumber} | ${dateStr}</span>
</div>

</body>
</html>`
}
