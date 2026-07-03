from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Device, User
from schemas import DeviceClaim, DeviceOut, RelayCommand, DeviceRename
from security import get_current_user

router = APIRouter()


@router.post("/claim")
async def claim_device(
    data: DeviceClaim,
    user: User = Depends(get_current_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Device).where(Device.serial_number == data.serial))
    device = result.scalar_one_or_none()

    if device and device.user_id is not None and device.user_id != user.id:
        raise HTTPException(status_code=400, detail="Dispositivo já vinculado a outro usuário")

    if not device:
        device = Device(serial_number=data.serial, name=data.name, user_id=user.id)
        db.add(device)
    else:
        device.user_id = user.id
        device.name    = data.name

    await db.commit()
    return {"ok": True, "serial": data.serial}


@router.get("/", response_model=list[DeviceOut])
async def list_devices(
    user: User = Depends(get_current_user),
    db:   AsyncSession = Depends(get_db),
):
    result  = await db.execute(select(Device).where(Device.user_id == user.id))
    devices = result.scalars().all()
    return [DeviceOut(id=d.id, serial=d.serial_number, name=d.name, relay_state=d.relay_state) for d in devices]


@router.patch("/{serial}")
async def rename_device(
    serial: str,
    data:   DeviceRename,
    user:   User = Depends(get_current_user),
    db:     AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Device).where(Device.serial_number == serial, Device.user_id == user.id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    device.name = data.name
    await db.commit()
    return {"ok": True, "name": data.name}


@router.delete("/{serial}")
async def unlink_device(
    serial: str,
    user:   User = Depends(get_current_user),
    db:     AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Device).where(Device.serial_number == serial, Device.user_id == user.id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    device.user_id = None
    await db.commit()
    return {"ok": True}


@router.post("/{serial}/relay")
async def set_relay(
    serial: str,
    data:   RelayCommand,
    user:   User = Depends(get_current_user),
    db:     AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Device).where(Device.serial_number == serial, Device.user_id == user.id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    device.relay_state = data.state
    await db.commit()
    return {"ok": True, "relay": data.state}
