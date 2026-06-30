# Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
"""
Algoritmo de nesting 2D para FABRIQ.
Shelf First-Fit Decreasing (SFFD) — rápido, adequado para peças rectangulares.

Uso:
  python3 nest.py '<json>'

Input JSON:
  {
    "pieces": [{"w": 100.0, "h": 50.0, "qty": 3, "label": "Peça A", "id": "item-uuid"}],
    "sheetW": 1500.0,
    "sheetH": 3000.0,
    "gap": 2.0,
    "previewPath": "/path/to/output.png"  // opcional
  }

Output JSON (stdout):
  {
    "ok": true,
    "sheetsNeeded": 2,
    "utilizationPct": 78.4,
    "unplacedPieces": 0,
    "piecesCount": 9,
    "piecesPerSheet": 5,
    "layout": [
      {"sheet": 0, "x": 0, "y": 0, "w": 100, "h": 50, "label": "Peça A", "id": "item-uuid"}
    ]
  }
"""

import sys
import json
import math

# ─── Algoritmo Shelf SFFD ──────────────────────────────────────────────────────

def nest(pieces_input, sheet_w, sheet_h, gap):
    """
    pieces_input: lista de dicts {w, h, qty, label, id}
    Retorna (layout, sheets_count, unplaced)
    layout: lista de {sheet, x, y, w, h, label, id}
    """
    # Expande quantidades e tenta as 2 orientações (normal + rodada 90°)
    pieces = []
    for p in pieces_input:
        w, h = float(p['w']), float(p['h'])
        for _ in range(int(p.get('qty', 1))):
            pieces.append({'w': w, 'h': h, 'label': p.get('label', ''), 'id': p.get('id', '')})

    # Ordena por altura decrescente (FFD)
    pieces.sort(key=lambda p: p['h'], reverse=True)

    layout = []
    sheets = []  # cada sheet: lista de prateleiras {y, h, filled_w}

    def new_sheet():
        sheets.append({'shelves': []})
        return len(sheets) - 1

    def place_piece(sheet_idx, p):
        """Tenta colocar peça no sheet. Retorna (x, y) ou None."""
        sh = sheets[sheet_idx]
        pw, ph = p['w'] + gap, p['h'] + gap

        # Tenta cada prateleira existente
        for shelf in sh['shelves']:
            remaining_w = sheet_w - shelf['filled_w']
            if pw <= remaining_w and ph <= shelf['h'] + 0.001:
                x = shelf['filled_w']
                y = shelf['y']
                shelf['filled_w'] += pw
                return x, y

        # Nova prateleira
        used_h = sum(s['h'] + gap for s in sh['shelves'])
        if ph <= sheet_h - used_h:
            new_shelf = {'y': used_h, 'h': p['h'], 'filled_w': pw}
            sh['shelves'].append(new_shelf)
            return 0.0, used_h

        return None  # não cabe neste sheet

    def try_place(p):
        """Tenta colocar nos sheets existentes, abre novo se necessário."""
        # Tenta orientação normal e rodada
        orientations = [(p['w'], p['h'])]
        if abs(p['w'] - p['h']) > 0.1:
            orientations.append((p['h'], p['w']))

        for ow, oh in orientations:
            pp = {**p, 'w': ow, 'h': oh}
            # Não cabe de nenhuma forma numa chapa inteira → descarta
            if ow + gap > sheet_w or oh + gap > sheet_h:
                continue
            for si in range(len(sheets)):
                pos = place_piece(si, pp)
                if pos:
                    return si, pos[0], pos[1], ow, oh

        # Abre novo sheet
        for ow, oh in orientations:
            if ow + gap > sheet_w or oh + gap > sheet_h:
                continue
            pp = {**p, 'w': ow, 'h': oh}
            si = new_sheet()
            pos = place_piece(si, pp)
            if pos:
                return si, pos[0], pos[1], ow, oh

        return None  # impossível colocar

    unplaced = 0
    for p in pieces:
        result = try_place(p)
        if result is None:
            unplaced += 1
            continue
        si, x, y, w, h = result
        layout.append({'sheet': si, 'x': round(x, 2), 'y': round(y, 2),
                        'w': w, 'h': h, 'label': p['label'], 'id': p['id']})

    return layout, len(sheets), unplaced


# ─── Preview PNG ───────────────────────────────────────────────────────────────

