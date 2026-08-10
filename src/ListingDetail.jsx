import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import ReportListing from './ReportListing'
import ContactSeller from './ContactSeller'

export default function ListingDetail({ listing, session, onClose, onViewSeller, onSelectListing }) {
  const [currentImage, setCurrentImage] = useState(0)
  const [showContact, setShowContact] = useState(false)
  const [contactMode, setContactMode] = useState('message')
  const [showReport, setShowReport] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [savingToggle, setSavingToggle] = useState(false)

  const [sellerRating, setSellerRating] = useState(null)
  const [relatedListings, setRelatedListings] = useState([])
  const [copied, setCopied] = useState(false)
  const isOwnListing = session.user.id === listing.seller_id

  const handleShare = () => {
    const text = `${listing.title} — £${parseFloat(listing.price).toFixed(2)}\nUniversity of Westminster Marketplace`
    if (navigator.share) {
      navigator.share({ title: listing.title, text })
    } else {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function fetchRelatedListings() {
    if (!listing.category_id) return
    const { data } = await supabase
      .from('listings')
      .select('*, profiles(full_name, role), categories(name, slug)')
      .eq('category_id', listing.category_id)
      .eq('status', 'active')
      .neq('id', listing.id)
      .limit(4)
    if (data) setRelatedListings(data)
  }

  async function fetchSellerRating() {
    const { data } = await supabase
      .from('ratings')
      .select('score')
      .eq('rated_user_id', listing.seller_id)
    if (data && data.length > 0) {
      const avg = data.reduce((sum, r) => sum + r.score, 0) / data.length
      setSellerRating({ avg: avg.toFixed(1), count: data.length })
    }
  }

  useEffect(() => {
    supabase
      .from('saved_items')
      .select('listing_id')
      .eq('user_id', session.user.id)
      .eq('listing_id', listing.id)
      .maybeSingle()
      .then(({ data }) => setIsSaved(!!data))
    // React Compiler is not enabled in this project; mount-time data fetching is safe here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSellerRating()
    fetchRelatedListings()
    // increment view counter (don't count owner's own views)
    if (session.user.id !== listing.seller_id) {
      supabase.rpc('increment_listing_views', { listing_id: listing.id })
    }
  }, [listing.id, session.user.id])

  const handleToggleSave = async () => {
    setSavingToggle(true)
    if (isSaved) {
      await supabase.from('saved_items').delete()
        .eq('user_id', session.user.id)
        .eq('listing_id', listing.id)
      setIsSaved(false)
    } else {
      await supabase.from('saved_items').insert({ user_id: session.user.id, listing_id: listing.id })
      setIsSaved(true)
    }
    setSavingToggle(false)
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
      <div style={styles.modal} className="ld-modal">


        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={onClose}>← Back</button>
          <div style={styles.headerActions}>
            <button style={styles.shareBtn} onClick={handleShare}>
              {copied ? '✓ Copied' : '↑ Share'}
            </button>
            {!isOwnListing && (
              <>
                <button
                  style={isSaved ? styles.savedBtn : styles.saveBtn}
                  onClick={handleToggleSave}
                  disabled={savingToggle}
                >
                  {isSaved ? '♥ Saved' : '♡ Save'}
                </button>
                <button style={styles.reportBtn} onClick={() => setShowReport(true)}>
                  🚩 Report
                </button>
              </>
            )}
            {isOwnListing && listing.status === 'active' && (
              <button style={styles.soldBtn} onClick={handleMarkAsSold}>
                Mark as Sold
              </button>
            )}
          </div>
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
            <span style={styles.price}>
              {listing.listing_type === 'wanted'
                ? (listing.price > 0 ? `Budget: £${parseFloat(listing.price).toFixed(2)}` : 'Budget: Open')
                : `£${parseFloat(listing.price).toFixed(2)}`}
            </span>
          </div>


          {/* Badges */}
          <div style={styles.badges}>
            {listing.listing_type === 'wanted' && (
              <span style={styles.wantedBadge}>🔍 WANTED</span>
            )}
            <span style={styles.badge}>🏷️ {listing.categories?.name}</span>
            {listing.condition && (
              <span style={styles.badge}>📦 {listing.condition.replace('_', ' ')}</span>
            )}
            {listing.pickup_location && (
              <span style={styles.badge}>📍 {listing.pickup_location}</span>
            )}
            {listing.brand && (
              <span style={styles.badge}>🏷 {listing.brand}</span>
            )}
            {listing.item_size && (
              <span style={styles.badge}>📐 Size: {listing.item_size}</span>
            )}
            {listing.views > 0 && (
              <span style={styles.viewsBadge}>👁 {listing.views} view{listing.views !== 1 ? 's' : ''}</span>
            )}
            {listing.expires_at && (() => {
              const daysLeft = Math.ceil((new Date(listing.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
              if (isOwnListing) {
                if (daysLeft <= 0) {
                  return <span style={styles.expiryUrgentBadge}>⏱ Expired</span>
                }
                return (
                  <span style={daysLeft <= 7 ? styles.expiryUrgentBadge : styles.badge}>
                    ⏱ Expires {daysLeft <= 7
                      ? `in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
                      : new Date(listing.expires_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                  </span>
                )
              }
              if (daysLeft <= 7 && daysLeft > 0) {
                return <span style={styles.expiryUrgentBadge}>⚠ Expires in {daysLeft}d</span>
              }
              return null
            })()}
          </div>


          {/* Description */}
          {listing.description && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Description</h3>
              <p style={styles.description}>{listing.description}</p>
            </div>
          )}


          {/* Seller info */}
          <div
            style={{ ...styles.sellerBox, cursor: 'pointer' }}
            onClick={() => onViewSeller?.(listing.seller_id, listing.profiles)}
          >
            <div style={styles.sellerAvatar}>
              {listing.profiles?.full_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={styles.sellerName}>
                {listing.profiles?.full_name}
                <span style={styles.verifiedBadge}>✓ UoW Verified</span>
              </p>
              <p style={styles.sellerLabel}>
                {listing.listing_type === 'wanted'
                  ? `Looking to buy · ${listing.profiles?.role || 'student'}`
                  : `University of Westminster ${listing.profiles?.role || 'student'}`}
              </p>
              {sellerRating ? (
                <p style={styles.sellerRating}>
                  {[1,2,3,4,5].map(n => n <= Math.round(Number(sellerRating.avg)) ? '★' : '☆').join('')}
                  {' '}{sellerRating.avg}/5
                  <span style={styles.ratingCount}> ({sellerRating.count} review{sellerRating.count !== 1 ? 's' : ''})</span>
                </p>
              ) : (
                <p style={styles.noRating}>No ratings yet</p>
              )}
            </div>
            <span style={styles.sellerChevron}>›</span>
          </div>


          {/* Contact section */}
          {!isOwnListing && (() => {
            const isDealLocked = (listing.status === 'pending' || listing.status === 'sold') && listing.locked_buyer_id
            const isLockedBuyer = isDealLocked && listing.locked_buyer_id === session.user.id
            if (isDealLocked && !isLockedBuyer) {
              return (
                <div style={styles.dealLockedBox}>
                  <p style={styles.dealLockedText}>🤝 This item has been sold — no longer accepting offers</p>
                </div>
              )
            }
            if (isLockedBuyer) {
              return (
                <div style={styles.dealAcceptedBox}>
                  <p style={styles.dealAcceptedText}>✅ Your offer was accepted! Arrange collection via Messages.</p>
                </div>
              )
            }
            return null
          })()}

          {!isOwnListing && !listing.locked_buyer_id && listing.status !== 'sold' && (
            <div style={styles.contactSection}>
              <div style={styles.actionButtons}>
                <button style={styles.contactBtn} onClick={() => { setContactMode('message'); setShowContact(true) }}>
                  {listing.listing_type === 'wanted' ? '📦 I have this!' : '💬 Contact Seller'}
                </button>
                {listing.listing_type !== 'wanted' && (
                  <button style={styles.offerBtn} onClick={() => { setContactMode('offer'); setShowContact(true) }}>
                    💰 Make an Offer
                  </button>
                )}
              </div>
            </div>
          )}


          {isOwnListing && (
            <div style={styles.ownBox}>
              <p style={styles.ownText}>📝 This is your listing</p>
            </div>
          )}

          {relatedListings.length > 0 && (
            <div style={styles.relatedSection}>
              <h3 style={styles.sectionTitle}>More in this category</h3>
              <div style={styles.relatedGrid}>
                {relatedListings.map(item => (
                  <div key={item.id} style={styles.relatedCard} onClick={() => onSelectListing?.(item)}>
                    <div style={styles.relatedImage}>
                      {item.image_urls?.length > 0
                        ? <img src={item.image_urls[0]} alt={item.title} style={styles.relatedImg} />
                        : <span style={styles.relatedNoImg}>—</span>}
                    </div>
                    <p style={styles.relatedTitle}>{item.title}</p>
                    <p style={styles.relatedPrice}>
                      {item.listing_type === 'wanted'
                        ? (item.price > 0 ? `Budget: £${parseFloat(item.price).toFixed(2)}` : 'Wanted')
                        : `£${parseFloat(item.price).toFixed(2)}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {showReport && (
        <ReportListing
          listing={listing}
          session={session}
          onClose={() => setShowReport(false)}
        />
      )}

      {showContact && (
        <ContactSeller
          listing={listing}
          session={session}
          initialMode={contactMode}
          onClose={() => setShowContact(false)}
        />
      )}
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
  headerActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  shareBtn: {
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '0.4rem 0.8rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  saveBtn: {
    backgroundColor: 'transparent',
    color: '#4a1fb8',
    border: '1px solid #c4b5fd',
    borderRadius: '8px',
    padding: '0.4rem 0.8rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  },
  savedBtn: {
    backgroundColor: '#4a1fb8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.4rem 0.8rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  },
  reportBtn: {
    backgroundColor: 'transparent',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    padding: '0.4rem 0.8rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
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
  viewsBadge: {
    backgroundColor: '#f3f4f6',
    padding: '0.3rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    color: '#9ca3af',
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
  actionButtons: {
    display: 'flex',
    gap: '0.75rem',
  },
  contactBtn: {
    flex: 1,
    padding: '0.85rem',
    backgroundColor: '#4a1fb8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  offerBtn: {
    flex: 1,
    padding: '0.85rem',
    backgroundColor: 'white',
    color: '#4a1fb8',
    border: '2px solid #4a1fb8',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
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
  sellerRating: {
    margin: '0.25rem 0 0',
    fontSize: '0.85rem',
    color: '#f59e0b',
    fontWeight: 'bold',
  },
  ratingCount: {
    color: '#6b7280',
    fontWeight: 'normal',
    fontSize: '0.8rem',
  },
  noRating: {
    margin: '0.25rem 0 0',
    fontSize: '0.8rem',
    color: '#9ca3af',
  },
  sellerChevron: {
    fontSize: '1.4rem',
    color: '#9ca3af',
    alignSelf: 'center',
    flexShrink: 0,
  },
  dealLockedBox: {
    backgroundColor: '#fff7ed',
    border: '1px solid #fed7aa',
    borderRadius: '8px',
    padding: '1rem',
    textAlign: 'center',
    marginTop: '0.5rem',
  },
  dealLockedText: {
    color: '#92400e',
    margin: 0,
    fontWeight: 'bold',
    fontSize: '0.95rem',
  },
  dealAcceptedBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '1rem',
    textAlign: 'center',
    marginTop: '0.5rem',
  },
  dealAcceptedText: {
    color: '#166534',
    margin: 0,
    fontWeight: 'bold',
    fontSize: '0.95rem',
  },
  wantedBadge: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    padding: '0.3rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  },
  expiryUrgentBadge: {
    backgroundColor: '#fff7ed',
    color: '#c2410c',
    border: '1px solid #fed7aa',
    padding: '0.3rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  },
  verifiedBadge: {
    display: 'inline-block',
    backgroundColor: '#dcfce7',
    color: '#166534',
    fontSize: '0.7rem',
    padding: '2px 6px',
    borderRadius: '8px',
    fontWeight: 'bold',
    marginLeft: '6px',
    verticalAlign: 'middle',
  },
  relatedSection: {
    marginTop: '1.5rem',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '1.25rem',
  },
  relatedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
  },
  relatedCard: {
    borderRadius: '8px',
    border: '1px solid #f3f4f6',
    overflow: 'hidden',
    cursor: 'pointer',
    backgroundColor: '#fafafa',
    transition: 'box-shadow 0.15s',
  },
  relatedImage: {
    height: '90px',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  relatedImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  relatedNoImg: {
    fontSize: '1.5rem',
    color: '#d1d5db',
  },
  relatedTitle: {
    margin: '0.5rem 0.6rem 0.2rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#111827',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  relatedPrice: {
    margin: '0 0.6rem 0.6rem',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    color: '#4a1fb8',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  },
}


