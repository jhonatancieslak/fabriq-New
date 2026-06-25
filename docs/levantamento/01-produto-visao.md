# 01 — Produto: Visão e Posicionamento

> Squad: hormozi-squad + brand-squad + c-level-squad

---

## O Produto

**FABRIQ** é um SaaS de gestão de ordens de serviço para empresas de corte CNC laser, quinagem e guilhotina.

Não é um ERP. Não é um MES genérico. É a ferramenta específica para o chão de fábrica metalomecânico — onde uma folha de corte tem de chegar ao operador, ser executada, fotografada, assinada e faturada sem fricção.

---

## O Problema Real (Hormozi: Grand Slam Offer)

As PMEs de corte laser vivem com:

1. **Ordens em papel** — perdem-se, rasuradas, ilegíveis
2. **WhatsApp como sistema** — "aquela peça ficou pronta?" em 15 grupos
3. **Sem rastreabilidade** — quem cortou, quando, quanto tempo, sobrou chapa?
4. **Operador sem parâmetros** — material novo → pergunta ao chefe → pausa produção
5. **Faturação cega** — financeiro não sabe o que foi produzido nem o custo real
6. **Sem prova de execução** — cliente questiona, empresa não tem como provar

**Custo oculto**: horas perdidas, retrabalho, peças erradas, discórdias com clientes.

---

## A Promessa

> "Da ordem ao faturamento — sem papel, sem WhatsApp, sem dúvida."

O FABRIQ digitaliza o ciclo completo:
**Criar ordem → Operador executa → Foto prova → Assinatura digital → Faturação**

---

## Público-Alvo

### Cliente primário (quem paga)
**PME metalomecânica** com pelo menos uma máquina de corte CNC laser, quinagem ou guilhotina.

- Tamanho: 3 a 50 funcionários
- Facturação típica: 200k€ a 5M€/ano
- Localização: Portugal, Brasil, Espanha
- Decisor: dono/gerente ou responsável de produção

### Perfis de utilizador dentro da empresa
| Perfil | Papel | Dispositivo |
|---|---|---|
| Admin / Gestor | Cria ordens, gere clientes, vê relatórios | Desktop |
| Operador CNC | Executa ordens, tira fotos, regista tempo | Tablet/Mobile (PWA) |
| Financeiro | Aprova faturação, exporta para contabilidade | Desktop |
| Solicitador | Cria pedidos, recebe notificações de conclusão | Desktop/Mobile |
| Cliente final | Recebe confirmação, vê foto da peça (futuro) | Email/WhatsApp |

### Segmento de entrada (beachhead)
Empresas de **corte laser CNC** (fibra ou CO₂) que ainda gerem ordens em papel ou WhatsApp.
Portugal primeiro → Brasil → LATAM espanhola.

---

## Proposta de Valor (Al Ries: owning a word)

**A palavra que o FABRIQ vai possuir na mente do cliente:**
> **"Controlo"**

Não é o software de corte. Não é o ERP. É o **controlo total do que acontece no chão de fábrica** — em tempo real, com prova fotográfica, assinado e pronto a faturar.

### Value Equation (Hormozi)
- **Dream outcome**: zero ordens perdidas, faturação 100% rastreável, operador autónomo
- **Perceived likelihood**: demo funcional com dados reais do cliente
- **Time to value**: funcional no 1.º dia (sem migração complexa)
- **Effort & sacrifice**: instalação zero (SaaS), formação em 1h

---

## Diferenciais vs. Sistema Antigo (referência, não replicar)

O sistema antigo (`/var/www/pipesolutions/nesting`) foi construído para **uma empresa específica**. O FABRIQ é construído para **qualquer empresa do setor**.

Diferenças de abordagem:
- Multi-tenant desde o primeiro dia (não adaptar depois)
- Stack moderna (não Flask/Jinja2 SSR)
- UX mobile-first (não adaptar desktop para mobile)
- SaaS com billing, planos e white-label desde o design
- IA como produto, não como script de importação
- Internacionalização (PT, EN, ES) desde o início

---

## Modelo de Negócio

### Venda principal
SaaS com planos mensais/anuais (ver `09-saas-planos-comercial.md`)

### Venda secundária (diferenciador de distribuição)
**Vender à empresa de laser que vendeu a máquina.**
A empresa que vende máquinas CNC conhece TODOS os clientes do setor.
Parceria B2B2B: eles oferecem o FABRIQ aos clientes como valor acrescentado à máquina.

### Upsells
- White-label (empresa de laser tem o software com a própria marca)
- Subdomínio personalizado (`ordens.empresaxyz.com`)
- Módulo de orçamentos
- Módulo de manutenção preventiva
- API para integração com ERP do cliente

### Conta demo
Ambiente demonstrativo público com dados fictícios reais.
Botão "Quero para a minha empresa" → lead qualificado.
