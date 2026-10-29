"""
Threshold Engine for TWIN-CORE
------------------------------
Monitors sensor readings against configurable prototype thresholds.
Implements hysteresis bounds to prevent alert flapping and logs state transitions.
"""

from typing import Dict, Any, Optional
from app.models.schemas import SeverityLevel, EventCategory, ThresholdSettings

class ThresholdEngine:
    def __init__(self, settings: Optional[ThresholdSettings] = None):
        self.settings = settings or ThresholdSettings()
        # Track current state for hysteresis
        self.temp_state = SeverityLevel.NORMAL
        self.pressure_state = SeverityLevel.NORMAL
        self.power_state = SeverityLevel.NORMAL
        self.voltage_state = SeverityLevel.NORMAL
        self.current_state = SeverityLevel.NORMAL

    def update_settings(self, new_settings: ThresholdSettings):
        self.settings = new_settings

    def evaluate_temperature(self, temp: float) -> tuple[SeverityLevel, Optional[str]]:
        """
        Evaluates temperature with hysteresis.
        Upper threshold logic: Exceeding triggers alert; must drop below (thresh - hyst) to recover.
        """
        s = self.settings
        old_state = self.temp_state
        action_msg = None

        if self.temp_state == SeverityLevel.CRITICAL:
            if temp < (s.temp_crit - s.temp_hysteresis):
                if temp < (s.temp_warn - s.temp_hysteresis):
                    self.temp_state = SeverityLevel.NORMAL
                    action_msg = f"Temperature normalized to {temp:.1f}°C"
                else:
                    self.temp_state = SeverityLevel.WARNING
                    action_msg = f"Temperature de-escalated to WARNING ({temp:.1f}°C)"
        elif self.temp_state == SeverityLevel.WARNING:
            if temp >= s.temp_crit:
                self.temp_state = SeverityLevel.CRITICAL
                action_msg = f"CRITICAL temperature threshold exceeded ({temp:.1f}°C >= {s.temp_crit:.1f}°C)"
            elif temp < (s.temp_warn - s.temp_hysteresis):
                self.temp_state = SeverityLevel.NORMAL
                action_msg = f"Temperature recovered to NORMAL ({temp:.1f}°C)"
        else:  # NORMAL
            if temp >= s.temp_crit:
                self.temp_state = SeverityLevel.CRITICAL
                action_msg = f"CRITICAL temperature spike detected ({temp:.1f}°C >= {s.temp_crit:.1f}°C)"
            elif temp >= s.temp_warn:
                self.temp_state = SeverityLevel.WARNING
                action_msg = f"Temperature warning threshold crossed ({temp:.1f}°C >= {s.temp_warn:.1f}°C)"

        return self.temp_state, action_msg if self.temp_state != old_state else None

    def evaluate_pressure(self, press: float) -> tuple[SeverityLevel, Optional[str]]:
        """
        Evaluates atmospheric pressure with hysteresis for low-pressure high-altitude depression.
        Lower threshold logic: Dropping below threshold triggers alert; must rise above (thresh + hyst) to recover.
        """
        s = self.settings
        old_state = self.pressure_state
        action_msg = None

        if self.pressure_state == SeverityLevel.CRITICAL:
            if press > (s.pressure_crit + s.pressure_hysteresis):
                if press > (s.pressure_warn + s.pressure_hysteresis):
                    self.pressure_state = SeverityLevel.NORMAL
                    action_msg = f"Chamber/ambient pressure normalized to {press:.1f} kPa"
                else:
                    self.pressure_state = SeverityLevel.WARNING
                    action_msg = f"Pressure de-escalated to WARNING ({press:.1f} kPa)"
        elif self.pressure_state == SeverityLevel.WARNING:
            if press <= s.pressure_crit:
                self.pressure_state = SeverityLevel.CRITICAL
                action_msg = f"CRITICAL low pressure threshold reached ({press:.1f} kPa <= {s.pressure_crit:.1f} kPa)"
            elif press > (s.pressure_warn + s.pressure_hysteresis):
                self.pressure_state = SeverityLevel.NORMAL
                action_msg = f"Pressure recovered to NORMAL ({press:.1f} kPa)"
        else:  # NORMAL
            if press <= s.pressure_crit:
                self.pressure_state = SeverityLevel.CRITICAL
                action_msg = f"CRITICAL low pressure drop detected ({press:.1f} kPa <= {s.pressure_crit:.1f} kPa)"
            elif press <= s.pressure_warn:
                self.pressure_state = SeverityLevel.WARNING
                action_msg = f"Atmospheric pressure warning: depressurization detected ({press:.1f} kPa <= {s.pressure_warn:.1f} kPa)"

        return self.pressure_state, action_msg if self.pressure_state != old_state else None

    def evaluate_power(self, power: float) -> tuple[SeverityLevel, Optional[str]]:
        """
        Evaluates power consumption with hysteresis.
        Upper threshold logic.
        """
        s = self.settings
        old_state = self.power_state
        action_msg = None

        if self.power_state == SeverityLevel.CRITICAL:
            if power < (s.power_crit - s.power_hysteresis):
                if power < (s.power_warn - s.power_hysteresis):
                    self.power_state = SeverityLevel.NORMAL
                    action_msg = f"Power consumption normalized to {power:.1f} W"
                else:
                    self.power_state = SeverityLevel.WARNING
                    action_msg = f"Power de-escalated to WARNING ({power:.1f} W)"
        elif self.power_state == SeverityLevel.WARNING:
            if power >= s.power_crit:
                self.power_state = SeverityLevel.CRITICAL
                action_msg = f"CRITICAL power limit reached ({power:.1f} W >= {s.power_crit:.1f} W)"
            elif power < (s.power_warn - s.power_hysteresis):
                self.power_state = SeverityLevel.NORMAL
                action_msg = f"Power consumption recovered to NORMAL ({power:.1f} W)"
        else:  # NORMAL
            if power >= s.power_crit:
                self.power_state = SeverityLevel.CRITICAL
                action_msg = f"CRITICAL power surge ({power:.1f} W >= {s.power_crit:.1f} W)"
            elif power >= s.power_warn:
                self.power_state = SeverityLevel.WARNING
                action_msg = f"Power warning: circuit load high ({power:.1f} W >= {s.power_warn:.1f} W)"

        return self.power_state, action_msg if self.power_state != old_state else None

    def evaluate_all(self, temp: float, press: float, power: float, volt: float, curr: float) -> Dict[str, Any]:
        """
        Evaluates all telemetry readings and determines overall system severity.
        """
        t_sev, t_msg = self.evaluate_temperature(temp)
        p_sev, p_msg = self.evaluate_pressure(press)
        pw_sev, pw_msg = self.evaluate_power(power)

        # Voltage check
        v_msg = None
        if volt < self.settings.voltage_min:
            self.voltage_state = SeverityLevel.WARNING
            v_msg = f"Voltage under-run ({volt:.2f} V < {self.settings.voltage_min:.1f} V)"
        elif volt > self.settings.voltage_max:
            self.voltage_state = SeverityLevel.CRITICAL
            v_msg = f"Voltage over-run ({volt:.2f} V > {self.settings.voltage_max:.1f} V)"
        else:
            self.voltage_state = SeverityLevel.NORMAL

        # Current check
        c_msg = None
        if curr > self.settings.current_max:
            self.current_state = SeverityLevel.CRITICAL
            c_msg = f"Current over-draw ({curr:.2f} A > {self.settings.current_max:.1f} A)"
        else:
            self.current_state = SeverityLevel.NORMAL

        # Highest severity wins
        all_sevs = [t_sev, p_sev, pw_sev, self.voltage_state, self.current_state]
        if SeverityLevel.CRITICAL in all_sevs:
            overall = SeverityLevel.CRITICAL
        elif SeverityLevel.WARNING in all_sevs:
            overall = SeverityLevel.WARNING
        else:
            overall = SeverityLevel.NORMAL

        transitions = []
        if t_msg: transitions.append((EventCategory.TEMPERATURE, t_sev, t_msg))
        if p_msg: transitions.append((EventCategory.PRESSURE, p_sev, p_msg))
        if pw_msg: transitions.append((EventCategory.POWER, pw_sev, pw_msg))
        if v_msg: transitions.append((EventCategory.VOLTAGE, self.voltage_state, v_msg))
        if c_msg: transitions.append((EventCategory.CURRENT, self.current_state, c_msg))

        return {
            "overall_severity": overall,
            "temp_severity": t_sev,
            "pressure_severity": p_sev,
            "power_severity": pw_sev,
            "voltage_severity": self.voltage_state,
            "current_severity": self.current_state,
            "transitions": transitions
        }

threshold_engine = ThresholdEngine()
