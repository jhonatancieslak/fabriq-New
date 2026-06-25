# 04 — Fluxos de Utilizador

> Squad: design-squad (UX Designer + Brad Frost)

---

## Fluxo 1 — Admin cria uma ordem

```
1. Login no painel web (email + senha)
2. Dashboard → botão "Nova Ordem"
3. Seleciona cliente (ou cria novo)
4. Seleciona/cria obra
5. Define etapas:
   a. Escolhe tipo: Corte CNC / Quinagem / Guilhotina
   b. Adiciona etapas extras se necessário (multi-etapa)
6. Carrega DXF/DWG (drag & drop ou selecionar ficheiro)
   - Sistema separa em itens automaticamente
   - Preview de cada ficheiro
7. Por item: confirma descrição, dimensão, quantidade, material, espessura
8. Define operador(es) por etapa
9. Define solicitador (quem recebe notificação)
10. Clica "Gerar Ordem"
    → Número único gerado (OS-YYYYMM-XXXX)
    → Folha de corte disponível para impressão (PDF)
    → QR code incluído na folha
    → Operador recebe notificação WhatsApp/email
11. Admin imprime 2 vias da folha de corte
```

---

## Fluxo 2 — Operador executa uma ordem (PWA)

```
1. Operador recebe WhatsApp: "Nova ordem OS-2026-0042 atribuída a você"
2. Abre PWA no telemóvel/tablet (app instalada via "adicionar ao ecrã inicial")
3. Login com credenciais de operador
4. Dashboard mostra ordens atribuídas

OPÇÃO A — via QR code na folha de corte:
   → Escaneia QR code
   → Abre diretamente a ordem correspondente

OPÇÃO B — via dashboard:
   → Clica na ordem pretendida

5. Vê detalhe da ordem:
   - Cliente, obra, etapa atual
   - Lista de itens (peça, material, espessura, quantidade)
   - Preview DXF (se disponível)
   - Parâmetros sugeridos pela IA (botão "Ver parâmetros")

6. Clica "Iniciar Corte"
   → Hora de início registada
   → Estado muda para EM EXECUÇÃO
   → Solicitador recebe: "⚙️ Ordem OS-2026-0042 iniciada"
   → Bloqueio ativado (outro operador não pode iniciar a mesma ordem)

7. Durante a execução:
   - Pode consultar IA de parâmetros a qualquer momento
   - Pode pausar (com motivo: almoço, avaria, falta de material)

8. Ao concluir, preenche:
   a. Quantidade produzida (ex: 38 de 40 planeadas)
   b. Se incompleta: motivo (falta de chapa / avaria / outro)
   c. Observações livres
   d. Tira foto(s) obrigatória(s) da peça cortada (mínimo 1)
   e. Assina digitalmente na ecrã

9. Clica "Concluir Etapa"
   → Se havia mais etapas: avança para a próxima (notifica operador da próxima)
   → Se era a última etapa: ordem marcada como CONCLUÍDA

10. Notificação automática ao solicitador:
    "✅ Ordem OS-2026-0042 concluída.
     Tempo total: 1h23min | 38 de 40 peças
     Código de autenticidade: FBRQ-2026-0042-A7X3
     [foto miniatura]"
```

---

## Fluxo 3 — Solicitador recebe e valida

```
1. Recebe WhatsApp com resumo da conclusão
2. Clica no link de verificação (ou QR code)
3. Abre página pública da ordem (sem login)
   - Mostra: itens, quantidades, fotos, tempo, operador, código autenticidade
4. Se satisfeito: pode assinar a confirmação digital
5. Vai ao físico, recebe a peça, assina a via 2 da folha impressa
6. Notifica admin: "pode ir para faturação"
```

---

## Fluxo 4 — Admin aprova para faturação

```
1. Admin recebe notificação: "Solicitador confirmou a OS-2026-0042"
2. No painel: vai a Relatórios → Aguardam Faturação
3. Vê a ordem, valida os dados
4. Clica "Enviar para Faturação"
   → Estado muda para AGUARDA FATURAÇÃO
   → Financeiro recebe notificação
```

---

## Fluxo 5 — Financeiro fatura

```
1. Recebe notificação: "Ordem OS-2026-0042 aguarda faturação"
2. Login no painel (perfil financeiro)
3. Vai a Faturação → Pendentes
4. Vê: cliente, obra, data conclusão, itens, custo estimado
5. Seleciona tipo: "Material + Mão de Obra" ou "Só Mão de Obra"
6. Regista valor final
7. Clica "Marcar como Faturado"
   → Estado muda para FATURADA
   → Data de faturação registada
```

---

## Fluxo 6 — Consulta de parâmetros IA (operador)

```
1. Operador no PWA → botão "IA Parâmetros"
2. Seleciona material (lista dropdown)
3. Seleciona espessura (mm)
4. Clica "Consultar"
5. IA retorna:
   - Velocidade (mm/min)
   - Potência (%)
   - Pressão gás (bar)
   - Tipo de gás (N₂ / O₂ / Ar)
   - Nozzle recomendado
   - Notas adicionais
6. Operador testa na máquina
7. Regista resultado:
   - ✅ Funcionou (parâmetros ficam validados)
   - ⚠️ Precisou ajustar (regista os valores reais usados)
   - ❌ Não funcionou (regista o problema)
8. Feedback alimenta a base de dados para melhorar futuros resultados
```

---

## Fluxo 7 — Verificação de autenticidade (auditoria)

```
1. Cliente ou auditor tem o código: FBRQ-2026-0042-A7X3
2. Acede a: app.fabriq.pt/verificar
3. Insere o código
4. Sistema mostra (sem login):
   - Ordem, cliente, obra
   - Data e hora de conclusão
   - Operador (nome, não dados pessoais completos)
   - Quantidade produzida
   - Fotos da execução
   - Assinaturas registadas
5. Pode fazer download do comprovativo em PDF
```

---

## Estados completos de uma Ordem

```
RASCUNHO (admin a preencher)
    ↓
PENDENTE (gerada, aguarda operador)
    ↓
EM EXECUÇÃO — ETAPA N (operador iniciou)
    ↓ (se pausada)
EM PAUSA — ETAPA N
    ↓
ETAPA N CONCLUÍDA → (avança para etapa N+1 se existir)
    ↓ (última etapa concluída)
CONCLUÍDA
    ↓ (admin/solicitador aprova)
AGUARDA FATURAÇÃO
    ↓ (financeiro fatura)
FATURADA
    
Em qualquer estado (até CONCLUÍDA):
    → CANCELADA (com motivo obrigatório)
```
