// SPDX-License-Identifier: CC0-1.0
// This file is released into the public domain under the CC0 1.0 Universal license.
import { useState, useEffect, useCallback } from 'react'
import { getSession, logout as ssoLogout } from '../utils/sso.js'

export function useAuth() {
  const [session, setSession] = useState(() => getSession())

  useEffect(() => {
    setSession(getSession())
  }, [])

  const logout = useCallback(() => {
    ssoLogout()
    setSession(null)
  }, [])

  const refreshSession = useCallback(() => {
    setSession(getSession())
  }, [])

  return { session, logout, refreshSession }
}
