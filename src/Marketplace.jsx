import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import PostListing from './PostListing'
import ListingDetail from './ListingDetail'
import Messages from './Messages'
import Profile from './Profile'
import SellerProfile from './SellerProfile'
import ContactAdmin, { ADMIN_ID } from './ContactAdmin'
import AdminDashboard from './AdminDashboard'
import Guidelines from './Guidelines'

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

const PAGE_SIZE = 24

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

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
  const [showContactAdmin, setShowContactAdmin] = useState(false)
  const [showGuidelines, setShowGuidelines] = useState(false)
  const [showAdminDashboard, setShowAdminDashboard] = useState(false)
  const [pendingReportCount, setPendingReportCount] = useState(0)
  const [sortBy, setSortBy] = useState('newest')
  const [conditionFilter, setConditionFilter] = useState('all')
  const [postedWithin, setPostedWithin] = useState('any')
  const [hasPhotosOnly, setHasPhotosOnly] = useState(false)
  const [savedOnly, setSavedOnly] = useState(false)
  const [locationFilter, setLocationFilter] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const requestIdRef = useRef(0)

  const debouncedSearch = useDebouncedValue(search, 350)
  const debouncedMinPrice = useDebouncedValue(minPrice, 350)
  const debouncedMaxPrice = useDebouncedValue(maxPrice, 350)
  const debouncedLocationFilter = useDebouncedValue(locationFilter, 350)

  useEffect(() => {
    fetchSavedItems()
  }, [])

  useEffect(() => {
    fetchListings(0, true)
  }, [category, viewMode, debouncedSearch, debouncedMinPrice, debouncedMaxPrice,
      conditionFilter, postedWithin, hasPhotosOnly, savedOnly, debouncedLocationFilter, sortBy])

  useEffect(() => {
    if (session.user.id === ADMIN_ID) fetchPendingReportCount()
  }, [])

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchListings(pageNum = 0, replace = true, savedItemsOverride = null) {
    if (replace) setLoading(true)
    else setLoadingMore(true)
    const reqId = ++requestIdRef.current
    const effectiveSavedItems = savedItemsOverride ?? savedItems

    if (savedOnly && effectiveSavedItems.length === 0) {
      if (reqId === requestIdRef.current) {
        setListings([])
        setTotalCount(0)
        setPage(0)
      }
      setLoading(false)
      setLoadingMore(false)
      return
    }

    const categoryJoin = category !== 'all'
      ? 'categories!inner(name, slug)'
      : 'categories(name, slug)'
    let query = supabase
      .from('listings')
      .select(`*, profiles(full_name, role), ${categoryJoin}`, { count: 'exact' })
      .order(sortBy === 'price_asc' || sortBy === 'price_desc' ? 'price' : 'created_at',
        { ascending: sortBy === 'oldest' || sortBy === 'price_asc' })

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
    if (debouncedSearch) query = query.ilike('title', `%${debouncedSearch}%`)
    if (debouncedMinPrice !== '') query = query.gte('price', parseFloat(debouncedMinPrice))
    if (debouncedMaxPrice !== '') query = query.lte('price', parseFloat(debouncedMaxPrice))
    if (conditionFilter !== 'all') query = query.eq('condition', conditionFilter)
    if (hasPhotosOnly) query = query.gt('image_urls', '{}')
    if (debouncedLocationFilter) query = query.ilike('pickup_location', `%${debouncedLocationFilter}%`)
    if (postedWithin !== 'any') {
      const ms = postedWithin === 'today' ? 86400000 : postedWithin === 'week' ? 604800000 : 2592000000
      query = query.gte('created_at', new Date(Date.now() - ms).toISOString())
    }
    if (savedOnly) query = query.in('id', effectiveSavedItems)

    query = query.range(pageNum * PAGE_SIZE, pageNum * PAGE_SIZE + PAGE_SIZE - 1)

    const { data, error, count } = await query
    if (reqId !== requestIdRef.current) return

    if (!error) {
      setListings(prev => replace ? (data || []) : [...prev, ...(data || [])])
      setTotalCount(count ?? 0)
      setPage(pageNum)
    }
    setLoading(false)
    setLoadingMore(false)
  }

  async function fetchUnreadCount() {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', session.user.id)
      .eq('is_read', false)
    setUnreadCount(count || 0)
  }

  async function fetchPendingReportCount() {
    const { count } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    setPendingReportCount(count || 0)
  }

  const openListingById = async (listingId) => {
    const { data } = await supabase
      .from('listings')
      .select('*, profiles(full_name, role), categories(name, slug)')
      .eq('id', listingId)
      .maybeSingle()
    if (data) setSelectedListing(data)
  }

  async function fetchSavedItems() {
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
    const next = isSaved ? savedItems.filter(id => id !== listingId) : [...savedItems, listingId]

    if (isSaved) {
      await supabase
        .from('saved_items')
        .delete()
        .eq('user_id', session.user.id)
        .eq('listing_id', listingId)
    } else {
      await supabase
        .from('saved_items')
        .insert({ user_id: session.user.id, listing_id: listingId })
    }
    setSavedItems(next)
    if (savedOnly) fetchListings(0, true, next)
  }

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
          {session.user.id === ADMIN_ID && (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button style={styles.adminBtn} onClick={() => setShowAdminDashboard(true)}>
                Admin
              </button>
              {pendingReportCount > 0 && (
                <span style={styles.adminBadge}>{pendingReportCount}</span>
              )}
            </div>
          )}
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
            {totalCount} listing{totalCount !== 1 ? 's' : ''} found
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
        ) : listings.length === 0 ? (
          <div style={styles.emptyBox}>
            <p style={styles.emptyTitle}>No listings found</p>
            <p style={styles.emptyText}>Try adjusting your filters or search.</p>
            {hasActiveFilters && (
              <button style={styles.clearBtn2} onClick={clearFilters}>Clear filters</button>
            )}
          </div>
        ) : (
          <>
          <div style={styles.grid} className="mp-grid">
            {listings.map(listing => {
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
          {listings.length < totalCount && (
            <div style={styles.loadMoreWrap}>
              <button
                style={styles.loadMoreBtn}
                onClick={() => fetchListings(page + 1, false)}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load More'}
              </button>
            </div>
          )}
          </>
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
          onListingUpdated={fetchListings}
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

      {showContactAdmin && (
        <ContactAdmin
          session={session}
          onClose={() => setShowContactAdmin(false)}
        />
      )}

      {showGuidelines && (
        <Guidelines onClose={() => setShowGuidelines(false)} />
      )}

      {showAdminDashboard && (
        <AdminDashboard
          onClose={() => {
            setShowAdminDashboard(false)
            fetchPendingReportCount()
          }}
          onViewListingById={openListingById}
        />
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <p style={styles.footerBrand}>Westminster Marketplace</p>
        <p style={styles.footerNote}>
          A student marketplace for the University of Westminster community.
          All users must be registered UoW students or staff.
        </p>
        <div style={styles.footerLinks}>
          <button style={styles.footerContactBtn} onClick={() => setShowGuidelines(true)}>
            Community Guidelines
          </button>
          {session.user.id !== ADMIN_ID && (
            <button style={styles.footerContactBtn} onClick={() => setShowContactAdmin(true)}>
              Contact Admin
            </button>
          )}
          <a href="mailto:w2119141@my.westminster.ac.uk" style={styles.footerEmail}>
            w2119141@my.westminster.ac.uk
          </a>
        </div>
        <p style={styles.footerCopy}>
          © {new Date().getFullYear()} Westminster Marketplace. All rights reserved.
        </p>
      </div>

      <button style={styles.fab} onClick={() => setShowPost(true)}>+ Post Item</button>

    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#1a0844', backgroundImage: 'radial-gradient(ellipse at 25% 60%, #3d1b8a 0%, transparent 55%)', paddingBottom: '5rem', fontFamily: "'Inter', system-ui, sans-serif" },
  header: { backgroundColor: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0.9rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' },
  logoWrapper: { display: 'flex', alignItems: 'center', gap: '0.85rem' },
  uniLogo: { height: '36px', width: 'auto', display: 'block', flexShrink: 0, filter: 'brightness(0) invert(1)' },
  logoDivider: { color: 'rgba(255,255,255,0.25)', fontSize: '1.4rem', fontWeight: 100, lineHeight: 1, userSelect: 'none', paddingBottom: '2px' },
  logoMarketplace: { color: '#c9a84c', fontSize: '1.1rem', fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  email: { color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', letterSpacing: '0.02em' },
  profileBtn: { backgroundColor: 'transparent', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '3px', padding: '0.3rem 0.85rem', cursor: 'pointer', fontSize: '0.78rem', letterSpacing: '0.05em' },
  messagesBtn: { backgroundColor: 'transparent', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '3px', padding: '0.3rem 0.85rem', cursor: 'pointer', fontSize: '0.78rem', letterSpacing: '0.05em' },
  adminBtn: { backgroundColor: 'rgba(220,38,38,0.15)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.4)', borderRadius: '3px', padding: '0.3rem 0.85rem', cursor: 'pointer', fontSize: '0.78rem', letterSpacing: '0.05em', fontWeight: 600 },
  adminBadge: { position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#dc2626', color: 'white', borderRadius: '10px', padding: '1px 5px', fontSize: '0.65rem', fontWeight: 700, minWidth: '16px', textAlign: 'center', pointerEvents: 'none' },
  unreadBadge: { position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#c9a84c', color: '#3d0c1e', borderRadius: '10px', padding: '1px 5px', fontSize: '0.65rem', fontWeight: 700, minWidth: '16px', textAlign: 'center', pointerEvents: 'none' },
  logoutBtn: { backgroundColor: 'transparent', color: 'rgba(255,255,255,0.45)', border: 'none', borderRadius: '3px', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '0.04em' },
  hero: { backgroundColor: 'transparent', padding: '2rem 2rem 3rem', textAlign: 'center' },
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
  content: { padding: '1.75rem 2rem', backgroundColor: '#f9f2f4', minHeight: '60vh' },
  empty: { textAlign: 'center', color: '#9b7a82', marginTop: '3rem', letterSpacing: '0.03em' },
  emptyBox: { textAlign: 'center', marginTop: '4rem' },
  emptyTitle: { fontSize: '1.4rem', fontWeight: 500, color: '#4a1e2a', fontFamily: "'Cormorant Garamond', Georgia, serif", marginBottom: '0.5rem' },
  emptyText: { color: '#9b7a82', fontSize: '0.875rem' },
  clearBtn2: { marginTop: '1.25rem', padding: '0.6rem 1.75rem', backgroundColor: '#3d0c1e', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1.25rem' },
  loadMoreWrap: { textAlign: 'center', marginTop: '2rem' },
  loadMoreBtn: { padding: '0.65rem 2rem', backgroundColor: '#3d0c1e', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase' },
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
  footer: { backgroundColor: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '2.5rem 2rem 2rem', textAlign: 'center', marginTop: '2rem' },
  footerBrand: { color: '#c9a84c', fontSize: '1rem', fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 0.6rem' },
  footerNote: { color: 'rgba(255,255,255,0.38)', fontSize: '0.75rem', lineHeight: 1.6, margin: '0 auto 1.25rem', maxWidth: '480px', letterSpacing: '0.02em' },
  footerLinks: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' },
  footerContactBtn: { backgroundColor: 'transparent', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '3px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '0.06em' },
  footerEmail: { color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', textDecoration: 'none', letterSpacing: '0.02em' },
  footerCopy: { color: 'rgba(255,255,255,0.22)', fontSize: '0.7rem', margin: 0, letterSpacing: '0.04em' },
}
