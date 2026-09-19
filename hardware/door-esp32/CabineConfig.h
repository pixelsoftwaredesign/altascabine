// ============================================================================
// ATLAS CABINE — CabineConfig.h
// TOUTE la configuration matérielle de la cabine est ici.
// « L'app s'adapte au matériel réellement branché » :
//  - PIN = -1  → module absent, fonction désactivée automatiquement
//  - CABINE_MODE_DEV = 1  → mode développement : scan materiel + page web diag
// ============================================================================

// ---------- Identité ----------
#define CABINE_ID            "CAB-TUN-01"
#define CABINE_ROLE          1   // 1 = STANDALONE (web UI de secours) · 2 = ESCLAVE (Pi cAblé, sert le Pi)
#define CABINE_MODE_DEV      1   // 1 = développement (scan/répetition + page diag) · 0 = production
#define CABINE_SW            "v2.1-dev"

// ---------- Réseau ----------
const char* WIFI_SSID = "ATLAS_CABINE";
const char* WIFI_PASS = "atlaschange";
const char* MQTT_HOST = "192.168.1.50";
const int   MQTT_PORT = 1883;

// Cabine AVANCÉE : WiFi privé 802.1X (WPA2-Entreprise / RADIUS)
//   0 = WPA2-PSK simple (réseau classique)
//   1 = 802.1X → identifiant/mot de passe RADIUS dans CabineWifi8021x.h
#define CABINE_WIFI_MODE  0

// ---------- Thèmes MQTT (base + unité) ----------
#define CABINE_MQTT_BASE    "atlas"
#define CABINE_USE_LEGACY   1   // publier aussi sur atlas/door/* (compat)

// ---------- Cœur cabine ----------
#define GPIO_RELAY          23  // relais gâche/verrou (HIGH = déverrouillé)
#define GPIO_DOOR            4  // reed switch           (HIGH = porte ouverte, INPUT_PULLUP)
#define GPIO_PIR            18  // présence              (HIGH = présence)

// ---------- Éclairage RGBW ----------
#define CABINE_LED_KIND     1   // 0 = PWM RGBW simple · 1 = NeoPixel (WS2812B)
#define GPIO_LED_PIN         2  // PWM blanc / led d'état
#define GPIO_LED_R          16  // PWM rouge
#define GPIO_LED_G          17  // PWM vert
#define GPIO_LED_B          21  // PWM bleu
#define GPIO_NEO            13  // data NeoPixel (si CABINE_LED_KIND=1)
#define NEO_PIXELS          30

// ---------- Modules optionnels (PIN = -1  ⇒  absent) ----------
#define GPIO_AC             25  // relais climatisation
#define GPIO_AC_FB          34  // retour analogique clim (0 = non branché)
#define GPIO_CO2_A          35  // capteur CO2 analogique
#define GPIO_URG            36  // bouton urgence

// ---------- Liaison Raspberry Pi (rôle 2) ----------
#define GPIO_PI_TX           1  // UART0 TX vers le Pi
#define GPIO_PI_RX           3  // UART0 RX depuis le Pi
#define PI_BAUD           9600

// ---------- Sécurité & cadence ----------
#define UNLOCK_MS          15000UL
#define RELAY_TEST_MS       200UL  // impulsion test relais (dev)
#define PUBLISH_INTERVAL   30000UL
#define SCAN_ON_BOOT          1   // détection matériel au démarrage

// ---------- Détection analogique : seuil "branché" ----------
#define ADC_ABSENT_THRESHOLD   10 // valeur brute < à -> capteur absent