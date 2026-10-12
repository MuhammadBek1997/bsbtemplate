import { MongoClient, type Collection } from 'mongodb'
import type { StoredSheet } from './sheetsRepo.js'

export interface MongoHandle {
  sheets: Collection<StoredSheet>
  ping(): Promise<void>
  close(): Promise<void>
  drop(): Promise<void>
}

export async function connectMongo(uri: string, dbName = 'bsb'): Promise<MongoHandle> {
  const client = new MongoClient(uri)
  await client.connect()
  const database = client.db(dbName)
  const sheets = database.collection<StoredSheet>('sheets')
  await sheets.createIndex({ updatedAt: -1, createdAt: -1 })
  return {
    sheets,
    ping: async () => {
      await database.command({ ping: 1 })
    },
    close: async () => {
      await client.close()
    },
    drop: async () => {
      await database.dropDatabase()
    },
  }
}
