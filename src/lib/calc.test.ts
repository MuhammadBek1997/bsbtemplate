import { describe, expect, it } from 'vitest'
import { formatNumber, formatPercent, parseScore, summarize } from './calc'
import { sampleSheet } from './sample.fixture'
import { autoTitle, fileName } from './title'

describe('summarize — namuna fayl bilan solishtirish', () => {
  const s = summarize(sampleSheet())

  it("o'quvchi jami bali va foizi", () => {
    expect(s.maxTotal).toBe(50)
    expect(s.rows[0]).toEqual({ total: 21, percent: 42 })
    expect(s.rows[15]).toEqual({ total: 37, percent: 74 })
    expect(s.rows.map((r) => r.total)).toEqual([
      21, 26, 21, 29, 28, 31, 28, 21, 25, 31, 31, 25, 31, 32, 25, 37, 20, 24, 36,
    ])
  })

  it("topshiriqlar bo'yicha o'rtacha ball (AVERAGE)", () => {
    const expected = [130, 134, 65, 147, 46].map((sum) => sum / 19)
    s.taskAvg.forEach((avg, i) => expect(avg).toBeCloseTo(expected[i], 10))
  })

  it("topshiriq o'rtachasi shu topshiriq maksimal baliga nisbatan foizda", () => {
    expect(s.taskAvgPercent[0]).toBeCloseTo((130 / 19 / 8) * 100, 10)
    expect(s.taskAvgPercent[2]).toBeCloseTo((65 / 19 / 12) * 100, 10)
  })

  it("sinf o'rtachasi", () => {
    expect(s.avgTotal).toBeCloseTo(522 / 19, 10)
    expect(s.avgPercent).toBeCloseTo((522 / 19 / 50) * 100, 10)
  })
})

describe("to'liq kiritilmagan ballar", () => {
  it("balli yo'q o'quvchi o'rtachaga kirmaydi, bo'sh katak 0 emas", () => {
    const sheet = sampleSheet()
    sheet.students = [
      { id: 'a', name: 'A', scores: { t1: 8, t2: null } },
      { id: 'b', name: 'B', scores: {} },
      { id: 'c', name: 'C', scores: { t1: 4, t2: 6 } },
    ]
    const s = summarize(sheet)
    expect(s.rows[0].total).toBe(8)
    expect(s.rows[1]).toEqual({ total: null, percent: null })
    expect(s.taskAvg[0]).toBe(6)
    expect(s.taskAvg[1]).toBe(6)
    expect(s.taskAvg[2]).toBeNull()
    expect(s.avgTotal).toBe(9)
  })
})

describe('parseScore / format', () => {
  it('vergul va nuqtani qabul qiladi', () => {
    expect(parseScore('7,5')).toBe(7.5)
    expect(parseScore(' 7.5 ')).toBe(7.5)
    expect(parseScore('7,')).toBe(7)
    expect(parseScore('')).toBeNull()
    expect(parseScore('abc')).toBeUndefined()
    expect(parseScore('-3')).toBeUndefined()
  })

  it('sonlarni vergul bilan chiqaradi', () => {
    expect(formatNumber(6.8421, 2)).toBe('6,84')
    expect(formatNumber(7, 2, true)).toBe('7')
    expect(formatNumber(10, 2, true)).toBe('10')
    expect(formatPercent(42)).toBe('42%')
    expect(formatPercent(28.94)).toBe('28,9%')
    expect(formatPercent(null)).toBe('')
  })
})

describe('sarlavha', () => {
  it('namuna fayldagi sarlavha bilan bir xil tuziladi', () => {
    expect(autoTitle(sampleSheet())).toBe(
      "Boyovut tumani 50-maktab 9-sinf o'quvchilari Informatika va AT fanidan 2-chorak 2-BSB natijalari",
    )
  })

  it('ChSB uchun raqam qo\'yilmaydi, "9-sinf" deb yozilsa takrorlanmaydi', () => {
    const sheet = { ...sampleSheet(), kind: 'ChSB' as const, grade: '9-A sinf' }
    expect(autoTitle(sheet)).toContain("9-A-sinf o'quvchilari")
    expect(autoTitle(sheet)).toContain('2-chorak ChSB natijalari')
    expect(fileName(sheet)).toBe('9-A-sinf Informatika va AT 2-chorak ChSB.xlsx')
  })
})
