# ATLAS CABINE — Firmware GÉNÉRÉS par cabine

Générés par `node hardware/generate-cabines.mjs` (source : `hardware/profiles/cabines.json`).

Chaque dossier est un **projet Arduino complet** (config + firmware) prêt à flasher :

### AT-S90 — Cabine S
- hardware/generated/AT-S90/esp32/ (Modèle ESP32, rôle 1 standalone, caps : door, reed, sensor, light)
- hardware/generated/AT-S90/arduino/ (Modèle Arduino)

### AT-M240 — Cabine M
- hardware/generated/AT-M240/esp32/ (Modèle ESP32, rôle 2 esclave Pi, caps : door, reed, sensor, light, ac, co2)
- hardware/generated/AT-M240/arduino/ (Modèle Arduino)

### AT-L350 — Cabine L
- hardware/generated/AT-L350/esp32/ (Modèle ESP32, rôle 2 esclave Pi, caps : door, reed, sensor, light, ac, co2, cam)
- hardware/generated/AT-L350/arduino/ (Modèle Arduino)

---
© 2026 Atlas Working — Made in Tunisia 🇹🇳 · Logiciel & R&D : PixelSoftware Design
