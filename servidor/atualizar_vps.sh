#!/usr/bin/env bash
# Atualiza o servidor do jogo na VPS a partir do git. Rodar NA VPS, dentro da pasta do clone:  bash servidor/atualizar_vps.sh
# Faz: git pull (so fast-forward), npm ci no servidor, reinicia o servico (systemd "isblade") e confere /status.
# Nao apaga nada e para se o pull nao for limpo (alteracao local na VPS, historico divergente).
set -euo pipefail
cd "$(dirname "$0")/.."
antes=$(git rev-parse --short HEAD)
git fetch --quiet origin
git pull --ff-only
depois=$(git rev-parse --short HEAD)
if [ "$antes" = "$depois" ]; then echo "Ja estava na versao $depois."; else echo "Atualizado: $antes -> $depois"; git --no-pager log --oneline "$antes..$depois" | head -10; fi
( cd servidor && npm ci --omit=dev --silent )
if systemctl list-unit-files 2>/dev/null | grep -q '^isblade\.service'; then
  sudo systemctl restart isblade; sleep 2; systemctl is-active isblade
else
  echo "Servico 'isblade' nao encontrado: reinicie o servidor do seu jeito (pm2 restart isblade)."
fi
curl -fsS --max-time 5 "http://localhost:${PORT:-3000}/status" && echo || echo "(nao consegui ler /status: confira a porta)"
