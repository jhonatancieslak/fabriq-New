# 03 — Módulos e Funcionalidades

> Squad: design-squad + c-level-squad

---

## Visão Geral dos Módulos

```
FABRIQ
├── [ADMIN] Painel Web
│   ├── Dashboard
│   ├── Clientes & Obras
│   ├── Ordens de Serviço (multi-etapa)
│   ├── Operadores
│   ├── Materiais & Espessuras
│   ├── IA — Parâmetros de Corte
│   ├── Relatórios & Faturação
│   └── Configurações
│
├── [OPERADOR] PWA Mobile
│   ├── Dashboard de ordens atribuídas
│   ├── Executar ordem (por etapa)
│   ├── QR scan para iniciar
│   ├── Registo de tempo, quantidade, observações
│   ├── Foto obrigatória na conclusão
│   ├── Assinatura digital
│   └── IA parâmetros (consulta rápida)
│
├── [SOLICITADOR] Notificações
│   ├── WhatsApp (Evolution API)
│   └── Email (fallback)
│
└── [FINANCEIRO] Módulo de Faturação
    ├── Ordens concluídas por aprovar
    ├── Aprovação para faturar
    └── Marcar como faturado
```

---

## Módulo 1 — Dashboard (Admin)

**KPIs principais:**
- Ordens abertas / em execução / concluídas hoje
- Tempo médio de corte (por máquina, por operador)
- Área produzida (m²)
- Ordens por etapa (pendente → corte → quinagem → guilhotina → concluído)

**Widgets:**
- Lista de ordens em execução (live)
- Alertas: ordens atrasadas, sem operador atribuído
- Gráfico semanal de produção

---

## Módulo 2 — Clientes & Obras

**Clientes:**
- Nome, NIF/CNPJ, email, telefone, morada
- Histórico de obras e ordens

**Obras (projetos):**
- Nome/número da obra, cliente, descrição
- Estado (aberta / em produção / concluída / faturada)
- Ordens associadas com progresso visual

**Solicitadores:**
- Cadastro de quem pode pedir ordens
- Telefone WhatsApp + email para notificações

---

## Módulo 3 — Ordens de Serviço (núcleo do produto)

### Criação da ordem
1. Selecionar cliente + obra
2. Definir tipo de processo inicial:
   - Corte CNC Laser
   - Quinagem
   - Guilhotina
3. Carregar ficheiros DXF/DWG (unitário ou lote)
   - Upload gera lista de itens automaticamente
   - Cada item: descrição da peça, dimensão detectada, quantidade
4. Informar por item: material, espessura
5. Definir etapas da ordem (multi-etapa):
   - Ex: Corte CNC → Quinagem
   - Ex: Guilhotina → Corte CNC → Quinagem
   - Ex: Só Corte CNC
6. Atribuir operador responsável (por etapa ou global)
7. Atribuir solicitador (quem recebe notificação na conclusão)
8. Gerar folha de corte

### Folha de Corte
- Número único da ordem (OC-YYYYMM-XXXX)
- Código de autenticidade (para auditoria futura)
- QR code para o operador iniciar na PWA
- 2 vias impressas:
  - Via 1: Operador (assina na conclusão)
  - Via 2: Quem retira da produção (assina também)
- Ambas ficam arquivadas digitalmente

### Estados da Ordem
```
PENDENTE → [ETAPA 1: EM EXECUÇÃO] → [ETAPA 1: CONCLUÍDA]
         → [ETAPA 2: EM EXECUÇÃO] → [ETAPA 2: CONCLUÍDA]
         → ... → CONCLUÍDA (todas as etapas)
         → AGUARDA APROVAÇÃO FATURAÇÃO → FATURADA
         
A qualquer momento: CANCELADA
```

### Regras de execução
- Um operador não pode iniciar uma ordem já em execução por outro (código de bloqueio)
- Ao finalizar etapa: informa quantidade cortada vs. planeada (ex: 38 de 40)
- Motivo se incompleta: falta de chapa, avaria, outro
- Foto obrigatória antes de concluir (mínimo 1, máximo 10)
- Campo de observações livre
- Assinatura digital do operador na PWA

