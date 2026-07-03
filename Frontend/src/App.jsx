import { useState } from 'react'
import { getToken, clearToken } from './services/authService'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import './App.css'

function App() {
  const [authenticated, setAuthenticated] = useState(() => !!getToken())

  const handleLogin = () => setAuthenticated(true)

  const handleLogout = () => {
    clearToken()
    setAuthenticated(false)
  }

  if (!authenticated) return <LoginPage onLogin={handleLogin} />

  return <HomePage onLogout={handleLogout} />
}

export default App
