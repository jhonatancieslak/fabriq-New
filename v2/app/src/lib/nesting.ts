// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
// Porta de app/utils/nesting_calc.py (serviço nestcut v1) — MaxRects Best Short Side
// Fit (BSSF) com rotação 90°, multi-peça, multi-chapa. Sem geração de PNG/DXF.

export interface Peca {
  id: string
  largura: number
  altura: number
  quantidade: number
  nome?: string
}

interface PecaColocada {
  id: string
  x: number
  y: number
  largura: number
  altura: number
  rotacionada: boolean
}

type FreeRect = [number, number, number, number] // x, y, w, h

function splitFreeRect(fr: FreeRect, usado: FreeRect): FreeRect[] {
  const [fx, fy, fw, fh] = fr
  const [ux, uy, uw, uh] = usado
  if (ux >= fx + fw || ux + uw <= fx || uy >= fy + fh || uy + uh <= fy) return [fr]

  const out: FreeRect[] = []
  if (ux > fx) out.push([fx, fy, ux - fx, fh])
  if (ux + uw < fx + fw) out.push([ux + uw, fy, fx + fw - (ux + uw), fh])
  if (uy > fy) out.push([fx, fy, fw, uy - fy])
  if (uy + uh < fy + fh) out.push([fx, uy + uh, fw, fy + fh - (uy + uh)])
  return out
}

function pruneFreeRects(rects: FreeRect[]): FreeRect[] {
  const valid = rects.filter((r) => r[2] > 1e-9 && r[3] > 1e-9)
  const keep = valid.map(() => true)
  for (let i = 0; i < valid.length; i++) {
    if (!keep[i]) continue
    const [ax, ay, aw, ah] = valid[i]
    for (let j = 0; j < valid.length; j++) {
      if (i === j || !keep[j]) continue
      const [bx, by, bw, bh] = valid[j]
      if (ax >= bx && ay >= by && ax + aw <= bx + bw && ay + ah <= by + bh) {
        keep[i] = false
        break
      }
    }
  }
  return valid.filter((_, i) => keep[i])
}

function maxRectsMulti(
  chapaL: number,
  chapaA: number,
  pecas: Peca[],
  margem: number,
  gap: number,
): PecaColocada[] {
  const areaL = chapaL - 2 * margem
  const areaA = chapaA - 2 * margem
  if (areaL <= 0 || areaA <= 0) return []

  type Item = { largura: number; altura: number; id: string }
  const itens: Item[] = []
  for (const p of pecas) {
    for (let i = 0; i < p.quantidade; i++) itens.push({ largura: p.largura, altura: p.altura, id: p.id })
  }
  itens.sort((a, b) => {
    const areaDiff = b.largura * b.altura - a.largura * a.altura
    if (areaDiff !== 0) return areaDiff
    return Math.max(b.largura, b.altura) - Math.max(a.largura, a.altura)
  })

  let freeRects: FreeRect[] = [[margem, margem, areaL + gap, areaA + gap]]
  const colocadas: PecaColocada[] = []

  for (const { largura: pl0, altura: ph0, id } of itens) {
    let best: { score: [number, number, number, number]; x: number; y: number; w: number; h: number; rot: boolean } | null = null

    const orientacoes: [boolean, number, number][] = [[false, pl0 + gap, ph0 + gap]]
    if (Math.abs(pl0 - ph0) > 1e-9) orientacoes.push([true, ph0 + gap, pl0 + gap])

    for (const [rot, w, h] of orientacoes) {
      for (const [fx, fy, fw, fh] of freeRects) {
        if (w <= fw && h <= fh) {
          const score: [number, number, number, number] = [Math.min(fw - w, fh - h), Math.max(fw - w, fh - h), fy, fx]
          if (best === null || compareScore(score, best.score) < 0) {
            best = { score, x: fx, y: fy, w, h, rot }
          }
        }
      }
    }

    if (best === null) continue // não coube nesta chapa

    const { x: px, y: py, w, h, rot } = best
    colocadas.push({
      id,
      x: px,
      y: py,
      largura: rot ? ph0 : pl0,
      altura: rot ? pl0 : ph0,
      rotacionada: rot,
    })

    const usado: FreeRect = [px, py, w, h]
    const novos: FreeRect[] = []
    for (const fr of freeRects) novos.push(...splitFreeRect(fr, usado))
    freeRects = pruneFreeRects(novos)
  }

  return colocadas
}

function compareScore(a: [number, number, number, number], b: [number, number, number, number]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i]
  }
  return 0
}

export interface ChapaNesting {
  pecas: PecaColocada[]
  aproveitamentoPct: number
}

export interface NestingResult {
  chapas: ChapaNesting[]
  pecasCount: number
  chapasNecessarias: number
  pecasPorChapa: number
  pecasNaoEncaixadas: number
}

/**
 * Nesting multi-peça, multi-chapa. Repete o packing com as peças que sobraram
 * até esgotar a quantidade pedida ou atingir maxChapas.
 */
export function calcularNestingMultiChapas(
  pecas: Peca[],
  chapaLargura: number,
  chapaAltura: number,
  gapMm: number = 2,
  margem: number = 5,
  maxChapas: number = 50,
): NestingResult {
  const totalPedido = pecas.reduce((s, p) => s + p.quantidade, 0)
  let restantes = pecas.filter((p) => p.quantidade > 0).map((p) => ({ ...p }))
  const chapas: ChapaNesting[] = []
  let totalColocado = 0

  while (restantes.length > 0 && chapas.length < maxChapas) {
    const colocadas = maxRectsMulti(chapaLargura, chapaAltura, restantes, margem, gapMm)
    if (colocadas.length === 0) break // nada mais cabe — evita loop infinito

    const areaChapa = chapaLargura * chapaAltura
    const areaOcupada = colocadas.reduce((s, c) => s + c.largura * c.altura, 0)
    chapas.push({
      pecas: colocadas,
      aproveitamentoPct: areaChapa > 0 ? Math.round((areaOcupada / areaChapa) * 1000) / 10 : 0,
    })
    totalColocado += colocadas.length

    const colocadasPorId = new Map<string, number>()
    for (const c of colocadas) colocadasPorId.set(c.id, (colocadasPorId.get(c.id) ?? 0) + 1)

    restantes = restantes
      .map((p) => ({ ...p, quantidade: p.quantidade - (colocadasPorId.get(p.id) ?? 0) }))
      .filter((p) => p.quantidade > 0)
  }

  return {
    chapas,
    pecasCount: totalPedido,
    chapasNecessarias: chapas.length,
    pecasPorChapa: chapas.length > 0 ? Math.round(totalColocado / chapas.length) : 0,
    pecasNaoEncaixadas: totalPedido - totalColocado,
  }
}
