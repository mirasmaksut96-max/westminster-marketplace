import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import PostListing from './PostListing'

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Masters', 'PhD', 'Staff / Other']
const CONTACT_METHODS = ['Email', 'Phone', 'WhatsApp']

export default function Profile({ session, onClose }) {
  const [profile, setProfile] = useState(null)
  const [listings, setListings] = useState([])
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [course, setCourse] = useState('')
  const [year, setYear] = useState('')
  const [bio, setBio] = useState('')
  const [preferredContact, setPreferredContact] = useState('Email')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPos, setAvatarPos] = useState({ x: 50, y: 50 })
  const [repositionMode, setRepositionMode] = useState(false)
  const [dragOrigin, setDragOrigin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [editingListing, setEditingListing] = useState(null)
  const avatarInputRef = useRef(null)
  const avatarWrapRef = useRef(null)

  useEffect(() => {
    fetchProfile()
    fetchMyListings()
  }, [])

  async function fetchProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (!error && data) {
      setProfile(data)
      setFullName(data.full_name || '')
      setPhone(data.phone || '')
      setCourse(data.course || '')
      setYear(data.year || '')
      setBio(data.bio || '')
      setPreferredContact(data.preferred_contact || 'Email')
      setAvatarUrl(data.avatar_url || '')
      if (data.avatar_position) {
        const [x, y] = data.avatar_position.split(' ').map(v => parseFloat(v))
        setAvatarPos({ x, y })
      }
    }
    setLoading(false)
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.')
      return
    }
    setAvatarUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${session.user.id}-avatar-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('listing-images')
      .upload(path, file)

    if (uploadError) {
      alert('Upload failed: ' + uploadError.message)
      setAvatarUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('listing-images')
      .getPublicUrl(path)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', session.user.id)

    if (!updateError) {
      setAvatarUrl(publicUrl)
      setAvatarPos({ x: 50, y: 50 })
      setRepositionMode(true)
    } else {
      alert('Could not save photo: ' + updateError.message)
    }
    setAvatarUploading(false)
  }

  const handlePointerDown = (e) => {
    if (!repositionMode) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragOrigin({ clientX: e.clientX, clientY: e.clientY, posX: avatarPos.x, posY: avatarPos.y })
  }

  const handlePointerMove = (e) => {
    if (!dragOrigin || !avatarWrapRef.current) return
    const { width, height } = avatarWrapRef.current.getBoundingClientRect()
    const dx = (e.clientX - dragOrigin.clientX) / width * 100
    const dy = (e.clientY - dragOrigin.clientY) / height * 100
    setAvatarPos({
      x: Math.min(100, Math.max(0, dragOrigin.posX + dx)),
      y: Math.min(100, Math.max(0, dragOrigin.posY + dy)),
    })
  }

  const handlePointerUp = () => setDragOrigin(null)

  const handleSavePosition = async () => {
    const posStr = `${avatarPos.x.toFixed(1)}% ${avatarPos.y.toFixed(1)}%`
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_position: posStr })
      .eq('id', session.user.id)
    if (!error) setRepositionMode(false)
    else alert('Could not save position: ' + error.message)
  }

  async function fetchMyListings() {
    const { data, error } = await supabase
      .from('listings')
      .select('*, categories(name, slug)')
      .eq('seller_id', session.user.id)
      .order('created_at', { ascending: false })

    if (!error && data) setListings(data)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, course, year, bio, preferred_contact: preferredContact })
      .eq('id', session.user.id)

    if (error) setMessage('Error saving: ' + error.message)
    else setMessage('Profile updated successfully!')
    setSaving(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleDelete = async (listingId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return
    const { error } = await supabase.from('listings').delete().eq('id', listingId)
    if (!error) fetchMyListings()
    else alert('Error deleting: ' + error.message)
  }

  const handleMarkSold = async (listingId) => {
    const { error } = await supabase.from('listings').update({ status: 'sold' }).eq('id', listingId)
    if (!error) fetchMyListings()
  }

  const handleBump = async (listingId) => {
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 30)
    const { error } = await supabase
      .from('listings')
      .update({ expires_at: expiry.toISOString() })
      .eq('id', listingId)
    if (!error) fetchMyListings()
    else alert('Error bumping listing: ' + error.message)
  }

  const now = new Date()
  const activeListings = listings.filter(l =>
    l.status === 'active' && (!l.expires_at || new Date(l.expires_at) > now)
  )
  const expiredListings = listings.filter(l =>
    l.status === 'active' && l.expires_at && new Date(l.expires_at) <= now
  )
  const soldListings = listings.filter(l => l.status === 'sold')

  if (loading) return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <p style={{ textAlign: 'center', padding: '2rem' }}>Loading...</p>
      </div>
    </div>
  )

  return (
    <>
      <div style={styles.overlay}>
        <div style={styles.modal}>

          {/* Header */}
          <div style={styles.header}>
            <h2 style={styles.title}>My Profile</h2>
            <button style={styles.closeBtn} onClick={onClose}>✕</button>
          </div>

          <div style={styles.body}>

            {/* Avatar and stats banner */}
            <div style={repositionMode ? styles.avatarSectionReposition : styles.avatarSection}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  ref={avatarWrapRef}
                  style={{
                    ...styles.avatarWrap,
                    width: repositionMode ? '160px' : '64px',
                    height: repositionMode ? '160px' : '64px',
                    cursor: repositionMode ? 'grab' : 'pointer',
                    transition: 'width 0.2s, height 0.2s',
                  }}
                  onClick={!repositionMode ? () => avatarInputRef.current?.click() : undefined}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  title={repositionMode ? 'Drag to reposition' : 'Change profile photo'}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      style={{
                        ...styles.avatarImg,
                        width: repositionMode ? '160px' : '64px',
                        height: repositionMode ? '160px' : '64px',
                        objectPosition: `${avatarPos.x}% ${avatarPos.y}%`,
                      }}
                      draggable={false}
                    />
                  ) : (
                    <div style={styles.avatar}>
                      {fullName?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  {repositionMode ? (
                    <div style={styles.repositionOverlay}>✥</div>
                  ) : (
                    <div style={styles.avatarOverlay}>
                      {avatarUploading ? '...' : '📷'}
                    </div>
                  )}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarUpload}
                  />
                </div>

                {repositionMode && (
                  <p style={styles.repositionHint}>Drag the photo to reposition</p>
                )}

                {avatarUrl && !repositionMode && (
                  <button style={styles.repositionBtn} onClick={() => setRepositionMode(true)}>
                    Adjust
                  </button>
                )}
                {repositionMode && (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button style={styles.repositionSaveBtn} onClick={handleSavePosition}>Done</button>
                    <button style={styles.repositionCancelBtn} onClick={() => setRepositionMode(false)}>Cancel</button>
                  </div>
                )}
              </div>

              {!repositionMode && <div>
                <p style={styles.avatarName}>{fullName || session.user.email}</p>
                {course && <p style={styles.avatarSub}>{course}{year ? ` · ${year}` : ''}</p>}
                <div style={styles.statsRow}>
                  <div style={styles.stat}>
                    <span style={styles.statNum}>{activeListings.length}</span>
                    <span style={styles.statLabel}>Active</span>
                  </div>
                  <div style={styles.stat}>
                    <span style={styles.statNum}>{soldListings.length}</span>
                    <span style={styles.statLabel}>Sold</span>
                  </div>
                  {expiredListings.length > 0 && (
                    <div style={styles.stat}>
                      <span style={{ ...styles.statNum, color: '#f59e0b' }}>{expiredListings.length}</span>
                      <span style={styles.statLabel}>Expired</span>
                    </div>
                  )}
                </div>
              </div>}
            </div>

            {/* ── Personal Info ── */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Personal Info</h3>

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
                style={styles.inputDisabled}
                value={session.user.email}
                disabled
              />

              <label style={styles.label}>Role</label>
              <input
                style={{ ...styles.inputDisabled, textTransform: 'capitalize' }}
                value={profile?.role || 'student'}
                disabled
              />
            </div>

            {/* ── Academic Info ── */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Academic Info</h3>

              <label style={styles.label}>Course / Programme</label>
              <input
                style={styles.input}
                value={course}
                onChange={e => setCourse(e.target.value)}
                placeholder="e.g. BSc Computer Science"
              />

              <label style={styles.label}>Year of Study</label>
              <select
                style={styles.select}
                value={year}
                onChange={e => setYear(e.target.value)}
              >
                <option value="">Select year...</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* ── About Me ── */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>About Me</h3>

              <label style={styles.label}>Short Bio</label>
              <textarea
                style={styles.textarea}
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 200))}
                placeholder="Tell buyers a little about yourself (max 200 chars)"
                rows={3}
              />
              <p style={styles.charCount}>{bio.length}/200</p>

              <label style={styles.label}>Preferred Contact Method</label>
              <div style={styles.contactRow}>
                {CONTACT_METHODS.map(method => (
                  <button
                    key={method}
                    style={preferredContact === method ? styles.contactChipActive : styles.contactChip}
                    onClick={() => setPreferredContact(method)}
                    type="button"
                  >
                    {method === 'Email' ? '✉️' : method === 'Phone' ? '📞' : '💬'} {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Save button */}
            {message && <p style={styles.message}>{message}</p>}
            <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            {/* ── My Listings ── */}
            <div style={{ ...styles.section, marginTop: '1.5rem' }}>
              <h3 style={styles.sectionTitle}>My Listings</h3>

              {listings.length === 0 ? (
                <p style={styles.empty}>You haven't posted anything yet.</p>
              ) : (
                <>
                  {[...activeListings, ...soldListings].map(listing => {
                    const daysLeft = listing.expires_at
                      ? Math.ceil((new Date(listing.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
                      : null
                    return (
                      <div key={listing.id} style={styles.listingRow}>
                        <div style={styles.listingImage}>
                          {listing.image_urls?.length > 0 ? (
                            <img src={listing.image_urls[0]} alt={listing.title} style={styles.listingImg} />
                          ) : (
                            <span style={{ fontSize: '1.5rem' }}>{listing.listing_type === 'wanted' ? '🔍' : '📦'}</span>
                          )}
                        </div>
                        <div style={styles.listingInfo}>
                          <p style={styles.listingTitle}>{listing.title}</p>
                          <p style={styles.listingMeta}>£{parseFloat(listing.price).toFixed(2)} · {listing.categories?.name}</p>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={listing.status === 'active' ? styles.badgeActive : styles.badgeSold}>
                              {listing.status === 'active' ? '🟢 Active' : '🔴 Sold'}
                            </span>
                            {daysLeft !== null && daysLeft <= 7 && listing.status === 'active' && (
                              <span style={styles.badgeExpiring}>⏳ {daysLeft}d left</span>
                            )}
                          </div>
                        </div>
                        <div style={styles.listingActions}>
                          {listing.status === 'active' && (
                            <>
                              <button style={styles.editBtn} onClick={() => setEditingListing(listing)}>✏️ Edit</button>
                              <button style={styles.soldBtn} onClick={() => handleMarkSold(listing.id)}>Mark sold</button>
                            </>
                          )}
                          <button style={styles.deleteBtn} onClick={() => handleDelete(listing.id)}>🗑️</button>
                        </div>
                      </div>
                    )
                  })}

                  {expiredListings.length > 0 && (
                    <>
                      <p style={styles.expiredHeader}>Expired Listings</p>
                      {expiredListings.map(listing => (
                        <div key={listing.id} style={{ ...styles.listingRow, ...styles.expiredRow }}>
                          <div style={styles.listingImage}>
                            {listing.image_urls?.length > 0 ? (
                              <img src={listing.image_urls[0]} alt={listing.title} style={{ ...styles.listingImg, opacity: 0.5 }} />
                            ) : (
                              <span style={{ fontSize: '1.5rem', opacity: 0.5 }}>📦</span>
                            )}
                          </div>
                          <div style={styles.listingInfo}>
                            <p style={{ ...styles.listingTitle, color: '#9ca3af' }}>{listing.title}</p>
                            <p style={styles.listingMeta}>£{parseFloat(listing.price).toFixed(2)} · {listing.categories?.name}</p>
                            <span style={styles.badgeExpired}>⏰ Expired</span>
                          </div>
                          <div style={styles.listingActions}>
                            <button style={styles.bumpBtn} onClick={() => handleBump(listing.id)}>🔄 Bump</button>
                            <button style={styles.deleteBtn} onClick={() => handleDelete(listing.id)}>🗑️</button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>

            {/* ── Account ── */}
            <div style={styles.accountSection}>
              <h3 style={styles.sectionTitle}>Account</h3>
              <p style={styles.accountEmail}>{session.user.email}</p>
              <button style={styles.signOutBtn} onClick={handleSignOut}>
                Sign Out
              </button>
            </div>

          </div>
        </div>
      </div>

      {editingListing && (
        <PostListing
          session={session}
          editListing={editingListing}
          onClose={() => setEditingListing(null)}
          onPosted={() => { fetchMyListings(); setEditingListing(null) }}
        />
      )}
    </>
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
    fontWeight: 'bold',
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
    gap: '1.25rem',
    marginBottom: '1.5rem',
    padding: '1.25rem',
    backgroundColor: '#f5f3ff',
    borderRadius: '12px',
  },
  avatarSectionReposition: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.5rem',
    padding: '1.5rem 1.25rem',
    backgroundColor: '#f5f3ff',
    borderRadius: '12px',
  },
  repositionHint: {
    margin: 0,
    fontSize: '0.78rem',
    color: '#6b7280',
  },
  avatarWrap: {
    position: 'relative',
    width: '64px',
    height: '64px',
    flexShrink: 0,
    cursor: 'pointer',
    borderRadius: '50%',
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
  },
  avatarImg: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    backgroundColor: 'white',
    border: '2px solid #4a1fb8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.65rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
  },
  repositionOverlay: {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    border: '2px dashed #4a1fb8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    color: 'white',
    backgroundColor: 'rgba(74,31,184,0.25)',
    userSelect: 'none',
  },
  repositionBtn: {
    padding: '0.2rem 0.6rem',
    fontSize: '0.72rem',
    backgroundColor: 'white',
    color: '#4a1fb8',
    border: '1px solid #c4b5fd',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  repositionSaveBtn: {
    padding: '0.2rem 0.6rem',
    fontSize: '0.72rem',
    backgroundColor: '#4a1fb8',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  repositionCancelBtn: {
    padding: '0.2rem 0.6rem',
    fontSize: '0.72rem',
    backgroundColor: 'white',
    color: '#6b7280',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  avatarName: {
    margin: '0 0 0.15rem',
    fontWeight: 'bold',
    fontSize: '1rem',
    color: '#111827',
  },
  avatarSub: {
    margin: '0 0 0.5rem',
    fontSize: '0.8rem',
    color: '#6b7280',
  },
  statsRow: {
    display: 'flex',
    gap: '1.25rem',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statNum: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    color: '#4a1fb8',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '0.72rem',
    color: '#6b7280',
    marginTop: '0.1rem',
  },
  section: {
    marginBottom: '1.5rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #f3f4f6',
  },
  sectionTitle: {
    fontSize: '0.95rem',
    fontWeight: 'bold',
    color: '#4a1fb8',
    marginBottom: '1rem',
    marginTop: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  label: {
    display: 'block',
    marginBottom: '0.4rem',
    fontSize: '0.85rem',
    fontWeight: '600',
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
  inputDisabled: {
    width: '100%',
    padding: '0.75rem',
    marginBottom: '1rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: '#f9fafb',
    color: '#9ca3af',
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    marginBottom: '1rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    marginBottom: '0.25rem',
  },
  charCount: {
    textAlign: 'right',
    fontSize: '0.75rem',
    color: '#9ca3af',
    margin: '0 0 1rem',
  },
  contactRow: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  contactChip: {
    padding: '0.5rem 0.9rem',
    borderRadius: '20px',
    border: '1px solid #e5e7eb',
    backgroundColor: 'white',
    color: '#374151',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  contactChipActive: {
    padding: '0.5rem 0.9rem',
    borderRadius: '20px',
    border: '1px solid #4a1fb8',
    backgroundColor: '#f5f3ff',
    color: '#4a1fb8',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  message: {
    color: '#4a1fb8',
    fontSize: '0.9rem',
    marginBottom: '0.75rem',
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
    marginBottom: '0.5rem',
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
  editBtn: {
    padding: '0.3rem 0.6rem',
    backgroundColor: '#f5f3ff',
    color: '#4a1fb8',
    border: '1px solid #c4b5fd',
    borderRadius: '6px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
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
  bumpBtn: {
    padding: '0.3rem 0.6rem',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fde68a',
    borderRadius: '6px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontWeight: 'bold',
  },
  expiredRow: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  expiredHeader: {
    fontSize: '0.85rem',
    fontWeight: 'bold',
    color: '#92400e',
    margin: '1rem 0 0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  badgeExpired: {
    fontSize: '0.75rem',
    color: '#92400e',
    backgroundColor: '#fef3c7',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  badgeExpiring: {
    fontSize: '0.75rem',
    color: '#92400e',
    backgroundColor: '#fef3c7',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  accountSection: {
    paddingTop: '0.5rem',
    borderTop: '1px solid #f3f4f6',
  },
  accountEmail: {
    fontSize: '0.85rem',
    color: '#6b7280',
    margin: '0 0 1rem',
  },
  signOutBtn: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: 'white',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
}
