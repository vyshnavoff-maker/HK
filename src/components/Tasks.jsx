import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function Tasks({ session }) {
  const [date, setDate] = useState(today())
  const [tasks, setTasks] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [date])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: true })
    setTasks(data || [])
    setLoading(false)
  }

  async function addTask(e) {
    e.preventDefault()
    if (!draft.trim()) return
    setSaving(true)
    const { data } = await supabase
      .from('tasks')
      .insert({
        username: session.username,
        employee_name: session.full_name,
        date,
        task: draft.trim(),
      })
      .select()
      .maybeSingle()
    setSaving(false)
    if (data) setTasks((t) => [...t, data])
    setDraft('')
  }

  async function removeTask(id) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks((t) => t.filter((x) => x.id !== id))
  }

  const mine = tasks.filter((t) => t.username === session.username)

  // Group all tasks by employee for the day's report
  const byEmployee = {}
  for (const t of tasks) {
    if (!byEmployee[t.username]) byEmployee[t.username] = { name: t.employee_name, items: [] }
    byEmployee[t.username].items.push(t)
  }

  return (
    <div>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Daily tasks</h2>
          <p style={s.sub}>What got done today, by whom</p>
        </div>
        <input type="date" style={s.dateInput} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {date === today() && (
        <form onSubmit={addTask} style={s.form}>
          <input
            style={s.input}
            placeholder="Add a task you completed today…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button style={s.addBtn} type="submit" disabled={saving}>Add</button>
        </form>
      )}

      {date === today() && mine.length > 0 && (
        <div style={s.myList}>
          {mine.map((t) => (
            <div key={t.id} style={s.myItem}>
              <span>{t.task}</span>
              <button style={s.removeBtn} onClick={() => removeTask(t.id)}>×</button>
            </div>
          ))}
        </div>
      )}

      <h3 style={s.tableHeading}>Team report — {date}</h3>
      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : Object.keys(byEmployee).length === 0 ? (
        <p style={{ color: 'var(--ink-soft)' }}>No tasks logged for this day.</p>
      ) : (
        <div style={s.report}>
          {Object.values(byEmployee).map((emp) => (
            <div key={emp.name} style={s.reportCard}>
              <div style={s.reportName}>{emp.name}</div>
              <ul style={s.reportList}>
                {emp.items.map((t) => <li key={t.id}>{t.task}</li>)}
              </ul>
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
  form: { display: 'flex', gap: 10, marginBottom: 14 },
  input: { flex: 1, border: '1px solid var(--line)', borderRadius: 8, padding: '9px 12px', fontSize: 14 },
  addBtn: { background: 'var(--gold)', color: 'var(--navy)', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  myList: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 26 },
  myItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 7, padding: '8px 12px', fontSize: 13 },
  removeBtn: { background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: 16, cursor: 'pointer', lineHeight: 1 },
  tableHeading: { fontSize: 14, color: 'var(--ink-soft)', fontWeight: 600, marginBottom: 12 },
  report: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 },
  reportCard: { background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 },
  reportName: { fontWeight: 700, fontSize: 14, color: 'var(--navy)', marginBottom: 8 },
  reportList: { margin: 0, paddingLeft: 18, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 5 },
}
