from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Optional


class UserRegister(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class DeviceClaim(BaseModel):
    serial: str
    name: Optional[str] = "Tomada"


class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:          int
    serial:      str
    name:        str
    relay_state: bool = False


class RelayCommand(BaseModel):
    state: bool


class DeviceRename(BaseModel):
    name: str


class EnergyPost(BaseModel):
    voltage:   float = 0
    current:   float = 0
    power:     float = 0
    energy:    float = 0
    frequency: float = 0
    pf:        float = 0


class EnergyResponse(BaseModel):
    voltage:   float
    current:   float
    power:     float
    energy:    float
    frequency: float
    pf:        float


class HistoryRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    received_at:   datetime
    serial_number: str
    voltage:       float
    power:         float


class HistoryResponse(BaseModel):
    history: list[HistoryRecord]


class ChartResponse(BaseModel):
    labels: list[str]
    values: list[float]
    unit:   str
