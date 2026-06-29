# Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
"""
Exporta todas as entidades de um DXF para JSON consumível pelo browser.

Uso:
  python3 export_entities.py <input_dxf>

Output (stdout JSON):
  {
    "ok": true,
    "bbox": { "minX": 0, "minY": 0, "maxX": 200, "maxY": 150 },
    "entities": [
      { "handle": "1A3", "type": "LINE", "layer": "0", "color": 7, "geometry": { "x1":0,"y1":0,"x2":100,"y2":100 } },
      { "handle": "1A4", "type": "CIRCLE", "layer": "0", "color": 7, "geometry": { "cx":50,"cy":50,"r":25 } },
      ...
    ]
  }
"""

import sys
import json
import math

def export(input_path: str) -> dict:
    try:
        import ezdxf
        doc = ezdxf.readfile(input_path)
        msp = doc.modelspace()

        entities = []
        min_x = min_y = float('inf')
        max_x = max_y = float('-inf')

        def upd_bounds(x, y):
            nonlocal min_x, min_y, max_x, max_y
            min_x = min(min_x, x); max_x = max(max_x, x)
            min_y = min(min_y, y); max_y = max(max_y, y)

        for ent in msp:
            try:
                handle = ent.dxf.get('handle', '')
                layer  = ent.dxf.get('layer', '0')
                color  = ent.dxf.get('color', 7)
                t      = ent.dxftype()
                geo    = None

                if t == 'LINE':
                    s, e = ent.dxf.start, ent.dxf.end
                    geo = {'x1': s.x, 'y1': s.y, 'x2': e.x, 'y2': e.y}
                    for pt in [s, e]: upd_bounds(pt.x, pt.y)

                elif t == 'CIRCLE':
                    c, r = ent.dxf.center, ent.dxf.radius
                    geo = {'cx': c.x, 'cy': c.y, 'r': r}
                    upd_bounds(c.x - r, c.y - r); upd_bounds(c.x + r, c.y + r)

                elif t == 'ARC':
                    c, r = ent.dxf.center, ent.dxf.radius
                    sa, ea = ent.dxf.start_angle, ent.dxf.end_angle
                    geo = {'cx': c.x, 'cy': c.y, 'r': r, 'startAngle': sa, 'endAngle': ea}
                    # sample arc points for bounds
                    if ea < sa: ea += 360
                    for i in range(9):
                        a = math.radians(sa + (ea - sa) * i / 8)
                        upd_bounds(c.x + r * math.cos(a), c.y + r * math.sin(a))

                elif t == 'LWPOLYLINE':
                    pts = [{'x': p[0], 'y': p[1]} for p in ent.get_points()]
                    for p in pts: upd_bounds(p['x'], p['y'])
                    geo = {'points': pts, 'closed': bool(ent.is_closed)}

                elif t == 'POLYLINE':
                    pts = [{'x': v.dxf.location.x, 'y': v.dxf.location.y} for v in ent.vertices]
                    for p in pts: upd_bounds(p['x'], p['y'])
                    geo = {'points': pts, 'closed': False}

                elif t == 'ELLIPSE':
                    c = ent.dxf.center
                    r_maj = math.hypot(*ent.dxf.major_axis[:2])
                    ratio = ent.dxf.ratio
                    geo = {'cx': c.x, 'cy': c.y, 'rMaj': r_maj, 'ratio': ratio}
                    upd_bounds(c.x - r_maj, c.y - r_maj); upd_bounds(c.x + r_maj, c.y + r_maj)

                elif t == 'SPLINE':
                    pts = [{'x': p.x, 'y': p.y} for p in ent.control_points]
                    for p in pts: upd_bounds(p['x'], p['y'])
                    geo = {'points': pts, 'closed': False, 'isSpline': True}

                elif t == 'TEXT':
                    ip = ent.dxf.insert
                    geo = {'x': ip.x, 'y': ip.y, 'text': ent.dxf.get('text', ''), 'height': ent.dxf.get('height', 2.5)}
                    upd_bounds(ip.x, ip.y)

                elif t == 'MTEXT':
                    ip = ent.dxf.insert
                    geo = {'x': ip.x, 'y': ip.y, 'text': ent.text[:80] if hasattr(ent, 'text') else '', 'height': ent.dxf.get('char_height', 2.5)}
                    upd_bounds(ip.x, ip.y)

                elif t == 'INSERT':
                    ip = ent.dxf.insert
                    geo = {'x': ip.x, 'y': ip.y, 'blockName': ent.dxf.get('name', '')}
                    upd_bounds(ip.x, ip.y)

                elif t == 'DIMENSION':
                    dp = ent.dxf.get('defpoint', None)
                    if dp:
                        geo = {'x': dp.x, 'y': dp.y}
                        upd_bounds(dp.x, dp.y)
                    else:
                        geo = {}

                elif t == 'HATCH':
                    geo = {'isFill': True}

                elif t == 'SOLID':
                    pts = []
                    for attr in ['vtx0', 'vtx1', 'vtx2', 'vtx3']:
                        v = ent.dxf.get(attr, None)
                        if v: pts.append({'x': v.x, 'y': v.y}); upd_bounds(v.x, v.y)
                    geo = {'points': pts}

                if geo is not None:
                    entities.append({
                        'handle': handle,
                        'type':   t,
                        'layer':  layer,
                        'color':  color,
                        'geometry': geo,
                    })
            except Exception:
                pass  # ignorar entidades com erro

        if min_x == float('inf'):
            min_x = min_y = 0; max_x = max_y = 100

        return {
            'ok': True,
            'bbox': {'minX': min_x, 'minY': min_y, 'maxX': max_x, 'maxY': max_y},
            'entities': entities,
        }

    except Exception as e:
        return {'ok': False, 'error': str(e)}


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'ok': False, 'error': 'Uso: export_entities.py <input_dxf>'}))
        sys.exit(1)

    result = export(sys.argv[1])
    print(json.dumps(result))
    sys.exit(0 if result.get('ok') else 1)
