import pytest
from app.models.schemas import DigitalTwinInput
from app.services.digital_twin import (
    run_digital_twin_simulation,
    calculate_relative_air_density,
    calculate_cooling_factor,
    calculate_cold_start_stress,
    calculate_battery_metrics
)

def test_relative_air_density():
    # Sea level standard 101.325 kPa at 20 C should be ~1.0
    rho_sea = calculate_relative_air_density(101.325, 20.0)
    assert 0.98 <= rho_sea <= 1.02

    # Ladakh altitude (~4,000m, 60 kPa, 0 C) should be significantly lower (~0.63)
    rho_ladakh = calculate_relative_air_density(60.0, 0.0)
    assert 0.60 <= rho_ladakh <= 0.70
    assert rho_ladakh < rho_sea

def test_cooling_factor_air_thinning():
    # Thinner air must reduce effective convective cooling
    factor_sea = calculate_cooling_factor("active_fan", 1.0)
    factor_high_alt = calculate_cooling_factor("active_fan", 0.65)
    assert factor_high_alt < factor_sea
    assert factor_sea > 2.0

def test_cold_start_stress():
    # Warm start at 25 C has 0 cold stress
    assert calculate_cold_start_stress(25.0, False) == 0.0
    
    # Sub-zero cold start in Ladakh (-20 C)
    stress_no_cs = calculate_cold_start_stress(-20.0, False)
    stress_with_cs = calculate_cold_start_stress(-20.0, True)
    assert stress_no_cs > 30.0
    assert stress_with_cs > stress_no_cs

def test_battery_degradation():
    # Battery at 25 C with 10 cycles has high usable capacity
    cap_warm, vdrop_warm = calculate_battery_metrics(25.0, 10, 50.0)
    # Battery at -20 C with 500 cycles suffers severe degradation
    cap_cold, vdrop_cold = calculate_battery_metrics(-20.0, 500, 50.0)
    
    assert cap_warm > 90.0
    assert cap_cold < 50.0
    assert vdrop_cold > vdrop_warm

def test_full_digital_twin_simulation():
    inputs = DigitalTwinInput(
        ambient_temperature_c=-15.0,
        atmospheric_pressure_kpa=62.0,
        electronic_load_pct=80.0,
        duration_minutes=60,
        relative_humidity_pct=30.0,
        battery_age_cycles=250,
        cooling_mode="active_fan",
        cold_start=True
    )
    result = run_digital_twin_simulation(inputs)
    
    assert len(result.time_series) > 10
    assert result.combined_stress_index > 0
    assert result.relative_air_density_proxy < 1.0
    assert len(result.recommendations) >= 1
    assert "educational, first-pass simulation" in result.disclaimer
