// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
export {};

declare global {
  interface Window {
    fabriq: {
      openDxfDwg: () => Promise<
        | { ok: true; fileName: string; content: string }
        | { ok: false; error: string }
        | null
      >;
    };
  }
}
