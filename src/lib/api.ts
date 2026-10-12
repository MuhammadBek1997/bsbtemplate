import type { Sheet, SheetCard } from './types'

const OFFLINE = "Ma'lumotlar bazasiga ulanib bo'lmadi."

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    })
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
