import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'
import type { MongoHandle } from './db.js'
import { HttpError } from './httpError.js'
import { registerRoutes } from './routes.js'

export async function buildApp(db: MongoHandle, options?: { logger?: boolean }): Promise<FastifyInstance> {
  const app = Fastify({ logger: options?.logger ?? false })
  await app.register(cors, { origin: true })

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ error: 'Manzil topilmadi.' })
  })

  app.setErrorHandler((error: unknown, request, reply) => {
    if (error instanceof HttpError) {
      return reply.code(error.status).send({ error: error.message })
    }
    const statusCode = statusOf(error)
    if (statusCode >= 400 && statusCode < 500) {
      return reply.code(statusCode).send({ error: "So'rov noto'g'ri." })
    }
    request.log.error({ err: error }, 'kutilmagan xatolik')
    return reply.code(500).send({ error: 'Serverda kutilmagan xatolik yuz berdi.' })
  })

  registerRoutes(app, db)
  return app
}

function statusOf(error: unknown): number {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) return 500
  const statusCode = error.statusCode
  return typeof statusCode === 'number' ? statusCode : 500
}
