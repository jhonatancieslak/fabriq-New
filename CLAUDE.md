# FABRIQ — Instruções para Claude Code

## INÍCIO DE CADA CONVERSA — OBRIGATÓRIO

Ao iniciar qualquer conversa dentro do diretório `/var/www/fabriq/`:

1. Ler `/var/www/fabriq/docs/estado-atual.md` — estado da última sessão
2. Informar o utilizador: "Contexto FABRIQ carregado. Última sessão: [data]. Próximo passo: [próximo passo]"
3. Ao terminar a sessão: atualizar `/var/www/fabriq/docs/estado-atual.md` com o que foi feito, commitar e fazer push

---

## Estrutura do Projeto

```
/var/www/fabriq/
├── docs/              # Documentação, decisões, estado atual
├── squads/            # Agentes e squads (gitignored)
├── rtk/               # RTK CLI (gitignored)
├── .gitignore
└── CLAUDE.md
```

> O código do projeto será criado dentro de `/var/www/fabriq/` conforme o projeto evoluir.

---

## Cabeçalho Obrigatório em Todo Ficheiro de Código

Adicionar no topo de **todos** os ficheiros criados ou editados:

```php
<?php
// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
```

```typescript
// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
```

```python
# Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
```

```css
/* Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214 */
```

---

## Regras de Desenvolvimento

### NUNCA fazer sem pedir primeiro
- Refatorar código existente
- Renomear ficheiros ou pastas já existentes
- Alterar estrutura de base de dados já criada
- Mudar stack ou dependências principais
- Alterar configurações de Nginx ou sistema em produção
- Apagar ficheiros

### SEMPRE fazer
- Verificar portas em uso antes de definir novas (`ss -tlnp` ou `rtk` equivalente)
- Documentar ao concluir cada tarefa em `/var/www/fabriq/docs/estado-atual.md`
- Commitar e fazer push após documentar
- Consultar `squads/` antes de decisões de produto, branding, copy, estratégia
- Usar `rtk` para operações de terminal (token-efficient)
- Manter código limpo: remover funções e imports não utilizados
- Boas práticas: SOLID, DRY, sem magic numbers
- Funções e rotas sempre em inglês (`getUserById`, `POST /api/v1/orders`)
- Comentários apenas quando o PORQUÊ não é óbvio

### Segurança — OBRIGATÓRIO
- Senhas sempre com bcrypt (mínimo salt rounds 12) — **nunca MD5 para senhas**
- Dados sensíveis criptografados em repouso (AES-256-GCM)
- Validar input em todas as rotas (Zod / equivalente) — prevenção de SQL injection, XSS
- Rate limiting em todas as rotas públicas
- Helmet / headers de segurança HTTP
- Logs de auditoria em toda ação crítica (quem, o quê, quando, IP)
- Nunca commitar `.env` ou ficheiros com credenciais
- Dependências auditadas regularmente (`npm audit` / `composer audit`)

---

## Squads — Consultar Sempre

Diretório: `/var/www/fabriq/squads/`

| Decisão | Squad a consultar |
|---|---|
| Produto / pricing / mercado | `hormozi-squad` |
| Branding / identidade | `brand-squad` |
| Copy / textos | `copy-squad` |
| Design / UX | `design-squad` |
| Estratégia geral | `c-level-squad` ou `advisory-board` |
| Dados / análise | `data-squad` |
| Segurança | `cybersecurity` |

---

## RTK

RTK está instalado em `/var/www/fabriq/rtk/`.
Usar sempre `rtk` para operações de terminal (git, comandos, etc.) para otimizar tokens.

---

## Portas em Uso no Servidor (NÃO usar)

```
80, 443          — Nginx
3306             — MySQL
5432             — PostgreSQL
6379             — Redis
8080, 8101–8103  — Aplicações existentes
8200             — Aplicação existente
8443             — HTTPS interno
4000, 5050, 3001 — Aplicações existentes
25, 465, 587     — SMTP
110, 143, 993, 995 — POP3/IMAP
2244             — SSH
```

**Verificar antes de definir nova porta:**
```bash
ss -tlnp | grep <porta>
```

---

## Git

Repositório: `https://github.com/jhonatancieslak/fabriq-New`

```bash
git add .
git commit -m "descrição clara do que foi feito

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin main
```

Branches:
- `main` — produção / estável
- `dev` — desenvolvimento ativo
- `feature/nome` — funcionalidade específica

---

## Documentação

- Toda documentação vai dentro de `/var/www/fabriq/docs/` — **nunca fora deste diretório**
- Atualizar `docs/estado-atual.md` ao fim de cada sessão ou tarefa concluída
- Formato do estado atual: data, o que foi feito, o que está em progresso, próximo passo
