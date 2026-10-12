import type { Sheet } from './types'

type TitleFields = Pick<
  Sheet,
  'district' | 'school' | 'grade' | 'subject' | 'quarter' | 'kind' | 'number' | 'customTitle'
>

export function kindLabel(sheet: Pick<Sheet, 'kind' | 'number'>): string {
  return sheet.kind === 'BSB' ? `${sheet.number}-BSB` : 'ChSB'
}

/** "9-sinf", "9 sinf", "9" -> "9" */
export function normalizeGrade(grade: string): string {
  return grade.trim().replace(/[-\s]*sinf$/i, '')
}

export function autoTitle(sheet: TitleFields): string {
  const grade = normalizeGrade(sheet.grade)
  const subject = sheet.subject.trim()
  return [
    sheet.district.trim(),
    sheet.school.trim(),
    grade && `${grade}-sinf o'quvchilari`,
    subject && `${subject} fanidan`,
    `${sheet.quarter}-chorak`,
    `${kindLabel(sheet)} natijalari`,
  ]
    .filter(Boolean)
    .join(' ')
}

export function sheetTitle(sheet: TitleFields): string {
  return sheet.customTitle?.trim() || autoTitle(sheet)
}

export function fileName(sheet: TitleFields): string {
  const grade = normalizeGrade(sheet.grade)
  const name = [
    grade && `${grade}-sinf`,
    sheet.subject.trim(),
    `${sheet.quarter}-chorak`,
    kindLabel(sheet),
  ]
    .filter(Boolean)
    .join(' ')
  return name.replace(/[\\/:*?"<>|]/g, '').trim() + '.xlsx'
}
