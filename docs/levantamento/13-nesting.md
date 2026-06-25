# 13 — Módulo de Nesting

> Análise de referência: NestCut, Lantek, CypCut Pro
> Nota: módulo de roadmap v2.0 — não bloqueia MVP

---

## O que é o Nesting

Nesting é o processo de encaixar o máximo de peças possível dentro de uma chapa,
minimizando o desperdício de material.

Exemplo: numa chapa de 3000×1500mm, encaixar 47 peças de tamanhos variados
de forma a desperdiçar menos de 8% da área.

---

## Como funciona no mercado

### NestCut (referência principal do cliente)
- Software desktop (Windows) de nesting manual e automático
- Importa DXF/DWG
- Posiciona peças com rotação (0°, 90°, 180°, arbitrária)
- Calcula área útil vs. desperdício
- Gera folha de corte com layout visual

### Lantek Expert Cut
- Software profissional (CAD/CAM integrado)
- Nesting automático por algoritmos genéticos
- Suporte a placas irregulares (retalhos)
- Integrado com ERP (Lantek iQuote)
- Custo elevado — fora do alcance das PMEs

### CypCut Pro (CypCut Laser)
- Software de controlo da máquina laser (Raytools, HSG, etc.)
- Nesting básico integrado no software da máquina
- Ficheiros `.FSM` (formato binário proprietário)
- Operador faz nesting diretamente no software da máquina

---

## Estratégia para o FABRIQ

### O que NÃO vamos fazer (v1)
- Nesting automático por IA (complexo, tempo de desenvolvimento elevado)
- Competir com Lantek ou NestCut no algoritmo de encaixe
- Substituir o software da máquina (CypCut, etc.)

### O que VAMOS fazer (integração inteligente)

**Fluxo com nesting externo:**
```
Admin cria ordem no FABRIQ
    ↓
Faz nesting no CypCut/NestCut (como já faz hoje)
    ↓
Importa o resultado para o FABRIQ:
  - Ficheiro DXF/DWG final com layout nestado
  - Ou PDF/imagem da folha de corte nestada
    ↓
FABRIQ usa esse ficheiro como preview na folha de corte
    ↓
Operador executa com base no ficheiro nestado já pronto
```

**Vantagem:** o FABRIQ não duplica o nesting — usa o que já existe.
A empresa já tem CypCut ou NestCut. O FABRIQ gere a execução, não o encaixe.

---

## Módulo de Nesting FABRIQ (v2.0)

Quando implementarmos nesting próprio, a abordagem será:

### Algoritmo: Shelf First Fit Decreasing (SFFD)
- Ordena peças por área decrescente
- Coloca em "prateleiras" horizontais dentro da chapa
- Resultado: 75-85% de eficiência (suficiente para PME)
- Complexidade baixa, resultado bom

### Melhorias futuras (v3.0)
- Bottom-Left Fill com rotação 90°
- Algoritmos genéticos (GA) para casos complexos
- Suporte a retalhos (chapas irregulares com partes já usadas)

---

## Entidades de dados para nesting (futuro)

```prisma
model Sheet {
  id           String  @id @default(uuid())
  tenantId     String
  name         String
  widthMm      Decimal
  heightMm     Decimal
  materialId   String
  thicknessMm  Decimal
  stock        Int     @default(0)
}

model NestingJob {
  id             String  @id @default(uuid())
  tenantId       String
  serviceOrderId String
  sheetId        String
  efficiency     Decimal  // % de aproveitamento
  layoutJson     Json     // posições das peças [{id, x, y, rotation}]
  previewPath    String?  // imagem gerada
  createdAt      DateTime @default(now())
}
```

---

## Leitura de ficheiros CypCut (.FSM)

O CypCut Pro guarda os ficheiros de nesting no formato `.FSM` (binário proprietário).
Análise do sistema antigo revelou que os ficheiros `.FSM` têm password ZIP.

**Para integração futura:**
- Pedir ao cliente para exportar em DXF a partir do CypCut (existe essa opção)
- Ou usar a exportação PDF do CypCut como imagem de preview
- Não tentar reverter o formato binário FSM (risco legal)

**Formatos suportados no FABRIQ:**
- `.dxf` — formato aberto, suporte nativo via `dxf-parser` (JS) ou `ezdxf` (Python worker)
- `.dwg` — via conversão ODA File Converter (open source) ou LibreCAD
- `.pdf` — aceitar como imagem de preview do nesting externo
- `.svg` — conversão simples

---

## Roadmap Nesting

| Versão | Funcionalidade |
|---|---|
| v1.0 (agora) | Upload DXF/DWG por item, preview PNG, sem nesting automático |
| v1.5 | Upload do ficheiro nestado final (DXF ou PDF) como preview da ordem |
| v2.0 | Nesting básico SFFD: colocar peças numa chapa, calcular eficiência |
| v2.5 | Gestão de stock de chapas (inventário) |
| v3.0 | Algoritmo avançado com rotação + retalhos |
