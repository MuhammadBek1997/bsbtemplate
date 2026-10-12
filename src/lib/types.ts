export type Kind = 'BSB' | 'ChSB'

export interface Task {
  id: string
  max: number
}

export interface Student {
  id: string
  name: string
  /** Topshiriq id -> ball. null yoki yo'q bo'lsa, ball hali kiritilmagan. */
  scores: Record<string, number | null>
}

export interface Sheet {
  id: string
  district: string
  school: string
  grade: string
  subject: string
  quarter: number
  kind: Kind
  /** BSB tartib raqami. ChSB uchun ishlatilmaydi. */
  number: number
  /** null bo'lsa, sarlavha maydonlardan avtomatik tuziladi. */
  customTitle: string | null
  tasks: Task[]
  students: Student[]
  showTaskPercent: boolean
  updatedAt: number
}

/** Ro'yxat sahifasi. To'liq ballar yo'q, o'rtacha foiz serverdan keladi. */
export interface SheetCard {
  id: string
  district: string
  school: string
  grade: string
  subject: string
  quarter: number
  kind: Kind
  number: number
  customTitle: string | null
  updatedAt: number
  studentCount: number
  avgPercent: number | null
}
