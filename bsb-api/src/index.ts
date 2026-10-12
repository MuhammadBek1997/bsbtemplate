import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildApp } from './app.js'
import { connectMongo } from './db.js'

loadEnv()

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error("MONGODB_URI topilmadi. bsb-api/.env faylini to'ldiring.")
  process.exit(1)
}

const port = readPort(process.env.PORT)
const host = process.env.HOST || '0.0.0.0'
const db = await connectMongo(uri)
const app = await buildApp(db, { logger: true })

const shutdown = async () => {
  await app.close()
  await db.close()
}

process.on('SIGINT', () => {
  void shutdown().then(() => process.exit(0))
})
process.on('SIGTERM', () => {
  void shutdown().then(() => process.exit(0))
})

try {
  await app.listen({ port, host })
} catch (error) {
  app.log.error(error)
  await shutdown()
  process.exit(1)
}

function readPort(raw: string | undefined): number {
  if (raw == null || raw === '') return 4000
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`PORT noto'g'ri: ${raw}`)
  }
  return value
}

function loadEnv(): void {
  const path = [resolve('.env'), resolve(dirname(fileURLToPath(import.meta.url)), '../.env')].find((item) =>
    existsSync(item),
  )
  if (!path) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}
