import type { VercelRequest, VercelResponse } from '@vercel/node'
import { summarize } from '../../bsb-api/src/calc.js'
import { HttpError } from '../../bsb-api/src/httpError.js'
import { deleteSheet, getSheet, replaceSheet } from '../../bsb-api/src/sheetsRepo.js'
import { parseSheetWrite } from '../../bsb-api/src/validate.js'
import { database, queryId, send, sendError, sendSheet } from '../../server/respond'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const db = await database()
    const id = queryId(req)
    if (req.method === 'GET') {
      const sheet = await getSheet(db.sheets, id)
      if (!sheet) throw new HttpError(404, 'Jadval topilmadi.')
      send(res, 200, { sheet, summary: summarize(sheet) })
      return
    }
    if (req.method === 'PUT') {
      const body = req.body
      if (typeof body === 'object' && body !== null && !Array.isArray(body) && 'id' in body) {
        const sent = (body as { id?: unknown }).id
        if (sent !== undefined && sent !== id) throw new HttpError(400, 'Jadval identifikatori mos kelmadi.')
      }
      sendSheet(res, 200, await replaceSheet(db.sheets, id, parseSheetWrite(body)))
      return
    }
    if (req.method === 'DELETE') {
      await deleteSheet(db.sheets, id)
      res.status(204).end()
      return
    }
    send(res, 405, { error: "Bu so'rov qo'llab-quvvatlanmaydi." })
  } catch (error) {
    sendError(res, error)
  }
}
