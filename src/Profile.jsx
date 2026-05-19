import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Profile({ session, onClose }) {
  const [profile, setProfile] = useState(null)
  const [listings, setListings] = useState([])
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchProfile()
    fetchMyListings()
  }, [])

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (!error && data) {
      setProfile(data)
      setFullName(data.full_name || '')
      setPhone(data.phone || '')
    }
    setLoading(false)
  }

  const fetchMyListings = async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('*, categories(name)')
      .eq('seller_id', session.user.id)
      .order('created_at', { ascending: false })

    if (!error && data) setListings(data)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone })
      .eq('id', session.user.id)

    if (error) setMessage('Error saving: ' + error.message)
    else setMessage('Profile updated successfully! ✅')
    setSaving(false)
  }

  const handleDelete = async (listingId) => {
    const confirm = window.confirm('Are you sure you want to delete this listing?')
    if (!confirm) return

    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', listingId)

    if (!error) fetchMyListings()
    else alert('Error deleting: ' + error.message)
  }

  const handleMarkSold = async (listingId) => {
    const { error } = await supabase
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', listingId)

    if (!error) fetchMyListings()
  }

  const activeListings = listings.filter(l => l.status === 'active')
  const soldListings = listings.filter(l => l.status === 'sold')

  if (loading) return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <p style={{ textAlign: 'center', padding: '2rem' }}>Loading...</p>
      </div>
    </div>
  )

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>👤 My Profile</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>

          {/* Avatar and stats */}
          <div style={styles.avatarSection}>
            <div style={styles.avatar}>
              {fullName?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={styles.statsRow}>
              <div style={styles.stat}>
                <span style={styles.statNum}>{activeListings.length}</span>
                <span style={styles.statLabel}>Active</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statNum}>{soldListings.length}</span>
                <span style={styles.statLabel}>Sold</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statNum}>{listings.length}</span>
                <span style={styles.statLabel}>Total</span>
              </div>
            </div>
          </div>

          {/* Edit profile */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Edit Profile</h3>

            <label style={styles.label}>Full Name</label>
            <input
              style={styles.input}
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your full name"
            />

            <label style={styles.label}>Phone Number</label>
            <input
              style={styles.input}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 07700 900000"
            />

            <label style={styles.label}>Email</label>
            <input
              style={{ ...styles.input, backgroundColor: '#f9fafb', color: '#9ca3af' }}
              value={session.user.email}
              disabled
            />

            <label style={styles.label}>Role</label>
            <input
              style={{ ...styles.input, backgroundColor: '#f9fafb', color: '#9ca3af', textTransform: 'capitalize' }}
              value={profile?.role || 'student'}
              disabled
            />

            {message && (
              <p style={styles.message}>{message}</p>
            )}

            <button
              style={styles.saveBtn}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>

          {/* My listings */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>My Listings</h3>

            {listings.length === 0 ? (
              <p style={styles.empty}>You haven't posted anything yet.</p>
            ) : (
              listings.map(listing => (
                <div key={listing.id} style={styles.listingRow}>
                  <div style={styles.listingImage}>
                    {listing.image_urls?.length > 0 ? (
                      <img src={listing.image_urls[0]} alt={listing.title} style={styles.listingImg} />
                    ) : (
                      <span style={{ fontSize: '1.5rem' }}>📦</span>
                    )}
                  </div>
                  <div style={styles.listingInfo}>
                    <p style={styles.listingTitle}>{listing.title}</p>
                    <p style={styles.listingMeta}>£{parseFloat(listing.price).toFixed(2)} · {listing.categories?.name}</p>
                    <span style={listing.status === 'active' ? styles.badgeActive : styles.badgeSold}>
                      {listing.status === 'active' ? '🟢 Active' : '🔴 Sold'}
                    </span>
                  </div>
                  <div style={styles.listingActions}>
                    {listing.status === 'active' && (
                      <button
                        style={styles.soldBtn}
                        onClick={() => handleMarkSold(listing.id)}
                      >
                        Mark sold
                      </button>
                    )}
                    <button
                      style={styles.deleteBtn}
                      onClick={() => handleDelete(listing.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

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
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '540px',
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
  avatarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    marginBottom: '1.5rem',
    padding: '1.25rem',
    backgroundColor: '#f5f3ff',
    borderRadius: '12px',
  },
  avatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#4a1fb8',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.8rem',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  statsRow: {
    display: 'flex',
    gap: '1.5rem',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statNum: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#4a1fb8',
  },
  statLabel: {
    fontSize: '0.8rem',
    color: '#6b7280',
  },
  section: {
    marginBottom: '1.5rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #f3f4f6',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.4rem',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    marginBottom: '1rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    outline: 'none',
  },
  message: {
    color: '#4a1fb8',
    fontSize: '0.9rem',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  saveBtn: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#4a1fb8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  empty: {
    color: '#9ca3af',
    textAlign: 'center',
    padding: '1rem',
    fontSize: '0.9rem',
  },
  listingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    borderRadius: '10px',
    border: '1px solid #f3f4f6',
    marginBottom: '0.75rem',
    backgroundColor: '#fafafa',
  },
  listingImage: {
    width: '56px',
    height: '56px',
    borderRadius: '8px',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  listingImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  listingInfo: {
    flex: 1,
    minWidth: 0,
  },
  listingTitle: {
    margin: 0,
    fontWeight: 'bold',
    fontSize: '0.9rem',
    color: '#111827',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  listingMeta: {
    margin: '0.2rem 0',
    fontSize: '0.8rem',
    color: '#6b7280',
  },
  badgeActive: {
    fontSize: '0.75rem',
    color: '#166534',
    backgroundColor: '#dcfce7',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  badgeSold: {
    fontSize: '0.75rem',
    color: '#991b1b',
    backgroundColor: '#fee2e2',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  listingActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    flexShrink: 0,
  },
  soldBtn: {
    padding: '0.3rem 0.6rem',
    backgroundColor: '#4a1fb8',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  deleteBtn: {
    padding: '0.3rem 0.6rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
}
