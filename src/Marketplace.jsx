import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import PostListing from './PostListing'
import ListingDetail from './ListingDetail'
import Messages from './Messages'
import Profile from './Profile'
import SellerProfile from './SellerProfile'

const CATEGORIES = [
  { label: 'All', value: 'all' },
  { label: 'Books & Notes', value: 'books' },
  { label: 'Electronics', value: 'electronics' },
  { label: 'Furniture', value: 'furniture' },
  { label: 'Clothing', value: 'clothing' },
  { label: 'Sports & Fitness', value: 'sports' },
  { label: 'Stationery', value: 'stationery' },
  { label: 'Kitchen & Home', value: 'kitchen' },
  { label: 'Other', value: 'other' },
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
  const [unreadCount, setUnreadCount] = useState(0)
  const [viewMode, setViewMode] = useState('active')
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [sortBy, setSortBy] = useState('newest')
  const [conditionFilter, setConditionFilter] = useState('all')
  const [postedWithin, setPostedWithin] = useState('any')
  const [hasPhotosOnly, setHasPhotosOnly] = useState(false)
  const [savedOnly, setSavedOnly] = useState(false)
  const [locationFilter, setLocationFilter] = useState('')

  useEffect(() => {
    fetchListings()
    fetchSavedItems()
  }, [category, viewMode])

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchListings = async () => {
    setLoading(true)
    const categoryJoin = category !== 'all'
      ? 'categories!inner(name, slug)'
      : 'categories(name, slug)'
    let query = supabase
      .from('listings')
      .select(`*, profiles(full_name, role), ${categoryJoin}`)
      .order('created_at', { ascending: false })

    if (viewMode === 'sold') {
      query = query
        .in('status', ['sold', 'pending'])
        .or('listing_type.eq.sell,listing_type.is.null')
    } else if (viewMode === 'wanted') {
      query = query
        .eq('status', 'active')
        .eq('listing_type', 'wanted')
    } else {
      const now = new Date().toISOString()
      query = query
        .eq('status', 'active')
        .or('listing_type.eq.sell,listing_type.is.null')
        .or(`expires_at.is.null,expires_at.gt.${now}`)
    }

    if (category !== 'all') {
      query = query.eq('categories.slug', category)
    }

    const { data, error } = await query
    if (!error) setListings(data || [])
    setLoading(false)
  }

  const fetchUnreadCount = async () => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', session.user.id)
      .eq('is_read', false)
    setUnreadCount(count || 0)
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

  const filtered = listings
    .filter(l => {
      const matchesSearch = l.title?.toLowerCase().includes(search.toLowerCase())
      const matchesMin = minPrice === '' || parseFloat(l.price) >= parseFloat(minPrice)
      const matchesMax = maxPrice === '' || parseFloat(l.price) <= parseFloat(maxPrice)
      const matchesCondition = conditionFilter === 'all' || l.listing_type === 'wanted' || l.condition === conditionFilter
      const matchesPhotos = !hasPhotosOnly || (l.image_urls?.length > 0)
      const matchesSaved = !savedOnly || savedItems.includes(l.id)
      const matchesLocation = locationFilter === '' || l.pickup_location?.toLowerCase().includes(locationFilter.toLowerCase())
      let matchesPosted = true
      if (postedWithin !== 'any') {
        const ms = postedWithin === 'today' ? 86400000 : postedWithin === 'week' ? 604800000 : 2592000000
        matchesPosted = (Date.now() - new Date(l.created_at).getTime()) <= ms
      }
      return matchesSearch && matchesMin && matchesMax && matchesCondition && matchesPhotos && matchesSaved && matchesLocation && matchesPosted
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return parseFloat(a.price) - parseFloat(b.price)
      if (sortBy === 'price_desc') return parseFloat(b.price) - parseFloat(a.price)
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      return new Date(b.created_at) - new Date(a.created_at)
    })

  const clearFilters = () => {
    setMinPrice('')
    setMaxPrice('')
    setSearch('')
    setCategory('all')
    setSortBy('newest')
    setConditionFilter('all')
    setPostedWithin('any')
    setHasPhotosOnly(false)
    setSavedOnly(false)
    setLocationFilter('')
  }

  const hasActiveFilters = minPrice !== '' || maxPrice !== '' || search !== '' || category !== 'all' || conditionFilter !== 'all' || postedWithin !== 'any' || hasPhotosOnly || savedOnly || locationFilter !== ''

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logoWrapper}>
          <img
            src="/westminster-logo.png"
            alt="University of Westminster"
            style={styles.uniLogo}
          />
          <span style={styles.logoDivider}>|</span>
          <span style={styles.logoMarketplace}>Marketplace</span>
        </div>
        <div style={styles.headerRight} className="mp-header-right">
          <span style={styles.email} className="mp-email">{session.user.email}</span>
          <button style={styles.profileBtn} onClick={() => setShowProfile(true)}>
            Profile
          </button>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button style={styles.messagesBtn} onClick={() => setShowMessages(true)}>
              Messages
            </button>
            {unreadCount > 0 && (
              <span style={styles.unreadBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </div>
          <button style={styles.logoutBtn} onClick={() => supabase.auth.signOut()}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={styles.hero} className="mp-hero">
        <h2 style={styles.heroText}>Buy &amp; sell within the University of Westminster community</h2>
        <div style={styles.searchRow}>
          <input
            style={styles.search}
            placeholder="Search listings…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            style={showFilters ? styles.filterBtnActive : styles.filterBtn}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters{hasActiveFilters ? ' ·' : ''}
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
                  Clear all
                </button>
              )}
            </div>
            {viewMode !== 'wanted' && (
              <div style={styles.condFilterRow}>
                <span style={styles.filterLabel}>Condition</span>
                {[
                  { label: 'Any', value: 'all' },
                  { label: 'New', value: 'new' },
                  { label: 'Like New', value: 'like_new' },
                  { label: 'Good', value: 'good' },
                  { label: 'Fair', value: 'fair' },
                  { label: 'Poor', value: 'poor' },
                ].map(c => (
                  <button
                    key={c.value}
                    style={conditionFilter === c.value ? styles.condFilterBtnActive : styles.condFilterBtn}
                    onClick={() => setConditionFilter(c.value)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
            <div style={styles.condFilterRow}>
              <span style={styles.filterLabel}>Posted</span>
              {[
                { label: 'Any time', value: 'any' },
                { label: 'Today', value: 'today' },
                { label: 'This week', value: 'week' },
                { label: 'This month', value: 'month' },
              ].map(p => (
                <button
                  key={p.value}
                  style={postedWithin === p.value ? styles.condFilterBtnActive : styles.condFilterBtn}
                  onClick={() => setPostedWithin(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div style={styles.condFilterRow}>
              <span style={styles.filterLabel}>Show</span>
              <button
                style={hasPhotosOnly ? styles.condFilterBtnActive : styles.condFilterBtn}
                onClick={() => setHasPhotosOnly(!hasPhotosOnly)}
              >
                Photos only
              </button>
              <button
                style={savedOnly ? styles.condFilterBtnActive : styles.condFilterBtn}
                onClick={() => setSavedOnly(!savedOnly)}
              >
                Saved only
              </button>
              <div style={styles.filterField}>
                <input
                  style={styles.locationInput}
                  placeholder="Pickup location…"
                  value={locationFilter}
                  onChange={e => setLocationFilter(e.target.value)}
                />
              </div>
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

      {/* Active / Wanted / Sold tabs */}
      <div style={styles.viewTabs}>
        <button
          style={viewMode === 'active' ? styles.viewTabActive : styles.viewTab}
          onClick={() => setViewMode('active')}
        >
          Active
        </button>
        <button
          style={viewMode === 'wanted' ? styles.viewTabWantedActive : styles.viewTab}
          onClick={() => setViewMode('wanted')}
        >
          Wanted
        </button>
        <button
          style={viewMode === 'sold' ? styles.viewTabActive : styles.viewTab}
          onClick={() => setViewMode('sold')}
        >
          Sold
        </button>
      </div>

      {!loading && (
        <div style={styles.resultsBar}>
          <span style={styles.resultsText}>
            {filtered.length} listing{filtered.length !== 1 ? 's' : ''} found
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {hasActiveFilters && (
              <button style={styles.clearFiltersLink} onClick={clearFilters}>
                Clear filters
              </button>
            )}
            <select
              style={styles.sortSelect}
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>
        </div>
      )}

      {/* Listings */}
      <div style={styles.content} className="mp-content">
        {loading ? (
          <p style={styles.empty}>Loading listings…</p>
        ) : filtered.length === 0 ? (
          <div style={styles.emptyBox}>
            <p style={styles.emptyTitle}>No listings found</p>
            <p style={styles.emptyText}>Try adjusting your filters or search.</p>
            {hasActiveFilters && (
              <button style={styles.clearBtn2} onClick={clearFilters}>Clear filters</button>
            )}
          </div>
        ) : (
          <div style={styles.grid} className="mp-grid">
            {filtered.map(listing => {
              const isWanted = listing.listing_type === 'wanted'
              const daysLeft = listing.expires_at
                ? Math.ceil((new Date(listing.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
                : null
              return (
                <div
                  key={listing.id}
                  style={isWanted ? { ...styles.card, ...styles.wantedCard } : styles.card}
                  onClick={() => setSelectedListing(listing)}
                >
                  <div style={styles.cardImage}>
                    {listing.image_urls?.length > 0 ? (
                      <img src={listing.image_urls[0]} alt={listing.title} style={styles.img} />
                    ) : (
                      <div style={styles.noImage}>{isWanted ? '?' : '—'}</div>
                    )}
                    {isWanted ? (
                      <span style={styles.wantedBadge}>WANTED</span>
                    ) : (
                      listing.condition && <span style={styles.conditionBadge}>{listing.condition.replace('_', ' ')}</span>
                    )}
                    {listing.status !== 'active' && (
                      <span style={listing.status === 'sold' ? styles.soldBadge : styles.pendingBadge}>
                        {listing.status === 'sold' ? 'Sold' : 'Pending'}
                      </span>
                    )}
                    {daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && (
                      <span style={styles.expiryBadge}>{daysLeft}d left</span>
                    )}
                    <button
                      style={styles.heartBtn}
                      onClick={e => toggleSave(e, listing.id)}
                      title={savedItems.includes(listing.id) ? 'Remove from saved' : 'Save listing'}
                    >
                      {savedItems.includes(listing.id) ? '❤️' : '♡'}
                    </button>
                  </div>
                  <div style={styles.cardBody}>
                    <p style={styles.cardTitle}>{listing.title}</p>
                    <p style={isWanted ? styles.cardBudget : styles.cardPrice}>
                      {isWanted ? (listing.price > 0 ? `Budget: £${parseFloat(listing.price).toFixed(2)}` : 'Budget: Open') : `£${parseFloat(listing.price).toFixed(2)}`}
                    </p>
                    <p style={styles.cardSeller}>
                      {listing.profiles?.full_name}
                      <span style={styles.verifiedBadge}>✓</span>
                    </p>
                    <p style={styles.cardCategory}>{listing.categories?.name}</p>
                    {listing.pickup_location && (
                      <p style={styles.cardLocation}>{listing.pickup_location}</p>
                    )}
                    {listing.views > 0 && (
                      <p style={styles.cardViews}>👁 {listing.views}</p>
                    )}
                  </div>
                </div>
              )
            })}
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
          onClose={() => {
            setShowMessages(false)
            fetchUnreadCount()
          }}
          onMessagesRead={fetchUnreadCount}
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
          onViewSeller={(sellerId, profiles) => setSelectedSeller({ id: sellerId, profiles })}
          onSelectListing={listing => setSelectedListing(listing)}
        />
      )}

      {selectedSeller && (
        <SellerProfile
          sellerId={selectedSeller.id}
          sellerName={selectedSeller.profiles?.full_name}
          sellerRole={selectedSeller.profiles?.role}
          session={session}
          onClose={() => setSelectedSeller(null)}
          onSelectListing={(listing) => {
            setSelectedSeller(null)
            setSelectedListing(listing)
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
  page: { minHeight: '100vh', backgroundColor: '#f9f2f4', paddingBottom: '5rem', fontFamily: "'Inter', system-ui, sans-serif" },
  header: { backgroundColor: '#3d0c1e', padding: '0.9rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' },
  logoWrapper: { display: 'flex', alignItems: 'center', gap: '0.85rem' },
  uniLogo: { height: '36px', width: 'auto', display: 'block', flexShrink: 0, filter: 'brightness(0) invert(1)' },
  logoDivider: { color: 'rgba(255,255,255,0.25)', fontSize: '1.4rem', fontWeight: 100, lineHeight: 1, userSelect: 'none', paddingBottom: '2px' },
  logoMarketplace: { color: '#c9a84c', fontSize: '1.1rem', fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  email: { color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', letterSpacing: '0.02em' },
  profileBtn: { backgroundColor: 'transparent', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '3px', padding: '0.3rem 0.85rem', cursor: 'pointer', fontSize: '0.78rem', letterSpacing: '0.05em' },
  messagesBtn: { backgroundColor: 'transparent', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '3px', padding: '0.3rem 0.85rem', cursor: 'pointer', fontSize: '0.78rem', letterSpacing: '0.05em' },
  unreadBadge: { position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#c9a84c', color: '#3d0c1e', borderRadius: '10px', padding: '1px 5px', fontSize: '0.65rem', fontWeight: 700, minWidth: '16px', textAlign: 'center', pointerEvents: 'none' },
  logoutBtn: { backgroundColor: 'transparent', color: 'rgba(255,255,255,0.45)', border: 'none', borderRadius: '3px', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '0.04em' },
  hero: { backgroundColor: '#3d0c1e', padding: '2rem 2rem 3rem', textAlign: 'center' },
  heroText: { color: 'rgba(255,255,255,0.88)', margin: '0 0 1.5rem', fontSize: '1.6rem', fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400, letterSpacing: '0.02em' },
  searchRow: { display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' },
  search: { flex: 1, maxWidth: '480px', padding: '0.8rem 1.25rem', borderRadius: '3px', border: 'none', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none', backgroundColor: 'rgba(255,255,255,0.96)', color: '#1a0810' },
  filterBtn: { padding: '0.8rem 1.25rem', borderRadius: '3px', border: '1px solid rgba(201,168,76,0.4)', backgroundColor: 'rgba(201,168,76,0.08)', color: '#c9a84c', cursor: 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap', letterSpacing: '0.08em', textTransform: 'uppercase' },
  filterBtnActive: { padding: '0.8rem 1.25rem', borderRadius: '3px', border: '1px solid #c9a84c', backgroundColor: 'rgba(201,168,76,0.18)', color: '#c9a84c', cursor: 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 },
  filterPanel: { marginTop: '1.25rem', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '3px', padding: '1rem 1.5rem', display: 'inline-block', border: '1px solid rgba(255,255,255,0.12)' },
  filterRow: { display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' },
  filterField: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  filterLabel: { color: 'rgba(255,255,255,0.6)', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' },
  filterInput: { padding: '0.5rem 0.75rem', borderRadius: '3px', border: 'none', fontSize: '0.9rem', width: '110px', outline: 'none' },
  filterDivider: { color: 'rgba(255,255,255,0.3)', fontSize: '1rem', paddingBottom: '0.4rem' },
  clearBtn: { padding: '0.5rem 1rem', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.25)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontSize: '0.75rem', alignSelf: 'flex-end', letterSpacing: '0.05em' },
  categories: { display: 'flex', gap: '0.4rem', padding: '0.85rem 2rem', overflowX: 'auto', backgroundColor: 'white', borderBottom: '1px solid #f0e3e8' },
  catBtn: { padding: '0.32rem 0.9rem', borderRadius: '2px', border: '1px solid #e8d5da', backgroundColor: 'white', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.78rem', color: '#4a1e2a', letterSpacing: '0.04em' },
  activeCat: { padding: '0.32rem 0.9rem', borderRadius: '2px', border: '1px solid #3d0c1e', backgroundColor: '#3d0c1e', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'white', fontWeight: 500, letterSpacing: '0.04em' },
  resultsBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 2rem', backgroundColor: '#f9f2f4', borderBottom: '1px solid #f0e3e8' },
  resultsText: { fontSize: '0.75rem', color: '#9b7a82', letterSpacing: '0.05em' },
  clearFiltersLink: { fontSize: '0.75rem', color: '#8b2244', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', letterSpacing: '0.03em' },
  content: { padding: '1.75rem 2rem' },
  empty: { textAlign: 'center', color: '#9b7a82', marginTop: '3rem', letterSpacing: '0.03em' },
  emptyBox: { textAlign: 'center', marginTop: '4rem' },
  emptyTitle: { fontSize: '1.4rem', fontWeight: 500, color: '#4a1e2a', fontFamily: "'Cormorant Garamond', Georgia, serif", marginBottom: '0.5rem' },
  emptyText: { color: '#9b7a82', fontSize: '0.875rem' },
  clearBtn2: { marginTop: '1.25rem', padding: '0.6rem 1.75rem', backgroundColor: '#3d0c1e', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1.25rem' },
  card: { backgroundColor: 'white', borderRadius: '5px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(61,12,30,0.06), 0 4px 14px rgba(61,12,30,0.05)', cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.15s', border: '1px solid #f2e6ea' },
  cardImage: { position: 'relative', height: '185px', backgroundColor: '#faf0f3' },
  img: { width: '100%', height: '100%', objectFit: 'cover' },
  noImage: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '1.5rem', color: '#c4a8b0', fontFamily: "'Cormorant Garamond', Georgia, serif" },
  conditionBadge: { position: 'absolute', top: '8px', right: '8px', backgroundColor: 'rgba(61,12,30,0.75)', color: 'white', fontSize: '0.6rem', padding: '3px 8px', borderRadius: '2px', textTransform: 'uppercase', letterSpacing: '0.07em' },
  heartBtn: { position: 'absolute', top: '8px', left: '8px', backgroundColor: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' },
  cardBody: { padding: '0.85rem 1rem 1rem' },
  cardTitle: { fontWeight: 500, margin: '0 0 0.4rem', fontSize: '0.88rem', color: '#1a0810', lineHeight: '1.35' },
  cardPrice: { color: '#c9a84c', fontWeight: 600, fontSize: '1.05rem', margin: '0 0 0.4rem', fontFamily: "'Cormorant Garamond', Georgia, serif" },
  cardSeller: { color: '#9b7a82', fontSize: '0.73rem', margin: '0 0 0.2rem' },
  cardCategory: { color: '#9b7a82', fontSize: '0.73rem', margin: 0 },
  fab: { position: 'fixed', bottom: '2rem', right: '2rem', backgroundColor: '#c9a84c', color: '#3d0c1e', border: 'none', borderRadius: '3px', padding: '0.85rem 1.75rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 18px rgba(201,168,76,0.4)', letterSpacing: '0.06em' },
  viewTabs: { display: 'flex', gap: 0, padding: '0 2rem', backgroundColor: 'white', borderBottom: '1px solid #f0e3e8' },
  viewTab: { padding: '0.75rem 1.5rem', border: 'none', borderBottom: '2px solid transparent', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.75rem', color: '#9b7a82', fontWeight: 400, letterSpacing: '0.08em', textTransform: 'uppercase' },
  viewTabActive: { padding: '0.75rem 1.5rem', border: 'none', borderBottom: '2px solid #3d0c1e', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.75rem', color: '#3d0c1e', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' },
  soldBadge: { position: 'absolute', bottom: '8px', left: '8px', backgroundColor: 'rgba(22,163,74,0.82)', color: 'white', fontSize: '0.6rem', padding: '3px 8px', borderRadius: '2px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' },
  pendingBadge: { position: 'absolute', bottom: '8px', left: '8px', backgroundColor: 'rgba(217,119,6,0.82)', color: 'white', fontSize: '0.6rem', padding: '3px 8px', borderRadius: '2px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' },
  wantedCard: { border: '1px solid #c3d9ff', backgroundColor: '#f0f6ff' },
  wantedBadge: { position: 'absolute', top: '8px', right: '8px', backgroundColor: '#3b82f6', color: 'white', fontSize: '0.6rem', padding: '3px 8px', borderRadius: '2px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' },
  expiryBadge: { position: 'absolute', bottom: '8px', right: '8px', backgroundColor: 'rgba(217,119,6,0.82)', color: 'white', fontSize: '0.6rem', padding: '3px 8px', borderRadius: '2px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' },
  cardBudget: { color: '#3b82f6', fontWeight: 600, fontSize: '1rem', margin: '0 0 0.3rem', fontFamily: "'Cormorant Garamond', Georgia, serif" },
  cardLocation: { color: '#9b7a82', fontSize: '0.73rem', margin: '0.2rem 0 0' },
  cardViews: { color: '#c4a8b0', fontSize: '0.68rem', margin: '0.15rem 0 0' },
  verifiedBadge: { display: 'inline-block', backgroundColor: '#edf7ec', color: '#2a6b2a', fontSize: '0.6rem', padding: '1px 5px', borderRadius: '2px', fontWeight: 600, marginLeft: '4px', verticalAlign: 'middle', letterSpacing: '0.03em' },
  viewTabWantedActive: { padding: '0.75rem 1.5rem', border: 'none', borderBottom: '2px solid #3b82f6', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' },
  condFilterRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.85rem', flexWrap: 'wrap', justifyContent: 'center' },
  condFilterBtn: { padding: '0.3rem 0.75rem', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontSize: '0.72rem', letterSpacing: '0.05em' },
  condFilterBtnActive: { padding: '0.3rem 0.75rem', borderRadius: '2px', border: '1px solid #c9a84c', backgroundColor: 'rgba(201,168,76,0.18)', color: '#c9a84c', cursor: 'pointer', fontSize: '0.72rem', letterSpacing: '0.05em', fontWeight: 600 },
  locationInput: { padding: '0.3rem 0.65rem', borderRadius: '2px', border: 'none', fontSize: '0.75rem', width: '160px', outline: 'none', backgroundColor: 'rgba(255,255,255,0.92)', color: '#1a0810' },
  sortSelect: { padding: '0.3rem 0.6rem', borderRadius: '3px', border: '1px solid #e8d5da', backgroundColor: 'white', fontSize: '0.72rem', color: '#4a1e2a', cursor: 'pointer', outline: 'none', letterSpacing: '0.03em' },
}