### Após conclusão de todas as etapas
- Notificação automática ao solicitador (WhatsApp + email)
- Mensagem inclui: ordem, obra, tempo total, código de autenticidade, foto miniatura
- Quem criou a ordem pode marcar "pronto para faturar"

---

## Módulo 4 — Multi-Etapa (detalhe)

Cada ordem pode ter N etapas sequenciais:

| Etapa | Tipo | Operador | Máquina |
|---|---|---|---|
| 1 | Corte CNC Laser | João | Laser A |
| 2 | Quinagem | Pedro | Quinadeira B |
| 3 | Guilhotina | — (atribuir depois) | Guilhotina C |

- Etapas avançam automaticamente ao concluir a anterior
- Cada etapa tem o seu tempo, operador, fotos e observações
- Folha de corte mostra a etapa atual

---

## Módulo 5 — IA de Parâmetros de Corte

(Detalhe completo em `08-ia-parametros.md`)

**Acesso via PWA do operador:**
1. Selecionar material (aço, inox, alumínio, cobre, etc.)
2. Selecionar espessura (mm)
3. IA retorna parâmetros sugeridos:
   - Velocidade de corte (mm/min)
   - Potência do laser (%)
   - Pressão do gás (bar)
   - Tipo de gás (O₂, N₂, ar)
   - Diâmetro do bico (nozzle)
   - Frequência / Duty cycle
4. Operador testa e regista resultado: **funcionou / não funcionou / ajustado**
5. Feedback melhora a IA ao longo do tempo

---

## Módulo 6 — Notificações

**WhatsApp (Evolution API):**
- Nova ordem atribuída → operador
- Ordem iniciada → solicitador
- Ordem concluída → solicitador (com foto + código autenticidade)
- Ordem pronta para faturar → financeiro

**Email (fallback obrigatório):**
- Mesmo conteúdo do WhatsApp
- HTML responsivo
- Se operador/solicitador não tem WhatsApp

**Regra:** sistema tenta WhatsApp primeiro. Se falhar ou número não existe, envia email.

---

## Módulo 7 — Relatórios

**Produção:**
- Ordens por período (dia/semana/mês)
- Por operador (tempo médio, quantidade, taxa de conclusão)
- Por material/espessura
- Por máquina
- Taxa de ordens completas vs. incompletas

**Financeiro:**
- Custo estimado por ordem (tempo × tarifa + material)
- Ordens aguardando faturação
- Ordens faturadas vs. não faturadas
- Mapa de obra (todas as ordens de uma obra + custo total)

**Exportação:**
- PDF (folha de resumo)
- Excel (dados brutos)

---

## Módulo 8 — Faturação

Acesso exclusivo para perfil **Financeiro**.

**Fluxo:**
1. Financeiro vê lista de ordens concluídas aguardando aprovação
2. Verifica: material e mão de obra? Só mão de obra?
3. Vê data de conclusão, cliente, dados da ordem
4. Regista valor de custo
5. Clica "Faturado" → ordem muda status para FATURADA

**Não é emissor de fatura** — é o controlo interno antes de emitir na contabilidade.

---

## Módulo 9 — Configurações (Admin)

- Empresa (nome, logo, NIF, morada)
- Máquinas (nome, tipo, modelo)
- Materiais e espessuras disponíveis
- Tabela de custos (€/hora por máquina, €/m² por material)
- Operadores (nome, máquina, WhatsApp, email)
- Utilizadores admin (perfis: admin, financeiro, solicitador)
- Integrações (Evolution API, SMTP)
- Plano ativo (visível mas não editável — gerido via portal FABRIQ)

---

## Módulo 10 — Conta Demo

- Ambiente isolado com dados fictícios reais e realistas
- Acesso público (email + senha temporária ou link direto)
- Botão "Quero para a minha empresa" → formulário de contacto/lead
- Não expira (sempre disponível, reset automático semanal)
