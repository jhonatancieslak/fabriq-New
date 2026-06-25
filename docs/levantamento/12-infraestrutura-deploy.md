# 12 — Infraestrutura e Deploy

> Squad: c-level-squad + cybersecurity

---

## Servidor Atual (VPS)

O FABRIQ corre no mesmo VPS onde estão outros sistemas.
**Regra crítica:** verificar portas antes de qualquer serviço novo.

### Portas já em uso (NÃO usar)
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

### Portas FABRIQ (reservadas)
```
8190    — Fastify API (backend)
3190    — Next.js dev server (produção usa build estático via Nginx)
9190    — MinIO (S3 storage)
9191    — MinIO console
```

---

## Nginx — Configuração por Domínio

```nginx
# Painel admin + Next.js
server {
    listen 443 ssl;
    server_name app.fabriq.pt *.fabriq.pt;
    
    # SSL wildcard para subdominios de tenants
    ssl_certificate /etc/letsencrypt/live/fabriq.pt/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fabriq.pt/privkey.pem;
    
    location /api/ {
        proxy_pass http://127.0.0.1:8190;
        proxy_set_header X-Tenant-Host $host;
    }
    
    location / {
        proxy_pass http://127.0.0.1:3190;
    }
    
    # Upload máximo
    client_max_body_size 200M;
    
    # Timeout para uploads grandes
    proxy_read_timeout 120s;
}
```

---

## PM2 — Gestão de Processos

```bash
# ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'fabriq-api',
      script: 'apps/api/dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production', PORT: 8190 }
    },
    {
      name: 'fabriq-web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3190',
      cwd: 'apps/web',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'fabriq-worker',
      script: 'apps/api/dist/jobs/worker.js',
      instances: 1,
      env: { NODE_ENV: 'production' }
    }
  ]
}
```

---

## Systemd Service

```ini
# /etc/systemd/system/fabriq.service
[Unit]
Description=FABRIQ SaaS
After=network.target postgresql.service redis.service

[Service]
Type=forking
User=www-data
WorkingDirectory=/var/www/fabriq
ExecStart=/usr/bin/pm2 start ecosystem.config.js --env production
ExecReload=/usr/bin/pm2 reload fabriq-api fabriq-web fabriq-worker
ExecStop=/usr/bin/pm2 stop fabriq-api fabriq-web fabriq-worker
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

---

## CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy FABRIQ

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        
      - name: Install & Build
        run: |
          pnpm install --frozen-lockfile
          pnpm build
          
      - name: Run tests
        run: pnpm test
        
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/fabriq
            rtk git pull origin main
            pnpm install --frozen-lockfile
            pnpm build
            pnpm prisma migrate deploy
            pm2 reload fabriq-api fabriq-web fabriq-worker
```

---

## Variáveis de Ambiente

```env
# apps/api/.env (NUNCA commitar)

# Database
DATABASE_URL=postgresql://fabriq:password@127.0.0.1:5432/fabriq_db

# Redis
REDIS_URL=redis://127.0.0.1:6379/2

# JWT
JWT_ACCESS_SECRET=... (RS256 private key)
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# S3/MinIO
S3_ENDPOINT=http://127.0.0.1:9190
S3_BUCKET=fabriq
S3_ACCESS_KEY=...
S3_SECRET_KEY=...

# App
NODE_ENV=production
PORT=8190
APP_URL=https://app.fabriq.pt

# Crypto (para dados sensíveis dos tenants)
ENCRYPTION_KEY=... (AES-256-GCM, 32 bytes hex)
```

---

## Backup

```bash
# Backup diário PostgreSQL (cron às 03h00)
0 3 * * * pg_dump fabriq_db | gzip > /backups/fabriq/db_$(date +\%Y\%m\%d).sql.gz

# Reter 30 dias
find /backups/fabriq/ -name "*.sql.gz" -mtime +30 -delete

# MinIO: sync para bucket externo (Cloudflare R2 ou S3)
0 4 * * * mc mirror local/fabriq r2/fabriq-backup
```

---

## PostgreSQL — Base de Dados FABRIQ

```sql
-- Criar DB e user isolados (não partilhar com outros sistemas)
CREATE DATABASE fabriq_db;
CREATE USER fabriq WITH ENCRYPTED PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE fabriq_db TO fabriq;
```

---

## SSL — Wildcard Certificate

Para subdominios de tenants (`*.fabriq.pt`) é necessário wildcard:

```bash
certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/cloudflare.ini \
  -d fabriq.pt \
  -d "*.fabriq.pt"
```

Auto-renovação via certbot systemd timer (já configurado na maioria das VPS).
