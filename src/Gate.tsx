import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthScreen } from './components/AuthScreen'
import { App } from './App'
import { clearSession, currentAccount, readToken } from './lib/api'
import type { Account } from './lib/types'

export function Gate() {
  const [account, setAccount] = useState<Account | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!readToken()) {
      setReady(true)
      return
    }
    currentAccount()
      .then(setAccount)
      .catch((err: unknown) => {
        if (err instanceof Error && err.message === 'Hisobga kiring.') clearSession()
      })
      .finally(() => setReady(true))
  }, [])

  if (!ready) return <div className="auth-screen" />

  const logout = () => {
    clearSession()
    setAccount(null)
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={account ? <Navigate to="/" replace /> : <AuthScreen mode="login" onSuccess={setAccount} />}
      />
      <Route
        path="/signup"
        element={account ? <Navigate to="/" replace /> : <AuthScreen mode="signup" onSuccess={setAccount} />}
      />
      <Route path="/*" element={account ? <App account={account} onLogout={logout} /> : <Navigate to="/login" replace />} />
    </Routes>
  )
}
