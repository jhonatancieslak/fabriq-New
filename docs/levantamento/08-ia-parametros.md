# 08 — IA de Parâmetros de Corte

> Squad: c-level-squad (CAIO Architect)

---

## O Problema

O operador recebe um material novo (ex: cobre 3mm) e não sabe os parâmetros.
Opções atuais na maioria das empresas:
1. Pergunta ao chefe → pausa produção → 15 minutos perdidos
2. Tenta por tentativa e erro → desperdício de material
3. Não corta → atraso na ordem

---

## A Solução

O FABRIQ tem uma base de parâmetros de corte integrada diretamente na PWA do operador.

**Fluxo:**
1. Operador seleciona material + espessura
2. Sistema retorna parâmetros recomendados em segundos
3. Operador testa → regista o resultado (funcionou / ajustou / falhou)
4. Feedback acumula e melhora a base de conhecimento

---

## Base de Dados de Parâmetros

### Fonte inicial
O sistema antigo tinha uma base de 90KB com parâmetros da Metalique.
Para o FABRIQ novo, vamos construir uma base própria:

**Fontes:**
- Parâmetros padrão de fabricantes de máquinas (Trumpf, Bystronic, IPG, Raytools)
- Feedback dos operadores da empresa de origem (sistema antigo)
- Feedback acumulado de todos os tenants (anonimizado)

### Materiais suportados (v1)
- Aço carbono (A36, A572)
- Aço inox (304, 316, 430)
- Alumínio (1100, 5052, 6061)
- Cobre
- Latão
- Chapa galvanizada

### Espessuras (por material)
- 0.5mm até 25mm (conforme material e potência da máquina)

### Parâmetros retornados
```
velocidade_mm_min    → ex: 4500 mm/min
potencia_percent     → ex: 85%
pressao_gas_bar      → ex: 1.2 bar
tipo_gas             → N₂ / O₂ / Ar
diametro_bico_mm     → ex: 1.5mm (nozzle)
frequencia_hz        → ex: 2000 Hz (se aplicável)
duty_cycle_percent   → ex: 60%
notas                → ex: "Aumentar pressão se rebarbas no corte"
confianca            → 0.0–1.0 (aumenta com feedback positivo)
```

---

## Sistema de Confiança (Confidence Score)

Cada parâmetro tem um score de confiança:

| Score | Significado | Exibição na PWA |
|---|---|---|
| 0.9–1.0 | Muito testado, alta confiança | ✅ Verde |
| 0.7–0.9 | Bom, alguns feedbacks | 🟡 Amarelo |
| 0.5–0.7 | Poucos dados, usar com cuidado | 🟠 Laranja |
| < 0.5 | Parâmetro inicial sem validação | 🔴 Vermelho |

**Algoritmo de update:**
- Feedback "funcionou" → score +0.05 (max 1.0)
- Feedback "ajustado" → score +0.01, registar valores reais ajustados
- Feedback "falhou" → score -0.1

---

## IA v1 — Lookup Inteligente (MVP)

Não machine learning ainda — lookup com interpolação:

```typescript
function getParams(material: MaterialType, thickness: number, machineType: MachineType) {
  // 1. Busca parâmetros exatos (material + espessura + máquina)
  const exact = await db.findExactParams(material, thickness, machineType);
  if (exact && exact.confidence > 0.7) return exact;

  // 2. Se não encontrar ou confiança baixa, interpola
  const lower = await db.findNearestBelow(material, thickness, machineType);
  const upper = await db.findNearestAbove(material, thickness, machineType);
  return interpolate(lower, upper, thickness);
}
```

---

## IA v2 — Aprendizagem Contínua (pós-MVP)

Com volume de feedbacks suficiente (>500 registos):
- Modelo de regressão simples (sklearn ou TensorFlow.js)
- Treino offline, deploy via API Python worker (BullMQ job)
- Mantém lookup como fallback

---

## Interface na PWA do Operador

```
┌────────────────────────────────┐
│  🤖 Parâmetros de Corte        │
│                                │
│  Material: [Inox 304 ▼]        │
│  Espessura: [3mm ▼]            │
│  Máquina: [Laser A - 6kW]      │
│                                │
│  [Consultar]                   │
└────────────────────────────────┘

↓ resultado ↓

┌────────────────────────────────┐
│  ✅ Parâmetros Sugeridos       │
│  Confiança: Alta (0.92)        │
│                                │
│  Velocidade:    4.200 mm/min   │
│  Potência:      82%            │
│  Gás:           N₂             │
│  Pressão:       12 bar         │
│  Bico:          1.5 mm         │
│                                │
│  📝 "Reduzir 5% velocidade     │
│  se houver rebarbas"           │
│                                │
│  [✅ Funcionou]                │
│  [⚠️ Precisei ajustar]         │
│  [❌ Não funcionou]            │
└────────────────────────────────┘
```

---

## Dados de Feedback por Tenant

Os feedbacks são:
1. Armazenados com `tenant_id` (privados ao tenant)
2. Os valores reais ajustados geram novos parâmetros específicos para aquela empresa
3. Após N validações, podem ser promovidos a parâmetros globais (anonimizados)

Isto cria um **flywheel de valor**: quanto mais empresas usam, melhor fica a IA para todos.
