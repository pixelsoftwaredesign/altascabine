// ============================================================================
// ATLAS CABINE — ArduinoCabineConfig.h  (GÉNÉRÉ — ne pas éditer)
// © 2026 Atlas Working — Made in Tunisia 🇹🇳
// Logiciel & R&D : PixelSoftware Design
// Design cabine & standard acoustique : Atlas Working (développement / idée)

// CABINE : AT-L350 — Cabine L · prix 58500 DT HT
// ARDUINO_LINK = 2 (pont série vers Pi)
// ============================================================================

#define CABINE_ID          "AT-L350"
#define ARDUINO_SW         "v2.1-arduino-at-l350"
#define ARDUINO_MODE_DEV   0     // 0 = production (surcharger en dev)

// ---------- Mode de communication ----------
#define ARDUINO_LINK       2     // 1 = Ethernet/MQTT · 2 = pont série Pi

#if ARDUINO_LINK == 1
  byte ARD_MAC[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0x01, 0x03 };
  IPAddress ARD_IP  (10, 0, 1, 33);
  IPAddress ARD_DNS (10, 0, 1, 1);
  const char* MQTT_HOST = "10.0.1.10";   // broker local (Pi) ou usine
  const int   MQTT_PORT = 1883;
#else
  #define PI_BAUD 9600
#endif

#define CABINE_MQTT_BASE   "atlas"
#define CABINE_USE_LEGACY  0

// ---------- Cœur cabine ----------
#define GPIO_RELAY      4   // relais porte (HIGH = déverrouillé)
#define GPIO_DOOR       2   // reed switch
#define GPIO_PIR        3    // présence
#define GPIO_URG        5    // bouton urgence
#define GPIO_BUZZER     6    // buzzer (option)

// ---------- Modules optionnels ----------
#define GPIO_AC         "A1" // relais clim
#define GPIO_CO2_A      "A0" // CO2 analogique

// ---------- Sécurité ----------
#define UNLOCK_MS       15000UL
#define RELAY_TEST_MS    200UL
#define PUBLISH_INTERVAL 30000UL
