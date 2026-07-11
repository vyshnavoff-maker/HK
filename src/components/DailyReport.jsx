import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { todayLocal } from '../dateUtils'

function today() {
  return todayLocal()
}

export default function DailyReport({ session }) {
  const [date, setDate] = useState(today())
  const [allReports, setAllReports] = useState([])
  const [myText, setMyText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)

  useEffect(() => { load() }, [date])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('date', date)
      .order('employee_name', { ascending: true })
    setAllReports(data || [])
    const mine = (data || []).find((r) => r.username === session.username)
    setMyText(mine?.report || '')
    setSavedAt(mine?.updated_at || null)
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    const { data, error } = await supabase
      .from('daily_reports')
      .upsert(
        {
          username: session.username,
          employee_name: session.full_name,
          date,
          report: myText,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'username,date' }
      )
      .select()
      .maybeSingle()
    setSaving(false)
    if (error) {
      alert('Could not save: ' + error.message)
      return
    }
    setSavedAt(data?.updated_at || new Date().toISOString())
    setAllReports((prev) => {
      const exists = prev.some((r) => r.username === session.username)
      return exists ? prev.map((r) => (r.username === session.username ? data : r)) : [...prev, data]
    })
  }

  const others = allReports.filter((r) => r.username !== session.username && (r.report || '').trim())

  return (
    <div>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Daily Report</h2>
          <p style={s.sub}>Write out everything you worked on today</p>
        </div>
        <input type="date" style={s.dateInput} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : (
        <>
          <textarea
            style={s.textarea}
            placeholder={`What did you work on for ${date}?\n\n- \n- \n- `}
            value={myText}
            onChange={(e) => setMyText(e.target.value)}
          />
          <div style={s.saveRow}>
            <button style={s.saveBtn} onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save report'}
            </button>
            {savedAt && (
              <span style={s.savedNote}>Saved {new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>

          {others.length > 0 && (
            <>
              <h3 style={s.tableHeading}>Team reports — {date}</h3>
              <div style={s.othersGrid}>
                {others.map((r) => (
                  <div key={r.username} style={s.otherCard}>
                    <div style={s.otherName}>{r.employee_name}</div>
                    <div style={s.otherText}>{r.report}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 10 },
  title: { fontFamily: 'var(--font-display)', color: 'var(--navy)', margin: 0 },
  sub: { color: 'var(--ink-soft)', fontSize: 13, margin: '4px 0 0' },
  dateInput: { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 14 },
  textarea: {
    width: '100%', minHeight: 360, border: '1px solid var(--line)', borderRadius: 10,
    padding: 16, fontSize: 15, fontFamily: 'var(--font-body)', lineHeight: 1.6,
    resize: 'vertical', background: 'var(--paper)',
  },
  saveRow: { display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, marginBottom: 30 },
  saveBtn: { background: 'var(--navy)', color: 'var(--cream)', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  savedNote: { fontSize: 12, color: 'var(--ink-soft)' },
  tableHeading: { fontSize: 14, color: 'var(--ink-soft)', fontWeight: 600, marginBottom: 12 },
  othersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 },
  otherCard: { background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 },
  otherName: { fontWeight: 700, fontSize: 14, color: 'var(--navy)', marginBottom: 8 },
  otherText: { fontSize: 13, whiteSpace: 'pre-wrap', color: 'var(--ink)', lineHeight: 1.5 },
}
