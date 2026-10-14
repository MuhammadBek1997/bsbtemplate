import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { FastifyInstance } from 'fastify'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { buildApp } from './app.js'
import { connectMongo, type MongoHandle } from './db.js'
import type { Sheet } from './types.js'

interface Saved {
  sheet: Sheet
  summary: { maxTotal: number; avgTotal: number | null; avgPercent: number | null; rows: { total: number | null }[] }
}

let memory: MongoMemoryServer
let mongoUri = ''
let dbSeq = 0

process.env.AUTH_SECRET = 'test-secret-value-16'

before(async () => {
  memory = await MongoMemoryServer.create()
  mongoUri = memory.getUri()
})

after(async () => {
  await memory.stop()
})

async function withApp(run: (app: FastifyInstance, db: MongoHandle) => Promise<void>): Promise<void> {
  const db = await connectMongo(mongoUri, `bsb_test_${dbSeq++}`)
  const app = await buildApp(db)
  const registered = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      name: 'Test User',
      phone: '901112233',
      school: '1-maktab',
      district: 'Test tuman',
      role: 'teacher',
      password: 'sinov123',
    },
  })
  const token = registered.json<{ token: string }>().token
  const original = app.inject.bind(app)
  app.inject = ((opts: { headers?: Record<string, string> } & Record<string, unknown>) =>
    original({
      ...opts,
      headers: { authorization: `Bearer ${token}`, ...opts.headers },
    })) as FastifyInstance['inject']
  try {
    await run(app, db)
  } finally {
    await app.close()
    await db.drop()
    await db.close()
  }
}

function body(patch: Record<string, unknown> = {}) {
  return {
    district: 'Boyovut tumani',
    school: '50-maktab',
    grade: '9',
    subject: 'Informatika va AT',
    quarter: 2,
    kind: 'BSB',
    number: 2,
    customTitle: 'Maxsus sarlavha',
    showTaskPercent: true,
    tasks: [
      { id: 't1', max: 8 },
      { id: 't2', max: 8 },
      { id: 't3', max: 12 },
      { id: 't4', max: 12 },
      { id: 't5', max: 10 },
    ],
    students: [
      {
        id: 's1',
        name: 'Ali Valiyev',
        scores: { t1: 7, t2: 8, t3: 0, t4: 5, t5: 1 },
      },
    ],
    ...patch,
  }
}

