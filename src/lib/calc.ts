import type { Sheet, Student, Task } from './types'

export function maxTotal(tasks: Task[]): number {
  return tasks.reduce((sum, t) => sum + t.max, 0)
}

export function scoreOf(student: Student, taskId: string): number | null {
  return student.scores[taskId] ?? null
}

/** Hech bir ball kiritilmagan bo'lsa null; aks holda bo'sh kataklar 0 deb olinadi (Excel SUM kabi). */
export function studentTotal(student: Student, tasks: Task[]): number | null {
  let total = 0
  let any = false
  for (const t of tasks) {
    const s = scoreOf(student, t.id)
    if (s != null) {
      total += s
      any = true
    }
  }
  return any ? total : null
}

export function percent(value: number | null, max: number): number | null {
  if (value == null || max <= 0) return null
  return (value / max) * 100
}

/** Bo'sh qiymatlar hisobga olinmaydi (Excel AVERAGE kabi). */
export function average(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null)
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export interface Summary {
  maxTotal: number
  rows: { total: number | null; percent: number | null }[]
  taskAvg: (number | null)[]
  taskAvgPercent: (number | null)[]
  avgTotal: number | null
  avgPercent: number | null
}

export function summarize(sheet: Pick<Sheet, 'tasks' | 'students'>): Summary {
  const max = maxTotal(sheet.tasks)
  const rows = sheet.students.map((st) => {
    const total = studentTotal(st, sheet.tasks)
    return { total, percent: percent(total, max) }
  })
  const taskAvg = sheet.tasks.map((t) => average(sheet.students.map((st) => scoreOf(st, t.id))))
  return {
    maxTotal: max,
    rows,
    taskAvg,
    taskAvgPercent: taskAvg.map((avg, i) => percent(avg, sheet.tasks[i].max)),
    avgTotal: average(rows.map((r) => r.total)),
    avgPercent: average(rows.map((r) => r.percent)),
  }
}

/** "7,5" yoki "7.5" -> 7.5; bo'sh -> null; noto'g'ri -> undefined. */
export function parseScore(text: string): number | null | undefined {
  const t = text.trim().replace(',', '.')
  if (t === '') return null
  if (!/^\d+(\.\d*)?$/.test(t)) return undefined
  return Number(t)
}

export function formatNumber(value: number | null, digits: number, trim = false): string {
  if (value == null) return ''
  let s = value.toFixed(digits)
  if (trim && s.includes('.')) s = s.replace(/\.?0+$/, '')
  return s.replace('.', ',')
}

export function formatPercent(value: number | null): string {
  return value == null ? '' : formatNumber(value, 1, true) + '%'
}
