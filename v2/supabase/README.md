# FABRIQ v2 — backend self-host (Postgres + Auth + REST)

Stack mínima, sem Kong/Storage/Realtime/Studio (VPS com pouca margem de RAM). Roda na mesma VPS
do resto do fabriq, usando o cluster PostgreSQL 16 já existente (database `fabriq_v2` isolada,
não um Postgres novo).

## Componentes

- **Postgres**: database `fabriq_v2` no cluster já existente (`sudo -u postgres psql -d fabriq_v2`).
- **GoTrue** (`fabriq_v2_auth`, porta 9999, só `127.0.0.1`) — autenticação, cria e gere o schema `auth`.
- **PostgREST** (`fabriq_v2_rest`, porta 8091, só `127.0.0.1`) — API REST sobre o schema `public`.
- **Nginx** (`/etc/nginx/sites-available/v2.fabriq.pt`) — expõe `/auth/v1/*` e `/rest/v1/*`
  publicamente via HTTPS, mimetizando a API do Supabase Cloud (o `supabase-js` no frontend não
  precisa saber que não é Supabase Cloud).

## Ficheiros (gitignored — contêm segredos)

- `.selfhost-secrets` — JWT secret + password do role `authenticator`.
- `gotrue.env` / `postgrest.env` — env vars dos containers.
- `docker-compose.yml` — não tem segredos, pode ir pro git.

## Rebuild do zero (se a VPS for reinstalada, etc)

```bash
# 1. Database + roles
sudo -u postgres psql -c "CREATE DATABASE fabriq_v2;"
sudo -u postgres psql -c "CREATE ROLE fabriq_v2_user LOGIN PASSWORD '...';"
sudo -u postgres psql -d fabriq_v2 -c "GRANT ALL PRIVILEGES ON DATABASE fabriq_v2 TO fabriq_v2_user;"
sudo -u postgres psql -d fabriq_v2 -c "GRANT ALL ON SCHEMA public TO fabriq_v2_user;"

sudo -u postgres psql -d fabriq_v2 <<'SQL'
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator noinherit login password '...';
grant anon, authenticated, service_role to authenticator;
create schema if not exists auth;
alter schema auth owner to fabriq_v2_user;  -- importante: GoTrue precisa criar as próprias auth.uid()/auth.role()
SQL

# 2. Aplicar schema (schema.sql, 002, 003, 004, nesta ordem)
sudo -u postgres psql -d fabriq_v2 -f schema.sql
sudo -u postgres psql -d fabriq_v2 -f 002_signup_rpc.sql
sudo -u postgres psql -d fabriq_v2 -f 003_producao_avancada.sql
sudo -u postgres psql -d fabriq_v2 -f 004_materiais_texto_livre.sql

# 3. Grants pras roles PostgREST (RLS continua a filtrar linhas)
sudo -u postgres psql -d fabriq_v2 <<'SQL'
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
SQL

# 4. Containers
docker compose up -d

# 5. Auth.email() extra (GoTrue não cria esta, só uid()/role())
sudo -u postgres psql -d fabriq_v2 -c "
create or replace function auth.email() returns text language sql stable as \$\$
  select nullif(current_setting('request.jwt.claims', true)::json->>'email', '')::text
\$\$;"

# 6. Mintar chaves anon/service_role (JWT HS256, mesmo secret do GOTRUE_JWT_SECRET em gotrue.env)
# ver histórico de sessão / estado-atual.md pelo script python usado.
```

## Backup

`fabriq_v2` está na lista `DBS` de `/usr/local/bin/backup-other-dbs.sh` (dump diário 02h30,
off-site Google Drive, retenção 14 dias) — igual aos outros bancos do servidor.

## Pendências

- Verificar domínio `fabriq.pt` no Resend (só `picagens.pt` está verificado na chave actual) —
  até lá, `GOTRUE_MAILER_AUTOCONFIRM=true` (sem exigir confirmação de e-mail real).
