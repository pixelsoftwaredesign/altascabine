# ATLAS CABINE — Système embarqué « selon le matériel installé »

L'applicatif de chaque cabine s'adapte au matériel réellement présent.
**Trois MODÈLES de cabine** existent ; chaque composant ne s'exécute que s'il
existe du matériel pour le porter (aucun émulateur, aucun zombie).

## Les 3 modèles de cabine

| Modèle | Matériel | Cerveau | Firmware / logiciel | Réseau |
|---|---|---|---|---|
| **① Modèle ESP32** | ESP32 (+ relais, reed, PIR, LED, CO₂, AC) | l'ESP32 seul | `door-esp32.ino` (standalone: web diag + MQTT) | WiFi privé (PSK ou **802.1X**) |
| **② Modèle Raspberry Pi** | Pi 4 au centre + ESP32 actionneur (ou GPIO/RS485) | le Pi (`cabin-hub`) | `hardware/raspberry/cabin-hub` + `door-esp32.ino` (rôle 2) | WiFi privé **802.1X** + broker local |
| **③ Modèle Arduino** | Arduino classique (UNO/2560) + shield Ethernet OU pont UART | l'Arduino + Pi (si pont) | `door-arduino.ino` (Ethernet/MQTT ou série) | câblé Ethernet privé / pont série |

## Modèle avancé — réseau WiFi privé 802.1X

Pour les cabines **② (conseillé) et ①**, tous les **contrôleurs ET accessoires**
(clim, LED, caméra, capteurs, tablettes) sont connectés sur **un réseau WiFi
privé unique** protégé par **WPA2-Enterprise / 802.1X** (RADIUS) :

- SSID privé `CAB-NET-<n>` réservé à la cabine (pas d'internet par défaut).
- **Identité par appareil** : `<device>@cabin.atlas.tn`
  (ESP32 porte, hub Pi, clim, LED, caméra, tablette…).
- L'ESP32 s'authentifie si `CABINE_WIFI_MODE = 1`
  → configuration dans `hardware/wifi/CabineWifi8021x.h`.
- Le Pi rejoint le même réseau (exemple `wpa_supplicant.conf` fourni).
- Le **broker MQTT** tourne en local sur le Pi → aucun trafic publique pour
  les commandes. Seule la télémetrie usine sort (égress autorisé).

> Détails : `hardware/wifi/README.md`. L'Arduino (③) n'a pas de WiFi →
> réseau privé **câblé** ou pont série vers le Pi (même sécurité par VLAN).

## Qui fait quoi — matrice des responsabilités

| Fonction | ① ESP32 | ② Pi + ESP32 | ③ Arduino |
|---|---|---|---|
| Porte / relock 15 s | ESP32 (relais) | ESP32 via le Pi | Arduino (relais) |
| Détection présence & porte | ESP32 (reed/PIR) | ESP32 (+ caméra Pi opt.) | Arduino (reed/PIR) |
| Éclairage RGBW | ESP32 (natif) | Pi → ESP32 | Pi/tablette (hub) |
| Climatisation 2,7 kW | ESP32 (relais) | Pi (gainable) | Arduino (relais) |
| Audio / annonces | — | Pi (ALSA) | — |
| Caméra sécurité | — | Pi (libcamera) | — |
| QR d'accès affiché | page web ESP32 | web-app (Pi) | web-app (Pi ou tablette) |
| Télémétrie usine | MQTT `atlas/<cab>/state` | MQTT + hub | MQTT (Ethernet) ou via Pi |

## Répertoires

```
hardware/
├── README.md                 ← ce fichier
├── profiles/                 ← profils de déploiement (par N° de cabine)
│   ├── cabine.deploy.json    ← 3 modèles (esp32 · pi · arduino)
│   └── cabine.wifi.json      ← réseau privé 802.1X (modèle avancé)
├── wifi/
│   ├── README.md             ← architecture WiFi privé 802.1X
│   ├── CabineWifi8021x.h     ← config ESP32 (identité RADIUS, EAP)
│   └── wpa_supplicant.conf   ← exemple Raspberry Pi (802.1X)
├── door-esp32/               ← MODÈLE ① (+ rôle esclave du ②)
│   ├── CabineConfig.h        ← TOUTE la config matérielle de l'ESP32
│   └── door-esp32.ino        ← firmware (scan, urgence, LED, web diag)
├── door-arduino/             ← MODÈLE ③
│   ├── ArduinoCabineConfig.h
│   └── door-arduino.ino      ← Ethernet/MQTT ou pont série vers Pi
└── raspberry/
    └── cabin-hub/            ← MODÈLE ② (edge brain Pi)
        ├── index.js  package.json  .env.example
        ├── install.sh  deploy/cabine-hub.service
        └── README.md
```

## Démarrer

1. Choisir le modèle selon le matériel installé (tableau ci-dessus).
2. **① ESP32** : `door-esp32.ino` + `CabineConfig.h`. **802.1X** → `CABINE_WIFI_MODE=1`.
3. **② Pi** : `hardware/raspberry/cabin-hub` → `bash install.sh` (broker local,
   kiosque web, télémetrie). ESP32 en rôle esclave (`CABINE_ROLE=2`).
4. **③ Arduino** : `door-arduino.ino` (`ARDUINO_LINK=1` Ethernet ou `=2` pont Pi).
5. **Brancher Android** (optionnel) : `hardware/android/AtlasCabine` → app télécommande.

## Générer le firmware PAR CABINE (AT-S90 / AT-M240 / AT-L350)

Un générateur natif produit un **projet Arduino complet par cabine**
(config + firmware, prêt à flasher) :

```bash
node hardware/generate-cabines.mjs
# → hardware/generated/AT-S90/{esp32,arduino}/…  (Cabine S · 18 500 DT)
# → hardware/generated/AT-M240/{esp32,arduino}/…  (Cabine M · 32 900 DT · + clim, CO₂)
# → hardware/generated/AT-L350/{esp32,arduino}/…  (Cabine L · 58 500 DT · + caméra)
```

- Source de vérité : `hardware/profiles/cabines.json`
- MANIFEST : `hardware/generated/MANIFEST.json`
- Chaque `CABINE_*` embarque : identité, rôle (standalone/esclave), broches,
  capacités natives et dimensions – signatures copyright PixelSoftware Design incluses.

> Le kiosque web (`index.html`, `exterieur.html`) est **déjà** orienté cabine : il parle à
> `ws://<hub>/ws` quand il est servi par le Pi ou le serveur local (`server/`), sinon il
> fonctionne en simulation (data uniquement locale).