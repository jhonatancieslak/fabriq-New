# FABRIQ.IA — Estado Actual

**Última sessão:** 2026-08-31 (Sessão 33 — pipeline etapas produção, passo 1)

---

## ▶ RETOMAR AQUI (2026-08-31, sessão 33)

Análise pedida pelo utilizador: app v1 (Flask, `services/nesting`) só rastreia UMA etapa (corte
laser) via QR-token (`/t/<token>`, sem login) com fotos por ordem. v2 `/operador` era só shell
(iniciar/concluir). Objetivo: pipeline multi-etapa real — corte → quinagem/guilhotina (conforme
peça) → acabamento → finalizado, com fotos de rastreabilidade por etapa.

**Descoberta**: schema v2 já tinha `production_order_stages` + `production_order_photos`
(`supabase/003_producao_avancada.sql`, sessão 28) — só faltava a etapa lógica (`tipo` reusava
`machine_type`, que não cobre acabamento/finalizado, e é a mesma enum usada por `machines.tipo`,
não dava pra poluir).

**Passo 1 feito**: migration `supabase/008_etapas_pipeline.sql` — nova enum `etapa_producao`
(`corte, quinagem, guilhotina, acabamento, finalizado`), coluna `etapa` em
`production_order_stages` (not null, backfill a partir do `tipo` antigo), `tipo`/`machine_id` agora
opcionais (etapas de acabamento/finalizado não têm máquina), índice
`(company_id, production_order_id, etapa)`. Aplicada em produção via `sudo -u postgres psql -d
fabriq_v2` (confirmado com utilizador antes — `fabriq_v2_user` não é owner das tabelas, só
superuser altera schema). Tipos TS `EtapaProducao`, `StageStatus`, `ProductionOrderStage`,
`ProductionOrderPhoto` adicionados em `app/src/types/db.ts` (não existiam apesar da tabela SQL já
existir desde a sessão 28).

**Ainda falta** (tarde, conforme combinado): rota QR-token pública tipo v1 (`/t/<token>`) pra abrir
ordem sem login no telemóvel; UI de avançar etapa (com ramificação quinagem OU guilhotina conforme
peça) + upload foto obrigatório por etapa pra Supabase Storage (bucket ainda não existe, nem
policy, nem código de upload no frontend); ligar isso ao dashboard `/operador` já existente.
Também flagar: existe um terceiro app paralelo em `apps/web/src/app/op/*` (Next.js) com scan QR
próprio batendo API diferente — confirmar com utilizador se está morto antes de continuar
investindo no v2, pra não duplicar trabalho.

**Próximo passo**: implementar rota QR-token + UI de etapas + upload de fotos (tarde, mesma
sessão de trabalho).

**Passo 2 feito (mesma sessão, tarde)**: rastreabilidade pública via QR implementada.
- `supabase/009_rastreabilidade_publica.sql` — função `get_order_tracking(p_token text)`
  (`security definer`, grant `anon, authenticated`) busca `production_orders` por `qr_code`. Se
  `status <> 'concluido'`: devolve só status/tipo/iniciado_em (regra pedida: ordem não finalizada
  mostra só status). Se `concluido`: devolve também array de etapas (`production_order_stages`,
  join `users` pro nome do operador) com fotos aninhadas (`production_order_photos`) — array de
  fotos vazio por enquanto (upload ainda não implementado). Aplicada em produção via `sudo -u
  postgres psql -d fabriq_v2` + `NOTIFY pgrst, 'reload schema'` (PostgREST cacheia schema, precisa
  notify pra ver função nova).
- Rota pública `/t/:token` nova em `app/src/App.tsx` (fora do `RequireAuth`) → página
  `app/src/pages/Public/Tracking.tsx`: chama `supabase.rpc('get_order_tracking', {p_token: token})`
  no client, renderiza ecrã "aguardando"/"em produção" (ícone ⏳) OU rastreabilidade completa por
  etapa com fotos em grid (ícone ✅) conforme resposta.
- Confirmado: **não existe app paralelo Next.js** (`apps/web/*`) — repo é 100% Vite+React
  Router+Supabase em `app/src`. Investigação anterior sobre app paralelo estava incorreta, item
  fechado.
- `tsc -b` e `vite build` sem erros, deploy no dir `dist/` já servido por `v2.fabriq.pt` (nginx
  `try_files ... /index.html`, SPA fallback já configurado). Testado end-to-end: `curl
  /t/<qr_code real>` → 200; RPC direta via `rest/v1/rpc/get_order_tracking` devolve JSON correto
  pra ordem `em_producao` (só status básico, sem etapas — confirma comportamento certo).
**Passo 3 feito (mesma sessão)**: QR image + upload de fotos (Supabase Storage self-host).

