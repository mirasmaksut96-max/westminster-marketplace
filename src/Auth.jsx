import { useState } from 'react'
import { supabase } from './supabaseClient'


export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')


  const handleRegister = async () => {
    if (!email.toLowerCase().endsWith('@westminster.ac.uk')) {
      setMessage('Only @westminster.ac.uk email addresses can register.')
      return
    }
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role }
      }
    })
    if (error) setMessage(error.message)
    else setMessage('Check your University of Westminster email to confirm your account!')
    setLoading(false)
  }


  const handleLogin = async () => {
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    setLoading(false)
  }


  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.brandMark}>
          <img src="/westminster-logo.png" alt="University of Westminster" style={styles.brandLogo} />
        </div>
        <h1 style={styles.title}>University of Westminster Marketplace</h1>
        <p style={styles.subtitle}>Exclusively for University of Westminster students &amp; staff</p>

        <div style={styles.tabs}>
          <button
            style={isLogin ? styles.activeTab : styles.tab}
            onClick={() => setIsLogin(true)}
          >Sign In</button>
          <button
            style={!isLogin ? styles.activeTab : styles.tab}
            onClick={() => setIsLogin(false)}
          >Register</button>
        </div>

        <form onSubmit={e => { e.preventDefault(); isLogin ? handleLogin() : handleRegister() }}>
          {!isLogin && (
            <input
              style={styles.input}
              placeholder="Full Name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          )}

          <input
            style={styles.input}
            placeholder="UoW email (@westminster.ac.uk)"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          {!isLogin && (
            <select
              style={styles.input}
              value={role}
              onChange={e => setRole(e.target.value)}
            >
              <option value="student">Student</option>
              <option value="staff">Staff</option>
            </select>
          )}

          {message && <p style={styles.message}>{message}</p>}

          <button
            style={styles.button}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}


const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a0844',
    backgroundImage: 'radial-gradient(ellipse at 25% 60%, #3d1b8a 0%, transparent 55%)',
    padding: '1rem',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  card: {
    backgroundColor: 'white',
    padding: '2.75rem 2.5rem',
    borderRadius: '6px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
  },
  brandMark: {
    width: '110px',
    height: '110px',
    borderRadius: '50%',
    backgroundColor: '#1a0844',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
    padding: '18px',
    boxSizing: 'border-box',
  },
  brandLogo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    filter: 'brightness(0) invert(1)',
  },
  title: {
    textAlign: 'center',
    color: '#120826',
    marginBottom: '0.3rem',
    fontSize: '1.75rem',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontWeight: 600,
    letterSpacing: '0.02em',
    margin: '0 0 0.3rem',
  },
  subtitle: {
    textAlign: 'center',
    color: '#8b7d9a',
    fontSize: '0.8rem',
    marginBottom: '2rem',
    letterSpacing: '0.05em',
    margin: '0 0 2rem',
  },
  tabs: {
    display: 'flex',
    marginBottom: '1.75rem',
    borderBottom: '1px solid #e4dded',
  },
  tab: {
    flex: 1,
    padding: '0.65rem',
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '0.8rem',
    color: '#8b7d9a',
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    fontWeight: 400,
    marginBottom: '-1px',
  },
  activeTab: {
    flex: 1,
    padding: '0.65rem',
    border: 'none',
    borderBottom: '2px solid #1a0844',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '0.8rem',
    color: '#1a0844',
    fontWeight: 600,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    marginBottom: '-1px',
  },
  input: {
    width: '100%',
    padding: '0.75rem 0.85rem',
    marginBottom: '1rem',
    borderRadius: '4px',
    border: '1px solid #e4dded',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    outline: 'none',
    color: '#120826',
    backgroundColor: '#fdfcfb',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  button: {
    width: '100%',
    padding: '0.85rem',
    backgroundColor: '#1a0844',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontWeight: 500,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  message: {
    textAlign: 'center',
    color: '#3d1b8a',
    marginBottom: '1rem',
    fontSize: '0.85rem',
    lineHeight: '1.5',
  },
}
