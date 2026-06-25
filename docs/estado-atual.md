# Estado Atual — FABRIQ

## Última sessão: 2026-06-25

### O que foi feito — Fase 1 (concluída base)

**Backend — API funcional e testada**
- Auth: login admin ✅ / login operador ✅ / refresh ✅ / logout ✅
- Clientes: CRUD completo ✅
- Obras: CRUD com relação cliente ✅
- Operadores: CRUD + soft delete ✅
- Máquinas: CRUD ✅
- Materiais: CRUD ✅
- Ordens: criar, listar, detalhe, cancelar ✅
- Etapas: iniciar, concluir (lock Redis anti-duplicado) ✅
- Rotas públicas: verificar por auth_code e QR token ✅
- Seed demo: tenant + admin + operador + materiais + parâmetros IA ✅

**Frontend — Next.js**
- Login page dark (FABRIQ.IA + amarelo) ✅
- Layout admin com sidebar PT-PT ✅
- Dashboard com KPI cards ✅
- Página Ordens com filtros de estado ✅
- Página Obras ✅
- Página Configurações ✅
- Badge component com labels PT-PT ✅
- api.ts: cliente HTTP centralizado ✅

**Documentação**
- doc 13: Nesting — estratégia, CypCut/Lantek/NestCut, roadmap v1→v3 ✅

**Credenciais demo**
- Admin: admin@demo.fabriq.pt / admin123 (tenant slug: demo)
- Financeiro: financeiro@demo.fabriq.pt / financeiro123
- Operador PWA: joao.silva / operador123

### Próximo passo
1. Formulário de criação de ordem (frontend) — núcleo do produto
2. Ligar clientes/obras ao backend com TanStack Query
3. Folha de corte em PDF (backend)
4. Notificações WhatsApp via Evolution API
5. PWA do operador (layout dark, câmara, assinatura)
