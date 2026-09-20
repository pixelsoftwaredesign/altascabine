// ============================================================================
// ATLAS CABINE — CabineConfig.h  (GÉNÉRÉ — ne pas éditer)
// © 2026 Atlas Working — Made in Tunisia 🇹🇳
// Logiciel & R&D : PixelSoftware Design
// Design cabine & standard acoustique : Atlas Working (développement / idée)

// CABINE : AT-L350 — Cabine L · prix 58500 DT HT
// Capacités natives : door, reed, sensor, light, ac, co2, cam
// ============================================================================

#define CABINE_ID            "AT-L350"
#define CABINE_NOM           "Cabine L"
#define CABINE_ROLE          2   // 1 = STANDALONE · 2 = ESCLAVE (Pi câblé)
#define CABINE_MODE_DEV      0   // 0 = production (surcharger en dev)
#define CABINE_SW            "v2.1-at-l350"

// ---------- Réseau ----------
const char* WIFI_SSID = "ATLAS_CABINE";
const char* WIFI_PASS = "atlaschange";
const char* MQTT_HOST = "192.168.1.50";
const int   MQTT_PORT = 1883;
#define CABINE_WIFI_MODE  0

// ---------- Thèmes MQTT ----------
#define CABINE_MQTT_BASE    "atlas"
#define CABINE_USE_LEGACY   1

// ---------- Cœur cabine ----------
#define GPIO_RELAY          23  // relais gâche (HIGH = déverrouillé)
#define GPIO_DOOR           4  // reed switch (HIGH = ouverte)
#define GPIO_PIR            18   // présence

// ---------- Éclairage RGBW ----------
#define CABINE_LED_KIND     1   // 0 = PWM · 1 = NeoPixel
#define GPIO_LED_PIN        2   // PWM blanc
#define GPIO_LED_R          16   // PWM rouge
#define GPIO_LED_G          17   // PWM vert
#define GPIO_LED_B          21   // PWM bleu
#define GPIO_NEO            13   // data NeoPixel
#define NEO_PIXELS          50

// ---------- Modules optionnels (PIN = -1 ⇒ absent) ----------
#define GPIO_AC             25
#define GPIO_AC_FB          34
#define GPIO_CO2_A          35
#define GPIO_URG            36

// ---------- Liaison Raspberry Pi (rôle 2) ----------
#define GPIO_PI_TX           1
#define GPIO_PI_RX           3
#define PI_BAUD           9600

// ---------- Sécurité & cadence ----------
#define UNLOCK_MS          15000UL
#define RELAY_TEST_MS       200UL
#define PUBLISH_INTERVAL   30000UL
#define SCAN_ON_BOOT          1
#define ADC_ABSENT_THRESHOLD  10
