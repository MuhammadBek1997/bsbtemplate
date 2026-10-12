import type { Sheet, Student } from './types'

const KEY = 'bsb-sheets-v1'

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

export function loadSheets(): Sheet[] {
  try {
    const raw = localStorage.getItem(KEY)
    const data = raw ? JSON.parse(raw) : []
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/** Saqlab bo'lmasa (xotira to'lgan yoki taqiqlangan) false qaytaradi. */
export function saveSheets(sheets: Sheet[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(sheets))
    return true
  } catch {
    return false
  }
}

export function newStudent(name: string): Student {
  return { id: uid(), name, scores: {} }
}

export function newSheet(): Sheet {
  return {
    id: uid(),
    district: '',
    school: '',
    grade: '',
    subject: '',
    quarter: 1,
    kind: 'BSB',
    number: 1,
    customTitle: null,
    tasks: Array.from({ length: 5 }, () => ({ id: uid(), max: 10 })),
    students: [],
    showTaskPercent: true,
    updatedAt: Date.now(),
  }
}

/** Shu sinf ro'yxati va sozlamalari bilan, ballarsiz yangi jadval. */
export function cloneForNext(sheet: Sheet): Sheet {
  return {
    ...sheet,
    id: uid(),
    number: sheet.kind === 'BSB' ? sheet.number + 1 : sheet.number,
    customTitle: null,
    tasks: sheet.tasks.map((t) => ({ ...t, id: uid() })),
    students: sheet.students.map((s) => newStudent(s.name)),
    updatedAt: Date.now(),
  }
}
