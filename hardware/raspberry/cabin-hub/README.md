# Raspberry Pi — cabin-hub Atlas

Service « cerveau » de la cabine (edge). S'adapte au matériel détecté :
l'ESP32 publie son rapport matériel (`atlas/<cab>/material`), le hub consolide
les capacités et les expose en WS/REST au kiosque web.

## Configuration

```dotenv
# .env  (copié depuis  .env.example)
MQTT_URL=mqtt://localhost:1883     # broker (broker usine si ESP32 hors-ligne direct)
PORT=3000
CABINE_ID=CAB-TUN-01
SITE_ROOT=/home/pi/altascabine/dist
```

## Installation (Raspberry Pi OS)

```bash
cd hardware/raspberry/cabin-hub
bash install.sh
```

`install.sh` :
1. `npm install`
2. crée le dossier `data/`
3. installe le service systemd `cabine-hub.service` (démarrage automatique au boot)

```bash
sudo systemctl enable --now cabine-hub
journalctl -u cabine-hub -f     # suivi en direct
```

## Route REST exposée au kiosque (Web / Android)

| Method | Route | Effect |
|---|---|---|
| GET | `/api/door/state` | état consolidé (locked/open/presence/caps) |
| POST | `/api/door/open` | déverrouille (commande MQTT) |
| POST | `/api/door/close` | verrouille |
| POST | `/api/scan` | relance le scan matériel ESP32 (dev) |
| GET | `/api/health` | santé du hub + matériel détecté + `pixelai` |
| GET | `/api/assistant` | infos de l'assistante embarquée (intents, Pixel AI) |
| POST | `/api/assistant` | `{"q":"…"}` → réponse privée (KB + **PixelTranslate** FR/Darja/AR/TR/EN, climat par occupant) |
| POST | `/api/pixel-ai/execute` | `{"skillName","parameters"}` → **Skills** Pixel AI embarqués (climate, maintenance, translate, compliance, accounting, coding, data_science, chart, export) |
| GET | `/api/leads` | leads stockées en local (offline-first) |
| POST | `/api/sync` | synchronisation kiosque → hub (dédoublonnage email+tél) |

> **Pixel AI embarqué** : si le dépôt `pixel-ai/` est présent à la racine sur le site, le hub charge ses Skills en bord de cabine (cerveau de bord sans cloud).

## WebSocket

`ws://<ip>:3000/ws` — push `{type:'state', state}` à chaque changement (same protocole que `server/index.js`).

## Télémétrie

Chaque action est appendée dans `data/telemetry.jsonl` (audit local usine).