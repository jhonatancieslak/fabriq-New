# FABRIQ.IA — Estado Actual

**Última sessão:** 2026-06-29 (Sessão 12)

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

## Próximos passos

- **Configurar Webhook Stripe** (após criar endpoint no dashboard Stripe — ver instruções acima)
- **Webhook Stripe** para activar/desactivar planos automaticamente
- **Relatórios avançados** (PDF exportável, filtros por período)
- **Gestão multi-máquina** (Starter só tem 1 máquina)
- **Invoicing** — filtros por período e export XLS/PDF

## Email — Resend (concluído 2026-06-29)

- `GET /api/v1/notifications/status` — estado email + WhatsApp
- `POST /api/v1/notifications/test-email` — envia email de teste (requer RESEND_API_KEY)
- `/settings/smtp` — painel visual: estado, instruções passo-a-passo, formulário de teste, lista de eventos
- Para activar: obter API key em resend.com → colocar em `.env` → `pm2 restart fabriq-api --update-env`
