# FABRIQ.IA — Estado Actual

**Última sessão:** 2026-07-01 (Sessão 22)

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

## Próximos passos (geral)

- **Webhook Stripe** já configurado — testar fluxo completo de subscrição
- **Evolution API por tenant** — UI para cada cliente configurar a sua instância WhatsApp ✅ (backend feito, falta testar)
- **Invoicing** — filtros por período e export XLS/PDF

## Email — Resend (concluído 2026-06-29)

- `GET /api/v1/notifications/status` — estado email + WhatsApp
- `POST /api/v1/notifications/test-email` — envia email de teste (requer RESEND_API_KEY)
- `/settings/smtp` — painel visual: estado, instruções passo-a-passo, formulário de teste, lista de eventos
- Para activar: obter API key em resend.com → colocar em `.env` → `pm2 restart fabriq-api --update-env`
