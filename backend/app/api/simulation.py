import csv
import io
from fastapi import APIRouter, Response, Body
from typing import Optional
from app.models.schemas import DigitalTwinInput, DigitalTwinResult
from app.services.digital_twin import run_digital_twin_simulation

router = APIRouter(prefix="/simulation", tags=["Digital Twin"])

_last_simulation_result: Optional[DigitalTwinResult] = None
_last_simulation_input: Optional[DigitalTwinInput] = None

@router.post("/run", response_model=DigitalTwinResult)
def run_simulation(inputs: DigitalTwinInput):
    global _last_simulation_result, _last_simulation_input
    result = run_digital_twin_simulation(inputs)
    _last_simulation_result = result
    _last_simulation_input = inputs
    return result

@router.get("/results", response_model=DigitalTwinResult)
def get_latest_simulation():
    global _last_simulation_result
    if not _last_simulation_result:
        default_inputs = DigitalTwinInput()
        _last_simulation_result = run_digital_twin_simulation(default_inputs)
    return _last_simulation_result

@router.get("/export")
def export_simulation_csv():
    global _last_simulation_result, _last_simulation_input
    if not _last_simulation_result:
        default_inputs = DigitalTwinInput()
        _last_simulation_result = run_digital_twin_simulation(default_inputs)
        _last_simulation_input = default_inputs

    res = _last_simulation_result
    inp = _last_simulation_input or DigitalTwinInput()

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Metadata & Parameters
    writer.writerow(["# TWIN-CORE DIGITAL TWIN SIMULATION EXPORT"])
    writer.writerow(["# " + res.disclaimer])
    writer.writerow([])
    writer.writerow(["INPUT PARAMETER", "VALUE", "UNIT"])
    writer.writerow(["Ambient Temperature", inp.ambient_temperature_c, "deg C"])
    writer.writerow(["Atmospheric Pressure", inp.atmospheric_pressure_kpa, "kPa"])
    writer.writerow(["Electronic Load", inp.electronic_load_pct, "%"])
    writer.writerow(["Simulation Duration", inp.duration_minutes, "minutes"])
    writer.writerow(["Relative Humidity", inp.relative_humidity_pct, "%"])
    writer.writerow(["Battery Age Cycles", inp.battery_age_cycles, "cycles"])
    writer.writerow(["Cooling Mode", inp.cooling_mode, ""])
    writer.writerow(["Cold-Start", inp.cold_start, ""])
    writer.writerow([])
    writer.writerow(["SIMULATED OUTPUT METRIC", "VALUE", "UNIT"])
    writer.writerow(["Estimated PCB Temperature", res.estimated_pcb_temperature_c, "deg C"])
    writer.writerow(["Cold-Start Stress", res.cold_start_stress, "index (0-100)"])
    writer.writerow(["Estimated Usable Battery Capacity", res.estimated_battery_capacity_pct, "%"])
    writer.writerow(["Estimated Battery Voltage Drop", res.estimated_battery_voltage_drop_v, "V"])
    writer.writerow(["Combined Stress Index", res.combined_stress_index, "index (0-100)"])
    writer.writerow(["Relative Air-Density Proxy", res.relative_air_density_proxy, "rho/rho0"])
    writer.writerow(["Cooling Efficiency Factor", res.cooling_efficiency_factor, "multiplier"])
    writer.writerow(["Equipment Risk Classification", res.risk_classification, ""])
    writer.writerow([])
    writer.writerow(["ENGINEERING RECOMMENDATIONS"])
    for rec in res.recommendations:
        writer.writerow(["-", rec])
    writer.writerow([])
    writer.writerow(["TIME-SERIES DATA"])
    writer.writerow(["Time (min)", "PCB Temperature (C)", "Ambient Temperature (C)", "Combined Stress Index"])
    for pt in res.time_series:
        writer.writerow([pt.time_min, pt.pcb_temperature_c, pt.ambient_temperature_c, pt.stress_index])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=twincore_digital_twin_simulation.csv"}
    )
