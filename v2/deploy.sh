#!/usr/bin/env bash
# Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
# Rebuild do frontend v2 e reload do Nginx. Rodar após qualquer alteração em v2/app/.
set -euo pipefail
cd "$(dirname "$0")/app"
npm run build
sudo nginx -t
sudo systemctl reload nginx
echo "Deploy v2 concluído: $(date)"
