import { useState } from 'react'
import { supabase } from './supabaseClient'

export const ADMIN_ID = 'f2ab47af-005c-4e25-8673-82e3059d846e'
const ADMIN_EMAIL = 'w2119141@my.westminster.ac.uk'

export default function ContactAdmin({ session, onClose }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    if (!message.trim()) return
    setSending(true)
    setError('')
    const { error: err } = await supabase.from('messages').insert({
      listing_id: null,
      sender_id: session.user.id,
      receiver_id: ADMIN_ID,
      content: message.trim(),
    })
    setSending(false)
    if (err) {
      setError('Could not send message: ' + err.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Contact Admin</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={styles.body}>
          {sent ? (
            <div style={styles.sentBox}>
              <p style={styles.sentIcon}>✅</p>
              <p style={styles.sentTitle}>Message sent</p>
              <p style={styles.sentText}>The admin will reply via Messages.</p>
              <button style={styles.doneBtn} onClick={onClose}>Done</button>
            </div>
          ) : (
            <>
              <p style={styles.intro}>
                Need help or want to report a problem? Send a direct message to the marketplace admin.
              </p>
              <label style={styles.label}>Message</label>
              <textarea
                style={styles.textarea}
                placeholder="Describe your issue or question…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                autoFocus
              />
              {error && <p style={styles.error}>{error}</p>}
              <button
                style={message.trim() && !sending ? styles.sendBtn : styles.sendBtnDisabled}
                onClick={handleSend}
                disabled={sending || !message.trim()}
              >
                {sending ? 'Sending…' : 'Send Message'}
              </button>
              <p style={styles.emailNote}>
                Or email us at{' '}
                <a href={`mailto:${ADMIN_EMAIL}`} style={styles.emailLink}>{ADMIN_EMAIL}</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,6,38,0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    padding: '1rem',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '6px',
    width: '100%',
    maxWidth: '460px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #f0ebf8',
  },
  title: {
    margin: 0,
    fontSize: '1.2rem',
    color: '#120826',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontWeight: 600,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.1rem',
    cursor: 'pointer',
    color: '#9b8daa',
    padding: '0.25rem',
    lineHeight: 1,
  },
  body: { padding: '1.5rem' },
  intro: {
    color: '#6b7280',
    fontSize: '0.88rem',
    lineHeight: 1.6,
    margin: '0 0 1.25rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.35rem',
    fontWeight: 500,
    fontSize: '0.72rem',
    color: '#4a3f5c',
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
  },
  textarea: {
    width: '100%',
    padding: '0.7rem 0.85rem',
    marginBottom: '1.25rem',
    borderRadius: '4px',
    border: '1px solid #e4dded',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    resize: 'vertical',
    outline: 'none',
    color: '#120826',
    backgroundColor: '#fdfcfb',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  error: {
    color: '#b91c1c',
    fontSize: '0.82rem',
    marginBottom: '1rem',
  },
  sendBtn: {
    width: '100%',
    padding: '0.85rem',
    backgroundColor: '#1a0844',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    fontFamily: "'Inter', system-ui, sans-serif",
    marginBottom: '1rem',
  },
  sendBtnDisabled: {
    width: '100%',
    padding: '0.85rem',
    backgroundColor: '#c4b8d8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'not-allowed',
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    fontFamily: "'Inter', system-ui, sans-serif",
    marginBottom: '1rem',
  },
  emailNote: {
    color: '#9b8daa',
    fontSize: '0.78rem',
    textAlign: 'center',
    margin: 0,
  },
  emailLink: {
    color: '#4a1fb8',
    textDecoration: 'none',
  },
  sentBox: {
    textAlign: 'center',
    padding: '1rem 0',
  },
  sentIcon: {
    fontSize: '2.5rem',
    margin: '0 0 0.75rem',
  },
  sentTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#120826',
    margin: '0 0 0.5rem',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  },
  sentText: {
    color: '#6b7280',
    fontSize: '0.88rem',
    margin: '0 0 1.5rem',
  },
  doneBtn: {
    padding: '0.65rem 2rem',
    backgroundColor: '#1a0844',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
}
