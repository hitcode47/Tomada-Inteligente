function MonitoringSection({ sockets, selectedIds, onSelectionChange, metrics }) {
  return (
    <section className="monitoring-section">
      <h2>Monitoramento em Tempo Real</h2>
      <div className="socket-filter">
        <h3>Selecionar Tomadas para Monitorar</h3>
        <div id="socket-checklist" className="checklist-container">
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
      <div className="monitoring-grid">
        <div className="metric-card">
          <h3>Tensão</h3>
          <p id="current-voltage" className="metric-value">
            {metrics.voltage.toFixed(2)}
          </p>
          <span className="metric-unit">V</span>
        </div>
        <div className="metric-card">
          <h3>Corrente</h3>
          <p id="current-amperage" className="metric-value">
            {metrics.amperage.toFixed(3)}
          </p>
          <span className="metric-unit">A</span>
        </div>
        <div className="metric-card">
          <h3>Potência Atual</h3>
          <p id="current-power" className="metric-value">
            {metrics.power.toFixed(2)}
          </p>
          <span className="metric-unit">W</span>
        </div>
      </div>
    </section>
  )
}

export default MonitoringSection
