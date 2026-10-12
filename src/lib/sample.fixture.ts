import type { Sheet } from './types'

/** Namuna fayldagi (claudga.xlsx) topshiriqlar va ballar; ismlar shartli. */
const MAXES = [8, 8, 12, 12, 10]
const SCORES = [
  [7, 8, 0, 5, 1],
  [8, 8, 2, 8, 0],
  [8, 7, 0, 6, 0],
  [0, 8, 9, 6, 6],
  [8, 8, 1, 9, 2],
  [7, 8, 3, 11, 2],
  [8, 8, 1, 11, 0],
  [8, 7, 0, 6, 0],
  [4, 0, 9, 9, 3],
  [6, 8, 9, 8, 0],
  [7, 8, 4, 8, 4],
  [8, 8, 3, 5, 1],
  [8, 8, 3, 10, 2],
  [8, 8, 2, 10, 4],
  [4, 0, 9, 9, 3],
  [8, 8, 2, 10, 9],
  [8, 8, 3, 1, 0],
  [8, 8, 2, 6, 0],
  [7, 8, 3, 9, 9],
]

export function sampleSheet(): Sheet {
  const tasks = MAXES.map((max, i) => ({ id: `t${i + 1}`, max }))
  return {
    id: 'sample',
    district: 'Boyovut tumani',
    school: '50-maktab',
    grade: '9',
    subject: 'Informatika va AT',
    quarter: 2,
    kind: 'BSB',
    number: 2,
    customTitle: null,
    tasks,
    students: SCORES.map((row, i) => ({
      id: `s${i + 1}`,
      name: `O'quvchi ${i + 1}`,
      scores: Object.fromEntries(row.map((score, j) => [tasks[j].id, score])),
    })),
    showTaskPercent: false,
    updatedAt: 0,
  }
}
