import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Tasks({ session }) {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [deadline, setDeadline] = useState('')
  const [filter, setFilter] = useState('open') // open | done | all
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('todos')
      .select('*')
      .order('done', { ascending: true })
      .order('deadline', { ascending: true, nullsFirst: false })
    setTodos(data || [])
    setLoading(false)
  }

  async function addTask(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    const { data } = await supabase
      .from('todos')
      .insert({
        username: session.username,
        employee_name: session.full_name,
        task: text.trim(),
        deadline: deadline || null,
        done: false,
      })
      .select()
      .maybeSingle()
    setSaving(false)
    if (data) setTodos((t) => [...t, data])
    setText('')
    setDeadline('')
  }

  async function toggleDone(t) {
    const { data } = await supabase
      .from('todos')
      .update({ done: !t.done })
      .eq('id', t.id)
      .select()
      .maybeSingle()
    if (data) setTodos((list) => list.map((x) => (x.id === data.id ? data : x)))
  }

  async function removeTask(id) {
    if (!confirm('Delete this task?')) return
    await supabase.from('todos').delete().eq('id', id)
    setTodos((t) => t.filter((x) => x.id !== id))
  }

  function isOverdue(t) {
    return t.deadline && !t.done && t.deadline < new Date().toISOString().slice(0, 10)
  }

  const visible = todos.filter((t) => filter === 'all' || (filter === 'open' && !t.done) || (filter === 'done' && t.done))

  return (
    <div>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Tasks</h2>
          <p style={s.sub}>Assign work with a deadline</p>
        </div>
        <div style={s.filterRow}>
          {['open', 'done', 'all'].map((f) => (
            <button key={f} style={filter === f ? s.filterActive : s.filterBtn} onClick={() => setFilter(f)}>
              {f === 'open' ? 'Open' : f === 'done' ? 'Done' : 'All'}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={addTask} style={s.form}>
        <input
          style={{ ...s.input, flex: 1 }}
          placeholder="New task…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <input
          style={s.input}
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
        <button style={s.addBtn} type="submit" disabled={saving}>Add task</button>
      </form>

      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : visible.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)' }}>Nothing here.</p>
      ) : (
        <div style={s.list}>
          {visible.map((t) => (
            <div key={t.id} style={s.item}>
              <input type="checkbox" checked={t.done} onChange={() => toggleDone(t)} style={s.checkbox} />
              <div style={{ flex: 1 }}>
                <div style={{ ...s.taskText, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--ink-soft)' : 'var(--ink)' }}>
                  {t.task}
                </div>
                <div style={s.metaRow}>
                  <span>{t.employee_name}</span>
                  {t.deadline && (
                    <span style={{ color: isOverdue(t) ? 'var(--red)' : 'var(--ink-soft)', fontWeight: isOverdue(t) ? 700 : 400 }}>
                      Due {t.deadline}{isOverdue(t) ? ' · overdue' : ''}
                    </span>
                  )}
                </div>
              </div>
              <button style={s.deleteBtn} onClick={() => removeTask(t.id)}>×</button>
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
  filterRow: { display: 'flex', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' },
  filterBtn: { padding: '7px 14px', border: 'none', background: 'var(--paper)', cursor: 'pointer', fontSize: 13, color: 'var(--ink-soft)' },
  filterActive: { padding: '7px 14px', border: 'none', background: 'var(--navy)', color: 'var(--cream)', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  form: { display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' },
  input: { border: '1px solid var(--line)', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'var(--font-body)' },
  addBtn: { background: 'var(--gold)', color: 'var(--navy)', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  item: { display: 'flex', alignItems: 'flex-start', gap: 12, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px' },
  checkbox: { marginTop: 3, width: 16, height: 16, cursor: 'pointer' },
  taskText: { fontSize: 14 },
  metaRow: { display: 'flex', gap: 12, fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 },
  deleteBtn: { background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: 18, cursor: 'pointer', lineHeight: 1 },
}
