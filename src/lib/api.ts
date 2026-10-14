import type { Account, AccountRole, Sheet, SheetCard } from './types'

const OFFLINE = "Ma'lumotlar bazasiga ulanib bo'lmadi."
const TOKEN_KEY = 'bsb-session'

export interface AuthResult {
  token: string
  account: Account
}

export interface RegisterInput {
  name: string
  phone: string
  school: string
  district: string
  role: AccountRole
  password: string
}

interface Saved {
  sheet: Sheet
}

export async function listSheets(): Promise<SheetCard[]> {
  const data = await request<{ sheets: SheetCard[] }>('/api/sheets')
  return data.sheets
}

export async function getSheet(id: string): Promise<Sheet> {
  const data = await request<Saved>(`/api/sheets/${id}`)
  return data.sheet
}

export async function createSheet(): Promise<Sheet> {
  const data = await request<Saved>('/api/sheets', { method: 'POST', body: '{}' })
  return data.sheet
}

export async function putSheet(sheet: Sheet): Promise<Sheet> {
  const data = await request<Saved>(`/api/sheets/${sheet.id}`, {
    method: 'PUT',
    body: JSON.stringify(sheet),
  })
  return data.sheet
}

export async function cloneSheet(id: string): Promise<Sheet> {
  const data = await request<Saved>(`/api/sheets/${id}/clone`, { method: 'POST' })
  return data.sheet
}

export async function deleteSheet(id: string): Promise<void> {
  await request<void>(`/api/sheets/${id}`, { method: 'DELETE' })
}

export function readToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

export function saveSession(result: AuthResult): Account {
  localStorage.setItem(TOKEN_KEY, result.token)
  return result.account
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export async function registerAccount(input: RegisterInput): Promise<Account> {
  const data = await request<AuthResult>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return saveSession(data)
}

export async function loginAccount(phone: string, password: string): Promise<Account> {
  const data = await request<AuthResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  })
  return saveSession(data)
}

export async function currentAccount(): Promise<Account> {
  const data = await request<{ account: Account }>('/api/auth/me')
  return data.account
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    const headers: Record<string, string> = {}
    if (init?.body) headers['Content-Type'] = 'application/json'
    const token = typeof localStorage === 'undefined' ? '' : localStorage.getItem(TOKEN_KEY)
    if (token) headers.Authorization = `Bearer ${token}`
    response = await fetch(path, { ...init, headers })
  } catch {
    throw new Error(OFFLINE)
  }
  if (response.status === 204) return undefined as T
  let data: unknown = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }
  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : OFFLINE
    throw new Error(message)
  }
  return data as T
}
