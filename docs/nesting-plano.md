# FABRIQ — Módulo de Nesting e DXF/DWG

**Data:** 2026-06-29  
**Estado:** Em implementação — Fase 1

---

## Contexto

Análise do sistema NestCut em produção (`/var/www/pipesolutions/nesting/`) revelou todos os campos e fluxos do sistema de corte CNC/laser. Este documento define o plano de implementação do módulo equivalente no FABRIQ.

---

## O que o sistema antigo tinha (mapeamento completo)

### Entidade OrdemCorte → ServiceOrder (extensão)
| Campo antigo | Campo FABRIQ | Notas |
|---|---|---|
| `processos` (corte/guilhotina/quinagem) | `processes` (JSON array) | Novo campo |
| `tempo_desenho` | `drawingTimeSecs` | Novo campo |
| `colada_chapa` | `sheetBatch` | Novo campo |
| `data_corte` | `scheduledAt` | Novo campo |
| `urgente` | `isUrgent` | Novo campo |

### Entidade ItemOrdemCorte → OrderItem (extensão)
| Campo antigo | Campo FABRIQ | Estado |
|---|---|---|
| `nome_peca` | `description` | Existe |
| `quantidade` | `quantityPlanned` | Existe |
| `espessura` | `thicknessMm` | Existe |
| `area_m2` | `areaM2` | Existe |
| `bbox_largura_mm` | `widthMm` | Existe |
| `bbox_altura_mm` | `heightMm` | Existe |
| `perimetro_mm` | `perimeterMm` | **Novo** |
| `observacoes` | `notes` | **Novo** |
| `solicitador_id` | `requesterId` | **Novo** |

### Entidade FicheiroDXF → OrderFile (extensão)
| Campo antigo | Campo FABRIQ | Estado |
|---|---|---|
| `nome_original` | `originalName` | Existe |
| `caminho` | `storagePath` | Existe |
| `preview_ficheiro` | `previewPath` | Existe |
| `tamanho` | `sizeBytes` | Existe |
| `tipo` (dxf/dwg) | `fileType` | **Novo** |
| `area_m2` | `areaM2` | **Novo** |
| `bbox_largura_mm` | `bboxWidthMm` | **Novo** |
| `bbox_altura_mm` | `bboxHeightMm` | **Novo** |
| `perimetro_mm` | `perimeterMm` | **Novo** |

### Entidades novas a criar
| Entidade | Propósito |
|---|---|
| `OrderSheet` | Múltiplas chapas por ordem (material, dimensões, tipo: nossa/retalho/cliente) |
| `NestingJob` | Resultado do algoritmo de nesting (aproveitamento %, imagem PNG, chapas necessárias) |
| `OrderBatch` | Agrupamento de ordens numa sessão de produção (planeado/em execução/concluído) |

---

## Arquitectura do Processador DXF

### Stack de processamento
```
Upload DXF/DWG
    ↓
Node.js API (multer/fastify-multipart)
    ↓
Guardar ficheiro em /var/www/fabriq/uploads/dxf/{tenantId}/{uuid}.dxf
    ↓
Chamar Python processor (child_process)
    ↓ (resposta JSON)
{ areaM2, bboxWidthMm, bboxHeightMm, perimeterMm, previewPath }
    ↓
Actualizar OrderFile no DB
```

### Python processor (`/var/www/fabriq/services/dxf-processor/`)
- **Biblioteca:** `ezdxf` (mesma que o NestCut)
- **DWG → DXF:** `LibreCAD` CLI (`libreoffice --headless --convert-to dxf`)
- **Preview PNG:** renderização via `matplotlib` + `ezdxf.addons.drawing`
- **Output:** JSON com dimensões + PNG guardado em `uploads/previews/{uuid}.png`

