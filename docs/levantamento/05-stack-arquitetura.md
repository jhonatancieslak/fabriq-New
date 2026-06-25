# 05 — Stack Tecnológica e Arquitetura

> Squad: c-level-squad (CAIO Architect) + design-squad + cybersecurity

---

## Decisão de Stack

**Princípios:**
- Stack moderna com grande ecossistema e contratação fácil
- TypeScript em todo o projeto (frontend + backend)
- Multi-tenant desde o primeiro commit
- Mobile-first (operador é o utilizador mais crítico)
- SaaS-ready (billing, planos, subdominios, white-label)
- Não replicar o sistema antigo (Flask/Jinja2/Python)

---

## Stack Definida

### Backend
| Componente | Tecnologia | Justificação |
|---|---|---|
| Runtime | Node.js 22 LTS | Performance, ecossistema, TypeScript nativo |
| Framework | Fastify 5 | 2× mais rápido que Express, schema-first, TypeScript nativo |
| ORM | Prisma | Type-safe, migrations automáticas, excelente DX |
| Base de dados | PostgreSQL 16 | Multi-tenant, JSONB, robusto |
| Cache | Redis 7 | Sessions, blacklist JWT, rate limiting |
| Filas | BullMQ | Jobs assíncronos (notificações, processamento DXF) |
| Auth | JWT (access 15min + refresh 30d) + Redis blacklist | |
| Validação | Zod | Schema validation em rotas e inputs |
| Upload | Multipart + S3-compatible (MinIO local / S3 prod) | DXF, DWG, fotos |
| Email | Nodemailer + SMTP | |
| WhatsApp | Evolution API (HTTP) | |
| DXF/DWG | ezdxf (Python worker via BullMQ) ou dxf-parser (JS) | |
| PDF | PDFKit ou Puppeteer | Folha de corte, relatórios |
| QR Code | qrcode (npm) | |

### Frontend (Painel Admin)
| Componente | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Linguagem | TypeScript |
| Styling | Tailwind CSS v4 |
| Componentes | shadcn/ui (Radix UI base) |
| Estado | Zustand (global) + TanStack Query (server state) |
| Formulários | React Hook Form + Zod |
| Tabelas | TanStack Table |
| Gráficos | Recharts |
| Upload | react-dropzone |
| Notificações UI | Sonner (toasts) |

### PWA Operador
| Componente | Tecnologia |
|---|---|
| Framework | Next.js 15 (rota `/operador/*`) ou app separada |
| PWA | next-pwa (Workbox) |
| Câmara | MediaDevices API (nativo) |
| Assinatura | react-signature-canvas |
| QR Scanner | html5-qrcode |
| Offline | Service Worker + cache estratégico |
| Tema | Dark mode obrigatório (chão de fábrica, melhor contraste) |

### Infraestrutura
| Componente | Tecnologia |
|---|---|
| VPS | Mesmo servidor (verificar portas disponíveis) |
| Proxy | Nginx |
| Processo | PM2 (Node.js) |
| SSL | Let's Encrypt (Certbot) |
| Storage | MinIO (local) → Cloudflare R2 (produção) |
| CI/CD | GitHub Actions → deploy automático |

---

## Arquitetura Multi-Tenant

### Estratégia: Row-Level Tenancy

Cada registo na base de dados tem `tenant_id` (UUID).
Uma empresa = um tenant.
Nunca retornar dados sem filtrar por `tenant_id`.

```
┌─────────────────────────────────────┐
│  fabriq.pt / app.fabriq.pt         │  ← domínio principal
├─────────────────────────────────────┤
│  empresa1.fabriq.pt                 │  ← subdomínio (plano Pro+)
│  empresa2.fabriq.pt                 │  ← subdomínio (plano Pro+)
│  ordens.clientexyz.pt               │  ← domínio próprio (white-label)
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Nginx (proxy + SSL wildcard)       │
└───────────────┬─────────────────────┘
                │
         ┌──────▼──────┐
         │  Next.js    │  (frontend + SSR)
         └──────┬──────┘
                │ API calls
         ┌──────▼──────┐
         │  Fastify    │  (API REST /api/v1/*)
         └──────┬──────┘
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
PostgreSQL    Redis       BullMQ
(dados)      (cache)     (jobs async)
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
                  Email    WhatsApp   PDF/DXF
                 (SMTP)  (Evolution)  (worker)
```

### Resolução de tenant
O tenant é identificado pelo subdomínio ou por header `X-Tenant-ID` (API).

```
Middleware Fastify:
1. Extrai subdomínio da request
2. Busca tenant_id na tabela `tenants` (com cache Redis 5min)
3. Injeta tenant_id em todos os handlers via request context
4. Query hook Prisma: WHERE tenant_id = ctx.tenantId
```

---

## Estrutura de Pastas do Projeto

```
/var/www/fabriq/
├── docs/                    # Documentação (este levantamento)
├── squads/                  # Agentes (gitignored)
├── rtk/                     # RTK CLI (gitignored)
├── CLAUDE.md
├── .gitignore
│
├── apps/
│   ├── api/                 # Fastify backend
│   │   ├── src/
│   │   │   ├── modules/     # Módulos por domínio (orders, clients, etc.)
│   │   │   ├── shared/      # Middleware, utils, types
│   │   │   ├── jobs/        # BullMQ workers
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── package.json
│   │
│   └── web/                 # Next.js frontend (admin + PWA operador)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (admin)/         # Painel admin
│       │   │   ├── (operador)/      # PWA operador
│       │   │   ├── (public)/        # Verificação, demo
│       │   │   └── api/             # Route handlers Next.js
│       │   ├── components/
│       │   ├── lib/
│       │   └── styles/
│       └── package.json
│
└── package.json             # Monorepo root (pnpm workspaces)
```

### Monorepo com pnpm workspaces
Um repositório, dois apps (`api` + `web`), packages partilhados (`@fabriq/types`, `@fabriq/utils`).

---

## Portas (verificar antes de usar)

Portas já em uso no servidor (do CLAUDE.md):
`80, 443, 3306, 5432, 6379, 8080, 8101-8103, 8200, 8443, 4000, 5050, 3001`

**Portas reservadas para o FABRIQ:**
- API Fastify: `8190`
- Next.js dev: `3190`
- MinIO: `9190` / `9191` (console)

---

## Segurança (visão geral — detalhe em `07-seguranca-auditoria.md`)

- JWT com blacklist Redis (revogação imediata)
- Rate limiting por IP e por tenant (Fastify rate-limit)
- Zod em todas as rotas (sem input não validado)
- Helmet (HTTP security headers)
- CORS configurado por tenant
- Audit log de toda ação crítica
- Senhas: bcrypt rounds 12 (nunca MD5)
- Dados sensíveis em repouso: AES-256-GCM
- Uploads: validação de MIME type + extensão + tamanho máximo
- SQL injection: impossível via Prisma (queries parametrizadas)
