import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function SellerProfile({ sellerId, sellerName, sellerRole, session, onClose, onSelectListing }) {
  const [ratings, setRatings] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [sellerId])

  const fetchData = async () => {
    setLoading(true)
    const [ratingsRes, listingsRes] = await Promise.all([
      supabase
        .from('ratings')
        .select('score, comment, created_at')
        .eq('rated_user_id', sellerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('listings')
        .select('*, profiles(full_name, role), categories(name, slug)')
        .eq('seller_id', sellerId)
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
    ])
    if (!ratingsRes.error) setRatings(ratingsRes.data || [])
    if (!listingsRes.error) setListings(listingsRes.data || [])
    setLoading(false)
  }

  const avgRating = ratings.length > 0
    ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1)
    : null

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        <div style={styles.header}>
          <button style={styles.backBtn} onClick={onClose}>← Back</button>
          <h2 style={styles.headerTitle}>Seller Profile</h2>
        </div>

        <div style={styles.sellerHero}>
          <div style={styles.avatar}>{sellerName?.[0]?.toUpperCase() || '?'}</div>
          <div>
            <p style={styles.sellerName}>{sellerName}</p>
            <p style={styles.sellerRole}>University of Westminster {sellerRole || 'student'}</p>
            {avgRating ? (
              <p style={styles.rating}>
                {[1,2,3,4,5].map(n => n <= Math.round(Number(avgRating)) ? '★' : '☆').join('')}
                {' '}{avgRating}/5
                <span style={styles.ratingCount}> ({ratings.length} review{ratings.length !== 1 ? 's' : ''})</span>
              </p>
            ) : (
              <p style={styles.noRating}>No ratings yet</p>
            )}
          </div>
        </div>

        <div style={styles.content}>

          <h3 style={styles.sectionTitle}>
            Active listings ({loading ? '...' : listings.length})
          </h3>
          {loading ? (
            <p style={styles.muted}>Loading...</p>
          ) : listings.length === 0 ? (
            <p style={styles.muted}>No active listings</p>
          ) : (
            <div style={styles.listingGrid}>
              {listings.map(l => (
                <div key={l.id} style={styles.listingCard} onClick={() => onSelectListing(l)}>
                  <div style={styles.listingImgWrap}>
                    {l.image_urls?.length > 0
                      ? <img src={l.image_urls[0]} alt={l.title} style={styles.listingImg} />
                      : <div style={styles.noImg}>📦</div>}
                  </div>
                  <div style={styles.listingBody}>
                    <p style={styles.listingTitle}>{l.title}</p>
                    <p style={styles.listingPrice}>
                      {l.listing_type === 'wanted'
                        ? (l.price > 0 ? `Budget: £${parseFloat(l.price).toFixed(2)}` : 'Wanted')
                        : `£${parseFloat(l.price).toFixed(2)}`}
                    </p>
                    <p style={styles.listingCategory}>{l.categories?.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 style={{ ...styles.sectionTitle, marginTop: '1.5rem' }}>
            Reviews ({loading ? '...' : ratings.length})
          </h3>
          {loading ? (
            <p style={styles.muted}>Loading...</p>
          ) : ratings.length === 0 ? (
            <p style={styles.muted}>No reviews yet</p>
          ) : (
            <div style={styles.reviewsList}>
              {ratings.map((r, i) => (
                <div key={i} style={styles.reviewCard}>
                  <span style={styles.reviewStars}>
                    {[1,2,3,4,5].map(n => n <= r.score ? '★' : '☆').join('')}
                  </span>
                  {r.comment && <p style={styles.reviewComment}>{r.comment}</p>}
                </div>
              ))}
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
    zIndex: 1010,
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
    alignItems: 'center',
    gap: '1rem',
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
  headerTitle: {
    margin: 0,
    fontSize: '1.1rem',
    color: '#111827',
  },
  sellerHero: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
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
    fontSize: '1.5rem',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  sellerName: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#111827',
  },
  sellerRole: {
    margin: '0.15rem 0 0',
    fontSize: '0.85rem',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  rating: {
    margin: '0.25rem 0 0',
    fontSize: '0.9rem',
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
  content: {
    padding: '1.5rem',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#374151',
    margin: '0 0 0.75rem',
  },
  muted: {
    color: '#9ca3af',
    fontSize: '0.9rem',
    margin: 0,
  },
  listingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '0.75rem',
  },
  listingCard: {
    backgroundColor: 'white',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s',
  },
  listingImgWrap: {
    height: '110px',
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
  },
  listingImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  noImg: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    fontSize: '2rem',
  },
  listingBody: {
    padding: '0.5rem 0.75rem',
  },
  listingTitle: {
    margin: 0,
    fontSize: '0.85rem',
    fontWeight: 'bold',
    color: '#111827',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  listingPrice: {
    margin: '0.2rem 0 0',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#4a1fb8',
  },
  listingCategory: {
    margin: '0.15rem 0 0',
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  reviewsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  reviewCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
  },
  reviewStars: {
    fontSize: '1rem',
    color: '#f59e0b',
    fontWeight: 'bold',
  },
  reviewComment: {
    margin: '0.35rem 0 0',
    fontSize: '0.9rem',
    color: '#374151',
    lineHeight: '1.5',
  },
}
