"""
Script para popular e testar o backend FastAPI.
Simula os dados que viriam do ESP32.

Uso:
  python test_backend.py
"""

import requests
import time
import random

BASE_URL     = 'http://localhost:5000'
TEST_EMAIL   = 'teste@ecoplug.dev'
TEST_PASS    = 'senha123'
SERIALS      = ['test-socket-01', 'test-socket-02', 'test-socket-03']


# -------------------------------------------------------
# Auth
# -------------------------------------------------------

def get_token() -> str:
    """Registra (se necessário) e faz login, retornando o JWT."""
    # Tenta registrar — ignora se já existe
    requests.post(f'{BASE_URL}/auth/register', json={'email': TEST_EMAIL, 'password': TEST_PASS})

    r = requests.post(f'{BASE_URL}/auth/login', json={'email': TEST_EMAIL, 'password': TEST_PASS}, timeout=5)
    r.raise_for_status()
    token = r.json()['access_token']
    print(f'Login OK — token obtido\n')
    return token


def auth_headers(token: str) -> dict:
    return {'Authorization': f'Bearer {token}'}


# -------------------------------------------------------
# Claim dos dispositivos de teste
# -------------------------------------------------------

def claim_devices(token: str):
    for i, serial in enumerate(SERIALS, 1):
        r = requests.post(
            f'{BASE_URL}/api/devices/claim',
            json={'serial': serial, 'name': f'Tomada {i}'},
            headers=auth_headers(token),
            timeout=5,
        )
        print(f'Claim {serial}: {r.status_code} {r.json()}')


# -------------------------------------------------------
# Envio de métricas (simula ESP32 — sem auth)
# -------------------------------------------------------

def send_metrics(serial: str):
    voltage   = round(random.uniform(220, 240), 2)
    current   = round(random.uniform(0.5, 3.0), 3)
    power     = round(voltage * current, 2)
    frequency = round(random.uniform(59.9, 60.1), 2)
    pf        = round(random.uniform(0.85, 1.0), 2)
    energy    = round(random.uniform(0.1, 5.0), 3)

    payload = {
        'voltage': voltage, 'current': current, 'power': power,
        'energy': energy, 'frequency': frequency, 'pf': pf,
    }

    r = requests.post(f'{BASE_URL}/api/energia/{serial}', json=payload, timeout=5)
    print(f'  POST {serial}: {r.status_code} — V={voltage}V P={power}W')


def populate_history(count: int = 10):
    print(f'Populando histórico ({count} registros por serial)...')
    for serial in SERIALS:
        for _ in range(count):
            send_metrics(serial)
            time.sleep(0.1)
        print(f'  ✓ {serial}')


# -------------------------------------------------------
# Leitura (simula frontend — requer JWT)
# -------------------------------------------------------

def view_current(token: str):
    print('\n--- Leitura atual ---')
    for serial in SERIALS:
        r = requests.get(
            f'{BASE_URL}/api/energia/{serial}',
            headers=auth_headers(token),
            timeout=5,
        )
        if r.status_code == 200:
            d = r.json()
            print(f'  {serial}: V={d["voltage"]}V  I={d["current"]}A  P={d["power"]}W')
        else:
            print(f'  {serial}: {r.status_code} {r.text}')


def view_history(token: str):
    print('\n--- Histórico (últimos 3 de cada) ---')
    for serial in SERIALS:
        r = requests.get(
            f'{BASE_URL}/api/energia/{serial}/history',
            headers=auth_headers(token),
            timeout=5,
        )
        if r.status_code == 200:
            records = r.json().get('history', [])
            print(f'  {serial}: {len(records)} registros')
            for rec in records[:3]:
                print(f'    {rec["received_at"]}  V={rec["voltage"]:.1f}V  P={rec["power"]:.0f}W')
        else:
            print(f'  {serial}: {r.status_code} {r.text}')


# -------------------------------------------------------
# Main
# -------------------------------------------------------

if __name__ == '__main__':
    print('=== Testador EcoPlugWeb ===\n')

    token = get_token()
    claim_devices(token)

    populate_history(count=10)

    view_current(token)
    view_history(token)

    print('\nModo contínuo: enviando dados a cada 5s (Ctrl+C para sair)...\n')
    try:
        while True:
            for serial in SERIALS:
                send_metrics(serial)
            time.sleep(5)
    except KeyboardInterrupt:
        print('\nTeste finalizado.')
