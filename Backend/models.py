from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, func
from database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True)
    email         = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at    = Column(DateTime, server_default=func.now())


class Device(Base):
    __tablename__ = "devices"

    id            = Column(Integer, primary_key=True)
    serial_number = Column(String, unique=True, nullable=False)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=True)
    name          = Column(String, default="Tomada")
    relay_state   = Column(Boolean, default=False, nullable=False)
    created_at    = Column(DateTime, server_default=func.now())


class EnergyReading(Base):
    __tablename__ = "energy_readings"

    id            = Column(Integer, primary_key=True)
    serial_number = Column(String, nullable=False, index=True)
    voltage       = Column(Float, default=0)
    current       = Column(Float, default=0)
    power         = Column(Float, default=0)
    energy        = Column(Float, default=0)
    frequency     = Column(Float, default=0)
    pf            = Column(Float, default=0)
    received_at   = Column(DateTime, server_default=func.now(), index=True)
