function Header({ online, onLogout }) {
  return (
    <header className="header">
      <h1>EcoPlugWeb</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="connection-status">
          <span className={`status-dot ${online ? 'online' : 'offline'}`} />
          <span>{online ? 'Online' : 'Offline'}</span>
        </div>
        {onLogout && (
          <button onClick={onLogout} className="btn btn-delete" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}>
            Sair
          </button>
        )}
      </div>
    </header>
  )
}

export default Header
