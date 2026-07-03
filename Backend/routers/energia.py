from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from database import get_db
from models import Device, EnergyReading, User
from schemas import EnergyPost, EnergyResponse, HistoryResponse, HistoryRecord, ChartResponse
from security import get_current_user

BRT = timedelta(hours=-3)  # UTC-3 (Brasília)

router = APIRouter()

# Configuração das resoluções de agregação
_RES = {
    "1m": {"trunc": "minute", "delta": timedelta(minutes=1), "unit": "W (avg/min)"},
    "1h": {"trunc": "hour",   "delta": timedelta(hours=1),   "unit": "W (avg/hora)"},
    "1d": {"trunc": "day",    "delta": timedelta(days=1),    "unit": "W (avg/dia)"},
}


async def assert_ownership(serial: str, user: User, db: AsyncSession):
    result = await db.execute(
        select(Device).where(Device.serial_number == serial, Device.user_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Dispositivo não pertence a este usuário")


# --- ESP32 envia métricas (sem autenticação de usuário) ---

@router.post("/{serial}")
async def receive_metrics(serial: str, data: EnergyPost, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Device).where(Device.serial_number == serial))
    device = result.scalar_one_or_none()
    if not device:
        device = Device(serial_number=serial)
        db.add(device)

    db.add(EnergyReading(
        serial_number=serial,
        voltage=data.voltage,
        current=data.current,
        power=data.power,
        energy=data.energy,
        frequency=data.frequency,
        pf=data.pf,
    ))
    await db.commit()
    return {"ok": True, "relay": bool(device.relay_state)}


# --- Frontend lê métricas (requer JWT + ownership) ---

@router.get("/{serial}", response_model=EnergyResponse)
async def get_metrics(
    serial: str,
    user:   User = Depends(get_current_user),
    db:     AsyncSession = Depends(get_db),
):
    await assert_ownership(serial, user, db)

    result = await db.execute(
        select(EnergyReading)
        .where(EnergyReading.serial_number == serial)
        .order_by(desc(EnergyReading.received_at))
        .limit(1)
    )
    reading = result.scalar_one_or_none()

    if not reading:
        return EnergyResponse(voltage=0, current=0, power=0, energy=0, frequency=0, pf=0)

    return EnergyResponse(
        voltage=reading.voltage,
        current=reading.current,
        power=reading.power,
        energy=reading.energy,
        frequency=reading.frequency,
        pf=reading.pf,
    )


@router.get("/{serial}/chart", response_model=ChartResponse)
async def get_chart_data(
    serial:     str,
    resolution: str = Query(default="1m", pattern="^(1m|1h|1d)$"),
    points:     int = Query(default=60,   ge=1,    le=720),
    offset:     int = Query(default=0,    ge=0,    le=525600),
    user: User = Depends(get_current_user),
    db:   AsyncSession = Depends(get_db),
):
    """
    Multi-resolution time series com downsampling via date_trunc do PostgreSQL.
    - resolution: granularidade dos buckets (1m, 1h, 1d)
    - points:     quantos buckets retornar
    - offset:     deslocamento em nº de buckets a partir do mais recente (pan)
    Buckets sem leitura retornam 0.0.
    """
    await assert_ownership(serial, user, db)

    now = datetime.utcnow()
    cfg = _RES[resolution]

    # ── resolução dia: usa datas BRT para evitar desvio de fuso ────────────
    if resolution == "1d":
        today      = (now + BRT).date()
        slot_dates = [today - timedelta(days=i + offset) for i in range(points - 1, -1, -1)]
        since_utc  = datetime.combine(slot_dates[0],  datetime.min.time()) - BRT
        until_utc  = datetime.combine(slot_dates[-1], datetime.min.time()) - BRT + timedelta(days=1)

        bucket_expr = func.date_trunc("day", EnergyReading.received_at)
        result = await db.execute(
            select(bucket_expr.label("bucket"), func.avg(EnergyReading.power).label("v"))
            .where(EnergyReading.serial_number == serial,
                   EnergyReading.received_at >= since_utc,
                   EnergyReading.received_at <  until_utc)
            .group_by(bucket_expr)
            .order_by(bucket_expr)
        )
        data = {(r.bucket + BRT).date(): round(float(r.v or 0), 1) for r in result.all()}

        return ChartResponse(
            labels=[d.strftime("%d/%m") for d in slot_dates],
            values=[data.get(d, 0.0) for d in slot_dates],
            unit=cfg["unit"],
        )

    # ── resoluções minuto / hora: UTC alinhado ─────────────────────────────
    trunc = cfg["trunc"]
    delta = cfg["delta"]
    fmt   = "%H:%M" if resolution == "1m" else "%d/%m %Hh"

    if trunc == "minute":
        base = now.replace(second=0, microsecond=0)
    else:
        base = now.replace(minute=0, second=0, microsecond=0)

    until = base - delta * offset
    since = until - delta * points

    bucket_expr = func.date_trunc(trunc, EnergyReading.received_at)
    result = await db.execute(
        select(bucket_expr.label("bucket"), func.avg(EnergyReading.power).label("v"))
        .where(EnergyReading.serial_number == serial,
               EnergyReading.received_at >  since,
               EnergyReading.received_at <= until)
        .group_by(bucket_expr)
        .order_by(bucket_expr)
    )
    data  = {r.bucket: round(float(r.v or 0), 1) for r in result.all()}
    slots = [base - delta * (i + offset) for i in range(points - 1, -1, -1)]

    return ChartResponse(
        labels=[(s + BRT).strftime(fmt) for s in slots],
        values=[data.get(s, 0.0) for s in slots],
        unit=cfg["unit"],
    )


@router.get("/{serial}/history", response_model=HistoryResponse)
async def get_history(
    serial: str,
    user:   User = Depends(get_current_user),
    db:     AsyncSession = Depends(get_db),
):
    await assert_ownership(serial, user, db)

    result = await db.execute(
        select(EnergyReading)
        .where(EnergyReading.serial_number == serial)
        .order_by(desc(EnergyReading.received_at))
        .limit(50)
    )
    readings = result.scalars().all()

    return HistoryResponse(history=[
        HistoryRecord(
            received_at=r.received_at,
            serial_number=r.serial_number,
            voltage=r.voltage,
            power=r.power,
        )
        for r in readings
    ])
