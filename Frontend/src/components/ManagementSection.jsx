import { useState } from 'react'

function ManagementSection({ sockets, deleteSocket, configureSocket }) {
  const [selectedId, setSelectedId] = useState('')
  const [configName, setConfigName] = useState('')

  return (
    <section className="management-section">
      <h2>Gerenciamento de Tomadas</h2>
      <div className="management-container">
        <div className="management-card">
          <h3>Deletar Tomada</h3>
          <select
            id="delete-socket-select"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            <option value="">Selecione uma tomada</option>
            {sockets.map((socket) => (
              <option key={socket.id} value={socket.id}>
                {socket.name}
              </option>
            ))}
          </select>
          <button
            id="delete-socket-btn"
            className="btn btn-delete"
            onClick={() => {
              deleteSocket(selectedId)
              setSelectedId('')
            }}
            disabled={!selectedId}
          >
            Deletar
          </button>
        </div>

        <div className="management-card">
          <h3>Configurar Tomada</h3>
          <select
            id="config-socket-select"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            <option value="">Selecione uma tomada</option>
            {sockets.map((socket) => (
              <option key={socket.id} value={socket.id}>
                {socket.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            id="config-socket-name"
            placeholder="Novo nome"
            value={configName}
            onChange={(event) => setConfigName(event.target.value)}
          />
          <button
            id="config-socket-btn"
            className="btn btn-config"
            onClick={() => {
              configureSocket(selectedId, configName.trim())
              setConfigName('')
            }}
            disabled={!selectedId || !configName.trim()}
          >
            Configurar
          </button>
        </div>
      </div>
    </section>
  )
}

export default ManagementSection
