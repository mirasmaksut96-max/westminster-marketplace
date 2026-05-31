import { useState } from 'react'
import { supabase } from './supabaseClient'

const REASONS = [
  { label: '🚫 Inappropriate content', value: 'inappropriate' },
  { label: '📢 Spam', value: 'spam' },
  { label: '💰 Scam or fraud', value: 'scam' },
  { label: '⛔ Prohibited item', value: 'prohibited_item' },
  { label: '📝 Other', value: 'other' },
]

export default function ReportListing({ listing, session, onClose }) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!reason) {
      setError('Please select a reason.')
      return
    }
    setLoading(true)
    setError('')

    const { error: err } = await supabase.from('reports').insert({
      reporter_id: session.user.id,
      listing_id: listing.id,
      reason,
      details,
      status: 'pending',
    })

    if (err) setError('Error submitting report: ' + err.message)
    else setSubmitted(true)

    setLoading(false)
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        <div style={styles.header}>
          <h2 style={styles.title}>🚩 Report Listing</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          {submitted ? (
            <div style={styles.successBox}>
              <p style={styles.successIcon}>✅</p>
              <p style={styles.successTitle}>Report submitted!</p>
              <p style={styles.successText}>
                Thank you for helping keep the University of Westminster Marketplace safe.
                Our team will review this listing shortly.
              </p>
              <button style={styles.doneBtn} onClick={onClose}>Done</button>
            </div>
          ) : (
            <>
              <div style={styles.listingPreview}>
                <p style={styles.previewLabel}>Reporting listing:</p>
                <p style={styles.previewTitle}>"{listing.title}"</p>
              </div>

              <p style={styles.sectionLabel}>Why are you reporting this listing? *</p>
              <div style={styles.reasonsList}>
                {REASONS.map(r => (
                  <button
                    key={r.value}
                    style={reason === r.value ? styles.reasonActive : styles.reasonBtn}
                    onClick={() => setReason(r.value)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <p style={styles.sectionLabel}>Additional details (optional)</p>
              <textarea
                style={styles.textarea}
                placeholder="Provide any extra details that might help our team..."
                value={details}
                onChange={e => setDetails(e.target.value)}
                rows={3}
              />

              {error && <p style={styles.error}>{error}</p>}

              <button
                style={styles.submitBtn}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Submitting...' : '🚩 Submit Report'}
              </button>

              <p style={styles.disclaimer}>
                False reports may result in account suspension.
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
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    backgroundColor: 'white',
    zIndex: 1,
  },
  title: {
    margin: 0,
    fontSize: '1.2rem',
    color: '#111827',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.2rem',
    cursor: 'pointer',
    color: '#6b7280',
  },
  body: {
    padding: '1.5rem',
  },
  listingPreview: {
    backgroundColor: '#f9fafb',
    borderRadius: '10px',
    padding: '0.85rem 1rem',
    marginBottom: '1.25rem',
    border: '1px solid #e5e7eb',
  },
  previewLabel: {
    margin: '0 0 0.25rem',
    fontSize: '0.8rem',
    color: '#6b7280',
  },
  previewTitle: {
    margin: 0,
    fontWeight: 'bold',
    color: '#111827',
    fontSize: '0.95rem',
  },
  sectionLabel: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '0.75rem',
  },
  reasonsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1.25rem',
  },
  reasonBtn: {
    padding: '0.7rem 1rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem',
    color: '#374151',
    textAlign: 'left',
  },
  reasonActive: {
    padding: '0.7rem 1rem',
    borderRadius: '8px',
    border: '2px solid #dc2626',
    backgroundColor: '#fff5f5',
    cursor: 'pointer',
    fontSize: '0.9rem',
    color: '#dc2626',
    textAlign: 'left',
    fontWeight: 'bold',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '0.9rem',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'sans-serif',
    boxSizing: 'border-box',
    marginBottom: '1.25rem',
  },
  error: {
    color: '#dc2626',
    fontSize: '0.85rem',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  submitBtn: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginBottom: '0.75rem',
  },
  disclaimer: {
    textAlign: 'center',
    fontSize: '0.75rem',
    color: '#9ca3af',
    margin: 0,
  },
  successBox: {
    textAlign: 'center',
    padding: '1rem 0',
  },
  successIcon: {
    fontSize: '3rem',
    margin: '0 0 0.5rem',
  },
  successTitle: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    color: '#111827',
    margin: '0 0 0.5rem',
  },
  successText: {
    color: '#6b7280',
    lineHeight: '1.6',
    margin: '0 0 1.5rem',
  },
  doneBtn: {
    padding: '0.75rem 2rem',
    backgroundColor: '#4a1fb8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
}
