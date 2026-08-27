# FABRIQ v2 — Plano

> App novo, separado do fabriq atual (`apps/api` + `apps/web`, backend próprio Fastify/Postgres).
> Diretório: `/var/www/fabriq/v2` (vazio, a começar do zero).
> Concorrente directo: iCut (app.icutdev.com). Requisitos extraídos do Notion do utilizador (2026-08-26/27).

## Decisões já tomadas

- **Backend:** Supabase (Auth + Postgres + Storage). Projeto: `rzwvgwnrllaccyjmlaok.supabase.co`,
  credenciais em `v2/.env` (gitignored).
- **Deploy:** app instalável (Windows, via Tauri) + versão web, ligados ao mesmo backend Supabase.
- **Mercado: Portugal (não Brasil).** Idioma pt-PT (não pt-BR), moeda EUR, imposto IVA (não
  ICMS/ISS), identificação fiscal NIF (não CNPJ). Layout/UX inspirado no iCut, mas conteúdo e
  fiscalidade totalmente PT.
- **Licenciamento/Subscrição:** sem pagamento em dia → sistema bloqueia acesso (todas as telas,
  não só funções). Estado de subscrição verificado em cada sessão/rota.
- **Ícones dos botões:** ficheiro único com todos os ícones já existe no Drive do utilizador
  (`Gemini_Generated_Image_n5p5d6n5p5d6n5p5.jpg`, pasta "Fabriq" —
  https://drive.google.com/drive/folders/1wK4x8GBGKl0-Uazv1nhdItaXF4AwMBxL). Integrar depois de a
  app estar funcional; guardar entregáveis de volta nessa pasta do Drive quando prontos.
- **Ordem de trabalho:** focar primeiro na app (core: parâmetros, materiais, orçamentos, clientes,
  ordens de produção, nesting). Ícones e polish visual ficam para depois.

## Diferencial vs iCut

iCut só faz orçamentos. Fabriq v2 acrescenta módulo de **Ordens de Produção**:
- Gerar ordem de produção a partir de orçamento aprovado, agrupando cortes.
- Imprimir etiquetas com QR code por ordem — QR inicia/termina o processo na fábrica (chão de fábrica lê o papel impresso).
- Ordens não só de laser — também guilhotina e quinagem, cada uma com parâmetros e precificação próprios.
- Rastreio do que foi gasto (matéria-prima) por ordem.

## Módulos / Abas (paridade iCut + extras)

| Aba | Escopo |
|---|---|
| Login/Cadastro | Supabase Auth, teste grátis 4 dias sem cartão, cadastro com Razão Social/CNPJ/potência+dimensão máquina |
| Históricos | histórico de orçamentos/ordens |
| Clientes | empresa, contacto, vendedor responsável, documento, condição pagamento, preset de precificação vinculado, inatividade configurável |
| Parâmetros → Máquina | por máquina: material, espessura, gás (tipo/consumo/preço), valor hora, taxa mínima, fator penalização, Ø mín. furo, velocidades corte/vaporização, parada por furo, entrada por contorno, movimento (deslocamento, aceleração, filtro corte) |
| Parâmetros → Materiais | nome, preço/kg, peso específico (g/cm³) — Aço Carbono/Inox, Alumínio, Cobre, Bronze |
| Parâmetros → Precificação | presets nomeados (M.O./M.P./S.E. %), padrão da empresa, descontos permitidos (até 2 níveis), dobra/conformação (por batida ou por kg), custo de setup (R$/h × tempo) |
| Parâmetros → Config. Gerais | dias até cliente inativo |
| Orçamentos | importar DXF, classificação item laser/matéria-prima, desenhar peça, agrupar cortes, limpar dados |
| **Ordens de Produção** (novo, não existe no iCut) | gerar ordem a partir de orçamento, imprimir etiqueta c/ QR, guilhotina + quinagem (parâmetros/preço próprios), início/fim de processo via QR |
| **Nesting** (novo) | gerar aproveitamento de chapa a partir dos itens do orçamento/ordem — layout de peças na chapa, % de aproveitamento, ligado à ordem de produção |
| **Assinatura / Billing** (novo) | plano + estado de pagamento por empresa; sem pagamento em dia → bloqueio total de acesso (tela de bloqueio, não deixa entrar em nenhuma rota) |
| Privacidade/Config. Empresa | tema, logo, dados empresa (separado do NIF oficial), padrões de orçamento, estilo PDF (orientação/densidade/cores/caixas/zebra), planilha modelo p/ importar parâmetros em lote |

## Modelo de dados — rascunho inicial (Supabase/Postgres)

Multi-tenant por `company_id` em toda tabela (RLS do Supabase por tenant). Moeda EUR, imposto IVA
(percentagem configurável por empresa/material), identificação fiscal NIF, idioma pt-PT.

- `companies` (razão social, **nif**, potência/dimensão máquina, plano, trial_ends_at, locale='pt-PT', currency='EUR')
- `subscriptions` (company_id, plano, status: trial/active/past_due/blocked, current_period_end, provider_ref) — gate de acesso central
- `users` (Supabase Auth + role: admin/gestor/vendedor/operador)
- `machines` (nome, tipo: laser/guilhotina/quinagem)
- `machine_parameters` (machine_id, material_id, espessura, gás, consumo/preço gás, valor hora, taxa mínima, fator penalização, velocidades, movimento…)
- `materials` (nome, preço/kg, peso específico)
- `pricing_presets` (nome, mo_pct, mp_pct, se_pct, iva_pct, is_default)
- `clients` (empresa, contacto, vendedor, **nif**, endereço, condição pagamento, preset_id, inactivity tracking)
- `quotes` (orçamento: cliente, itens, preset aplicado, desconto, iva_pct aplicado, PDF gerado, moeda EUR)
- `quote_items` (peça: DXF, material, espessura, peso, tempo corte, custo)
- `nesting_jobs` (quote_id/production_order_id, chapa (dims), layout gerado, % aproveitamento, ficheiro resultado)
- `production_orders` (gerada a partir de quote, tipo: laser/guilhotina/quinagem, status, qr_code, label_printed_at)
- `production_order_items` (peças agrupadas na ordem, matéria-prima consumida)
- `company_settings` (tema, logo, estilo PDF, padrões de orçamento)

> Rascunho — ajustar depois de aplicar schema real no Supabase.

### Produção avançada (não existe no iCut — referência: modelo já validado no fabriq atual)

Analisado `apps/api/prisma/schema.prisma` do fabriq actual (produção, testado) e reforçado o v2 com o
mesmo nível de detalhe, adaptado a PT/EUR/multi-tenant:

- `production_order_stages` — uma ordem pode ter várias etapas (ex: laser → quinagem), cada uma com
  máquina, operador, status (pendente/em_curso/pausado/concluido), timestamps, tempo de corte,
  assinatura do operador.
- `production_order_files` — ficheiros DXF/DWG com geometria extraída (área, bbox, perímetro).
- `production_order_photos` — fotos tiradas durante a produção, por etapa.
- `production_order_sheets` — chapas usadas por ordem, com **número de colada** (rastreabilidade —
  feature já existe no fabriq actual, página `/coladas`).
- `nesting_jobs` — enriquecido: gap entre peças, nº de chapas necessárias, peças por chapa, peças não
  encaixadas, `layout_json` (posições), preview PNG.
- `order_batches` / `order_batch_orders` — lotes de produção agrupando várias ordens numa máquina.

### Correcção pós-análise iCut (2026-08-27)

- `materials.nome` mudado de enum fixo para **texto livre** — iCut permite materiais custom
  (ex: SAE-1020, ASTM A36), não só os 5 tipos básicos. Adicionado `espessura_mm` opcional por
  material (preço pode variar por espessura) e `is_padrao`.
- Presets de precificação (`pricing_presets`) no iCut têm, por categoria (M.O./M.P./S.E.), um
  bloco fiscal próprio (lá é ICMS/IPI/PIS-COFINS/Outras Taxas/Margem/Comissão — modelo BR). Para
  PT vamos usar: **IVA (taxa normal/intermédia/reduzida) + Outras Taxas + Margem + Comissão** por
  categoria — ajustar `pricing_presets` num próximo passo (ainda não aplicado).
- Itens de orçamento no iCut podem ser criados **sem DXF**, via forma geométrica paramétrica
  (retângulo/círculo/oblongo/elipse/triângulo/hexágono/personalizado) com furos/recortes internos —
  calcula perímetro automaticamente e mostra preview SVG da peça. `quote_items` deve suportar isto
  (geometria paramétrica), não só `dxf_url`. Ainda não aplicado.

## Fases

1. **Setup base:** projeto Supabase (schema + RLS + Auth), scaffold app (Tauri + frontend partilhado), login/cadastro com trial 4 dias.
2. **Parâmetros:** máquina, materiais, precificação, config gerais (CRUD completo, import planilha).
3. **Clientes:** CRUD + vínculo preset.
4. **Orçamentos:** import DXF, classificação, cálculo de preço (motor de precificação).
5. **Ordens de Produção (diferencial):** gerar ordem, etiquetas QR, guilhotina/quinagem, início/fim via QR.
6. **Polish:** ícones (ficheiro do Drive), PDF styling, tema claro/escuro, export.
7. **Entrega:** build instalável Windows (Tauri), guardar artefactos/exports no Drive do utilizador.

## Próximo passo

Aguardar credenciais Supabase (URL + anon key + service_role key) do utilizador para começar Fase 1.
