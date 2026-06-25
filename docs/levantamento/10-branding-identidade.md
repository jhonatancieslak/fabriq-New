# 10 — Branding e Identidade Visual

> Squad: brand-squad (Al Ries + Miller StoryBrand) + design-squad + copy-squad

---

## Nome

**FABRIQ**

Derivado de "fabric" (estrutura, tecido, trama) + sufixo industrial.
Soa a tecnologia mas tem raiz industrial.
Pronuncia-se igual em PT, EN e ES.
Domínio: `fabriq.pt` (principal) + `fabriq.com.br` (Brasil)

---

## Posicionamento (Al Ries)

**A palavra que FABRIQ vai possuir:**
> **"Controlo"**

Não é o software de desenho. Não é o ERP. É o **controlo do que acontece no chão de fábrica** — em tempo real, com prova, sem papel.

**Headline:**
> "Chão de fábrica sob controlo. Do corte à fatura, sem papel."

**Tagline:**
> "Ordens em ordem."

---

## StoryBrand (Miller)

**O herói:** o gestor/dono da empresa de corte laser
**O problema:**
- Externo: ordens perdidas, operador sem informação, faturação cega
- Interno: sensação de não ter controlo sobre o que acontece na fábrica
- Filosófico: "não deveria ser assim tão complicado em 2026"

**O guia:** FABRIQ
**O plano:** demo → instalar → 1.ª ordem digital em 24h
**O chamado à ação:** "Agendar demo" / "Ver demo agora"
**O sucesso:** fábrica organizada, faturação rastreável, operadores autónomos
**O fracasso evitado:** continuar a perder dinheiro com desorganização

---

## Identidade Visual

### Paleta de Cores

**Primária — Azul Industrial**
- `#1E40AF` (azul profundo) — profissionalismo, confiança, tecnologia
- `#3B82F6` (azul médio) — ação, interação

**Secundária — Laranja de Precisão**
- `#EA580C` (laranja queimado) — energia, metalurgia, precisão
- `#FED7AA` (laranja claro) — destaques, badges

**Neutros**
- `#0F172A` (quase preto) — textos principais
- `#1E293B` (dark) — backgrounds dark mode (PWA operador)
- `#F1F5F9` (cinza claro) — backgrounds admin
- `#94A3B8` (cinza médio) — textos secundários

**Status**
- Verde `#16A34A` — concluído, funcionou
- Amarelo `#CA8A04` — em progresso, ajustado
- Laranja `#EA580C` — pendente, atenção
- Vermelho `#DC2626` — cancelado, falhou, urgente

### Tipografia
- **Headings:** Inter (700/800) — moderno, legível, tecnológico
- **Body:** Inter (400/500) — consistência
- **Dados/Números:** Inter Mono — leituras de medidas, parâmetros, tempos
- **PWA Operador:** fonte maior (16px base), espaçamento generoso (gloves-friendly)

### Logo
- Símbolo: quadrado com canto cortado em diagonal (referência ao corte laser)
- Letras: "FABRIQ" em Inter Bold
- Versão dark (para PWA) e light (para painel admin)
- Versão ícone (para PWA home screen)
- White-label: substituível por logo do cliente

### Ícones
- Biblioteca: Lucide Icons (consistente com shadcn/ui)
- Estilo: linha fina, 24px grid

---

## Tom de Voz

**Palavras que definem o tom:**
- Direto (sem rodeios, linguagem da fábrica)
- Confiante (sabe o que faz)
- Humano (não é um ERP corporativo frio)
- Técnico quando necessário (operador entende)

**Não é:**
- Formal/burocrático
- Jovial em excesso (não é uma app de lifestyle)
- Intimidante

**Exemplos de copy:**

❌ "O sistema foi atualizado com sucesso e a ordem de serviço foi processada."
✅ "Ordem criada. O João já foi notificado."

❌ "Por favor, preencha todos os campos obrigatórios para prosseguir."
✅ "Falta o material. Qual vai usar?"

❌ "Parabéns! A sua ordem foi concluída com êxito."
✅ "✅ Corte concluído. Solicitador notificado."

---

## Design do Painel Admin

**Referência:** Linear.app (organização), Vercel Dashboard (limpeza), shadcn/ui (componentes)

**Princípios:**
- Branco/cinza claro como base
- Informação densa mas organizada (não esconder, organizar)
- Tabelas com ações inline
- Status com cores consistentes em todo o produto
- Mobile-responsive (gestor também usa no telemóvel)

**Layout:**
```
┌─────────────────────────────────────┐
│  FABRIQ logo  [empresa] [user ▼]   │ ← header fixo
├──────────┬──────────────────────────┤
│          │                          │
│ Sidebar  │   Conteúdo principal     │
│ (ícones  │                          │
│ + texto) │                          │
│          │                          │
└──────────┴──────────────────────────┘
```

---

## Design da PWA Operador

**Tema: Dark Mode obrigatório**
- Chão de fábrica: luz intensa, ecrã ao sol → dark mode tem melhor contraste
- Background: `#0F172A`
- Cards: `#1E293B`
- Texto: `#F1F5F9`

**Princípios:**
- Botões grandes (dedos com luvas)
- Texto mínimo 16px
- Ações claras e únicas por ecrã
- Feedback háptico nas ações (vibration API)
- Offline-first (funciona sem internet, sincroniza depois)

**Fluxo de ecrãs do operador:**
```
Login → Dashboard (lista ordens) → Detalhe Ordem → 
Iniciar → [Em Execução] → Concluir → 
Preencher quantidade → Tirar foto → Assinar → Confirmar
```

---

## Domínios e Subdominios

| URL | Propósito |
|---|---|
| `fabriq.pt` | Site de marketing + landing page |
| `app.fabriq.pt` | Painel admin (login) |
| `demo.fabriq.pt` | Conta demo pública |
| `{slug}.fabriq.pt` | Subdomínio por tenant (plano Pro+) |
| `fabriq.com.br` | Brasil (redirect ou site PT-BR) |
| `{dominio_proprio}` | White-label (Factory+) |
