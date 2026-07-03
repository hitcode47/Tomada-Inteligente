import { CONFIG } from '../config'

const TOKEN_KEY = 'ecoplug_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function login(email, password) {
  const r = await fetch(`${CONFIG.apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!r.ok) throw new Error('Credenciais inválidas')
  const { access_token } = await r.json()
  saveToken(access_token)
  return access_token
}

export async function register(email, password) {
  const r = await fetch(`${CONFIG.apiBaseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!r.ok) {
    const err = await r.json()
    throw new Error(err.detail || 'Erro ao cadastrar')
  }
  const { access_token } = await r.json()
  saveToken(access_token)
  return access_token
}
