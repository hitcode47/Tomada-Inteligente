function HistorySection({ history }) {
  return (
    <section className="history-section">
      <h2>Consumo por Hora (últimas 24h)</h2>
      <div className="history-container">
        <table className="history-table">
          <thead>
            <tr>
              <th>Horário</th>
              <th>Consumo (Wh)</th>
            </tr>
          </thead>
          <tbody id="history-list">
            {history.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ textAlign: 'center', color: '#718096' }}>
                  Sem dados nas últimas 24h
                </td>
              </tr>
            ) : (
              history.map((item) => (
                <tr key={item.hour}>
                  <td>{item.hour}</td>
                  <td>{item.wh.toFixed(1)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default HistorySection
