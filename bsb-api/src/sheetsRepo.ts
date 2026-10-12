import type { Collection } from 'mongodb'
import { summarize } from './calc.js'
import { HttpError } from './httpError.js'
import { isId, newId } from './ids.js'
import type { Kind, ScoreSource, Sheet, SheetSummary, SheetWrite, Task } from './types.js'

interface StoredScore {
  value: number
  source: ScoreSource
}

interface StoredStudent {
  id: string
  name: string
  scores: Record<string, StoredScore>
}

/** Atlasdagi bitta jadval hujjati. Ball ichida source skaner uchun saqlanadi. */
export interface StoredSheet {
  _id: string
  district: string
  school: string
  grade: string
  subject: string
  quarter: number
  kind: Kind
  number: number
  customTitle: string | null
  showTaskPercent: boolean
  tasks: Task[]
  students: StoredStudent[]
  createdAt: number
  updatedAt: number
}

type Sheets = Collection<StoredSheet>

export async function listSheets(sheets: Sheets): Promise<SheetSummary[]> {
  const docs = await sheets.find().sort({ updatedAt: -1, createdAt: -1 }).toArray()
  return docs.map((doc) => {
    const sheet = toSheet(doc)
    return {
      id: sheet.id,
      district: sheet.district,
      school: sheet.school,
      grade: sheet.grade,
      subject: sheet.subject,
      quarter: sheet.quarter,
      kind: sheet.kind,
      number: sheet.number,
      customTitle: sheet.customTitle,
      showTaskPercent: sheet.showTaskPercent,
      updatedAt: sheet.updatedAt,
      studentCount: sheet.students.length,
      taskCount: sheet.tasks.length,
      avgPercent: summarize(sheet).avgPercent,
    }
  })
}

export async function getSheet(sheets: Sheets, id: string): Promise<Sheet | null> {
  if (!isId(id)) return null
  const doc = await sheets.findOne({ _id: id })
  return doc ? toSheet(doc) : null
}

export async function createSheet(sheets: Sheets, input: SheetWrite): Promise<Sheet> {
  const id = input.id ?? newId()
  if (!isId(id)) throw new HttpError(400, "Jadval identifikatori noto'g'ri.")
  if (await sheets.findOne({ _id: id }, { projection: { _id: 1 } })) {
    throw new HttpError(409, 'Bu identifikatorli jadval allaqachon bor.')
  }
  await assertIdsFree(sheets, id, input)
  const now = Date.now()
  try {
    await sheets.insertOne(toStored(id, input, now, now, null))
  } catch (error) {
    rethrow(error)
  }
  return mustGet(sheets, id)
}

export async function replaceSheet(sheets: Sheets, id: string, input: SheetWrite): Promise<Sheet> {
  if (!isId(id)) throw new HttpError(400, "Jadval identifikatori noto'g'ri.")
  const existing = await sheets.findOne({ _id: id })
  if (!existing) throw new HttpError(404, 'Jadval topilmadi.')
  await assertIdsFree(sheets, id, input)
  try {
    await sheets.replaceOne({ _id: id }, toStored(id, input, existing.createdAt, Date.now(), existing))
  } catch (error) {
    rethrow(error)
  }
  return mustGet(sheets, id)
}

export async function deleteSheet(sheets: Sheets, id: string): Promise<void> {
  if (!isId(id)) throw new HttpError(400, "Jadval identifikatori noto'g'ri.")
  const result = await sheets.deleteOne({ _id: id })
  if (result.deletedCount === 0) throw new HttpError(404, 'Jadval topilmadi.')
}

/** Front `cloneForNext`: shu sinf ro'yxati, yangi topshiriq idlari, ballarsiz. */
export async function cloneSheet(sheets: Sheets, id: string): Promise<Sheet> {
  const source = await getSheet(sheets, id)
  if (!source) throw new HttpError(404, 'Jadval topilmadi.')
  return createSheet(sheets, {
    district: source.district,
    school: source.school,
    grade: source.grade,
    subject: source.subject,
    quarter: source.quarter,
    kind: source.kind,
    number: source.kind === 'BSB' ? Math.min(source.number + 1, 100) : source.number,
    customTitle: null,
    showTaskPercent: source.showTaskPercent,
    tasks: source.tasks.map((task) => ({ id: newId(), max: task.max })),
    students: source.students.map((student) => ({ id: newId(), name: student.name, scores: {} })),
  })
}

function toStored(
  id: string,
  input: SheetWrite,
  createdAt: number,
  updatedAt: number,
  previous: StoredSheet | null,
): StoredSheet {
  const prior = new Map<string, StoredScore>()
  if (previous) {
    for (const student of previous.students) {
      for (const [taskId, score] of Object.entries(student.scores)) {
        prior.set(scoreKey(student.id, taskId), score)
      }
    }
  }
  return {
    _id: id,
    district: input.district,
    school: input.school,
    grade: input.grade,
    subject: input.subject,
    quarter: input.quarter,
    kind: input.kind,
    number: input.number,
    customTitle: input.customTitle,
    showTaskPercent: input.showTaskPercent,
    tasks: input.tasks.map((task) => ({ id: task.id, max: task.max })),
    students: input.students.map((student) => {
      const scores: Record<string, StoredScore> = {}
      for (const [taskId, value] of Object.entries(student.scores)) {
        if (value == null) continue
        const old = prior.get(scoreKey(student.id, taskId))
        scores[taskId] = {
          value,
          source: old && old.value === value ? old.source : 'manual',
        }
      }
      return { id: student.id, name: student.name, scores }
    }),
    createdAt,
    updatedAt,
  }
}

function toSheet(doc: StoredSheet): Sheet {
  return {
    id: doc._id,
    district: doc.district,
    school: doc.school,
    grade: doc.grade,
    subject: doc.subject,
    quarter: doc.quarter,
    kind: doc.kind,
    number: doc.number,
    customTitle: doc.customTitle,
    showTaskPercent: doc.showTaskPercent,
    updatedAt: doc.updatedAt,
    tasks: doc.tasks.map((task) => ({ id: task.id, max: task.max })),
    students: doc.students.map((student) => ({
      id: student.id,
      name: student.name,
      scores: Object.fromEntries(
        Object.entries(student.scores).map(([taskId, score]) => [taskId, score.value]),
      ),
    })),
  }
}

async function assertIdsFree(sheets: Sheets, sheetId: string, input: SheetWrite): Promise<void> {
  const taskIds = input.tasks.map((task) => task.id)
  const studentIds = input.students.map((student) => student.id)
  const or: Record<string, unknown>[] = [{ 'tasks.id': { $in: taskIds } }]
  if (studentIds.length > 0) or.push({ 'students.id': { $in: studentIds } })
  const clash = await sheets.findOne({ _id: { $ne: sheetId }, $or: or })
  if (!clash) return
  if (clash.tasks.some((task) => taskIds.includes(task.id))) {
    throw new HttpError(409, 'Topshiriq identifikatori band.')
  }
  throw new HttpError(409, "O'quvchi identifikatori band.")
}

async function mustGet(sheets: Sheets, id: string): Promise<Sheet> {
  const sheet = await getSheet(sheets, id)
  if (!sheet) throw new HttpError(500, "Saqlangan jadvalni o'qib bo'lmadi.")
  return sheet
}

function scoreKey(studentId: string, taskId: string): string {
  return `${studentId}\0${taskId}`
}

function rethrow(error: unknown): never {
  if (error instanceof HttpError) throw error
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
    throw new HttpError(409, "Ma'lumot boshqa jadval bilan to'qnashdi.")
  }
  throw error
}
