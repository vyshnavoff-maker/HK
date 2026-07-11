import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const REGISTRY_KEY = 'clients'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function DailyReport() {
  const [date, setDate] = useState(today())
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [date])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('registry').select('value').eq('key', REGISTRY_KEY).maybeSingle()
    const clients = data?.value || []

    const flat = []
    for (const c of clients) {
      for (const n of c.log || []) {
        const noteDate = new Date(n.at).toISOString().slice(0, 10)
        if (noteDate === date) {
          flat.push({ ...n, clientName: c.name || 'Untitled', fileRef: c.fileRef })
        }
      }
    }
    flat.sort((a, b) => new Date(b.at) - new Date(a.at))
    setEntries(flat)
    setLoading(false)
  }

  // Group by employee
  const byEmployee = {}
  for (const e of entries) {
    const key = e.by || 'Unknown'
    if (!byEmployee[key]) byEmployee[key] = []
    byEmployee[key].push(e)
  }

  function fmtTime(t) {
    return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Daily Report</h2>
          <p style={s.sub}>Every task/note logged against a client on this day</p>
        </div>
        <input type="date" style={s.dateInput} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : entries.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)' }}>No notes were logged on {date}.</p>
      ) : (
        <div>
          <p style={s.count}>{entries.length} note{entries.length === 1 ? '' : 's'} · {Object.keys(byEmployee).length} employee{Object.keys(byEmployee).length === 1 ? '' : 's'}</p>
          {Object.entries(byEmployee).map(([employee, items]) => (
            <div key={employee} style={s.group}>
              <div style={s.groupHeader}>{employee} <span style={s.groupCount}>{items.length}</span></div>
              {items.map((n, i) => (
                <div key={i} style={s.item}>
                  <div style={s.itemTop}>
                    <span style={s.clientTag}>{n.clientName}{n.fileRef ? ` · ${n.fileRef}` : ''}</span>
                    <span style={s.time}>{fmtTime(n.at)}</span>
                  </div>
                  <div style={s.text}>{n.text}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 10 },
  title: { fontFamily: 'var(--font-display)', color: 'var(--navy)', margin: 0 },
  sub: { color: 'var(--ink-soft)', fontSize: 13, margin: '4px 0 0' },
  dateInput: { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 14 },
  count: { fontSize: 13, color: 'var(--ink-soft)', marginBottom: 20 },
  group: { marginBottom: 24 },
  groupHeader: { fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 },
  groupCount: { fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)', background: 'rgba(0,0,0,0.05)', borderRadius: 999, padding: '1px 8px' },
  item: { background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 14px', marginBottom: 8 },
  itemTop: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
  clientTag: { fontSize: 12, fontWeight: 600, color: 'var(--navy)' },
  time: { fontSize: 11, color: 'var(--ink-soft)' },
  text: { fontSize: 13.5 },
}
