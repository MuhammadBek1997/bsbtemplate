import { formatPercent } from '../lib/calc'
import { sheetTitle } from '../lib/title'
import type { SheetCard } from '../lib/types'

interface Props {
  sheets: SheetCard[]
  loading: boolean
  onOpen: (id: string) => void
  onCreate: () => void
  onClone: (id: string) => void
  onDelete: (id: string) => void
}

export function SheetList({ sheets, loading, onOpen, onCreate, onClone, onDelete }: Props) {
  const sorted = [...sheets].sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <div className="list">
      <div className="toolbar">
        <h1>BSB va ChSB monitoring jadvallari</h1>
        <div className="spacer" />
        <button type="button" className="primary" onClick={onCreate}>
          + Yangi jadval
        </button>
      </div>

      {loading ? (
        <p className="muted">Yuklanmoqda…</p>
      ) : sorted.length === 0 ? (
        <div className="card empty">
          <p>Hali jadval yo'q. Boshlash uchun “Yangi jadval” tugmasini bosing.</p>
        </div>
      ) : (
        sorted.map((sheet) => {
          const avg = sheet.avgPercent
          return (
            <div key={sheet.id} className="card list-item">
              <div className="list-main">
                <button type="button" className="link title" onClick={() => onOpen(sheet.id)}>
                  {sheetTitle(sheet)}
                </button>
                <p className="muted">
                  {sheet.studentCount} nafar o'quvchi
                  {avg != null && ` · o'rtacha ${formatPercent(avg)}`} ·{' '}
                  {new Date(sheet.updatedAt).toLocaleDateString('uz-UZ')}
                </p>
              </div>
              <button type="button" onClick={() => onOpen(sheet.id)}>
                Ochish
              </button>
              <button
                type="button"
                title="Shu sinf ro'yxati bilan, ballarsiz yangi jadval"
                onClick={() => onClone(sheet.id)}
              >
                Keyingi nazorat uchun nusxa
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  if (confirm(`“${sheetTitle(sheet)}” jadvali o'chirilsinmi?`)) onDelete(sheet.id)
                }}
              >
                O'chirish
              </button>
            </div>
          )
        })
      )}
      <p className="muted">
        Jadvallar serverdagi bazada saqlanadi. Excel nusxasi uchun jadvalni ochib, yuklab oling.
      </p>
    </div>
  )
}
