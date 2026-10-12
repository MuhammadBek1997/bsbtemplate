import { useMemo, useState } from 'react'
import {
  columnCount,
  columnLabel,
  detectNameColumn,
  extractNames,
  readWorkbook,
  sampleOf,
  type ParsedBook,
} from '../lib/importNames'

export type ImportMode = 'append' | 'replace'

interface Props {
  existingNames: string[]
  onImport: (names: string[], mode: ImportMode) => void
  onClose: () => void
}

const key = (name: string) => name.toLocaleLowerCase().replace(/\s+/g, ' ').trim()

export function ImportDialog({ existingNames, onImport, onClose }: Props) {
  const [book, setBook] = useState<ParsedBook | null>(null)
  const [fileLabel, setFileLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sheetIdx, setSheetIdx] = useState(0)
  const [cols, setCols] = useState<number[]>([])
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [mode, setMode] = useState<ImportMode>('append')

  const rows = book?.sheets[sheetIdx]?.rows ?? []
  const names = useMemo(() => extractNames(rows, cols), [rows, cols])
  const existing = useMemo(() => new Set(existingNames.map(key)), [existingNames])

  const duplicates = useMemo(() => {
    const seen = new Set<string>(mode === 'append' ? existing : [])
    const dup = new Set<number>()
    names.forEach((name, i) => {
      if (excluded.has(i)) return
      const k = key(name)
      if (seen.has(k)) dup.add(i)
      seen.add(k)
    })
    return dup
  }, [names, excluded, existing, mode])

  const selected = names.filter((_, i) => !excluded.has(i))

  const selectSheet = (parsed: ParsedBook, idx: number) => {
    setSheetIdx(idx)
    setCols([detectNameColumn(parsed.sheets[idx].rows)])
    setExcluded(new Set())
  }

  const openFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setLoading(true)
    try {
      const parsed = await readWorkbook(file)
      if (parsed.sheets.length === 0) throw new Error('empty')
      setBook(parsed)
      setFileLabel(file.name)
      selectSheet(parsed, 0)
    } catch {
      setBook(null)
      setError("Faylni o'qib bo'lmadi. .xlsx, .xls yoki .csv fayl tanlang.")
    } finally {
      setLoading(false)
    }
  }

  const toggleCol = (col: number) => {
    setCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col].sort((a, b) => a - b),
    )
    setExcluded(new Set())
  }

  const toggleName = (i: number) => {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label="Excel fayldan yuklash">
        <h3>O'quvchilar ro'yxatini Excel fayldan yuklash</h3>

        <label className="file-pick">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => openFile(e.target.files?.[0])}
          />
        </label>
        <p className="muted">Fayl internetga yuborilmaydi, shu kompyuterning o'zida o'qiladi.</p>
        {loading && <p className="muted">O'qilmoqda…</p>}
        {error && <p className="error">{error}</p>}

        {book && (
          <>
            {book.sheets.length > 1 && (
              <label className="field">
                <span>Varaq</span>
                <select value={sheetIdx} onChange={(e) => selectSheet(book, Number(e.target.value))}>
                  {book.sheets.map((s, i) => (
                    <option key={i} value={i}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="field">
              <span>Ism-familiya ustuni (bir nechta bo'lsa, hammasini belgilang)</span>
              <div className="col-list">
                {Array.from({ length: columnCount(rows) }, (_, col) => (
                  <label key={col} className="check">
                    <input type="checkbox" checked={cols.includes(col)} onChange={() => toggleCol(col)} />
                    <b>{columnLabel(col)}</b>
                    <span className="muted">{sampleOf(rows, col) || '—'}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <span>
                {fileLabel}: {names.length} ta ism topildi, {selected.length} tasi tanlangan
              </span>
              {names.length === 0 ? (
                <p className="error">Bu ustunda ism topilmadi. Boshqa ustunni tanlang.</p>
              ) : (
                <ol className="name-list">
                  {names.map((name, i) => (
                    <li key={i}>
                      <label className="check">
                        <input type="checkbox" checked={!excluded.has(i)} onChange={() => toggleName(i)} />
                        <span>{name}</span>
                        {duplicates.has(i) && <span className="badge">takror</span>}
                      </label>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {duplicates.size > 0 && (
              <p className="warn">
                {duplicates.size} ta ism takrorlanmoqda. Kerak bo'lmasa, belgini olib tashlang.
              </p>
            )}

            {existingNames.length > 0 && (
              <div className="field">
                <label className="check">
                  <input type="radio" checked={mode === 'append'} onChange={() => setMode('append')} />
                  <span>Mavjud ro'yxat oxiriga qo'shish</span>
                </label>
                <label className="check">
                  <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                  <span>Mavjud ro'yxatni almashtirish (kiritilgan ballar o'chadi)</span>
                </label>
              </div>
            )}
          </>
        )}

        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Bekor qilish
          </button>
          <button
            type="button"
            className="primary"
            disabled={selected.length === 0}
            onClick={() => onImport(selected, mode)}
          >
            {selected.length > 0 ? `${selected.length} ta o'quvchini qo'shish` : "Qo'shish"}
          </button>
        </div>
      </div>
    </div>
  )
}
