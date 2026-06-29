# FABRIQ.IA — Estado Actual

**Última sessão:** 2026-06-29 (Sessão 7)

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
13. **Configurar RESEND_API_KEY** no `.env` do servidor para activar email
14. **Billing / planos** (fase futura)
