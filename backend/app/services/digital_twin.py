"""
TWIN-CORE Digital Twin Simulation Service
-----------------------------------------
Faithful implementation of the high-altitude electronic circuit simulation model.
Models thermodynamic response, battery degradation, atmospheric derating,
and thermal/dielectric stresses for electronics deployed in extreme environments (e.g. Ladakh).

Persistent Engineering Disclaimer:
"This is an educational, first-pass simulation using illustrative equations.
It is not a validated digital twin of a specific DRDO device and must not be used to make safety-critical decisions."
"""

import math
from typing import List
from app.models.schemas import DigitalTwinInput, DigitalTwinResult, DigitalTwinPoint

# Sea level standard reference conditions (ISA)
P0_KPA = 101.325
T0_KELVIN = 293.15  # 20°C reference

DISCLAIMER_TEXT = (
    "This is an educational, first-pass simulation using illustrative equations. "
    "It is not a validated digital twin of a specific DRDO device and must not be used to make safety-critical decisions."
)

def calculate_relative_air_density(pressure_kpa: float, temp_c: float) -> float:
    """
    Calculates relative air density proxy compared to sea level ISA at 20°C.
    rho_rel = (P / P0) * (T0 / (T + 273.15))
    """
    temp_kelvin = max(1.0, temp_c + 273.15)
    rho_rel = (pressure_kpa / P0_KPA) * (T0_KELVIN / temp_kelvin)
    return max(0.1, min(1.5, rho_rel))

def calculate_cooling_factor(mode: str, rho_rel: float) -> float:
    """
    Calculates effective cooling factor accounting for air thinness at high altitude.
    In thinner air (e.g. Ladakh at 4000m, pressure ~60 kPa), fan convective heat removal
    drops because the mass airflow is reduced.
    """
    mode_clean = mode.lower().replace("-", "_").replace(" ", "_")
    if "forced" in mode_clean or "dual" in mode_clean:
        base = 3.5
        exponent = 0.80
    elif "active" in mode_clean or "fan" in mode_clean:
        base = 2.2
        exponent = 0.75
    else:  # passive
        base = 1.0
        exponent = 0.50

    return base * (rho_rel ** exponent)

def calculate_cold_start_stress(temp_c: float, is_cold_start: bool) -> float:
    """
    Evaluates mechanical and electrical stress caused by cold-soaking before energization.
    Sub-zero cold starts cause inrush current spikes, electrolyte freezing, and solder joint shear stress.
    """
    if temp_c >= 0.0:
        return 5.0 if is_cold_start else 0.0
    
    abs_subzero = abs(temp_c)
    # Severity increases with subzero depth
    multiplier = 1.8 if is_cold_start else 1.0
    stress = abs_subzero * 2.2 * multiplier
    return min(100.0, stress)

def calculate_battery_metrics(temp_c: float, cycles: int, load_pct: float) -> tuple[float, float]:
    """
    Estimates usable battery capacity (%) and load-induced voltage drop (V).
    At Ladakh temperatures (-20°C to +5°C), Li-ion and Lead-Acid chemistries suffer severe capacity loss
    and increased internal resistance (ESR).
    """
    # Cycle life degradation
    f_cycle = max(0.30, 1.0 - (0.00035 * cycles))
    
    # Temperature impact on usable electrochemical capacity
    if temp_c >= 20.0:
        f_temp = max(0.70, 1.0 - (0.002 * (temp_c - 20.0)))
    else:
        # Sharp drop-off in cold temperatures
        delta = 20.0 - temp_c
        f_temp = max(0.15, 1.0 - (0.016 * delta) - (0.0007 * (delta ** 1.8)))
    
    usable_capacity_pct = round(max(5.0, min(100.0, f_cycle * f_temp * 100.0)), 1)
    
    # Internal resistance (Ohms) increases exponentially at subzero temperatures
    cold_penalty = math.exp(max(0.0, (20.0 - temp_c) / 16.0))
    internal_resistance = 0.08 * (1.0 + 0.0007 * cycles) * cold_penalty
    
    # Load current proxy (0.2A baseline to 2.2A full load)
    current_drawn = 0.2 + (load_pct / 100.0) * 2.0
    voltage_drop_v = round(current_drawn * internal_resistance, 2)
    
    return usable_capacity_pct, voltage_drop_v