describe('sheets API', () => {
  it('bo\'sh jadval front dagi yangi jadval bilan bir xil', async () => {
    await withApp(async (app) => {
      const created = await app.inject({ method: 'POST', url: '/api/sheets', payload: {} })
      assert.equal(created.statusCode, 201)
      const { sheet, summary } = created.json<Saved>()
      assert.equal(sheet.district, '')
      assert.equal(sheet.school, '')
      assert.equal(sheet.grade, '')
      assert.equal(sheet.subject, '')
      assert.equal(sheet.quarter, 1)
      assert.equal(sheet.kind, 'BSB')
      assert.equal(sheet.number, 1)
      assert.equal(sheet.customTitle, null)
      assert.equal(sheet.showTaskPercent, true)
      assert.equal(sheet.tasks.length, 5)
      assert.ok(sheet.tasks.every((task) => task.max === 10))
      assert.deepEqual(sheet.students, [])
      assert.equal(summary.maxTotal, 50)
      assert.equal(summary.avgPercent, null)

      const listed = await app.inject({ method: 'GET', url: '/api/sheets' })
      assert.equal(listed.statusCode, 200)
      const list = listed.json<{ sheets: { id: string; studentCount: number; taskCount: number; avgPercent: null }[] }>()
      assert.equal(list.sheets.length, 1)
      assert.equal(list.sheets[0].id, sheet.id)
      assert.equal(list.sheets[0].studentCount, 0)
      assert.equal(list.sheets[0].taskCount, 5)
      assert.equal(list.sheets[0].avgPercent, null)
    })
  })

  it('ballarni saqlaydi va namuna hisobini qaytaradi', async () => {
    await withApp(async (app) => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/sheets',
        payload: body({ id: 'sheet-1' }),
      })
      assert.equal(created.statusCode, 201)
      const saved = created.json<Saved>()
      assert.equal(saved.sheet.id, 'sheet-1')
      assert.equal(saved.sheet.students[0].name, 'Ali Valiyev')
      assert.deepEqual(saved.sheet.students[0].scores, { t1: 7, t2: 8, t3: 0, t4: 5, t5: 1 })
      assert.equal(saved.summary.maxTotal, 50)
      assert.equal(saved.summary.rows[0].total, 21)
      assert.equal(saved.summary.avgPercent, 42)

      const again = await app.inject({
        method: 'POST',
        url: '/api/sheets',
        payload: body({ id: 'sheet-1' }),
      })
      assert.equal(again.statusCode, 409)
    })
  })

  it('maksimal baldan katta qiymatni qabul qilmaydi', async () => {
    await withApp(async (app) => {
      const created = await app.inject({ method: 'POST', url: '/api/sheets', payload: {} })
      const id = created.json<Saved>().sheet.id
      const rejected = await app.inject({
        method: 'PUT',
        url: `/api/sheets/${id}`,
        payload: body({
          tasks: [{ id: 't1', max: 10 }],
          students: [{ id: 's1', name: 'Ali', scores: { t1: 11 } }],
        }),
      })
      assert.equal(rejected.statusCode, 400)
      assert.match(rejected.json<{ error: string }>().error, /0 dan 10 gacha/)
    })
  })

  it('BSB nusxasida raqam oshadi, ballar va maxsus sarlavha tushadi', async () => {
    await withApp(async (app) => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/sheets',
        payload: body({ id: 'sheet-1' }),
      })
      assert.equal(created.statusCode, 201)
      const cloned = await app.inject({ method: 'POST', url: '/api/sheets/sheet-1/clone' })
      assert.equal(cloned.statusCode, 201)
      const copy = cloned.json<Saved>().sheet
      assert.notEqual(copy.id, 'sheet-1')
      assert.equal(copy.number, 3)
      assert.equal(copy.kind, 'BSB')
      assert.equal(copy.customTitle, null)
      assert.equal(copy.school, '50-maktab')
      assert.equal(copy.students.length, 1)
      assert.equal(copy.students[0].name, 'Ali Valiyev')
      assert.deepEqual(copy.students[0].scores, {})
      assert.notEqual(copy.students[0].id, 's1')
      assert.deepEqual(
        copy.tasks.map((task) => task.max),
        [8, 8, 12, 12, 10],
      )
      assert.ok(copy.tasks.every((task) => task.id !== 't1'))
    })
  })

  it('ChSB nusxasida raqam o\'zgarmaydi', async () => {
    await withApp(async (app) => {
      await app.inject({
        method: 'POST',
        url: '/api/sheets',
        payload: body({ id: 'chsb-1', kind: 'ChSB', number: 4 }),
      })
      const cloned = await app.inject({ method: 'POST', url: '/api/sheets/chsb-1/clone' })
      const copy = cloned.json<Saved>().sheet
      assert.equal(copy.kind, 'ChSB')
      assert.equal(copy.number, 4)
      assert.equal(copy.customTitle, null)
    })
  })

  it('yangilangan jadval ro\'yxatda birinchi turadi, o\'chirish bolalarni ham olib tashlaydi', async () => {
    await withApp(async (app, db) => {
      const first = await app.inject({ method: 'POST', url: '/api/sheets', payload: body({ id: 'old' }) })
      assert.equal(first.statusCode, 201)
      const clash = await app.inject({ method: 'POST', url: '/api/sheets', payload: body({ id: 'clash' }) })
      assert.equal(clash.statusCode, 409)

      const second = await app.inject({
        method: 'POST',
        url: '/api/sheets',
        payload: body({
          id: 'new',
          grade: '10',
          tasks: [{ id: 'nt1', max: 8 }],
          students: [{ id: 'ns1', name: 'Vali', scores: { nt1: 4 } }],
        }),
      })
      assert.equal(second.statusCode, 201)
      await db.sheets.updateOne({ _id: 'old' }, { $set: { updatedAt: 1 } })

      const listed = await app.inject({ method: 'GET', url: '/api/sheets' })
      const ids = listed.json<{ sheets: { id: string; avgPercent: number }[] }>().sheets.map((sheet) => sheet.id)
      assert.deepEqual(ids, ['new', 'old'])

      const removed = await app.inject({ method: 'DELETE', url: '/api/sheets/new' })
      assert.equal(removed.statusCode, 204)
      assert.equal(removed.body, '')
      assert.equal(await db.sheets.findOne({ _id: 'new' }), null)

      const missing = await app.inject({ method: 'GET', url: '/api/sheets/new' })
      assert.equal(missing.statusCode, 404)
    })
  })

  it('o\'zgarmagan ball skaner manbasini saqlaydi, tuzatilgan ball qo\'lda bo\'ladi', async () => {
    await withApp(async (app, db) => {
      await app.inject({ method: 'POST', url: '/api/sheets', payload: body({ id: 'sheet-1' }) })
      await db.sheets.updateOne(
        { _id: 'sheet-1', 'students.id': 's1' },
        { $set: { 'students.$.scores.t1.source': 'scan' } },
      )

      const kept = await app.inject({
        method: 'PUT',
        url: '/api/sheets/sheet-1',
        payload: body({ district: 'Yangiyer shahri' }),
      })
      assert.equal(kept.statusCode, 200)
      assert.equal(kept.json<Saved>().sheet.district, 'Yangiyer shahri')
      const keptDoc = await db.sheets.findOne({ _id: 'sheet-1' })
      const keptScore = keptDoc?.students.find((student) => student.id === 's1')?.scores.t1
      assert.equal(keptScore?.source, 'scan')
      assert.equal(keptScore?.value, 7)

      const edited = await app.inject({
        method: 'PUT',
        url: '/api/sheets/sheet-1',
        payload: body({
          district: 'Yangiyer shahri',
          students: [{ id: 's1', name: 'Ali Valiyev', scores: { t1: 6, t2: 8, t3: 0, t4: 5, t5: 1 } }],
        }),
      })
      assert.equal(edited.statusCode, 200)
      const editedDoc = await db.sheets.findOne({ _id: 'sheet-1' })
      const editedStudent = editedDoc?.students.find((student) => student.id === 's1')
      assert.equal(editedStudent?.scores.t1?.source, 'manual')
      assert.equal(editedStudent?.scores.t1?.value, 6)
      assert.equal(editedStudent?.scores.t2?.source, 'manual')
    })
  })

  it('bo\'sh ball o\'rtachaga kirmaydi', async () => {
    await withApp(async (app) => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/sheets',
        payload: body({
          tasks: [
            { id: 't1', max: 10 },
            { id: 't2', max: 10 },
          ],
          students: [
            { id: 'a', name: 'A', scores: { t1: 8, t2: null } },
            { id: 'b', name: 'B', scores: {} },
            { id: 'c', name: 'C', scores: { t1: 4, t2: 6 } },
          ],
        }),
      })
      const saved = created.json<Saved>()
      assert.equal(saved.summary.rows[0].total, 8)
      assert.equal(saved.summary.rows[1].total, null)
      assert.equal(saved.summary.avgTotal, 9)
      assert.deepEqual(saved.sheet.students[0].scores, { t1: 8 })
    })
  })
})
