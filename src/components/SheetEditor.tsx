import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { formatNumber, formatPercent, percent, scoreOf, summarize } from '../lib/calc'
import { newStudent, uid } from '../lib/storage'
import { autoTitle, sheetTitle } from '../lib/title'
import type { Kind, Sheet } from '../lib/types'
import { ImportDialog, type ImportMode } from './ImportDialog'
import { NumField } from './NumField'

interface Props {
  sheet: Sheet
  onChange: (sheet: Sheet) => void
  onBack: () => void
}

export function SheetEditor({ sheet, onChange, onBack }: Props) {
  const summary = useMemo(() => summarize(sheet), [sheet])
  const [importing, setImporting] = useState(false)
  const [newName, setNewName] = useState('')
  const nameInput = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const { tasks, students } = sheet
  const set = (patch: Partial<Sheet>) => onChange({ ...sheet, ...patch })
  const title = sheetTitle(sheet)
  const overMax = students.some((st) => tasks.some((t) => (scoreOf(st, t.id) ?? 0) > t.max))

  const addTask = () => set({ tasks: [...tasks, { id: uid(), max: 10 }] })

  const removeTask = (id: string) => {
    const index = tasks.findIndex((t) => t.id === id)
    const used = students.some((st) => scoreOf(st, id) != null)
    if (used && !confirm(`${index + 1}-topshiriq va unga kiritilgan ballar o'chirilsinmi?`)) return
    set({
      tasks: tasks.filter((t) => t.id !== id),
      students: students.map((st) => {
        const { [id]: _removed, ...scores } = st.scores
        return { ...st, scores }
      }),
    })
  }

  const setScore = (studentId: string, taskId: string, value: number | null) =>
    set({
      students: students.map((st) =>
        st.id === studentId ? { ...st, scores: { ...st.scores, [taskId]: value } } : st,
      ),
    })

  const addStudent = () => {
    const name = newName.replace(/\s+/g, ' ').trim()
    if (!name) return
    set({ students: [...students, newStudent(name)] })
    setNewName('')
  }

  const removeStudent = (id: string) => {
    const st = students.find((s) => s.id === id)
    if (!st) return
    const hasScores = Object.values(st.scores).some((v) => v != null)
    if (hasScores && !confirm(`${st.name || "O'quvchi"} va uning ballari o'chirilsinmi?`)) return
    set({ students: students.filter((s) => s.id !== id) })
  }

  const importNames = (names: string[], mode: ImportMode) => {
    const added = names.map(newStudent)
    set({ students: mode === 'replace' ? added : [...students, ...added] })
    setImporting(false)
  }

  const exportExcel = async () => {
    setExporting(true)
    setExportError(null)
    try {
      const { downloadExcel } = await import('../lib/exportExcel')
      await downloadExcel(sheet)
    } catch {
      setExportError("Excel faylni tayyorlab bo'lmadi. Qayta urinib ko'ring.")
    } finally {
      setExporting(false)
    }
  }

  // Enter / pastga / tepaga: shu ustunning qo'shni qatoridagi katakka o'tish
  const onGridKeyDown = (e: KeyboardEvent<HTMLTableElement>) => {
    const step = e.key === 'Enter' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    const { r, c } = (e.target as HTMLElement).dataset
    if (!step || r == null || c == null) return
    const next = e.currentTarget.querySelector<HTMLInputElement>(
      `input[data-r="${Number(r) + step}"][data-c="${c}"]`,
    )
    if (next) {
      e.preventDefault()
      next.focus()
    }
  }

  return (
    <div className="editor">
      <div className="toolbar no-print">
        <button type="button" onClick={onBack}>
          ← Jadvallar ro'yxati
        </button>
        <div className="spacer" />
        <button type="button" onClick={() => window.print()} disabled={students.length === 0}>
          Chop etish
        </button>
        <button
          type="button"
          className="primary"
          onClick={exportExcel}
          disabled={students.length === 0 || exporting}
        >
          {exporting ? 'Tayyorlanmoqda…' : "Excel'ga yuklab olish"}
        </button>
      </div>
      {exportError && <p className="error no-print">{exportError}</p>}

      <section className="card no-print">
        <h3>Umumiy ma'lumot</h3>
        <div className="form-grid">
          <label className="field">
            <span>Tuman / shahar</span>
            <input
              value={sheet.district}
              placeholder="Boyovut tumani"
              onChange={(e) => set({ district: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Maktab</span>
            <input
              value={sheet.school}
              placeholder="50-maktab"
              onChange={(e) => set({ school: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Sinf</span>
            <input value={sheet.grade} placeholder="9-A" onChange={(e) => set({ grade: e.target.value })} />
          </label>
          <label className="field">
            <span>Fan</span>
            <input
              value={sheet.subject}
              placeholder="Informatika va AT"
              onChange={(e) => set({ subject: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Chorak</span>
            <select value={sheet.quarter} onChange={(e) => set({ quarter: Number(e.target.value) })}>
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={q}>
                  {q}-chorak
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Nazorat turi</span>
            <select value={sheet.kind} onChange={(e) => set({ kind: e.target.value as Kind })}>
              <option value="BSB">BSB</option>
              <option value="ChSB">ChSB</option>
            </select>
          </label>
          {sheet.kind === 'BSB' && (
            <label className="field">
              <span>BSB raqami</span>
              <NumField
                value={sheet.number}
                min={1}
                max={20}
                allowEmpty={false}
                onCommit={(v) => v != null && set({ number: Math.round(v) })}
              />
            </label>
          )}
        </div>
        <label className="field">
          <span>
            Sarlavha
            {sheet.customTitle != null && (
              <button type="button" className="link" onClick={() => set({ customTitle: null })}>
                avtomatik sarlavhaga qaytarish
              </button>
            )}
          </span>
          <textarea
            rows={2}
            value={title}
            onChange={(e) => {
              const text = e.target.value
              set({ customTitle: text.trim() === '' || text === autoTitle(sheet) ? null : text })
            }}
          />
        </label>
      </section>

      <section className="card no-print">
        <h3>Topshiriqlar</h3>
        <div className="tasks">
          {tasks.map((t, i) => (
            <div key={t.id} className="task">
              <span>{i + 1}-topshiriq</span>
              <NumField
                aria-label={`${i + 1}-topshiriq maksimal bali`}
                value={t.max}
                min={1}
                max={1000}
                allowEmpty={false}
                onCommit={(v) =>
                  v != null && set({ tasks: tasks.map((x) => (x.id === t.id ? { ...x, max: v } : x)) })
                }
              />
              <span className="muted">ball</span>
              {tasks.length > 1 && (
                <button
                  type="button"
                  className="icon"
                  title="Topshiriqni o'chirish"
                  onClick={() => removeTask(t.id)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addTask}>
            + Topshiriq qo'shish
          </button>
        </div>
        <p>
          Jami: <b>{formatNumber(summary.maxTotal, 2, true)} ball</b>
        </p>
        <label className="check">
          <input
            type="checkbox"
            checked={sheet.showTaskPercent}
            onChange={(e) => set({ showTaskPercent: e.target.checked })}
          />
          <span>
            Har bir o'quvchining har bir topshiriqdagi foizini ko'rsatish (faqat saytda, Excel faylga
            chiqmaydi)
          </span>
        </label>
      </section>

      <section className="card no-print">
        <h3>O'quvchi qo'shish</h3>
        <form
          className="add-row"
          onSubmit={(e) => {
            e.preventDefault()
            addStudent()
            nameInput.current?.focus()
          }}
        >
          <input
            ref={nameInput}
            value={newName}
            placeholder="Familiya Ism"
            aria-label="Yangi o'quvchi ism-familiyasi"
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit" className="primary">
            + O'quvchi qo'shish
          </button>
          <button type="button" onClick={() => setImporting(true)}>
            Excel fayldan yuklash
          </button>
        </form>
        <p className="muted">
          Ismni yozib Enter bosing — o'quvchi jadval oxiriga qo'shiladi. Jami: {students.length} nafar.
        </p>
      </section>

      <section className="card sheet-print">
        <h2 className="sheet-title">{title}</h2>
        {overMax && (
          <p className="warn no-print">
            Qizil kataklardagi ball topshiriqning maksimal balidan katta. Ularni tuzating.
          </p>
        )}
        <div className="table-wrap">
          <table className="grid" onKeyDown={onGridKeyDown}>
            <thead>
              <tr>
                <th className="col-num">№</th>
                <th className="col-name">O'quvchining F.I.O.</th>
                {tasks.map((t, i) => (
                  <th key={t.id}>
                    {i + 1}-topshiriq
                    <br />({formatNumber(t.max, 2, true)} ball)
                  </th>
                ))}
                <th>
                  Jami
                  <br />({formatNumber(summary.maxTotal, 2, true)} ball)
                </th>
                <th className="col-pct">Foiz</th>
                <th className="col-del no-print" />
              </tr>
            </thead>
            <tbody>
              {students.length === 0 && (
                <tr className="no-print">
                  <td colSpan={tasks.length + 5} className="empty">
                    O'quvchilar hali kiritilmagan. Yuqorida ismni yozing yoki Excel fayldan yuklang.
                  </td>
                </tr>
              )}
              {students.map((st, r) => (
                <tr key={st.id}>
                  <td className="col-num">{r + 1}</td>
                  <td className="col-name">
                    <input
                      aria-label={`${r + 1}-o'quvchi ism-familiyasi`}
                      value={st.name}
                      onChange={(e) =>
                        set({
                          students: students.map((s) =>
                            s.id === st.id ? { ...s, name: e.target.value } : s,
                          ),
                        })
                      }
                    />
                  </td>
                  {tasks.map((t, c) => {
                    const score = scoreOf(st, t.id)
                    return (
                      <td key={t.id} className="col-score">
                        <NumField
                          aria-label={`${st.name}, ${c + 1}-topshiriq`}
                          data-r={r}
                          data-c={c}
                          value={score}
                          max={t.max}
                          onCommit={(v) => setScore(st.id, t.id, v)}
                        />
                        {sheet.showTaskPercent && (
                          <span className="cell-pct">{formatPercent(percent(score, t.max))}</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="col-total">{formatNumber(summary.rows[r].total, 2, true)}</td>
                  <td className="col-pct">{formatPercent(summary.rows[r].percent)}</td>
                  <td className="col-del no-print">
                    <button
                      type="button"
                      className="icon"
                      title="O'quvchini o'chirish"
                      onClick={() => removeStudent(st.id)}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {students.length > 0 && (
              <tfoot>
                <tr>
                  <td />
                  <td className="col-name">O'rtacha ball</td>
                  {summary.taskAvg.map((avg, i) => (
                    <td key={tasks[i].id}>{formatNumber(avg, 2)}</td>
                  ))}
                  <td>{formatNumber(summary.avgTotal, 2)}</td>
                  <td className="col-pct">{formatPercent(summary.avgPercent)}</td>
                  <td className="col-del no-print" />
                </tr>
                <tr>
                  <td />
                  <td className="col-name">O'rtacha foiz</td>
                  {summary.taskAvgPercent.map((p, i) => (
                    <td key={tasks[i].id}>{formatPercent(p)}</td>
                  ))}
                  <td>{formatPercent(summary.avgPercent)}</td>
                  <td className="col-pct" />
                  <td className="col-del no-print" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {importing && (
        <ImportDialog
          existingNames={students.map((s) => s.name)}
          onImport={importNames}
          onClose={() => setImporting(false)}
        />
      )}
    </div>
  )
}
