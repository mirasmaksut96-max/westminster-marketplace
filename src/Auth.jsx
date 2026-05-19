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
    else setMessage('Check your Westminster email to confirm your account!')
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
        <h1 style={styles.title}>🎓 Westminster Marketplace</h1>
        <p style={styles.subtitle}>Buy and sell with fellow Westminster students & staff</p>


        <div style={styles.tabs}>
          <button
            style={isLogin ? styles.activeTab : styles.tab}
            onClick={() => setIsLogin(true)}
          >Login</button>
          <button
            style={!isLogin ? styles.activeTab : styles.tab}
            onClick={() => setIsLogin(false)}
          >Register</button>
        </div>


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
          placeholder="Westminster email (@westminster.ac.uk)"
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
          onClick={isLogin ? handleLogin : handleRegister}
          disabled={loading}
        >
          {loading ? 'Please wait...' : isLogin ? 'Login' : 'Create Account'}
        </button>
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
    backgroundColor: '#f3f4f6',
  },
  card: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  title: {
    textAlign: 'center',
    color: '#4a1fb8',
    marginBottom: '0.25rem',
    fontSize: '1.5rem',
  },
  subtitle: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '0.9rem',
    marginBottom: '1.5rem',
  },
  tabs: {
    display: 'flex',
    marginBottom: '1.25rem',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },
  tab: {
    flex: 1,
    padding: '0.6rem',
    border: 'none',
    background: 'white',
    cursor: 'pointer',
    fontSize: '0.95rem',
    color: '#6b7280',
  },
  activeTab: {
    flex: 1,
    padding: '0.6rem',
    border: 'none',
    background: '#4a1fb8',
    cursor: 'pointer',
    fontSize: '0.95rem',
    color: 'white',
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    marginBottom: '1rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#4a1fb8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  message: {
    textAlign: 'center',
    color: '#4a1fb8',
    marginBottom: '1rem',
    fontSize: '0.9rem',
  }
}




