import { useEffect, useRef, useState } from 'react'
import Header from '../components/Header'
import ManagementSection from '../components/ManagementSection'
import ControlSection from '../components/ControlSection'
import MonitoringSection from '../components/MonitoringSection'
import ChartFilterSection from '../components/ChartFilterSection'
import HistorySection from '../components/HistorySection'
import { useSockets } from '../hooks/useSockets'
import {
  fetchDevices,
  claimDevice,
  fetchChartData,
  fetchHistory,
  fetchMetrics,
  setRelay,
  renameDevice,
  unlinkDevice,
} from '../services/socketService'
import { CONFIG } from '../config'

function HomePage({ onLogout }) {
  const { sockets, initSockets, addSocket, deleteSocket, configureSocket, toggleSocket } =
    useSockets()

  const [monitoringSelection, setMonitoringSelection] = useState([])
  const [chartSelection, setChartSelection] = useState([])
  const [chartPeriod, setChartPeriod] = useState('minuto')
  const [chartData, setChartData] = useState({ labels: [], values: [], unit: 'W' })
  const [chartOffset, setChartOffset] = useState(0)
  const [chartMode, setChartMode] = useState('power')
  const [kwhPrice, setKwhPrice] = useState(0.80)
  const [metrics, setMetrics] = useState({ voltage: 0, amperage: 0, power: 0 })
  const [history, setHistory] = useState([])
  const [online, setOnline] = useState(false)
  const [claimSerial, setClaimSerial] = useState('')
  const [claimName, setClaimName] = useState('')
  const [claimError, setClaimError] = useState('')
  const canvasRef = useRef(null)
  const pollingIntervalRef = useRef(null)
  const chartIntervalRef = useRef(null)

  // Carrega dispositivos do backend ao montar
  useEffect(() => {
    fetchDevices()
      .then((devices) => initSockets(devices))
      .catch(() => {})
  }, [])

  // Atualiza seleções quando a lista de devices muda
  useEffect(() => {
    if (sockets.length && monitoringSelection.length === 0)
      setMonitoringSelection(sockets.map((s) => s.id))
    if (sockets.length && chartSelection.length === 0)
      setChartSelection(sockets.map((s) => s.id))
  }, [sockets])

  // Polling de métricas
  useEffect(() => {
    const firstSerial = sockets[0]?.serialNumber
    if (!firstSerial) return

    const loadData = async () => {
      try {
        const [newMetrics, newHistory] = await Promise.all([
          fetchMetrics(firstSerial),
          fetchHistory(firstSerial),
        ])
        setMetrics(newMetrics)
        setHistory(newHistory)
        setOnline(true)
      } catch {
        setOnline(false)
        setMetrics({ voltage: 0, amperage: 0, power: 0, energy: 0, frequency: 0, pf: 0 })
      }
    }

    loadData()
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    pollingIntervalRef.current = setInterval(loadData, CONFIG.pollingInterval)
    return () => clearInterval(pollingIntervalRef.current)
  }, [sockets])

  // Zoom levels: resolução + nº de pontos + limite do slider de pan
  const ZOOM_CONFIG = {
    minuto: { resolution: '1m', points: 60,  maxOffset: 1440, isBar: false, hoursPerBucket: 1/60 },
    hora:   { resolution: '1h', points: 24,  maxOffset: 720,  isBar: false, hoursPerBucket: 1    },
    dia:    { resolution: '1d', points: 7,   maxOffset: 365,  isBar: true,  hoursPerBucket: 24   },
    mes:    { resolution: '1d', points: 30,  maxOffset: 365,  isBar: true,  hoursPerBucket: 24   },
  }
  const maxOffset = ZOOM_CONFIG[chartPeriod]?.maxOffset ?? 1440

  // Busca dados agregados do backend quando muda zoom, offset ou dispositivo
  useEffect(() => {
    const serial = sockets.find((s) => chartSelection.includes(s.id))?.serialNumber
    if (!serial) return

    const { resolution, points } = ZOOM_CONFIG[chartPeriod]
    const load = () =>
      fetchChartData(serial, resolution, points, chartOffset)
        .then(setChartData)
        .catch(() => {})

    load()

    clearInterval(chartIntervalRef.current)
    // Auto-refresh apenas em minuto com offset 0 (janela mais recente)
    if (chartPeriod === 'minuto' && chartOffset === 0) {
      chartIntervalRef.current = setInterval(load, CONFIG.pollingInterval)
    }
    return () => clearInterval(chartIntervalRef.current)
  }, [sockets, chartSelection, chartPeriod, chartOffset])

  // Renderização do canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = 760
    const H = 320
    canvas.width = W
    canvas.height = H

    const hoursPerBucket = ZOOM_CONFIG[chartPeriod]?.hoursPerBucket ?? 1
    const { labels } = chartData
    const values = chartMode === 'cost'
      ? chartData.values.map((v) => v * hoursPerBucket / 1000 * kwhPrice)
      : chartData.values
    const unit = chartMode === 'cost' ? 'R$ (custo)' : chartData.unit
    const isBar = ZOOM_CONFIG[chartPeriod]?.isBar ?? false
    const fmtY = chartMode === 'cost'
      ? (v) => v < 0.01 ? v.toFixed(4) : v.toFixed(2)
      : (v) => v.toFixed(0)

    const PAD = { top: 35, right: 20, bottom: 50, left: 55 }
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom

    ctx.fillStyle = '#1a202c'
    ctx.fillRect(0, 0, W, H)

    const maxVal = values.length ? Math.max(...values) * 1.15 || 10 : 10
    const toY = (v) => PAD.top + plotH - (v / maxVal) * plotH
    const toX = (i) => PAD.left + (i / Math.max(values.length - 1, 1)) * plotW

    // Grade horizontal + eixo Y (sempre renderiza)
    for (let i = 0; i <= 4; i++) {
      const v = (maxVal / 4) * i
      const y = toY(v)
      ctx.strokeStyle = '#2d3748'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(PAD.left, y)
      ctx.lineTo(PAD.left + plotW, y)
      ctx.stroke()
      ctx.fillStyle = '#718096'
      ctx.font = '11px Arial'
      ctx.textAlign = 'right'
      ctx.fillText(fmtY(v), PAD.left - 6, y + 4)
    }

    // Unidade
    ctx.fillStyle = '#718096'
    ctx.font = '11px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(unit, 4, 14)

    if (!values.length) {
      ctx.fillStyle = '#4a5568'
      ctx.font = '13px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('Sem dados para o período selecionado', W / 2, H / 2)
      return
    }

    // Eixo X — labels espaçados
    const step = Math.max(1, Math.ceil(labels.length / 10))
    ctx.fillStyle = '#718096'
    ctx.font = '11px Arial'
    ctx.textAlign = 'center'
    labels.forEach((label, i) => {
      if (i % step === 0 || i === labels.length - 1) {
        const x = isBar
          ? PAD.left + (i + 0.5) * (plotW / values.length)
          : toX(i)
        ctx.fillText(label, x, H - PAD.bottom + 18)
      }
    })

    if (isBar) {
      const slotW = plotW / values.length
      const MIN_H = 2  // mínimo de 2px para zeros ficarem visíveis
      values.forEach((v, i) => {
        const barH = Math.max((v / maxVal) * plotH, v > 0 ? MIN_H : 0)
        ctx.fillStyle = v > 0 ? '#4299e1' : '#2d3748'
        ctx.fillRect(PAD.left + i * slotW + 1, PAD.top + plotH - barH, slotW - 2, Math.max(barH, MIN_H))
      })
    } else {
      // Área sob a linha
      ctx.beginPath()
      ctx.moveTo(toX(0), PAD.top + plotH)
      values.forEach((v, i) => ctx.lineTo(toX(i), toY(v)))
      ctx.lineTo(toX(values.length - 1), PAD.top + plotH)
      ctx.closePath()
      const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + plotH)
      grad.addColorStop(0, 'rgba(104,211,145,0.3)')
      grad.addColorStop(1, 'rgba(104,211,145,0.02)')
      ctx.fillStyle = grad
      ctx.fill()

      // Linha
      ctx.beginPath()
      ctx.strokeStyle = '#68d391'
      ctx.lineWidth = 2
      ctx.lineJoin = 'round'
      values.forEach((v, i) => {
        if (i === 0) ctx.moveTo(toX(0), toY(v))
        else ctx.lineTo(toX(i), toY(v))
      })
      ctx.stroke()

      // Pontos (só quando há poucos)
      if (values.length <= 30) {
        ctx.fillStyle = '#68d391'
        values.forEach((v, i) => {
          ctx.beginPath()
          ctx.arc(toX(i), toY(v), 3, 0, Math.PI * 2)
          ctx.fill()
        })
      }
    }
  }, [chartData, chartPeriod, chartMode, kwhPrice])

  const handleClaim = async () => {
    setClaimError('')
    try {
      await claimDevice(claimSerial.trim(), claimName.trim() || 'Tomada')
      const devices = await fetchDevices()
      initSockets(devices)
      setClaimSerial('')
      setClaimName('')
    } catch (err) {
      setClaimError(err.message)
    }
  }

  const handleToggleRelay = async (socketId) => {
    const socket = sockets.find((s) => s.id === socketId)
    if (!socket) return
    const newEnabled = !socket.enabled
    try {
      await setRelay(socket.serialNumber, !newEnabled) // NC: enabled=true → relay_state=false
      toggleSocket(socketId) // flips socket.enabled locally
    } catch (err) {
      console.error('Erro ao acionar relé:', err)
    }
  }

  const handleConfigureSocket = async (id, name) => {
    if (!id || !name) return
    try {
      await renameDevice(id, name)
      configureSocket(id, name)
    } catch (err) {
      console.error('Erro ao renomear tomada:', err)
    }
  }

  const handleDeleteSocket = async (id) => {
    if (!id) return
    try {
      await unlinkDevice(id)
      deleteSocket(id)
    } catch (err) {
      console.error('Erro ao deletar tomada:', err)
    }
  }

  const handlePeriodChange = (period) => {
    setChartPeriod(period)
    setChartOffset(0)
  }

  return (
    <div className="container">
      <Header online={online} onLogout={onLogout} />
      <main className="main-content">
        {/* Vincular novo dispositivo */}
        <section className="management-section">
          <h2>Vincular Dispositivo</h2>
          <div className="management-container">
            <div className="management-card">
              <h3>Serial do dispositivo</h3>
              <input
                type="text"
                placeholder="Ex: a1b2c3d4"
                value={claimSerial}
                onChange={(e) => setClaimSerial(e.target.value)}
              />
              <input
                type="text"
                placeholder="Nome (opcional)"
                value={claimName}
                onChange={(e) => setClaimName(e.target.value)}
              />
              <button className="btn btn-add" onClick={handleClaim}>
                Vincular
              </button>
              {claimError && <p style={{ color: '#fc8181', marginTop: '0.5rem' }}>{claimError}</p>}
            </div>
          </div>
        </section>

        <ManagementSection
          sockets={sockets}
          deleteSocket={handleDeleteSocket}
          configureSocket={handleConfigureSocket}
        />
        <ControlSection sockets={sockets} toggleSocket={handleToggleRelay} />
        <MonitoringSection
          sockets={sockets}
          selectedIds={monitoringSelection}
          onSelectionChange={(id) =>
            setMonitoringSelection((prev) =>
              prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
            )
          }
          metrics={metrics}
        />
        <ChartFilterSection
          sockets={sockets}
          selectedIds={chartSelection}
          onSelectionChange={(id) =>
            setChartSelection((prev) =>
              prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
            )
          }
          chartPeriod={chartPeriod}
          onPeriodChange={handlePeriodChange}
          maxOffset={maxOffset}
          chartOffset={chartOffset}
          onOffsetChange={setChartOffset}
          chartMode={chartMode}
          onModeChange={setChartMode}
          kwhPrice={kwhPrice}
          onKwhPriceChange={setKwhPrice}
          canvasRef={canvasRef}
        />
        <HistorySection history={history} />
      </main>
    </div>
  )
}

export default HomePage
