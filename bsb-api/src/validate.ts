import { HttpError } from './httpError.js'
import { isId, newId } from './ids.js'
import type { Kind, SheetWrite } from './types.js'

const MAX_TASKS = 30
const MAX_STUDENTS = 500
const TEXT_LIMIT = 200

export function isEmptyBody(body: unknown): boolean {
  if (body == null) return true
  return typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 0
}

/** Front `newSheet()` bilan bir xil bo'sh jadval. */
export function blankSheetWrite(): SheetWrite {
  return {
    district: '',
    school: '',
    grade: '',
    subject: '',
    quarter: 1,
    kind: 'BSB',
    number: 1,
    customTitle: null,
    tasks: Array.from({ length: 5 }, () => ({ id: newId(), max: 10 })),
    students: [],
    showTaskPercent: true,
  }
}

export function parseSheetWrite(body: unknown): SheetWrite {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new HttpError(400, "Jadval ma'lumoti noto'g'ri.")
  }
  const raw = body as Record<string, unknown>
  const id = raw.id === undefined ? undefined : readId(raw.id, 'Jadval identifikatori noto\'g\'ri.')
  const tasks = readTasks(raw.tasks)
  return {
    id,
    district: readText(raw.district, 'Tuman / shahar'),
    school: readText(raw.school, 'Maktab'),
    grade: readText(raw.grade, 'Sinf'),
    subject: readText(raw.subject, 'Fan'),
    quarter: readInt(raw.quarter, 1, 4, 'Chorak 1 dan 4 gacha butun son bo\'lishi kerak.'),
    kind: readKind(raw.kind),
    number: readInt(raw.number, 1, 100, 'BSB raqami 1 dan 100 gacha butun son bo\'lishi kerak.'),
    customTitle: readTitle(raw.customTitle),
    showTaskPercent: readBool(raw.showTaskPercent),
    tasks,
    students: readStudents(raw.students, tasks),
  }
}

function readTasks(value: unknown): SheetWrite['tasks'] {
  if (!Array.isArray(value)) throw new HttpError(400, "Topshiriqlar ro'yxati bo'lishi kerak.")
  if (value.length < 1) throw new HttpError(400, "Kamida bitta topshiriq bo'lishi kerak.")
  if (value.length > MAX_TASKS) {
    throw new HttpError(400, `Topshiriqlar soni ${MAX_TASKS} tadan oshmasligi kerak.`)
  }
  const tasks = value.map((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new HttpError(400, `${index + 1}-topshiriq noto'g'ri.`)
    }
    const task = item as Record<string, unknown>
    const id = task.id === undefined ? newId() : readId(task.id, `${index + 1}-topshiriq identifikatori noto'g'ri.`)
    const max = task.max
    if (typeof max !== 'number' || !Number.isFinite(max) || max < 1 || max > 1000) {
      throw new HttpError(400, `${index + 1}-topshiriqning maksimal bali 1 dan 1000 gacha bo'lishi kerak.`)
    }
    return { id, max }
  })
  if (new Set(tasks.map((task) => task.id)).size !== tasks.length) {
    throw new HttpError(400, 'Topshiriq identifikatorlari takrorlanmasligi kerak.')
  }
  return tasks
}

function readStudents(value: unknown, tasks: SheetWrite['tasks']): SheetWrite['students'] {
  if (!Array.isArray(value)) throw new HttpError(400, "O'quvchilar ro'yxati bo'lishi kerak.")
  if (value.length > MAX_STUDENTS) {
    throw new HttpError(400, `O'quvchilar soni ${MAX_STUDENTS} tadan oshmasligi kerak.`)
  }
  const taskIndex = new Map(tasks.map((task, index) => [task.id, index]))
  const students = value.map((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new HttpError(400, `${index + 1}-o'quvchi noto'g'ri.`)
    }
    const student = item as Record<string, unknown>
    const id =
      student.id === undefined
        ? newId()
        : readId(student.id, `${index + 1}-o'quvchi identifikatori noto'g'ri.`)
    const scores = readScores(student.scores, index, tasks, taskIndex)
    return { id, name: readName(student.name), scores }
  })
  if (new Set(students.map((student) => student.id)).size !== students.length) {
    throw new HttpError(400, "O'quvchi identifikatorlari takrorlanmasligi kerak.")
  }
  return students
}

function readScores(
  value: unknown,
  studentIndex: number,
  tasks: SheetWrite['tasks'],
  taskIndex: Map<string, number>,
): Record<string, number | null> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new HttpError(400, `${studentIndex + 1}-o'quvchi ballari noto'g'ri.`)
  }
  const scores: Record<string, number | null> = {}
  for (const [taskId, raw] of Object.entries(value)) {
    const place = taskIndex.get(taskId)
    if (place === undefined) {
      throw new HttpError(400, `${studentIndex + 1}-o'quvchi balida jadvalda yo'q topshiriq bor.`)
    }
    if (raw == null) continue
    const max = tasks[place].max
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0 || raw > max) {
      throw new HttpError(
        400,
        `${studentIndex + 1}-o'quvchining ${place + 1}-topshiriq bali 0 dan ${formatLimit(max)} gacha bo'lishi kerak.`,
      )
    }
    scores[taskId] = raw
  }
  return scores
}

function readText(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new HttpError(400, `${label} matn bo'lishi kerak.`)
  if (value.length > TEXT_LIMIT) {
    throw new HttpError(400, `${label} ${TEXT_LIMIT} belgidan oshmasligi kerak.`)
  }
  return value
}

function readName(value: unknown): string {
  return readText(value, "O'quvchi ismi")
}

function readTitle(value: unknown): string | null {
  if (value == null) return null
  if (typeof value !== 'string') throw new HttpError(400, 'Sarlavha matn bo\'lishi kerak.')
  const text = value.trim()
  if (text.length === 0) return null
  if (text.length > 500) throw new HttpError(400, 'Sarlavha 500 belgidan oshmasligi kerak.')
  return text
}

function readKind(value: unknown): Kind {
  if (value !== 'BSB' && value !== 'ChSB') {
    throw new HttpError(400, 'Nazorat turi BSB yoki ChSB bo\'lishi kerak.')
  }
  return value
}

function readBool(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new HttpError(400, "Topshiriq foizini ko'rsatish sozlamasi mantiqiy qiymat bo'lishi kerak.")
  }
  return value
}

function readInt(value: unknown, min: number, max: number, message: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new HttpError(400, message)
  }
  return value
}

function readId(value: unknown, message: string): string {
  if (typeof value !== 'string' || !isId(value)) throw new HttpError(400, message)
  return value
}

function formatLimit(value: number): string {
  return String(value).replace('.', ',')
}
