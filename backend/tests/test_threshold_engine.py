import pytest
from app.models.schemas import SeverityLevel, ThresholdSettings
from app.services.threshold_engine import ThresholdEngine

def test_temperature_threshold_and_hysteresis():
    settings = ThresholdSettings(
        temp_warn=60.0,
        temp_crit=70.0,
        temp_hysteresis=3.0
    )
    engine = ThresholdEngine(settings)
    
    # Normal
    sev, msg = engine.evaluate_temperature(25.0)
    assert sev == SeverityLevel.NORMAL
    
    # Reach warning
    sev, msg = engine.evaluate_temperature(61.0)
    assert sev == SeverityLevel.WARNING
    assert msg is not None

    # Minor drop to 59.0C - should STILL be WARNING due to 3C hysteresis (needs < 57.0C to clear)
    sev, msg = engine.evaluate_temperature(59.0)
    assert sev == SeverityLevel.WARNING
    
    # Reach critical
    sev, msg = engine.evaluate_temperature(71.0)
    assert sev == SeverityLevel.CRITICAL
    
    # Drop to 68.0C - should STILL be CRITICAL (needs < 67.0C)
    sev, msg = engine.evaluate_temperature(68.0)
    assert sev == SeverityLevel.CRITICAL

    # Drop to 66.0C - de-escalates to WARNING
    sev, msg = engine.evaluate_temperature(66.0)
    assert sev == SeverityLevel.WARNING

    # Drop below 56.5C - recovers to NORMAL
    sev, msg = engine.evaluate_temperature(56.0)
    assert sev == SeverityLevel.NORMAL

def test_pressure_depression_threshold():
    settings = ThresholdSettings(
        pressure_warn=65.0,
        pressure_crit=55.0,
        pressure_hysteresis=2.0
    )
    engine = ThresholdEngine(settings)

    # 70 kPa is normal
    sev, _ = engine.evaluate_pressure(70.0)
    assert sev == SeverityLevel.NORMAL

    # Drop to 64 kPa -> WARNING
    sev, _ = engine.evaluate_pressure(64.0)
    assert sev == SeverityLevel.WARNING

    # Drop to 54 kPa -> CRITICAL
    sev, _ = engine.evaluate_pressure(54.0)
    assert sev == SeverityLevel.CRITICAL

    # Rises to 56 kPa -> still CRITICAL (needs > 57 kPa)
    sev, _ = engine.evaluate_pressure(56.0)
    assert sev == SeverityLevel.CRITICAL

    # Rises to 58 kPa -> de-escalates to WARNING
    sev, _ = engine.evaluate_pressure(58.0)
    assert sev == SeverityLevel.WARNING

    # Rises to 68 kPa -> recovers to NORMAL
    sev, _ = engine.evaluate_pressure(68.0)
    assert sev == SeverityLevel.NORMAL
