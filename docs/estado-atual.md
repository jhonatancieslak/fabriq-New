# FABRIQ.IA — Estado Actual

**Última sessão:** 2026-06-26

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

- Campo "Empresa" (slug) adicionado ao formulário
- Slug é enviado como header `X-Tenant-Slug` à API
- API valida o tenant → retorna tokens isolados
- Tenant hardcode `demo` **removido** — agora dinâmico

---

## O que foi feito nesta sessão (2026-06-26)

### Bugs corrigidos
- **CORS** — `CORS_ORIGIN` estava só com `localhost:3190`. Adicionados todos os domínios de produção
- **"Failed to fetch"** — causado pelo CORS bloqueado no browser
- **Tokens** — frontend lia `data.accessToken` mas API retorna `data.tokens.accessToken`
- **Tailwind purge** — `src/lib/cn.ts` não estava no `content` do tailwind.config → botões e inputs sem estilo
- **Classes CSS** — `card`, `btn-primary`, `badge`, `page-title` etc. nunca foram definidas em `globals.css`

### Design
- **Login** redesenhado: esquerda preta com SVG ilustração industrial (laser CNC + quinadeira + ordens de fabrico), direita branca com formulário limpo
- **Sidebar** dark (`#07080A`) com ícone relâmpago amarelo, active state amarelo
- **Dashboard** com KPIs coloridos (barra lateral por card), atalhos rápidos, estado do sistema
- **globals.css** com `@layer components` completo: cards, botões, inputs, badges, tipografia, table-row

### Infra / BD
- Tenant `pipesolutions` criado com admin `jhonatan.cieslak94@gmail.com`
- Multi-tenant login funcional via campo slug no formulário

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

## Próximos passos

1. **Gestão de utilizadores** — CRUD de users com perfis por tenant (admin/financeiro/solicitador)
2. **Portal Financeiro** — ordens `CONCLUÍDA` → aprovar → `FATURADA` + relatório
3. **Portal Solicitador** — criar pedidos, ver ordens, confirmar entrega
4. **Configurações da empresa** — máquinas, materiais, custos, Evolution API, SMTP
5. **Página pública `/verificar/[authCode]`** — sem login, prova de execução
6. **Dropdowns do formulário de ordens** ligados à API real (clientes, obras, máquinas, operadores)
7. **Upload de fotos** na PWA (câmara → backend)
8. **Billing / planos** — bloquear funcionalidades por plano (fase futura, ainda sem cobrança)
