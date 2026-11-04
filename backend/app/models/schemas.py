from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

class DataMode(str, Enum):
    SIMULATION = "SIMULATION"
    HARDWARE_CONNECTED = "HARDWARE_CONNECTED"
    HARDWARE_DISCONNECTED = "HARDWARE_DISCONNECTED"

class SeverityLevel(str, Enum):
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
    OFFLINE = "OFFLINE"

class EventCategory(str, Enum):
    TEMPERATURE = "TEMPERATURE"
    PRESSURE = "PRESSURE"
    POWER = "POWER"
    VOLTAGE = "VOLTAGE"
    CURRENT = "CURRENT"
    GATEWAY = "GATEWAY"
    SYSTEM = "SYSTEM"

class SensorReading(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source: DataMode = DataMode.SIMULATION
    temperature_c: float = Field(..., description="Ambient or sensor temperature in Celsius")
    pressure_kpa: float = Field(..., description="Atmospheric pressure in kPa absolute")
    voltage_v: float = Field(..., description="Circuit input voltage in Volts")
    current_a: float = Field(..., description="Circuit current in Amperes")
    power_w: float = Field(..., description="Calculated electrical power (V x I) in Watts")
    power_is_estimated: bool = Field(True, description="Indicates if power is calculated vs directly metered")
    latitude: Optional[float] = Field(None, description="GPS latitude in decimal degrees (-90 to +90)")
    longitude: Optional[float] = Field(None, description="GPS longitude in decimal degrees (-180 to +180)")
    gps_fix: bool = Field(False, description="True if valid GPS satellite fix acquired")
    gps_timestamp: Optional[str] = Field(None, description="GPS satellite timestamp UTC if available")
    unit1_status: str = Field("ONLINE", description="UNIT 1 Sensor module link state")
    unit2_status: str = Field("CONNECTED", description="UNIT 2 Gateway module link state")
    fan_state: bool = Field(False, description="Cooling fan ON/OFF state")
    mosfet_state: str = Field("ACTIVE", description="MOSFET/Load controller state (ACTIVE, DERATED, OFF)")
    packet_seq: Optional[int] = Field(None, description="Packet sequence counter")
    is_valid: bool = Field(True, description="Sensor validation check passed")
    freshness_status: str = Field("FRESH", description="FRESH, STALE, or OFFLINE")
    severity: SeverityLevel = SeverityLevel.NORMAL
    device_id: Optional[str] = Field("TWIN-CORE-UNIT1", description="Monitored remote unit ID")
    lora_rssi: Optional[int] = Field(None, description="LoRa/RF RSSI in dBm")
    lora_snr: Optional[float] = Field(None, description="LoRa/RF SNR in dB")

class ThresholdSettings(BaseModel):
    temp_warn: float = Field(60.0, ge=-20.0, le=120.0)
    temp_crit: float = Field(70.0, ge=-20.0, le=140.0)
    temp_hysteresis: float = Field(3.0, ge=0.5, le=10.0)
    
    pressure_warn: float = Field(65.0, ge=30.0, le=110.0)
    pressure_crit: float = Field(55.0, ge=20.0, le=110.0)
    pressure_hysteresis: float = Field(2.0, ge=0.5, le=10.0)
    
    power_warn: float = Field(10.0, ge=1.0, le=50.0)
    power_crit: float = Field(15.0, ge=2.0, le=80.0)
    power_hysteresis: float = Field(1.0, ge=0.2, le=5.0)
    
    voltage_min: float = Field(10.5, ge=5.0, le=15.0)
    voltage_max: float = Field(14.5, ge=10.0, le=30.0)
    current_max: float = Field(2.0, ge=0.5, le=10.0)

    @field_validator("temp_crit")
    @classmethod
    def check_temp_order(cls, v, values):
        if "temp_warn" in values.data and v <= values.data["temp_warn"]:
            raise ValueError("temp_crit must be strictly greater than temp_warn")
        return v

    @field_validator("pressure_crit")
    @classmethod
    def check_pressure_order(cls, v, values):
        if "pressure_warn" in values.data and v >= values.data["pressure_warn"]:
            raise ValueError("pressure_crit must be strictly lower than pressure_warn for high-altitude depression")
        return v

    @field_validator("power_crit")
    @classmethod
    def check_power_order(cls, v, values):
        if "power_warn" in values.data and v <= values.data["power_warn"]:
            raise ValueError("power_crit must be strictly greater than power_warn")
        return v

class EventLog(BaseModel):
    id: Optional[int] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    severity: SeverityLevel
    category: EventCategory
    source: str = "SYSTEM"
    description: str
    action_taken: str = "NONE"
    acknowledged: bool = False
    recovery_confirmed: bool = False

class DigitalTwinInput(BaseModel):
    ambient_temperature_c: float = Field(25.0, ge=-50.0, le=60.0, description="Ambient temp in C")
    atmospheric_pressure_kpa: float = Field(70.0, ge=30.0, le=110.0, description="Absolute pressure in kPa")
    electronic_load_pct: float = Field(50.0, ge=0.0, le=100.0, description="Load percentage 0-100%")
    duration_minutes: int = Field(60, ge=5, le=180, description="Simulation duration in minutes")
    relative_humidity_pct: float = Field(40.0, ge=0.0, le=100.0, description="Relative humidity 0-100%")
    battery_age_cycles: int = Field(100, ge=0, le=1500, description="Equivalent battery discharge cycles")
    cooling_mode: str = Field("active_fan", description="passive, active_fan, forced_convection")
    cold_start: bool = Field(False, description="Whether electronic system was cold-soaked before start")

class DigitalTwinPoint(BaseModel):
    time_min: int
    pcb_temperature_c: float
    ambient_temperature_c: float
    stress_index: float

class DigitalTwinResult(BaseModel):
    estimated_pcb_temperature_c: float
    cold_start_stress: float
    estimated_battery_capacity_pct: float
    estimated_battery_voltage_drop_v: float
    combined_stress_index: float
    relative_air_density_proxy: float
    cooling_efficiency_factor: float
    steady_state_temp_rise_c: float
    risk_classification: str
    recommendations: List[str]
    time_series: List[DigitalTwinPoint]
    disclaimer: str = (
        "This is an educational, first-pass simulation using illustrative equations. "
        "It is not a validated digital twin of a specific DRDO device and must not be used to make safety-critical decisions."
    )

class DemoAction(BaseModel):
    action: str = Field(..., description="start, pause, reset, return_to_normal, set_manual_value, set_strategy")
    value: Optional[float] = None
    strategy: Optional[str] = None

class SystemModeRequest(BaseModel):
    mode: DataMode
    serial_port: Optional[str] = "AUTO"
    baud_rate: Optional[int] = 115200

class ConnectionRequest(BaseModel):
    port: str = Field(..., description="Serial COM port name (e.g. COM3 or /dev/ttyUSB0)")
    baud_rate: int = Field(115200, description="Serial baud rate, e.g. 9600, 115200")

class ConnectionStatusResponse(BaseModel):
    connected: bool
    port: Optional[str] = None
    baud_rate: int = 115200
    mode: DataMode = DataMode.SIMULATION
    bytes_received: int = 0
    packets_received: int = 0
    packet_errors: int = 0
    last_packet_time: Optional[str] = None
    unit1_status: str = "ONLINE"
    unit2_status: str = "CONNECTED"
    available_ports: List[Dict[str, Any]] = []
    raw_buffer: List[str] = []

class GpsLocationResponse(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gps_fix: bool = False
    gps_timestamp: Optional[str] = None
    last_update: Optional[str] = None
    is_simulated: bool = False
    valid: bool = False
    status_text: str = "GPS Unavailable"

class SystemStatusResponse(BaseModel):
    status: str = "healthy"
    service: str = "TWIN-CORE Dashboard"
    version: str = "2.0.0"
    mode: DataMode = DataMode.SIMULATION
    unit1_status: str = "ONLINE"
    unit2_status: str = "CONNECTED"
    active_demo: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class DemoControlRequest(BaseModel):
    action: str = Field(..., description="start, pause, stop, reset, set_speed, set_temperature, set_voltage, set_current")
    speed: Optional[float] = Field(1.0, ge=0.2, le=10.0)
    temperature: Optional[float] = None
    voltage: Optional[float] = None
    current: Optional[float] = None
