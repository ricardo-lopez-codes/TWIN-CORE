import pytest
from app.database import init_db, SessionLocal
from app.models.schemas import DigitalTwinInput, ThresholdSettings, DemoAction, DataMode
from app.api.readings import get_latest_reading, get_readings_history, export_readings_csv
from app.api.simulation import run_simulation, get_latest_simulation, export_simulation_csv
from app.api.settings import get_thresholds, update_thresholds, get_operating_mode, set_operating_mode
from app.api.events import list_events, get_event_summary, acknowledge_event, export_events_csv
from app.api.demos import get_demo_state, perform_demo_action
from app.main import health_check, get_current_mode

init_db()

def test_health_check_function():
    res = health_check()
    assert res["status"] == "healthy"
    assert "TWIN-CORE" in res["service"]

def test_mode_functions():
    mode_info = get_current_mode()
    assert "mode" in mode_info
    assert mode_info["mode"] in ["SIMULATION", "HARDWARE_CONNECTED", "HARDWARE_DISCONNECTED"]

def test_readings_functions():
    r = get_latest_reading()
    assert r.temperature_c is not None
    assert r.pressure_kpa is not None
    assert r.voltage_v is not None
    assert r.current_a is not None
    assert r.power_w is not None

    hist = get_readings_history(minutes=30, limit=50)
    assert "readings" in hist
    assert "count" in hist

    csv_res = export_readings_csv(minutes=15)
    assert csv_res.status_code == 200
    assert b"Temperature_C" in csv_res.body

def test_digital_twin_api():
    inp = DigitalTwinInput(
        ambient_temperature_c=-10.0,
        atmospheric_pressure_kpa=65.0,
        electronic_load_pct=75.0,
        duration_minutes=45,
        relative_humidity_pct=40.0,
        battery_age_cycles=150,
        cooling_mode="active_fan",
        cold_start=True
    )
    result = run_simulation(inp)
    assert result.estimated_pcb_temperature_c is not None
    assert result.combined_stress_index > 0
    assert len(result.time_series) > 0
    assert len(result.recommendations) > 0

    csv_res = export_simulation_csv()
    assert csv_res.status_code == 200
    assert b"TWIN-CORE DIGITAL TWIN SIMULATION EXPORT" in csv_res.body
    assert b"Estimated PCB Temperature" in csv_res.body

def test_thresholds_api_direct():
    db = SessionLocal()
    try:
        current_thresh = get_thresholds(db)
        assert current_thresh.temp_warn > 0

        # Update with valid threshold
        updated_input = ThresholdSettings(
            temp_warn=58.0,
            temp_crit=68.0,
            temp_hysteresis=2.5,
            pressure_warn=64.0,
            pressure_crit=54.0,
            pressure_hysteresis=2.0,
            power_warn=11.0,
            power_crit=16.0,
            power_hysteresis=1.0,
            voltage_min=10.0,
            voltage_max=15.0,
            current_max=2.5
        )
        saved = update_thresholds(updated_input, db)
        assert saved.temp_warn == 58.0
        assert saved.temp_crit == 68.0
    finally:
        db.close()

def test_events_api_direct():
    events = list_events(limit=50)
    assert isinstance(events, list)

    summary = get_event_summary()
    assert "active_warnings" in summary
    assert "critical_faults" in summary

    csv_res = export_events_csv(limit=50)
    assert csv_res.status_code == 200
    assert b"Event ID" in csv_res.body

def test_demos_api_direct():
    # Test state retrieval
    state_temp = get_demo_state("temperature")
    assert state_temp["name"] == "Temperature Anomaly Demo"
    assert state_temp["temperature_c"] == 25.0

    state_press = get_demo_state("pressure")
    assert state_press["name"] == "Pressure Anomaly Demo"
    assert state_press["pressure_kpa"] == 70.0

    state_power = get_demo_state("power")
    assert state_power["name"] == "Power Consumption Anomaly Demo"
    assert state_power["power_w"] == 6.0

    # Test actions
    act_res = perform_demo_action("temperature", DemoAction(action="start"))
    assert act_res["running"] is True

    act_pause = perform_demo_action("temperature", DemoAction(action="pause"))
    assert act_pause["running"] is False

    act_reset = perform_demo_action("temperature", DemoAction(action="reset"))
    assert act_reset["temperature_c"] == 25.0

def test_system_v2_endpoints():
    from app.api.system import (
        get_system_status, get_sensors_latest, get_sensors_history,
        get_gps_location, get_connection_status, start_demo_simulation,
        stop_demo_simulation, reset_demo_simulation
    )
    from app.models.schemas import DemoControlRequest

    # Status
    status = get_system_status()
    assert status.status == "healthy"
    assert status.service is not None
    assert status.unit1_status in ["ONLINE", "SEARCHING", "SIMULATED", "OFFLINE", "DISCONNECTED"]

    # Sensors latest
    latest = get_sensors_latest()
    assert latest.temperature_c is not None
    assert latest.power_w == round(latest.voltage_v * latest.current_a, 2)

    # GPS location
    gps = get_gps_location()
    assert gps.status_text is not None
    if gps.valid:
        assert -90.0 <= gps.latitude <= 90.0
        assert -180.0 <= gps.longitude <= 180.0

    # Connection status
    conn = get_connection_status()
    assert "connected" in conn
    assert "available_ports" in conn
    assert "raw_buffer" in conn

    # Unified Demo controls
    start_res = start_demo_simulation(DemoControlRequest(action="start", speed=2.0))
    assert start_res["status"] == "started"
    assert start_res["demo_state"]["running"] is True
    assert start_res["demo_state"]["speed"] == 2.0

    stop_res = stop_demo_simulation()
    assert stop_res["status"] == "stopped"
    assert stop_res["demo_state"]["running"] is False

    reset_res = reset_demo_simulation()
    assert reset_res["status"] == "reset"
    assert reset_res["demo_state"]["temperature_c"] == 24.8

def test_proposed_hardware_packet_parsing():
    import json
    from app.services.gateway import gateway

    # Proposed Unit 1 format
    packet = {
        "device_id": "TWINCORE-UNIT1",
        "packet_id": 105,
        "temperature": 32.25,
        "voltage": 12.0,
        "current": 1.25,
        "latitude": 34.1526,
        "longitude": 77.5771,
        "gps_fix": True,
        "timestamp": "2026-11-04T10:30:00"
    }
    line = json.dumps(packet)
    parsed = gateway.parse_packet(line)
    assert parsed is not None
    assert parsed.temperature_c == 32.25
    assert parsed.voltage_v == 12.0
    assert parsed.current_a == 1.25
    assert parsed.power_w == 15.0  # 12.0 * 1.25
    assert parsed.latitude == 34.1526
    assert parsed.longitude == 77.5771
    assert parsed.gps_fix is True
    assert parsed.device_id == "TWINCORE-UNIT1"
