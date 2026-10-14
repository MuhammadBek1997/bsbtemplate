import type { FastifyInstance } from 'fastify'
import { accountFromToken, loginAccount, registerAccount, requireAccount } from './accounts.js'
import { summarize } from './calc.js'
import type { MongoHandle } from './db.js'
import { HttpError } from './httpError.js'
import { cloneSheet, createSheet, deleteSheet, getSheet, listSheets, replaceSheet } from './sheetsRepo.js'
import { bearerToken } from './session.js'
import { blankSheetWrite, isEmptyBody, parseSheetWrite } from './validate.js'

export function registerRoutes(app: FastifyInstance, db: MongoHandle): void {
  app.get('/api/health', async () => {
    await db.ping()
    return { ok: true }
  })

  app.get('/api/sheets', async (request) => {
    await requireAccount(db.users, request.headers.authorization)
    return { sheets: await listSheets(db.sheets) }
  })

  app.get<{ Params: { id: string } }>('/api/sheets/:id', async (request) => {
    await requireAccount(db.users, request.headers.authorization)
    const sheet = await getSheet(db.sheets, request.params.id)
    if (!sheet) throw new HttpError(404, 'Jadval topilmadi.')
    return { sheet, summary: summarize(sheet) }
  })

  app.post('/api/sheets', async (request, reply) => {
    await requireAccount(db.users, request.headers.authorization)
    const input = isEmptyBody(request.body) ? blankSheetWrite() : parseSheetWrite(request.body)
    const sheet = await createSheet(db.sheets, input)
    return reply.code(201).send({ sheet, summary: summarize(sheet) })
  })

  app.put<{ Params: { id: string } }>('/api/sheets/:id', async (request) => {
    await requireAccount(db.users, request.headers.authorization)
    const body = request.body
    if (typeof body === 'object' && body !== null && !Array.isArray(body) && 'id' in body) {
      const sent = (body as { id?: unknown }).id
      if (sent !== undefined && sent !== request.params.id) {
        throw new HttpError(400, 'Jadval identifikatori mos kelmadi.')
      }
    }
    const sheet = await replaceSheet(db.sheets, request.params.id, parseSheetWrite(request.body))
    return { sheet, summary: summarize(sheet) }
  })

  app.delete<{ Params: { id: string } }>('/api/sheets/:id', async (request, reply) => {
    await requireAccount(db.users, request.headers.authorization)
    await deleteSheet(db.sheets, request.params.id)
    return reply.code(204).send()
  })

  app.post<{ Params: { id: string } }>('/api/sheets/:id/clone', async (request, reply) => {
    await requireAccount(db.users, request.headers.authorization)
    const sheet = await cloneSheet(db.sheets, request.params.id)
    return reply.code(201).send({ sheet, summary: summarize(sheet) })
  })

  app.post('/api/auth/register', async (request, reply) => {
    const result = await registerAccount(db.users, request.body)
    return reply.code(201).send(result)
  })

  app.post('/api/auth/login', async (request) => loginAccount(db.users, request.body))

  app.get('/api/auth/me', async (request) => {
    const account = await accountFromToken(db.users, bearerToken(request.headers.authorization))
    if (!account) throw new HttpError(401, 'Hisobga kiring.')
    return { account }
  })
}
