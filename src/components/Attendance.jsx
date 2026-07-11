import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function Attendance({ session }) {
  const [date, setDate] = useState(today())
  const [rows, setRows] = useState([])
  const [myRow, setMyRow] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [date])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', date)
      .order('employee_name', { ascending: true })
    setRows(data || [])
    setMyRow((data || []).find((r) => r.username === session.username) || null)
    setLoading(false)
  }

  async function checkIn() {
    const payload = {
      username: session.username,
      employee_name: session.full_name,
      date,
      check_in: new Date().toISOString(),
    }
    const { data } = await supabase.from('attendance').insert(payload).select().maybeSingle()
    if (data) {
      setMyRow(data)
      setRows((r) => [...r, data])
    }
  }

  async function checkOut() {
    if (!myRow) return
    const { data } = await supabase
      .from('attendance')
      .update({ check_out: new Date().toISOString() })
      .eq('id', myRow.id)
      .select()
      .maybeSingle()
    if (data) {
      setMyRow(data)
      setRows((r) => r.map((row) => (row.id === data.id ? data : row)))
    }
  }

  function fmt(t) {
    if (!t) return '—'
    return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Attendance</h2>
          <p style={s.sub}>Signed in as {session.full_name}</p>
        </div>
        <input type="date" style={s.dateInput} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {date === today() && (
        <div style={s.punchCard}>
          <div>
            <div style={s.punchLabel}>Today</div>
            <div style={s.punchTimes}>
              In: <strong>{fmt(myRow?.check_in)}</strong> &nbsp;·&nbsp; Out: <strong>{fmt(myRow?.check_out)}</strong>
            </div>
          </div>
          {!myRow ? (
            <button style={s.punchBtnIn} onClick={checkIn}>Check in</button>
          ) : !myRow.check_out ? (
            <button style={s.punchBtnOut} onClick={checkOut}>Check out</button>
          ) : (
            <span style={s.doneTag}>Day complete</span>
          )}
        </div>
      )}

      <h3 style={s.tableHeading}>Team — {date}</h3>
      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)' }}>No one has checked in yet.</p>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Employee</th>
              <th style={s.th}>Check in</th>
              <th style={s.th}>Check out</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={s.td}>{r.employee_name}</td>
                <td style={s.td}>{fmt(r.check_in)}</td>
                <td style={s.td}>{fmt(r.check_out)}</td>
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
  dateInput: { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 14 },
  punchCard: {
    background: 'var(--navy)', color: 'var(--cream)', borderRadius: 12, padding: '18px 22px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26, flexWrap: 'wrap', gap: 12,
  },
  punchLabel: { fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5 },
  punchTimes: { fontSize: 15, marginTop: 4 },
  punchBtnIn: { background: 'var(--gold)', color: 'var(--navy)', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  punchBtnOut: { background: 'var(--cream)', color: 'var(--navy)', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  doneTag: { fontSize: 13, opacity: 0.8 },
  tableHeading: { fontSize: 14, color: 'var(--ink-soft)', fontWeight: 600, marginBottom: 10 },
  table: { width: '100%', borderCollapse: 'collapse', background: 'var(--paper)', borderRadius: 10, overflow: 'hidden' },
  th: { textAlign: 'left', fontSize: 12, color: 'var(--ink-soft)', padding: '10px 12px', borderBottom: '1px solid var(--line)' },
  td: { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--line)' },
}
