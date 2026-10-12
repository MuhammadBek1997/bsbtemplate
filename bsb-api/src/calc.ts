import type { Sheet, Student, Summary, Task } from './types.js'

export function maxTotal(tasks: Task[]): number {
  return tasks.reduce((sum, task) => sum + task.max, 0)
}

export function scoreOf(student: Student, taskId: string): number | null {
  return student.scores[taskId] ?? null
}

/** Hech bir ball kiritilmagan bo'lsa null; aks holda bo'sh kataklar yig'indiga kirmaydi (Excel SUM). */
export function studentTotal(student: Student, tasks: Task[]): number | null {
  let total = 0
  let any = false
  for (const task of tasks) {
    const score = scoreOf(student, task.id)
    if (score != null) {
      total += score
      any = true
    }
  }
  return any ? total : null
}

export function percent(value: number | null, max: number): number | null {
  if (value == null || max <= 0) return null
  return (value / max) * 100
}

/** Bo'sh qiymatlar hisobga olinmaydi (Excel AVERAGE). */
export function average(values: (number | null)[]): number | null {
  const nums = values.filter((value): value is number => value != null)
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function summarize(sheet: Pick<Sheet, 'tasks' | 'students'>): Summary {
  const max = maxTotal(sheet.tasks)
  const rows = sheet.students.map((student) => {
    const total = studentTotal(student, sheet.tasks)
    return { total, percent: percent(total, max) }
  })
  const taskAvg = sheet.tasks.map((task) =>
    average(sheet.students.map((student) => scoreOf(student, task.id))),
  )
  return {
    maxTotal: max,
    rows,
    taskAvg,
    taskAvgPercent: taskAvg.map((avg, index) => percent(avg, sheet.tasks[index].max)),
    avgTotal: average(rows.map((row) => row.total)),
    avgPercent: average(rows.map((row) => row.percent)),
  }
}
