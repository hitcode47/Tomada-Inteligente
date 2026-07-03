const ZOOMS = [
  { key: 'minuto', label: 'Minuto', desc: '60 min · avg/min' },
  { key: 'hora',   label: 'Hora',   desc: '24 h · avg/hora'  },
  { key: 'dia',    label: 'Dia',    desc: '7 d · avg/dia'    },
  { key: 'mes',    label: 'Mês',    desc: '30 d · avg/dia'   },
]

const MODES = [
  { key: 'power', label: 'Potência', color: '#68d391' },
  { key: 'cost',  label: 'Custo',    color: '#f6ad55' },
]

function ChartFilterSection({
  sockets,
  selectedIds,
  onSelectionChange,
  chartPeriod,
  onPeriodChange,
  maxOffset,
  chartOffset,
  onOffsetChange,
  chartMode,
  onModeChange,
  kwhPrice,
  onKwhPriceChange,
  canvasRef,
}) {
  return (
    <section className="chart-filter-section">
      <h2>Histórico de Consumo</h2>

      <div className="chart-filter">
        {/* Linha de controles: zoom (esquerda) + modo/tarifa (direita) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {/* Zoom */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {ZOOMS.map((z) => {
              const active = chartPeriod === z.key
              return (
                <button
                  key={z.key}
                  onClick={() => onPeriodChange(z.key)}
                  title={z.desc}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '20px',
                    border: active ? 'none' : '1px solid #4a5568',
                    cursor: 'pointer',
                    fontWeight: active ? '700' : '400',
                    background: active ? '#4299e1' : 'transparent',
                    color: active ? '#fff' : '#a0aec0',
                    transition: 'all 0.15s',
                    fontSize: '13px',
                  }}
                >
                  {z.label}
                </button>
              )
            })}
          </div>

          {/* Modo + tarifa */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {MODES.map((m) => {
              const active = chartMode === m.key
              return (
                <button
                  key={m.key}
                  onClick={() => onModeChange(m.key)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: active ? 'none' : '1px solid #4a5568',
                    cursor: 'pointer',
                    fontWeight: active ? '700' : '400',
                    background: active ? m.color : 'transparent',
                    color: active ? '#1a202c' : '#a0aec0',
                    transition: 'all 0.15s',
                    fontSize: '13px',
                  }}
                >
                  {m.label}
                </button>
              )
            })}

            {chartMode === 'cost' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#a0aec0' }}>
                R$/kWh:
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={kwhPrice}
                  onChange={(e) => onKwhPriceChange(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '68px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: '#2d3748',
                    border: '1px solid #4a5568',
                    color: '#f6ad55',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}
                />
              </label>
            )}
          </div>
        </div>

        <h3>Selecionar Tomadas</h3>
        <div id="chart-socket-checklist" className="checklist-container">
          {sockets.map((socket) => (
            <label key={socket.id} className="checkbox-item">
              <input
                type="checkbox"
                checked={selectedIds.includes(socket.id)}
                onChange={() => onSelectionChange(socket.id)}
              />
              {socket.name}
            </label>
          ))}
        </div>
      </div>

      <div className="chart-container">
        <canvas ref={canvasRef} id="consumption-chart" />
      </div>

      <div style={{ padding: '8px 16px 4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '11px', color: '#4a5568', whiteSpace: 'nowrap' }}>← Mais antigo</span>
        <input
          type="range"
          min={0}
          max={maxOffset}
          value={maxOffset - chartOffset}
          onChange={(e) => onOffsetChange(maxOffset - parseInt(e.target.value))}
          style={{ flex: 1, accentColor: '#4299e1', cursor: 'pointer' }}
        />
        <span style={{ fontSize: '11px', color: chartOffset === 0 ? '#4299e1' : '#4a5568', whiteSpace: 'nowrap' }}>
          {chartOffset === 0 ? 'Agora →' : 'Mais recente →'}
        </span>
      </div>
    </section>
  )
}

export default ChartFilterSection
