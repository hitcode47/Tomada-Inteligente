import { useState } from 'react'
import { login, register } from '../services/authService'

function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fn = mode === 'login' ? login : register
      await fn(email, password)
      onLogin()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>EcoPlugWeb</h1>
        <p style={styles.subtitle}>
          {mode === 'login' ? 'Entrar na conta' : 'Criar conta'}
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
            placeholder="seu@email.com"
          />

          <label style={styles.label}>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
            placeholder="••••••••"
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} style={styles.toggle}>
          {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1a202c',
  },
  card: {
    background: '#2d3748',
    borderRadius: '12px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '380px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  title: {
    color: '#68d391',
    margin: '0 0 4px 0',
    fontSize: '1.8rem',
    textAlign: 'center',
  },
  subtitle: {
    color: '#a0aec0',
    textAlign: 'center',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    color: '#e2e8f0',
    fontSize: '0.85rem',
    marginTop: '0.5rem',
  },
  input: {
    padding: '0.6rem 0.8rem',
    borderRadius: '6px',
    border: '1px solid #4a5568',
    background: '#1a202c',
    color: '#e2e8f0',
    fontSize: '1rem',
    outline: 'none',
  },
  button: {
    marginTop: '1rem',
    padding: '0.75rem',
    borderRadius: '6px',
    border: 'none',
    background: '#68d391',
    color: '#1a202c',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  toggle: {
    marginTop: '1rem',
    background: 'none',
    border: 'none',
    color: '#68d391',
    cursor: 'pointer',
    fontSize: '0.85rem',
    width: '100%',
    textAlign: 'center',
  },
  error: {
    color: '#fc8181',
    fontSize: '0.85rem',
    margin: '0.25rem 0 0',
  },
}

export default LoginPage
