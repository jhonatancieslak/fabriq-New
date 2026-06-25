# FABRIQ.IA — Estado Actual

**Última sessão:** 2026-06-25

## O que foi feito

### Backend
- `pdf.service.ts` + `pdf.routes.ts` — folha de corte HTML 2 vias (impressão directa, QR code por ordem)
- `notifications.service.ts` — WhatsApp via Evolution API + fallback email + log DB
- `cutting-params.routes.ts` — parâmetros IA com interpolação linear entre espessuras; feedback operador actualiza confidence
- `GET /api/v1/operators/:id` — detalhe de operador
- Todos os módulos registados no `main.ts`
- ecosystem.config.js corrigido (path absoluto)
- API a correr via PM2 (health: OK)

### Frontend Admin
- `/orders/new` — formulário criação ordem 4 passos (obra/cliente → etapas → peças → confirmar)
- `/orders/[id]` — detalhe ordem: progresso por etapa, peças, botão folha de corte
- `/operators` — lista operadores com botão "Acesso PWA"
- `/operators/[id]/access` — QR code + link copiável + botão WhatsApp para enviar acesso ao operador
- Sidebar: item "Operadores" adicionado

### Frontend PWA Operador (dark mode, mobile-first)
- `/op/login` — login com slug empresa + username + password
- `/op/dashboard` — dashboard tarefas: em execução / pendentes / concluídas hoje
- `/op/ordem/[id]` — iniciar etapa, concluir etapa, foto câmara, lista peças
- Layout PWA com barra de navegação inferior
- Token separado (`fabriq_op_token`) do admin

## Próximos passos
1. **Ligar dropdowns formulário** às APIs reais (GET /clients, /projects, /machines, /operators)
2. **Upload de fotos** na PWA (POST /api/v1/orders/stages/:id/photos)
3. **Página verificação pública** `/verificar/[authCode]` — sem login, mostra estado da ordem
4. **Nginx** — configurar domínios app.fabriq.pt (admin) e rota /op/ (PWA)
5. **Dashboard admin** com métricas reais

## Decisões tomadas
- Folha de corte: HTML puro servido pelo backend, impressão via window.print() no browser (sem Puppeteer em v1)
- QR code na página de acesso do operador: gerado client-side com biblioteca qrcode
- Interpolação linear de parâmetros IA: encontra valores abaixo/acima da espessura pedida
- PWA login separado em /op/login (não /login) para distinção clara admin vs operador
