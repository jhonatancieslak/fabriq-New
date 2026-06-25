# FABRIQ.IA — Estado Actual

**Última sessão:** 2026-06-25

---

## URLs activos

| URL | Serviço | Porta |
|---|---|---|
| https://sistema.fabriq.pt | Admin (Next.js) | 3191 |
| https://app.fabriq.pt | PWA Operador (Next.js) | 3191 |
| https://api.fabriq.pt | API Fastify | 8190 |

**Credenciais demo:**
- Admin: `admin@demo.fabriq.pt` / `admin123`
- Operador PWA: slug `demo` / utilizador `joao.silva` / `operador123`

---

## Problema de CSS resolvido (importante para amanhã)

**Causa raiz identificada:** O `solarnest-web` (outro projecto neste servidor) também usava a porta 3190. O Nginx do FABRIQ estava a fazer proxy para o Next.js errado, servindo o build do Solar em vez do FABRIQ.

**Solução aplicada:**
- `fabriq-web` mudado para **porta 3191**
- Nginx de `sistema.fabriq.pt`, `app.fabriq.pt` e `saas.fabriq.pt` actualizados para 3191
- `pm2 save` guardado

**Outro problema resolvido:** `postcss.config.mjs` estava em falta — sem ele, o `@apply` do Tailwind não era processado e o CSS ficava literal. Resolvido com o ficheiro de config e reescrita do CSS para classes inline.

**Estado do CSS actual:** ✅ 29KB, classes geradas correctamente (`bg-yellow-400`, `rounded-3xl`, `gradient-hero`, etc.)

---

## O que foi feito nesta sessão

### Backend
- Folha de corte HTML (`/api/v1/pdf/orders/:id/cutting-sheet`) — 2 vias, impressão directa
- Notificações WhatsApp via Evolution API + log DB
- Parâmetros IA com interpolação linear entre espessuras + feedback do operador
- `GET /api/v1/operators/:id`

### Frontend Admin
- Formulário criação ordem: 4 passos (cliente/obra → etapas → peças → confirmar)
- Detalhe de ordem com progresso de etapas e botão folha de corte
- Página Operadores com botão "Acesso PWA"
- Página `/operators/[id]/access`: QR code + link + envio WhatsApp
- Dashboard com KPIs reais da API

### Frontend PWA Operador (dark, mobile-first)
- `/op/login` — login dedicado operador
- `/op/dashboard` — tarefas em execução / pendentes
- `/op/ordem/[id]` — iniciar/concluir etapa, foto câmara
- `/op/ordens` — pesquisa por código/auth code
- `/op/parametros` — consulta parâmetros IA

### Design System
- `postcss.config.mjs` criado (fix crítico)
- `globals.css`: tokens de marca, `gradient-hero`, `font-display`, scrollbar
- `tailwind.config.ts`: `brand-yellow`, `brand-blue`, sombras, animação fade-in
- `src/lib/cn.ts`: constantes de classes Tailwind reutilizáveis (`cls.*`)
- Login admin: split hero/formulário, Montserrat display, gradiente azul
- Login operador: dark mode, `dark-input`, botão amarelo

### Infra
- `sistema.fabriq.pt`: SSL via certbot --expand, Nginx configurado, **porta 3191**
- `app.fabriq.pt`: substituído sistema antigo, PWA operador, redireciona `/` → `/op/login`

---

## Próximos passos (amanhã)

1. **Verificar design no browser** — confirmar que a estilização está visível após fix da porta
2. **Dropdowns do formulário** ligados à API real (clientes, obras, máquinas, operadores)
3. **Página pública de verificação** `/verificar/[authCode]` — sem login, estado da ordem
4. **Upload de fotos** na PWA (câmara → backend)
5. **Lista de ordens admin** com filtros e paginação reais
6. **Configurações do tenant** (Evolution API URL/key, SMTP, etc.)
