import type { VercelRequest, VercelResponse } from '@vercel/node'
import { accountFromToken } from '../../api-lib/bsb-api/src/accounts.js'
import { HttpError } from '../../api-lib/bsb-api/src/httpError.js'
import { bearerToken } from '../../api-lib/bsb-api/src/session.js'
import { database, send, sendError } from '../../api-lib/server/respond.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== 'GET') {
      send(res, 405, { error: "Bu so'rov qo'llab-quvvatlanmaydi." })
      return
    }
    const db = await database()
    const account = await accountFromToken(db.users, bearerToken(req.headers.authorization))
    if (!account) throw new HttpError(401, 'Hisobga kiring.')
    send(res, 200, { account })
  } catch (error) {
    sendError(res, error)
  }
}
