// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import { readFileSync } from 'fs'
import { join } from 'path'
import type { PrismaClient } from '@prisma/client'
import QRCode from 'qrcode'

const APP_URL = process.env.APP_URL ?? 'https://sistema.fabriq.pt'
const API_URL = process.env.API_URL ?? 'https://api.fabriq.pt'
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? '/var/www/fabriq/apps/api/uploads'

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtTime(secs: number | null | undefined) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const h = Math.floor(m / 60)
  const rm = m % 60
  return h > 0 ? `${h}h ${rm}min` : `${m} min`
}

function previewToBase64(previewPath: string | null | undefined): string | null {
  if (!previewPath) return null
  try {
    const full = join(UPLOADS_DIR, previewPath.replace('/uploads/', ''))
    const buf = readFileSync(full)
    return `data:image/png;base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

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
        include: {
          operator: { select: { name: true } },
          machine: { select: { name: true, type: true } },
        },
      },
      items: {
        orderBy: { sortOrder: 'asc' },
        include: {
          material: true,
          files: {
            where: { processed: true },
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
        },
      },
    },
  })

  if (!order) throw new Error('ORDER_NOT_FOUND')

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  })

  const stageTypeLabel: Record<string, string> = {
    laser_cnc: 'Corte Laser CNC',
    cnc_router: 'Router CNC',
    plasma: 'Corte Plasma',
    waterjet: 'Corte a Água',
    bending: 'Quinagem',
    guillotine: 'Guilhotina',
    welding: 'Soldadura',
    turning: 'Tornagem',
    milling: 'Fresagem',
    other: 'Outro',
  }

  const statusLabel: Record<string, string> = {
    pending: 'Pendente',
    in_progress: 'Em execução',
    completed: 'Concluída',
    cancelled: 'Cancelada',
    invoiced: 'Faturada',
  }

  const now = new Date()
  const dateStr = fmtDate(now)
  const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })

  const verifyUrl = `${APP_URL}/verificar/${order.authCode}`
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 140,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  })

  // Tempo total estimado (soma dos cuttingTime das etapas)
  const totalCuttingTimeSecs = order.stages.reduce((acc, s) => acc + (s.cuttingTime ?? 0), 0)

  // Primeira etapa laser para mostrar máquina/operador principal
  const mainStage = order.stages.find(s => s.type === 'laser_cnc') ?? order.stages[0]

  // ─── Tabela de peças (Folha 1) ────────────────────────────────────────────
  const itemsHtml = order.items.map((item, i) => {
    const file = item.files[0] ?? null
    const preview = file ? previewToBase64(file.previewPath) : null
    const dimStr = item.widthMm && item.heightMm ? `${item.widthMm} × ${item.heightMm}` : '—'
    const bboxStr = file?.bboxWidthMm && file?.bboxHeightMm
      ? `${Number(file.bboxWidthMm.toString()).toFixed(1)} × ${Number(file.bboxHeightMm!.toString()).toFixed(1)}`
      : dimStr

    return `
    <tr>
      <td style="text-align:center;font-weight:bold">${i + 1}</td>
      <td>
        <div style="font-weight:600">${item.description}</div>
        ${item.notes ? `<div style="font-size:9px;color:#64748b;margin-top:2px">${item.notes}</div>` : ''}
      </td>
      <td>${item.material.name}</td>
      <td style="text-align:center">${item.thicknessMm} mm</td>
      <td style="text-align:center">${bboxStr}</td>
      <td style="text-align:center;border:1px dashed #94a3b8;min-width:50px">&nbsp;</td>
      <td style="text-align:center;font-size:14px;font-weight:bold">${item.quantityPlanned}</td>
      <td style="text-align:center;border-bottom:1px solid #334155;min-width:40px">&nbsp;</td>
      ${preview ? `<td style="text-align:center;padding:2px"><img src="${preview}" style="width:70px;height:50px;object-fit:contain;border:1px solid #e2e8f0;border-radius:3px;print-color-adjust:exact;-webkit-print-color-adjust:exact" /></td>` : '<td style="text-align:center;color:#94a3b8;font-size:9px">—</td>'}
    </tr>`
  }).join('')

  // ─── Tabela material withdrawal (Folha 2) ────────────────────────────────
  const materialGroups = new Map<string, { name: string; thickness: number; total: number }>()
  for (const item of order.items) {
    const key = `${item.material.id}_${item.thicknessMm}`
    const existing = materialGroups.get(key)
    if (existing) {
      existing.total += item.quantityPlanned
    } else {
      materialGroups.set(key, {
        name: item.material.name,
        thickness: Number(item.thicknessMm.toString()),
        total: item.quantityPlanned,
      })
    }
  }

  const materialRowsHtml = [...materialGroups.values()].map((g, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td><strong>${g.name}</strong></td>
      <td style="text-align:center">${g.thickness} mm</td>
      <td style="text-align:center;font-weight:bold">${g.total}</td>
      <td style="text-align:center;border-bottom:1px solid #334155">&nbsp;</td>
      <td style="text-align:center;border-bottom:1px solid #334155;color:#EF4444">&nbsp;</td>
      <td style="text-align:center;border-bottom:1px solid #334155;min-width:80px">&nbsp;&nbsp;/&nbsp;&nbsp;/&nbsp;&nbsp;</td>
      <td style="border-bottom:1px solid #334155;min-width:120px">&nbsp;</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, sans-serif;
    font-size: 10.5px;
    color: #1e293b;
    background: white;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  @page { size: A4 landscape; margin: 12mm 14mm; }
  @media print {
    body { font-size: 10px; }
    .no-print { display: none !important; }
    img { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .page-break { page-break-before: always; }
  }

  /* ── Layout ─── */
  .page { padding: 0; }

  /* ── Header ─── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #0f172a;
    padding-bottom: 10px;
    margin-bottom: 12px;
  }
  .logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; }
  .logo span { color: #EAB308; }
  .logo-sub { font-size: 9px; color: #64748b; margin-top: 1px; }
  .order-info { text-align: center; flex: 1; padding: 0 20px; }
  .order-number { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
  .order-meta { font-size: 9px; color: #64748b; margin-top: 3px; font-family: monospace; }
  .order-status { display: inline-block; background: #0f172a; color: white; padding: 2px 10px; border-radius: 10px; font-size: 9px; font-weight: bold; margin-top: 4px; }
  .qr-block { text-align: right; }
  .qr-block img { width: 80px; height: 80px; display: block; margin-left: auto; border: 2px solid #e2e8f0; border-radius: 4px; }
  .qr-block .qr-label { font-size: 8px; color: #94a3b8; margin-top: 2px; text-align: center; }

  /* ── Info grid ─── */
  .info-row { display: flex; gap: 10px; margin-bottom: 10px; }
  .info-box {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 10px;
  }
  .info-box.highlight { background: #fefce8; border-color: #EAB308; }
  .info-box.dark { background: #0f172a; color: white; }
  .info-label { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; font-weight: bold; }
  .info-box.dark .info-label { color: #94a3b8; }
  .info-value { font-size: 12px; font-weight: 600; }
  .info-box.dark .info-value { color: #EAB308; }

  /* ── Section titles ─── */
  .sec-title {
    font-size: 9px;
    font-weight: bold;
    text-transform: uppercase;
    color: #64748b;
    letter-spacing: 0.7px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 3px;
    margin-bottom: 6px;
  }

  /* ── Tables ─── */
  table { width: 100%; border-collapse: collapse; }
  th {
    background: #0f172a;
    color: white;
    font-size: 8.5px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    padding: 5px 7px;
    text-align: left;
    border: 1px solid #1e293b;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  td { padding: 5px 7px; border: 1px solid #e2e8f0; vertical-align: middle; font-size: 10px; }
  tr:nth-child(even) td { background: #f8fafc; }

  /* ── Obs box ─── */
  .obs-box {
    border: 1.5px solid #EAB308;
    border-radius: 6px;
    padding: 8px 10px;
    background: #fefce8;
    min-height: 36px;
    font-size: 11px;
    font-weight: 500;
  }

  /* ── Chapa colada ─── */
  .chapa-row { display: flex; gap: 8px; margin-top: 8px; }
  .chapa-item {
    display: flex;
    align-items: center;
    gap: 5px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 5px 10px;
    font-size: 10px;
  }
  .chapa-item input[type=checkbox] { width: 14px; height: 14px; }
  .checkbox-print {
    width: 14px; height: 14px; border: 2px solid #334155; display: inline-block; border-radius: 2px; vertical-align: middle; margin-right: 4px;
  }

  /* ── Signatures ─── */
  .sig-block { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; }
  .sig-line { border-bottom: 1.5px solid #334155; margin: 20px 0 4px 0; }
  .sig-label { font-size: 8.5px; color: #64748b; text-align: center; }
  .via-badge {
    display: inline-block;
    background: #0f172a;
    color: white;
    padding: 2px 10px;
    border-radius: 10px;
    font-size: 9px;
    font-weight: bold;
    margin-bottom: 6px;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .via-badge.gray { background: #475569; }

  /* ── Footer ─── */
  .footer {
    margin-top: 10px;
    border-top: 1px solid #e2e8f0;
    padding-top: 6px;
    font-size: 8px;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
  }

  /* ── Page 2 ─── */
  .page2-header {
    border-bottom: 3px solid #475569;
    padding-bottom: 8px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .page2-title { font-size: 18px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
  .page2-subtitle { font-size: 10px; color: #64748b; margin-top: 2px; }
</style>
</head>
<body>

<!-- ════════════════════════════════════════════════════════════
     FOLHA 1 — FOLHA DE CORTE
════════════════════════════════════════════════════════════ -->
<div class="page">

  <!-- CABEÇALHO -->
  <div class="header">
    <div>
      <div class="logo">FABRIQ<span>.IA</span></div>
      <div class="logo-sub">${(tenant?.name as string) ?? 'FABRIQ'} · Sistema de Gestão de Produção</div>
    </div>
    <div class="order-info">
      <div class="order-number">${order.orderNumber}</div>
      <div class="order-meta">Cód: ${order.authCode} · Emitida: ${dateStr} às ${timeStr}</div>
      <div class="order-status">${statusLabel[order.status] ?? order.status}</div>
    </div>
    <div class="qr-block">
      <img src="${qrDataUrl}" alt="QR Code" style="print-color-adjust:exact;-webkit-print-color-adjust:exact" />
      <div class="qr-label">Verificar ordem</div>
    </div>
  </div>

  <!-- LINHA DE INFO: CLIENTE / OBRA / MÁQUINA / TEMPO -->
  <div class="info-row">
    <div class="info-box" style="flex:1.2">
      <div class="info-label">Cliente</div>
      <div class="info-value">${order.client?.name ?? '—'}</div>
    </div>
    <div class="info-box" style="flex:1.5">
      <div class="info-label">Obra</div>
      <div class="info-value">${order.project ? `${order.project.code} — ${order.project.name}` : '—'}</div>
    </div>
    ${mainStage ? `
    <div class="info-box">
      <div class="info-label">Máquina</div>
      <div class="info-value">${mainStage.machine?.name ?? '—'}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Operador</div>
      <div class="info-value">${mainStage.operator?.name ?? '—'}</div>
    </div>` : ''}
    ${totalCuttingTimeSecs > 0 ? `
    <div class="info-box dark">
      <div class="info-label">Tempo estimado</div>
      <div class="info-value">${fmtTime(totalCuttingTimeSecs)}</div>
    </div>` : ''}
    ${order.isUrgent ? `
    <div class="info-box highlight">
      <div class="info-label">Prioridade</div>
      <div class="info-value" style="color:#DC2626">⚠ URGENTE</div>
    </div>` : ''}
  </div>

  <!-- OBSERVAÇÕES -->
  <div style="margin-bottom:10px">
    <div class="sec-title">Observações da Ordem</div>
    <div class="obs-box">${order.notes ?? '&nbsp;'}</div>
    <div class="chapa-row" style="margin-top:6px">
      <div class="chapa-item">
        <span class="checkbox-print"></span>
        Colada da chapa
      </div>
      <div class="chapa-item">
        <span class="checkbox-print"></span>
        Material verificado
      </div>
      <div class="chapa-item">
        <span class="checkbox-print"></span>
        Parâmetros confirmados
      </div>
      <div class="chapa-item" style="flex:1">
        Nozzle: <span style="border-bottom:1px solid #334155;display:inline-block;min-width:60px;margin-left:4px">&nbsp;</span>
      </div>
      <div class="chapa-item" style="flex:1">
        Gás: <span style="border-bottom:1px solid #334155;display:inline-block;min-width:60px;margin-left:4px">&nbsp;</span>
      </div>
      <div class="chapa-item" style="flex:1">
        Pressão: <span style="border-bottom:1px solid #334155;display:inline-block;min-width:60px;margin-left:4px">&nbsp;</span> bar
      </div>
    </div>
  </div>

  <!-- TABELA DE PEÇAS -->
  <div style="margin-bottom:10px">
    <div class="sec-title">Itens / Peças</div>
    <table>
      <thead>
        <tr>
          <th style="width:28px">#</th>
          <th>Descrição</th>
          <th style="width:100px">Material</th>
          <th style="width:65px;text-align:center">Espessura</th>
          <th style="width:100px;text-align:center">Dimensão (mm)</th>
          <th style="width:65px;text-align:center">Tolerância (mm)</th>
          <th style="width:55px;text-align:center">Qtd. Plan.</th>
          <th style="width:55px;text-align:center">Qtd. Cortada</th>
          <th style="width:80px;text-align:center">Desenho</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
  </div>

  <!-- ASSINATURAS -->
  <div style="display:flex;gap:10px;margin-top:8px">
    <div style="flex:1">
      <div class="via-badge">VIA 1 — OPERADOR</div>
      <div class="sig-block">
        <div style="display:flex;gap:16px">
          <div style="flex:1">
            <div class="sig-line"></div>
            <div class="sig-label">Assinatura do Operador</div>
          </div>
          <div style="flex:1">
            <div class="sig-line"></div>
            <div class="sig-label">Data / Hora de início</div>
          </div>
          <div style="flex:1">
            <div class="sig-line"></div>
            <div class="sig-label">Data / Hora de conclusão</div>
          </div>
        </div>
      </div>
    </div>
    <div style="flex:1">
      <div class="via-badge gray">VIA 2 — CHEFIA / CONTROLO</div>
      <div class="sig-block">
        <div style="display:flex;gap:16px">
          <div style="flex:1">
            <div class="sig-line"></div>
            <div class="sig-label">Verificado por</div>
          </div>
          <div style="flex:1">
            <div class="sig-line"></div>
            <div class="sig-label">Data de verificação</div>
          </div>
          <div style="flex:1">
            <div class="sig-line"></div>
            <div class="sig-label">Observações de qualidade</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <span>FABRIQ.IA — Sistema de Gestão de Produção Industrial</span>
    <span>${order.orderNumber} · Pág. 1/2 · ${dateStr}</span>
  </div>
</div>

<!-- ════════════════════════════════════════════════════════════
     FOLHA 2 — RETIRADA DE MATERIAL
════════════════════════════════════════════════════════════ -->
<div class="page page-break" style="margin-top:0">

  <div class="page2-header">
    <div>
      <div class="logo" style="font-size:18px">FABRIQ<span style="color:#EAB308">.IA</span></div>
      <div class="logo-sub">${(tenant?.name as string) ?? 'FABRIQ'}</div>
    </div>
    <div style="text-align:center;flex:1">
      <div class="page2-title">Retirada de Material</div>
      <div class="page2-subtitle">${order.orderNumber} · ${order.client?.name ?? ''} · ${order.project?.name ?? ''}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#64748b">Emitida: ${dateStr}</div>
      <div style="font-size:9px;font-family:monospace;color:#94a3b8">Cód: ${order.authCode}</div>
    </div>
  </div>

  <!-- INFO RÁPIDA -->
  <div class="info-row" style="margin-bottom:12px">
    <div class="info-box">
      <div class="info-label">Ordem</div>
      <div class="info-value">${order.orderNumber}</div>
    </div>
    <div class="info-box" style="flex:1.5">
      <div class="info-label">Obra / Projeto</div>
      <div class="info-value">${order.project ? `${order.project.code} — ${order.project.name}` : '—'}</div>
    </div>
    <div class="info-box" style="flex:1.2">
      <div class="info-label">Cliente</div>
      <div class="info-value">${order.client?.name ?? '—'}</div>
    </div>
    ${mainStage?.machine ? `
    <div class="info-box">
      <div class="info-label">Máquina</div>
      <div class="info-value">${mainStage.machine.name}</div>
    </div>` : ''}
  </div>

  <!-- TABELA RETIRADA -->
  <div class="sec-title">Materiais a Retirar</div>
  <table>
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th>Material / Chapa</th>
        <th style="width:80px;text-align:center">Espessura</th>
        <th style="width:80px;text-align:center">Qtd. Prevista</th>
        <th style="width:80px;text-align:center">Qtd. Retirada</th>
        <th style="width:80px;text-align:center;color:#EF4444">Falta</th>
        <th style="width:100px;text-align:center">Data Retirada</th>
        <th style="width:150px">Assinatura</th>
      </tr>
    </thead>
    <tbody>${materialRowsHtml}</tbody>
    <tr style="background:#f1f5f9">
      <td colspan="3" style="font-weight:bold;font-size:10px;text-align:right">TOTAL PEÇAS</td>
      <td style="text-align:center;font-weight:bold;font-size:13px">${order.items.reduce((acc, i) => acc + i.quantityPlanned, 0)}</td>
      <td style="border-bottom:1px solid #334155">&nbsp;</td>
      <td style="border-bottom:1px solid #334155;color:#EF4444">&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  </table>

  <!-- OBSERVAÇÕES RETIRADA -->
  <div style="margin-top:14px;margin-bottom:14px">
    <div class="sec-title">Observações da Retirada</div>
    <div style="border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;min-height:50px;background:#f8fafc">
      &nbsp;
    </div>
  </div>

  <!-- ASSINATURAS RETIRADA -->
  <div style="display:flex;gap:14px;margin-top:10px">
    <div style="flex:1">
      <div class="via-badge" style="background:#475569">Armazém / Stock</div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Responsável pelo armazém</div>
        <div style="margin-top:8px">
          <div class="sig-line"></div>
          <div class="sig-label">Data de entrega do material</div>
        </div>
      </div>
    </div>
    <div style="flex:1">
      <div class="via-badge" style="background:#0f172a">Operador</div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Operador que retirou o material</div>
        <div style="margin-top:8px">
          <div class="sig-line"></div>
          <div class="sig-label">Data de recepção</div>
        </div>
      </div>
    </div>
    <div style="flex:1">
      <div class="via-badge" style="background:#166534;color:white">Chefia</div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Aprovado por</div>
        <div style="margin-top:8px">
          <div class="sig-line"></div>
          <div class="sig-label">Data</div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer" style="margin-top:12px">
    <span>FABRIQ.IA — Controlo de Stock e Produção</span>
    <span>${order.orderNumber} · Pág. 2/2 · ${dateStr}</span>
  </div>
</div>

</body>
</html>`
}
