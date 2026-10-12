export type Kind = 'BSB' | 'ChSB'

/** Ball qayerdan kelgani. Hozir hammasi qo'lda; skaner keyin 'scan' yozadi. */
export type ScoreSource = 'manual' | 'scan'

export interface Task {
  id: string
  max: number
}

export interface Student {
  id: string
  name: string
  /** Topshiriq id -> ball. Kalit yo'q bo'lsa, ball hali kiritilmagan. */
  scores: Record<string, number | null>
}

/** Front `Sheet` turi bilan bir xil hujjat. */
export interface Sheet {
  id: string
  district: string
  school: string
  grade: string
  subject: string
  quarter: number
  kind: Kind
  number: number
  customTitle: string | null
  tasks: Task[]
  students: Student[]
  showTaskPercent: boolean
  updatedAt: number
}

export interface Summary {
  maxTotal: number
  rows: { total: number | null; percent: number | null }[]
  taskAvg: (number | null)[]
  taskAvgPercent: (number | null)[]
  avgTotal: number | null
  avgPercent: number | null
}

/** Ro'yxat sahifasi uchun: to'liq ballarsiz, o'rtacha foiz bilan. */
export interface SheetSummary {
  id: string
  district: string
  school: string
  grade: string
  subject: string
  quarter: number
  kind: Kind
  number: number
  customTitle: string | null
  showTaskPercent: boolean
  updatedAt: number
  studentCount: number
  taskCount: number
  avgPercent: number | null
}

export interface SheetWrite {
  id?: string
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
  students: Student[]
}
