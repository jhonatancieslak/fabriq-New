# Estado Atual — FABRIQ

## Última sessão: 2026-06-25

### O que foi feito
- Fase 0 concluída: estrutura base do monorepo
- Containers Docker do projeto antigo removidos (portas libertas)
- pnpm workspaces: apps/api (Fastify) + apps/web (Next.js)
- Prisma schema completo: 18 modelos, todos os enums, índices multi-tenant
- Migration `init` aplicada no PostgreSQL (fabriq_db / user fabriq)
- API Fastify testada e funcional na porta 8190 (/health → 200 OK)
- Next.js configurado na porta 3190 com cores da marca
- PM2 ecosystem.config.js pronto para produção
- Branding FABRIQ.IA: Montserrat ExtraBold + amarelo #EAB308

### Portas FABRIQ em uso
- 8190 → Fastify API
- 3190 → Next.js web

### Próximo passo — Fase 1 (admin)
1. Auth: POST /api/v1/auth/login (users), POST /api/v1/auth/token (operators)
2. Middleware de tenant (resolução por subdomínio)
3. Layout do painel admin (sidebar, header com FABRIQ.IA)
4. Módulo Clientes (CRUD completo)
5. Módulo Obras
6. Módulo Ordens de Serviço (o núcleo)