def generate_recommendations(
    temp_c: float,
    pcb_temp: float,
    pressure_kpa: float,
    rho_rel: float,
    usable_batt_pct: float,
    is_cold_start: bool,
    cooling_mode: str
) -> List[str]:
    """
    Generates dynamic engineering recommendations based on digital twin telemetry.
    """
    recs = []
    
    # Altitude and cooling
    if pressure_kpa < 75.0:
        air_reduction_pct = round((1.0 - rho_rel) * 100, 1)
        recs.append(
            f"High-altitude air thinning detected ({pressure_kpa:.1f} kPa): Convective cooling density reduced by {air_reduction_pct}%. "
            f"Active cooling fan RPM must be derated by +25% or heatsink surface area enlarged."
        )
    
    # Dielectric breakdown / Paschen's Law
    if pressure_kpa < 65.0:
        recs.append(
            "Low atmospheric pressure dielectric caution (Paschen's law): Sparkover and breakdown voltage between PCB traces is reduced. "
            "Verify high-voltage trace clearance and apply conformal coating (MIL-I-46058C)."
        )

    # Thermal warnings
    if pcb_temp >= 70.0:
        recs.append(
            f"High PCB junction temperature ({pcb_temp:.1f}°C): Thermal dissipation bottleneck. "
            f"Activate forced convection or reduce operational duty cycle to protect semiconductor junctions."
        )
    elif pcb_temp < 0.0:
        recs.append(
            f"Sub-zero PCB temperature ({pcb_temp:.1f}°C): Cold-induced clock drift and LCD freezing risk. "
            f"Engage internal heating resistors before critical high-speed computations."
        )

    # Cold start
    if is_cold_start and temp_c < 0.0:
        recs.append(
            f"Cold-start protocol triggered at {temp_c:.1f}°C: Recommend a 3-minute staged pre-heating ramp "
            f"to prevent MLCC dielectric fracture and solder fatigue."
        )

    # Battery
    if usable_batt_pct < 60.0:
        recs.append(
            f"Degraded battery capacity ({usable_batt_pct:.1f}%): Low electrolyte mobility at ambient {temp_c:.1f}°C. "
            f"Add aerogel thermal insulation blanket and prioritize essential sensor telemetry branches."
        )

    if not recs:
        recs.append("All digital twin operational indices are within standard nominal design envelopes.")

    return recs

