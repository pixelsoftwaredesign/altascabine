# Atlas Cabine — App Android (Kotlin)

Écran/tablette in‑cabine (ou console du technicien). **S'adapte au matériel installé** :
détecte au démarrage si répond le Raspberry Pi (`cabin-hub`) ou l'ESP32 seul, et pilote le bon.

## Contrôles

- 🔓 / 🔒 porte (relais de la cabine)
- 💡 éclairage RGBW (slider)
- Code/QR d'accès → ouverture
- État temps réel (libre/occupée, verrouillée, matériel, capacité détectée)

## Construire (Android Studio)

1. Ouvrir `hardware/android/AtlasCabine` (Gradle).
2. Modifier les constantes dans `MainActivity.kt` :
   - `HUB_URL` : IP du Raspberry Pi (cabin-hub, port 3000)
   - `ESP_URL` : IP du firmware ESP32 (si PAS de Pi)
   - `CABINE_ID` : identifiant de la cabine
3. `Build > Build Bundle(s)/APK` puis installer l'APK sur la tablette.

## Matériel supporté

| Configuration | Cible de l'app | Protocole |
|---|---|---|
| Pi 4 + ESP32 | `HUB_URL` (cabin-hub) | WebSocket `ws://` + REST |
| ESP32 seul | `ESP_URL` (firmware standalone) | REST `http://<esp32>/api/*` |

`AndroidManifest.xml` active `usesCleartextTraffic="true"` (HTTP local cabine).