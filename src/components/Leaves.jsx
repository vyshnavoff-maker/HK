import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const MONTHLY_LIMIT = 3

function monthBounds(yyyyMm) {
  const [y, m] = yyyyMm.split('-').map(Number)
  const start = `${yyyyMm}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${yyyyMm}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7) // YYYY-MM
}

export default function Leaves({ session }) {
  const [month, setMonth] = useState(currentMonth())
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { load() }, [month])

  async function load() {
    setLoading(true)
    const { start, end } = monthBounds(month)
    const { data } = await supabase
      .from('leaves')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
    setLeaves(data || [])
    setLoading(false)
  }

  const myLeavesThisMonth = leaves.filter((l) => l.username === session.username)
  const remaining = MONTHLY_LIMIT - myLeavesThisMonth.length
  const dateIsInViewedMonth = date.slice(0, 7) === month

  async function requestLeave(e) {
    e.preventDefault()
    setError('')

    const leaveMonth = date.slice(0, 7)
    // Always check against the ACTUAL month of the selected date, not just the viewed month
    const { start, end } = monthBounds(leaveMonth)
    const { data: existing, error: qErr } = await supabase
      .from('leaves')
      .select('id')
      .eq('username', session.username)
      .gte('date', start)
      .lte('date', end)

    if (qErr) {
      setError('Could not check your leave balance: ' + qErr.message)
      return
    }
    if ((existing || []).length >= MONTHLY_LIMIT) {
      setError(`You've already used all ${MONTHLY_LIMIT} leaves for ${leaveMonth}.`)
      return
    }
    if (leaves.some((l) => l.username === session.username && l.date === date)) {
      setError('You already have a leave logged for that date.')
      return
    }

    setSubmitting(true)
    const { data: inserted, error: insErr } = await supabase
      .from('leaves')
      .insert({
        username: session.username,
        employee_name: session.full_name,
        date,
        reason: reason.trim() || null,
      })
      .select()
      .maybeSingle()
    setSubmitting(false)

    if (insErr) {
      setError('Could not save leave: ' + insErr.message)
      return
    }
    if (inserted && dateIsInViewedMonth) setLeaves((l) => [inserted, ...l])
    setReason('')
  }

  async function cancelLeave(id) {
    if (!confirm('Cancel this leave?')) return
    await supabase.from('leaves').delete().eq('id', id)
    setLeaves((l) => l.filter((x) => x.id !== id))
  }

  return (
    <div>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Leaves</h2>
          <p style={s.sub}>{MONTHLY_LIMIT} leaves allowed per month</p>
        </div>
        <input
          type="month"
          style={s.monthInput}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </div>

      <div style={s.balanceCard}>
        <div>
          <div style={s.balanceLabel}>Your balance — {month}</div>
          <div style={s.balanceNum}>
            {Math.max(remaining, 0)} of {MONTHLY_LIMIT} remaining
          </div>
        </div>
        <div style={s.dots}>
          {Array.from({ length: MONTHLY_LIMIT }).map((_, i) => (
            <span key={i} style={i < myLeavesThisMonth.length ? s.dotUsed : s.dotFree} />
          ))}
        </div>
      </div>

      <form onSubmit={requestLeave} style={s.form}>
        <label style={s.label}>
          Date
          <input style={s.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label style={{ ...s.label, flex: 1 }}>
          Reason (optional)
          <input style={s.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. personal, sick" />
        </label>
        <button style={s.submitBtn} type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Request leave'}
        </button>
      </form>
      {error && <div style={s.error}>{error}</div>}

      <h3 style={s.tableHeading}>All leaves — {month}</h3>
      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : leaves.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)' }}>No leaves logged this month.</p>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Employee</th>
              <th style={s.th}>Date</th>
              <th style={s.th}>Reason</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((l) => (
              <tr key={l.id}>
                <td style={s.td}>{l.employee_name}</td>
                <td style={s.td}>{l.date}</td>
                <td style={s.td}>{l.reason || '—'}</td>
                <td style={s.td}>
                  {l.username === session.username && (
                    <button style={s.cancelBtn} onClick={() => cancelLeave(l.id)}>Cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 10 },
  title: { fontFamily: 'var(--font-display)', color: 'var(--navy)', margin: 0 },
  sub: { color: 'var(--ink-soft)', fontSize: 13, margin: '4px 0 0' },
  monthInput: { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 14 },
  balanceCard: {
    background: 'var(--navy)', color: 'var(--cream)', borderRadius: 12, padding: '18px 22px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12,
  },
  balanceLabel: { fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceNum: { fontSize: 18, fontWeight: 700, marginTop: 4 },
  dots: { display: 'flex', gap: 8 },
  dotUsed: { width: 14, height: 14, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block' },
  dotFree: { width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', display: 'inline-block' },
  form: { display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 8 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 5, minWidth: 160 },
  input: { border: '1px solid var(--line)', borderRadius: 7, padding: '8px 10px', fontSize: 14, fontFamily: 'var(--font-body)' },
  submitBtn: { background: 'var(--navy)', color: 'var(--cream)', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  error: { color: 'var(--red)', fontSize: 13, marginBottom: 16 },
  tableHeading: { fontSize: 14, color: 'var(--ink-soft)', fontWeight: 600, marginBottom: 10, marginTop: 22 },
  table: { width: '100%', borderCollapse: 'collapse', background: 'var(--paper)', borderRadius: 10, overflow: 'hidden' },
  th: { textAlign: 'left', fontSize: 12, color: 'var(--ink-soft)', padding: '10px 12px', borderBottom: '1px solid var(--line)' },
  td: { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--line)' },
  cancelBtn: { background: 'none', border: '1px solid var(--line)', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' },
}
