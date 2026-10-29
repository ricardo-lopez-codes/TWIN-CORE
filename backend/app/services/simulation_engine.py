"""
Simulation and Telemetry Engine for TWIN-CORE
---------------------------------------------
Coordinates live readings, demo states, threshold checks, SQLite logging,
and WebSocket broadcast dispatch.
"""

import asyncio
from datetime import datetime, timedelta
from typing import Set, List, Dict, Any, Optional
from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.models.schemas import (
    SensorReading, DataMode, SeverityLevel, EventCategory, ThresholdSettings
)
from app.models.db_models import DBReading, DBThreshold
from app.database import SessionLocal
from app.services.gateway import gateway
from app.services.threshold_engine import threshold_engine
from app.services.event_logger import event_logger
from app.services.demo_engine import temp_demo, pressure_demo, power_demo

class TelemetryEngine:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.running: bool = False
        self.task: Optional[asyncio.Task] = None
        self.latest_reading: Optional[SensorReading] = None

    async def connect_ws(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect_ws(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, payload: Dict[str, Any]):
        disconnected = set()
        for ws in self.active_connections:
            try:
                await ws.send_json(payload)
            except Exception:
                disconnected.add(ws)
        for ws in disconnected:
            self.active_connections.discard(ws)

    def get_active_demo_name(self) -> Optional[str]:
        if temp_demo.running or temp_demo.phase not in ["IDLE", "RECOVERED"]:
            return "temperature"
        if pressure_demo.running or pressure_demo.phase not in ["IDLE", "RECOVERED"]:
            return "pressure"
        if power_demo.running or power_demo.phase not in ["IDLE", "RECOVERED"]:
            return "power"
        return None

    def tick_active_telemetry(self) -> SensorReading:
        """
        Determines the source of telemetry for this tick:
        - Active Demo (if running)
        - Gateway (Hardware or Simulation baseline)
        """
        active_demo = self.get_active_demo_name()

        if active_demo == "temperature":
            temp_demo.tick()
            state = temp_demo.get_state()
            reading = SensorReading(
                timestamp=datetime.utcnow(),
                source=DataMode.SIMULATION,
                temperature_c=state["temperature_c"],
                pressure_kpa=state["pressure_kpa"],
                voltage_v=state["voltage_v"],
                current_a=state["current_a"],
                power_w=state["power_w"],
                power_is_estimated=True,
                fan_state=state["simulated_fan_state"],
                mosfet_state=state["simulated_mosfet_state"],
                packet_seq=state["step_index"],
                is_valid=True,
                freshness_status="FRESH",
                severity=SeverityLevel(state["severity"]),
                device_id="SIM-TEMP-DEMO"
            )

        elif active_demo == "pressure":
            pressure_demo.tick()
            state = pressure_demo.get_state()
            reading = SensorReading(
                timestamp=datetime.utcnow(),
                source=DataMode.SIMULATION,
                temperature_c=state["temperature_c"],
                pressure_kpa=state["pressure_kpa"],
                voltage_v=state["voltage_v"],
                current_a=state["current_a"],
                power_w=state["power_w"],
                power_is_estimated=True,
                fan_state=False,
                mosfet_state="ACTIVE",
                packet_seq=state["step_index"],
                is_valid=True,
                freshness_status="FRESH",
                severity=SeverityLevel(state["severity"]),
                device_id="SIM-PRESS-DEMO"
            )

        elif active_demo == "power":
            power_demo.tick()
            state = power_demo.get_state()
            reading = SensorReading(
                timestamp=datetime.utcnow(),
                source=DataMode.SIMULATION,
                temperature_c=state["temperature_c"],
                pressure_kpa=state["pressure_kpa"],
                voltage_v=state["voltage_v"],
                current_a=state["current_a"],
                power_w=state["power_w"],
                power_is_estimated=True,
                fan_state=False,
                mosfet_state=state["simulated_mosfet_state"],
                packet_seq=state["step_index"],
                is_valid=True,
                freshness_status="FRESH",
                severity=SeverityLevel(state["severity"]),
                device_id="SIM-POWER-DEMO"
            )

        else:
            reading = gateway.get_latest_reading()

        # Run threshold checks
        eval_result = threshold_engine.evaluate_all(
            reading.temperature_c,
            reading.pressure_kpa,
            reading.power_w,
            reading.voltage_v,
            reading.current_a
        )
        
        # In demo mode, severity comes from the demo state machine; in live/sim, from threshold engine
        if not active_demo and reading.freshness_status != "OFFLINE":
            reading.severity = eval_result["overall_severity"]

        # Log any transitions
        if not active_demo:
            for cat, sev, msg in eval_result["transitions"]:
                action = "NONE"
                if sev == SeverityLevel.CRITICAL:
                    action = "SAFETY WARNING FLAGGED"
                event_logger.log_event(
                    severity=sev,
                    category=cat,
                    description=msg,
                    action_taken=action,
                    source=reading.source.value
                )

        self.latest_reading = reading
        self.save_reading_to_db(reading)
        return reading

    def save_reading_to_db(self, r: SensorReading):
        # Only log valid readings or status updates to avoid db bloat
        db: Session = SessionLocal()
        try:
            db_item = DBReading(
                timestamp=r.timestamp,
                source=r.source.value,
                temperature_c=r.temperature_c,
                pressure_kpa=r.pressure_kpa,
                voltage_v=r.voltage_v,
                current_a=r.current_a,
                power_w=r.power_w,
                power_is_estimated=r.power_is_estimated,
                fan_state=r.fan_state,
                mosfet_state=r.mosfet_state,
                packet_seq=r.packet_seq,
                is_valid=r.is_valid,
                freshness_status=r.freshness_status,
                severity=r.severity.value,
                device_id=r.device_id
            )
            db.add(db_item)
            db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()

    def get_history(self, minutes: int = 15, limit: int = 200, source: Optional[str] = None) -> List[Dict[str, Any]]:
        db: Session = SessionLocal()
        try:
            cutoff = datetime.utcnow() - timedelta(minutes=minutes)
            query = db.query(DBReading).filter(DBReading.timestamp >= cutoff)
            if source:
                query = query.filter(DBReading.source == source)
            readings = query.order_by(DBReading.timestamp.asc()).limit(limit).all()
            return [
                {
                    "timestamp": r.timestamp.isoformat(),
                    "source": r.source,
                    "temperature_c": r.temperature_c,
                    "pressure_kpa": r.pressure_kpa,
                    "voltage_v": r.voltage_v,
                    "current_a": r.current_a,
                    "power_w": r.power_w,
                    "fan_state": r.fan_state,
                    "mosfet_state": r.mosfet_state,
                    "severity": r.severity
                }
                for r in readings
            ]
        finally:
            db.close()

    async def run_loop(self):
        self.running = True
        while self.running:
            try:
                reading = self.tick_active_telemetry()
                active_demo = self.get_active_demo_name()
                
                # Gather demo states
                demo_states = {
                    "temperature": temp_demo.get_state(),
                    "pressure": pressure_demo.get_state(),
                    "power": power_demo.get_state()
                }

                summary = event_logger.get_summary()

                payload = {
                    "type": "TELEMETRY_UPDATE",
                    "mode": gateway.mode.value,
                    "active_demo": active_demo,
                    "reading": reading.model_dump(mode="json"),
                    "demo_states": demo_states,
                    "event_summary": summary
                }

                await self.broadcast(payload)
            except Exception as e:
                print(f"[TelemetryEngine Error]: {e}")

            await asyncio.sleep(1.0)

    def start_background_loop(self):
        if not self.task or self.task.done():
            self.task = asyncio.create_task(self.run_loop())

    def stop_background_loop(self):
        self.running = False
        if self.task:
            self.task.cancel()

telemetry_engine = TelemetryEngine()
