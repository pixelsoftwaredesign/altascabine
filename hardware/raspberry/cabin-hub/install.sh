#!/usr/bin/env bash
# Atlas Cabine — installation du cabin-hub (Raspberry Pi)
set -euo pipefail
cd "$(dirname "$0")"

echo "== Atlas cabin-hub — installation =="
[ -f .env ] || { cp .env.example .env; echo "Fichier .env créé — ÉDITEZ-LE avant de démarrer (broker/ID cabine)."; }

echo "[1/3] Dépendances…"
npm install

echo "[2/3] Dossier données…"
mkdir -p data

echo "[3/3] Service systemd…"
sudo cp deploy/cabine-hub.service /etc/systemd/system/cabine-hub.service
sudo systemctl daemon-reload
sudo systemctl enable cabine-hub

echo "Terminé. Démarrage :  sudo systemctl start cabine-hub"
echo "Logs           :  journalctl -u cabine-hub -f"