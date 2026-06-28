import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function ContactSeller({ listing, session, initialMode = 'message', onClose }) {
  const [mode, setMode] = useState(initialMode)
  const [message, setMessage] = useState('')
  const [offerPrice, setOfferPrice] = useState('')
  const [offerNote, setOfferNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const sellerName = listing.profiles?.full_name || 'Seller'
  const isWanted = listing.listing_type === 'wanted'

  const handleSendMessage = async () => {
    if (!message.trim()) return
    setSending(true)
    const { error } = await supabase.from('messages').insert({
      listing_id: listing.id,
      sender_id: session.user.id,
      receiver_id: listing.seller_id,
      content: message,
    })
    if (!error) setSent(true)
    setSending(false)
  }

  const handleSendOffer = async () => {
    const price = parseFloat(offerPrice)
    if (!offerPrice || isNaN(price) || price <= 0) return
    setSending(true)
    const content = offerNote.trim()
      ? `💰 Offer: £${price.toFixed(2)} — ${offerNote.trim()}`
      : `💰 Offer: £${price.toFixed(2)}`
    const { error } = await supabase.from('messages').insert({
      listing_id: listing.id,
      sender_id: session.user.id,
      receiver_id: listing.seller_id,
      content,
    })
    if (!error) setSent(true)
    setSending(false)
  }

  const messageTemplates = isWanted
    ? [`Hi, I have the ${listing.title} you're looking for!`, 'Is this still available?', 'Can we meet on campus?']
    : [`Hi, is the ${listing.title} still available?`, 'Can we meet on campus?', 'Would you take a lower price?']

  return (
    <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.headerTitle}>
              {isWanted ? '📦 I have this!' : '💬 Contact Seller'}
            </h2>
            <p style={styles.headerSub}>{listing.title}</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {!isWanted && (
          <div style={styles.tabs}>
            <button
              style={mode === 'message' ? styles.tabActive : styles.tab}
              onClick={() => setMode('message')}
            >
              💬 Message
            </button>
            <button
              style={mode === 'offer' ? styles.tabActive : styles.tab}
              onClick={() => setMode('offer')}
            >
              💰 Make an Offer
            </button>
          </div>
        )}

        <div style={styles.body}>
          {sent ? (
            <div style={styles.sentBox}>
              <div style={styles.sentIcon}>✅</div>
              <p style={styles.sentTitle}>Sent!</p>
              <p style={styles.sentSub}>The seller will get back to you via Messages.</p>
              <button style={styles.doneBtn} onClick={onClose}>Done</button>
            </div>
          ) : mode === 'message' ? (
            <>
              <p style={styles.label}>{isWanted ? 'Tell them you have it' : 'Send a message to ' + sellerName}</p>
              <div style={styles.chips}>
                {messageTemplates.map(t => (
                  <button key={t} style={styles.chip} onClick={() => setMessage(t)}>{t}</button>
                ))}
              </div>
              <textarea
                style={styles.textarea}
                placeholder={messageTemplates[0]}
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
              />
              <div style={styles.actions}>
                <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
                <button style={styles.sendBtn} onClick={handleSendMessage} disabled={sending || !message.trim()}>
                  {sending ? 'Sending…' : '📨 Send Message'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={styles.label}>Asking price: <strong>£{parseFloat(listing.price).toFixed(2)}</strong></p>
              <div style={styles.priceRow}>
                <span style={styles.pound}>£</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={styles.priceInput}
                  placeholder="Your offer"
                  value={offerPrice}
                  onChange={e => setOfferPrice(e.target.value)}
                />
              </div>
              <textarea
                style={styles.textarea}
                placeholder="Add a note (optional)"
                value={offerNote}
                onChange={e => setOfferNote(e.target.value)}
                rows={3}
              />
              <div style={styles.actions}>
                <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
                <button style={styles.sendBtn} onClick={handleSendOffer} disabled={sending || !offerPrice}>
                  {sending ? 'Sending…' : '💰 Send Offer'}
                </button>
              </div>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    padding: '1rem',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '460px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '1.25rem 1.5rem 1rem',
    borderBottom: '1px solid #e5e7eb',
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.15rem',
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSub: {
    margin: '0.25rem 0 0',
    fontSize: '0.85rem',
    color: '#6b7280',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.1rem',
    cursor: 'pointer',
    color: '#9ca3af',
    lineHeight: 1,
    padding: '0.1rem',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
  },
  tab: {
    flex: 1,
    padding: '0.75rem',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#6b7280',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
  },
  tabActive: {
    flex: 1,
    padding: '0.75rem',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#4a1fb8',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer',
    borderBottom: '3px solid #4a1fb8',
  },
  body: {
    padding: '1.25rem 1.5rem 1.5rem',
  },
  label: {
    margin: '0 0 0.6rem',
    fontSize: '0.9rem',
    color: '#374151',
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
    marginBottom: '0.75rem',
  },
  chip: {
    padding: '0.3rem 0.7rem',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    color: '#4b5563',
    fontSize: '0.78rem',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'sans-serif',
    marginBottom: '1rem',
    outline: 'none',
  },
  priceRow: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '0.75rem',
  },
  pound: {
    padding: '0.75rem',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    fontWeight: 'bold',
    fontSize: '1rem',
  },
  priceInput: {
    flex: 1,
    padding: '0.75rem',
    border: 'none',
    fontSize: '1rem',
    outline: 'none',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
  },
  cancelBtn: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: 'white',
    color: '#6b7280',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  sendBtn: {
    flex: 2,
    padding: '0.75rem',
    backgroundColor: '#4a1fb8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  sentBox: {
    textAlign: 'center',
    padding: '1.5rem 0 0.5rem',
  },
  sentIcon: {
    fontSize: '2.5rem',
    marginBottom: '0.5rem',
  },
  sentTitle: {
    margin: '0 0 0.25rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#111827',
  },
  sentSub: {
    margin: '0 0 1.5rem',
    fontSize: '0.9rem',
    color: '#6b7280',
  },
  doneBtn: {
    padding: '0.75rem 2.5rem',
    backgroundColor: '#4a1fb8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
}
