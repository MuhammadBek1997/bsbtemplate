import { useEffect, useRef, useState } from 'react'
import { SheetEditor } from './components/SheetEditor'
import { SheetList } from './components/SheetList'
import { cloneSheet, createSheet, deleteSheet, getSheet, listSheets, putSheet, readToken } from './lib/api'
import type { Account, Sheet, SheetCard } from './lib/types'

interface Props {
  account: Account
  onLogout: () => void
}

export function App({ account, onLogout }: Props) {
  const [sheets, setSheets] = useState<SheetCard[]>([])
  const [active, setActive] = useState<Sheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef<Sheet | null>(null)
  const timer = useRef<number | null>(null)

  const fail = (err: unknown) => setError(err instanceof Error ? err.message : "So'rov bajarilmadi.")

  const refresh = () => listSheets().then(setSheets)

  const flush = async () => {
    if (timer.current != null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    const sheet = pending.current
    pending.current = null
    if (sheet) await putSheet(sheet)
  }

  useEffect(() => {
    refresh()
      .catch(fail)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onLeave = () => {
      const sheet = pending.current
      if (!sheet) return
      void fetch(`/api/sheets/${sheet.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(readToken() ? { Authorization: `Bearer ${readToken()}` } : {}),
        },
        body: JSON.stringify(sheet),
        keepalive: true,
      })
    }
    window.addEventListener('pagehide', onLeave)
    return () => window.removeEventListener('pagehide', onLeave)
  }, [])

  const onChange = (next: Sheet) => {
    setActive(next)
    pending.current = next
    if (timer.current != null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const sheet = pending.current
      pending.current = null
      timer.current = null
      if (!sheet) return
      void putSheet(sheet).catch(fail)
    }, 400)
  }

  return (
    <main>
      {error && <p className="error no-print">{error}</p>}
      {active ? (
        <SheetEditor
          sheet={active}
          onBack={() => {
            void flush()
              .then(refresh)
              .catch(fail)
              .finally(() => setActive(null))
          }}
          onChange={onChange}
        />
      ) : (
        <SheetList
          accountName={account.name}
          onLogout={onLogout}
          sheets={sheets}
          loading={loading}
          failed={error != null}
          onOpen={(id) => {
            void getSheet(id).then(setActive).catch(fail)
          }}
          onCreate={() => {
            void createSheet()
              .then(async (sheet) => {
                setActive(sheet)
                await refresh()
              })
              .catch(fail)
          }}
          onClone={(id) => {
            void cloneSheet(id)
              .then(async (sheet) => {
                setActive(sheet)
                await refresh()
              })
              .catch(fail)
          }}
          onDelete={(id) => {
            void deleteSheet(id)
              .then(refresh)
              .catch(fail)
          }}
        />
      )}
    </main>
  )
}
