# Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
"""
Remove entidades de um ficheiro DXF por handle e guarda versão limpa.

Uso:
  python3 clean_dxf.py <input_dxf> <output_dxf> <handle1> <handle2> ...

Output (stdout JSON):
  { "ok": true, "removed": 5, "remaining": 23 }
  { "ok": false, "error": "..." }
"""

import sys
import json
import os

def clean(input_path: str, output_path: str, handles_to_remove: set) -> dict:
    try:
        import ezdxf
        doc = ezdxf.readfile(input_path)
        msp = doc.modelspace()

        removed = 0
        to_delete = []
        for entity in msp:
            handle = entity.dxf.get('handle', None)
            if handle and handle in handles_to_remove:
                to_delete.append(entity)
                removed += 1

        for entity in to_delete:
            msp.delete_entity(entity)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        doc.saveas(output_path)

        return {
            'ok': True,
            'removed': removed,
            'remaining': len(list(msp)),
        }
    except Exception as e:
        return {'ok': False, 'error': str(e)}


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({'ok': False, 'error': 'Uso: clean_dxf.py <input> <output> [handles...]'}))
        sys.exit(1)

    input_path  = sys.argv[1]
    output_path = sys.argv[2]
    handles     = set(sys.argv[3:])

    result = clean(input_path, output_path, handles)
    print(json.dumps(result))
    sys.exit(0 if result.get('ok') else 1)