- **Storage self-host novo**: container `supabase/storage-api:v1.11.13` (`fabriq_v2_storage`,
  porta `127.0.0.1:8092`, ficheiros em `v2/storage-data/`) adicionado ao
  `supabase/docker-compose.yml`. Config em `supabase/storage.env` (gitignored, mesmo padrão de
  `gotrue.env`/`postgrest.env`) — `ANON_KEY`/`SERVICE_KEY` mintadas com o mesmo `JWT_SECRET` já
  usado por GoTrue/PostgREST. Migrations do storage-api criaram schema `storage` (`buckets`,
  `objects`, etc) automaticamente no `fabriq_v2` já existente.
  - Bug encontrado: bucket dava sempre `relation "buckets" does not exist` mesmo com
    `search_path` certo — causa real era falta de `GRANT USAGE ON SCHEMA storage` +
    `GRANT ALL ON TABLES` pras roles `anon/authenticated/service_role` (Postgres pula
    silenciosamente schemas sem `USAGE` na resolução do `search_path`, dá erro de "relation não
    existe" em vez de "permission denied" — confunde bastante). Corrigido via grants manuais +
    `grant anon, authenticated, service_role to fabriq_v2_user` (role de conexão do storage-api
    precisa poder assumir essas roles via RLS).
  - Bucket `production-photos` criado (privado, limite 10MB). Testado upload/download/delete via
    API direta com `SERVICE_KEY` — 200 OK.
  - `supabase/010_storage_policies.sql`: RLS em `storage.objects` — `authenticated` só
    insert/select/delete na própria pasta (`{company_id}/...`, via `auth_company_id()`); `anon`
    só `select` (fotos da rastreabilidade pública precisam ser legíveis sem login).
  - Nginx (`v2.fabriq.pt`): novo `location /storage/v1/` → proxy pra `127.0.0.1:8092` (mesmo
    padrão de `/auth/v1/` e `/rest/v1/`, `supabase-js` no frontend não precisa saber que não é
    Supabase Cloud).
- `supabase/011_stage_unique_etapa.sql`: unique index `(production_order_id, etapa)` em
  `production_order_stages` — necessário pro `upsert` funcionar no fluxo de conclusão.
- **QR image**: `qrcode.react` (exibição inline) + `qrcode` (geração de etiqueta pra imprimir) em
  `OrderDetail.tsx` — QR aponta pra `https://v2.fabriq.pt/t/<qr_code>`, botão "Imprimir etiqueta"
  abre janela nova só com o QR + `window.print()`.
- **Upload de fotos no fluxo do operador**: `Operador/index.tsx` — ao "Concluir" uma ordem em
  curso, foto agora é **obrigatória** (`<input type=file capture=environment>`, botão desabilitado
  sem ficheiro). Fluxo: upsert de uma `production_order_stage` (`etapa='corte'`, `numero_etapa=1`,
  `operador_id` do utilizador logado) → upload da foto pro bucket `production-photos`
  (`{company_id}/{stage_id}/{timestamp}-{nome}`) → insert em `production_order_photos` → só depois
  marca a `production_order` como `concluido`. Isto só cobre a etapa "corte" (paridade com o
  comportamento do v1) — pipeline multi-etapa completo (quinagem/guilhotina/acabamento com
  ramificação por peça) continua pendente, é trabalho maior à parte.
- `tsc -b` + `vite build` sem erros (`@types/qrcode` adicionado como dev dep). Deploy feito
  (`dist/` servido por nginx). Confirmado `curl /t/<qr_code>` → 200 e proxy `/storage/v1/bucket`
  responde (400 sem auth, esperado).

**Passo 4 (mesma sessão) — teste end-to-end via API real** (login simulado com JWT assinado pro
utilizador `jhonatan.cieslak94@gmail.com`, mesmo `JWT_SECRET` do GoTrue, já que não tinha a
password à mão): upsert de stage autenticado → upload de foto real (PNG) pro bucket via RLS de
tenant → insert `production_order_photos` → conclusão da ordem → RPC pública `get_order_tracking`
devolveu etapa + foto correctamente. Tudo na ordem real `a8eaaf52...` (empresa do Jhonatan),
**revertida no fim pro estado original** (`em_producao`, sem stage/foto de teste) — confirmado com
o utilizador antes de reverter.

**Bug real encontrado e corrigido no teste**: `<img src>` na página pública não manda header
`Authorization` — bucket privado exige isso mesmo com policy `anon select`, por isso a imagem
dava 400 no browser (só funcionava via `curl` com header manual). Corrigido: bucket
`production-photos` mudado pra `public: true` (o flag do storage-api que habilita o endpoint
`/storage/v1/object/public/<bucket>/<path>`, sem precisar de auth header — RLS de escrita continua
a valer igual, só afecta o atalho de leitura). `Tracking.tsx` ajustado pra montar a URL completa
via esse endpoint (`photoUrl()`) em vez de usar `storage_path` cru como `src`.

**Passo 5 (mesma sessão) — pipeline multi-etapa completo em `/operador`**: decisão tomada com o
utilizador — como não existe campo no schema indicando se uma peça precisa quinagem ou guilhotina,
**o operador escolhe manualmente** (sem mudança de schema). Fluxo agora implementado em
`Operador/index.tsx`:
- "Iniciar" cria stage `corte` (`em_curso`).
- Ao concluir corte (foto obrigatória), aparecem 3 botões: **Quinagem** / **Guilhotina** / **Sem
  dobra** (vai direto pra acabamento) — cria a próxima stage conforme escolha.
- Quinagem/Guilhotina concluída (foto obrigatória) → botão único "Avançar p/ Acabamento".
- Acabamento concluído (foto obrigatória) → botão "Finalizar ordem": cria stage `finalizado`
  (sem foto, é só marcador) e marca `production_orders.status = 'concluido'`.
- Card mostra trilha de etapas já percorridas (pills verde=concluído/âmbar=em curso) e a etapa
  atual no cabeçalho fechado do card.
- Toda etapa exige foto pra concluir (exceto `finalizado`, que é instantâneo).
- Testado end-to-end via API real (JWT assinado + RLS, não é bypass) numa **ordem de teste
  dedicada** (criada e apagada só pra este teste, não mexeu em dados reais desta vez): corte →
  quinagem → acabamento → finalizado, `production_orders.status` virou `concluido`, RPC pública
  `get_order_tracking` devolveu as 4 etapas na ordem certa.
- `tsc -b` + `vite build` sem erros, deploy feito.

**Passo 6 (mesma sessão) — teste real pela UI + fix "cara de app"**: utilizador de teste ajustado
(`teste@fabriq.pt` / `Jcieslak@3202`, era `selfhost-teste@fabriq.pt`, senha trocada via
`crypt()`/pgcrypto direto no `auth.users` do GoTrue). Testado via browser automation (Claude in
Chrome, viewport mobile 390-500px): login real pela UI, `/operador`, iniciar ordem, ver etapa
"Corte" em curso com upload de foto — tudo renderiza sem overflow/quebra de layout.

Feedback do utilizador comparando com o v1: layout técnico ok, mas **v2 parecia "site", não
"app"** (login era só um card genérico, sem ícone/identidade, ao contrário do v1 que tem ícone
grande + nome do produto na tela de login, sensação de app nativo). PWA já estava correta
(`vite.config.ts` já tinha `display: standalone`, ícones `pwa-192/512/maskable`) — faltava só a
UI do login. Corrigido: `Login.tsx` ganhou bloco de ícone (quadrado âmbar 80×80 com "F", sombra)
+ nome do produto acima do card, mesmo padrão visual do v1. Rebuild + deploy, confirmado
visualmente via screenshot (precisou hard-reload — o service worker do PWA cacheia o build
anterior, `ctrl+shift+r` força buscar a versão nova).

**Passo 7 (mesma sessão) — app instalável de verdade**: bug real encontrado — `vite-plugin-pwa`
gerava `sw.js`/`manifest.webmanifest` certinho, mas **o service worker nunca era registado no
cliente** (`main.tsx` não chamava `registerSW()` do `virtual:pwa-register`, então nenhum browser
considerava o site instalável, apesar do manifest existir). Corrigido:
- `main.tsx`: `registerSW({ immediate: true })` + listener de `beforeinstallprompt` que guarda o
  evento em `window.__installPromptEvent` (Chrome só dispara esse evento uma vez, cedo — se
  ninguém escutar na hora, perde-se).
- `src/vite-env.d.ts` novo (não existia) com `/// <reference types="vite-plugin-pwa/client" />`
  pro TS reconhecer `virtual:pwa-register`.
- `useInstallPrompt` (hook) + `InstallAppBanner` (componente) novos — banner "Instala o FABRIQ
  como app" com botão que chama `prompt()` no Chrome/Android; em iOS (sem `beforeinstallprompt`)
  mostra instrução manual ("Partilhar → Adicionar ao ecrã principal"). Já não aparece se a app já
  estiver rodando em modo `standalone`. Integrado no topo do `/operador`.
- `index.html`: meta tags iOS (`apple-mobile-web-app-capable`, `apple-touch-icon`, `theme-color`)
  — sem elas o "Adicionar à Tela de Início" do Safari não pega o ícone certo nem tira a barra do
  Safari.
- **Confirmado ao vivo via browser automation**: depois do fix, Chrome disparou
  `beforeinstallprompt` de verdade e o banão "Instalar" apareceu em `/operador` — antes do fix,
  não tinha nenhum registration (`navigator.serviceWorker.getRegistrations()` vazio).

**Falta ainda**: paridade fiscal/pricing e outros itens de sessões anteriores continuam pendentes
à parte; confirmar instalação num telemóvel físico real (Android Chrome + iOS Safari), não só
Chrome desktop com viewport mobile.

---

## Sessão 32 (2026-08-31)

Fechado: dashboard nativo `/operador` + app Tauri Operador apontando pra ele; PWA
(manifest/ícones/service worker) com deploy Nginx servindo `dist/` estático em vez de proxy pro
vite dev; bug crítico corrigido (`PageLoading` sem import em 12 páginas, tela branca); e feature
grande de **custo de mão-de-obra flexível**: cálculo por máquina (perímetro × velocidade de corte +
pausas por furo → tempo × valor/hora, com taxa mínima), suporte a chapa fornecida pelo cliente
(zera M.P., mantém M.O.), discriminação M.P./M.O. configurável por empresa (toggle em
Parâmetros → Configurações Gerais) refletida em QuoteForm, totais, PDF. Migration
`supabase/007_custo_mo_flexivel.sql`. Commit `2cd8e91`, push ok.

**Testado end-to-end no browser** (tenant `selfhost-teste@fabriq.pt`, trial estendido até
30/09/2026 — estava expirado, senha resetada via `sudo -u postgres psql` porque `fabriq_v2_user`
não tem permissão direta em `auth.users`/`subscriptions`, só o superuser do Postgres): cadastrado
parâmetro de corte Laser Bystronic 1 + Aço carbono 3mm (€60/h, taxa mín €5, vel. corte 20mm/s,
parada/furo 2s); orçamento com retângulo 500×300mm/4 furos calculou M.P. €6.71 (peso × preço/kg) e
M.O. €5.00 (tempo de corte caiu abaixo da taxa mínima, aplicou o piso corretamente); tabela de itens
e totais mostraram as linhas separadas M.P./M.O. como esperado pelo toggle; "Gerar PDF" rodou sem
erro no console. Confirma que a feature da sessão 31 está funcional em produção.

**Próximo passo**: nenhuma pendência aberta — decidir próxima prioridade de roadmap com o
utilizador.

---

## Sessão 31 (2026-08-29)

**Roadmap item 6 fechado nesta sessão (commit `5422632`, push ok): scaffold + build de release do
app "Engenharia" (Tauri).** Segundo wrapper Tauri, `v2/desktop-engenharia/` — janela maior
(1360×860) carregando o dashboard completo, distinto do "Fabriq Operador" (item 4, janela compacta
para a CPU do laser). Desta vez rodou o `tauri build` de verdade (não só `cargo check`): gerou
`.deb`, `.rpm` e `.AppImage` com sucesso (74MB AppImage, 3.1MB deb/rpm — ambos ficam fora do git,
em `target/`, já coberto pelo `.gitignore` do `src-tauri`). No processo, corrigido bug de path nos
DOIS scaffolds Tauri (`desktop/` e `desktop-engenharia/`): `frontendDist` apontava para
`"../app/dist"` (relativo a `src-tauri/`) quando devia ser `"../../app/dist"` — sem isso
`tauri build` falha por não achar os web assets (só não tinha aparecido antes porque o item 4
rodou só `cargo check`, que não valida essa config).

**Bônus desta sessão**: `npm run build` do frontend estava silenciosamente quebrado há um tempo —
`tsc -b && vite build` só roda o `vite build` se o `tsc` passar, e havia 10 erros TS pré-existentes
(principalmente `<Th></Th>` sem children explícito, herdado de um padrão copiado entre páginas)
que nunca bloqueavam nada visivelmente porque ninguém checava o exit code. Corrigidos todos —
`npm run build` agora compila limpo de ponta a ponta, e o `dist/` gerado é o que os apps Tauri
empacotam.

**Wordmark**: utilizador confirmou trocar `FABRIQ.IA` (manual de marca do fabriq v1) por
`FABRIQ.pt`. v2 não tinha nenhum wordmark fixo ainda (só nome do tenant, white-label) — adicionado
`FABRIQ.pt` (".pt" em amarelo) no topo da sidebar, no login, no cadastro, e no `<title>` da página
(commit `d35815a`).

**Roadmap item 5 fechado nesta sessão (commit `c7d7f90`, push ok): import em lote de parâmetros de
corte via CSV.** `v2/app/src/lib/csvImport.ts` (parse client-side com `papaparse`, sem backend) +
bloco "Importar em lote (CSV)" em `Parametros/MachineParameters.tsx`: baixar modelo, upload,
preview linha-a-linha com validação (máquina/material resolvidos por nome contra os já cadastrados
na empresa, gás validado contra enum), confirmar → bulk insert. Testado end-to-end no browser
(4 linhas, 2 válidas + 2 com erro proposital) — funcionou corretamente. **Nota**: durante o teste um
`confirm()` nativo do botão "Remover" travou a aba do browser automation (comportamento conhecido,
não é bug do código) — os 2 registos de teste inseridos (`Laser Bystronic 1` / `Aço carbono`
3mm/5mm) ficaram no tenant `selfhost-teste`, sem impacto.

**Roadmap item 4 fechado nesta sessão (commit `add9ae2`, push ok): scaffold do app instalável
Operador do Laser (Tauri).** MVP mínimo confirmado com utilizador (não a tela completa do
operador): `v2/desktop/` — janela nativa Tauri que carrega `https://v2.fabriq.pt` diretamente
(mesmo frontend web, autenticado), sem UI nativa própria ainda. `cargo check` limpo. Instalado
nesta sessão (autorizado pelo utilizador antes, servidor partilhado): Rust/Cargo via `rustup`
(`~/.cargo`, isolado) + libs de sistema via `apt` (`libwebkit2gtk-4.1-dev`,
`libjavascriptcoregtk-4.1-dev`, `libsoup-3.0-dev`, `libssl-dev`, `build-essential`, `libxdo-dev`,
`libayatana-appindicator3-dev`, `librsvg2-dev`) — aditivas, não afetaram serviços já rodando.
**Falta para próxima sessão:** ícones próprios da marca (hoje são placeholders default do Tauri),
tela nativa do operador ("cara de app" — utilizador confirmou que não deve reaproveitar o layout
do dashboard web 1:1; listar/iniciar/concluir ordens da máquina), build de release empacotado
(`.deb`/`.AppImage`/`.msi` — não testado ainda, só `cargo check`).

**Roadmap item 3 fechado sessão 31 (commit `d64f21c`, push ok): Geração de PDF de orçamento.**
100% client-side (`jsPDF` + `jspdf-autotable`, `v2/app/src/lib/quotePdf.ts`) — v2 não tem backend
próprio (só PostgREST + frontend estático) nem serviço de storage self-hosted configurado, então
não há como gerar PDF no servidor nem persistir `pdf_url` ainda. Botão "Gerar PDF" no header do
`QuoteForm.tsx`, dispara download direto no browser. Respeita `company_settings.pdf_orientacao` /
`pdf_listras_zebradas` / `observacao_padrao` já existentes no schema. **Pendente para o futuro**: se
algum dia se configurar storage (Supabase self-hosted ou S3-compatible), trocar para upload +
`pdf_url` persistido, e usar as configs `pdf_mostrar_logo`/`pdf_densidade`/`pdf_tamanho_desenho`
ainda não lidas pelo gerador atual.

**Feito nesta sessão (commit `1521c4d`, push ok):**
- Roadmap item 2 (Módulo Nesting) fechado: algoritmo MaxRects BSSF multi-chapa portado de
  `services/nesting/app/utils/nesting_calc.py` (Python, v1) para TypeScript puro
  (`v2/app/src/lib/nesting.ts`) — decisão confirmada com utilizador: **não** chamar v1 como
  microserviço (v1 é só referência de negócio); algoritmo roda no frontend porque precisa
  funcionar offline dentro da futura app Tauri instalada na CPU da máquina laser.
- Nova tabela `sheet_models` (catálogo de tamanhos de chapa por material/empresa) — migration
  `v2/supabase/006_nesting_sheet_models.sql`, aplicada + `NOTIFY pgrst`.
- UI `/nesting` (listagem) e `/nesting/:id` (editor: escolhe orçamento aprovado + chapa manual ou
  do catálogo, calcula, mostra layout em SVG por chapa) — testado end-to-end no browser (login
  `selfhost-teste@fabriq.pt`), incluindo bug real de aspect-ratio do SVG (chapa em retrato ficava
  espremida numa caixa `maxHeight` fixa) corrigido antes do commit.
- **Rebrand emerald→amber** em toda a app v2 (12 ficheiros): utilizador reportou que o visual
  "carregado" (dark + verde) não seguia o manual de marca do fabriq v1 (`#EAB308` amarelo, texto
  preto sobre amarelo — nunca branco). Aplicado globalmente via `form.tsx`/`AppLayout.tsx`
  (componentes partilhados) + swap pontual nas páginas que tinham cor hardcoded.

**Backlog levantado pelo utilizador nesta sessão, ainda NÃO implementado — precisa de sessão de
planeamento própria antes de mexer (escopo grande, não coube misturar no meio do Nesting):**
1. **Modelo de cobrança flexível em Precificação**: hoje só soma percentuais de margem sobre
   material. Falta suportar (a) cobrar mão-de-obra (tempo de máquina) + material, (b) cliente traz
   o próprio material → cobrar só serviço/mão-de-obra, (c) orçamento com mão-de-obra e material
   discriminados separadamente vs. somados numa linha única — isso deve ser configurável, não fixo.
2. **Matéria-prima**: utilizador sente que os cálculos "não estão a bater" — não foi possível
   confirmar bug concreto nesta sessão (um teste rápido de peça 300×200×3mm em aço carbono bateu:
   1.413kg/peça × 5 = 7.065kg, valor correto), mas precisa de investigação dedicada com casos reais
   do utilizador antes de descartar.
3. **Orçamento rápido**: opção de criar orçamento sem informar dados completos do cliente (uso
   interno, não vai para o cliente).
4. **Rastreabilidade configurável por empresa**: cada cliente (tenant) tem código próprio; na
   ordem de fabrico deve haver opção de rastreabilidade completa para auditoria — mas isso precisa
   ser **configurável por empresa** (algumas exigem compliance rígido, outras não precisam).
5. **Multi-tenant customizável**: cada empresa cliente poderá ter telas e relatórios diferentes
   entre si — não é um único layout fixo para todos os tenants. Implicação de arquitetura grande
   (config por tenant armazenada onde? feature flags? templates?) — discutir antes de desenhar.
6. **App instalável (Tauri)**: confirmado que vai ter layout totalmente diferente do web, "cara de
   app" nativo — não reaproveitar 1:1 o layout do dashboard web. Ainda não scaffolded.

---

## Sessão 30 (2026-08-28 — análise gaps vs iCut + paridade fiscal Precificação)

**Contexto:** sistema é para Portugal, iCut e o fabriq v1 (`services/nesting/` etc.) servem só de
base/referência, não para copiar 1:1. Análise completa de gaps ficou registada em
`/root/.claude/plans/reflective-skipping-alpaca.md` (plano de sessão, não versionado no repo) —
reler esse ficheiro para retomar a visão geral antes de continuar.

**Feito nesta sessão (commit `5394f65`, push ok):**
- Gap #1 do roadmap (paridade fiscal PT em Precificação) fechado: `pricing_presets` ganhou
  `outras_taxas_pct` + `comissao_pct` (migration `v2/supabase/005_pricing_taxas_comissao.sql`,
  aplicada em produção via `sudo -u postgres psql -d fabriq_v2`, com `NOTIFY pgrst, 'reload
  schema'` + `docker restart fabriq_v2_rest` a seguir — obrigatório sempre após DDL manual).
  Modelo **simplificado**, decisão confirmada com utilizador: soma de margens (M.O./M.P./S.E. +
  Outras Taxas + Comissão) + IVA único editável no orçamento — **não** replicar bloco fiscal por
  categoria do iCut (isso só faz sentido no BR, onde cada categoria tem imposto diferente
  ICMS/IPI/PIS-COFINS; em PT o IVA é único).
- Confirmado: descontos (`desconto_opcao1/2_pct`), dobra/conformação (2 modos) e custo de setup já
  existiam em `company_settings` desde a sessão 28 — não precisaram de trabalho.
- `app/src/lib/pricing.ts` (`computeQuoteTotals`) e `Parametros/PricingPresets.tsx` (form + tabela)
  atualizados. `tsc --noEmit` limpo.

**Roadmap priorizado (ver plano completo para detalhe de cada item):**
1. ~~Paridade fiscal PT em Precificação~~ ✅ feito sessão 30
2. ~~Módulo Nesting~~ ✅ feito sessão 31 (algoritmo TS próprio, não reaproveitou v1 — ver retomada
   acima)
3. ~~Geração de PDF de orçamento~~ ✅ feito sessão 31 (client-side, sem storage — ver retomada acima)
4. ~~App instalável do Operador do Laser (scaffold)~~ ✅ scaffold feito sessão 31 — falta tela nativa
   própria (ver retomada acima) (Tauri + Supabase Realtime + notificação nativa) —
   depende de `machine_id` por etapa em `production_order_stages` (já existe).
5. ~~Import de planilha de parâmetros em lote~~ ✅ feito sessão 31 (CSV, ver retomada acima)
6. ~~Empacotamento Tauri do app principal (Engenharia)~~ ✅ feito sessão 31 (ver retomada acima)
7. **(próximo)** PWA — fica para o fim, confirmado pelo utilizador.

- `quote_items` (fabriq_v2, DB live + `v2/supabase/schema.sql`) ganhou `geometria jsonb` +
  `origem` ('dxf'|'parametrica') — migration `v2/supabase/003_quote_items_geometria.sql`.
  **Importante:** depois de qualquer `alter table` manual via `sudo -u postgres psql -d fabriq_v2`
  (o role do PostgREST não tem DDL), é preciso `NOTIFY pgrst, 'reload schema';` ou
  `docker restart fabriq_v2_rest` — senão a API responde "Could not find the column in the schema
  cache" mesmo com a coluna já existindo no banco.
- `pricing_presets` fiscal PT: mo_pct/mp_pct/se_pct/iva_pct desde sessão 28,
  outras_taxas_pct/comissao_pct desde sessão 30 (ver acima).
- **Módulo Parâmetros** (`v2/app/src/pages/Parametros/`) — 5 abas CRUD: Máquinas, Materiais,
  Parâmetros de Corte, Precificação, Configurações Gerais.
- **Módulo Clientes** (`v2/app/src/pages/Clientes.tsx`) — lista com pesquisa, criar/editar/remover.
- **Módulo Orçamentos** (`v2/app/src/pages/Orcamentos/`) — lista + formulário de edição
  (`/orcamentos/:id`, criado automaticamente ao clicar "Novo Orçamento"). Itens paramétricos
  (retângulo/círculo, calcula peso via `lib/pricing.ts` usando peso específico do material) ou
  ficheiro DXF (só link por agora, sem upload real). Totais calculados com preset de precificação
  (mo_pct+mp_pct+se_pct como margem sobre matéria-prima) + IVA. **Simplificação conhecida:** custo
  de máquina/tempo de corte ainda não entra no cálculo (só matéria-prima) — entra quando o módulo
  Nesting existir e machine_parameters.valor_hora_maquina puder ser usado com tempo de corte real.
- Testado end-to-end no browser (login selfhost-teste@fabriq.pt): criar cliente, criar orçamento,
  preset "Padrão", item retângulo 300×200mm aço carbono 2mm → peso 0.942kg, custo €1.79/un,
  total com IVA €11.01 — matemática conferida manualmente. Dados de teste removidos depois.
- Componentes de UI partilhados movidos de `pages/Parametros/shared.tsx` para
  `v2/app/src/components/form.tsx` (reuso entre Parâmetros/Clientes/Orçamentos).
- **Módulo Ordens de Produção** (`v2/app/src/pages/Ordens/`) — lista + criação a partir de um
  orçamento com status `aprovado` (copia `quote_items` para `production_order_items`, calculando
  `materia_prima_consumida_kg = peso_kg × quantidade`), detalhe com workflow de estado
  (aguardando/em_produção/concluído/cancelado — grava `iniciado_em`/`concluido_em`
  automaticamente), QR de rastreio (`qr_code`, gerado pelo default do schema). Testado
  end-to-end: orçamento aprovado → ordem criada → item copiado corretamente → transição de
  estado grava timestamp. **Sem folha impressa ainda** — layout de impressão fica pendente da
  consulta ao squad de produção (ver pendência abaixo).
- **Pendência de produto (não implementar ainda):** utilizador pediu pra usar
  `sistema.fabriq.pt/ordens/<id>/folha-corte` (OF Pipe Solutions) como referência de layout pro
  módulo Nesting/Ordens de Produção — mas esse layout é o modelo de auditoria específico daquele
  cliente. Antes de desenhar `sheet_models`/`label_templates` por tenant, consultar squad/
  engenheiro de produção sobre quais campos são padrão vs. customizáveis. Detalhe completo em
  memória `project_folha_corte_referencia.md`.

**Próximo passo:** Nesting (consultar squad de produção antes de desenhar
modelos de folha por cliente, ver pendência acima). Pendências à parte (Resend domínio, ícones)
seguem listadas na Sessão 28 abaixo.

---

## Sessão anterior (2026-08-27)

Dizer "continue de onde paramos" — ler isto primeiro, depois a Sessão 28 completa abaixo.

**Estado ao pausar:** tudo a funcionar, testado end-to-end. Nada pendente de erro.

- App: https://v2.fabriq.pt (login/cadastro/dashboard ok)
- Backend self-host na VPS: Postgres (`fabriq_v2`) + GoTrue (`fabriq_v2_auth`) + PostgREST
  (`fabriq_v2_rest`) — containers com `restart: unless-stopped`, sobrevivem a reboot.
- Tenant de teste: `selfhost-teste@fabriq.pt` / senha `TesteFabriq123!` / empresa "Fabriq Selfhost Lda"
  (o antigo `teste-v2@fabriq.pt` era do Supabase.com, já não existe — usar este agora).
- Dev server Vite (`v2/app`, porta 5180) **não é systemd/pm2**, roda em background solto
  (`setsid nohup … & disown`). Se cair (reboot, sessão terminal fechada), religar com:
  ```bash
  cd /var/www/fabriq/v2/app && setsid nohup npm run dev > /tmp/vite.log 2>&1 < /dev/null & disown
  ```
  Confirmar: `curl -s -o /dev/null -w "%{http_code}\n" https://v2.fabriq.pt/cadastro` deve dar `200`.
- Se os containers caírem: `cd /var/www/fabriq/v2/supabase && docker compose up -d`.

**Próximo passo combinado (ainda não começado):**
1. Ajustar `pricing_presets` para modelo fiscal PT (IVA/margem/comissão por categoria M.O./M.P./S.E.,
   em vez do ICMS/IPI/PIS-COFINS que o iCut usa — ver achados da análise do iCut mais abaixo)
2. Ajustar `quote_items` para suportar geometria paramétrica (retângulo/círculo/etc + furos), não só `dxf_url`
3. Módulo **Parâmetros** (máquina/materiais/precificação/config gerais) — CRUD real ligado à API,
   import de planilha
4. Depois: Clientes → Orçamentos → Ordens de Produção → Nesting
5. Pendente à parte: verificar domínio `fabriq.pt` no Resend (só `picagens.pt` tá verificado —
   por isso `GOTRUE_MAILER_AUTOCONFIRM=true` por agora, sem exigir confirmação real de e-mail)
6. Pendente à parte: `sheet_models` + `label_templates` por empresa (modelo de chapa e etiqueta
   custom por cliente — pedido do utilizador, aplicar junto do módulo Ordens de Produção)
7. Ícones dos botões: ficheiro no Drive do utilizador, pasta "Fabriq" — só no fim, depois da app funcional

Detalhe técnico completo de tudo o que foi feito na sessão 28 (schema, self-host, análise iCut,
correções de RLS) está na secção abaixo.

---

## Sessão 28 (2026-08-27) — Arranque FABRIQ v2 (app nova, Portugal)

- **Projeto novo e separado** do fabriq actual: `/var/www/fabriq/v2` (não confundir com o repo raiz).
  Vai virar app instalável (Tauri) + web, backend Supabase, concorrendo com o iCut mas para o
  mercado português (pt-PT, EUR, IVA, NIF) e com módulo extra de Ordens de Produção + Nesting.
- Plano completo em `docs/fabriq-v2-plano.md`.
- **Supabase:** projeto `rzwvgwnrllaccyjmlaok.supabase.co` (região eu-west-1). Schema aplicado via
  `v2/supabase/schema.sql` (14 tabelas, RLS por `company_id`, enums PT) + `v2/supabase/002_signup_rpc.sql`
  (RPC `signup_company`, security definer, cria empresa+trial 4 dias+user+preset default).
  Connection pooler correcto: `aws-1-eu-west-1.pooler.supabase.com:5432` (não `aws-0`).
- **Bug de RLS corrigido:** `auth_company_id()` fazia SELECT em `users`, e `users` tinha RLS a chamar
  a própria função → recursão infinita → 500 em qualquer query autenticada. Fix: função marcada
  `security definer`.
- **App web** (`v2/app`): Vite + React + TS + Tailwind v4 + react-router + `@supabase/supabase-js`.
  Feito: `AuthContext` (sessão, empresa, subscrição), `RequireAuth` (guarda rota + bloqueio por
  subscrição), páginas Login/Cadastro (layout iCut, trial 4 dias sem cartão), fluxo de confirmação
  de e-mail (Supabase exige confirmação — cadastro fica pendente em localStorage e só cria a
  empresa no primeiro login pós-confirmação), tela `/bloqueado`, layout com sidebar e módulos
  placeholder (Orçamentos, Ordens de Produção, Nesting, Clientes, Parâmetros, Históricos, Configurações).
- **Testado end-to-end no browser** (`v2.fabriq.pt`, site Nginx + Let's Encrypt novos): cadastro →
  confirmação de e-mail → login → dashboard → bloqueio de acesso por subscrição (`status=blocked`)
  → tela de bloqueio. Tudo a funcionar.
- Tenant de teste fica na base: `teste-v2@fabriq.pt` / empresa "Fabriq Teste Lda" — útil para
  continuar a testar os próximos módulos.
- Dev server: `v2/app`, `npm run dev` (porta 5180, `setsid nohup … & disown` para sobreviver ao
  fim do comando bash). Proxy Nginx em `/etc/nginx/sites-available/v2.fabriq.pt`.
- Credenciais em `v2/.env` (raiz, backend/scripts) e `v2/app/.env` (Vite, `VITE_` prefix) — ambos
  gitignored.
- **Análise do concorrente (iCut, app.icutdev.com)** feita ao vivo no browser (login de teste do
  utilizador). Achados que mudaram o schema:
  - Materiais são **texto livre** (ex: SAE-1020, ASTM A36), não um enum fixo de 5 tipos — corrigido
    (`materials.nome` agora text, + `espessura_mm` opcional, + `is_padrao`).
  - Presets de precificação têm bloco fiscal por categoria (M.O./M.P./S.E.) — no iCut é
    ICMS/IPI/PIS-COFINS (BR); no v2 vai ser IVA/Outras Taxas/Margem/Comissão (PT) — **ainda não
    aplicado ao schema**, é o próximo passo de correcção antes do módulo Precificação.
  - Itens de orçamento podem ser criados sem DXF, via geometria paramétrica (retângulo, círculo,
    hexágono, etc. + furos internos) com preview SVG automático — `quote_items` vai precisar de
    suportar isto além do `dxf_url`.
  - Confirmado: "Desenhar Peça" e "Banco de dados de peças" são features pagas/beta no iCut — dá
    para adiar sem prejuízo do MVP.
- **Reforço do schema de produção** — avisado pelo utilizador para não copiar o iCut (que não tem
  nada disto) e em vez disso referenciar o fabriq actual, que já tem nesting/ordens/coladas
  validados em produção (`apps/api/prisma/schema.prisma`: `OrderStage`, `OrderItem`, `OrderFile`,
  `OrderPhoto`, `OrderSheet`, `NestingJob`, `OrderBatch`). Aplicado ao v2 via
  `v2/supabase/003_producao_avancada.sql`: `production_order_stages` (etapas multi-máquina com
  operador/timestamps/assinatura), `production_order_files` (DXF com geometria extraída),
  `production_order_photos`, `production_order_sheets` (chapas + número de colada — mesma feature
  de `/coladas` do fabriq actual), `order_batches`/`order_batch_orders` (lotes de produção),
  `nesting_jobs` enriquecido (gap, chapas necessárias, peças/chapa, layout_json, preview).
  `v2/supabase/004_materiais_texto_livre.sql` aplicado também. Schema agora com 20 tabelas.
- **Migração de Supabase.com → Postgres self-host na VPS.** Decisão do utilizador: cada tenant
  isolado por RLS (não banco físico separado — inviável a esta escala), e infra na própria VPS em
  vez de Supabase.com (evita free-tier pausar após 7 dias; full self-host da stack completa
  descartado por falta de RAM livre — só 767MB livres, swap quase cheia no momento da decisão).
  Montada stack **mínima**: Postgres (nova database `fabriq_v2` no cluster PG16 já existente,
  não container novo) + GoTrue (Auth) + PostgREST (REST), sem Kong/Storage/Realtime/Studio.
  - Roles Postgres: `anon`, `authenticated`, `service_role` (bypassrls), `authenticator`.
  - Schema `auth` + funções `auth.uid()/email()/role()` — GoTrue cria as suas próprias no boot
    (tive de apagar as minhas primeiro e passar ownership do schema `auth` para `fabriq_v2_user`,
    senão dava "must be owner of function uid").
  - Containers Docker (`v2/supabase/docker-compose.yml`, `gotrue.env`, `postgrest.env` — todos
    gitignored) com `network_mode: host` mas bind explícito em `127.0.0.1` (GoTrue porta 9999,
    PostgREST porta 8091) — isolamento sem tocar em firewall/iptables do servidor.
  - Nginx (`v2.fabriq.pt`) ganhou `/auth/v1/` → GoTrue e `/rest/v1/` → PostgREST, replicando a
    forma da API do Supabase Cloud — o `supabase-js` no frontend não mudou nada de código, só o
    `.env` (`VITE_SUPABASE_URL=https://v2.fabriq.pt` + chave `anon` mintada localmente, JWT HS256
    assinado com o mesmo secret do GoTrue).
  - **SMTP:** reaproveitada a chave Resend do fabriq (`apps/api/.env`), mas essa chave só tem
    `picagens.pt` verificado, não `fabriq.pt` — confirmação de e-mail real falhava (500). Por ora
    `GOTRUE_MAILER_AUTOCONFIRM=true` (sem exigir confirmação) até verificar `fabriq.pt` no Resend.
  - Schema completo (20 tabelas, as 4 migrations) reaplicado limpo na nova database.
  - **Backup:** `fabriq_v2` adicionado a `/usr/local/bin/backup-other-dbs.sh` (mesma lista dos
    outros bancos do servidor — dump diário 02h30, off-site Google Drive, retenção 14 dias).
    Testado dump manual, ok.
  - Testado end-to-end de novo (cadastro → login → dashboard) já na infra nova. Supabase.com fica
    desligado/sem uso a partir de agora (credenciais antigas em `v2/.env`/`v2/app/.env` já
    substituídas).
- **Pendências de schema levantadas pelo utilizador** (ainda não aplicadas): `sheet_models` e
  `label_templates` por empresa (`company_id`) — cada cliente vai ter o próprio modelo de chapa e
  layout de etiqueta, a aplicar junto do módulo de Ordens de Produção.
- **Armazenamento de ficheiros** (fotos de prova pós-corte, DXF/DWG): decidido **não** usar
  Supabase Storage — seguir o padrão já usado no fabriq actual (`apps/api/uploads/`, disco local
  na VPS), servido via Nginx, coberto pelo backup existente. Ainda não implementado no v2.
- **Próximo passo:** ajustar `pricing_presets` para o modelo fiscal PT (IVA/margem/comissão por
  categoria) e `quote_items` para geometria paramétrica — depois sim, módulo Parâmetros
  (máquina/materiais/precificação/config gerais) com CRUD real ligado à API self-host. Ícones ficam
  para o fim (ficheiro no Drive do utilizador, pasta "Fabriq").

---

## Sessão 27 (2026-08-27) — Rastreabilidade de Coladas (v2/fabriq)

- Projecto real de app fica em `/var/www/fabriq` (repo root), não em `v2/` (dir separada, código próprio).
- Nova página `/coladas` (`apps/web/src/app/(admin)/coladas/page.tsx`): pesquisa por número/etiqueta de colada, lista todas as ordens/chapas que a usaram (cliente, obra, origem, material, dimensões, estado, data).
- Backend: `GET /api/v1/orders/batches/search?batchNumber=...` (`orders.routes.ts`), filtra `OrderSheet.batchNumber` por tenant, `contains` case-insensitive.
- `api.ts`: `api.orders.searchByBatch()` + tipo `BatchSheetResult`. Sidebar: novo link "Coladas" (ícone `Layers`).
- `tsc --noEmit` limpo em api e web, `next build` ok, `fabriq-api`/`fabriq-web` reiniciados via pm2, commit `e28f8ea` pushed.
- **Próximo passo:** validar em produção (utilizador testar pesquisa real com colada existente).

---

## Sessão 26 (2026-08-12) — ZIP de ficheiros, desvio de tempo (IA) e velocidades de corte

- **Repo `services/nesting` sem remote (pendência da Sessão 25) resolvida**: criado `github.com/jhonatancieslak/fabriq-nesting` (privado), remote `origin` configurado, push de `nesting-extracted` e `main` (default branch), ambas sincronizadas ao longo da sessão.
- **Download ZIP de ficheiros da ordem** (`/ordens/<id>`): botão em "Ações" gera ZIP em memória (`ordens.download_zip`, `app/routes/ordens.py`) com os DXF anexados organizados em pastas `obra/material/espessura/ficheiro.dxf` — pedido do utilizador para levar os ficheiros ao laser via pen/drive.
- **Desvio tempo estimado (CypeCut) vs tempo real de corte**:
  - Novas colunas `desvio_tempo_segundos`/`desvio_tempo_pct` em `ordens_corte` (`ALTER TABLE`, backup `pg_dump` prévio).
  - Método `OrdemCorte.calcular_desvio_tempo()` (`app/models.py`), chamado em `pwa.py::concluir()` e `pwa.py::token_concluir()` sempre que o operador informa o tempo real na conclusão — comparação já aparece no PWA (`pwa/ordem.html`, `pwa/token_ordem.html`).
  - Tela admin `/relatorios/desvio-tempo` (`relatorios.desvio_tempo`, admin-only, menu abaixo de "Parâmetros IA"): lista ordens com desvio, filtros mês/ano/material/operador, KPIs de desvio médio e ordens dentro/fora do estimado.
  - **Backfill retroativo**: das 243 ordens concluídas, só 17 tinham `tempo_estimado` preenchido (a maioria das ordens nunca recebeu esse valor do CypeCut ao criar/editar) — 16 delas (as que também tinham `tempo_corte`) tiveram o desvio calculado via `UPDATE` manual com a mesma fórmula do código. Dataset real de partida: **16 ordens**. Para crescer, `tempo_estimado` precisa continuar a ser preenchido ao criar/editar ordens.
- **Análise via Groq**: botão "Analisar com IA" na tela de desvio de tempo (`relatorios.desvio_tempo_ia`, POST) — envia até 200 ordens com desvio + tabela de velocidades cadastradas ao Groq (`llama-3.1-8b-instant`, mesma chave `ConfiguracaoGeral.groq_apikey` já usada no planeamento), pede padrões de desvio por material/espessura e sugestão de ajuste; resposta mostrada inline na página. Ainda não há nenhum ajuste automático — só análise sob pedido do admin.
- **Velocidades de Corte** (`/velocidades-corte/`, admin-only, menu abaixo de "Análise de Tempo (IA)"): nova tabela `velocidades_corte` (material, espessura, velocidade m/min, nº estágios) + CRUD. Seed inicial: Alumínio (2/5/6/10mm) e Ferro (1.5/3/5/10/12/15/20mm, 15mm e 20mm com 3 estágios). Ainda **não** está ligado ao cálculo automático de `tempo_estimado` (fase futura: `tempo_estimado = perímetro DXF ÷ velocidade`, usando `FicheiroDXF.perimetro_mm`/`ItemOrdemCorte.perimetro_mm` já existentes).
- **Próximo passo:** (1) garantir que `tempo_estimado` é sempre preenchido ao criar ordem, para o dataset de desvio crescer; (2) ligar `velocidades_corte` ao cálculo automático de `tempo_estimado` a partir do perímetro DXF; (3) ideia do utilizador para depois — tela de nesting onde insere desenho/material/espessura, gera e informa o tempo que o CypeCut dá com os parâmetros (ainda não desenhada); (4) tela interativa no laser para o operador iniciar/finalizar o corte (substituindo o apontamento manual de tempo no PWA por registo de imagens) — feature maior, ainda não iniciada.

---

## Sessão 25 (2026-07-13) — Pivot Flask confirmado + notificações + fim do app Gerência

- **Confirmado pivot 2026-07-09**: desenvolvimento fica 100% em `services/nesting` (Flask). Verificado que as duas features que estavam a meio no rewrite Next.js (`apps/web`/`apps/api`, não commitadas) já tinham sido portadas para o Flask em sessão anterior: coladas por espessura (`ordens.coladas()`, `ChapasOrdem.colada`) e bloqueio de billing (`bloquear_por_assinatura()`, blueprint `plano`). Alterações Next.js não commitadas ficaram por commitar de propósito — não há mais trabalho a fazer lá.
- **Bug retrabalho corrigido**: ordens com `pecas_incompletas` preenchido ficavam presas para sempre na lista "Aguardam Retrabalho" (Gerência) mesmo depois de o retrabalho ser feito — o campo nunca era limpo. Corrigido em `app/routes/ordens.py::nova()`: ao criar ordem de retrabalho (via `retrabalho_origem_id`, hidden field novo em `ordens/form.html`), limpa `pecas_incompletas` da ordem original. Ordem `OC-202605-0016` (presa desde 09/05) limpa manualmente via script one-off, confirmado pelo utilizador que já tinha sido retrabalhada.
- **Notificações do sino (header)**: adicionado "Marcar todas como lidas" (`base.html`) — dismissal client-side via `localStorage` (chave `fabriq_notif_lidas`), por notificação individual (id + valor snapshot); reaparece automaticamente se o valor mudar (nova ordem pendente, novo aviso de vencimento). Não existe (nem foi criado) sistema de notificações server-side — continua tudo calculado ao vivo por request via `inject_globals()`.
- **App Gerência (Next.js externo, `gerencia.estruturasmetalicasviana.com`) descontinuado**: já não tinha nginx/processo ativo (porta 3000 pertence a outro projeto, `solarnest-web`). Blueprint `pwa_gerencia_bp` (`app/routes/pwa_gerencia.py`, prefixo `/gerencia-pwa`) desregistado em `app/__init__.py` (código mantido no repo, reversível, ficheiros não apagados). Certificado SSL órfão apagado via `certbot delete`.
- **Dashboard Gerência interno também removido** (pedido explícito do utilizador, para além do app Next.js externo): o utilizador não quer mais nenhum "Gerência" no sistema — nem o dashboard KPI interno do próprio Flask (`gerencia_bp`, `/gerencia`, dia/semana/mês, custos, obras, operadores). Item removido do menu lateral (`base.html`), blueprint desregistado em `app/__init__.py` (código mantido no repo, reversível). Link "Gestão" no bottom-nav do PWA operador (`pwa/dashboard.html`), que apontava lá, também removido (sem substituto — não existe mais nenhuma rota de gerência para apontar).
- **Próximo passo:** nenhum item crítico em aberto. Sugestão futura: ligar `bloquear_por_assinatura()` ao Central SaaS (ver Sessão 24) continua pendente. Repositório `services/nesting` (`nesting-extracted`) não tem `git remote` configurado — commits desta sessão ficam só locais na VPS, sem backup remoto.

---

## Sessão 24 (2026-07-09) — Billing ligado ao Central SaaS

- Central SaaS (`/var/www/jhonatancieslak/central-saas`, pm2 `central-saas`, porta 3300, `http://187.77.162.178/saas`) é agora o sistema único de licenciamento/billing Stripe para todos os SaaS (fabriq, picagens, eponto). Cada SaaS consulta `GET /saas/api/license/{productSlug}/{clientSlug}` para saber se deve bloquear o acesso.
- Fabriq (produto) e Pipesolutions (cliente) já estão registados no Central SaaS: subscrição `trial`, €35/mês, **não bloqueada** (`blocked: false`) — Pipesolutions não paga por agora.
- Assinatura local do fabriq (`app/models.py::Assinatura`, tabela `assinatura` do nesting) actualizada para `plano=trial, valor_mensal=0, estado=ativa, data_vencimento=NULL` — nunca bloqueia localmente. **Nota:** este modelo local ainda não está ligado ao Central SaaS — é um bloqueio independente, redundante a prazo. Ideal seria substituir a lógica de `bloquear_por_assinatura()` (`app/__init__.py`) por uma chamada ao endpoint de licença do Central SaaS.
- Checkout Stripe testado end-to-end: `POST /saas/api/checkout/{subscriptionId}` cria sessão real (`cs_live_...`) — fluxo de pagamento está pronto para quando houver cliente a pagar.
- **Webhook Stripe configurado**: reaproveitado o domínio `api.fabriq.pt` (stack antigo Next.js/Fastify, ainda em produção mas deprioritizado) só para a rota `/saas/` — nginx (`/etc/nginx/sites-available/api.fabriq.pt`) tem um novo `location /saas/` a fazer proxy para `127.0.0.1:3300` (Central SaaS), aproveitando o certificado wildcard `fabriq.pt` já existente (sem criar domínio novo).
  - Webhook Stripe criado: `we_1TrI4UKqIHhNdadeiwmJ5w3i` → `https://api.fabriq.pt/saas/api/stripe/webhook` (eventos: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`)
  - `STRIPE_WEBHOOK_SECRET` definido no `.env` do central-saas e serviço reiniciado.
- **Próximo passo:** ligar o bloqueio local do fabriq (`Assinatura`) ao endpoint de licença do Central SaaS, para deixar de haver dois sistemas de bloqueio separados para o mesmo tenant.

---

## URLs activos

| URL | Serviço | Porta |
|---|---|---|
| https://sistema.fabriq.pt | Admin (Next.js) | 3191 |
| https://app.fabriq.pt | PWA Operador (Next.js) | 3191 |
| https://api.fabriq.pt | API Fastify | 8190 |

---

## Tenants activos na BD

| Slug | Nome | Plano | Admin |
|---|---|---|---|
| `demo` | MetalPro — Demo FABRIQ | starter | admin@demo.fabriq.pt / admin123 |
| `pipesolutions` | Pipesolutions | pro | jhonatan.cieslak94@gmail.com / Jcieslak@3202 |

> ⚠️ Planos ainda sem cobrança — billing a implementar em fase futura.

---

## Login

- Campo "Empresa" (slug) **removido** do formulário de admin
- Sistema detecta o tenant automaticamente pelo email
- API pesquisa o utilizador globalmente → retorna `tenant.id`, `tenant.slug`, `tenant.name`
- PWA operador ainda usa slug (usernames não são globalmente únicos) — lido do param `?empresa=` na URL (gerado por QR do admin)
- **Toast de sucesso** com nome do utilizador antes de redirecionar
- **Toast de erro** com mensagem da API
- Tagline **"Do corte laser à fatura."** em amarelo bold no painel esquerdo
- Rodapé com crédito do desenvolvedor em ambos os lados

---

## Segurança e Auditoria (adicionado 2026-06-26)

### Tabelas criadas
- **`login_attempts`** — regista CADA tentativa de login:
  - email tentado, sucesso (bool), IP, user-agent, user_id, tenant_id, failure_reason, timestamp
- **`blocked_ips`** — IPs bloqueados manualmente ou por brute-force:
  - ip, razão, bloqueado por (user_id), auto-block (bool), tenant_id, expires_at

### Lógica de segurança (`src/shared/utils/security.ts`)
- Antes de qualquer login: verificar se IP está bloqueado → 403 se sim
- **Auto-bloqueio brute-force**: 10 falhas em 15 min → IP bloqueado automaticamente por 60 min
- Bloqueio com expiração automática (apagado quando expira)

### Rotas de auditoria (`GET/POST /api/v1/security/*`)
| Rota | Permissão | Função |
|---|---|---|
| `GET /security/login-attempts` | admin | Historial de tentativas com filtros |
| `GET /security/blocked-ips` | admin | IPs bloqueados (global + tenant) |
| `GET /security/stats` | admin | KPIs: falhas 24h/7d, top IPs suspeitos |
| `POST /security/block-ip` | admin | Bloquear IP manualmente |
| `DELETE /security/block-ip/:ip` | admin | Desbloquear IP |

---

## Arquitectura de perfis (levantamento)

```
SUPER ADMIN     → acesso total + gestão de utilizadores
ADMIN           → ordens, clientes, obras, operadores, relatórios
FINANCEIRO      → faturação pendente, marcar faturado, relatório financeiro
SOLICITADOR     → criar pedidos, ver as suas ordens, receber notificações
OPERADOR        → PWA mobile (já existe)
```

---

## O que foi feito (histórico resumido)

### 2026-06-26 — Sessão 3
- CRUD completo de utilizadores: `GET/POST/PATCH/DELETE /api/v1/users`
- Roles: admin, financial, requester, viewer
- Protecção: não apaga o último admin activo; reset de password revoga tokens
- Frontend `/utilizadores`: tabela activos/desactivados, modal criar/editar, redefinir password, activar/desactivar
- Sidebar: link "Utilizadores" adicionado
- `api.ts`: tipo `AppUser` + módulo `users`

### 2026-06-26 — Sessão 2
- Toast de sucesso/erro no login admin
- Tagline amarela e destaque visual no painel esquerdo do login
- Rodapé "Desenvolvido por Jhonatan Cieslak"
- Auditoria completa: `login_attempts`, `blocked_ips`, auto-bloqueio brute-force
- Rotas de segurança para admin SaaS e clientes

### 2026-06-26 — Sessão 1
- CORS corrigido (todos os domínios de produção)
- Tokens corrigidos (`data.tokens.accessToken`)
- Tailwind purge corrigido (`src/lib/**`)
- CSS `@layer components` completo em `globals.css`
- Login redesenhado: painel preto + SVG industrial + formulário branco
- Sidebar dark com active state amarelo
- Dashboard com KPIs e status
- Tenant `pipesolutions` criado
- Login sem campo slug (auto-detecção pelo email)
- PWA operador: slug pré-preenchido por URL param

---

## Portal Financeiro (concluído 2026-06-26 Sessão 4)

- Rotas `GET/PATCH /api/v1/financial` — listar, stats, aprovar, cancelar
- Aprovação: tipo (mat+MO / só MO), valor, notas, opção **"Sem fatura"** (cliente não quer emissão)
- Página `/invoicing`: KPIs (pendentes, faturados mês, crescimento, total), tabs por estado, modal profissional
- Ícones neutros (sem cores), visual profissional
- Campo `costValue` preparado para futura integração contabilidade (Moloni, etc.)

## UI Components (admin-ui.tsx)

Ficheiro partilhado: `apps/web/src/components/ui/admin-ui.tsx`
Componentes: `Toast`, `Modal`, `Btn`, `Field`, `Input`, `Textarea`, `Select`, `ErrorMsg`, `PageHeader`, `SearchBar`, `Table`, `Tr`, `Td`, `Pagination`, `Badge`, `Empty`
**Usar SEMPRE estes componentes em todas as páginas admin. Nunca usar classes Tailwind azuis ou fundo branco.**

## Upload de Fotos na PWA (concluído 2026-06-26 Sessão 5)

- `shared/config.ts` — `UPLOADS_DIR` centralizado, cria pasta `uploads/photos/` no arranque
- `@fastify/multipart` + `@fastify/static` registados no `main.ts`
- Novas rotas: `POST/GET/DELETE /api/v1/orders/stages/:stageId/photos`
- Fotos guardadas em `/var/www/fabriq/apps/api/uploads/photos/` (UUID + ext)
- Servidas via `/uploads/` (estático directo)
- PWA: upload real com `FormData`, galeria 3 colunas com tap-to-expand (lightbox), botão apagar
- Fix bug: filtro `status="undefined"` (string) causava erro Prisma

## Notificações (concluído 2026-06-26 Sessão 6)

- `notifications.service.ts` reescrito com:
  - **Email via nodemailer + Resend SMTP** (smtp.resend.com:587)
  - **WhatsApp via Evolution API** (se configurada)
  - Log em `notification_logs` (sent/failed)
- Eventos ligados em `orders.routes.ts` (fire-and-forget):
  - `order.created` — ao criar ordem
  - `stage.started` — ao operador iniciar etapa
  - `stage.completed` — ao concluir etapa intermédia
  - `order.completed` — quando todas as etapas estão concluídas
  - `order.cancelled` — ao cancelar
- Email HTML profissional com botão "Verificar Ordem" na conclusão
- Variáveis `.env` necessárias: `RESEND_API_KEY`, `EMAIL_FROM`, `EVOLUTION_API_URL/KEY/INSTANCE`

## Portal do Solicitador (concluído 2026-06-29 Sessão 7)

### URLs
| URL | Função |
|---|---|
| `https://sistema.fabriq.pt/req/login` | Login exclusivo para solicitadores |
| `https://sistema.fabriq.pt/req/ordens` | Lista de ordens (só as suas) |
| `https://sistema.fabriq.pt/req/ordens/[id]` | Detalhe da ordem |

### O que o solicitador VÊ
- Lista das suas ordens com estado, tabs por status, pesquisa
- Barra de progresso global (etapas concluídas / total)
- Detalhe: informações, etapas com ícone de estado, peças, fotos com lightbox

### O que o solicitador NÃO VÊ
- Nenhum valor financeiro (invoicing stripped na API para role `requester`)
- Sem botão de cancelar, sem PDF de corte, sem acesso ao admin

### Implementação
- `/req/layout.tsx` — topbar + guard: sem token → `/req/login`; role ≠ requester → `/dashboard`
- `/req/login/page.tsx` — valida role no frontend (recusa admins)
- Login admin: salva `fabriq_role` no localStorage; redirect para `/req/ordens` se role = requester
- Link "Portal do solicitador →" visível no login admin
- `OrderStage` e `Order` em `api.ts` actualizados com `startedAt`, `completedAt`, `photos`, `completedAt`
- API `GET /orders/:id`: strip do campo `invoicing` para role `requester`

## Próximos passos

1. ~~**Gestão de utilizadores**~~ ✅
2. ~~**Portal Financeiro**~~ ✅
3. ~~**Máquinas CRUD + parâmetros de custo**~~ ✅
4. ~~**Portal Solicitador / Ordens + Obras**~~ ✅
5. ~~**Dashboard KPIs + Materiais CRUD + Configurações + Cálculo automático**~~ ✅
6. ~~**Página pública `/verificar/[authCode]`**~~ ✅
7. ~~**Dashboard KPIs reais**~~ ✅
8. ~~**Upload de fotos na PWA**~~ ✅
9. ~~**Dashboard de segurança**~~ ✅
10. ~~**Notificações email/WhatsApp**~~ ✅
11. ~~**Portal do Solicitador**~~ ✅
12. ~~**QR Code no PDF**~~ ✅
13. ~~**Painel Resend / Email**~~ ✅
14. ~~**Billing / planos**~~ ✅

## Planos e Billing (concluído 2026-06-29 Sessão 8)

| Plano | Preço | Ordens/mês | Operadores | Admins | Máquinas |
|---|---|---|---|---|---|
| Trial | grátis 14 dias | 20 total | 3 | 2 | 1 |
| Starter | 49€/mês | 150 | 5 | 3 | 1 |
| Pro | 99€/mês | ilimitado | 20 | 10 | 3 |
| Factory | 199€/mês | ilimitado | ilimitado | ilimitado | ilimitado |
| Enterprise | consulta | ilimitado | ilimitado | ilimitado | ilimitado |

- Schema: enum `trial` adicionado + `trialEndsAt` + `planExpiresAt` no Tenant
- `plan-limits.ts`: tabela de limites por plano
- `check-plan.ts`: enforcement reutilizável (HTTP 402 com código de erro)
- Enforcement activo em: criação de ordens, operadores, utilizadores, máquinas
- `GET /api/v1/billing`: uso actual vs limites em tempo real
- `/billing`: página com barras de uso, alerta de trial, cards de upgrade
- Sidebar: link "Plano" com ícone de cartão

## Reset Demo (concluído 2026-06-29 Sessão 8)

- `apps/api/src/scripts/reset-demo.ts` — apaga ordens/stages/items/fotos/logs, recria estrutura base + 5 ordens demo
- `ecosystem.demo-reset.config.cjs` — PM2 cron `0 8 * * 1` (segunda-feira 08h00)
- Processo `fabriq-demo-reset` activo no PM2 (estado `stopped` entre execuções = correcto)
- Para forçar reset manual: `pm2 restart fabriq-demo-reset`

## Painel Super-Admin (concluído 2026-06-29 Sessão 9)

- Campo `is_super_admin` adicionado à tabela `users` (migration manual aplicada sem reset de BD)
- `jhonatan.cieslak94@gmail.com` é super admin (tenant: pipesolutions)
- JWT inclui `isSuperAdmin`; middleware `requireSuperAdmin` protege rotas
- Rotas: `GET /api/v1/superadmin/tenants` (lista com uso), `PATCH /plan`, `PATCH /status`, `POST /extend-trial`
- Frontend `/superadmin`: KPIs (activos, pagos, trial, expirados) + lista colapsável por tenant
  - Edição de plano (botões), datas de trial/expiração, toggle activo/inactivo, extender trial N dias
  - Layout isolado com guard `isSuperAdmin`
- Sidebar: link "Super Admin" vermelho visível apenas para super admins
- `fabriq_super_admin` guardado no localStorage no login

## UI — Sidebar + Header (concluído 2026-06-29 Sessão 10)

### Sidebar colapsável
- Toggle botão (ChevronLeft/Right) sobreposto na sidebar, posição `-right-3 top-[60px]`
- Estado guardado em `localStorage.fabriq_sidebar_collapsed`
- Quando recolhida: só ícones (w-[64px]); quando expandida: ícones + labels (w-56)
- Tooltip `title` nos links quando colapsada
- Sem utilizador/logout na sidebar — movido para header

### Header fixo (novo componente `components/layout/header.tsx`)
- Título da página detectado automaticamente pelo `pathname`
- **Sino de notificações** com badge amarelo: mostra count de ordens `pending`
  - Polling a cada 60s via `GET /api/v1/notifications/badge`
  - Dropdown com CTA "Ver ordens pendentes →"
- **Menu de utilizador**: avatar com iniciais, nome + role, tenant name
  - Dropdown com logout completo (limpa todos os localStorage)
- Login: passa a guardar `fabriq_user_name`, `fabriq_user_id`, `fabriq_tenant_name`

### API
- `GET /api/v1/notifications/badge` — retorna `{ pendingOrders, recentNotifications, total }`
- `api.notifications.badge()` adicionado ao api.ts do frontend

## UI — Autocomplete + Criação Inline (concluído 2026-06-29 Sessão 10)

### Componente `Combobox` (`components/ui/admin-ui.tsx`)
- Filtra opções ao digitar em tempo real
- Opção "Criar 'X'" aparece quando o texto digitado não corresponde a nenhuma opção existente
- Fecha ao clicar fora; reseta query se utilizador não seleccionou nada

### `/projects` — Modal de Obra
- Campo "Cliente" substituído por `Combobox`
- Ao digitar nome inexistente → aparece "Criar 'X'" → expande mini-form inline (nome, email, telefone)
- Após criar cliente, fica automaticamente seleccionado e modal continua
- Campo "Estado" só aparece em modo edição

### `/orders/new` — Step 1: Cliente & Obra
- Cliente: `Combobox` com pesquisa ao digitar
- Obra: carrega automaticamente ao seleccionar cliente
  - 0 obras → aviso + link "Criar agora" → form inline
  - 1 obra → selecção automática
  - N obras → `Combobox` com opção "+ Nova obra" → form inline
- Obra criada inline fica imediatamente seleccionada

---

## UI — Padronização de Botões e Exports (concluído 2026-06-29 Sessão 10)

### `ActionBtn` (8 variantes coloridas)
| Variante | Cor | Uso |
|---|---|---|
| `view` | Azul | Ver detalhe |
| `edit` | Amarelo | Editar |
| `delete` | Vermelho | Remover |
| `enable` | Verde | Activar |
| `disable` | Laranja | Desactivar |
| `qr` | Roxo | QR Code / PWA |
| `copy` | Cinza | Copiar |
| `print` | Teal | Imprimir |

### `TableToolbar`
- Campo de pesquisa integrado
- Filter tabs por estado (pills amarelos)
- Botões Imprimir / XLS / PDF agrupados à direita

### Funções de export
- `exportCSV(filename, headers, rows)` — CSV com BOM UTF-8 (Excel PT sem problemas)
- `printOrPDF(title, headers, rows, mode)` — abre janela com tabela estilizada FABRIQ.IA; `mode='pdf'` activa diálogo de impressão automático

### Páginas actualizadas
`clients`, `orders`, `projects`, `machines`, `materials`, `operators`, `utilizadores`

---

## Numeração de Ordens Configurável (concluído 2026-06-29 Sessão 10)

### Armazenamento
- Config guardada em `tenant.settings.orderNumbering` (campo JSON já existente — sem migração)
- Sequencial atómico via `prisma.$transaction` — sem duplicados em criação simultânea

### Parâmetros disponíveis
| Parâmetro | Tipo | Default | Descrição |
|---|---|---|---|
| `prefix` | string (max 10) | `OS` | Prefixo da ordem (ex: ORD, FAB) |
| `separator` | `-` `/` `.` `_` `""` | `-` | Separador entre componentes |
| `includeYear` | boolean | `true` | Incluir ano (ex: 2026) |
| `includeMonth` | boolean | `false` | Incluir mês (ex: 06) — só se ano activo |
| `padding` | 3 / 4 / 5 | `4` | Dígitos do sequencial (001 / 0001 / 00001) |
| `resetYearly` | boolean | `false` | Reiniciar contador a 1 em 1 de Janeiro |
| `nextSeq` | number | `1` | Próximo número (override manual para migrações) |

### Exemplos de formatos
`OS-2026-0001` · `FAB/2026/06/00001` · `ORD.2026.001` · `0001`

### API
- `GET /api/v1/settings/order-numbering` — config actual + preview da próxima ordem
- `PATCH /api/v1/settings/order-numbering` — guardar config (admin only)

### Frontend
- `/settings/order-numbering` — página dedicada com:
  - Preview em tempo real (card escuro com número grande)
  - Toggles encadeados (mês só activo se ano activo)
  - Pills de separador e dígitos
  - Galeria de 6 exemplos de formatos
  - Aviso info: alterações só afectam novas ordens
  - Só admins podem guardar (não-admins vêem aviso amarelo)
- Card na página `/settings` na nova secção "Ordens de Serviço"

### Ficheiros-chave
- `apps/api/src/modules/settings/settings.routes.ts` — módulo novo
- `apps/api/src/modules/orders/orders.service.ts` — `getNextOrderNumber()` substituiu `generateOrderNumber()`
- `apps/web/src/app/(admin)/settings/order-numbering/page.tsx` — página nova

---

## Relatórios (concluído 2026-06-29 Sessão 11)

- Rota `GET /api/v1/reports?from=YYYY-MM-DD&to=YYYY-MM-DD` — dados reais do período
- KPIs: total ordens, concluídas, em execução, tempo de corte, receita faturada, receita pendente
- Breakdown por estado, top 5 clientes (barras), top 5 máquinas (tempo de corte)
- Tabela completa de ordens do período com estado, tempo, valor, data
- Export XLS (CSV UTF-8) e PDF/impressão via `printOrPDF`
- Filtro de período (date pickers) com botão Atualizar
- Ficheiros: `apps/api/src/modules/reports/reports.routes.ts`, `apps/web/src/app/(admin)/reports/page.tsx`

## Stripe Billing (concluído 2026-06-29 Sessão 11)

- Chaves Stripe em `.env`: `STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (a preencher após criar webhook no dashboard)
- Price IDs criados: `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_FACTORY`
- `stripe.service.ts`: `getOrCreateCustomer`, `createCheckoutSession`, `createPortalSession`, `handleWebhookEvent`
- Rotas billing: `POST /checkout` → Stripe Checkout · `POST /portal` → Customer Portal · `POST /webhook` → eventos
- Webhook trata: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated/deleted`
- Migration: campos `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id` adicionados ao Tenant
- Billing page: botões "Assinar agora" com redirect Stripe · "Gerir subscrição" via Customer Portal

### Para activar webhook Stripe em produção:
1. Stripe Dashboard → Developers → Webhooks → Add endpoint: `https://api.fabriq.pt/api/v1/billing/webhook`
2. Eventos a seleccionar: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Copiar Signing Secret → `.env` → `STRIPE_WEBHOOK_SECRET=whsec_...`
4. `pm2 restart fabriq-api --update-env`

## Superadmin (actualizado Sessão 11)

- Movido para layout admin normal (sidebar + header) — `/superadmin` usa `(admin)/superadmin/page.tsx`
- Novo: **Acesso Gratuito** — conceder plano Pro por N meses sem pagamento (beta/parcerias)
- Novo: **Criar utilizadores** por tenant — modal com lista de utilizadores actuais + formulário
- Novo: **Listar utilizadores** por tenant via `GET /api/v1/superadmin/tenants/:id/users`

## Widget de Feedback (concluído Sessão 11)

- `components/ui/feedback-widget.tsx` — botão flutuante amarelo no canto inferior direito de todas as páginas admin
- Avaliação por estrelas + mensagem livre
- Enviado para `POST /api/v1/superadmin/feedback` (stored como AuditLog)
- Visível em `GET /api/v1/superadmin/feedback` (super admin)

## Fix orders/new — Obra inline (Sessão 11)

- Combobox de obra ocultada quando form inline está aberto (evita conflito de eventos)
- Combobox: `onFocus` não limpa query quando já tem valor seleccionado

## Registo público + Trial UX (Sessão 12 — 2026-06-29)

### Schema
- Campos `evolution_api_url`, `evolution_api_key`, `evolution_instance` adicionados ao modelo `Tenant` (migration via `db push`)

### API — Registo
- `POST /api/v1/auth/register` — rota pública de registo de novo tenant
  - Validação Zod, verificação de slug/email duplicados (409)
  - Cria Tenant (plan: trial, trialEndsAt: +14 dias) + User (role: admin)
  - Gera JWT access+refresh tokens (igual ao login)
  - Email de boas-vindas ao admin via Resend SMTP
  - Email de notificação ao super admin (jhonatan.cieslak94@gmail.com)
  - Rate limit: 5 req/10min
  - Ficheiro: `apps/api/src/modules/auth/register.routes.ts`

### API — Middleware check-trial
- `checkTrial` middleware em `apps/api/src/shared/middleware/check-trial.ts`
  - trial expirado → 402 `trial_expired`
  - plano inactivo → 402 `subscription_inactive`
  - Pronto para usar como preHandler em rotas protegidas

### API — Billing
- `GET /api/v1/billing` agora inclui `trial.isTrialPlan` e `trial.expiresAt` (antes só `endsAt`)

### Frontend — Página /register
- `apps/web/src/app/(auth)/register/page.tsx`
  - Campos: empresa, slug (auto-gerado + editável), nome, email, password, telefone
  - Suspense boundary para useSearchParams
  - Após criar conta → redireciona para /dashboard
  - Se `?plan=X` → faz checkout Stripe automaticamente após registo

### Frontend — Banner de trial
- `apps/web/src/components/ui/trial-banner.tsx`
  - Amarelo quando daysLeft <= 14; vermelho quando <= 3
  - Botão "Ver planos →" para /billing; botão X para fechar
  - Adicionado ao layout admin entre Header e main

### Frontend — Landing Pricing
- Botões dos planos fazem checkout Stripe se autenticado, ou redirect para /register?plan=X se não autenticado

## Sessão 13 — 2026-06-29

### Stripe — Produção activada
- Webhook criado no Stripe Dashboard (produção): `https://api.fabriq.pt/api/v1/billing/webhook`
- `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLIC_KEY` (live), `STRIPE_SECRET_KEY` (live) configurados no `.env`
- Price IDs de produção actualizados: Starter `price_1TnlJI...`, Pro `price_1TnlJJ...`, Factory `price_1TnlJJ...`

### Landing page — fabriq.pt
- Directório: `/var/www/fabriq-landing/` — Next.js standalone na porta 3290
- 13 secções: Navbar, Hero, LogoBar, Problem, Solution, PwaSection, AiParams, Features, HowItWorks, SocialProof, Pricing, Faq, FinalCta, Footer
- Animações scroll via IntersectionObserver nativo (sem dependências)
- Count-up animado nas métricas; toggle mensal/anual nos preços
- Pricing: autenticado → Stripe Checkout directo; não autenticado → `/register?plan=X`
- Nginx: `location /` em `fabriq.pt` aponta para `127.0.0.1:3290`
- PM2: processo `fabriq-landing`
- Idioma PT-PT, foco Portugal; LogoBar inclui PipeSolutions
- FAQ com pergunta sobre plano Customizado ("desenvolvemos conforme a vossa necessidade")

### /orders/new — Criação de cliente inline
- Quando não há clientes: aviso + botão "Criar primeiro cliente"
- Form inline com nome (obrig.), email e telefone (opcionais)
- Após criar, cliente seleccionado automaticamente e fluxo continua

### Tour guiado (manual passo a passo)
- Ficheiro: `apps/web/src/components/ui/tour.tsx`
- Activa na primeira visita (guarda `fabriq_tour_done` no localStorage)
- 8 passos: sidebar → ordens → nova ordem → clientes → máquinas → faturação → sino → perfil
- Overlay SVG com recorte no elemento activo, borda amarela, tooltip com seta direccional
- Barra de progresso visual; botões Anterior / Seguinte / Concluir / Saltar
- `data-tour` adicionado em: sidebar, links nav (orders/clients/machines/billing), bell, user menu, botão nova ordem
- Para re-activar: `localStorage.removeItem('fabriq_tour_done')` na consola

### Trial Banner
- Sem emojis nem ícones coloridos — fundo `#07080A`, texto branco, link amarelo da marca

## Módulo de Nesting — Fase 1 (concluído 2026-06-29 Sessão 14)

Análise completa do NestCut (`/var/www/pipesolutions/nesting/`) — 20+ modelos mapeados.  
Ver plano detalhado: `docs/nesting-plano.md`

### Schema Prisma — novos enums e modelos
- Enums: `ProcessType` (laser_cut/guillotine/bending/other), `SheetOrigin` (ours/offcut/client), `BatchStatus`
- `ServiceOrder`: +5 campos: `processes`, `drawingTimeSecs`, `sheetBatch`, `scheduledAt`, `isUrgent`
- `OrderItem`: +2 campos: `perimeterMm`, `notes`
- `OrderFile`: +5 campos: `fileType`, `areaM2`, `bboxWidthMm`, `bboxHeightMm`, `perimeterMm`, `processed`
- Novos modelos: `OrderSheet` (chapas por ordem), `NestingJob` (resultado bin-packing), `OrderBatch` (agrupamento), `OrderBatchOrder`
- Migration aplicada via `prisma db push`

### Python DXF Processor (`/var/www/fabriq/services/dxf-processor/process_dxf.py`)
- Usa `ezdxf` + `matplotlib` (já instalados no servidor)
- Entidades suportadas: LINE, CIRCLE, ARC, LWPOLYLINE, POLYLINE, SPLINE, ELLIPSE
- Output JSON: `{ ok, areaM2, bboxWidthMm, bboxHeightMm, perimeterMm }`
- Preview PNG: fundo `#0A0B0D`, linhas amber `#EAB308` — 150 DPI
- Testado com DXF real do NestCut: `138mm × 240.5mm · 617mm perímetro`

### API — Upload de ficheiros
- `POST /api/v1/orders/:orderId/items/:itemId/files` — upload até 50MB
- `GET  /api/v1/orders/:orderId/items/:itemId/files` — listar com dimensões e previewUrl
- `DELETE /api/v1/orders/:orderId/items/:itemId/files/:fileId` — remover
- Processamento DXF em background (não bloqueia resposta)
- `@fastify/multipart` limite aumentado para 50MB
- Uploads guardados em `uploads/dxf/{tenantId}/`, previews em `uploads/previews/{tenantId}/`

### Frontend — Componentes
- `components/ui/dxf-upload.tsx` — componente de upload completo (drag-and-drop, polling de preview, dimensões)
- `/orders/new` — `DxfFilePicker` por peça; ficheiros seleccionados → upload automático após criação da ordem
- Campo de observação por peça adicionado
- Largura/Altura com placeholder "auto via DXF"

## Módulo de Nesting — Fase 2 (concluído 2026-06-30 Sessão 15)

### Editor DXF no browser

| Ficheiro | Função |
|---|---|
| `apps/web/src/app/(admin)/orders/[id]/dxf-editor/[fileId]/page.tsx` | Página do editor (SVG renderer) |
| `apps/api/src/modules/files/files.routes.ts` | Endpoints entities + clean |
| `services/dxf-processor/export_entities.py` | Exporta entidades DXF → JSON |
| `services/dxf-processor/clean_dxf.py` | Remove entidades e gera DXF limpo |

#### Funcionalidades do editor
- Viewer SVG nativo (sem Three.js) — sem dependências pesadas
- Pan com drag, zoom com scroll ou botões; indicador de % zoom
- Ferramenta Seleccionar (clique / Shift+clique para múltiplas) e Mover (pan)
- Tecla **Delete** / Backspace para remover entidades seleccionadas
- Painel lateral: contagem por tipo de entidade (LINE, CIRCLE, ARC…), toggle de camadas
- Botão "Desfazer" — restaura todas as remoções não guardadas
- "Guardar DXF limpo" → ficheiro original substituído, preview e dimensões actualizadas na BD
- Link "Editar" aparece na página de detalhe da ordem (só para DXF/DWG processados)

#### Tipos de entidade suportados
`LINE`, `CIRCLE`, `ARC`, `LWPOLYLINE`, `POLYLINE`, `SPLINE`, `ELLIPSE`, `TEXT`, `MTEXT`, `DIMENSION`, `INSERT`, `HATCH`, `SOLID`

#### API
- `GET  /api/v1/files/:fileId/entities` — exporta entidades + bbox para o editor
- `POST /api/v1/files/:fileId/clean` — body: `{ handles: string[] }` — gera DXF limpo e actualiza registo

---

## Auditoria de Segurança / Qualidade — Sessão 15 (2026-06-30)

### Bugs encontrados e corrigidos (8 ângulos × verificação independente)

| Severidade | Ficheiro | Bug | Correcção |
|---|---|---|---|
| 🔴 Crítico | `main.ts` | `JSON.parse('')` em body vazio → 500 em DELETE/PUT (ex: apagar clientes) | `str ? JSON.parse(str) : {}` |
| 🔴 Crítico | `files.routes.ts` | `py.stderr` não drenado → Python bloqueia quando warnings enchem pipe 64KB → timeout 60s | `py.stderr.on('data', ...)` |
| 🟠 Alto | `export_entities.py` | SPLINE exportava `control_points` (off-curve) → geometria errada no editor | `ent.flattening(0.1)` |
| 🟠 Alto | `orders/[id]/page.tsx` | N+1: 1 fetch por peça para ficheiros já incluídos na resposta da ordem | Usa `item.files` directamente |
| 🟡 Médio | `files.routes.ts` | `setTimeout` nunca cancelado → closures (MBs de JSON) mantidos vivos 60s | `clearTimeout` em `close`/`error` |
| 🟡 Médio | `files.routes.ts` | `const { handles } = req.body` sem guard → TypeError 500 sem Content-Type | Zod + `req.body ?? {}` |
| 🟡 Médio | `export_entities.py` | `if v:` em Vec3(0,0,0) falsy → vértice SOLID na origem ignorado | `if v is not None` |
| 🟡 Médio | `clean_dxf.py` | `remaining` incluía entidades sem handle → contagem inflada | Conta só entidades com handle |
| 🟡 Médio | `dxf-editor/page.tsx` | UI indicava "pressione Delete" mas sem listener | `useEffect` + `window.addEventListener` |
| 🟢 Baixo | `dxf-editor/page.tsx` | `setTimeout` de redirect não cancelado no unmount → navegação dupla | `useRef` + cleanup em unmount |

### Melhorias adicionais
- `api.ts`: tipo `OrderFile` e campo `files?: OrderFile[]` em `OrderItem` (dados já vinham da API)
- `files.routes.ts`: `unlink()` do DXF original após clean (evita acumulação em disco)
- `files.routes.ts`: validação Zod no body do `/clean` (max 10.000 handles, max 64 chars cada)
- `dxf-editor`: `useCallback` desnecessário removido

---

## Sessão 16 — 2026-06-30

### Máquina e Operador (Pipesolutions)
- Máquina **"Laser 1 - 6000w"** criada (tipo: laser_cnc)
- Operador **fabio.silva** / fabio1234 criado, vinculado à Laser 1
- 179 ordens migradas: etapas reais do NestCut vinculadas à Laser 1 + Fábio Silva
  - Tempo real do NestCut preservado (ex: 11min, 15:25→15:49)
  - Etapas duplicadas (criadas por erro) removidas
  - Todas as ordens marcadas como `completed`

### Folha de Corte — Redesenhada
- **A4 landscape** (horizontal)
- **2 páginas**: Folha de Corte + Retirada de Material
- Observações da ordem em destaque (amarelo)
- Campos operacionais: colada da chapa, material verificado, nozzle, gás, pressão
- Tolerância em mm (campo para preencher à mão)
- Preview DXF embebido por peça (PNG em base64)
- **Fix QR Code no print**: `print-color-adjust: exact` + timeout antes de `w.print()`
- Folha 2: qtd prevista / retirada / falta / data retirada / assinatura

### Tela de Detalhe da Ordem — Melhorada
- KPIs: total peças, tempo de corte, área total, custo estimado
- Ficha resumo: cliente, obra, operador, data corte, tempo real
- Etapas com máquina, operador, tempo, início→fim (sem emojis)
- Peças com thumbnail DXF, área unitária, área total, perímetro
- Botão "Ver Obra" → link para detalhe da obra
- Custo estimado detalhado (corte / material / total)

### Detalhe de Obra (nova página /projects/[id])
- KPIs: ordens concluídas/total, peças, tempo total, área, custo acumulado
- Barra de progresso visual
- Lista de todas as ordens com status, máquina, operador, tempo, custo
- Botão **"Concluir Obra"** → `POST /projects/:id/complete`
- Botão **"Reabrir"** para reverter
- Totais acumulados no rodapé da lista

### Biblioteca de Ficheiros (/media)
- Grid de ficheiros DXF/DWG processados
- Preview thumbnail (fundo preto, linhas amber)
- Info: nome, tipo, tamanho, obra, cliente, área, dimensão, espessura
- Link para obra correspondente
- Pesquisa por nome, paginação
- Sidebar: link "Biblioteca" adicionado

### API — Novos endpoints
- `GET /api/v1/projects/:id` — métricas agregadas (tempo, área, custo, peças)
- `POST /api/v1/projects/:id/complete` — concluir obra
- `POST /api/v1/projects/:id/reopen` — reabrir obra
- `GET /api/v1/media` — biblioteca de ficheiros DXF/DWG processados

---

## Módulo de Nesting — Fase 3 (concluído 2026-06-30 Sessão 17)

### Algoritmo (`services/dxf-processor/nest.py`)
- Shelf First-Fit Decreasing (SFFD) com rotação automática 90°
- Input JSON: peças (w, h, qty, label, id), dimensões da chapa, gap
- Output: sheetsNeeded, utilizationPct, unplacedPieces, layout com coordenadas (x, y, w, h) por chapa
- Preview PNG via matplotlib: fundo preto, peças coloridas por tipo, labels

### API
- `POST /api/v1/orders/:orderId/nesting` — calcula e guarda NestingJob (substitui job anterior)
- `GET  /api/v1/orders/:orderId/nesting` — busca último job

### Frontend (`/orders/[id]/nesting`)
- KPIs: chapas necessárias, aproveitamento %, peças/chapa, peças sem lugar
- Barra de aproveitamento com cor dinâmica (verde/amarelo/vermelho)
- Canvas SVG inline com layout proporcional por chapa (ou PNG do servidor)
- Legenda de peças com cor por tipo
- Tamanhos rápidos de chapa (1000×2000, 1250×2500, 1500×3000, 2000×4000)
- Aviso se peças sem dimensões DXF
- Botão "Nesting" adicionado ao detalhe da ordem

## Módulo Consumíveis (concluído Sessão 18)

- Schema: `Consumable`, `StockMovement`, enums `ConsumableCategory`/`StockMovementType`
- API: CRUD consumíveis, movimentos entrada/saída (admin + operador PWA)
- Admin `/consumables`: lista agrupada por categoria, alertas stock baixo, histórico movimentos
- PWA `/op/consumibles`: registo de saída com motivo e contador, grupos por categoria
- Sidebar admin + menu inferior PWA actualizados

## Fase 4 — Kanban de Produção (concluído Sessão 19 — 2026-06-30)

### API (`apps/api/src/modules/batches/batches.routes.ts`)
- `GET /batches/kanban` — dados agrupados por estado (planned/in_progress/completed)
- `GET /batches/orders/unassigned` — ordens sem batch para adicionar
- CRUD completo: `GET/POST/PATCH/DELETE /batches/:id`
- `POST /batches/:id/orders` — adicionar ordens; `DELETE /batches/:id/orders/:orderId`
- `PATCH /batches/:id/status` — mover entre colunas

### Frontend (`/production/kanban`)
- Kanban 3 colunas: Planeado / Em Execução / Concluído
- Cards de batch: KPIs (ordens, peças, m²), ordens expandíveis, data agendada
- Modal criar/editar batch (nome, máquina, data, notas)
- Modal "Adicionar Ordens" com checkbox múltiplo (só ordens sem batch)
- Botões Iniciar/Concluir para transição de estado
- Filtro por máquina; botão X por hover para remover ordem
- Sidebar: link "Kanban" → `/production/kanban`

## Próximos passos (Nesting)

- ~~**Fase 2**~~ ✅ Editor DXF no browser
- ~~**Fase 3**~~ ✅ Algoritmo de nesting: bin-packing, aproveitamento %, imagem PNG do layout
- ~~**Fase 4**~~ ✅ Kanban de produção (OrderBatch)
- ~~**Módulos de parâmetros por processo**~~ ✅ (ver Sessão 20)

## Parâmetros por Processo — Laser/Quinagem/Guilhotina (concluído 2026-07-01 Sessão 20)

### Schema (`CuttingParam`, db push aplicado)
- Campos laser (`speedMmMin`, `powerPercent`, `gasPressureBar`, `gasType`, `nozzleMm`) tornados opcionais
- Novos campos quinagem: `tonnageT`, `bendAngleDeg`, `bendRadiusMm`, `backGaugeMm`
- Novos campos guilhotina: `bladeClearanceMm`, `maxSheetThicknessMm`
- Validação condicional por `machineType` (`validateProcessFields`): corte (laser_cnc/cnc_router/plasma/waterjet) exige campos laser; `bending` exige tonelagem/ângulo/raio; `guillotine` exige folga de lâmina

### API (`apps/api/src/modules/cutting-params/cutting-params.routes.ts`)
- `GET /cutting-params/list` — listagem admin paginada, filtro por machineType/materialType/pesquisa (nova, não interfere com `GET /` usado pelo PWA operador)
- `POST /cutting-params` · `PATCH /cutting-params/:id` · `DELETE /cutting-params/:id` — CRUD admin com auditoria
- `GET /cutting-params` (lookup por material+espessura+machineType, com interpolação) e `/feedback`, `/materials` mantidos sem quebra

### Frontend
- Nova página `/settings/cutting-params` — tabs Corte Laser / Quinagem / Guilhotina, tabela por grupo, modal com campos dinâmicos conforme tipo de máquina seleccionado, apagar com confirmação
- `api.ts`: interface `CuttingParam` + módulo `api.cuttingParams` (list/create/update/delete)
- Sidebar + header: link "Parâmetros de Corte" (ícone Sliders) acima de "Configurações"
- Build de `apps/api` e `apps/web` sem erros de tipo; serviços `fabriq-api`/`fabriq-web` reiniciados em produção

## Caminho A — Produção & KPIs Reais (concluído 2026-06-30 Sessão 17)

### Schema (db push aplicado)
- `ServiceOrder`: campos `estimatedTimeSecs` (tempo CypeCut) e `sheetClientOwned` (chapa do cliente)
- Novo modelo `CostTable`: preço €/m² por `materialType` + `thicknessMm` (unique por tenant+mat+esp)

### Motor de Custo (`apps/api/src/shared/services/cost.service.ts`)
- **Hierarquia de lookup**: CostTable exacta (mat+esp) → fallback (mat+esp=0) → Material.costPerM2
- **Custo mínimo**: se tempo ≤ minBilledMinutes → cobra minBilledCost (ex: €11 mínimo)
- **Margem %**: sobre o total corte+material
- Funções: `calculateCost(input)` e `calculateOrderCost(tenantId, orderId)` reutilizáveis

### API
- `GET/POST/PATCH/DELETE /api/v1/cost-table` — CRUD tabela de custos
- `POST /api/v1/cost-table/simulate` — simulador de custo instantâneo
- `GET /api/v1/production?from=&to=` — relatório com 4 blocos:
  - Produção por operador (ordens, peças, área, tempo, desvio %)
  - Ocupação semanal da máquina (% de 8h/dia × 5 dias)
  - Consumo de chapa por material+espessura (m² ranking)
  - Top ordens fora do estimado (desvio % ordenado)

### Frontend
- `/production` — dashboard de produção com 4 tabs + export XLS/print
- `/settings/cost-table` — CRUD agrupado por material, fallback visível
- Nova ordem: campo "Tempo Estimado (CypeCut)" + checkbox "Chapa do cliente"
- Sidebar: link "Produção" com ícone Factory

### Para activar o relatório de desvio (Pipesolutions):
As 179 ordens migradas não têm `estimatedTimeSecs`. A partir de agora, ao criar ordem, o operador preenche o tempo do CypeCut.
Para retroactivo: pode-se fazer um import CSV com os tempos estimados históricos.

## Caminho B — PWA Operacional (concluído 2026-06-30 Sessão 18)

### Schema (db push aplicado)
- `ChecklistItem`: itens de verificação por tipo (daily/biweekly/quarterly) — 14 itens padrão
- `ChecklistRecord`: histórico de verificações por operador + data

### API (/api/v1/checklist)
- `GET /pending` — tipos em dívida (daily sem verificação hoje, quinzenal sem nos últimos 15 dias, trimestral sem nos últimos 90 dias)
- `POST /submit` — submeter verificação com `{itemId, name, ok, obs?}[]`
- `GET /history` — histórico admin com filtros
- `GET /items` — listagem com auto-seed na primeira chamada
- `PATCH /items/:id` — activar/desactivar item

### PWA (`/op`)
- **`/op/verificacao`** — página de checklist interactivo (conforme/não conforme, obs obrigatório para NÃO conforme, multi-tipo na mesma sessão)
- **Dashboard** — banner amarelo com badge numérico quando há verificações pendentes
- **Conclusão de Etapa** — substituído o `confirmComplete()` por modal personalizado com:
  - Campo "Tempo real HH:MM:SS"
  - Contador ± de peças incompletas por item
  - Envia `incompleteItems[]` e `cuttingTime` para a API
- **Menu inferior** — tab "Verificar" com ícone ShieldCheck

### Tabela de Custos Pipesolutions (preenchida manualmente via SQL)
- 40 entradas: Aço 1-20mm, Inox 1-12mm, Alumínio 1-10mm, Cobre 1-5mm
- Laser 1 - 6000w: €2.65/min, 4 min mínimo, €11 custo mínimo
- Validado: Inox 3mm/25min = €80.65; corte 90s = €11 (mínimo aplicado)

## Caminho C — Manutenção Preventiva + Avarias (concluído 2026-06-30 Sessão 18)

### Schema (db push aplicado)
- `MaintenanceTask`: tarefas por máquina — 5 periodicidades (horas/dias/semanas/meses/ordens), 8 categorias
- `MaintenanceRecord`: histórico de execuções com horas e ordens da máquina no momento
- `Breakdown`: avarias — 9 componentes, 4 gravidades, 3 estados (open/in_progress/resolved)

### API
- `GET /maintenance` + `POST/PATCH/DELETE /maintenance/:id` — CRUD tarefas
- `POST /maintenance/:id/execute` — registar execução
- `GET /maintenance/summary` — KPIs: overdue/urgent/soon/ok/openBreakdowns
- `GET/POST/PATCH/DELETE /breakdowns` — CRUD avarias (admin)
- `POST /breakdowns/operator` — reportar via PWA (token de operador)
- Estado calculado em runtime: progress % + nextDue (data ou horas/ordens)

### Frontend Admin (/maintenance)
- 4 KPIs no topo
- Tab "Preventiva": lista semáforo com barra de progresso, próxima execução, modal "Executar"
- Tab "Avarias": fluxo open→em resolução→resolvida, modal "Resolver" com solução + downtime
- Sidebar: link "Manutenção" com ícone Wrench

### PWA (/op/ordem)
- Botão "Reportar Avaria" visível durante etapa em curso
- Modal bottom-sheet com componente + gravidade + descrição
- Enviado para `POST /breakdowns/operator` com token de operador

## Sessão 19 — 2026-06-30 (continuação)

### Fix: sistema.fabriq.pt → login (não landing page)
- `apps/web/src/app/page.tsx` alterado: `/` agora redireciona para `/login`
- Landing page exclusiva de `fabriq.pt` (porta 3290, processo `fabriq-landing`)
- `sistema.fabriq.pt` → processo `fabriq-web` (porta 3191) → `/login`

### Máquina Pipesolutions actualizada
- Nome actualizado de "Laser 1 - 6000w" → **"Fiber Laser 6000W — CypeCut"** (via DB directo)
- Máquina de teste "sss" apagada
- Operador **Jhonatan Cieslak** associado à máquina (antes sem máquina)
- Operador **Fábio Silva** já estava associado
- Parâmetros de corte: 0 registados — a preencher via `/machines` no admin UI

### Script de migração DXF (sistema antigo → novo)
- `scripts/migrate-dxf-files.js` — migra ficheiros DXF + previews PNG do NestCut
- Fonte: `/var/www/pipesolutions/app/static/uploads/dxf/` (259 DXFs + 73 PNGs)
- Destino: `/var/www/fabriq/apps/api/uploads/dxf/{tenantId}/` e `uploads/previews/{tenantId}/`
- BD fonte: `postgresql://nesting@localhost/nesting_db` (tabela `ficheiros_dxf`)
- Cria registos `OrderFile` standalone (sem serviceOrderId) visíveis na Biblioteca `/media`
- Para executar: `node scripts/migrate-dxf-files.js` (pasta `/var/www/fabriq`)

## Migração DXF NestCut → Biblioteca (concluído 2026-07-01 Sessão 21)

### Bug de schema encontrado e corrigido
- `OrderFile.orderItemId` era obrigatório (relação não-nula) — **não existia suporte real a ficheiros standalone** na Biblioteca `/media`, apesar da documentação de sessões anteriores sugerir o contrário
- Schema alterado: `orderItemId` e a relação `orderItem` tornados opcionais (`String?` / `OrderItem?`) — aplicado via `prisma db push` (sem perda de dados, só relaxa constraint)
- `scripts/migrate-dxf-files.js` corrigido: path do require do Prisma Client (`./apps/api/...` → `../apps/api/...`, relativo ao ficheiro), campo `mimeType` obrigatório adicionado (inferido pela extensão), campo inexistente `serviceOrderId` removido do payload

### Execução
- Rodado com `NODE_PATH=/var/www/fabriq/apps/api/node_modules node scripts/migrate-dxf-files.js`
- Resultado: **82 ficheiros migrados**, 119 ignorados (ficheiros originais já não existiam em disco no sistema antigo — não recuperáveis), 0 erros
- Ficheiros visíveis na Biblioteca `/media` do tenant `pipesolutions`, standalone (sem ordem associada)
- `apps/api` rebuilded e `pm2 restart fabriq-api --update-env` aplicado

## WhatsApp — Instância Evolution por Tenant (concluído 2026-07-01 Sessão 22)

### Infra
- Evolution API partilhada já corria em Docker (`evolution-evolution-api-1`), acessível internamente em `http://127.0.0.1:8765` (porta pública 8080 é só docker-proxy)
- Domínio público `evo.estruturasmetalicasviana.com` **não tem vhost nginx** — não usar (serve o certificado errado, cai no default_server). Ficou registado como pendente, não resolvido nesta sessão (decisão: usar URL interna em vez de criar vhost novo)
- `apps/api/.env`: `EVOLUTION_API_URL=http://127.0.0.1:8765`, `EVOLUTION_API_KEY` = key global admin da Evolution partilhada (mesma usada por outros projectos no servidor, ex: solarnest)

### Backend
- Novo `apps/api/src/shared/services/whatsapp-admin.service.ts` — porta do padrão já usado em `/var/www/solar` (`WhatsAppAdmin`): `createInstance`, `connect`, `connectionState`, `logout`, `deleteInstance`, via `fetch` nativo contra a apikey global
- Novas rotas em `settings.routes.ts`: `POST /whatsapp/connect` (cria/garante instância `fabriq-{tenantId}`, devolve QR code base64 + pairing code, persiste em `tenant.evolutionInstance/evolutionApiUrl/evolutionApiKey`), `GET /whatsapp/state`, `POST /whatsapp/disconnect`
- Rotas manuais antigas (`GET/PATCH /whatsapp`, `POST /whatsapp/test`) mantidas intactas para configuração avançada (instância própria fora deste servidor)

### Frontend
- `/settings/whatsapp` reescrita: secção principal "Conectar WhatsApp" com botão gerar QR code, polling de estado a cada 3.5s, badge "Ligado" quando confirmado + botão desligar
- Formulário manual antigo movido para secção colapsável "Configuração manual (avançado)"

### Testado
- `POST /whatsapp/connect` chamado com JWT real do admin Pipesolutions → QR code gerado com sucesso, instância `fabriq-11643ce0-427f-4849-9975-d6ef8f99e5b0` persistida na BD
- **Falta**: escanear o QR real no telemóvel para confirmar ligação end-to-end (ninguém escaneou ainda — próximo passo é o utilizador abrir `/settings/whatsapp` e ligar o WhatsApp do Pipesolutions)

## Fix: notificação de conclusão duplicada — nesting (2026-08-06)

- Bug: ordem #276 (`OC-202608-0004`) enviava email/WhatsApp de conclusão repetidamente ao solicitador.
- Causa: dois endpoints PWA (`pwa.py concluir()` e `pwa.py token_concluir()`) chamavam `notificar_solicitador(ordem, 'concluido')` sem qualquer guarda contra reenvio (retries de rede, dupla submissão) — `OrdemCorte` não tinha flag de "já notificado".
- Fix: nova coluna `notificado_concluido` (Boolean, default False) em `ordens_corte` (`app/models.py`), aplicada em produção via `ALTER TABLE`. Ambos os endpoints agora só chamam `notificar_solicitador` se `not ordem.notificado_concluido`, marcando a flag e fazendo commit antes de notificar.
- Ordem 276 marcada manualmente como `notificado_concluido=TRUE` para parar o loop já em curso.
- `nestcut` reiniciado, serviço `active`.
- Nota: endpoint admin `ordens.atualizar_estado()` continua sem enviar notificação (comportamento pré-existente, não alterado).

## Próximos passos (geral)

- **Webhook Stripe** já configurado — testar fluxo completo de subscrição
- **Evolution API por tenant** — UI para cada cliente configurar a sua instância WhatsApp ✅ (backend feito, falta testar)
- **Invoicing** — filtros por período e export XLS/PDF

## Coladas por Espessura + Bloqueio de Billing (concluído 2026-07-09 Sessão 23)

### Coladas em `/orders/new`
- Cada espessura distinta entre as peças da ordem gera automaticamente uma colada (chapa) separada — sincronizado via `useEffect` sobre `items`
- Cada colada tem etiqueta própria (`batchLabel` → `batchNumber` na API), origem, dimensões e material independentes
- Campo "Colada da Chapa" a nível de ordem desativado quando há múltiplas coladas (a etiqueta passa a ser por colada)
- Schema: `sheets[].batchNumber` opcional adicionado a `createOrderSchema`; `orders.service.ts` grava o campo em `OrderSheet`
- Testado via API: 2 chapas (6mm/8mm) com etiquetas distintas gravadas correctamente na BD

### Ecrã de Bloqueio de Billing
- `components/ui/billing-lock.tsx` (novo): hook `useBillingLock()` consulta `GET /billing` e `BillingLockScreen` cobre o ecrã quando trial ou plano expirado
- Integrado no `(admin)/layout.tsx` — não bloqueia a própria página `/billing`
- `api.ts`: novo módulo `api.billing` (status/plans/checkout/portal) + tipos `BillingStatus`/`BillingPlan`
- `billing/page.tsx` ajustada ao novo formato de `trial` (`isTrialPlan`, `expiresAt`, `daysLeft` nullable) devolvido pela API
- `ecosystem.config.js`: `interpreter: 'none'` adicionado ao processo `fabriq-api`

### Verificação
- `tsc --noEmit` e `next build` sem erros em `apps/api` e `apps/web`
- Serviços `fabriq-api`/`fabriq-web` reiniciados em produção
- Testado end-to-end via API: login, `GET /billing` (formato correcto), criação de ordem com 2 coladas (`batchNumber` gravado por chapa), ordem de teste cancelada após verificação

## Email — Resend (concluído 2026-06-29)

- `GET /api/v1/notifications/status` — estado email + WhatsApp
- `POST /api/v1/notifications/test-email` — envia email de teste (requer RESEND_API_KEY)
- `/settings/smtp` — painel visual: estado, instruções passo-a-passo, formulário de teste, lista de eventos
- Para activar: obter API key em resend.com → colocar em `.env` → `pm2 restart fabriq-api --update-env`
