import { useState } from 'react'

export function useSockets(initialSockets = []) {
  const [sockets, setSockets] = useState(initialSockets)

  const initSockets = (list) => setSockets(list)

  const addSocket = (socket) => {
    setSockets((prev) => [...prev, socket])
  }

  const deleteSocket = (id) => {
    setSockets((prev) => prev.filter((s) => s.id !== id))
  }

  const configureSocket = (id, name) => {
    if (!id || !name) return
    setSockets((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)))
  }

  const toggleSocket = (id) => {
    setSockets((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)))
  }

  return { sockets, initSockets, addSocket, deleteSocket, configureSocket, toggleSocket }
}
