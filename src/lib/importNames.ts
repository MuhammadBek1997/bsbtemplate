export type Rows = unknown[][]

export interface ParsedBook {
  sheets: { name: string; rows: Rows }[]
}

const HEADER_RE =
  /\bf\.\s*i\.\s*(o|sh)\b|\bfio\b|\bfish\b|familiya|\bism(i|lar|lari)?\b|o['ʻ’`‘]?quvchi|ф\.?\s*и\.?\s*(о|ш)\.?|фамилия|ўқувчи|ученик/i
const SKIP_RE = /^(jami|o['ʻ’`‘]?rtacha.*|итого|всего|жами|ўртача.*|total|average)\s*:?$/i
const MAX_NAME_LENGTH = 60

export async function readWorkbook(file: File): Promise<ParsedBook> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(await file.arrayBuffer())
  return {
    sheets: wb.SheetNames.map((name) => ({
      name,
      rows: XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
        header: 1,
        defval: null,
        blankrows: false,
      }),
    })),
  }
}

export function columnCount(rows: Rows): number {
  return rows.reduce((max, r) => Math.max(max, r.length), 0)
}

export function columnLabel(index: number): string {
  let label = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    label = String.fromCharCode(65 + ((n - 1) % 26)) + label
  }
  return label
}

function cellText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim()
}

function isHeader(text: string): boolean {
  return HEADER_RE.test(text)
}

function isNameLike(text: string): boolean {
  return (
    text.length >= 2 &&
    text.length <= MAX_NAME_LENGTH &&
    /\p{L}/u.test(text) &&
    !/\d/.test(text) &&
    !SKIP_RE.test(text) &&
    !isHeader(text)
  )
}

/** Ism-familiya ustunini taxmin qiladi: sarlavhasi mos keladigan yoki eng ko'p matnli ustun. */
export function detectNameColumn(rows: Rows): number {
  let best = 0
  let bestScore = -1
  for (let col = 0; col < columnCount(rows); col++) {
    let score = 0
    for (const row of rows) {
      const text = cellText(row[col])
      if (isHeader(text) && text.length <= MAX_NAME_LENGTH) score += 1000
      else if (isNameLike(text)) score += 1
    }
    if (score > bestScore) {
      best = col
      bestScore = score
    }
  }
  return best
}

/** Tanlangan ustunlardan ismlarni oladi; bir nechta ustun bo'lsa, probel bilan birlashtiradi. */
export function extractNames(rows: Rows, cols: number[]): string[] {
  if (cols.length === 0) return []
  let start = 0
  rows.forEach((row, i) => {
    if (cols.some((c) => isHeader(cellText(row[c])))) start = i + 1
  })
  const names: string[] = []
  for (const row of rows.slice(start)) {
    const parts = cols.map((c) => cellText(row[c])).filter(isNameLike)
    if (parts.length > 0) names.push(parts.join(' '))
  }
  return names
}

export function sampleOf(rows: Rows, col: number): string {
  for (const row of rows) {
    const text = cellText(row[col])
    if (isNameLike(text)) return text
  }
  return ''
}
