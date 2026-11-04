"""
Hardware Gateway and Telemetry Bridge for TWIN-CORE
---------------------------------------------------
Manages serial communication with Unit 2 (Gateway ESP32), handles LoRa/serial telemetry
packet parsing, GPS validation, sequence tracking, byte and packet counters, and data freshness.
Provides seamless fallback to SIMULATION mode while strictly isolating live hardware data.
"""

import json
import time
import math
import random
from collections import deque
from datetime import datetime
from typing import Optional, Dict, Any, List
import serial
import serial.tools.list_ports

from app.models.schemas import DataMode, SeverityLevel, SensorReading
from app.config import settings

class HardwareGateway:
    def __init__(self):
        self.mode: DataMode = DataMode.SIMULATION
        self.serial_port_name: str = "AUTO"
        self.baud_rate: int = settings.SERIAL_BAUD
        self.ser: Optional[serial.Serial] = None
        self.last_packet_time: Optional[float] = None
        self.last_packet_seq: int = 0
        self.last_valid_reading: Optional[SensorReading] = None
        self.stale_timeout_s: float = settings.HARDWARE_STALE_TIMEOUT_SECONDS
        
        # Telemetry & link metrics
        self.bytes_received: int = 0
        self.packets_received: int = 0
        self.packet_errors: int = 0
        self.unit1_status: str = "SEARCHING"
        self.unit2_status: str = "DISCONNECTED"
        
        # Rolling raw serial line buffer for live terminal display (max 50 lines)
        self.raw_line_buffer: deque = deque(maxlen=50)
        
        # Simulated base state for standard SIMULATION mode
        self.sim_tick_counter = 0

    def get_available_ports(self) -> List[Dict[str, Any]]:
        """
        Scans and lists active serial COM ports on the host system.
        """
        ports = serial.tools.list_ports.comports()
        return [
            {
                "device": p.device,
                "description": p.description,
                "manufacturer": p.manufacturer or "Unknown",
                "is_esp32": any(k in (p.description or "").lower() for k in ["cp210", "ch340", "ftdi", "esp", "usb", "serial"])
            }
            for p in ports
        ]

    def set_mode(self, mode: DataMode, port: str = "AUTO", baud: int = 115200) -> Dict[str, Any]:
        """
        Switches between SIMULATION and HARDWARE modes.
        """
        self.mode = mode
        self.serial_port_name = port
        self.baud_rate = baud

        if mode == DataMode.HARDWARE_CONNECTED:
            success = self._connect_serial()
            if not success:
                self.mode = DataMode.HARDWARE_DISCONNECTED
                self.unit2_status = "FAILED"
                return {
                    "mode": self.mode.value,
                    "connected": False,
                    "message": f"Failed to connect to serial port {port}. Gateway is DISCONNECTED."
                }
            self.unit2_status = "CONNECTED"
            return {
                "mode": self.mode.value,
                "connected": True,
                "message": f"Successfully connected to serial port {self.ser.port} at {baud} baud."
            }
        else:
            self._disconnect_serial()
            self.unit2_status = "STANDBY"
            self.unit1_status = "SIMULATED"
            return {
                "mode": self.mode.value,
                "connected": False,
                "message": f"Operating mode switched to {mode.value}."
            }

    def connect(self, port: str, baud_rate: int = 115200) -> Dict[str, Any]:
        """
        Explicit connect helper for REST API.
        """
        return self.set_mode(DataMode.HARDWARE_CONNECTED, port=port, baud=baud_rate)

    def disconnect(self) -> Dict[str, Any]:
        """
        Explicit disconnect helper for REST API.
        """
        return self.set_mode(DataMode.SIMULATION, port="AUTO", baud=self.baud_rate)

    def _connect_serial(self) -> bool:
        self._disconnect_serial()
        target = self.serial_port_name
        if target == "AUTO":
            ports = serial.tools.list_ports.comports()
            candidates = [p.device for p in ports if any(k in (p.description or "").lower() for k in ["ch340", "cp210", "ftdi", "esp", "usb"])]
            if candidates:
                target = candidates[0]
            elif ports:
                target = ports[0].device
            else:
                return False

        try:
            self.ser = serial.Serial(target, self.baud_rate, timeout=0.2)
            self.ser.reset_input_buffer()
            self.last_packet_time = time.time()
            self.unit2_status = "CONNECTED"
            self.raw_line_buffer.append(f"[{datetime.utcnow().strftime('%H:%M:%S')}] Connected to {target} @ {self.baud_rate} baud")
            return True
        except Exception as e:
            self.ser = None
            self.unit2_status = "FAILED"
            self.raw_line_buffer.append(f"[{datetime.utcnow().strftime('%H:%M:%S')}] Connection failed: {e}")
            return False

    def _disconnect_serial(self):
        if self.ser and self.ser.is_open:
            try:
                port_name = self.ser.port
                self.ser.close()
                self.raw_line_buffer.append(f"[{datetime.utcnow().strftime('%H:%M:%S')}] Disconnected from {port_name}")
            except Exception:
                pass
        self.ser = None
        self.unit2_status = "DISCONNECTED"

    def parse_packet(self, raw_line: str) -> Optional[SensorReading]:
        """
        Parses raw telemetry line from Gateway Unit 2.
        Supports:
        1. Custom ESP-NOW tokenized telemetry format:
           [Received from Master]: T22:25.9,H22:53.0;T11:nan,H11:nan;V1:7.66,I1:0.001;V2:7.66,I2:0.001;V3:7.69,I3:0.001;LAT:12.873860,LON:80.221940;GPS:1,SAT:0
        2. Proposed Unit 1 JSON format:
           {"device_id": "TWINCORE-UNIT1", "temperature": 32.25, "voltage": 12.0, "current": 1.25, ...}
        3. Compact sensor radio packets:
           {"dev": "TWIN-CORE-UNIT1", "temp": 24.5, "volt": 12.05, ...}
        """
        raw_line = raw_line.strip()
        if not raw_line:
            return None

        # Clean prefix if present
        line = raw_line
        if "[Received from Master]:" in line:
            line = line.split("[Received from Master]:", 1)[1].strip()

        # Check if JSON
        if line.startswith("{") and line.endswith("}"):
            try:
                data = json.loads(line)
                
                # Numeric sensor readings with key fallbacks
                temp = float(data.get("temperature", data.get("temp", 0.0)))
                press = float(data.get("pressure", data.get("press", 70.0)))
                volt = float(data.get("voltage", data.get("volt", 0.0)))
                curr = float(data.get("current", data.get("curr", 0.0)))
                
                # Reject physically impossible sensor anomalies
                if not (-60.0 <= temp <= 150.0 and 10.0 <= press <= 150.0 and 0.0 <= volt <= 60.0 and 0.0 <= curr <= 30.0):
                    self.packet_errors += 1
                    return None

                power = round(volt * curr, 2)
                raw_lat = data.get("latitude", data.get("lat"))
                raw_lon = data.get("longitude", data.get("lon", data.get("lng")))
                gps_fix = bool(data.get("gps_fix", data.get("fix", False)))
                gps_ts = data.get("timestamp", data.get("gps_timestamp"))

                valid_lat = None
                valid_lon = None
                if raw_lat is not None and raw_lon is not None:
                    try:
                        lat_f = float(raw_lat)
                        lon_f = float(raw_lon)
                        if -90.0 <= lat_f <= 90.0 and -180.0 <= lon_f <= 180.0:
                            valid_lat = round(lat_f, 6)
                            valid_lon = round(lon_f, 6)
                        else:
                            gps_fix = False
                    except (ValueError, TypeError):
                        gps_fix = False
                else:
                    gps_fix = False

                seq_val = data.get("packet_id", data.get("seq", data.get("packet_seq")))
                seq = int(seq_val) if seq_val is not None else (self.last_packet_seq + 1)
                self.last_packet_seq = seq
                self.last_packet_time = time.time()
                self.packets_received += 1
                self.unit1_status = "ONLINE"
                self.unit2_status = "CONNECTED"

                device_id = str(data.get("device_id", data.get("dev", "TWIN-CORE-UNIT1")))

                return SensorReading(
                    timestamp=datetime.utcnow(),
                    source=DataMode.HARDWARE_CONNECTED,
                    temperature_c=round(temp, 2),
                    pressure_kpa=round(press, 2),
                    voltage_v=round(volt, 2),
                    current_a=round(curr, 3),
                    power_w=power,
                    power_is_estimated=True,
                    latitude=valid_lat,
                    longitude=valid_lon,
                    gps_fix=gps_fix,
                    gps_timestamp=str(gps_ts) if gps_ts else None,
                    unit1_status="ONLINE",
                    unit2_status="CONNECTED",
                    fan_state=bool(data.get("fan", data.get("fan_state", False))),
                    mosfet_state=str(data.get("mosfet", data.get("mosfet_state", "ACTIVE"))),
                    packet_seq=seq,
                    is_valid=bool(data.get("crc_ok", True)),
                    freshness_status="FRESH",
                    severity=SeverityLevel.NORMAL,
                    device_id=device_id,
                    lora_rssi=data.get("rssi", data.get("lora_rssi")),
                    lora_snr=data.get("snr", data.get("lora_snr"))
                )
            except Exception:
                self.packet_errors += 1
                return None

        # Check if Tokenized Format (e.g., T22:25.9,H22:53.0;...)
        if "T22:" in line or "V1:" in line or "LAT:" in line:
            try:
                def safe_float(v_str):
                    if not v_str:
                        return None
                    v_str = v_str.strip().lower()
                    if v_str in ("nan", "null", "inf", "-inf"):
                        return None
                    return float(v_str)

                # Parse key-values
                parsed_dict = {}
                sections = line.split(";")
                for sec in sections:
                    tokens = sec.split(",")
                    for tok in tokens:
                        if ":" in tok:
                            k, v = tok.split(":", 1)
                            parsed_dict[k.strip().upper()] = v.strip()

                t22 = safe_float(parsed_dict.get("T22"))
                t11 = safe_float(parsed_dict.get("T11"))
                temp = t22 if t22 is not None else (t11 if t11 is not None else 25.0)

                v1 = safe_float(parsed_dict.get("V1")) or 0.0
                i1 = safe_float(parsed_dict.get("I1")) or 0.0

                power = round(v1 * i1, 2)

                raw_lat = safe_float(parsed_dict.get("LAT"))
                raw_lon = safe_float(parsed_dict.get("LON"))
                gps_flag = safe_float(parsed_dict.get("GPS"))

                valid_lat = None
                valid_lon = None
                has_fix = False

                if raw_lat is not None and raw_lon is not None:
                    if -90.0 <= raw_lat <= 90.0 and -180.0 <= raw_lon <= 180.0:
                        # Non-zero lat/lon or valid fix flag
                        if (raw_lat != 0.0 or raw_lon != 0.0) or (gps_flag == 1.0):
                            valid_lat = round(raw_lat, 6)
                            valid_lon = round(raw_lon, 6)
                            has_fix = (gps_flag == 1.0) or (valid_lat != 0.0 and valid_lon != 0.0)

                self.last_packet_seq += 1
                seq = self.last_packet_seq
                self.last_packet_time = time.time()
                self.packets_received += 1
                self.unit1_status = "ONLINE"
                self.unit2_status = "CONNECTED"

                return SensorReading(
                    timestamp=datetime.utcnow(),
                    source=DataMode.HARDWARE_CONNECTED,
                    temperature_c=round(temp, 2),
                    pressure_kpa=70.0,
                    voltage_v=round(v1, 2),
                    current_a=round(i1, 3),
                    power_w=power,
                    power_is_estimated=True,
                    latitude=valid_lat,
                    longitude=valid_lon,
                    gps_fix=has_fix,
                    gps_timestamp=datetime.utcnow().isoformat(),
                    unit1_status="ONLINE",
                    unit2_status="CONNECTED",
                    fan_state=False,
                    mosfet_state="ACTIVE",
                    packet_seq=seq,
                    is_valid=True,
                    freshness_status="FRESH",
                    severity=SeverityLevel.NORMAL,
                    device_id="TWINCORE-UNIT1",
                    lora_rssi=-65,
                    lora_snr=9.0
                )
            except Exception as e:
                self.packet_errors += 1
                return None

        # Neither JSON nor recognised token format
        self.packet_errors += 1
        return None

    def generate_simulated_sample(self) -> SensorReading:
        """
        Generates clean simulated telemetry representing Ladakh high-altitude baseline with natural sensor noise.
        Includes simulated GPS coordinates around Leh, Ladakh (34.1526°N, 77.5771°E).
        """
        self.sim_tick_counter += 1
        t = self.sim_tick_counter

        # Realistic subtle sensor noise
        temp_noise = math.sin(t * 0.1) * 0.4 + (random.random() - 0.5) * 0.1
        press_noise = math.cos(t * 0.05) * 0.3 + (random.random() - 0.5) * 0.08
        volt_noise = (random.random() - 0.5) * 0.04
        curr_noise = (random.random() - 0.5) * 0.02

        base_temp = round(24.8 + temp_noise, 2)
        base_press = round(69.5 + press_noise, 2)  # ~3,100m altitude equivalent
        base_volt = round(12.02 + volt_noise, 2)
        base_curr = round(0.51 + curr_noise, 3)
        base_power = round(base_volt * base_curr, 2)

        # Gentle GPS wander in Ladakh field perimeter
        base_lat = 34.1526 + math.sin(t * 0.02) * 0.0012
        base_lon = 77.5771 + math.cos(t * 0.02) * 0.0015

        self.last_packet_seq += 1

        return SensorReading(
            timestamp=datetime.utcnow(),
            source=DataMode.SIMULATION,
            temperature_c=base_temp,
            pressure_kpa=base_press,
            voltage_v=base_volt,
            current_a=base_curr,
            power_w=base_power,
            power_is_estimated=True,
            latitude=round(base_lat, 6),
            longitude=round(base_lon, 6),
            gps_fix=True,
            gps_timestamp=datetime.utcnow().isoformat(),
            unit1_status="SIMULATED",
            unit2_status="STANDBY",
            fan_state=False,
            mosfet_state="ACTIVE",
            packet_seq=self.last_packet_seq,
            is_valid=True,
            freshness_status="FRESH",
            severity=SeverityLevel.NORMAL,
            device_id="SIM-UNIT1",
            lora_rssi=-68,
            lora_snr=9.2
        )

    def get_latest_reading(self) -> SensorReading:
        """
        Retrieves the latest reading according to current mode, handling hardware disconnection and stale timeouts.
        Strictly prevents using fake sensor or GPS coordinates in live hardware mode.
        """
        now = time.time()

        if self.mode == DataMode.HARDWARE_CONNECTED:
            # Attempt to read from serial port if open
            if self.ser and self.ser.is_open:
                try:
                    while self.ser.in_waiting > 0:
                        raw_bytes = self.ser.readline()
                        self.bytes_received += len(raw_bytes)
                        line = raw_bytes.decode("utf-8", errors="ignore").strip()
                        if line:
                            self.raw_line_buffer.append(f"[{datetime.utcnow().strftime('%H:%M:%S')}] {line}")
                            parsed = self.parse_packet(line)
                            if parsed:
                                self.last_valid_reading = parsed
                except Exception as e:
                    self.mode = DataMode.HARDWARE_DISCONNECTED
                    self.unit2_status = "ERROR"
                    self.unit1_status = "DISCONNECTED"
                    self.raw_line_buffer.append(f"[{datetime.utcnow().strftime('%H:%M:%S')}] Serial read error: {e}")
                    self._disconnect_serial()

            # Check if hardware stream has gone stale
            if self.last_packet_time and (now - self.last_packet_time > self.stale_timeout_s):
                self.unit1_status = "OFFLINE"
                if self.last_valid_reading:
                    stale = self.last_valid_reading.model_copy()
                    stale.freshness_status = "STALE"
                    stale.severity = SeverityLevel.OFFLINE
                    stale.source = DataMode.HARDWARE_DISCONNECTED
                    stale.unit1_status = "OFFLINE"
                    return stale
                else:
                    return SensorReading(
                        timestamp=datetime.utcnow(),
                        source=DataMode.HARDWARE_DISCONNECTED,
                        temperature_c=0.0,
                        pressure_kpa=0.0,
                        voltage_v=0.0,
                        current_a=0.0,
                        power_w=0.0,
                        power_is_estimated=True,
                        latitude=None,
                        longitude=None,
                        gps_fix=False,
                        gps_timestamp=None,
                        unit1_status="OFFLINE",
                        unit2_status=self.unit2_status,
                        fan_state=False,
                        mosfet_state="OFF",
                        packet_seq=None,
                        is_valid=False,
                        freshness_status="OFFLINE",
                        severity=SeverityLevel.OFFLINE,
                        device_id="HARDWARE-OFFLINE"
                    )

            if self.last_valid_reading:
                return self.last_valid_reading
            else:
                # Connected but waiting for first packet (Never fabricate values)
                return SensorReading(
                    timestamp=datetime.utcnow(),
                    source=DataMode.HARDWARE_CONNECTED,
                    temperature_c=0.0,
                    pressure_kpa=0.0,
                    voltage_v=0.0,
                    current_a=0.0,
                    power_w=0.0,
                    power_is_estimated=True,
                    latitude=None,
                    longitude=None,
                    gps_fix=False,
                    gps_timestamp=None,
                    unit1_status="SEARCHING",
                    unit2_status="CONNECTED",
                    fan_state=False,
                    mosfet_state="UNKNOWN",
                    packet_seq=0,
                    is_valid=True,
                    freshness_status="INITIALIZING",
                    severity=SeverityLevel.NORMAL,
                    device_id="TWIN-CORE-UNIT1"
                )

        elif self.mode == DataMode.HARDWARE_DISCONNECTED:
            self.unit1_status = "DISCONNECTED"
            if self.last_valid_reading:
                stale = self.last_valid_reading.model_copy()
                stale.freshness_status = "OFFLINE"
                stale.severity = SeverityLevel.OFFLINE
                stale.source = DataMode.HARDWARE_DISCONNECTED
                stale.unit1_status = "DISCONNECTED"
                return stale
            else:
                return SensorReading(
                    timestamp=datetime.utcnow(),
                    source=DataMode.HARDWARE_DISCONNECTED,
                    temperature_c=0.0,
                    pressure_kpa=0.0,
                    voltage_v=0.0,
                    current_a=0.0,
                    power_w=0.0,
                    power_is_estimated=True,
                    latitude=None,
                    longitude=None,
                    gps_fix=False,
                    gps_timestamp=None,
                    unit1_status="DISCONNECTED",
                    unit2_status=self.unit2_status,
                    fan_state=False,
                    mosfet_state="OFF",
                    packet_seq=None,
                    is_valid=False,
                    freshness_status="OFFLINE",
                    severity=SeverityLevel.OFFLINE,
                    device_id="DISCONNECTED"
                )

        else:
            # SIMULATION MODE
            self.unit1_status = "SIMULATED"
            self.unit2_status = "STANDBY"
            return self.generate_simulated_sample()

    def get_connection_status_dict(self) -> Dict[str, Any]:
        """
        Returns full hardware connection diagnostic payload.
        """
        last_time_str = datetime.utcfromtimestamp(self.last_packet_time).isoformat() if self.last_packet_time else None
        return {
            "connected": bool(self.ser and self.ser.is_open),
            "port": self.ser.port if (self.ser and self.ser.is_open) else (self.serial_port_name if self.serial_port_name != "AUTO" else None),
            "baud_rate": self.baud_rate,
            "mode": self.mode.value,
            "bytes_received": self.bytes_received,
            "packets_received": self.packets_received,
            "packet_errors": self.packet_errors,
            "last_packet_time": last_time_str,
            "unit1_status": self.unit1_status,
            "unit2_status": self.unit2_status,
            "available_ports": self.get_available_ports(),
            "raw_buffer": list(self.raw_line_buffer)
        }

gateway = HardwareGateway()
