import csv
import io
from fastapi import APIRouter, Query, Response
from typing import Optional, List
from app.models.schemas import SensorReading, DataMode
from app.services.simulation_engine import telemetry_engine
from app.services.gateway import gateway

router = APIRouter(prefix="/readings", tags=["Readings"])

@router.get("/latest", response_model=SensorReading)
def get_latest_reading():
    reading = telemetry_engine.latest_reading or gateway.get_latest_reading()
    return reading

@router.get("/history")
def get_readings_history(
    minutes: int = 15,
    limit: int = 300,
    source: Optional[str] = None
):
    # Ensure source is string if passed via FastAPI Query
    src_val = str(source) if (source is not None and not hasattr(source, "default")) else None
    history = telemetry_engine.get_history(minutes=int(minutes), limit=int(limit), source=src_val)
    return {
        "count": len(history),
        "minutes": minutes,
        "readings": history
    }

@router.get("/export")
def export_readings_csv(minutes: int = 60):
    history = telemetry_engine.get_history(minutes=int(minutes), limit=5000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Timestamp", "Source", "Temperature_C", "Pressure_kPa",
        "Voltage_V", "Current_A", "Power_W", "Fan_State", "MOSFET_State", "Severity"
    ])
    for r in history:
        writer.writerow([
            r["timestamp"], r["source"], r["temperature_c"], r["pressure_kpa"],
            r["voltage_v"], r["current_a"], r["power_w"], r["fan_state"],
            r["mosfet_state"], r["severity"]
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=twincore_telemetry.csv"}
    )

@router.get("/network-time")
def get_network_time():
    import time
    from datetime import datetime, timezone, timedelta
    now_utc = datetime.now(timezone.utc)
    # India Standard Time (IST) UTC+5:30 for Ladakh
    ist_tz = timezone(timedelta(hours=5, minutes=30))
    now_ist = now_utc.astimezone(ist_tz)
    
    return {
        "status": "synchronized",
        "utc_iso": now_utc.isoformat(),
        "ist_iso": now_ist.isoformat(),
        "epoch_ms": int(time.time() * 1000),
        "timezone": "Asia/Kolkata",
        "tz_offset_hours": 5.5,
        "source": "INTERNET_NTP_SERVER",
        "formatted_ist": now_ist.strftime("%d %b %Y, %I:%M:%S %p IST")
    }
