# Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
"""
Processador de ficheiros DXF/DWG para FABRIQ.
Extrai dimensões (bbox, área, perímetro) e gera preview PNG.

Uso:
  python3 process_dxf.py <input_path> <preview_output_path>

Output (stdout JSON):
  { "ok": true, "areaM2": 0.123, "bboxWidthMm": 300.0, "bboxHeightMm": 200.0, "perimeterMm": 1234.5 }
  { "ok": false, "error": "mensagem de erro" }
"""

import sys
import json
import math
import os
import subprocess
import tempfile

def process_file(input_path: str, preview_path: str) -> dict:
    ext = os.path.splitext(input_path)[1].lower()

    # DWG -> DXF conversion via LibreCAD
    dxf_path = input_path
    tmp_dxf = None
    if ext == '.dwg':
        try:
            tmp_dir = tempfile.mkdtemp()
            result = subprocess.run(
                ['libreoffice', '--headless', '--infilter=AutoCAD Drawing',
                 '--convert-to', 'dxf', '--outdir', tmp_dir, input_path],
                capture_output=True, timeout=30
            )
            base = os.path.splitext(os.path.basename(input_path))[0]
            tmp_dxf = os.path.join(tmp_dir, base + '.dxf')
            if not os.path.exists(tmp_dxf):
                return {'ok': False, 'error': 'Conversão DWG→DXF falhou'}
            dxf_path = tmp_dxf
        except Exception as e:
            return {'ok': False, 'error': f'Conversão DWG: {e}'}

    try:
        import ezdxf
        from ezdxf.math import BoundingBox2d

        doc = ezdxf.readfile(dxf_path)
        msp = doc.modelspace()

        # Calcular bounding box e perímetro
        min_x = min_y = float('inf')
        max_x = max_y = float('-inf')
        perimeter_mm = 0.0

        for entity in msp:
            try:
                bbox = entity.dxf if hasattr(entity, 'dxf') else None

                if entity.dxftype() == 'LINE':
                    s = entity.dxf.start
                    e = entity.dxf.end
                    for pt in [s, e]:
                        min_x = min(min_x, pt.x); max_x = max(max_x, pt.x)
                        min_y = min(min_y, pt.y); max_y = max(max_y, pt.y)
                    perimeter_mm += math.hypot(e.x - s.x, e.y - s.y)

                elif entity.dxftype() == 'CIRCLE':
                    cx, cy = entity.dxf.center.x, entity.dxf.center.y
                    r = entity.dxf.radius
                    min_x = min(min_x, cx - r); max_x = max(max_x, cx + r)
                    min_y = min(min_y, cy - r); max_y = max(max_y, cy + r)
                    perimeter_mm += 2 * math.pi * r

                elif entity.dxftype() == 'ARC':
                    cx, cy = entity.dxf.center.x, entity.dxf.center.y
                    r = entity.dxf.radius
                    start_a = math.radians(entity.dxf.start_angle)
                    end_a   = math.radians(entity.dxf.end_angle)
                    # sample points on arc
                    n = 32
                    if end_a < start_a:
                        end_a += 2 * math.pi
                    for i in range(n + 1):
                        a = start_a + (end_a - start_a) * i / n
                        px = cx + r * math.cos(a)
                        py = cy + r * math.sin(a)
                        min_x = min(min_x, px); max_x = max(max_x, px)
                        min_y = min(min_y, py); max_y = max(max_y, py)
                    arc_len = r * abs(end_a - start_a)
                    perimeter_mm += arc_len

                elif entity.dxftype() in ('LWPOLYLINE', 'POLYLINE'):
                    pts = list(entity.get_points()) if entity.dxftype() == 'LWPOLYLINE' else []
                    if entity.dxftype() == 'POLYLINE':
                        pts = [(v.dxf.location.x, v.dxf.location.y) for v in entity.vertices]
                    for pt in pts:
                        min_x = min(min_x, pt[0]); max_x = max(max_x, pt[0])
                        min_y = min(min_y, pt[1]); max_y = max(max_y, pt[1])
                    if len(pts) > 1:
                        for i in range(len(pts) - 1):
                            dx = pts[i+1][0] - pts[i][0]
                            dy = pts[i+1][1] - pts[i][1]
                            perimeter_mm += math.hypot(dx, dy)
                        if entity.is_closed if hasattr(entity, 'is_closed') else False:
                            dx = pts[0][0] - pts[-1][0]
                            dy = pts[0][1] - pts[-1][1]
                            perimeter_mm += math.hypot(dx, dy)

                elif entity.dxftype() == 'SPLINE':
                    pts = list(entity.control_points)
                    for pt in pts:
                        min_x = min(min_x, pt.x); max_x = max(max_x, pt.x)
                        min_y = min(min_y, pt.y); max_y = max(max_y, pt.y)

                elif entity.dxftype() == 'ELLIPSE':
                    cx, cy = entity.dxf.center.x, entity.dxf.center.y
                    r_major = math.hypot(*entity.dxf.major_axis[:2])
                    r_minor = r_major * entity.dxf.ratio
                    min_x = min(min_x, cx - r_major); max_x = max(max_x, cx + r_major)
                    min_y = min(min_y, cy - r_minor); max_y = max(max_y, cy + r_minor)
                    # Ramanujan approximation
                    h = ((r_major - r_minor) / (r_major + r_minor)) ** 2
                    perimeter_mm += math.pi * (r_major + r_minor) * (1 + 3*h / (10 + math.sqrt(4 - 3*h)))

            except Exception:
                pass  # ignorar entidades com erro de geometria

        if min_x == float('inf'):
            return {'ok': False, 'error': 'Ficheiro DXF sem geometria detectável'}

        width_mm  = max_x - min_x
        height_mm = max_y - min_y
        area_m2   = (width_mm / 1000) * (height_mm / 1000)

        # Gerar preview PNG
        try:
            _generate_preview(doc, preview_path)
        except Exception as e:
            pass  # preview é opcional — não falha o processo

        result = {
            'ok': True,
            'areaM2':       round(area_m2, 6),
            'bboxWidthMm':  round(width_mm, 3),
            'bboxHeightMm': round(height_mm, 3),
            'perimeterMm':  round(perimeter_mm, 2),
        }

        return result

    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        if tmp_dxf and os.path.exists(tmp_dxf):
            os.unlink(tmp_dxf)


