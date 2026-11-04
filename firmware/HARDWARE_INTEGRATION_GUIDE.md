# TWIN-CORE: Unit 1 & Unit 2 Modular Hardware Integration Guide

This guide documents the modular hardware bridge and specifies the details needed from the user before generating final hardware firmware.

---

## 1. System Hardware Architecture

```
[ UNIT 1: Sensor & Monitoring Unit ]
   ├── Temperature Sensor (°C)
   ├── Input Voltage Sensor (V)
   ├── Input Current Sensor (A)
   ├── Derived Power (W = V × I)
   └── GPS Module (Lat, Lon, Fix, Time)
         │
         │ (Wireless RF / LoRa / UART)
         ▼
[ UNIT 2: Communication Gateway ]
   └── Receives telemetry packet
         │
         │ (USB Serial CDC @ 115200 baud)
         ▼
[ TWIN-CORE FastAPI Telemetry Engine ]
   ├── Validates packet structure & ranges
   ├── Strictly computes power: P = V * I
   ├── Validates GPS bounds (-90..90, -180..180)
   └── Streams to React Frontend via WebSockets
```

---

## 2. Proposed Telemetry Packet Format

Unit 2 transmits newline-delimited JSON strings over USB Serial to the computer:

```json
{
  "device_id": "TWINCORE-UNIT1",
  "packet_id": 1,
  "temperature": 32.25,
  "voltage": 12.00,
  "current": 1.25,
  "latitude": 34.152600,
  "longitude": 77.577100,
  "gps_fix": true,
  "timestamp": "2026-11-04T10:30:00"
}
```

### Key Field Specifications:
- `device_id` *(string)*: Unique remote unit identifier.
- `packet_id` *(integer)*: Monotonically increasing sequence counter.
- `temperature` *(float)*: Current temperature in Celsius (°C).
- `voltage` *(float)*: Circuit input voltage in Volts (V).
- `current` *(float)*: Circuit input current in Amperes (A).
- `latitude` *(float)*: Decimal latitude between -90.0 and +90.0.
- `longitude` *(float)*: Decimal longitude between -180.0 and +180.0.
- `gps_fix` *(boolean)*: True if 3D satellite lock acquired; false if searching.
- `timestamp` *(string, optional)*: GPS UTC ISO-8601 timestamp.

> **Note on Power**: Electrical power $P = V \times I$ is calculated automatically in real-time by the backend and displayed on the dashboard. In live hardware mode, no fabricated power values are used.

---

## 3. Pending Hardware Details Checklist

To complete final firmware flashing code, provide the following details:

### For UNIT 1 (Sensor & Monitoring Unit):
1. **Microcontroller Model**: (e.g. ESP32-WROOM-32, ESP32-S3, Arduino Nano 33 BLE, STM32).
2. **Temperature Sensor Component**: (e.g. DS18B20 1-Wire, DHT22, BMP280 I2C, PT100 RTD).
   - *Assigned Pins*: (SDA/SCL, OneWire GPIO, or ADC pin).
3. **Voltage & Current Sensor Component**: (e.g. INA219, INA226, INA3221, ACS712, Voltage Divider + Shunt).
   - *Assigned Pins*: (I2C address, Shunt resistor value in mΩ).
4. **GPS Module Model**: (e.g. NEO-6M, NEO-8M, Quectel L86, SAM-M8Q).
   - *Communication*: Hardware UART or SoftwareSerial?
   - *Assigned Pins*: (TX, RX, PPS).
   - *Baud Rate*: (e.g. 9600 bps or 115200 bps).
5. **Transmitter Module to Unit 2**: (e.g. SX1276/SX1278 LoRa SPI, NRF24L01+, ESP-NOW, HC-12 UART).
   - *Assigned Pins*: (CS/NSS, RST, DIO0/IRQ, SCK, MOSI, MISO).
   - *Carrier Frequency*: (e.g. 868 MHz, 433 MHz, 915 MHz).

### For UNIT 2 (Communication Gateway):
1. **Microcontroller Model**: (e.g. ESP32 DevKit, Arduino Pro Micro).
2. **Receiver Module**: (Matches Unit 1 transmitter).
   - *Assigned Pins*: (CS, RST, DIO0).
3. **USB Serial Connection**:
   - *Baud Rate*: 115200 (Default) or customizable via the Hardware Connection page.

Once these details are provided, the final tailored firmware with exact pin definitions will be generated immediately without guesswork.
