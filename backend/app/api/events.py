import csv
import io
from fastapi import APIRouter, Response, HTTPException
from typing import Optional, List
from app.models.schemas import EventLog
from app.services.event_logger import event_logger

router = APIRouter(prefix="/events", tags=["Events"])

@router.get("", response_model=List[EventLog])
def list_events(
    limit: int = 100,
    severity: Optional[str] = None,
    category: Optional[str] = None,
    acknowledged: Optional[bool] = None
):
    sev_val = str(severity) if (severity is not None and not hasattr(severity, "default")) else None
    cat_val = str(category) if (category is not None and not hasattr(category, "default")) else None
    ack_val = bool(acknowledged) if (acknowledged is not None and not hasattr(acknowledged, "default")) else None

    return event_logger.get_events(
        limit=int(limit),
        severity=sev_val,
        category=cat_val,
        acknowledged=ack_val
    )

@router.get("/summary")
def get_event_summary():
    return event_logger.get_summary()

@router.post("/{event_id}/ack")
def acknowledge_event(event_id: int):
    success = event_logger.acknowledge_event(event_id)
    if not success:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"status": "success", "event_id": event_id, "acknowledged": True}

@router.post("/ack-all")
def acknowledge_all_events():
    count = event_logger.clear_or_ack_all()
    return {"status": "success", "acknowledged_count": count}

@router.get("/export")
def export_events_csv(limit: int = 500):
    events = event_logger.get_events(limit=int(limit))
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Event ID", "Timestamp", "Severity", "Category", "Source",
        "Description", "Action Taken", "Acknowledged", "Recovery Confirmed"
    ])
    for e in events:
        writer.writerow([
            e.id, e.timestamp.isoformat(), e.severity.value, e.category.value,
            e.source, e.description, e.action_taken, e.acknowledged, e.recovery_confirmed
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=twincore_events.csv"}
    )
