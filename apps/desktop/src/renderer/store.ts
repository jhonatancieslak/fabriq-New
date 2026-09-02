// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { create } from 'zustand';
import type { NestingPieceInput, NestingResult } from '../shared/nesting';

interface FabriqState {
  sheetW: number;
  sheetH: number;
  gap: number;
  pieces: NestingPieceInput[];
  result: NestingResult | null;
  setSheet: (w: number, h: number, gap: number) => void;
  addPiece: (piece: Omit<NestingPieceInput, 'id'>) => void;
  removePiece: (id: string) => void;
  setResult: (result: NestingResult | null) => void;
}

export const useFabriqStore = create<FabriqState>((set) => ({
  sheetW: 1500,
  sheetH: 3000,
  gap: 2,
  pieces: [],
  result: null,
  setSheet: (w, h, gap) => set({ sheetW: w, sheetH: h, gap }),
  addPiece: (piece) =>
    set((state) => ({
      pieces: [...state.pieces, { ...piece, id: crypto.randomUUID() }],
    })),
  removePiece: (id) =>
    set((state) => ({ pieces: state.pieces.filter((p) => p.id !== id) })),
  setResult: (result) => set({ result }),
}));
