from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any
from app.models.schemas import DemoAction
from app.services.demo_engine import temp_demo, pressure_demo, power_demo

router = APIRouter(prefix="/demos", tags=["Anomaly Demos"])

def get_demo_instance(demo_type: str):
    clean = demo_type.lower()
    if clean in ["temp", "temperature"]:
        return temp_demo
    elif clean in ["press", "pressure"]:
        return pressure_demo
    elif clean in ["power", "load"]:
        return power_demo
    else:
        raise HTTPException(status_code=404, detail=f"Demo type '{demo_type}' not found. Valid: temperature, pressure, power.")

@router.get("/{demo_type}/state")
def get_demo_state(demo_type: str):
    demo = get_demo_instance(demo_type)
    return demo.get_state()

@router.post("/{demo_type}/action")
def perform_demo_action(demo_type: str, action_data: DemoAction):
    demo = get_demo_instance(demo_type)
    act = action_data.action.lower()

    if act == "start":
        demo.start()
    elif act == "pause":
        demo.pause()
    elif act == "reset":
        demo.reset()
    elif act == "return_to_normal":
        demo.return_to_normal()
    elif act == "set_manual_value":
        if action_data.value is None:
            raise HTTPException(status_code=400, detail="Value is required for set_manual_value")
        if demo_type in ["temp", "temperature"]:
            demo.set_manual_temperature(action_data.value)
        elif demo_type in ["press", "pressure"]:
            demo.set_manual_pressure(action_data.value)
        elif demo_type in ["power"]:
            demo.set_manual_current(action_data.value)
    elif act == "set_strategy":
        if demo_type in ["press", "pressure"] and action_data.strategy:
            demo.set_strategy(action_data.strategy)
        else:
            raise HTTPException(status_code=400, detail="Strategy only applicable to pressure demo")
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action '{act}'")

    return demo.get_state()