def run_digital_twin_simulation(inputs: DigitalTwinInput) -> DigitalTwinResult:
    """
    Executes the digital twin equations across the requested duration and parameters.
    """
    rho_rel = calculate_relative_air_density(inputs.ambient_temperature_c, inputs.ambient_temperature_c)
    # Recalculate with pressure:
    rho_rel = calculate_relative_air_density(inputs.atmospheric_pressure_kpa, inputs.ambient_temperature_c)
    cooling_factor = calculate_cooling_factor(inputs.cooling_mode, rho_rel)
    cold_stress = calculate_cold_start_stress(inputs.ambient_temperature_c, inputs.cold_start)
    usable_batt_pct, v_drop = calculate_battery_metrics(
        inputs.ambient_temperature_c, inputs.battery_age_cycles, inputs.electronic_load_pct
    )

    # Thermal power model
    # Base electronics power = 2.2 W, load power up to 16.0 W
    base_power = 2.2
    load_power = 16.0 * ((inputs.electronic_load_pct / 100.0) ** 1.15)
    total_power = base_power + load_power

    # Thermal resistance R_th (°C/W)
    # Natural baseline ~3.0 °C/W, modulated by effective cooling factor
    r_th = 3.0 / max(0.25, cooling_factor)
    steady_state_temp_rise = total_power * r_th
    steady_state_pcb_temp = inputs.ambient_temperature_c + steady_state_temp_rise

    # Initial temperature at t=0
    if inputs.cold_start:
        initial_temp = inputs.ambient_temperature_c
    else:
        initial_temp = min(steady_state_pcb_temp, max(inputs.ambient_temperature_c, 22.0))

    # Time constant tau (in minutes) for thermal mass of PCB
    tau_minutes = max(4.0, r_th * 4.2)

    # Generate time series
    time_series: List[DigitalTwinPoint] = []
    # Generate points across duration
    step = max(1, inputs.duration_minutes // 60)
    final_pcb_temp = initial_temp
    
    for t in range(0, inputs.duration_minutes + 1, step):
        # First-order transient response: T(t) = T_amb + (T_init - T_amb)*e^(-t/tau) + delta_T_ss*(1 - e^(-t/tau))
        transient_factor = 1.0 - math.exp(-t / tau_minutes)
        temp_t = inputs.ambient_temperature_c + (initial_temp - inputs.ambient_temperature_c) * math.exp(-t / tau_minutes) + steady_state_temp_rise * transient_factor
        
        # Local stress proxy at time t
        thermal_dev = max(0.0, temp_t - 55.0) * 1.5 if temp_t >= 25.0 else max(0.0, 5.0 - temp_t) * 1.2
        alt_stress = max(0.0, (1.0 - rho_rel) * 25.0)
        load_stress = ((inputs.electronic_load_pct / 100.0) ** 1.5) * 20.0
        instant_stress = min(100.0, max(5.0, thermal_dev + alt_stress + load_stress + (cold_stress * math.exp(-t / 15.0) * 0.3)))
        
        time_series.append(DigitalTwinPoint(
            time_min=t,
            pcb_temperature_c=round(temp_t, 2),
            ambient_temperature_c=round(inputs.ambient_temperature_c, 2),
            stress_index=round(instant_stress, 1)
        ))
        final_pcb_temp = temp_t

    # Overall Combined Stress Index calculation
    thermal_stress = max(0.0, final_pcb_temp - 55.0) * 1.4 if final_pcb_temp >= 20.0 else max(0.0, 10.0 - final_pcb_temp) * 1.3
    altitude_stress = max(0.0, (1.0 - rho_rel) * 28.0)
    load_stress_component = ((inputs.electronic_load_pct / 100.0) ** 1.5) * 22.0
    cold_start_component = cold_stress * 0.22
    battery_strain_component = (1.0 - (usable_batt_pct / 100.0)) * 15.0

    raw_stress = thermal_stress + altitude_stress + load_stress_component + cold_start_component + battery_strain_component
    combined_stress = round(min(100.0, max(5.0, raw_stress)), 1)

    # Equipment Risk Classification
    if combined_stress >= 78.0 or final_pcb_temp >= 85.0 or final_pcb_temp <= -25.0:
        risk_class = "CRITICAL"
    elif combined_stress >= 60.0 or final_pcb_temp >= 70.0 or final_pcb_temp <= -10.0:
        risk_class = "HIGH"
    elif combined_stress >= 35.0 or final_pcb_temp >= 55.0:
        risk_class = "MODERATE"
    else:
        risk_class = "LOW"

    recommendations = generate_recommendations(
        inputs.ambient_temperature_c,
        final_pcb_temp,
        inputs.atmospheric_pressure_kpa,
        rho_rel,
        usable_batt_pct,
        inputs.cold_start,
        inputs.cooling_mode
    )

    return DigitalTwinResult(
        estimated_pcb_temperature_c=round(final_pcb_temp, 2),
        cold_start_stress=round(cold_stress, 1),
        estimated_battery_capacity_pct=usable_batt_pct,
        estimated_battery_voltage_drop_v=v_drop,
        combined_stress_index=combined_stress,
        relative_air_density_proxy=round(rho_rel, 3),
        cooling_efficiency_factor=round(cooling_factor, 2),
        steady_state_temp_rise_c=round(steady_state_temp_rise, 2),
        risk_classification=risk_class,
        recommendations=recommendations,
        time_series=time_series,
        disclaimer=DISCLAIMER_TEXT
    )
