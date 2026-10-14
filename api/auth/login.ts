import type { VercelRequest, VercelResponse } from '@vercel/node'
import { loginAccount } from '../../api-lib/bsb-api/src/accounts.js'
import { database, send, sendError } from '../../api-lib/server/respond.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== 'POST') {
      send(res, 405, { error: "Bu so'rov qo'llab-quvvatlanmaydi." })
      return
    }
    const db = await database()
    send(res, 200, await loginAccount(db.users, req.body))
  } catch (error) {
    sendError(res, error)
  }
}
