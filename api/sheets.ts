import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAccount } from '../api-lib/bsb-api/src/accounts.js'
import { createSheet, listSheets } from '../api-lib/bsb-api/src/sheetsRepo.js'
import { blankSheetWrite, isEmptyBody, parseSheetWrite } from '../api-lib/bsb-api/src/validate.js'
import { database, send, sendError, sendSheet } from '../api-lib/server/respond.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const db = await database()
    await requireAccount(db.users, req.headers.authorization)
    if (req.method === 'GET') {
      send(res, 200, { sheets: await listSheets(db.sheets) })
      return
    }
    if (req.method === 'POST') {
      const input = isEmptyBody(req.body) ? blankSheetWrite() : parseSheetWrite(req.body)
      sendSheet(res, 201, await createSheet(db.sheets, input))
      return
    }
    send(res, 405, { error: "Bu so'rov qo'llab-quvvatlanmaydi." })
  } catch (error) {
    sendError(res, error)
  }
}
