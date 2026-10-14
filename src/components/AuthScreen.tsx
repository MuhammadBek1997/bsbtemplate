import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import plant from '../assets/monstera.jpg'
import { loginAccount, registerAccount } from '../lib/api'
import type { Account, AccountRole } from '../lib/types'

interface Props {
  mode: 'login' | 'signup'
  onSuccess: (account: Account) => void
}

export function AuthScreen({ mode, onSuccess }: Props) {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const signup = mode === 'signup'

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    setError(null)
    if (signup && form.get('agree') !== 'on') {
      setError('Davom etish uchun shartlarga rozilik bildiring.')
      return
    }
    if (signup && password !== String(form.get('password2') ?? '')) {
      setError('Parollar bir xil emas.')
      return
    }
    setBusy(true)
    const task = signup ? register(form, password) : loginAccount(String(form.get('phone') ?? ''), password)
    void task
      .then((account) => {
        onSuccess(account)
        navigate('/', { replace: true })
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "So'rov bajarilmadi."))
      .finally(() => setBusy(false))
  }

  return (
    <div className="auth-screen">
      <div className="auth-pane">
        <form className="auth-card" onSubmit={submit}>
          <h1>{signup ? 'Get Started Now' : 'Welcome back'}</h1>
          {signup && (
            <label className="auth-field">
              <span>Name</span>
              <input name="name" required minLength={2} maxLength={80} placeholder="Enter your name" autoComplete="name" />
            </label>
          )}
          <label className="auth-field">
            <span>{signup ? 'Phone number' : 'Phone number'}</span>
            <input name="phone" required inputMode="tel" autoComplete="tel" placeholder="90 123 45 67" />
          </label>
          {signup && (
            <>
              <label className="auth-field">
                <span>District</span>
                <input name="district" required minLength={2} maxLength={80} placeholder="Tuman" />
              </label>
              <label className="auth-field">
                <span>School</span>
                <input name="school" required minLength={2} maxLength={120} placeholder="Maktab" />
              </label>
              <label className="auth-field">
                <span>Who pays</span>
                <select name="role" defaultValue="teacher">
                  <option value="teacher">O'qituvchi</option>
                  <option value="school">Maktab</option>
                  <option value="district">Tuman</option>
                </select>
              </label>
            </>
          )}
          <label className="auth-field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              maxLength={72}
              placeholder="Enter your password"
              autoComplete={signup ? 'new-password' : 'current-password'}
            />
          </label>
          {signup && (
            <label className="auth-field">
              <span>Confirm password</span>
              <input name="password2" type="password" required minLength={6} maxLength={72} placeholder="Enter your password" autoComplete="new-password" />
            </label>
          )}
          {signup && (
            <label className="auth-agree">
              <input name="agree" type="checkbox" />
              <span>I agree to the terms & policies</span>
            </label>
          )}
          {error && <p className="error auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? '…' : signup ? 'Signup' : 'Sign in'}
          </button>
          <p className="auth-switch">
            {signup ? (
              <>
                Have an account? <Link to="/login">Sign in</Link>
              </>
            ) : (
              <>
                Don't have an account? <Link to="/signup">Sign up</Link>
              </>
            )}
          </p>
        </form>
      </div>
      <div className="auth-visual" style={{ backgroundImage: `url(${plant})` }} />
    </div>
  )
}

function register(form: FormData, password: string) {
  const role = String(form.get('role') ?? '')
  if (role !== 'teacher' && role !== 'school' && role !== 'district') {
    return Promise.reject(new Error("Kim to'layotganini tanlang."))
  }
  return registerAccount({
    name: String(form.get('name') ?? ''),
    phone: String(form.get('phone') ?? ''),
    district: String(form.get('district') ?? ''),
    school: String(form.get('school') ?? ''),
    role: role as AccountRole,
    password,
  })
}
