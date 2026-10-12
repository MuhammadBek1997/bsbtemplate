import { useState, type InputHTMLAttributes } from 'react'
import { formatNumber, parseScore } from '../lib/calc'

interface Props
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min' | 'max'> {
  value: number | null
  min?: number
  max?: number
  allowEmpty?: boolean
  onCommit: (value: number | null) => void
}

/** Sonli maydon: vergul yoki nuqta bilan kasr qabul qiladi, chegaradan chiqqan qiymatni saqlamaydi. */
export function NumField({
  value,
  min = 0,
  max = Infinity,
  allowEmpty = true,
  onCommit,
  className = '',
  ...rest
}: Props) {
  const [draft, setDraft] = useState<string | null>(null)

  const valid = (v: number | null | undefined) =>
    v === undefined ? false : v === null ? allowEmpty : v >= min && v <= max
  const invalid = !valid(draft != null ? parseScore(draft) : value)
  const hint = Number.isFinite(max) ? `${min} dan ${max} gacha son kiriting` : `${min} dan katta son kiriting`

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={`${className} ${invalid ? 'invalid' : ''}`}
      title={invalid ? hint : undefined}
      value={draft ?? formatNumber(value, 2, true)}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const text = e.target.value
        setDraft(text)
        const v = parseScore(text)
        if (valid(v)) onCommit(v as number | null)
        // Noto'g'ri qiymat yozilganda eski (yarim terilgan) ball saqlanib qolmasin
        else if (allowEmpty && value != null) onCommit(null)
      }}
      onBlur={() => setDraft(null)}
    />
  )
}