def _generate_preview(doc, output_path: str):
    """Gera PNG de preview usando matplotlib."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import matplotlib.patches as patches
    from matplotlib.patches import FancyArrowPatch
    import numpy as np

    fig, ax = plt.subplots(1, 1, figsize=(8, 8))
    fig.patch.set_facecolor('#0A0B0D')
    ax.set_facecolor('#0A0B0D')
    ax.set_aspect('equal')
    ax.axis('off')

    msp = doc.modelspace()
    color = '#EAB308'  # amarelo FABRIQ

    for entity in msp:
        try:
            if entity.dxftype() == 'LINE':
                s, e = entity.dxf.start, entity.dxf.end
                ax.plot([s.x, e.x], [s.y, e.y], color=color, linewidth=0.8)

            elif entity.dxftype() == 'CIRCLE':
                cx, cy = entity.dxf.center.x, entity.dxf.center.y
                r = entity.dxf.radius
                circle = plt.Circle((cx, cy), r, fill=False, edgecolor=color, linewidth=0.8)
                ax.add_patch(circle)

            elif entity.dxftype() == 'ARC':
                import math
                cx, cy = entity.dxf.center.x, entity.dxf.center.y
                r = entity.dxf.radius
                start_a = entity.dxf.start_angle
                end_a   = entity.dxf.end_angle
                if end_a < start_a:
                    end_a += 360
                theta = np.linspace(math.radians(start_a), math.radians(end_a), 64)
                xs = cx + r * np.cos(theta)
                ys = cy + r * np.sin(theta)
                ax.plot(xs, ys, color=color, linewidth=0.8)

            elif entity.dxftype() == 'LWPOLYLINE':
                pts = list(entity.get_points())
                if pts:
                    xs = [p[0] for p in pts]
                    ys = [p[1] for p in pts]
                    if entity.is_closed:
                        xs.append(xs[0]); ys.append(ys[0])
                    ax.plot(xs, ys, color=color, linewidth=0.8)

            elif entity.dxftype() == 'SPLINE':
                pts = list(entity.control_points)
                if pts:
                    xs = [p.x for p in pts]
                    ys = [p.y for p in pts]
                    ax.plot(xs, ys, color=color, linewidth=0.6, linestyle='--')

        except Exception:
            pass

    plt.tight_layout(pad=0.2)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    plt.savefig(output_path, dpi=150, bbox_inches='tight',
                facecolor='#0A0B0D', edgecolor='none')
    plt.close(fig)


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({'ok': False, 'error': 'Uso: process_dxf.py <input> <preview_output>'}))
        sys.exit(1)

    result = process_file(sys.argv[1], sys.argv[2])
    print(json.dumps(result))
    sys.exit(0 if result.get('ok') else 1)
