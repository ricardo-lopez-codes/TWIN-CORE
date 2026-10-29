"""
TWIN-CORE Dashboard Backend Application
---------------------------------------
FastAPI backend service for High-Altitude Electronics Digital Twin
and Adaptive Protection System.
"""

import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import init_db
from app.api import readings, events, settings as settings_api, simulation, demos
from app.services.simulation_engine import telemetry_engine
from app.services.gateway import gateway

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite schema
    init_db()
    # Start live telemetry loop only if running live server (not tests)
    is_testing = os.getenv("TESTING") or "pytest" in sys.modules or os.getenv("PYTEST_CURRENT_TEST")
    if not is_testing:
        telemetry_engine.start_background_loop()
    yield
    # Shutdown
    if not is_testing:
        telemetry_engine.stop_background_loop()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Digital Twin and Adaptive Protection System for High-Altitude Electronics (Ladakh Deployment)",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(readings.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(settings_api.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")
app.include_router(demos.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "mode": gateway.mode.value
    }

@app.get("/api/mode")
def get_current_mode():
    return {
        "mode": gateway.mode.value,
        "serial_port": gateway.serial_port_name,
        "baud_rate": gateway.baud_rate,
        "is_connected": bool(gateway.ser and gateway.ser.is_open),
        "last_packet_time": gateway.last_packet_time
    }

@app.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    await telemetry_engine.connect_ws(websocket)
    try:
        while True:
            # Keep connection open and accept client messages/heartbeats
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        telemetry_engine.disconnect_ws(websocket)
    except Exception:
        telemetry_engine.disconnect_ws(websocket)

# ---------------------------------------------------------------------------
# Static frontend serving for unified production & cloud deployment
# ---------------------------------------------------------------------------
frontend_dist = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
)
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API or WebSocket paths
        if full_path.startswith("api") or full_path.startswith("ws"):
            return None
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"error": "Frontend build not found"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
