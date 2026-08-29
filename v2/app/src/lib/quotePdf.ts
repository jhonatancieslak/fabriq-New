// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Client, Company, CompanySettings, Material, MaterialName, Quote, QuoteItem } from '../types/db'

interface QuotePdfInput {
  quote: Quote
  items: QuoteItem[]
  client: Client | null
  company: Company
  companySettings: CompanySettings | null
  materials: Material[]
  materialLabels: Record<MaterialName, string>
  totals: { subtotalMp: number; totalLiquido: number; totalIva: number; totalBruto: number }
  geometriaLabel: (it: QuoteItem) => string
}

export function gerarOrcamentoPdf(input: QuotePdfInput): void {
  const { quote, items, client, company, companySettings, materials, materialLabels, totals, geometriaLabel } = input
  const orientacao = companySettings?.pdf_orientacao === 'paisagem' ? 'l' : 'p'
  const doc = new jsPDF({ orientation: orientacao, unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  let y = margin

  // Cabeçalho
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(company.nome_fantasia || company.razao_social, margin, y)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`NIF: ${company.nif}`, pageWidth - margin, y - 4, { align: 'right' })
  doc.text(`Orçamento Nº ${quote.id.slice(0, 8).toUpperCase()}`, pageWidth - margin, y, { align: 'right' })
  doc.text(`Data: ${new Date(quote.created_at).toLocaleDateString('pt-PT')}`, pageWidth - margin, y + 4, { align: 'right' })

  y += 10
  doc.setDrawColor(234, 179, 8)
  doc.setLineWidth(0.8)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // Cliente
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('Cliente', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  if (client) {
    doc.text(client.empresa, margin, y)
    y += 4
    if (client.nif) {
      doc.text(`NIF: ${client.nif}`, margin, y)
      y += 4
    }
    if (client.email) {
      doc.text(client.email, margin, y)
      y += 4
    }
    if (client.endereco) {
      doc.text(client.endereco, margin, y)
      y += 4
    }
  } else {
    doc.text('Cliente não especificado', margin, y)
    y += 4
  }

  y += 4

  // Tabela de itens
  const materialName = (id: string | null) => {
    const m = materials.find((x) => x.id === id)
    return m ? materialLabels[m.nome] : '—'
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Peça', 'Material', 'Esp. (mm)', 'Qtd', 'Peso (kg)', 'Preço unit.', 'Subtotal']],
    body: items.map((it) => {
      const custoUnit = Number(it.custo_calculado) || 0
      return [
        geometriaLabel(it),
        materialName(it.material_id),
        it.espessura_mm ?? '—',
        String(it.quantidade),
        it.peso_kg ? Number(it.peso_kg).toFixed(3) : '—',
        `€${custoUnit.toFixed(2)}`,
        `€${(custoUnit * it.quantidade).toFixed(2)}`,
      ]
    }),
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    styles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: companySettings?.pdf_listras_zebradas ? { fillColor: [248, 248, 248] } : undefined,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY + 8

  const totalsX = pageWidth - margin - 60
  let ty = finalY
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text('Matéria-prima', totalsX, ty)
  doc.text(`€${totals.subtotalMp.toFixed(2)}`, pageWidth - margin, ty, { align: 'right' })
  ty += 5
  doc.text('Total líquido', totalsX, ty)
  doc.text(`€${totals.totalLiquido.toFixed(2)}`, pageWidth - margin, ty, { align: 'right' })
  ty += 5
  doc.text(`IVA (${quote.iva_pct}%)`, totalsX, ty)
  doc.text(`€${totals.totalIva.toFixed(2)}`, pageWidth - margin, ty, { align: 'right' })
  ty += 6
  doc.setDrawColor(200, 200, 200)
  doc.line(totalsX, ty - 4, pageWidth - margin, ty - 4)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('Total', totalsX, ty)
  doc.text(`€${totals.totalBruto.toFixed(2)}`, pageWidth - margin, ty, { align: 'right' })

  if (companySettings?.observacao_padrao) {
    ty += 12
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text(companySettings.observacao_padrao, margin, ty, { maxWidth: pageWidth - margin * 2 })
  }

  doc.save(`orcamento-${quote.id.slice(0, 8)}.pdf`)
}
