"""
System & Sensor Telemetry Endpoints for TWIN-CORE
-------------------------------------------------
Fulfills required API specifications:
- GET  /api/status
- GET  /api/sensors/latest
- GET  /api/sensors/history
- GET  /api/gps/location
- POST /api/connection/connect
- POST /api/connection/disconnect
- GET  /api/connection/status
- POST /api/demo/start
- POST /api/demo/stop
- POST /api/demo/reset
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException, Body

from app.models.schemas import (
    SensorReading, DataMode, ConnectionRequest, ConnectionStatusResponse,
    GpsLocationResponse, SystemStatusResponse, DemoControlRequest
)
from app.services.simulation_engine import telemetry_engine
from app.services.gateway import gateway
from app.services.demo_engine import unified_demo

router = APIRouter(tags=["System & Hardware"])

@router.get("/status", response_model=SystemStatusResponse)
def get_system_status():
    """
    Returns high-level system, gateway, and unit health status.
    """
    return SystemStatusResponse(
        status="healthy",
        service="TWIN-CORE High-Altitude Monitoring Platform",
        version="2.0.0",
        mode=gateway.mode,
        unit1_status=gateway.unit1_status,
        unit2_status=gateway.unit2_status,
        active_demo=telemetry_engine.get_active_demo_name(),
        timestamp=datetime.utcnow().isoformat()
    )

@router.get("/sensors/latest", response_model=SensorReading)
def get_sensors_latest():
    """
    Returns the latest instantaneous sensor telemetry reading.
    """
    reading = telemetry_engine.latest_reading or gateway.get_latest_reading()
    return reading

@router.get("/sensors/history")
def get_sensors_history(
    minutes: int = 15,
    limit: int = 300,
    source: Optional[str] = None
):
    """
    Returns historical sensor records within the specified time window.
    """
    src_val = str(source) if (source is not None and not hasattr(source, "default")) else None
    history = telemetry_engine.get_history(minutes=int(minutes), limit=int(limit), source=src_val)
    return {
        "count": len(history),
        "minutes": minutes,
        "readings": history
    }

@router.get("/gps/location", response_model=GpsLocationResponse)
def get_gps_location():
    """
    Returns current GPS positioning, satellite fix status, and validation flags.
    Never returns fabricated dummy coordinates in live hardware mode.
    """
    reading = telemetry_engine.latest_reading or gateway.get_latest_reading()
    
    lat = reading.latitude
    lon = reading.longitude
    gps_fix = bool(reading.gps_fix)
    
    # Coordinate validation: lat in [-90, 90], lon in [-180, 180]
    is_valid = bool(lat is not None and lon is not None and -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0)
    
    if reading.source == DataMode.HARDWARE_CONNECTED:
        status_text = "3D Satellite Fix Acquired" if (gps_fix and is_valid) else "GPS Unavailable / Searching for Satellites"
    elif reading.source == DataMode.HARDWARE_DISCONNECTED:
        status_text = "Hardware Gateway Disconnected"
    else:
        status_text = "Simulated GPS Coordinate Path (Demo)"

    return GpsLocationResponse(
        latitude=lat if is_valid else None,
        longitude=lon if is_valid else None,
        gps_fix=gps_fix and is_valid,
        gps_timestamp=reading.gps_timestamp,
        last_update=reading.timestamp.isoformat(),
        is_simulated=(reading.source == DataMode.SIMULATION),
        valid=is_valid,
        status_text=status_text
    )

# ---------------------------------------------------------------------------
# Serial Connection Management
# ---------------------------------------------------------------------------

@router.get("/connection/status", response_model=ConnectionStatusResponse)
def get_connection_status():
    """
    Retrieves current serial port status, baud rate, link metrics, and raw log buffer.
    """
    return gateway.get_connection_status_dict()

@router.post("/connection/connect", response_model=ConnectionStatusResponse)
def connect_serial_port(req: Optional[ConnectionRequest] = None):
    """
    Connects to Unit 2 Communication Gateway over USB Serial.
    """
    port = req.port if req and req.port else "AUTO"
    baud = req.baud_rate if req and req.baud_rate else 115200
    gateway.connect(port=port, baud_rate=baud)
    return gateway.get_connection_status_dict()

@router.post("/connection/disconnect", response_model=ConnectionStatusResponse)
def disconnect_serial_port():
    """
    Closes serial link to Unit 2 and falls back safely to SIMULATION mode.
    """
    gateway.disconnect()
    return gateway.get_connection_status_dict()

# ---------------------------------------------------------------------------
# Comprehensive Demo Mode Controls
# ---------------------------------------------------------------------------

@router.post("/demo/start")
def start_demo_simulation(req: Optional[DemoControlRequest] = None):
    """
    Starts the full-system demo simulation.
    """
    # Ensure gateway is in SIMULATION mode to prevent data collisions
    if gateway.mode != DataMode.SIMULATION:
        gateway.set_mode(DataMode.SIMULATION)

    if req:
        if req.speed is not None:
            unified_demo.set_speed(req.speed)
        if any(v is not None for v in [req.temperature, req.voltage, req.current]):
            unified_demo.set_manual_readings(temp=req.temperature, volt=req.voltage, curr=req.current)

    unified_demo.start()
    return {
        "status": "started",
        "demo_state": unified_demo.get_state()
    }

@router.post("/demo/stop")
def stop_demo_simulation():
    """
    Stops/pauses the demo simulation.
    """
    unified_demo.stop()
    return {
        "status": "stopped",
        "demo_state": unified_demo.get_state()
    }

@router.post("/demo/reset")
def reset_demo_simulation():
    """
    Resets the demo simulation to initial baseline.
    """
    unified_demo.reset()
    return {
        "status": "reset",
        "demo_state": unified_demo.get_state()
    }

@router.post("/notify/ntfy")
async def proxy_ntfy_alert(payload: Dict[str, Any] = Body(...)):
    """
    Server-side proxy for ntfy.sh alerts.
    Bypasses browser CORS, ad-blockers, and privacy extensions.
    """
    import urllib.request
    import urllib.parse
    
    topic = payload.get("topic", "").strip()
    title = payload.get("title", "⚠️ TWIN-CORE Equipment Alert")
    body = payload.get("body", "Threshold breached")
    priority = payload.get("priority", "high")
    tags = payload.get("tags", "warning,electric_plug")

    if not topic:
        raise HTTPException(status_code=400, detail="Missing ntfy topic name")

    url = f"https://ntfy.sh/{urllib.parse.quote(topic)}"
    req = urllib.request.Request(
        url,
        data=body.encode("utf-8"),
        headers={
            "Title": title,
            "Priority": priority,
            "Tags": tags,
            "User-Agent": "TWIN-CORE-Alert-System/2.5"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return {"status": "success", "http_status": resp.status}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to dispatch to ntfy.sh: {str(exc)}")
