import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cloneSheet } from '../../../bsb-api/src/sheetsRepo.js'
import { database, queryId, send, sendError, sendSheet } from '../../../server/respond'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== 'POST') {
      send(res, 405, { error: "Bu so'rov qo'llab-quvvatlanmaydi." })
      return
    }
    const db = await database()
    sendSheet(res, 201, await cloneSheet(db.sheets, queryId(req)))
  } catch (error) {
    sendError(res, error)
  }
}
