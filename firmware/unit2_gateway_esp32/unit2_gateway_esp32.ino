/*
 * TWIN-CORE: Unit 2 — Gateway and Dashboard Communication Unit
 * Target: ESP32-WROOM-32
 * 
 * Hardware:
 * - LoRa SX1276/SX1278 SPI Receiver (NSS: 5, RST: 14, DIO0: 2)
 * - USB Serial connection to Dashboard Computer (115200 baud)
 *
 * Operation:
 * Listens for LoRa packets from Unit 1, extracts packet metadata (RSSI, SNR),
 * verifies JSON integrity, appends signal diagnostics, and streams to USB Serial
 * for the TWIN-CORE Python backend.
 */

#include <SPI.h>
#include <LoRa.h>

#define LORA_SS    5
#define LORA_RST   14
#define LORA_DIO0  2
#define LORA_FREQ  868E6  // Must match Unit 1

void setup() {
  Serial.begin(115200);
  while (!Serial) { delay(10); }

  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(LORA_FREQ)) {
    Serial.println(F("{\"error\":\"LoRa receiver init failed\"}"));
    while (1) { delay(1000); }
  }

  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  Serial.println(F("{\"gateway\":\"TWIN-CORE-UNIT2-READY\",\"baud\":115200}"));
}

void loop() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String incoming = "";
    while (LoRa.available()) {
      incoming += (char)LoRa.read();
    }

    int rssi = LoRa.packetRssi();
    float snr = LoRa.packetSnr();

    // Verify incoming JSON format
    incoming.trim();
    if (incoming.startsWith("{") && incoming.endsWith("}")) {
      // Inject RSSI and SNR into JSON before closing brace
      incoming = incoming.substring(0, incoming.length() - 1);
      incoming += ",\"rssi\":" + String(rssi) + ",\"snr\":" + String(snr, 1) + "}";
      
      // Output single line JSON to USB serial
      Serial.println(incoming);
    }
  }

  // Handle incoming commands from dashboard via USB serial
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.length() > 0) {
      // Forward command over LoRa to Unit 1 (e.g. threshold updates or manual override)
      LoRa.beginPacket();
      LoRa.print(cmd);
      LoRa.endPacket();
    }
  }
}
