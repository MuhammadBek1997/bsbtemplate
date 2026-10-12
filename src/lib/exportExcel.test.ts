import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { buildWorkbook } from './exportExcel'
import { sampleSheet } from './sample.fixture'
import type { Sheet } from './types'

async function exported(sheet: Sheet) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await buildWorkbook(sheet))
  return wb.worksheets[0]
}

const formulaOf = (cell: ExcelJS.Cell) => (cell.value as ExcelJS.CellFormulaValue).formula
const resultOf = (cell: ExcelJS.Cell) => (cell.value as ExcelJS.CellFormulaValue).result

describe('Excel eksporti', () => {
  it('namuna fayl tuzilishini takrorlaydi', async () => {
    const ws = await exported(sampleSheet())

    expect(ws.getCell('A1').value).toBe(
      "Boyovut tumani 50-maktab 9-sinf o'quvchilari Informatika va AT fanidan 2-chorak 2-BSB natijalari",
    )
    expect(ws.getCell('A1').isMerged).toBe(true)
    expect(ws.getCell('B3').value).toBe("O'quvchining F.I.O.")
    expect(ws.getCell('C3').value).toBe('1-topshiriq (8 ball)')
    expect(ws.getCell('H3').value).toBe('Jami (50 ball)')
    expect(ws.getCell('I3').value).toBe('Foiz')

    expect(ws.getCell('A5').value).toBe(1)
    expect(ws.getCell('C5').value).toBe(7)
    expect(formulaOf(ws.getCell('H5'))).toBe('IF(COUNT(C5:G5)=0,"",SUM(C5:G5))')
    expect(resultOf(ws.getCell('H5'))).toBe(21)
    expect(formulaOf(ws.getCell('I5'))).toBe('IF(H5="","",H5/50*100)')
    expect(resultOf(ws.getCell('I5'))).toBe(42)
    expect((ws.getCell('I5').fill as ExcelJS.FillPattern).fgColor?.argb).toBe('FFFFFF00')

    // 19 o'quvchi: 5..23-qatorlar, 24 — o'rtacha ball (oxirgi qator)
    expect(ws.getCell('B24').value).toBe("O'rtacha ball")
    expect(formulaOf(ws.getCell('C24'))).toBe('IFERROR(AVERAGE(C5:C23),"")')
    expect(resultOf(ws.getCell('C24'))).toBeCloseTo(130 / 19, 10)
    expect(resultOf(ws.getCell('H24'))).toBeCloseTo(522 / 19, 10)
    expect(formulaOf(ws.getCell('I24'))).toBe('IFERROR(AVERAGE(I5:I23),"")')
    expect(ws.rowCount).toBe(24)
    expect(ws.columnCount).toBe(9)
  })

  it("topshiriq foizlari saytda yoqilgan bo'lsa ham faylga chiqmaydi", async () => {
    const ws = await exported({ ...sampleSheet(), showTaskPercent: true })
    expect(ws.columnCount).toBe(9)
    expect(ws.rowCount).toBe(24)
    expect(ws.getCell('J3').value).toBeNull()
    expect(ws.getCell('B25').value).toBeNull()
  })

  it("ball kiritilmagan o'quvchi bo'sh qoladi", async () => {
    const sheet = sampleSheet()
    sheet.students[0].scores = {}
    const ws = await exported(sheet)
    expect(ws.getCell('C5').value).toBeNull()
    // Bo'sh matn natijasi faylda saqlanmaydi; Excel ochilganda formulani o'zi hisoblaydi
    expect(resultOf(ws.getCell('H5')) ?? '').toBe('')
    expect(resultOf(ws.getCell('I5')) ?? '').toBe('')
    expect(resultOf(ws.getCell('H6'))).toBe(26)
  })
})
