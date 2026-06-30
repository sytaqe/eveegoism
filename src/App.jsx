// SPDX-License-Identifier: CC0-1.0
// This file is released into the public domain under the CC0 1.0 Universal license.
import { useEffect } from 'react'
import { useAuth } from './hooks/useAuth.js'
import { handleCallback } from './utils/sso.js'
import { Login } from './components/Login.jsx'
import { KillmailList } from './components/KillmailList.jsx'

export default function App() {
  const { session, logout, refreshSession } = useAuth()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    if (!code) return

    handleCallback(code, state)
      .then(() => {
        window.history.replaceState({}, '', window.location.pathname)
        refreshSession()
      })
      .catch(err => {
        console.error('SSO callback error:', err)
        window.history.replaceState({}, '', window.location.pathname)
      })
  }, [refreshSession])

  if (!session) return <Login />
  return <KillmailList session={session} onLogout={logout} />
}