### Editor DXF no browser (Fase 2)
- **Biblioteca:** `dxf-viewer` (Three.js/WebGL) para visualização
- **Edição:** selecção e remoção de entidades via `dxf-parser` + Fabric.js
- **Export:** reconstrução DXF limpo com entidades seleccionadas removidas
- **Casos de uso:** remover linhas de cota, marcações de dobragem, texto desnecessário

### Algoritmo de Nesting (Fase 3)
- **Biblioteca JS:** algoritmo bin-packing customizado (adaptado do NestCut Python)
- **Input:** dimensões das peças + quantidade + gap + dimensões da chapa
- **Output:** aproveitamento %, chapas necessárias, peças/chapa, imagem PNG do layout
- **Visualização:** canvas 2D com peças coloridas no FABRIQ frontend

---

## Fases de Implementação

### Fase 1 — Schema + Upload + Preview (ACTUAL)
- [x] Mapeamento do sistema antigo
- [ ] Migração do schema Prisma (novos campos e modelos)
- [ ] Endpoint de upload DXF/DWG (`POST /api/v1/orders/:id/items/:itemId/files`)
- [ ] Python processor (ezdxf) — dimensões + preview PNG
- [ ] Endpoint para servir preview (`GET /api/v1/files/:fileId/preview`)
- [ ] Frontend: drop zone de ficheiros na ordem, thumbnails com dimensões

### Fase 2 — Editor DXF no browser
- [ ] Viewer DXF (Three.js/dxf-viewer)
- [ ] Selecção e remoção de entidades
- [ ] Export DXF limpo
- [ ] Guardar versão editada na ordem

### Fase 3 — Algoritmo de Nesting
- [ ] Widget de nesting na nova ordem (dimensões + quantidade → chapas)
- [ ] Visualização bin-packing com preview PNG
- [ ] Múltiplas chapas por ordem (OrderSheet)
- [ ] Aproveitamento % por ordem

### Fase 4 — Agrupamento e Planeamento
- [ ] OrderBatch — agrupar ordens para sessão de produção
- [ ] Kanban de ordens por máquina/data
- [ ] QR Code por ordem (acesso PWA operador sem login)

---

## Campos do formulário de Nova Ordem (versão completa)

### Dados gerais
- Número (auto-gerado)
- Data solicitação (default: hoje)
- Data prevista de corte
- Urgente (toggle)
- Obra/Projecto
- Cliente
- Solicitador (quem pediu o corte)

### Chapas (múltiplas)
- Tipo: `nossa` / `retalho` / `cliente` (sem custo)
- Material (select)
- Espessura (mm)
- Largura × Comprimento (mm)
- Nº de colada/batch (rastreabilidade)

### Peças (múltiplas — dinâmico)
- Nome da peça
- Quantidade
- Espessura (mm) — por peça (pode diferir da chapa)
- Upload DXF/DWG → preview automático, extracção de área/perímetro
- Observação da peça

### Processos (checkboxes)
- Corte laser
- Guilhotina
- Quinagem / Dobragem

### Execução
- Operador
- Máquina
- Tempo de desenho/programação (HH:MM:SS)
- Colada da chapa

### Observações gerais

---

## Tolerâncias (via Parâmetros de Corte)

Tolerância não é um campo de texto livre — é uma consequência dos **parâmetros de corte** (velocidade, potência, gás). O operador consulta os parâmetros de corte (já existente em `/machines`) e a tolerância resultante vem das notas do parâmetro ("Qualidade: ±0.1mm com N2 a 15bar").

Se necessário no futuro, pode-se adicionar campo `toleranceMm` no `OrderItem`.

---

## Stack de Dependências

### API (Node.js)
```
@fastify/multipart   — upload de ficheiros
sharp                — resize de imagens (thumbnails)
```

### Python processor
```
ezdxf               — parse e render DXF
matplotlib          — geração PNG preview
pillow              — resize e optimização PNG
```

### Frontend (Next.js)
```
dxf-viewer          — viewer DXF WebGL (Fase 2)
@tarikjabiri/dxf-parser  — parse DXF no browser (Fase 2)
```
