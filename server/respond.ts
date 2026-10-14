import type { VercelRequest, VercelResponse } from '@vercel/node'
import { summarize } from '../bsb-api/src/calc.js'
import { connectMongo, type MongoHandle } from '../bsb-api/src/db.js'
import { HttpError } from '../bsb-api/src/httpError.js'
import type { Sheet } from '../bsb-api/src/types.js'

let cached: Promise<MongoHandle> | null = null

export async function database(): Promise<MongoHandle> {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new HttpError(500, "MongoDB manzili Vercel loyihasida sozlanmagan.")
  }
  if (!cached) {
    cached = connectMongo(uri).catch((error) => {
      cached = null
      throw error
    })
  }
  return cached
}

export function send(res: VercelResponse, status: number, body: unknown): void {
  res.status(status).json(body)
}

export function sendSheet(res: VercelResponse, status: number, sheet: Sheet): void {
  send(res, status, { sheet, summary: summarize(sheet) })
}

export function sendError(res: VercelResponse, error: unknown): void {
  if (error instanceof HttpError) {
    send(res, error.status, { error: error.message })
    return
  }
  console.error(error)
  const text = error instanceof Error ? `${error.name} ${error.message}` : ''
  const blocked = /whitelist|not allowed|ServerSelection|ENOTFOUND|timed out|ECONNREFUSED/i.test(text)
  send(res, 500, {
    error: blocked
      ? "MongoDB ga ulanib bo'lmadi. Atlasdagi Network Access bo'limidan 0.0.0.0/0 manziliga ruxsat bering."
      : 'Serverda kutilmagan xatolik yuz berdi.',
  })
}

export function queryId(req: VercelRequest): string {
  const id = req.query.id
  return Array.isArray(id) ? id[0] : id ?? ''
}
