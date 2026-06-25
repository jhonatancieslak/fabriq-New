# Estado Atual — FABRIQ

## Última sessão: 2026-06-25

### O que foi feito
- Reset completo do diretório `/var/www/fabriq/`
- Clonado `squads/` (xquads-squads) e `rtk/` — ambos no `.gitignore`
- Criado `CLAUDE.md` com todas as regras do projeto
- Levantamento completo criado em `docs/levantamento/` (12 documentos)
  - 01: Produto, visão e posicionamento
  - 02: Mercado e concorrência
  - 03: Módulos e funcionalidades detalhadas
  - 04: Fluxos de utilizador (todos os perfis)
  - 05: Stack tecnológica e arquitetura
  - 06: Modelagem de dados (todas as entidades)
  - 07: Segurança e auditoria
  - 08: IA de parâmetros de corte
  - 09: SaaS, planos e modelo comercial
  - 10: Branding e identidade visual
  - 11: Roadmap (Fase 0 → v2.0)
  - 12: Infraestrutura e deploy

### Decisões tomadas
- Stack: Node.js + Fastify (API) + Next.js 15 (frontend) + TypeScript + PostgreSQL + Redis + BullMQ
- Multi-tenant row-level desde o início
- PWA operador em dark mode, mobile-first
- Monorepo pnpm (apps/api + apps/web)
- Portas FABRIQ: API 8190, Next.js 3190, MinIO 9190/9191
- Nome e branding FABRIQ confirmados
- Sistema antigo apenas como referência funcional — stack completamente diferente

### Próximo passo
- Fase 0: estrutura base do monorepo
  1. Inicializar pnpm workspaces
  2. Setup Fastify API com health check
  3. Setup Next.js com Tailwind + shadcn/ui
  4. Schema Prisma inicial
  5. Nginx + PM2 + systemd para FABRIQ
