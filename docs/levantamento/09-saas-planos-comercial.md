# 09 — SaaS, Planos e Modelo Comercial

> Squad: hormozi-squad + c-level-squad + copy-squad

---

## Modelo SaaS

**Pagamento:** mensalidade ou anual (desconto 2 meses grátis no anual)
**Moeda:** EUR (mercado Portugal — foco exclusivo fase inicial)
**Sem trial livre** — demo agendada ou conta demo pública
**1.º mês gratuito** após assinatura

---

## Planos

### Starter — 49€/mês
**Para quem:** pequena empresa, 1 máquina, 1–3 operadores
- 3 utilizadores admin
- 5 operadores
- 150 ordens/mês
- 1 máquina
- PWA operador
- Notificações WhatsApp + email
- IA parâmetros de corte (base global)
- Suporte via email (48h)
- Subdomínio: `empresa.fabriq.pt`

### Pro — 99€/mês
**Para quem:** empresa em crescimento, 2–3 máquinas
- 10 utilizadores admin
- 20 operadores
- Ordens ilimitadas
- 3 máquinas
- Tudo do Starter +
- Módulo de faturação interno
- Relatórios avançados (Excel, PDF)
- IA parâmetros com feedback próprio
- Conta demo para mostrar a clientes
- Subdomínio personalizado
- Suporte via chat (24h)

### Factory — 199€/mês
**Para quem:** empresa estabelecida, múltiplas máquinas e linhas
- Utilizadores ilimitados
- Operadores ilimitados
- Ordens ilimitadas
- Máquinas ilimitadas
- Tudo do Pro +
- Multi-máquina por etapa
- API REST para integração com ERP
- White-label (logo própria, cores, sem marca FABRIQ)
- Domínio próprio (`ordens.empresa.pt`)
- Relatório diário automático (WhatsApp + email)
- Suporte prioritário (4h)

### Enterprise — Sob consulta
- Tudo do Factory +
- Instalação on-premise (se necessário)
- SLA garantido
- Integração customizada com ERP/MES
- Formação presencial
- Gestor de conta dedicado
- Personalização de módulos

---

## White-Label (Factory+)

A empresa tem o produto com a própria identidade:
- Logo própria em vez do logo FABRIQ
- Cores da empresa
- Domínio próprio (`ordens.empresaxyz.pt`)
- PWA operador com ícone e nome da empresa
- Folha de corte com cabeçalho da empresa
- Sem qualquer menção ao FABRIQ

**Caso de uso principal:** empresa que vende máquinas CNC oferece o software como valor acrescentado com a própria marca.

---

## Parceria B2B2B (canal de distribuição)

**Estratégia:**
A empresa que vende a máquina laser conhece TODOS os compradores.
É o melhor canal de vendas do setor.

**Modelo de parceria:**
- Revendedor oficial FABRIQ
- Revenue share: 20–30% da mensalidade recorrente
- White-label disponível para o revendedor
- O revendedor oferece o FABRIQ como parte do pacote da máquina
- 1.º mês grátis após compra da máquina (custo para o revendedor ou FABRIQ)

**Como qualificar:**
- Empresa que vende máquinas CNC laser em Portugal
- Mínimo 10 clientes instalados
- Compromisso de oferecer a todos os novos clientes

---

## Conta Demo

- URL público: `demo.fabriq.pt`
- Dados fictícios mas realistas (empresa "MetalPro Lda", obras reais, parâmetros reais)
- Todas as funcionalidades ativas (plano Factory)
- Reset automático toda segunda-feira às 08h00
- Botão proeminente: **"Quero para a minha empresa"** → formulário de contacto
  - Nome, empresa, email, telefone, nº de máquinas, país
  - Vai direto para CRM / email do comercial

---

---

## Futuros Módulos Pagos (Upsells)

| Módulo | Preço | Disponibilidade |
|---|---|---|
| Módulo de Orçamentos | +20€/mês | v1.5 |
| Módulo de Manutenção Preventiva | +15€/mês | v2.0 |
| API ERP (acima do Factory) | +30€/mês | v1.5 |
| Relatório diário WhatsApp (acima do Pro) | +10€/mês | v1.5 |
| SMS fallback (sem WhatsApp) | +5€/mês | v2.0 |

---

## Métricas SaaS a Acompanhar

- MRR (Monthly Recurring Revenue)
- ARR
- Churn rate (meta: <5%/mês)
- CAC (Custo de Aquisição de Cliente)
- LTV (Lifetime Value)
- NPS (trimestral)
- Ordens processadas/mês (proxy de engagement)
- DAU operadores PWA (sinal de adoção real)
