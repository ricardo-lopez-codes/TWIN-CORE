# TWIN-CORE: High-Altitude Electronics Digital Twin and Adaptive Protection System

> **Designed for Extreme Operating Environments (e.g., Ladakh: 3,500m – 5,000m ASL)**

![TWIN-CORE Status](https://img.shields.io/badge/Status-Operational-emerald)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Pydantic%20%7C%20SQLite-009688)
![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript%20%7C%20TailwindCSS-38bdf8)
![Tests](https://img.shields.io/badge/Tests-20%20Passed-brightgreen)

---

## 1. Project Overview

High-altitude regions like **Ladakh** present severe physical stressors for electronic circuits:
1. **Low Atmospheric Pressure (40–70 kPa vs 101.3 kPa sea level)**: Drastically reduces air density ($\rho$), attenuating convective heat dissipation and increasing overheating risks. Under Paschen's law, dielectric sparkover voltage between PCB traces is also substantially reduced.
2. **Sub-Zero Cold Soaking (-40°C to 0°C)**: Causes cold-start thermal shock, inrush current surges into cold capacitors, and exponential increases in battery internal resistance (ESR) with severe capacity degradation.
3. **Electrical Overpower & Component Degradation**: Thermal cycling degrades solder joints and MOSFET switches.

**TWIN-CORE** provides an industrial-grade instrumentation dashboard, digital twin simulation engine, and adaptive protection platform. It continuously acquires live hardware telemetry (over a long-range LoRa wireless link) and correlates it with thermodynamic virtual predictions to identify anomalies before physical failures occur.

---

## 2. Hardware Architecture

```
+-----------------------------------------------------------+
| UNIT 1: Remote Monitoring & Protection Unit (In Field)    |
| - ESP32-WROOM-32 Controller                               |
| - Atmospheric Pressure Transducer (BMP280/BMP388)         |
| - Ambient Temperature Transducer (DHT22/BMP280)           |
| - Bus Voltage & Shunt Current Monitor (INA3221 / INA219)  |
| - PWM High-RPM Cooling Fan Stage (GPIO 26)                |
| - N-Channel MOSFET Power Cutoff / Load Shed (GPIO 25)     |
| - SX1276/78 LoRa Transmitter (868/433 MHz)               |
+-----------------------------------------------------------+
                            |
                     LoRa Radio Link (Long Range)
                            |
                            v
+-----------------------------------------------------------+
| UNIT 2: Gateway & Dashboard Bridge Unit (Base Station)    |
| - ESP32-WROOM-32 Receiver                                 |
| - SX1276/78 LoRa Module (CRC Checked)                     |
| - USB Serial Stream (115200 baud) to Python Backend       |
+-----------------------------------------------------------+
                            |
                     USB Virtual COM Port
                            |
                            v
+-----------------------------------------------------------+
| LOCAL BACKEND & INSTRUMENTATION DASHBOARD                |
| - Python 3.13 + FastAPI + SQLite + WebSockets             |
| - React 18 + TypeScript + Recharts + Tailwind CSS         |
+-----------------------------------------------------------+
```

---

## 3. Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide React
- **Backend**: Python 3.13, FastAPI, Pydantic v2, SQLite (via SQLAlchemy), Starlette WebSockets
- **Hardware Bridge**: PySerial with auto-detecting COM ports and packet CRC verification
- **Firmware**: Arduino C++ for Unit 1 and Unit 2 ESP32 nodes

---

## 4. Dashboard Pages & Capabilities

The dashboard features 8 dedicated industrial monitoring pages:

1. **Overview Dashboard**:
   - Header with active mode indicator (`SIMULATION`, `HARDWARE CONNECTED`, `HARDWARE DISCONNECTED`).
   - 5 primary sensor cards: Atmospheric Pressure (kPa abs), Ambient Temp (°C), Electrical Power ($P = V \times I$), Voltage (V), Current (A).
   - Secondary indicators: Fan state, MOSFET load control state, Device state, LoRa packet sequence, Freshness.
   - 4 live historical graphs with 1m, 5m, 15m, 1h range selectors.
   - Safety Event summary with active warnings and recent protection actions.

2. **Live Monitoring**:
   - Comprehensive telemetry provenance breakdown: Actual physical measurements vs Calculated electrical power vs Digital twin predictions.
   - Transducer health, CRC validation, sequence counters, and stale data indicators.
   - If hardware disconnects, displays `OFFLINE` and marks old data as `STALE` (never presenting old values as live).

3. **Temperature Anomaly Demo**:
   - Deterministic runaway scenario: 25°C baseline $\to$ 60°C warning $\to$ 70°C critical.
   - Simulates high-RPM fan activation and electronic load derating.
   - Non-instantaneous exponential convective cooling model: $dT = -(T - 25) \times 0.20$ until recovery ($<57^\circ\text{C}$).
   - **Invariants**: Atmospheric Pressure (70.0 kPa) and Voltage (12.0 V) remain strictly constant.

4. **Pressure Anomaly Demo**:
   - High-altitude depressurization scenario: 70 kPa $\to$ 65 kPa warning $\to$ 55 kPa critical.
   - Radial SVG pressure gauge.
   - Selectable simulated strategies:
     - *Chamber Vent & Pump Stop* (equalization vent valve opened, pump stopped).
     - *Halt Test Sequence*.
     - *Passive Alert Only*.
   - Explicit disclaimer: Chamber depressurization response applies to test chambers, not the ambient atmosphere in Ladakh deployments.
   - **Invariants**: Temperature (25°C), Voltage (12V), Current (0.5A), and Power (6W) remain constant.

5. **Power Consumption Demo**:
   - Current surge scenario: 0.5A (6W) $\to$ 0.9A (10.8W warning) $\to$ 1.5A (18W critical).
   - Simulates PWM MOSFET load derating to 45% duty cycle.
   - Recovers safely back to 6.0W baseline.
   - **Invariants**: Ambient Temperature (25.0°C) and Pressure (70.0 kPa) remain constant.

6. **Digital Twin Simulation**:
   - Reimplementation of the high-altitude thermodynamic and electrochemical equations.
   - Inputs: Ambient Temperature (-40 to +50°C), Pressure (35 to 105 kPa), Load % (0 to 100%), Duration (10 to 120 min), Humidity %, Battery Age Cycles, Cooling Architecture, Cold-Start Soak.
   - Outputs: Estimated PCB Junction Temperature, Relative Air Density Proxy ($\rho/\rho_0$), Convective Cooling Efficiency Factor, Usable Battery Capacity %, Battery Voltage Sag (V), Cold-Start Shock Index, Combined Stress Score (0–100), Equipment Risk Classification (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`).
   - Dynamic engineering recommendations for Ladakh operations.
   - Time-series chart and sample results table with CSV export.
   - Persistent educational note: *"This is an educational, first-pass simulation using illustrative equations. It is not a validated digital twin of a specific DRDO device and must not be used to make safety-critical decisions."*

7. **Event Logs**:
   - Searchable, filterable audit ledger with severity filters (`ALL`, `CRITICAL`, `WARNING`, `NORMAL`, `OFFLINE`).
   - Single-click acknowledgement and "Acknowledge All".
   - CSV export for engineering investigations.

8. **Settings**:
   - Configurable prototype thresholds for temperature, pressure, power, voltage, current, and hysteresis bounds.
   - USB Serial Gateway configuration (COM port auto-detect, baud rate, mode switcher).

---

## 5. Mathematical & Digital Twin Formulas

### 5.1 Relative Air Density Proxy ($\rho_{rel}$)
Calculates air thinning relative to International Standard Atmosphere (ISA) sea-level baseline ($P_0 = 101.325\text{ kPa}, T_0 = 293.15\text{ K}$):
$$\rho_{rel} = \left(\frac{P}{P_0}\right) \times \left(\frac{T_0}{T_{amb} + 273.15}\right)$$

### 5.2 Convective Cooling Derating Factor ($E_{cool}$)
In thinner air, active fan blades move fewer air molecules, reducing convective heat transfer:
$$E_{cool} = C_{mode} \times (\rho_{rel})^{k}$$
- *Passive Heatsink*: $C_{mode} = 1.0, k = 0.50$
- *Active Single Fan*: $C_{mode} = 2.2, k = 0.75$
- *Forced Dual Fan*: $C_{mode} = 3.5, k = 0.80$

### 5.3 First-Order PCB Thermal Transient Convergence
Total power dissipated by circuit:
$$P_{diss} = P_{base} + P_{load} = 2.2\text{ W} + 16.0 \times \left(\frac{\text{load}\%}{100}\right)^{1.15}$$
Effective thermal resistance:
$$R_{th} = \frac{3.0}{\max(0.25, E_{cool})}\quad [^\circ\text{C/W}]$$
Steady-state temperature rise:
$$\Delta T_{ss} = P_{diss} \times R_{th}$$
Transient temperature at time $t$ with thermal time constant $\tau = R_{th} \times 4.2\text{ min}$:
$$T_{pcb}(t) = T_{amb} + (T_{init} - T_{amb}) e^{-t/\tau} + \Delta T_{ss} (1 - e^{-t/\tau})$$

### 5.4 Battery Cold Degradation & Internal Resistance (ESR)
Usable capacity percentage:
$$C_{usable}\% = f_{cycle}(\text{cycles}) \times f_{temp}(T_{amb}) \times 100\%$$
Cold temperature penalty on internal resistance $R_i$:
$$R_i = 0.08 \times (1 + 0.0007 \times \text{cycles}) \times \exp\left(\max\left(0, \frac{20 - T_{amb}}{16.0}\right)\right)$$
Voltage sag under load current $I$:
$$\Delta V_{drop} = I \times R_i$$

---

## 6. Installation & Launch Instructions

### Prerequisites
- Python 3.10+ (tested on Python 3.13)
- Node.js 18+ and npm
- (Optional) ESP32 development boards for hardware mode

### Step 1: Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend will start at `http://127.0.0.1:8000`.
API documentation is available at `http://127.0.0.1:8000/docs`.

### Step 2: Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open your browser to `http://localhost:5173`.

### Step 3: Run Automated Test Suite
```bash
cd backend
python -m pytest tests -v
```
All 20 test cases will execute and verify model bounds, hysteresis transitions, demo invariants, API endpoints, and CSV export.

---

## 7. Connecting Physical Hardware (ESP32 LoRa Gateway)

When physical hardware is ready:
1. Flash `firmware/unit1_remote_esp32/unit1_remote_esp32.ino` to Unit 1 (Remote Unit).
2. Flash `firmware/unit2_gateway_esp32/unit2_gateway_esp32.ino` to Unit 2 (Gateway Unit).
3. Connect Unit 2 to your computer via USB.
4. On the dashboard, navigate to **Settings**:
   - Click **Rescan** to identify your ESP32 COM port (e.g., `COM3`, `COM17`, `/dev/ttyUSB0`).
   - Select **HARDWARE SERIAL** acquisition mode.
   - The dashboard will connect at 115200 baud and begin streaming validated LoRa telemetry.
   - If communication is lost or USB is unplugged, the dashboard will immediately display `HARDWARE DISCONNECTED` and flag stale telemetry.

---

## 8. License & Disclaimers

This software is developed for experimental evaluation and student digital twin research. It is not an officially certified defense system and must not be used for life-critical or mission-critical safety decisions without formal hardware-in-the-loop validation.
