import { MongoClient, type Collection } from 'mongodb'
import type { StoredUser } from './accounts.js'
import type { StoredSheet } from './sheetsRepo.js'

export interface MongoHandle {
  sheets: Collection<StoredSheet>
  users: Collection<StoredUser>
  ping(): Promise<void>
  close(): Promise<void>
  drop(): Promise<void>
}

export async function connectMongo(uri: string, dbName = 'bsb'): Promise<MongoHandle> {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  })
  await client.connect()
  const database = client.db(dbName)
  const sheets = database.collection<StoredSheet>('sheets')
  const users = database.collection<StoredUser>('users')
  await sheets.createIndex({ updatedAt: -1, createdAt: -1 })
  await users.createIndex({ phone: 1 }, { unique: true })
  return {
    sheets,
    users,
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
