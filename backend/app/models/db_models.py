from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime
from app.database import Base

class DBReading(Base):
    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    source = Column(String, default="SIMULATION", index=True)
    temperature_c = Column(Float, nullable=False)
    pressure_kpa = Column(Float, nullable=False)
    voltage_v = Column(Float, nullable=False)
    current_a = Column(Float, nullable=False)
    power_w = Column(Float, nullable=False)
    power_is_estimated = Column(Boolean, default=True)
    fan_state = Column(Boolean, default=False)
    mosfet_state = Column(String, default="ACTIVE")
    packet_seq = Column(Integer, nullable=True)
    is_valid = Column(Boolean, default=True)
    freshness_status = Column(String, default="FRESH")
    severity = Column(String, default="NORMAL")
    device_id = Column(String, default="TWIN-CORE-UNIT1")

class DBEvent(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    severity = Column(String, default="NORMAL", index=True)
    category = Column(String, default="SYSTEM")
    source = Column(String, default="SYSTEM")
    description = Column(String, nullable=False)
    action_taken = Column(String, default="NONE")
    acknowledged = Column(Boolean, default=False, index=True)
    recovery_confirmed = Column(Boolean, default=False)

class DBThreshold(Base):
    __tablename__ = "threshold_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    temp_warn = Column(Float, default=60.0)
    temp_crit = Column(Float, default=70.0)
    temp_hysteresis = Column(Float, default=3.0)
    
    pressure_warn = Column(Float, default=65.0)
    pressure_crit = Column(Float, default=55.0)
    pressure_hysteresis = Column(Float, default=2.0)
    
    power_warn = Column(Float, default=10.0)
    power_crit = Column(Float, default=15.0)
    power_hysteresis = Column(Float, default=1.0)
    
    voltage_min = Column(Float, default=10.5)
    voltage_max = Column(Float, default=14.5)
    current_max = Column(Float, default=2.0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
