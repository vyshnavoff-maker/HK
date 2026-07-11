import { useEffect, useState } from 'react'
import Login from './components/Login.jsx'
import ClientRegistry from './components/ClientRegistry.jsx'
import Attendance from './components/Attendance.jsx'

export default function App() {
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('clients')
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('hkbc_session')
    if (raw) {
      try { setSession(JSON.parse(raw)) } catch {}
    }
    setChecked(true)
  }, [])

  function logout() {
    localStorage.removeItem('hkbc_session')
    setSession(null)
  }

  if (!checked) return null
  if (!session) return <Login onLogin={setSession} />

  return (
    <div style={s.app}>
      <header style={s.header}>
        <div style={s.brand}>
          <div style={s.brandBadge}>HK</div>
          <span style={s.brandName}>HK Registry</span>
        </div>
        <nav style={s.nav}>
          <button style={tab === 'clients' ? s.navActive : s.navBtn} onClick={() => setTab('clients')}>Clients</button>
          <button style={tab === 'attendance' ? s.navActive : s.navBtn} onClick={() => setTab('attendance')}>Attendance</button>
        </nav>
        <div style={s.userArea}>
          <span style={s.userName}>{session.full_name}</span>
          <button style={s.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      </header>

      <main style={s.main}>
        {tab === 'clients' ? <ClientRegistry session={session} /> : <Attendance session={session} />}
      </main>
    </div>
  )
}

const s = {
  app: { minHeight: '100vh' },
  header: {
    background: 'var(--paper)', borderBottom: '1px solid var(--line)',
    padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
    position: 'sticky', top: 0, zIndex: 10,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  brandBadge: {
    width: 30, height: 30, borderRadius: '50%', border: '1.5px solid var(--gold)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--navy)',
  },
  brandName: { fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--navy)', fontSize: 17 },
  nav: { display: 'flex', gap: 6, flex: 1 },
  navBtn: { background: 'none', border: 'none', padding: '8px 14px', borderRadius: 7, color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 14, fontWeight: 500 },
  navActive: { background: 'var(--navy)', border: 'none', padding: '8px 14px', borderRadius: 7, color: 'var(--cream)', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  userArea: { display: 'flex', alignItems: 'center', gap: 12 },
  userName: { fontSize: 13, color: 'var(--ink-soft)' },
  logoutBtn: { background: 'none', border: '1px solid var(--line)', borderRadius: 7, padding: '7px 12px', cursor: 'pointer', fontSize: 13 },
  main: { maxWidth: 1100, margin: '0 auto', padding: '28px 24px' },
}
