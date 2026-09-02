// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
// Porta TS do algoritmo Shelf First-Fit Decreasing usado em services/dxf-processor/nest.py

export interface NestingPieceInput {
  id: string;
  label: string;
  w: number;
  h: number;
  qty: number;
}

export interface NestingLayoutItem {
  sheet: number;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  id: string;
}

export interface NestingResult {
  layout: NestingLayoutItem[];
  sheetsNeeded: number;
  utilizationPct: number;
  unplacedPieces: number;
  piecesCount: number;
}

interface Shelf {
  y: number;
  h: number;
  filledW: number;
}

interface Sheet {
  shelves: Shelf[];
}

export function nest(
  piecesInput: NestingPieceInput[],
  sheetW: number,
  sheetH: number,
  gap: number,
): NestingResult {
  const pieces: { w: number; h: number; label: string; id: string }[] = [];
  for (const p of piecesInput) {
    for (let i = 0; i < p.qty; i++) {
      pieces.push({ w: p.w, h: p.h, label: p.label, id: p.id });
    }
  }
  pieces.sort((a, b) => b.h - a.h);

  const sheets: Sheet[] = [];
  const layout: NestingLayoutItem[] = [];
  let unplaced = 0;

  const newSheet = (): number => {
    sheets.push({ shelves: [] });
    return sheets.length - 1;
  };

  const tryPlace = (sheetIdx: number, w: number, h: number): { x: number; y: number } | null => {
    const sheet = sheets[sheetIdx];
    for (const shelf of sheet.shelves) {
      if (h <= shelf.h && shelf.filledW + w + gap <= sheetW) {
        const x = shelf.filledW === 0 ? 0 : shelf.filledW + gap;
        if (x + w <= sheetW) {
          shelf.filledW = x + w;
          return { x, y: shelf.y };
        }
      }
    }
    const lastY = sheet.shelves.length === 0 ? 0 : sheet.shelves[sheet.shelves.length - 1].y + sheet.shelves[sheet.shelves.length - 1].h + gap;
    if (lastY + h <= sheetH && w <= sheetW) {
      sheet.shelves.push({ y: lastY, h, filledW: w });
      return { x: 0, y: lastY };
    }
    return null;
  };

  for (const piece of pieces) {
    let placed = false;
    for (const orientation of [
      { w: piece.w, h: piece.h },
      { w: piece.h, h: piece.w },
    ]) {
      if (orientation.w > sheetW || orientation.h > sheetH) continue;

      for (let s = 0; s < sheets.length && !placed; s++) {
        const pos = tryPlace(s, orientation.w, orientation.h);
        if (pos) {
          layout.push({ sheet: s, x: pos.x, y: pos.y, w: orientation.w, h: orientation.h, label: piece.label, id: piece.id });
          placed = true;
        }
      }
      if (placed) break;

      const s = newSheet();
      const pos = tryPlace(s, orientation.w, orientation.h);
      if (pos) {
        layout.push({ sheet: s, x: pos.x, y: pos.y, w: orientation.w, h: orientation.h, label: piece.label, id: piece.id });
        placed = true;
        break;
      }
      sheets.pop();
    }
    if (!placed) unplaced++;
  }

  const usedArea = layout.reduce((sum, l) => sum + l.w * l.h, 0);
  const totalArea = sheets.length * sheetW * sheetH;
  const utilizationPct = totalArea > 0 ? Math.round((usedArea / totalArea) * 1000) / 10 : 0;

  return {
    layout,
    sheetsNeeded: sheets.length,
    utilizationPct,
    unplacedPieces: unplaced,
    piecesCount: pieces.length,
  };
}
