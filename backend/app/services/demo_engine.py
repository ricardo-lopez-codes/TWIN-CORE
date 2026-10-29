"""
Demo Engine for TWIN-CORE
-------------------------
Implements deterministic, interactive state machines for:
1. Temperature Anomaly Demo
2. Pressure Anomaly Demo
3. Power Anomaly Demo

Guarantees specified invariants:
- Temp Demo: Pressure, Voltage, Current, Power remain constant.
- Pressure Demo: Temperature, Voltage, Current, Power remain constant.
- Power Demo: Temperature and Pressure remain constant.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from app.models.schemas import SeverityLevel, EventCategory
from app.services.event_logger import event_logger

class BaseDemo:
    def __init__(self, name: str):
        self.name = name
        self.running = False
        self.step_index = 0
        self.timeline: List[Dict[str, Any]] = []

    def record_timeline_event(self, text: str, severity: SeverityLevel = SeverityLevel.NORMAL):
        self.timeline.append({
            "timestamp": datetime.utcnow().isoformat(),
            "step": self.step_index,
            "message": text,
            "severity": severity.value
        })
        # Keep recent 20
        if len(self.timeline) > 20:
            self.timeline.pop(0)

class TemperatureDemo(BaseDemo):
    def __init__(self):
        super().__init__("Temperature Anomaly Demo")
        self.reset()

    def reset(self):
        self.running = False
        self.step_index = 0
        self.phase = "IDLE"  # IDLE, RISING, WARNING_ACTIVE, CRITICAL_ACTIVE, COOLING, RECOVERED
        
        # Invariants & Initial Readings
        self.temperature_c = 25.0
        self.pressure_kpa = 70.0
        self.voltage_v = 12.0
        self.current_a = 0.5
        self.power_w = 6.0
        
        # Thresholds
        self.warn_threshold = 60.0
        self.crit_threshold = 70.0
        self.recovery_threshold = 57.0  # 60 - 3 hysteresis
        
        # Simulated Actuators
        self.simulated_fan_state = False
        self.simulated_mosfet_state = "ACTIVE"
        self.time_above_threshold_s = 0
        self.recovery_status = "NORMAL"
        self.severity = SeverityLevel.NORMAL
        self.timeline = []
        self.record_timeline_event("Temperature demo initialized to 25.0°C baseline.")

    def start(self):
        self.running = True
        self.phase = "RISING" if self.phase == "IDLE" else self.phase
        self.record_timeline_event("Temperature anomaly sequence started.", SeverityLevel.NORMAL)

    def pause(self):
        self.running = False
        self.record_timeline_event("Temperature anomaly sequence paused.", SeverityLevel.NORMAL)

    def set_manual_temperature(self, temp: float):
        self.temperature_c = round(temp, 1)
        self.evaluate_state()
        self.record_timeline_event(f"Manual temperature override: {self.temperature_c}°C")

    def return_to_normal(self):
        self.phase = "COOLING"
        self.simulated_fan_state = True
        self.record_timeline_event("Return to normal requested. Engaging simulated cooling.", SeverityLevel.NORMAL)

    def evaluate_state(self):
        # Always maintain invariants
        self.pressure_kpa = 70.0
        self.voltage_v = 12.0
        self.current_a = 0.5 if self.simulated_mosfet_state != "DERATED" else 0.25
        self.power_w = round(self.voltage_v * self.current_a, 2)

        if self.temperature_c >= self.crit_threshold:
            self.severity = SeverityLevel.CRITICAL
            self.simulated_fan_state = True
            self.simulated_mosfet_state = "DERATED"
            self.recovery_status = "CRITICAL_COOLING"
            self.time_above_threshold_s += 1
            if self.phase != "CRITICAL_ACTIVE":
                self.phase = "CRITICAL_ACTIVE"
                self.record_timeline_event(
                    f"CRITICAL: Temp reached {self.temperature_c:.1f}°C (>= {self.crit_threshold}°C). "
                    "[SIMULATED] High-RPM fan activated & electronic load derated.",
                    SeverityLevel.CRITICAL
                )
                event_logger.log_event(
                    SeverityLevel.CRITICAL,
                    EventCategory.TEMPERATURE,
                    f"Temperature demo reached {self.temperature_c:.1f}°C",
                    action_taken="SIMULATED: Fan ON, Load DERATED",
                    source="DEMO_TEMPERATURE"
                )
        elif self.temperature_c >= self.warn_threshold:
            self.severity = SeverityLevel.WARNING
            self.recovery_status = "WARNING_ELEVATED"
            self.time_above_threshold_s += 1
            if self.phase not in ["WARNING_ACTIVE", "CRITICAL_ACTIVE"]:
                self.phase = "WARNING_ACTIVE"
                self.record_timeline_event(
                    f"WARNING: Temp reached {self.temperature_c:.1f}°C (>= {self.warn_threshold}°C). Recommend cooling.",
                    SeverityLevel.WARNING
                )
        elif self.temperature_c <= self.recovery_threshold:
            self.severity = SeverityLevel.NORMAL
            self.simulated_fan_state = False
            self.simulated_mosfet_state = "ACTIVE"
            self.recovery_status = "RECOVERED_NORMAL"
            if self.phase in ["COOLING", "CRITICAL_ACTIVE", "WARNING_ACTIVE"]:
                self.phase = "RECOVERED"
                self.record_timeline_event(
                    f"RECOVERY CONFIRMED: Temp cooled to {self.temperature_c:.1f}°C. Actuators restored to nominal.",
                    SeverityLevel.NORMAL
                )
                event_logger.log_event(
                    SeverityLevel.NORMAL,
                    EventCategory.TEMPERATURE,
                    f"Temperature recovered below hysteresis threshold to {self.temperature_c:.1f}°C",
                    action_taken="SIMULATED: Actuators returned to NORMAL",
                    source="DEMO_TEMPERATURE"
                )

    def tick(self):
        if not self.running:
            return

        self.step_index += 1

        if self.phase == "RISING":
            # Gradually increase temperature
            self.temperature_c = round(self.temperature_c + 2.8, 1)
            if self.temperature_c >= 74.0:
                self.phase = "CRITICAL_ACTIVE"

        elif self.phase == "CRITICAL_ACTIVE":
            # Sustained critical state for 2 ticks, then cooling starts
            if self.step_index % 3 == 0:
                self.phase = "COOLING"
                self.record_timeline_event("Simulated fan airflow beginning convective temperature reduction.")

        elif self.phase == "COOLING":
            # Cooling model: dT = -(T - 25) * 0.18 per tick
            delta = (self.temperature_c - 25.0) * 0.20
            self.temperature_c = round(max(25.0, self.temperature_c - max(1.8, delta)), 1)
            if self.temperature_c <= self.recovery_threshold:
                self.phase = "RECOVERED"

        elif self.phase == "RECOVERED":
            # Hold at normal
            self.temperature_c = 25.0
            self.running = False

        self.evaluate_state()

    def get_state(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "running": self.running,
            "phase": self.phase,
            "temperature_c": self.temperature_c,
            "pressure_kpa": self.pressure_kpa,
            "voltage_v": self.voltage_v,
            "current_a": self.current_a,
            "power_w": self.power_w,
            "warn_threshold": self.warn_threshold,
            "crit_threshold": self.crit_threshold,
            "recovery_threshold": self.recovery_threshold,
            "simulated_fan_state": self.simulated_fan_state,
            "simulated_mosfet_state": self.simulated_mosfet_state,
            "time_above_threshold_s": self.time_above_threshold_s,
            "recovery_status": self.recovery_status,
            "severity": self.severity.value,
            "timeline": self.timeline,
            "invariants_maintained": True
        }


class PressureDemo(BaseDemo):
    def __init__(self):
        super().__init__("Pressure Anomaly Demo")
        self.reset()

    def reset(self):
        self.running = False
        self.step_index = 0
        self.phase = "IDLE"
        
        # Invariants & Initial Readings
        self.pressure_kpa = 70.0
        self.temperature_c = 25.0
        self.voltage_v = 12.0
        self.current_a = 0.5
        self.power_w = 6.0
        
        # Thresholds
        self.warn_threshold = 65.0
        self.crit_threshold = 55.0
        self.recovery_threshold = 67.0  # 65 + 2 hysteresis
        
        # Strategies: alert_only, stop_test, chamber_vent
        self.strategy = "chamber_vent"
        
        # Simulated Chamber Actuators
        self.simulated_pump_running = True
        self.simulated_vent_valve_open = False
        self.recovery_status = "NORMAL"
        self.severity = SeverityLevel.NORMAL
        self.timeline = []
        self.record_timeline_event("Pressure demo initialized to 70.0 kPa absolute baseline.")

    def set_strategy(self, strategy: str):
        if strategy in ["alert_only", "stop_test", "chamber_vent"]:
            self.strategy = strategy
            self.record_timeline_event(f"Pressure response strategy configured to: {strategy}")

    def start(self):
        self.running = True
        self.phase = "DEPRESSURIZING" if self.phase == "IDLE" else self.phase
        self.record_timeline_event("Pressure depression sequence started.", SeverityLevel.NORMAL)

    def pause(self):
        self.running = False
        self.record_timeline_event("Pressure depression sequence paused.", SeverityLevel.NORMAL)

    def return_to_normal(self):
        self.phase = "RESTORING"
        self.simulated_pump_running = False
        self.simulated_vent_valve_open = True
        self.record_timeline_event("Restoring chamber pressure. Vent valve opened, pump stopped.")

    def set_manual_pressure(self, press: float):
        self.pressure_kpa = round(press, 1)
        self.evaluate_state()
        self.record_timeline_event(f"Manual pressure override: {self.pressure_kpa} kPa")

    def evaluate_state(self):
        # Enforce invariants strictly: Temp, Volt, Curr, Power MUST remain constant
        self.temperature_c = 25.0
        self.voltage_v = 12.0
        self.current_a = 0.5
        self.power_w = 6.0

        if self.pressure_kpa <= self.crit_threshold:
            self.severity = SeverityLevel.CRITICAL
            self.recovery_status = "CRITICAL_LOW_PRESSURE"
            if self.strategy == "chamber_vent":
                self.simulated_pump_running = False
                self.simulated_vent_valve_open = True
            elif self.strategy == "stop_test":
                self.running = False

            if self.phase != "CRITICAL_ACTIVE":
                self.phase = "CRITICAL_ACTIVE"
                action_text = (
                    "[SIMULATED CHAMBER ACTION] Vacuum pump STOPPED, atmospheric vent valve OPENED."
                    if self.strategy == "chamber_vent" else
                    f"[SIMULATED] Test sequence halted ({self.strategy})."
                )
                self.record_timeline_event(
                    f"CRITICAL: Pressure dropped to {self.pressure_kpa:.1f} kPa (<= {self.crit_threshold} kPa). {action_text}",
                    SeverityLevel.CRITICAL
                )
                event_logger.log_event(
                    SeverityLevel.CRITICAL,
                    EventCategory.PRESSURE,
                    f"Pressure demo dropped to {self.pressure_kpa:.1f} kPa",
                    action_taken=action_text,
                    source="DEMO_PRESSURE"
                )
        elif self.pressure_kpa <= self.warn_threshold:
            self.severity = SeverityLevel.WARNING
            self.recovery_status = "WARNING_DEPRESSURIZED"
            if self.phase not in ["WARNING_ACTIVE", "CRITICAL_ACTIVE"]:
                self.phase = "WARNING_ACTIVE"
                self.record_timeline_event(
                    f"WARNING: Pressure reached {self.pressure_kpa:.1f} kPa (<= {self.warn_threshold} kPa). Air density derating active.",
                    SeverityLevel.WARNING
                )
        elif self.pressure_kpa >= self.recovery_threshold:
            self.severity = SeverityLevel.NORMAL
            self.recovery_status = "RECOVERED_NORMAL"
            self.simulated_pump_running = True
            self.simulated_vent_valve_open = False
            if self.phase in ["RESTORING", "CRITICAL_ACTIVE", "WARNING_ACTIVE"]:
                self.phase = "RECOVERED"
                self.record_timeline_event(
                    f"RECOVERY CONFIRMED: Pressure restored to {self.pressure_kpa:.1f} kPa. Valves normalized.",
                    SeverityLevel.NORMAL
                )
                event_logger.log_event(
                    SeverityLevel.NORMAL,
                    EventCategory.PRESSURE,
                    f"Pressure recovered to {self.pressure_kpa:.1f} kPa",
                    action_taken="SIMULATED: Chamber valve CLOSED, Pump Nominal",
                    source="DEMO_PRESSURE"
                )

    def tick(self):
        if not self.running:
            return

        self.step_index += 1

        if self.phase == "DEPRESSURIZING":
            self.pressure_kpa = round(self.pressure_kpa - 2.5, 1)
            if self.pressure_kpa <= 50.0:
                self.phase = "CRITICAL_ACTIVE"

        elif self.phase == "CRITICAL_ACTIVE":
            if self.step_index % 3 == 0:
                self.phase = "RESTORING"
                self.record_timeline_event("Restoring pressure toward atmospheric setpoint via vent valve.")

        elif self.phase == "RESTORING":
            self.pressure_kpa = round(min(70.0, self.pressure_kpa + 3.0), 1)
            if self.pressure_kpa >= self.recovery_threshold:
                self.phase = "RECOVERED"

        elif self.phase == "RECOVERED":
            self.pressure_kpa = 70.0
            self.running = False

        self.evaluate_state()

    def get_state(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "running": self.running,
            "phase": self.phase,
            "pressure_kpa": self.pressure_kpa,
            "temperature_c": self.temperature_c,
            "voltage_v": self.voltage_v,
            "current_a": self.current_a,
            "power_w": self.power_w,
            "warn_threshold": self.warn_threshold,
            "crit_threshold": self.crit_threshold,
            "recovery_threshold": self.recovery_threshold,
            "strategy": self.strategy,
            "simulated_pump_running": self.simulated_pump_running,
            "simulated_vent_valve_open": self.simulated_vent_valve_open,
            "recovery_status": self.recovery_status,
            "severity": self.severity.value,
            "timeline": self.timeline,
            "invariants_maintained": True,
            "educational_note": (
                "Simulated pressure equalization applies to a controlled test chamber with vacuum pumps and vent valves, "
                "not to the ambient atmosphere in a Ladakh outdoor field deployment."
            )
        }


class PowerDemo(BaseDemo):
    def __init__(self):
        super().__init__("Power Consumption Anomaly Demo")
        self.reset()

    def reset(self):
        self.running = False
        self.step_index = 0
        self.phase = "IDLE"
        
        # Invariants & Initial Readings
        self.temperature_c = 25.0
        self.pressure_kpa = 70.0
        self.voltage_v = 12.0
        self.current_a = 0.5
        self.power_w = 6.0
        
        # Thresholds
        self.warn_threshold = 10.0
        self.crit_threshold = 15.0
        self.recovery_threshold = 9.0  # 10 - 1 hysteresis
        
        # Simulated Load Control
        self.load_control_pct = 100.0
        self.simulated_mosfet_state = "ACTIVE"
        self.recovery_status = "NORMAL"
        self.severity = SeverityLevel.NORMAL
        self.timeline = []
        self.record_timeline_event("Power demo initialized to 12.0V, 0.5A (6.0W) baseline.")

    def start(self):
        self.running = True
        self.phase = "SURGING" if self.phase == "IDLE" else self.phase
        self.record_timeline_event("Power surge sequence started.", SeverityLevel.NORMAL)

    def pause(self):
        self.running = False
        self.record_timeline_event("Power surge sequence paused.", SeverityLevel.NORMAL)

    def return_to_normal(self):
        self.phase = "RECOVERING"
        self.load_control_pct = 40.0
        self.simulated_mosfet_state = "DERATED"
        self.record_timeline_event("Load shed requested. Simulated MOSFET reducing duty cycle.", SeverityLevel.NORMAL)

    def set_manual_current(self, current: float):
        self.current_a = round(current, 2)
        self.power_w = round(self.voltage_v * self.current_a, 2)
        self.evaluate_state()
        self.record_timeline_event(f"Manual current set to {self.current_a} A (Power: {self.power_w} W)")

    def evaluate_state(self):
        # Strict invariants: Temp and Pressure MUST stay constant
        self.temperature_c = 25.0
        self.pressure_kpa = 70.0
        self.voltage_v = 12.0
        self.power_w = round(self.voltage_v * self.current_a, 2)

        if self.power_w >= self.crit_threshold:
            self.severity = SeverityLevel.CRITICAL
            self.recovery_status = "CRITICAL_OVERPOWER"
            self.load_control_pct = 45.0
            self.simulated_mosfet_state = "DERATED"
            if self.phase != "CRITICAL_ACTIVE":
                self.phase = "CRITICAL_ACTIVE"
                self.record_timeline_event(
                    f"CRITICAL: Power surged to {self.power_w:.1f} W (>= {self.crit_threshold} W). "
                    "[SIMULATED] PWM load shedding active (MOSFET derated to 45%).",
                    SeverityLevel.CRITICAL
                )
                event_logger.log_event(
                    SeverityLevel.CRITICAL,
                    EventCategory.POWER,
                    f"Power consumption demo surged to {self.power_w:.1f} W",
                    action_taken="SIMULATED: MOSFET duty cycle derated to 45%",
                    source="DEMO_POWER"
                )
        elif self.power_w >= self.warn_threshold:
            self.severity = SeverityLevel.WARNING
            self.recovery_status = "WARNING_HIGH_LOAD"
            if self.phase not in ["WARNING_ACTIVE", "CRITICAL_ACTIVE"]:
                self.phase = "WARNING_ACTIVE"
                self.record_timeline_event(
                    f"WARNING: Power reached {self.power_w:.1f} W (>= {self.warn_threshold} W). Approaching capacity.",
                    SeverityLevel.WARNING
                )
        elif self.power_w <= self.recovery_threshold:
            self.severity = SeverityLevel.NORMAL
            self.recovery_status = "RECOVERED_NORMAL"
            self.load_control_pct = 100.0
            self.simulated_mosfet_state = "ACTIVE"
            if self.phase in ["RECOVERING", "CRITICAL_ACTIVE", "WARNING_ACTIVE"]:
                self.phase = "RECOVERED"
                self.record_timeline_event(
                    f"RECOVERY CONFIRMED: Power normalized to {self.power_w:.1f} W. Load control 100%.",
                    SeverityLevel.NORMAL
                )
                event_logger.log_event(
                    SeverityLevel.NORMAL,
                    EventCategory.POWER,
                    f"Power normalized to {self.power_w:.1f} W",
                    action_taken="SIMULATED: MOSFET restored to 100%",
                    source="DEMO_POWER"
                )

    def tick(self):
        if not self.running:
            return

        self.step_index += 1

        if self.phase == "SURGING":
            self.current_a = round(self.current_a + 0.18, 2)
            if self.current_a >= 1.50:  # 18 W
                self.phase = "CRITICAL_ACTIVE"

        elif self.phase == "CRITICAL_ACTIVE":
            if self.step_index % 3 == 0:
                self.phase = "RECOVERING"
                self.record_timeline_event("Simulated protective load reduction attenuating circuit current.")

        elif self.phase == "RECOVERING":
            # Gradually reduce current back to 0.5A
            self.current_a = round(max(0.5, self.current_a - 0.20), 2)
            if self.power_w <= self.recovery_threshold:
                self.phase = "RECOVERED"

        elif self.phase == "RECOVERED":
            self.current_a = 0.5
            self.running = False

        self.evaluate_state()

    def get_state(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "running": self.running,
            "phase": self.phase,
            "voltage_v": self.voltage_v,
            "current_a": self.current_a,
            "power_w": self.power_w,
            "temperature_c": self.temperature_c,
            "pressure_kpa": self.pressure_kpa,
            "warn_threshold": self.warn_threshold,
            "crit_threshold": self.crit_threshold,
            "recovery_threshold": self.recovery_threshold,
            "load_control_pct": self.load_control_pct,
            "simulated_mosfet_state": self.simulated_mosfet_state,
            "recovery_status": self.recovery_status,
            "severity": self.severity.value,
            "timeline": self.timeline,
            "invariants_maintained": True,
            "safety_note": (
                "Logical load control simulation only. Real MOSFET power stages require gate driver isolation "
                "and thermal validation before hardware actuation."
            )
        }

# Global instances
temp_demo = TemperatureDemo()
pressure_demo = PressureDemo()
power_demo = PowerDemo()