PALETTE = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#F97316', '#EC4899', '#14B8A6', '#6366F1',
]

def render_preview(layout, sheet_w, sheet_h, gap, sheets_count, preview_path):
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        import matplotlib.patches as mpatches

        cols = min(sheets_count, 3)
        rows = math.ceil(sheets_count / cols)
        fig_w = cols * 6
        fig_h = rows * 6 * (sheet_h / sheet_w) if sheet_w > 0 else rows * 6

        fig, axes = plt.subplots(rows, cols, figsize=(max(fig_w, 4), max(fig_h, 4)))
        fig.patch.set_facecolor('#0A0B0D')

        if sheets_count == 1:
            axes = [[axes]]
        elif rows == 1:
            axes = [axes]

        # Mapa de cores por label único
        labels = list(dict.fromkeys(p['label'] for p in layout))
        color_map = {lbl: PALETTE[i % len(PALETTE)] for i, lbl in enumerate(labels)}

        for si in range(sheets_count):
            r, c = divmod(si, cols)
            ax = axes[r][c]
            ax.set_facecolor('#111214')
            ax.set_xlim(0, sheet_w)
            ax.set_ylim(0, sheet_h)
            ax.set_aspect('equal')
            ax.set_title(f'Chapa {si + 1}', color='#EAB308', fontsize=9)
            ax.tick_params(colors='#555')
            for spine in ax.spines.values():
                spine.set_edgecolor('#333')

            # Contorno da chapa
            ax.add_patch(mpatches.Rectangle((0, 0), sheet_w, sheet_h,
                                             linewidth=1, edgecolor='#444',
                                             facecolor='none'))

            sheet_pieces = [p for p in layout if p['sheet'] == si]
            for p in sheet_pieces:
                color = color_map.get(p['label'], '#EAB308')
                ax.add_patch(mpatches.Rectangle(
                    (p['x'], p['y']), p['w'], p['h'],
                    linewidth=0.5, edgecolor='#000',
                    facecolor=color, alpha=0.85
                ))
                # Label se peça for grande o suficiente
                if p['w'] > sheet_w * 0.05 and p['h'] > sheet_h * 0.04:
                    ax.text(p['x'] + p['w'] / 2, p['y'] + p['h'] / 2,
                            p['label'][:12], ha='center', va='center',
                            fontsize=6, color='white', fontweight='bold',
                            clip_on=True)

        # Ocultar eixos vazios
        for si in range(sheets_count, rows * cols):
            r, c = divmod(si, cols)
            axes[r][c].set_visible(False)

        plt.tight_layout(pad=0.5)
        plt.savefig(preview_path, dpi=120, bbox_inches='tight',
                    facecolor='#0A0B0D')
        plt.close(fig)
        return True
    except Exception as e:
        return False


# ─── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'ok': False, 'error': 'JSON input obrigatório como argumento'}))
        sys.exit(1)

    try:
        data = json.loads(sys.argv[1])
    except Exception as e:
        print(json.dumps({'ok': False, 'error': f'JSON inválido: {e}'}))
        sys.exit(1)

    pieces = data.get('pieces', [])
    sheet_w = float(data.get('sheetW', 1500))
    sheet_h = float(data.get('sheetH', 3000))
    gap = float(data.get('gap', 2))
    preview_path = data.get('previewPath')

    if not pieces:
        print(json.dumps({'ok': False, 'error': 'Nenhuma peça fornecida'}))
        sys.exit(1)

    layout, sheets_count, unplaced = nest(pieces, sheet_w, sheet_h, gap)

    # Aproveitamento: área total das peças / área total das chapas usadas
    total_piece_area = sum(p['w'] * p['h'] for p in layout)
    total_sheet_area = sheets_count * sheet_w * sheet_h
    utilization = (total_piece_area / total_sheet_area * 100) if total_sheet_area > 0 else 0

    pieces_per_sheet = round(len(layout) / sheets_count) if sheets_count > 0 else 0

    if preview_path:
        render_preview(layout, sheet_w, sheet_h, gap, sheets_count, preview_path)

    print(json.dumps({
        'ok': True,
        'sheetsNeeded': sheets_count,
        'utilizationPct': round(utilization, 1),
        'unplacedPieces': unplaced,
        'piecesCount': len(layout) + unplaced,
        'piecesPerSheet': pieces_per_sheet,
        'layout': layout,
    }))


if __name__ == '__main__':
    main()
