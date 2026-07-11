import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const STAGES = ['Lead', 'Proposal', 'Engaged', 'Active', 'On Hold', 'Closed']
const REGISTRY_KEY = 'clients'

function emptyClient() {
  return {
    id: crypto.randomUUID(),
    fileRef: '',
    name: '',
    contact: '',
    practiceArea: '',
    stage: 'Lead',
    nextAction: '',
    dueDate: '',
    log: [],
  }
}

export default function ClientRegistry({ session }) {
  const [clients, setClients] = useState([])
  const [view, setView] = useState('board')
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('All')
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [noteDraft, setNoteDraft] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('registry').select('value').eq('key', REGISTRY_KEY).maybeSingle()
    setClients(data?.value || [])
    setLoading(false)
  }

  async function persist(next) {
    setClients(next)
    await supabase.from('registry').upsert({ key: REGISTRY_KEY, value: next, updated_at: new Date().toISOString() })
  }

  function openNew() {
    setEditing(emptyClient())
  }

  function saveEditing() {
    const exists = clients.some((c) => c.id === editing.id)
    const next = exists ? clients.map((c) => (c.id === editing.id ? editing : c)) : [...clients, editing]
    persist(next)
    setEditing(null)
  }

  function addNote() {
    if (!noteDraft.trim()) return
    const entry = { text: noteDraft.trim(), by: session.full_name, at: new Date().toISOString() }
    setEditing({ ...editing, log: [entry, ...(editing.log || [])] })
    setNoteDraft('')
  }

  function removeClient(id) {
    if (!confirm('Remove this client record?')) return
    persist(clients.filter((c) => c.id !== id))
    setEditing(null)
  }

  const filtered = clients.filter((c) => {
    const matchesSearch = !search || `${c.name} ${c.fileRef} ${c.contact}`.toLowerCase().includes(search.toLowerCase())
    const matchesStage = stageFilter === 'All' || c.stage === stageFilter
    return matchesSearch && matchesStage
  })

  function isOverdue(c) {
    return c.dueDate && new Date(c.dueDate) < new Date(new Date().toDateString()) && c.stage !== 'Closed'
  }

  return (
    <div>
      <div style={s.toolbar}>
        <input
          style={s.search}
          placeholder="Search by name, file ref, or contact…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={s.select} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          <option>All</option>
          {STAGES.map((st) => <option key={st}>{st}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <div style={s.viewToggle}>
          <button style={view === 'board' ? s.toggleActive : s.toggleBtn} onClick={() => setView('board')}>Board</button>
          <button style={view === 'list' ? s.toggleActive : s.toggleBtn} onClick={() => setView('list')}>List</button>
        </div>
        <button style={s.addBtn} onClick={openNew}>+ New client</button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : view === 'board' ? (
        <div style={s.board}>
          {STAGES.map((stage) => (
            <div key={stage} style={s.column}>
              <div style={s.columnHeader}>
                {stage} <span style={s.count}>{filtered.filter((c) => c.stage === stage).length}</span>
              </div>
              {filtered.filter((c) => c.stage === stage).map((c) => (
                <div key={c.id} style={s.card} onClick={() => setEditing(c)}>
                  <div style={s.cardTitle}>{c.name || 'Untitled'}</div>
                  <div style={s.cardMeta}>{c.fileRef}</div>
                  {c.practiceArea && <div style={s.tag}>{c.practiceArea}</div>}
                  {c.nextAction && (
                    <div style={{ ...s.next, color: isOverdue(c) ? 'var(--red)' : 'var(--ink-soft)' }}>
                      {c.nextAction} {c.dueDate ? `· ${c.dueDate}` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              {['File ref', 'Client', 'Contact', 'Practice area', 'Stage', 'Next action', 'Due'].map((h) => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} style={s.tr} onClick={() => setEditing(c)}>
                <td style={s.td}>{c.fileRef}</td>
                <td style={s.td}>{c.name}</td>
                <td style={s.td}>{c.contact}</td>
                <td style={s.td}>{c.practiceArea}</td>
                <td style={s.td}>{c.stage}</td>
                <td style={s.td}>{c.nextAction}</td>
                <td style={{ ...s.td, color: isOverdue(c) ? 'var(--red)' : 'inherit' }}>{c.dueDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <div style={s.overlay} onClick={() => setEditing(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={s.modalTitle}>{clients.some((c) => c.id === editing.id) ? 'Edit client' : 'New client'}</h2>

            <div style={s.grid}>
              <label style={s.label}>File ref
                <input style={s.input} value={editing.fileRef} onChange={(e) => setEditing({ ...editing, fileRef: e.target.value })} />
              </label>
              <label style={s.label}>Stage
                <select style={s.input} value={editing.stage} onChange={(e) => setEditing({ ...editing, stage: e.target.value })}>
                  {STAGES.map((st) => <option key={st}>{st}</option>)}
                </select>
              </label>
              <label style={{ ...s.label, gridColumn: '1 / -1' }}>Client name
                <input style={s.input} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </label>
              <label style={s.label}>Contact
                <input style={s.input} value={editing.contact} onChange={(e) => setEditing({ ...editing, contact: e.target.value })} />
              </label>
              <label style={s.label}>Practice area
                <input style={s.input} value={editing.practiceArea} onChange={(e) => setEditing({ ...editing, practiceArea: e.target.value })} />
              </label>
              <label style={s.label}>Next action
                <input style={s.input} value={editing.nextAction} onChange={(e) => setEditing({ ...editing, nextAction: e.target.value })} />
              </label>
              <label style={s.label}>Due date
                <input style={s.input} type="date" value={editing.dueDate} onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })} />
              </label>
            </div>

            <div style={s.logSection}>
              <div style={s.label}>Activity log</div>
              <div style={s.noteRow}>
                <input style={s.input} placeholder="Add a note…" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote()} />
                <button style={s.smallBtn} onClick={addNote}>Add</button>
              </div>
              <div style={s.logList}>
                {(editing.log || []).map((n, i) => (
                  <div key={i} style={s.logItem}>
                    <div>{n.text}</div>
                    <div style={s.logMeta}>{n.by} · {new Date(n.at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={s.modalActions}>
              <button style={s.deleteBtn} onClick={() => removeClient(editing.id)}>Delete</button>
              <div style={{ flex: 1 }} />
              <button style={s.cancelBtn} onClick={() => setEditing(null)}>Cancel</button>
              <button style={s.saveBtn} onClick={saveEditing}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  toolbar: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' },
  search: { flex: '1 1 240px', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 14 },
  select: { padding: '9px 10px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 14, background: 'var(--paper)' },
  viewToggle: { display: 'flex', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' },
  toggleBtn: { padding: '8px 14px', border: 'none', background: 'var(--paper)', cursor: 'pointer', fontSize: 13, color: 'var(--ink-soft)' },
  toggleActive: { padding: '8px 14px', border: 'none', background: 'var(--navy)', color: 'var(--cream)', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  addBtn: { padding: '9px 16px', background: 'var(--gold)', color: 'var(--navy)', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  board: { display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 12 },
  column: { minWidth: 240, flex: '0 0 240px', background: 'rgba(0,0,0,0.02)', borderRadius: 10, padding: 10 },
  columnHeader: { fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 10, display: 'flex', justifyContent: 'space-between' },
  count: { color: 'var(--ink-soft)', fontWeight: 500 },
  card: { background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, padding: 12, marginBottom: 8, cursor: 'pointer' },
  cardTitle: { fontWeight: 600, fontSize: 14, marginBottom: 3 },
  cardMeta: { fontSize: 12, color: 'var(--ink-soft)' },
  tag: { display: 'inline-block', fontSize: 11, background: 'var(--gold-soft)', color: 'var(--navy)', padding: '2px 8px', borderRadius: 999, marginTop: 6 },
  next: { fontSize: 12, marginTop: 8 },
  table: { width: '100%', borderCollapse: 'collapse', background: 'var(--paper)', borderRadius: 10, overflow: 'hidden' },
  th: { textAlign: 'left', fontSize: 12, color: 'var(--ink-soft)', padding: '10px 12px', borderBottom: '1px solid var(--line)' },
  tr: { cursor: 'pointer' },
  td: { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--line)' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(18,33,63,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 },
  modal: { background: 'var(--paper)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 560, maxHeight: '86vh', overflowY: 'auto' },
  modalTitle: { fontFamily: 'var(--font-display)', margin: '0 0 18px', color: 'var(--navy)' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 5 },
  input: { border: '1px solid var(--line)', borderRadius: 7, padding: '8px 10px', fontSize: 14, fontFamily: 'var(--font-body)' },
  logSection: { marginTop: 20 },
  noteRow: { display: 'flex', gap: 8, marginTop: 6 },
  smallBtn: { padding: '0 14px', background: 'var(--navy)', color: 'var(--cream)', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13 },
  logList: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto' },
  logItem: { fontSize: 13, borderLeft: '2px solid var(--gold)', paddingLeft: 10 },
  logMeta: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 },
  modalActions: { display: 'flex', gap: 10, marginTop: 24, alignItems: 'center' },
  deleteBtn: { padding: '9px 14px', background: 'none', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: 7, cursor: 'pointer', fontSize: 13 },
  cancelBtn: { padding: '9px 16px', background: 'none', border: '1px solid var(--line)', borderRadius: 7, cursor: 'pointer', fontSize: 13 },
  saveBtn: { padding: '9px 18px', background: 'var(--navy)', color: 'var(--cream)', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
}
