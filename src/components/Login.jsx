import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const uname = username.trim().toLowerCase()
    let data, qErr
    try {
      const res = await supabase
        .from('employees')
        .select('username, password, full_name, role')
        .eq('username', uname)
        .maybeSingle()
      data = res.data
      qErr = res.error
    } catch (networkErr) {
      setLoading(false)
      setError('Network error: ' + (networkErr?.message || String(networkErr)))
      return
    }

    setLoading(false)

    if (qErr) {
      setError('Server error: ' + qErr.message + (qErr.details ? ' — ' + qErr.details : '') + (qErr.hint ? ' (' + qErr.hint + ')' : ''))
      return
    }
    if (!data || data.password !== password) {
      setError('Wrong username or password.')
      return
    }

    const session = { username: data.username, full_name: data.full_name, role: data.role }
    localStorage.setItem('hkbc_session', JSON.stringify(session))
    onLogin(session)
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.badge}>HK</div>
        <h1 style={styles.title}>HK Registry</h1>
        <p style={styles.sub}>Client tracker &amp; attendance</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Username
            <input
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </label>
          <label style={styles.label}>
            Password
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <div style={styles.error}>{error}</div>}

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Checking…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--navy)',
    backgroundImage: 'radial-gradient(circle at 20% 20%, var(--navy-light), var(--navy) 60%)',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    background: 'var(--paper)',
    borderRadius: 16,
    padding: '40px 32px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
    textAlign: 'center',
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    border: '2px solid var(--gold)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 18px',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 20,
    color: 'var(--navy)',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 26,
    margin: 0,
    color: 'var(--navy)',
  },
  sub: {
    color: 'var(--ink-soft)',
    fontSize: 14,
    marginTop: 6,
    marginBottom: 28,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 6 },
  input: {
    border: '1px solid var(--line)',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 15,
    fontFamily: 'var(--font-body)',
    color: 'var(--ink)',
  },
  error: { color: 'var(--red)', fontSize: 13, fontWeight: 500 },
  button: {
    marginTop: 6,
    background: 'var(--navy)',
    color: 'var(--cream)',
    border: 'none',
    borderRadius: 8,
    padding: '12px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
