# Stock de Chapas e Controlo de Gás (Flask NestCut)

Implementado em 2026-09-21 em `/var/www/fabriq/services/nesting`. Serviço systemd: `nestcut`.
Nota: `services/nesting` está no `.gitignore` do repo raiz — o código não é versionado aqui.

## Visão geral

Três QR codes, abrem páginas públicas (sem login, sem PWA) protegidas só por um token na URL:

| QR | URL | Função |
|---|---|---|
| Entrada de chapas | `/q/chapa-entrada/<token>` | Receção de chapas, gera stock |
| Baixa de chapas | `/q/chapa-baixa/<token>` | Saída por obra (nesting) ou manual (mm) |
| Gás | `/q/gas/<token>` | Receção de packs + início/fim de uso |

Chapas e gás são módulos **separados** (blueprints, tabelas e menus próprios).
O módulo antigo `Chapa`/`MovimentoChapa` (`/chapas`) continua desativado (404) e não é usado.

## Tokens dos QR

- `token = HMAC-SHA256(SECRET_KEY, "stock-qr:<tipo>")[:24]` — `app/utils/stock_qr.py`.
- Determinístico: o QR impresso nunca muda e o token não fica na BD.
- **Trocar `SECRET_KEY` invalida os QRs impressos** (reimprimir).
- Sem login: a identificação de quem operou é o nome digitado + assinatura (entradas).
- Rotas `/q/*` isentas de CSRF (`csrf.exempt` em `app/__init__.py`); não há rate limiting.

## Chapas

### Entrada (`/q/chapa-entrada/<token>`)
Cabeçalho: data, fornecedor, nº fatura, foto da fatura, observações, recebido por, assinatura (obrigatórios: nome e assinatura).
Linhas (até 50, dinâmicas): material, espessura (mm), largura (mm), comprimento (mm), quantidade, colada, aparência, foto.
Ao gravar cria 1 `RececaoChapa` + N `LinhaChapa` com `quantidade_atual = quantidade_inicial` (stock imediato).

### Baixa (`/q/chapa-baixa/<token>`)
- **Por obra:** escolhe obra (+ ordem opcional) e o lote de stock, quantidade > 0. Endpoint auxiliar
  `/q/chapa-baixa/<token>/obra/<obra_id>` devolve as ordens com as `ChapasOrdem` (nesting); a página destaca
  os lotes com mesma espessura e medida. A ordem tem de pertencer à obra.
- **Manual:** quantidade (pode ser 0) e/ou medida retirada em mm (largura × comprimento) + motivo.
  Com quantidade 0 é obrigatória a medida (registo de corte parcial, não desconta folhas).
- Recusa quantidade > `quantidade_atual`. A linha é bloqueada (`with_for_update`) durante a baixa.

### Modelo de dados
- `rececoes_chapa` — cabeçalho: `data, fornecedor, numero_fatura, observacoes, recebido_por, assinatura, foto_fatura`.
- `linhas_chapa` — unidade de stock: `rececao_id, material, espessura, colada, largura, comprimento, aparencia, quantidade_inicial, quantidade_atual, foto`.
- `baixas_chapa` — saídas: `linha_id, tipo (obra|manual), quantidade, obra_id, ordem_corte_id, largura_mm, comprimento_mm, motivo, baixa_por, data`.
- Stock = linhas com `quantidade_atual > 0`. Todas as medidas em mm.

### Admin (login) — menu Stock > Chapas
`/stock/chapas/` stock · `/entradas` (+ `/entradas/<id>` detalhe com fatura e assinatura) · `/saidas` · `/qr` (QRs para imprimir).

## Gás

### Página única (`/q/gas/<token>`)
- **Receção:** data, tipo (nitrogénio/oxigénio), nº do bloco, nº de bar (1–400), fornecedor, nome, assinatura (obrigatória). Cria `PackGas` em `estado='stock'`.
- **Em uso / Vazio:** escolhe o pack (não vazios). `iniciar` (stock → em_uso, grava início e nome) e
  `terminar` (→ vazio, exige bar final 0–400, grava fim e nome). Se terminar sem ter iniciado, o início é preenchido no mesmo instante.

### Modelo de dados
`packs_gas`: `data_rececao, tipo, numero_bloco, bar_inicial, fornecedor, recebido_por, assinatura, estado (stock|em_uso|vazio), iniciado_em/por, terminado_em/por, bar_final`.
`duracao_segundos`/`duracao_hms` = fim − início (ou até agora se ainda em uso). Datas em UTC.

### Admin — menu Stock > Gás
`/stock/gas/` (cheios em stock e em uso) · `/entradas` · `/saidas` (tempos de uso e bar ini → fim) · `/qr`.

## Ficheiros

- Fotos/assinaturas: `services/nesting/uploads/stock/` (fora de `static`; fotos em WebP; assinaturas PNG ≤ 500 KB).
  Servidos só com login em `/stock/chapas/arquivo/<nome>`. Pasta no `.gitignore`; entra no backup só se o backup de ficheiros a incluir.
- Código: `app/routes/stock_chapas.py`, `app/routes/stock_gas.py`, `app/utils/stock_qr.py`,
  `app/templates/stock_chapas/` (inclui `_qr_base.html`, base das páginas públicas), `app/templates/stock_gas/`.
- Models: `RececaoChapa`, `LinhaChapa`, `BaixaChapa`, `PackGas` no fim de `app/models.py`. Config: `STOCK_UPLOAD_FOLDER` em `config.py`.
- Menu lateral: secção "Stock" em `base.html` (visível para admin/utilizador).

## Base de dados
Tabelas criadas no `nesting_db` com `create_all(checkfirst)` (só as 4 novas; nada existente foi alterado).
`nesting_db` tem backup diário (`backup-other-dbs.sh`, 02h30).

## Como verificar
1. Admin: `/stock/chapas/qr` e `/stock/gas/qr` → imprimir/abrir os QRs no telemóvel.
2. Entrada de chapas: preencher, tirar foto, assinar, gravar → aparece em `/stock/chapas/` e `/entradas`.
3. Baixa por obra e manual → `/saidas` e stock descontado.
4. Gás: receção → iniciar → terminar com bar final → `/stock/gas/saidas` mostra a duração.
5. Testar recusas: baixa > stock, sem assinatura, bar fora de 1–400.

## Limitações conhecidas
- Sem edição/anulação de entradas ou baixas no admin (correção só por BD).
- Sem alerta de stock mínimo nem exportação.
- Baixa por obra não marca `ChapasOrdem.baixa_dada` (campo do módulo antigo).
- Fotos das chapas/fatura só aparecem no detalhe da entrada.
