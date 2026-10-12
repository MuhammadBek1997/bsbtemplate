import type { Sheet } from './types'
import { scoreOf, summarize } from './calc'
import { columnLabel } from './importNames'
import { fileName, kindLabel, sheetTitle } from './title'

const FIRST_ROW = 5
const YELLOW = 'FFFFFF00'

/**
 * Namuna fayl ko'rinishidagi .xlsx: sarlavha, ballar, SUM/AVERAGE formulalari, sariq Foiz ustuni.
 * Topshiriqlar bo'yicha foizlar faqat saytda ko'rsatiladi, faylga chiqarilmaydi.
 */
export async function buildWorkbook(sheet: Sheet): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import('exceljs')
  const summary = summarize(sheet)
  const { tasks, students } = sheet
  const n = tasks.length

  // 1 asosli ustun raqamlari
  const taskCol = (i: number) => 3 + i
  const totalCol = 3 + n
  const pctCol = 4 + n
  const L = (col: number) => columnLabel(col - 1)

  const lastRow = FIRST_ROW + students.length - 1
  const avgRow = lastRow + 1

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(kindLabel(sheet), {
    pageSetup: {
      paperSize: 9,
      orientation: pctCol > 9 ? 'landscape' : 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  })

  ws.mergeCells(1, 1, 2, pctCol)
  const title = ws.getCell(1, 1)
  title.value = sheetTitle(sheet)
  title.font = { bold: true, size: 13 }
  title.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  ws.getRow(1).height = 22
  ws.getRow(2).height = 22

  const header = (col: number, text: string) => {
    ws.mergeCells(3, col, 4, col)
    ws.getCell(3, col).value = text
  }
  header(1, '№')
  header(2, "O'quvchining F.I.O.")
  tasks.forEach((t, i) => header(taskCol(i), `${i + 1}-topshiriq (${t.max} ball)`))
  header(totalCol, `Jami (${summary.maxTotal} ball)`)
  header(pctCol, 'Foiz')
  ws.getRow(3).height = 24
  ws.getRow(4).height = 24

  const formula = (f: string, result: number | null) => ({ formula: f, result: result ?? '' })

  students.forEach((st, idx) => {
    const r = FIRST_ROW + idx
    const range = `${L(taskCol(0))}${r}:${L(taskCol(n - 1))}${r}`
    const total = `${L(totalCol)}${r}`
    ws.getCell(r, 1).value = idx + 1
    ws.getCell(r, 2).value = st.name
    tasks.forEach((t, i) => {
      const score = scoreOf(st, t.id)
      if (score != null) ws.getCell(r, taskCol(i)).value = score
    })
    ws.getCell(r, totalCol).value = formula(
      `IF(COUNT(${range})=0,"",SUM(${range}))`,
      summary.rows[idx].total,
    )
    ws.getCell(r, pctCol).value = formula(
      `IF(${total}="","",${total}/${summary.maxTotal}*100)`,
      summary.rows[idx].percent,
    )
  })

  const avgOf = (col: number, result: number | null) => {
    ws.getCell(avgRow, col).value = formula(
      `IFERROR(AVERAGE(${L(col)}${FIRST_ROW}:${L(col)}${lastRow}),"")`,
      result,
    )
  }
  ws.getCell(avgRow, 2).value = "O'rtacha ball"
  tasks.forEach((_, i) => avgOf(taskCol(i), summary.taskAvg[i]))
  avgOf(totalCol, summary.avgTotal)
  avgOf(pctCol, summary.avgPercent)

  const thin = { style: 'thin' as const }
  for (let r = 3; r <= avgRow; r++) {
    const bold = r < FIRST_ROW || r === avgRow
    for (let c = 1; c <= pctCol; c++) {
      const cell = ws.getCell(r, c)
      cell.border = { top: thin, left: thin, bottom: thin, right: thin }
      cell.alignment = {
        horizontal: c === 2 && r >= FIRST_ROW ? 'left' : 'center',
        vertical: 'middle',
        wrapText: r < FIRST_ROW,
      }
      if (bold) cell.font = { bold: true }
      if (c === pctCol && r <= lastRow) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW } }
      }
      if (r >= FIRST_ROW) {
        if (c === pctCol) cell.numFmt = '0.0'
        else if (r === avgRow) cell.numFmt = '0.00'
      }
    }
  }

  ws.getColumn(1).width = 5
  ws.getColumn(2).width = 28
  for (let c = 3; c <= pctCol; c++) ws.getColumn(c).width = c === pctCol ? 9 : 12

  return wb.xlsx.writeBuffer()
}

export async function downloadExcel(sheet: Sheet): Promise<void> {
  const buffer = await buildWorkbook(sheet)
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName(sheet)
  a.click()
  URL.revokeObjectURL(url)
}
