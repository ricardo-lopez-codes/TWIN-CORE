import pytest
from app.services.demo_engine import TemperatureDemo, PressureDemo, PowerDemo
from app.models.schemas import SeverityLevel

def test_temperature_demo_invariants_and_transitions():
    demo = TemperatureDemo()
    demo.reset()

    # Initial state assertions
    assert demo.temperature_c == 25.0
    assert demo.pressure_kpa == 70.0
    assert demo.voltage_v == 12.0
    assert demo.current_a == 0.5
    assert demo.power_w == 6.0

    demo.start()
    assert demo.running is True

    # Tick until critical threshold crossed
    for _ in range(25):
        demo.tick()
        # Invariants MUST hold: Pressure and Voltage never drift
        assert demo.pressure_kpa == 70.0
        assert demo.voltage_v == 12.0
        if demo.phase == "CRITICAL_ACTIVE":
            break

    assert demo.severity in [SeverityLevel.WARNING, SeverityLevel.CRITICAL]

    # Verify pause
    demo.pause()
    assert demo.running is False
    t_paused = demo.temperature_c
    demo.tick()
    assert demo.temperature_c == t_paused  # Doesn't change while paused

    # Verify reset
    demo.reset()
    assert demo.temperature_c == 25.0
    assert demo.severity == SeverityLevel.NORMAL

def test_pressure_demo_invariants():
    demo = PressureDemo()
    demo.reset()

    assert demo.pressure_kpa == 70.0
    assert demo.temperature_c == 25.0
    assert demo.voltage_v == 12.0
    assert demo.current_a == 0.5
    assert demo.power_w == 6.0

    demo.start()
    for _ in range(15):
        demo.tick()
        # Strictly check invariants: Temp, Volt, Curr, Power must be rock steady
        assert demo.temperature_c == 25.0
        assert demo.voltage_v == 12.0
        assert demo.current_a == 0.5
        assert demo.power_w == 6.0

    assert demo.pressure_kpa < 70.0

def test_power_demo_invariants():
    demo = PowerDemo()
    demo.reset()

    assert demo.voltage_v == 12.0
    assert demo.current_a == 0.5
    assert demo.power_w == 6.0
    assert demo.temperature_c == 25.0
    assert demo.pressure_kpa == 70.0

    demo.start()
    for _ in range(10):
        demo.tick()
        # Strictly check invariants: Temp and Pressure must stay constant
        assert demo.temperature_c == 25.0
        assert demo.pressure_kpa == 70.0
        assert demo.voltage_v == 12.0
        # Power = V * I
        assert demo.power_w == round(demo.voltage_v * demo.current_a, 2)

    assert demo.current_a > 0.5
