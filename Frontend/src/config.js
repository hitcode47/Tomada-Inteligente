// Configuração da API backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const CONFIG = {
  apiBaseUrl: API_BASE_URL,
  apiTimeout: 5000,
  pollingInterval: 5000, // Atualizar a cada 5 segundos
}

export default CONFIG
