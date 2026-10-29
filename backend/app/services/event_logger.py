"""
Event Logger for TWIN-CORE
--------------------------
Persists security, protection, and threshold events to SQLite and provides querying/export.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.db_models import DBEvent
from app.models.schemas import EventCategory, SeverityLevel, EventLog

class EventLogger:
    def __init__(self):
        self.session_event_count = 0

    def log_event(
        self,
        severity: SeverityLevel,
        category: EventCategory,
        description: str,
        action_taken: str = "NONE",
        source: str = "SYSTEM"
    ) -> EventLog:
        """
        Creates and stores an event in the database.
        """
        self.session_event_count += 1
        db: Session = SessionLocal()
        try:
            db_ev = DBEvent(
                timestamp=datetime.utcnow(),
                severity=severity.value,
                category=category.value,
                source=source,
                description=description,
                action_taken=action_taken,
                acknowledged=False,
                recovery_confirmed=(severity == SeverityLevel.NORMAL)
            )
            db.add(db_ev)
            db.commit()
            db.refresh(db_ev)
            return EventLog(
                id=db_ev.id,
                timestamp=db_ev.timestamp,
                severity=severity,
                category=category,
                source=source,
                description=description,
                action_taken=action_taken,
                acknowledged=db_ev.acknowledged,
                recovery_confirmed=db_ev.recovery_confirmed
            )
        finally:
            db.close()

    def get_events(
        self,
        limit: int = 100,
        severity: Optional[str] = None,
        category: Optional[str] = None,
        acknowledged: Optional[bool] = None
    ) -> List[EventLog]:
        db: Session = SessionLocal()
        try:
            query = db.query(DBEvent).order_by(DBEvent.timestamp.desc())
            if severity and isinstance(severity, str):
                query = query.filter(DBEvent.severity == severity.upper())
            if category and isinstance(category, str):
                query = query.filter(DBEvent.category == category.upper())
            if acknowledged is not None and isinstance(acknowledged, bool):
                query = query.filter(DBEvent.acknowledged == acknowledged)
            
            results = query.limit(limit).all()
            return [
                EventLog(
                    id=e.id,
                    timestamp=e.timestamp,
                    severity=SeverityLevel(e.severity),
                    category=EventCategory(e.category),
                    source=e.source,
                    description=e.description,
                    action_taken=e.action_taken,
                    acknowledged=e.acknowledged,
                    recovery_confirmed=e.recovery_confirmed
                )
                for e in results
            ]
        finally:
            db.close()

    def acknowledge_event(self, event_id: int) -> bool:
        db: Session = SessionLocal()
        try:
            ev = db.query(DBEvent).filter(DBEvent.id == event_id).first()
            if ev:
                ev.acknowledged = True
                db.commit()
                return True
            return False
        finally:
            db.close()

    def clear_or_ack_all(self) -> int:
        db: Session = SessionLocal()
        try:
            count = db.query(DBEvent).filter(DBEvent.acknowledged == False).update({"acknowledged": True})
            db.commit()
            return count
        finally:
            db.close()

    def get_summary(self) -> Dict[str, Any]:
        """
        Returns active warning count, critical count, recent protection actions, and session count.
        """
        db: Session = SessionLocal()
        try:
            active_warnings = db.query(DBEvent).filter(
                DBEvent.severity == SeverityLevel.WARNING.value,
                DBEvent.acknowledged == False
            ).count()

            active_critical = db.query(DBEvent).filter(
                DBEvent.severity == SeverityLevel.CRITICAL.value,
                DBEvent.acknowledged == False
            ).count()

            recent_actions = db.query(DBEvent).filter(
                DBEvent.action_taken != "NONE"
            ).order_by(DBEvent.timestamp.desc()).limit(5).all()

            action_list = [
                {
                    "timestamp": a.timestamp.isoformat(),
                    "action": a.action_taken,
                    "reason": a.description
                }
                for a in recent_actions
            ]

            return {
                "active_warnings": active_warnings,
                "critical_faults": active_critical,
                "session_events": self.session_event_count,
                "recent_actions": action_list
            }
        finally:
            db.close()

event_logger = EventLogger()
