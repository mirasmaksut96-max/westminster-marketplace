import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import PostListing from './PostListing'
import ListingDetail from './ListingDetail'
import Messages from './Messages'
import Profile from './Profile'

const CATEGORIES = [
  { label: 'All', value: 'all' },
  { label: '📚 Books', value: 'books' },
  { label: '💻 Electronics', value: 'electronics' },
  { label: '🪑 Furniture', value: 'furniture' },
  { label: '👕 Clothing', value: 'clothing' },
  { label: '🏋️ Sports', value: 'sports' },
  { label: '✏️ Stationery', value: 'stationery' },
  { label: '🍳 Kitchen', value: 'kitchen' },
  { label: '📦 Other', value: 'other' },
]

export default function Marketplace({ session }) {
  const [showPost, setShowPost] = useState(false)
  const [selectedListing, setSelectedListing] = useState(null)
  const [showMessages, setShowMessages] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [listings, setListings] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [savedItems, setSavedItems] = useState([])
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchListings()
    fetchSavedItems()
  }, [category])

  const fetchListings = async () => {
    setLoading(true)
    let query = supabase
      .from('listings')
      .select('*, profiles(full_name), categories(name, slug)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (category !== 'all') {
      query = query.eq('categories.slug', category)
    }

    const { data, error } = await query
    if (!error) setListings(data || [])
    setLoading(false)
  }

  const fetchSavedItems = async () => {
    const { data, error } = await supabase
      .from('saved_items')
      .select('listing_id')
      .eq('user_id', session.user.id)

    if (!error && data) {
      setSavedItems(data.map(item => item.listing_id))
    }
  }

  const toggleSave = async (e, listingId) => {
    e.stopPropagation()
    const isSaved = savedItems.includes(listingId)

    if (isSaved) {
      await supabase
        .from('saved_items')
        .delete()
        .eq('user_id', session.user.id)
        .eq('listing_id', listingId)
      setSavedItems(savedItems.filter(id => id !== listingId))
    } else {
      await supabase
        .from('saved_items')
        .insert({ user_id: session.user.id, listing_id: listingId })
      setSavedItems([...savedItems, listingId])
    }
  }

  const filtered = listings.filter(l => {
    const matchesSearch = l.title?.toLowerCase().includes(search.toLowerCase())
    const matchesMin = minPrice === '' || parseFloat(l.price) >= parseFloat(minPrice)
    const matchesMax = maxPrice === '' || parseFloat(l.price) <= parseFloat(maxPrice)
    return matchesSearch && matchesMin && matchesMax
  })

  const clearFilters = () => {
    setMinPrice('')
    setMaxPrice('')
    setSearch('')
    setCategory('all')
  }

  const hasActiveFilters = minPrice !== '' || maxPrice !== '' || search !== '' || category !== 'all'

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.logo}>🎓 Westminster Marketplace</h1>
        <div style={styles.headerRight}>
          <span style={styles.email}>{session.user.email}</span>
          <button style={styles.profileBtn} onClick={() => setShowProfile(true)}>
            👤 Profile
          </button>
          <button style={styles.messagesBtn} onClick={() => setShowMessages(true)}>
            📨 Messages
          </button>
          <button style={styles.logoutBtn} onClick={() => supabase.auth.signOut()}>
            Log out
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={styles.hero}>
        <h2 style={styles.heroText}>Buy & sell within Westminster</h2>
        <div style={styles.searchRow}>
          <input
            style={styles.search}
            placeholder="🔍  Search listings..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            style={showFilters ? styles.filterBtnActive : styles.filterBtn}
            onClick={() => setShowFilters(!showFilters)}
          >
            🎚️ Filters {hasActiveFilters ? '●' : ''}
          </button>
        </div>

        {showFilters && (
          <div style={styles.filterPanel}>
            <div style={styles.filterRow}>
              <div style={styles.filterField}>
                <label style={styles.filterLabel}>Min price (£)</label>
                <input
                  style={styles.filterInput}
                  type="number"
                  placeholder="0"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  min="0"
                />
              </div>
              <div style={styles.filterDivider}>—</div>
              <div style={styles.filterField}>
                <label style={styles.filterLabel}>Max price (£)</label>
                <input
                  style={styles.filterInput}
                  type="number"
                  placeholder="Any"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  min="0"
                />
              </div>
              {hasActiveFilters && (
                <button style={styles.clearBtn} onClick={clearFilters}>
                  ✕ Clear all
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Categories */}
      <div style={styles.categories}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            style={category === cat.value ? styles.activeCat : styles.catBtn}
            onClick={() => setCategory(cat.value)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {!loading && (
        <div style={styles.resultsBar}>
          <span style={styles.resultsText}>
            {filtered.length} listing{filtered.length !== 1 ? 's' : ''} found
          </span>
          {hasActiveFilters && (
            <button style={styles.clearFiltersLink} onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Listings */}
      <div style={styles.content}>
        {loading ? (
          <p style={styles.empty}>Loading listings...</p>
        ) : filtered.length === 0 ? (
          <div style={styles.emptyBox}>
            <p style={styles.emptyTitle}>No listings found!</p>
            <p style={styles.emptyText}>Try adjusting your filters or search.</p>
            {hasActiveFilters && (
              <button style={styles.clearBtn2} onClick={clearFilters}>Clear filters</button>
            )}
          </div>
        ) : (
          <div style={styles.grid}>
            {filtered.map(listing => (
              <div key={listing.id} style={styles.card} onClick={() => setSelectedListing(listing)}>
                <div style={styles.cardImage}>
                  {listing.image_urls?.length > 0 ? (
                    <img src={listing.image_urls[0]} alt={listing.title} style={styles.img} />
                  ) : (
                    <div style={styles.noImage}>📦</div>
                  )}
                  <span style={styles.conditionBadge}>{listing.condition?.replace('_', ' ')}</span>
                  <button
                    style={styles.heartBtn}
                    onClick={e => toggleSave(e, listing.id)}
                    title={savedItems.includes(listing.id) ? 'Remove from saved' : 'Save listing'}
                  >
                    {savedItems.includes(listing.id) ? '❤️' : '🤍'}
                  </button>
                </div>
                <div style={styles.cardBody}>
                  <p style={styles.cardTitle}>{listing.title}</p>
                  <p style={styles.cardPrice}>£{parseFloat(listing.price).toFixed(2)}</p>
                  <p style={styles.cardSeller}>👤 {listing.profiles?.full_name}</p>
                  <p style={styles.cardCategory}>🏷️ {listing.categories?.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showProfile && (
        <Profile
          session={session}
          onClose={() => {
            setShowProfile(false)
            fetchListings()
          }}
        />
      )}

      {showMessages && (
        <Messages
          session={session}
          onClose={() => setShowMessages(false)}
        />
      )}

      {selectedListing && (
        <ListingDetail
          listing={selectedListing}
          session={session}
          onClose={() => {
            setSelectedListing(null)
            fetchListings()
          }}
        />
      )}

      {showPost && (
        <PostListing
          session={session}
          onClose={() => setShowPost(false)}
          onPosted={() => fetchListings()}
        />
      )}

      <button style={styles.fab} onClick={() => setShowPost(true)}>+ Post Item</button>

    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#f3f4f6', paddingBottom: '5rem', fontFamily: 'sans-serif' },
  header: { backgroundColor: '#4a1fb8', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' },
  logo: { color: 'white', margin: 0, fontSize: '1.3rem' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' },
  email: { color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' },
  profileBtn: { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' },
  messagesBtn: { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' },
  hero: { backgroundColor: '#4a1fb8', padding: '1.5rem 2rem 2.5rem', textAlign: 'center' },
  heroText: { color: 'white', margin: '0 0 1rem', fontSize: '1.4rem' },
  searchRow: { display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' },
  search: { flex: 1, maxWidth: '460px', padding: '0.75rem 1rem', borderRadius: '25px', border: 'none', fontSize: '1rem', boxSizing: 'border-box', outline: 'none' },
  filterBtn: { padding: '0.75rem 1.25rem', borderRadius: '25px', border: '2px solid rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap' },
  filterBtnActive: { padding: '0.75rem 1.25rem', borderRadius: '25px', border: '2px solid white', backgroundColor: 'rgba(255,255,255,0.3)', color: 'white', cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap', fontWeight: 'bold' },
  filterPanel: { marginTop: '1rem', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '1rem 1.5rem', display: 'inline-block' },
  filterRow: { display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' },
  filterField: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  filterLabel: { color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem', fontWeight: 'bold' },
  filterInput: { padding: '0.5rem 0.75rem', borderRadius: '8px', border: 'none', fontSize: '0.95rem', width: '110px', outline: 'none' },
  filterDivider: { color: 'white', fontSize: '1.2rem', paddingBottom: '0.4rem' },
  clearBtn: { padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', fontSize: '0.85rem', alignSelf: 'flex-end' },
  categories: { display: 'flex', gap: '0.5rem', padding: '1rem 2rem', overflowX: 'auto', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' },
  catBtn: { padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.9rem', color: '#374151' },
  activeCat: { padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid #4a1fb8', backgroundColor: '#4a1fb8', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.9rem', color: 'white', fontWeight: 'bold' },
  resultsBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 2rem', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  resultsText: { fontSize: '0.9rem', color: '#6b7280' },
  clearFiltersLink: { fontSize: '0.85rem', color: '#4a1fb8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' },
  content: { padding: '1.5rem 2rem' },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: '3rem' },
  emptyBox: { textAlign: 'center', marginTop: '4rem' },
  emptyTitle: { fontSize: '1.3rem', fontWeight: 'bold', color: '#374151' },
  emptyText: { color: '#6b7280' },
  clearBtn2: { marginTop: '1rem', padding: '0.5rem 1.5rem', backgroundColor: '#4a1fb8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' },
  card: { backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'transform 0.2s' },
  cardImage: { position: 'relative', height: '180px', backgroundColor: '#f9fafb' },
  img: { width: '100%', height: '100%', objectFit: 'cover' },
  noImage: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '3rem' },
  conditionBadge: { position: 'absolute', top: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', textTransform: 'capitalize' },
  heartBtn: { position: 'absolute', top: '8px', left: '8px', backgroundColor: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' },
  cardBody: { padding: '0.75rem' },
  cardTitle: { fontWeight: 'bold', margin: '0 0 0.3rem', fontSize: '0.95rem', color: '#111827' },
  cardPrice: { color: '#4a1fb8', fontWeight: 'bold', fontSize: '1.1rem', margin: '0 0 0.3rem' },
  cardSeller: { color: '#6b7280', fontSize: '0.8rem', margin: '0 0 0.2rem' },
  cardCategory: { color: '#6b7280', fontSize: '0.8rem', margin: 0 },
  fab: { position: 'fixed', bottom: '2rem', right: '2rem', backgroundColor: '#4a1fb8', color: 'white', border: 'none', borderRadius: '25px', padding: '0.85rem 1.5rem', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(74,31,184,0.4)' },
}