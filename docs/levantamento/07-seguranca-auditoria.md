# 07 — Segurança e Auditoria

> Squad: cybersecurity

---

## Princípios Base

1. **Defense in depth** — múltiplas camadas, não depender de uma só
2. **Zero trust** — verificar sempre, mesmo requests internos
3. **Least privilege** — cada perfil acede apenas ao que precisa
4. **Audit everything** — toda ação crítica fica registada, imutável
5. **Fail secure** — em caso de erro, negar acesso

---

## Autenticação

### Painel Admin (users)
- Email + senha (bcrypt, mínimo 12 rounds — **nunca MD5**)
- JWT access token (15 minutos, assinado RS256)
- JWT refresh token (30 dias, armazenado em httpOnly cookie)
- Redis blacklist para revogação imediata (logout + expiração forçada)
- Bloqueio após 5 tentativas falhadas (15 minutos, por IP + por email)

### PWA Operador (operators)
- Username + senha (bcrypt, mínimo 12 rounds)
- Mesmo sistema JWT
- QR code da folha de corte usa `access_token` (UUID) — não é JWT, é lookup na DB
  - Válido apenas para leitura da ordem específica
  - Não concede acesso a outros recursos

---

## Autorização (RBAC)

| Permissão | admin | financial | requester | operator |
|---|---|---|---|---|
| Criar/editar ordens | ✅ | ❌ | ❌ | ❌ |
| Ver todas as ordens | ✅ | ✅ | Só as suas | Só atribuídas |
| Executar etapas | ❌ | ❌ | ❌ | ✅ |
| Módulo faturação | ❌ | ✅ | ❌ | ❌ |
| Configurações | ✅ | ❌ | ❌ | ❌ |
| Relatórios completos | ✅ | ✅ | ❌ | ❌ |
| Ver parâmetros IA | ✅ | ❌ | ❌ | ✅ |

**Implementação:** middleware Fastify verifica role antes de cada handler.
Nunca confiar no frontend para controlo de acesso.

---

## Multi-Tenant Isolation

- Cada query ao PostgreSQL **obrigatoriamente** inclui `WHERE tenant_id = :tenantId`
- Middleware Prisma global injeta o filtro automaticamente (Prisma middleware)
- Testes automatizados verificam cross-tenant leakage
- Logs de auditoria registam qualquer acesso cross-tenant como incidente de segurança

---

## Validação de Input

- **Zod** em todas as rotas (body, query, params, headers)
- Upload de ficheiros:
  - MIME type verificado no servidor (não só extensão)
  - Extensões permitidas: `.dxf`, `.dwg`, `.jpg`, `.jpeg`, `.png`
  - Tamanho máximo: 50MB por ficheiro, 200MB por upload lote
  - Ficheiros armazenados fora do webroot (nunca servidos diretamente sem autenticação)
- Nenhum input do utilizador é executado ou interpolado em queries (Prisma parametrizado)

---

## Rate Limiting

| Endpoint | Limite |
|---|---|
| POST /auth/login | 5 req/min por IP |
| POST /auth/token (operador) | 5 req/min por IP |
| POST /auth/refresh | 20 req/min por user |
| GET /api/v1/* (geral) | 100 req/min por tenant |
| POST /api/v1/orders | 30 req/min por tenant |
| POST /api/v1/files/upload | 10 req/min por tenant |

Plugin: `@fastify/rate-limit` com Redis como store.

---

## HTTP Security Headers (Helmet)

```
Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

Nota: `camera=(self)` necessário para PWA do operador tirar fotos.

---

## CORS

- Configurado por tenant (baseado em domínio/subdomínio do tenant)
- Nunca `Access-Control-Allow-Origin: *` em rotas autenticadas
- Credenciais apenas para domínios explicitamente permitidos

---

## Dados Sensíveis

| Dado | Proteção |
|---|---|
| Senhas | bcrypt rounds 12 (nunca armazenar em texto) |
| Tokens de refresh | Hash SHA-256 na DB (nunca o token em si) |
| API keys | Hash SHA-256 na DB |
| Credenciais SMTP/Evolution | AES-256-GCM em `tenants.settings` |
| Fotos de produção | S3 privado, URLs assinados temporários (15min) |
| Ficheiros DXF/DWG | S3 privado, acesso por URL assinado |

---

## Auditoria (Audit Log)

Tabela `audit_logs` — **append-only**, nunca modificada após INSERT.

**Eventos auditados:**
- Login / logout / tentativa falhada
- Criação / edição / cancelamento de ordem
- Início / pausa / conclusão de etapa
- Upload de ficheiro
- Acesso a parâmetros IA
- Marcação para faturação / faturado
- Criação / edição de utilizadores e operadores
- Alteração de configurações
- Acesso via QR code / token público
- Qualquer erro 403/401 (acesso negado)

**Campos:**
- `action` (ex: `order.stage.completed`)
- `entity_type` + `entity_id`
- `user_id` ou `operator_id`
- `tenant_id`
- `ip_address`
- `user_agent`
- `payload` JSONB (antes/depois para edições)
- `created_at`

---

## Código de Autenticidade das Ordens

Formato: `FBRQ-YYYYMM-{order_number}-{6chars_random}`
Exemplo: `FBRQ-202606-0042-A7X3K9`

- Gerado no momento da conclusão da última etapa
- Armazenado em claro na DB (é público por design — para verificação)
- Página pública `/verificar/{auth_code}` mostra dados da execução
- Não concede acesso ao painel, apenas visualização da prova

---

## Bloqueio de Execução Duplicada

Quando um operador inicia uma etapa:
1. `order_stages.status` muda para `in_progress`
2. Redis key: `lock:stage:{stage_id}` com TTL 24h
3. Qualquer outra tentativa de iniciar a mesma etapa:
   - Verifica Redis → retorna 409 Conflict
   - Mostra no PWA: "Esta etapa está a ser executada por {operador}"
4. Ao concluir ou cancelar: lock libertado

---

## Dependências e Segurança

- `npm audit` obrigatório antes de cada deploy
- Dependências atualizadas mensalmente (ou quando CVE crítico)
- Sem dependências desnecessárias (princípio do menor número)
- Dockerfile com utilizador não-root (quando containerizado)
