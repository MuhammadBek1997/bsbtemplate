import { randomUUID } from 'node:crypto'

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/

export function newId(): string {
  return randomUUID()
}

export function isId(value: string): boolean {
  return ID_RE.test(value)
}
