function ControlSection({ sockets, toggleSocket }) {
  return (
    <section className="control-section">
      <h2>Controle das Tomadas</h2>
      <div className="control-grid">
        {sockets.map((socket) => (
          <div key={socket.id} className="control-card">
            <h3>{socket.name}</h3>
            <div className="switch-container">
              <input
                id={`toggle-${socket.id}`}
                type="checkbox"
                className="toggle-switch"
                checked={socket.enabled}
                onChange={() => toggleSocket(socket.id)}
              />
              <label htmlFor={`toggle-${socket.id}`} className="switch-label" />
            </div>
            <div className="switch-status">
              {socket.enabled ? 'Ligada' : 'Desligada'}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default ControlSection
