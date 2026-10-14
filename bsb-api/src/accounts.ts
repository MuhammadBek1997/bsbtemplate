import type { Collection } from 'mongodb'
import { HttpError } from './httpError.js'
import { newId } from './ids.js'
import { hashPassword, verifyPassword } from './password.js'
import { authSecret, bearerToken, readSession, signSession } from './session.js'

export type AccountRole = 'teacher' | 'school' | 'district'

export interface Account {
  id: string
  name: string
  phone: string
  school: string
  district: string
  role: AccountRole
  paidUntil: number | null
  createdAt: number
}

export interface StoredUser {
  _id: string
  name: string
  phone: string
  school: string
  district: string
  role: AccountRole
  passwordHash: string
  paidUntil: number | null
  createdAt: number
}

export interface AuthResult {
  token: string
  account: Account
}

const ROLES = new Set<AccountRole>(['teacher', 'school', 'district'])

export async function registerAccount(users: Collection<StoredUser>, body: unknown): Promise<AuthResult> {
  const input = parseRegister(body)
  const user: StoredUser = {
    _id: newId(),
    name: input.name,
    phone: input.phone,
    school: input.school,
    district: input.district,
    role: input.role,
    passwordHash: await hashPassword(input.password),
    paidUntil: null,
    createdAt: Date.now(),
  }
  try {
    await users.insertOne(user)
  } catch (error) {
    if (isDuplicate(error)) throw new HttpError(409, "Bu telefon raqami allaqachon ro'yxatdan o'tgan.")
    throw error
  }
  return { token: signSession(user._id), account: toAccount(user) }
}

export async function loginAccount(users: Collection<StoredUser>, body: unknown): Promise<AuthResult> {
  const input = parseLogin(body)
  const user = await users.findOne({ phone: input.phone })
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new HttpError(401, "Telefon yoki parol noto'g'ri.")
  }
  return { token: signSession(user._id), account: toAccount(user) }
}

export async function requireAccount(
  users: Collection<StoredUser>,
  header: string | string[] | undefined,
): Promise<Account> {
  const account = await accountFromToken(users, bearerToken(header))
  if (!account) throw new HttpError(401, 'Hisobga kiring.')
  return account
}

export async function accountFromToken(users: Collection<StoredUser>, token: string): Promise<Account | null> {
  const id = readSession(token, authSecret())
  if (!id) return null
  const user = await users.findOne({ _id: id })
  return user ? toAccount(user) : null
}

function toAccount(user: StoredUser): Account {
  return {
    id: user._id,
    name: user.name,
    phone: user.phone,
    school: user.school,
    district: user.district,
    role: user.role,
    paidUntil: user.paidUntil,
    createdAt: user.createdAt,
  }
}

function parseRegister(body: unknown): {
  name: string
  phone: string
  school: string
  district: string
  role: AccountRole
  password: string
} {
  const raw = asRecord(body)
  const password = readPassword(raw.password)
  return {
    name: readText(raw.name, 'Ism familiya', 80),
    phone: normalizePhone(raw.phone),
    school: readText(raw.school, 'Maktab', 120),
    district: readText(raw.district, 'Tuman', 80),
    role: readRole(raw.role),
    password,
  }
}

function parseLogin(body: unknown): { phone: string; password: string } {
  const raw = asRecord(body)
  return { phone: normalizePhone(raw.phone), password: readPassword(raw.password) }
}

function asRecord(body: unknown): Record<string, unknown> {
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body) as unknown
    } catch {
      throw new HttpError(400, "Ma'lumot noto'g'ri.")
    }
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new HttpError(400, "Ma'lumot noto'g'ri.")
  }
  return body as Record<string, unknown>
}

export function normalizePhone(value: unknown): string {
  if (typeof value !== 'string') throw new HttpError(400, 'Telefon raqamini kiriting.')
  let digits = value.replace(/\D/g, '')
  if (digits.length === 9) digits = `998${digits}`
  if (digits.length === 12 && digits.startsWith('998')) return digits
  throw new HttpError(400, "Telefon +998 bilan 9 ta raqam bo'lishi kerak.")
}

function readText(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string') throw new HttpError(400, `${label} kiriting.`)
  const text = value.trim().replace(/\s+/g, ' ')
  if (text.length < 2 || text.length > max) throw new HttpError(400, `${label} 2–${max} ta belgidan iborat bo'lsin.`)
  return text
}

function readPassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < 6 || value.length > 72) {
    throw new HttpError(400, "Parol kamida 6 ta belgidan iborat bo'lsin.")
  }
  return value
}

function readRole(value: unknown): AccountRole {
  if (typeof value === 'string' && ROLES.has(value as AccountRole)) return value as AccountRole
  throw new HttpError(400, "Kim to'layotganini tanlang.")
}

function isDuplicate(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000
}
