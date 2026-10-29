from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.schemas import ThresholdSettings, SystemModeRequest
from app.models.db_models import DBThreshold
from app.database import get_db, SessionLocal
from app.services.threshold_engine import threshold_engine
from app.services.gateway import gateway

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("/thresholds", response_model=ThresholdSettings)
def get_thresholds(db: Session = Depends(get_db)):
    db_thresh = db.query(DBThreshold).first()
    if not db_thresh:
        return ThresholdSettings()
    return ThresholdSettings(
        temp_warn=db_thresh.temp_warn,
        temp_crit=db_thresh.temp_crit,
        temp_hysteresis=db_thresh.temp_hysteresis,
        pressure_warn=db_thresh.pressure_warn,
        pressure_crit=db_thresh.pressure_crit,
        pressure_hysteresis=db_thresh.pressure_hysteresis,
        power_warn=db_thresh.power_warn,
        power_crit=db_thresh.power_crit,
        power_hysteresis=db_thresh.power_hysteresis,
        voltage_min=db_thresh.voltage_min,
        voltage_max=db_thresh.voltage_max,
        current_max=db_thresh.current_max
    )

@router.put("/thresholds", response_model=ThresholdSettings)
def update_thresholds(new_thresh: ThresholdSettings, db: Session = Depends(get_db)):
    db_thresh = db.query(DBThreshold).first()
    if not db_thresh:
        db_thresh = DBThreshold()
        db.add(db_thresh)

    for field, val in new_thresh.model_dump().items():
        setattr(db_thresh, field, val)

    db.commit()
    threshold_engine.update_settings(new_thresh)
    return new_thresh

@router.get("/ports")
def list_serial_ports():
    return gateway.get_available_ports()

@router.get("/mode")
def get_operating_mode():
    return {
        "mode": gateway.mode.value,
        "serial_port": gateway.serial_port_name,
        "baud_rate": gateway.baud_rate,
        "is_connected": bool(gateway.ser and gateway.ser.is_open),
        "last_packet_time": gateway.last_packet_time
    }

@router.post("/mode")
def set_operating_mode(req: SystemModeRequest):
    res = gateway.set_mode(req.mode, port=req.serial_port or "AUTO", baud=req.baud_rate or 115200)
    return res
