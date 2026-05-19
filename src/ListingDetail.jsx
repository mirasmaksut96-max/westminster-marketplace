import { useState } from 'react'
import { supabase } from './supabaseClient'


export default function ListingDetail({ listing, session, onClose }) {
  const [currentImage, setCurrentImage] = useState(0)
  const [showContact, setShowContact] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)


  const isOwnListing = session.user.id === listing.seller_id


  const handleSendMessage = async () => {
    if (!message.trim()) return
    setSending(true)


    const { error } = await supabase.from('messages').insert({
      listing_id: listing.id,
      sender_id: session.user.id,
      receiver_id: listing.seller_id,
      content: message,
    })


    if (!error) {
      setSent(true)
      setMessage('')
    }
    setSending(false)
  }


 const handleMarkAsSold = async () => {
  const { error } = await supabase
    .from('listings')
    .update({ status: 'sold' })
    .eq('id', listing.id)
  if (error) {
    alert('Error: ' + error.message)
  } else {
    onClose()
  }
}





  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>


        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={onClose}>← Back</button>
          {isOwnListing && (
            <button style={styles.soldBtn} onClick={handleMarkAsSold}>
              Mark as Sold
            </button>
          )}
        </div>


        {/* Images */}
        <div style={styles.imageSection}>
          {listing.image_urls?.length > 0 ? (
            <>
              <img
                src={listing.image_urls[currentImage]}
                alt={listing.title}
                style={styles.mainImage}
              />
              {listing.image_urls.length > 1 && (
                <div style={styles.thumbnails}>
                  {listing.image_urls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      style={i === currentImage ? styles.thumbActive : styles.thumb}
                      onClick={() => setCurrentImage(i)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={styles.noImage}>📦</div>
          )}
        </div>


        {/* Content */}
        <div style={styles.content}>


          {/* Title and price */}
          <div style={styles.titleRow}>
            <h2 style={styles.title}>{listing.title}</h2>
            <span style={styles.price}>£{parseFloat(listing.price).toFixed(2)}</span>
          </div>


          {/* Badges */}
          <div style={styles.badges}>
            <span style={styles.badge}>🏷️ {listing.categories?.name}</span>
            <span style={styles.badge}>📦 {listing.condition?.replace('_', ' ')}</span>
          </div>


          {/* Description */}
          {listing.description && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Description</h3>
              <p style={styles.description}>{listing.description}</p>
            </div>
          )}


          {/* Seller info */}
          <div style={styles.sellerBox}>
            <div style={styles.sellerAvatar}>
              {listing.profiles?.full_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <p style={styles.sellerName}>{listing.profiles?.full_name}</p>
              <p style={styles.sellerLabel}>Westminster {listing.profiles?.role || 'student'}</p>
            </div>
          </div>


          {/* Contact section */}
          {!isOwnListing && (
            <div style={styles.contactSection}>
              {!showContact && !sent && (
                <button
                  style={styles.contactBtn}
                  onClick={() => setShowContact(true)}
                >
                  💬 Contact Seller
                </button>
              )}


              {showContact && !sent && (
                <div style={styles.messageBox}>
                  <h3 style={styles.sectionTitle}>Send a message</h3>
                  <textarea
                    style={styles.textarea}
                    placeholder={`Hi, is the ${listing.title} still available?`}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={3}
                  />
                  <button
                    style={styles.sendBtn}
                    onClick={handleSendMessage}
                    disabled={sending}
                  >
                    {sending ? 'Sending...' : '📨 Send Message'}
                  </button>
                </div>
              )}


              {sent && (
                <div style={styles.sentBox}>
                  <p style={styles.sentText}>✅ Message sent! The seller will get back to you.</p>
                </div>
              )}
            </div>
          )}


          {isOwnListing && (
            <div style={styles.ownBox}>
              <p style={styles.ownText}>📝 This is your listing</p>
            </div>
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
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '580px',
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
  backBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1rem',
    cursor: 'pointer',
    color: '#4a1fb8',
    fontWeight: 'bold',
  },
  soldBtn: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.4rem 1rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  },
  imageSection: {
    backgroundColor: '#f9fafb',
  },
  mainImage: {
    width: '100%',
    height: '280px',
    objectFit: 'cover',
  },
  thumbnails: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.75rem',
  },
  thumb: {
    width: '60px',
    height: '60px',
    objectFit: 'cover',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '2px solid transparent',
    opacity: 0.7,
  },
  thumbActive: {
    width: '60px',
    height: '60px',
    objectFit: 'cover',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '2px solid #4a1fb8',
    opacity: 1,
  },
  noImage: {
    height: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '4rem',
  },
  content: {
    padding: '1.5rem',
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.75rem',
    gap: '1rem',
  },
  title: {
    margin: 0,
    fontSize: '1.4rem',
    color: '#111827',
    flex: 1,
  },
  price: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#4a1fb8',
    whiteSpace: 'nowrap',
  },
  badges: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: '#f3f4f6',
    padding: '0.3rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    color: '#374151',
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: '1.25rem',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  description: {
    color: '#6b7280',
    lineHeight: '1.6',
    margin: 0,
  },
  sellerBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    marginBottom: '1.25rem',
  },
  sellerAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#4a1fb8',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  sellerName: {
    margin: 0,
    fontWeight: 'bold',
    color: '#111827',
  },
  sellerLabel: {
    margin: 0,
    fontSize: '0.85rem',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  contactSection: {
    marginTop: '0.5rem',
  },
  contactBtn: {
    width: '100%',
    padding: '0.85rem',
    backgroundColor: '#4a1fb8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  messageBox: {
    marginTop: '0.5rem',
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
    marginBottom: '0.75rem',
    outline: 'none',
  },
  sendBtn: {
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
  sentBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '1rem',
    textAlign: 'center',
  },
  sentText: {
    color: '#166534',
    margin: 0,
    fontWeight: 'bold',
  },
  ownBox: {
    backgroundColor: '#f5f3ff',
    border: '1px solid #ddd6fe',
    borderRadius: '8px',
    padding: '1rem',
    textAlign: 'center',
  },
  ownText: {
    color: '#4a1fb8',
    margin: 0,
    fontWeight: 'bold',
  },
}


