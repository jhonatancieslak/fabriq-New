# Estado Atual — FABRIQ

## Última sessão: 2026-06-25

### O que foi feito — Fase 1 (em progresso)

**Backend (API Fastify)**
- Auth completo: POST /api/v1/auth/login, /operator/token, /refresh, /logout
  - JWT access (15min) + refresh token com rotação (30d)
  - Bcryptjs hash de senhas (12 rounds)
  - Redis blacklist via RefreshToken revogation
  - Audit log em login/logout/tentativas falhadas
- Middleware de tenant (resolução por subdomínio + header X-Tenant-Slug)
- Middleware de auth (requireAuth, requireRole, requireOperator)
- Módulo Clientes: CRUD completo com audit
- Módulo Obras (Projects): CRUD com relação cliente
- Módulo Operadores: CRUD, soft delete, hash de senha

**Frontend (Next.js)**
- Logo FABRIQ.IA (Montserrat ExtraBold, branco + amarelo)
- Layout admin com sidebar (ícones Lucide, active state)
- Dashboard page com KPI cards
- Clients page (tabela skeleton)
- Login page (dark, amarelo nos focus states)

### Estrutura de rotas API disponíveis
- GET  /health
- GET  /api/v1/health
- POST /api/v1/auth/login
- POST /api/v1/auth/operator/token
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout
- GET/POST/PATCH/DELETE /api/v1/clients
- GET/POST/PATCH /api/v1/projects
- GET/POST/PATCH/DELETE /api/v1/operators

### Próximo passo
1. Seed de tenant + admin user para testar login
2. Ligar frontend ao backend (TanStack Query + fetch)
3. Módulo de Ordens de Serviço (núcleo do produto)
4. Nginx config para servir o projeto
