import { CONFIG } from '../config'
import { authHeaders } from './authService'

export async function fetchDevices() {
  const r = await fetch(`${CONFIG.apiBaseUrl}/api/devices/`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(CONFIG.apiTimeout),
  })
  if (!r.ok) throw new Error(`API error: ${r.status}`)
  const devices = await r.json()
  return devices.map((d) => ({
    id: d.serial,
    name: d.name,
    enabled: !(d.relay_state ?? false), // NC: relay OFF → plug ON
    serialNumber: d.serial,
  }))
}

export async function claimDevice(serial, name = 'Tomada') {
  const r = await fetch(`${CONFIG.apiBaseUrl}/api/devices/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ serial, name }),
    signal: AbortSignal.timeout(CONFIG.apiTimeout),
  })
  if (!r.ok) {
    const err = await r.json()
    throw new Error(err.detail || 'Erro ao vincular dispositivo')
  }
  return r.json()
}

export async function fetchMetrics(serialNumber) {
  try {
    const r = await fetch(`${CONFIG.apiBaseUrl}/api/energia/${serialNumber}`, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(CONFIG.apiTimeout),
    })
    if (!r.ok) throw new Error(`API error: ${r.status}`)
    const data = await r.json()
    return {
      voltage: data.voltage || 0,
      amperage: data.current || 0,
      power: data.power || 0,
      energy: data.energy || 0,
      frequency: data.frequency || 0,
      pf: data.pf || 0,
    }
  } catch (error) {
    console.warn('Erro ao buscar métricas:', error)
    return { voltage: 0, amperage: 0, power: 0, energy: 0, frequency: 0, pf: 0 }
  }
}

export async function fetchHistory(serialNumber) {
  try {
    const params = new URLSearchParams({ resolution: '1h', points: 24, offset: 0 })
    const r = await fetch(
      `${CONFIG.apiBaseUrl}/api/energia/${serialNumber}/chart?${params}`,
      { headers: authHeaders(), signal: AbortSignal.timeout(CONFIG.apiTimeout) },
    )
    if (!r.ok) throw new Error(`API error: ${r.status}`)
    const data = await r.json()
    return data.labels
      .map((hour, i) => ({ hour, wh: data.values[i] }))
      .filter((item) => item.wh > 0)
      .reverse()
  } catch (error) {
    console.warn('Erro ao buscar histórico:', error)
    return []
  }
}

export async function renameDevice(serialNumber, name) {
  const r = await fetch(`${CONFIG.apiBaseUrl}/api/devices/${serialNumber}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ name }),
    signal: AbortSignal.timeout(CONFIG.apiTimeout),
  })
  if (!r.ok) throw new Error(`API error: ${r.status}`)
  return r.json()
}

export async function unlinkDevice(serialNumber) {
  const r = await fetch(`${CONFIG.apiBaseUrl}/api/devices/${serialNumber}`, {
    method: 'DELETE',
    headers: authHeaders(),
    signal: AbortSignal.timeout(CONFIG.apiTimeout),
  })
  if (!r.ok) throw new Error(`API error: ${r.status}`)
  return r.json()
}

export async function setRelay(serialNumber, state) {
  const r = await fetch(`${CONFIG.apiBaseUrl}/api/devices/${serialNumber}/relay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ state }),
    signal: AbortSignal.timeout(CONFIG.apiTimeout),
  })
  if (!r.ok) throw new Error(`API error: ${r.status}`)
  return r.json()
}

export async function fetchChartData(serialNumber, resolution, points, offset = 0) {
  const params = new URLSearchParams({ resolution, points, offset })
  const r = await fetch(
    `${CONFIG.apiBaseUrl}/api/energia/${serialNumber}/chart?${params}`,
    { headers: authHeaders(), signal: AbortSignal.timeout(CONFIG.apiTimeout) },
  )
  if (!r.ok) throw new Error(`API error: ${r.status}`)
  return r.json() // { labels, values, unit }
}
