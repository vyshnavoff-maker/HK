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
    status: '',
    nextAction: '',
    dueDate: '',
    notes: '',
    totalFees: '',
    paidAmount: '',
    currency: 'AED',
    paymentDueDate: '',
    log: [],
  }
}

function num(v) {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

export default function ClientRegistry({ session }) {
  const [clients, setClients] = useState([])
  const [view, setView] = useState('board')
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('All')
  const [openId, setOpenId] = useState(null) // client whose file page is open
  const [draft, setDraft] = useState(null) // editable copy of the open client
  const [loading, setLoading] = useState(true)
  const [noteDraft, setNoteDraft] = useState('')
  const [saving, setSaving] = useState(false)

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

  function openFile(client) {
    setOpenId(client.id)
    setDraft({ ...client })
  }

  function openNewFile() {
    const c = emptyClient()
    setOpenId(c.id)
    setDraft(c)
  }

  function closeFile() {
    setOpenId(null)
    setDraft(null)
    setNoteDraft('')
  }

  async function saveFile() {
    setSaving(true)
    const exists = clients.some((c) => c.id === draft.id)
    const next = exists ? clients.map((c) => (c.id === draft.id ? draft : c)) : [...clients, draft]
    await persist(next)
    setSaving(false)
  }

  function addNote() {
    if (!noteDraft.trim()) return
    const entry = { text: noteDraft.trim(), by: session.full_name, at: new Date().toISOString() }
    setDraft({ ...draft, log: [entry, ...(draft.log || [])] })
    setNoteDraft('')
  }

  async function removeClient(id) {
    if (!confirm('Delete this client file? This cannot be undone.')) return
    const next = clients.filter((c) => c.id !== id)
    await persist(next)
    closeFile()
  }

  const filtered = clients.filter((c) => {
    const matchesSearch = !search || `${c.name} ${c.fileRef} ${c.contact}`.toLowerCase().includes(search.toLowerCase())
    const matchesStage = stageFilter === 'All' || c.stage === stageFilter
    return matchesSearch && matchesStage
  })

  function isOverdue(c) {
    return c.dueDate && new Date(c.dueDate) < new Date(new Date().toDateString()) && c.stage !== 'Closed'
  }

  function isPaymentOverdue(c) {
    return c.paymentDueDate && due(c) > 0 && new Date(c.paymentDueDate) < new Date(new Date().toDateString())
  }

  function due(c) {
    return num(c.totalFees) - num(c.paidAmount)
  }

  // ---------- FILE PAGE (single client, full page) ----------
  if (draft) {
    const dueAmount = due(draft)
    return (
      <div>
        <button style={s.backBtn} onClick={closeFile}>← Back to all clients</button>

        <div style={s.fileHeader}>
          <div style={s.fileHeaderGrid}>
            <label style={s.label}>File ref
              <input style={s.input} value={draft.fileRef} onChange={(e) => setDraft({ ...draft, fileRef: e.target.value })} />
            </label>
            <label style={s.label}>Stage
              <select style={s.input} value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value })}>
                {STAGES.map((st) => <option key={st}>{st}</option>)}
              </select>
            </label>
            <label style={{ ...s.label, gridColumn: '1 / -1' }}>Client name
              <input style={{ ...s.input, fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 600 }} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Client name" />
            </label>
            <label style={s.label}>Contact
              <input style={s.input} value={draft.contact} onChange={(e) => setDraft({ ...draft, contact: e.target.value })} />
            </label>
            <label style={s.label}>Practice area
              <input style={s.input} value={draft.practiceArea} onChange={(e) => setDraft({ ...draft, practiceArea: e.target.value })} />
            </label>
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionNum}>1</div>
          <div style={s.sectionBody}>
            <h3 style={s.sectionTitle}>Current status</h3>
            <textarea
              style={s.textarea}
              placeholder="Where things stand right now…"
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            />
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionNum}>2</div>
          <div style={s.sectionBody}>
            <h3 style={s.sectionTitle}>Next step</h3>
            <div style={s.nextRow}>
              <input
                style={{ ...s.input, flex: 1 }}
                placeholder="What needs to happen next…"
                value={draft.nextAction}
                onChange={(e) => setDraft({ ...draft, nextAction: e.target.value })}
              />
              <label style={s.inlineDateLabel}>
                Due
                <input
                  type="date"
                  style={{ ...s.input, borderColor: isOverdue(draft) ? 'var(--red)' : 'var(--line)' }}
                  value={draft.dueDate}
                  onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                />
              </label>
            </div>
            {isOverdue(draft) && <div style={s.overdueTag}>Overdue</div>}
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionNum}>3</div>
          <div style={s.sectionBody}>
            <h3 style={s.sectionTitle}>Additional notes</h3>
            <textarea
              style={s.textarea}
              placeholder="Anything else worth recording…"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionNum}>4</div>
          <div style={s.sectionBody}>
            <h3 style={s.sectionTitle}>Fees</h3>
            <div style={s.feesGrid}>
              <label style={s.label}>Currency
                <select style={s.input} value={draft.currency || 'AED'} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}>
                  <option>AED</option>
                  <option>INR</option>
                </select>
              </label>
              <label style={s.label}>Total fees
                <input
                  style={s.input}
                  type="number"
                  min="0"
                  value={draft.totalFees}
                  onChange={(e) => setDraft({ ...draft, totalFees: e.target.value })}
                />
              </label>
              <label style={s.label}>Paid so far
                <input
                  style={s.input}
                  type="number"
                  min="0"
                  value={draft.paidAmount}
                  onChange={(e) => setDraft({ ...draft, paidAmount: e.target.value })}
                />
              </label>
              <label style={s.label}>Payment due date
                <input
                  style={{ ...s.input, borderColor: isPaymentOverdue(draft) ? 'var(--red)' : 'var(--line)' }}
                  type="date"
                  value={draft.paymentDueDate}
                  onChange={(e) => setDraft({ ...draft, paymentDueDate: e.target.value })}
                />
              </label>
            </div>
            <div style={s.feesSummary}>
              <div style={s.feesBox}>
                <div style={s.feesLabel}>Total</div>
                <div style={s.feesValue}>{draft.currency || 'AED'} {num(draft.totalFees).toLocaleString()}</div>
              </div>
              <div style={s.feesBox}>
                <div style={s.feesLabel}>Paid</div>
                <div style={{ ...s.feesValue, color: 'var(--green)' }}>{draft.currency || 'AED'} {num(draft.paidAmount).toLocaleString()}</div>
              </div>
              <div style={s.feesBox}>
                <div style={s.feesLabel}>Due</div>
                <div style={{ ...s.feesValue, color: dueAmount > 0 ? 'var(--red)' : 'var(--green)' }}>
                  {draft.currency || 'AED'} {dueAmount.toLocaleString()}
                </div>
              </div>
            </div>
            {isPaymentOverdue(draft) && <div style={s.overdueTag}>Payment overdue</div>}
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionNum}>5</div>
          <div style={s.sectionBody}>
            <h3 style={s.sectionTitle}>Activity log</h3>
            <div style={s.noteRow}>
              <input style={{ ...s.input, flex: 1 }} placeholder="Add a timestamped note…" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote()} />
              <button style={s.smallBtn} onClick={addNote}>Add</button>
            </div>
            <div style={s.logList}>
              {(draft.log || []).map((n, i) => (
                <div key={i} style={s.logItem}>
                  <div>{n.text}</div>
                  <div style={s.logMeta}>{n.by} · {new Date(n.at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={s.fileActions}>
          <button style={s.deleteBtn} onClick={() => removeClient(draft.id)}>Delete file</button>
          <div style={{ flex: 1 }} />
          <button style={s.saveBtn} onClick={saveFile} disabled={saving}>{saving ? 'Saving…' : 'Save file'}</button>
        </div>
      </div>
    )
  }

  // ---------- LIST / BOARD OF ALL CLIENTS ----------
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
        <button style={s.addBtn} onClick={openNewFile}>+ New client</button>
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
                <div key={c.id} style={s.card} onClick={() => openFile(c)}>
                  <div style={s.cardTitle}>{c.name || 'Untitled'}</div>
                  <div style={s.cardMeta}>{c.fileRef}</div>
                  {c.practiceArea && <div style={s.tag}>{c.practiceArea}</div>}
                  {c.nextAction && (
                    <div style={{ ...s.next, color: isOverdue(c) ? 'var(--red)' : 'var(--ink-soft)' }}>
                      {c.nextAction} {c.dueDate ? `· ${c.dueDate}` : ''}
                    </div>
                  )}
                  {due(c) > 0 && (
                    <div style={{ ...s.next, color: isPaymentOverdue(c) ? 'var(--red)' : 'var(--ink-soft)' }}>
                      {c.currency || 'AED'} {due(c).toLocaleString()} due{c.paymentDueDate ? ` · ${c.paymentDueDate}` : ''}
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
              {['File ref', 'Client', 'Contact', 'Practice area', 'Stage', 'Next action', 'Due', 'Fees due'].map((h) => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} style={s.tr} onClick={() => openFile(c)}>
                <td style={s.td}>{c.fileRef}</td>
                <td style={s.td}>{c.name}</td>
                <td style={s.td}>{c.contact}</td>
                <td style={s.td}>{c.practiceArea}</td>
                <td style={s.td}>{c.stage}</td>
                <td style={s.td}>{c.nextAction}</td>
                <td style={{ ...s.td, color: isOverdue(c) ? 'var(--red)' : 'inherit' }}>{c.dueDate}</td>
                <td style={{ ...s.td, color: isPaymentOverdue(c) ? 'var(--red)' : 'inherit' }}>
                  {due(c) > 0 ? `${c.currency || 'AED'} ${due(c).toLocaleString()}` : '—'}
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
  next: { fontSize: 12, marginTop: 6 },
  table: { width: '100%', borderCollapse: 'collapse', background: 'var(--paper)', borderRadius: 10, overflow: 'hidden' },
  th: { textAlign: 'left', fontSize: 12, color: 'var(--ink-soft)', padding: '10px 12px', borderBottom: '1px solid var(--line)' },
  tr: { cursor: 'pointer' },
  td: { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--line)' },

  // File page
  backBtn: { background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: 13, cursor: 'pointer', marginBottom: 18, padding: 0 },
  fileHeader: { background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, padding: 20, marginBottom: 18 },
  fileHeaderGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 },
  section: { display: 'flex', gap: 14, marginBottom: 18 },
  sectionNum: {
    width: 28, height: 28, borderRadius: '50%', background: 'var(--navy)', color: 'var(--cream)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 2,
  },
  sectionBody: { flex: 1, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, padding: 18 },
  sectionTitle: { fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--navy)', margin: '0 0 12px' },
  textarea: {
    width: '100%', minHeight: 90, border: '1px solid var(--line)', borderRadius: 8, padding: 12,
    fontSize: 14, fontFamily: 'var(--font-body)', lineHeight: 1.5, resize: 'vertical',
  },
  nextRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  inlineDateLabel: { fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 5 },
  overdueTag: { display: 'inline-block', marginTop: 10, fontSize: 11, fontWeight: 700, color: 'var(--red)', background: 'rgba(179,67,43,0.1)', padding: '3px 10px', borderRadius: 999 },
  feesGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 },
  feesSummary: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  feesBox: { flex: '1 1 120px', background: 'var(--cream)', borderRadius: 8, padding: '12px 16px' },
  feesLabel: { fontSize: 11, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: 0.5 },
  feesValue: { fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginTop: 4 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 5 },
  input: { border: '1px solid var(--line)', borderRadius: 7, padding: '8px 10px', fontSize: 14, fontFamily: 'var(--font-body)' },
  noteRow: { display: 'flex', gap: 8, marginBottom: 12 },
  smallBtn: { padding: '0 14px', background: 'var(--navy)', color: 'var(--cream)', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13 },
  logList: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' },
  logItem: { fontSize: 13, borderLeft: '2px solid var(--gold)', paddingLeft: 10 },
  logMeta: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 },
  fileActions: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 40 },
  deleteBtn: { padding: '9px 14px', background: 'none', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: 7, cursor: 'pointer', fontSize: 13 },
  saveBtn: { padding: '10px 24px', background: 'var(--navy)', color: 'var(--cream)', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 14, fontWeight: 700 },
}
