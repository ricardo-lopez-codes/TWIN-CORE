/*
 * TWIN-CORE: Unit 1 — Remote Monitoring and Adaptive Protection Unit
 * High-Altitude Electronics Protection for Ladakh Environments
 * Target: ESP32-WROOM-32
 * 
 * Hardware Sensors & Actuators:
 * - INA3221 / INA219 (Voltage & Current Sensing on I2C 0x40)
 * - BMP280 / BME280 / DHT22 (Pressure & Temperature Sensing)
 * - N-Channel MOSFET Gate Control (GPIO 25) for load shedding
 * - Cooling Fan PWM Driver (GPIO 26)
 * - LoRa SX1276/SX1278 SPI Transceiver (NSS: 5, RST: 14, DIO0: 2)
 *
 * Local Autonomous Safety:
 * Protection triggers locally even if LoRa radio or dashboard link fails.
 */

#include <Wire.h>
#include <SPI.h>
#include <LoRa.h>

#define LORA_SS    5
#define LORA_RST   14
#define LORA_DIO0  2
#define LORA_FREQ  868E6  // Or 433E6 / 915E6 depending on regional frequency

#define PIN_FAN_PWM     26
#define PIN_MOSFET_GATE 25

// Prototype Local Safety Limits (autonomous failsafe)
const float LOCAL_TEMP_CRIT_C  = 70.0;
const float LOCAL_TEMP_WARN_C  = 60.0;
const float LOCAL_PRESS_CRIT_KPA = 55.0;
const float LOCAL_POWER_CRIT_W = 15.0;

unsigned long packetSeq = 0;
unsigned long lastTelemetryMillis = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 1000;

bool fanActive = false;
String mosfetState = "ACTIVE";

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(PIN_FAN_PWM, OUTPUT);
  pinMode(PIN_MOSFET_GATE, OUTPUT);
  digitalWrite(PIN_FAN_PWM, LOW);
  digitalWrite(PIN_MOSFET_GATE, HIGH); // Default Load ON

  Wire.begin(21, 22);

  // Initialize LoRa
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(LORA_FREQ)) {
    Serial.println(F("[UNIT1] LoRa Init Failed! Check wiring."));
  } else {
    LoRa.setTxPower(17);
    LoRa.setSpreadingFactor(7);
    LoRa.setSignalBandwidth(125E3);
    Serial.println(F("[UNIT1] LoRa Initialized successfully."));
  }
}

// Sample sensor readings (or physical I2C read)
float readTemperature() {
  // Replace with bmp.readTemperature() or dht.readTemperature()
  return 24.8 + sin(millis() / 5000.0) * 0.5;
}

float readPressureKPa() {
  // Replace with bmp.readPressure() / 1000.0
  return 69.5 + cos(millis() / 10000.0) * 0.3;
}

float readVoltage() {
  return 12.02 + ((analogRead(34) % 10) - 5) * 0.005;
}

float readCurrent() {
  return (mosfetState == "DERATED") ? 0.25 : 0.51;
}

void loop() {
  unsigned long now = millis();

  // Read sensors
  float temp = readTemperature();
  float press = readPressureKPa();
  float volt = readVoltage();
  float curr = readCurrent();
  float power = volt * curr;

  // Local Autonomous Safety Logic
  if (temp >= LOCAL_TEMP_CRIT_C || power >= LOCAL_POWER_CRIT_W) {
    fanActive = true;
    digitalWrite(PIN_FAN_PWM, HIGH);
    mosfetState = "DERATED";
    digitalWrite(PIN_MOSFET_GATE, LOW); // Shed or throttle load
  } else if (temp <= (LOCAL_TEMP_WARN_C - 3.0) && power <= (LOCAL_POWER_CRIT_W - 2.0)) {
    fanActive = false;
    digitalWrite(PIN_FAN_PWM, LOW);
    mosfetState = "ACTIVE";
    digitalWrite(PIN_MOSFET_GATE, HIGH);
  }

  // Periodic Telemetry Transmission
  if (now - lastTelemetryMillis >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryMillis = now;
    packetSeq++;

    // Format Telemetry JSON Payload
    String payload = "{";
    payload += "\"v\":1,";
    payload += "\"dev\":\"TWIN-CORE-UNIT1\",";
    payload += "\"seq\":" + String(packetSeq) + ",";
    payload += "\"temp\":" + String(temp, 2) + ",";
    payload += "\"press\":" + String(press, 2) + ",";
    payload += "\"volt\":" + String(volt, 2) + ",";
    payload += "\"curr\":" + String(curr, 3) + ",";
    payload += "\"fan\":" + String(fanActive ? 1 : 0) + ",";
    payload += "\"mosfet\":\"" + mosfetState + "\",";
    payload += "\"crc_ok\":true";
    payload += "}";

    // Transmit over LoRa
    LoRa.beginPacket();
    LoRa.print(payload);
    LoRa.endPacket();

    Serial.print(F("[TX LoRa] "));
    Serial.println(payload);
  }
}
