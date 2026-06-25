# 11 — Roadmap de Desenvolvimento

> Squad: c-level-squad + advisory-board

---

## Fase 0 — Fundações (Semana 1–2)

**Objetivo:** projeto no ar, base técnica pronta, nada de funcionalidade ainda.

- [ ] Monorepo pnpm (apps/api + apps/web)
- [ ] Fastify API básica (health check, estrutura de módulos)
- [ ] Next.js setup (App Router, Tailwind, shadcn/ui)
- [ ] PostgreSQL + Prisma schema inicial (tenants, users, operators)
- [ ] Redis configurado
- [ ] BullMQ configurado (fila base)
- [ ] Nginx configurado (portas FABRIQ)
- [ ] PM2 configurado
- [ ] CI/CD básico (GitHub Actions → deploy no VPS)
- [ ] Variáveis de ambiente e secrets organizados
- [ ] CLAUDE.md atualizado com estrutura real

---

## Fase 1 — MVP Core (Semana 3–8)

**Objetivo:** uma empresa consegue usar o FABRIQ do zero ao fim (ordem criada, executada, concluída).

### Auth & Multi-tenant
- [ ] Login admin (email + senha + JWT)
- [ ] Login operador (username + senha + JWT)
- [ ] Middleware multi-tenant (resolução por subdomínio)
- [ ] RBAC básico (admin, operator, financial, requester)
- [ ] Registo de novo tenant (manual por agora — só admin FABRIQ)

### Gestão base
- [ ] CRUD Clientes
- [ ] CRUD Obras
- [ ] CRUD Operadores
- [ ] CRUD Máquinas
- [ ] CRUD Materiais + espessuras

### Ordens de Serviço
- [ ] Criar ordem (cliente, obra, etapas, operador)
- [ ] Upload DXF/DWG (S3/MinIO)
- [ ] Preview PNG do DXF
- [ ] Itens da ordem (material, espessura, quantidade)
- [ ] Geração de número único (OS-YYYYMM-XXXX)
- [ ] Geração de auth_code e access_token (QR)
- [ ] Folha de corte PDF (2 vias, QR code incluído)
- [ ] Estado da ordem (pendente → em execução → concluída)

### PWA Operador (MVP)
- [ ] Login PWA
- [ ] Dashboard de ordens atribuídas
- [ ] QR scanner (iniciar ordem via QR code)
- [ ] Iniciar / pausar / concluir etapa
- [ ] Quantidade produzida (planeada vs. real)
- [ ] Tirar foto (câmara nativa)
- [ ] Campo de observações
- [ ] Assinatura digital
- [ ] Instalável como PWA (manifest + service worker)
- [ ] Dark mode

### Notificações
- [ ] WhatsApp via Evolution API (nova ordem, conclusão)
- [ ] Email fallback (SMTP)

### Verificação pública
- [ ] Página `/verificar/{auth_code}` (sem login)
- [ ] Mostra dados da execução + fotos

---

## Fase 2 — IA + Financeiro (Semana 9–14)

**Objetivo:** operador autónomo, ciclo financeiro fechado.

### IA Parâmetros
- [ ] Base de parâmetros importada (CSV → DB)
- [ ] Interface de consulta na PWA (material + espessura → parâmetros)
- [ ] Sistema de feedback (funcionou / ajustou / falhou)
- [ ] Score de confiança
- [ ] Parâmetros específicos por tenant (feedback acumula)

### Multi-etapa
- [ ] Ordens com N etapas sequenciais
- [ ] Avanço automático entre etapas
- [ ] Operador diferente por etapa
- [ ] Folha de corte mostra etapa atual

### Módulo Faturação
- [ ] Aprovação para faturar (admin/solicitador)
- [ ] Interface financeiro (pendentes, aprovados, faturados)
- [ ] Tipo de faturação (material+MO / só MO)
- [ ] Histórico de faturação por obra/cliente

### Relatórios básicos
- [ ] Ordens por período
- [ ] Por operador
- [ ] Por material
- [ ] Exportação PDF e Excel

---

## Fase 3 — SaaS & Onboarding (Semana 15–20)

**Objetivo:** produto vendável, self-service (parcial).

### SaaS
- [ ] Portal FABRIQ (super-admin) para gestão de tenants
- [ ] Planos e limites (starter/pro/factory)
- [ ] Subdomínio automático ao criar tenant
- [ ] White-label (logo + cores por tenant)
- [ ] Billing via Stripe (PT/EU) ou equivalente BR

### Conta Demo
- [ ] Tenant demo com dados fictícios realistas
- [ ] Reset automático semanal (job BullMQ)
- [ ] CTA "Quero para a minha empresa"

### Onboarding
- [ ] Wizard de configuração inicial (após criar tenant)
- [ ] Importar parâmetros IA padrão automaticamente
- [ ] Checklist de setup (máquina, operador, material, 1.ª ordem)

---

## Fase 4 — Crescimento (v2.0)

**Objetivo:** upsells, integrações, escala.

- [ ] API REST pública (integração ERP)
- [ ] Módulo de Orçamentos
- [ ] Módulo de Manutenção Preventiva
- [ ] Relatório diário automático (WhatsApp + email)
- [ ] App mobile nativa (React Native) — se PWA não chegar
- [ ] Internacionalização (PT, EN, ES)
- [ ] Módulo de inventário de chapas (nesting futuro)
- [ ] IA v2 (machine learning com dados acumulados)
- [ ] Integração com software de nesting (DXF → nesting engine)

---

## Prioridade Absoluta para Vender

Para a primeira venda (empresa de laser que comprou a máquina):

**Mínimo viável para fechar o contrato:**
1. Criar ordem com DXF
2. Operador executa via PWA (foto + conclusão)
3. Notificação WhatsApp ao solicitador
4. Folha de corte com QR code
5. Verificação pública do auth_code

**Isto é a Fase 1 — foco total aqui antes de qualquer outra coisa.**
