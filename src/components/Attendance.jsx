import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { todayLocal } from '../dateUtils'

function today() {
  return todayLocal()
}

export default function Attendance({ session }) {
  const [date, setDate] = useState(today())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [closingId, setClosingId] = useState(null)
  const [closeTime, setCloseTime] = useState('')

  const isAdmin = session.role === 'admin'

  useEffect(() => { load() }, [date])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', date)
      .order('check_in', { ascending: true })
    setRows(data || [])
    setLoading(false)
  }

  // My sessions today, and whether I currently have one open (checked in, not out)
  const mySessions = rows.filter((r) => r.username === session.username)
  const openSession = mySessions.find((r) => !r.check_out)
  const MAX_SESSIONS = 3
  const atLimit = mySessions.length >= MAX_SESSIONS && !openSession

  async function checkIn() {
    if (atLimit) return
    const payload = {
      username: session.username,
      employee_name: session.full_name,
      date,
      check_in: new Date().toISOString(),
    }
    const { data } = await supabase.from('attendance').insert(payload).select().maybeSingle()
    if (data) setRows((r) => [...r, data])
  }

  async function checkOut() {
    if (!openSession) return
    const { data } = await supabase
      .from('attendance')
      .update({ check_out: new Date().toISOString() })
      .eq('id', openSession.id)
      .select()
      .maybeSingle()
    if (data) setRows((r) => r.map((row) => (row.id === data.id ? data : row)))
  }

  function fmt(t) {
    if (!t) return '—'
    return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function startClosing(row) {
    setClosingId(row.id)
    // Default to now, in HH:MM for the time input
    const now = new Date()
    setCloseTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
  }

  async function confirmClose(row) {
    if (!closeTime) return
    const [h, m] = closeTime.split(':')
    const closeDateTime = new Date(`${row.date}T${h}:${m}:00`)
    const { data } = await supabase
      .from('attendance')
      .update({ check_out: closeDateTime.toISOString() })
      .eq('id', row.id)
      .select()
      .maybeSingle()
    if (data) setRows((r) => r.map((x) => (x.id === data.id ? data : x)))
    setClosingId(null)
  }

  // Group all rows by employee for the team table
  const byEmployee = {}
  for (const r of rows) {
    if (!byEmployee[r.username]) byEmployee[r.username] = { name: r.employee_name, sessions: [] }
    byEmployee[r.username].sessions.push(r)
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
            <div style={s.punchLabel}>Today · {mySessions.length} session{mySessions.length === 1 ? '' : 's'}</div>
            <div style={s.punchTimes}>
              {mySessions.length === 0
                ? 'Not checked in yet'
                : mySessions.map((r, i) => (
                    <span key={r.id}>
                      {i > 0 && ' · '}
                      {fmt(r.check_in)}–{fmt(r.check_out)}
                    </span>
                  ))}
            </div>
          </div>
          {openSession ? (
            <button style={s.punchBtnOut} onClick={checkOut}>Check out</button>
          ) : atLimit ? (
            <span style={s.limitTag}>Limit reached (3/day)</span>
          ) : (
            <button style={s.punchBtnIn} onClick={checkIn}>Check in</button>
          )}
        </div>
      )}

      <h3 style={s.tableHeading}>Team — {date}</h3>
      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : Object.keys(byEmployee).length === 0 ? (
        <p style={{ color: 'var(--ink-soft)' }}>No one has checked in yet.</p>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Employee</th>
              <th style={s.th}>Sessions (in–out)</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(byEmployee).map((emp) => (
              <tr key={emp.name}>
                <td style={s.td}>{emp.name}</td>
                <td style={s.td}>
                  {emp.sessions.map((r, i) => (
                    <span key={r.id} style={{ ...s.sessionChip, ...(!r.check_out ? s.sessionChipOpen : {}) }}>
                      {fmt(r.check_in)}–{fmt(r.check_out)}
                      {!r.check_out && isAdmin && closingId !== r.id && (
                        <button style={s.closeLink} onClick={() => startClosing(r)}>close</button>
                      )}
                      {!r.check_out && isAdmin && closingId === r.id && (
                        <span style={s.closeForm}>
                          <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} style={s.closeInput} />
                          <button style={s.closeConfirm} onClick={() => confirmClose(r)}>✓</button>
                          <button style={s.closeCancel} onClick={() => setClosingId(null)}>✕</button>
                        </span>
                      )}
                      {i < emp.sessions.length - 1 ? '  ' : ''}
                    </span>
                  ))}
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
  dateInput: { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 14 },
  punchCard: {
    background: 'var(--navy)', color: 'var(--cream)', borderRadius: 12, padding: '18px 22px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26, flexWrap: 'wrap', gap: 12,
  },
  punchLabel: { fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5 },
  punchTimes: { fontSize: 15, marginTop: 4 },
  punchBtnIn: { background: 'var(--gold)', color: 'var(--navy)', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  punchBtnOut: { background: 'var(--cream)', color: 'var(--navy)', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  limitTag: { fontSize: 13, opacity: 0.85, fontWeight: 600 },
  tableHeading: { fontSize: 14, color: 'var(--ink-soft)', fontWeight: 600, marginBottom: 10 },
  table: { width: '100%', borderCollapse: 'collapse', background: 'var(--paper)', borderRadius: 10, overflow: 'hidden' },
  th: { textAlign: 'left', fontSize: 12, color: 'var(--ink-soft)', padding: '10px 12px', borderBottom: '1px solid var(--line)' },
  td: { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--line)' },
  sessionChip: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.04)', borderRadius: 6, padding: '3px 8px', marginRight: 6, marginBottom: 4, fontSize: 12 },
  sessionChipOpen: { background: 'rgba(179,67,43,0.1)', color: 'var(--red)', fontWeight: 600 },
  closeLink: { background: 'none', border: 'none', color: 'var(--navy)', textDecoration: 'underline', cursor: 'pointer', fontSize: 11, padding: 0 },
  closeForm: { display: 'inline-flex', alignItems: 'center', gap: 4 },
  closeInput: { border: '1px solid var(--line)', borderRadius: 5, fontSize: 11, padding: '2px 4px' },
  closeConfirm: { background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 4, width: 20, height: 20, cursor: 'pointer', fontSize: 11, lineHeight: 1 },
  closeCancel: { background: 'none', border: '1px solid var(--line)', borderRadius: 4, width: 20, height: 20, cursor: 'pointer', fontSize: 11, lineHeight: 1 },
}
