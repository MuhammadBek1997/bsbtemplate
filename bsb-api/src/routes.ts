import type { FastifyInstance } from 'fastify'
import { summarize } from './calc.js'
import type { MongoHandle } from './db.js'
import { HttpError } from './httpError.js'
import { cloneSheet, createSheet, deleteSheet, getSheet, listSheets, replaceSheet } from './sheetsRepo.js'
import { blankSheetWrite, isEmptyBody, parseSheetWrite } from './validate.js'

export function registerRoutes(app: FastifyInstance, db: MongoHandle): void {
  app.get('/api/health', async () => {
    await db.ping()
    return { ok: true }
  })

  app.get('/api/sheets', async () => ({ sheets: await listSheets(db.sheets) }))

  app.get<{ Params: { id: string } }>('/api/sheets/:id', async (request) => {
    const sheet = await getSheet(db.sheets, request.params.id)
    if (!sheet) throw new HttpError(404, 'Jadval topilmadi.')
    return { sheet, summary: summarize(sheet) }
  })

  app.post('/api/sheets', async (request, reply) => {
    const input = isEmptyBody(request.body) ? blankSheetWrite() : parseSheetWrite(request.body)
    const sheet = await createSheet(db.sheets, input)
    return reply.code(201).send({ sheet, summary: summarize(sheet) })
  })

  app.put<{ Params: { id: string } }>('/api/sheets/:id', async (request) => {
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
    await deleteSheet(db.sheets, request.params.id)
    return reply.code(204).send()
  })

  app.post<{ Params: { id: string } }>('/api/sheets/:id/clone', async (request, reply) => {
    const sheet = await cloneSheet(db.sheets, request.params.id)
    return reply.code(201).send({ sheet, summary: summarize(sheet) })
  })
}
