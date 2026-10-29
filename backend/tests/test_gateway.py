import time
import pytest
from app.services.gateway import HardwareGateway
from app.models.schemas import DataMode, SeverityLevel

def test_gateway_parse_valid_packet():
    gw = HardwareGateway()
    line = '{"v": 1, "dev": "TWIN-CORE-UNIT1", "seq": 42, "temp": 28.3, "press": 69.1, "volt": 12.1, "curr": 0.52, "fan": 1, "mosfet": "ACTIVE"}'
    reading = gw.parse_packet(line)
    
    assert reading is not None
    assert reading.temperature_c == 28.3
    assert reading.pressure_kpa == 69.1
    assert reading.voltage_v == 12.1
    assert reading.current_a == 0.52
    assert reading.power_w == round(12.1 * 0.52, 2)
    assert reading.fan_state is True
    assert reading.packet_seq == 42
    assert reading.source == DataMode.HARDWARE_CONNECTED

def test_gateway_rejects_corrupt_packet():
    gw = HardwareGateway()
    # Bad JSON
    assert gw.parse_packet("BROKEN_DATA_PACKET") is None
    # Out of physical range
    assert gw.parse_packet('{"temp": 999.0, "press": -10.0}') is None

def test_stale_hardware_detection():
    gw = HardwareGateway()
    gw.mode = DataMode.HARDWARE_CONNECTED
    gw.stale_timeout_s = 0.5  # Short timeout for test
    gw.last_packet_time = time.time() - 1.0  # 1 sec ago, older than 0.5s timeout

    latest = gw.get_latest_reading()
    assert latest.freshness_status in ["STALE", "OFFLINE"]
    assert latest.severity == SeverityLevel.OFFLINE
