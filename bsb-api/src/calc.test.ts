import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { summarize } from './calc.js'
import { sampleSheet } from './sample.fixture.js'

function closeTo(actual: number | null, expected: number): void {
  assert.notEqual(actual, null)
  assert.ok(Math.abs((actual as number) - expected) < 1e-9, `${actual} ≈ ${expected} emas`)
}

describe('summarize — namuna fayl bilan solishtirish', () => {
  const summary = summarize(sampleSheet())

  it("o'quvchi jami bali va foizi", () => {
    assert.equal(summary.maxTotal, 50)
    assert.deepEqual(summary.rows[0], { total: 21, percent: 42 })
    assert.deepEqual(summary.rows[15], { total: 37, percent: 74 })
    assert.deepEqual(
      summary.rows.map((row) => row.total),
      [21, 26, 21, 29, 28, 31, 28, 21, 25, 31, 31, 25, 31, 32, 25, 37, 20, 24, 36],
    )
  })

  it("topshiriqlar bo'yicha o'rtacha ball (AVERAGE)", () => {
    const expected = [130, 134, 65, 147, 46].map((sum) => sum / 19)
    summary.taskAvg.forEach((avg, index) => closeTo(avg, expected[index]))
  })

  it('topshiriq o\'rtachasi shu topshiriq maksimal baliga nisbatan foizda', () => {
    closeTo(summary.taskAvgPercent[0], (130 / 19 / 8) * 100)
    closeTo(summary.taskAvgPercent[2], (65 / 19 / 12) * 100)
  })

  it("sinf o'rtachasi", () => {
    closeTo(summary.avgTotal, 522 / 19)
    closeTo(summary.avgPercent, (522 / 19 / 50) * 100)
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
    const summary = summarize(sheet)
    assert.equal(summary.rows[0].total, 8)
    assert.deepEqual(summary.rows[1], { total: null, percent: null })
    assert.equal(summary.taskAvg[0], 6)
    assert.equal(summary.taskAvg[1], 6)
    assert.equal(summary.taskAvg[2], null)
    assert.equal(summary.avgTotal, 9)
  })
})
