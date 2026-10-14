import { createHmac, timingSafeEqual } from 'node:crypto'
import { HttpError } from './httpError.js'

const MONTH = 30 * 24 * 60 * 60 * 1000

export function authSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new HttpError(500, 'Hisob tizimi sozlanmagan.')
  }
  return secret
}

export function signSession(userId: string, secret = authSecret()): string {
  const payload = Buffer.from(JSON.stringify({ id: userId, exp: Date.now() + MONTH })).toString('base64url')
  const sig = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function readSession(token: string, secret = authSecret()): string | null {
  const dot = token.indexOf('.')
  if (dot <= 0) return null
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = createHmac('sha256', secret).update(payload).digest('base64url')
  const left = Buffer.from(sig)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { id?: unknown; exp?: unknown }
    if (typeof data.id !== 'string' || typeof data.exp !== 'number' || data.exp < Date.now()) return null
    return data.id
  } catch {
    return null
  }
}

export function bearerToken(header: string | string[] | undefined): string {
  const value = Array.isArray(header) ? header[0] : header
  if (!value?.startsWith('Bearer ')) return ''
  return value.slice('Bearer '.length).trim()
}
