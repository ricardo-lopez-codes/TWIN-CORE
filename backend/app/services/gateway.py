"""
Hardware Gateway and Telemetry Bridge for TWIN-CORE
---------------------------------------------------
Manages serial communication with Unit 2 (Gateway ESP32), handles LoRa telemetry packet
parsing, data validation, sequence tracking, and data freshness monitoring.
Provides seamless fallback to SIMULATION mode.
"""

import json
import time
import math
import random
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
        
        # Simulated base state for standard SIMULATION mode
        self.sim_tick_counter = 0

    def get_available_ports(self) -> List[Dict[str, str]]:
        """
        Scans and lists active serial COM ports.
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
                return {
                    "mode": self.mode.value,
                    "connected": False,
                    "message": f"Failed to connect to serial port {port}. Gateway is DISCONNECTED."
                }
            return {
                "mode": self.mode.value,
                "connected": True,
                "message": f"Successfully connected to serial port {self.ser.port} at {baud} baud."
            }
        else:
            self._disconnect_serial()
            return {
                "mode": self.mode.value,
                "connected": False,
                "message": f"Operating mode switched to {mode.value}."
            }

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
            return True
        except Exception:
            self.ser = None
            return False

    def _disconnect_serial(self):
        if self.ser and self.ser.is_open:
            try:
                self.ser.close()
            except Exception:
                pass
        self.ser = None

    def parse_packet(self, raw_line: str) -> Optional[SensorReading]:
        """
        Parses raw telemetry line from Gateway ESP32.
        Expected JSON format from Unit 2:
        {
          "v": 1,
          "dev": "TWIN-CORE-UNIT1",
          "seq": 1024,
          "temp": 24.5,
          "press": 68.2,
          "volt": 12.05,
          "curr": 0.49,
          "fan": 0,
          "mosfet": "ACTIVE",
          "rssi": -72,
          "snr": 8.5,
          "crc_ok": true
        }
        """
        raw_line = raw_line.strip()
        if not raw_line or not (raw_line.startswith("{") and raw_line.endswith("}")):
            return None

        try:
            data = json.loads(raw_line)
            
            # Basic validation
            temp = float(data.get("temp", data.get("temperature", 0.0)))
            press = float(data.get("press", data.get("pressure", 70.0)))
            volt = float(data.get("volt", data.get("voltage", 12.0)))
            curr = float(data.get("curr", data.get("current", 0.5)))
            
            # Reject physically impossible sensor anomalies
            if not (-60.0 <= temp <= 150.0 and 10.0 <= press <= 150.0 and 0.0 <= volt <= 50.0 and 0.0 <= curr <= 20.0):
                return None

            power = round(volt * curr, 2)
            seq = int(data.get("seq", self.last_packet_seq + 1))
            self.last_packet_seq = seq
            self.last_packet_time = time.time()

            return SensorReading(
                timestamp=datetime.utcnow(),
                source=DataMode.HARDWARE_CONNECTED,
                temperature_c=round(temp, 2),
                pressure_kpa=round(press, 2),
                voltage_v=round(volt, 2),
                current_a=round(curr, 3),
                power_w=power,
                power_is_estimated=True,
                fan_state=bool(data.get("fan", False)),
                mosfet_state=str(data.get("mosfet", "ACTIVE")),
                packet_seq=seq,
                is_valid=bool(data.get("crc_ok", True)),
                freshness_status="FRESH",
                severity=SeverityLevel.NORMAL,
                device_id=str(data.get("dev", "TWIN-CORE-UNIT1")),
                lora_rssi=data.get("rssi"),
                lora_snr=data.get("snr")
            )
        except Exception:
            return None

    def generate_simulated_sample(self) -> SensorReading:
        """
        Generates clean simulated telemetry representing Ladakh high-altitude baseline with slight natural sensor noise.
        """
        self.sim_tick_counter += 1
        t = self.sim_tick_counter

        # Realistic subtle sensor noise
        temp_noise = math.sin(t * 0.1) * 0.4 + (random.random() - 0.5) * 0.1
        press_noise = math.cos(t * 0.05) * 0.3 + (random.random() - 0.5) * 0.08
        volt_noise = (random.random() - 0.5) * 0.04
        curr_noise = (random.random() - 0.5) * 0.02

        base_temp = 24.8 + temp_noise
        base_press = 69.5 + press_noise  # ~3,100m altitude equivalent
        base_volt = 12.02 + volt_noise
        base_curr = 0.51 + curr_noise
        base_power = round(base_volt * base_curr, 2)

        self.last_packet_seq += 1

        return SensorReading(
            timestamp=datetime.utcnow(),
            source=DataMode.SIMULATION,
            temperature_c=round(base_temp, 2),
            pressure_kpa=round(base_press, 2),
            voltage_v=round(base_volt, 2),
            current_a=round(base_curr, 3),
            power_w=base_power,
            power_is_estimated=True,
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
        """
        now = time.time()

        if self.mode == DataMode.HARDWARE_CONNECTED:
            # Attempt to read from serial port if open
            if self.ser and self.ser.is_open:
                try:
                    while self.ser.in_waiting > 0:
                        line = self.ser.readline().decode("utf-8", errors="ignore")
                        parsed = self.parse_packet(line)
                        if parsed:
                            self.last_valid_reading = parsed
                except Exception:
                    self.mode = DataMode.HARDWARE_DISCONNECTED
                    self._disconnect_serial()

            # Check if hardware stream has gone stale
            if self.last_packet_time and (now - self.last_packet_time > self.stale_timeout_s):
                # Stale reading, never present as live
                if self.last_valid_reading:
                    stale = self.last_valid_reading.model_copy()
                    stale.freshness_status = "STALE"
                    stale.severity = SeverityLevel.OFFLINE
                    stale.source = DataMode.HARDWARE_DISCONNECTED
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
                # Connected but waiting for first packet
                return SensorReading(
                    timestamp=datetime.utcnow(),
                    source=DataMode.HARDWARE_CONNECTED,
                    temperature_c=25.0,
                    pressure_kpa=70.0,
                    voltage_v=12.0,
                    current_a=0.5,
                    power_w=6.0,
                    power_is_estimated=True,
                    fan_state=False,
                    mosfet_state="ACTIVE",
                    packet_seq=0,
                    is_valid=True,
                    freshness_status="INITIALIZING",
                    severity=SeverityLevel.NORMAL,
                    device_id="TWIN-CORE-UNIT1"
                )

        elif self.mode == DataMode.HARDWARE_DISCONNECTED:
            if self.last_valid_reading:
                stale = self.last_valid_reading.model_copy()
                stale.freshness_status = "OFFLINE"
                stale.severity = SeverityLevel.OFFLINE
                stale.source = DataMode.HARDWARE_DISCONNECTED
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
            return self.generate_simulated_sample()

gateway = HardwareGateway()
