import { describe, expect, it } from 'vitest'
import { columnLabel, detectNameColumn, extractNames, type Rows } from './importNames'

// Namuna fayl tuzilishi: sarlavha, ustun nomlari, ballar, pastda "Jami"
const sample: Rows = [
  ["Boyovut tumani 50-maktab 9-sinf o'quvchilari Informatika va At fanidan 2-chorak 2-BSB natijalari"],
  ['   №', "O'quvchining F.I.O.", '1-topshiriq  ( 8 ball)', 'Jami (50 ball)', 'Foiz'],
  [1, ' Abdusattorov F', 7, 21, 42],
  [2, 'Azimjonova G', 8, 26, 52],
  [3, 'Rohatqulov S ', 8, 25, 50],
  [4, 'Ismoilov  Ismoil', 8, 25, 50],
  [null, 'Jami', 6.84, 27.47, 54.95],
]

describe('Excel fayldan ismlarni olish', () => {
  it('F.I.O. ustunini topadi', () => {
    expect(detectNameColumn(sample)).toBe(1)
  })

  it("sarlavha, ustun nomi va Jami qatorini tashlab, ismlarni tozalab oladi", () => {
    expect(extractNames(sample, [1])).toEqual([
      'Abdusattorov F',
      'Azimjonova G',
      'Rohatqulov S',
      'Ismoilov Ismoil',
    ])
  })

  it("sarlavhasiz oddiy ro'yxatni ham o'qiydi", () => {
    const plain: Rows = [
      [1, 'Karimov Ali'],
      [2, 'Valiyeva Zuhra'],
    ]
    expect(detectNameColumn(plain)).toBe(1)
    expect(extractNames(plain, [1])).toEqual(['Karimov Ali', 'Valiyeva Zuhra'])
  })

  it('familiya va ism alohida ustunlarda bo\'lsa birlashtiradi', () => {
    const split: Rows = [
      ['№', 'Familiya', 'Ismi'],
      [1, 'Karimov', 'Ali'],
      [2, 'Valiyeva', 'Zuhra'],
    ]
    expect(extractNames(split, [1, 2])).toEqual(['Karimov Ali', 'Valiyeva Zuhra'])
  })

  it('ustun harflari', () => {
    expect(columnLabel(0)).toBe('A')
    expect(columnLabel(25)).toBe('Z')
    expect(columnLabel(26)).toBe('AA')
  })
})
