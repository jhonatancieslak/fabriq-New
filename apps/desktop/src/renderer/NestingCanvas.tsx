// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import type { NestingResult } from '../shared/nesting';

interface Props {
  result: NestingResult;
  sheetW: number;
  sheetH: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function NestingCanvas({ result, sheetW, sheetH }: Props) {
  const sheetsCount = result.sheetsNeeded;
  const scale = 0.25;

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: 16, overflow: 'auto' }}>
      {Array.from({ length: sheetsCount }).map((_, sheetIdx) => (
        <div key={sheetIdx}>
          <div style={{ fontSize: 12, marginBottom: 4, color: '#6B7280' }}>
            Chapa {sheetIdx + 1}
          </div>
          <svg
            width={sheetW * scale}
            height={sheetH * scale}
            style={{ background: '#F9FAFB', border: '1px solid #D1D5DB' }}
          >
            {result.layout
              .filter((item) => item.sheet === sheetIdx)
              .map((item, i) => (
                <g key={i}>
                  <rect
                    x={item.x * scale}
                    y={item.y * scale}
                    width={item.w * scale}
                    height={item.h * scale}
                    fill={COLORS[i % COLORS.length]}
                    fillOpacity={0.7}
                    stroke="#111827"
                    strokeWidth={0.5}
                  />
                  <text
                    x={item.x * scale + 4}
                    y={item.y * scale + 12}
                    fontSize={9}
                    fill="#111827"
                  >
                    {item.label}
                  </text>
                </g>
              ))}
          </svg>
        </div>
      ))}
    </div>
  );
}
