# Alta disponibilidade — NestCut / sistema.fabriq.pt (2026-09-28)

Objetivo: durante um deploy (ou se uma instância cair) o sistema e os PWAs continuam a responder.

## Arquitetura

```
browser / PWA ──► nginx ──► upstream nestcut_app ──┬─► nestcut.service   (gunicorn 3 workers, nestcut.sock)
                                                   └─► nestcut-b.service (gunicorn 3 workers, nestcut-b.sock)
```

- Mesmo código (`/var/www/fabriq/services/nesting`), mesmo `.env`, mesma BD `nesting_db` e Redis — as duas instâncias são idênticas e sem estado local (sessão Flask = cookie assinado; cache/JWT em Redis).
- Upstream: `/etc/nginx/conf.d/nestcut-upstream.conf` (`max_fails=1 fail_timeout=5s` por socket).
- Sites que usam o upstream (`proxy_pass http://nestcut_app;` + `proxy_next_upstream error timeout http_502 http_503; proxy_next_upstream_tries 2;`):
  `sistema.fabriq.pt`, `app.fabriq.pt`, `app.estruturasmetalicasviana.com` (em `/etc/nginx/sites-available/`).
  Backup das versões anteriores: `/root/backups/nginx-2026-09-28/`.
- Unit nova: `/etc/systemd/system/nestcut-b.service` (enabled). Logs: `/var/log/nestcut/access-b.log`, `error-b.log`.
- Pedidos não idempotentes (POST) só são repetidos na outra instância se a ligação falhou antes de serem enviados (comportamento padrão do nginx) — sem risco de duplicar gravações.

## Deploy — sempre assim

```bash
sudo /var/www/fabriq/services/nesting/scripts/deploy_rolling.sh
```

Reinicia `nestcut`, espera o health check (`/api/v1/health` no socket), espera mais 8s
(`SETTLE_S` > `fail_timeout` do nginx) e só então reinicia `nestcut-b`.
**Não usar `systemctl restart nestcut nestcut-b` juntos** — derruba as duas ao mesmo tempo.

Porque o `SETTLE_S`: no 1.º teste sem espera houve 17×502 "no live upstreams" — o nginx ainda
tinha a instância A marcada como falhada quando a B foi reiniciada.

## Service workers (PWA operador `/pwa/sw.js` e PWA admin `/admin-app/sw.js`)

Handler de fetch partilhado em `services/nesting/app/utils/sw_resilience.py`:
- resposta 502/503/504 é tratada como falha: repete o pedido após 800ms;
- se continuar a falhar: serve cópia em cache ou, em navegação, uma página "Sistema a atualizar" (FABRIQ.IA) que recarrega sozinha em 3s.
- `APP_VERSION` do PWA operador → `1.09`; cache do PWA admin → `fabriq-admin-v4`.

## Testes feitos (2026-09-28)

| Teste | Resultado |
|---|---|
| Deploy rolling com 130 pedidos contínuos (5/s) | 130×200, 0 erros |
| `systemctl stop nestcut` sem aviso, 15 pedidos | 15×200 (B assumiu) |
| `/pwa/sw.js` e `/admin-app/sw.js` servem o handler novo | ok |

## Memória / capacidade

Cada instância ~200–350MB. Total 6 workers (antes 3). VPS com ~5.6GB disponíveis na altura.
