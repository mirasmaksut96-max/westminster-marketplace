import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function AdminDashboard({ onClose, onViewListingById }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [working, setWorking] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('reports')
      .select(`
        id, reason, details, status, created_at, listing_id,
        listing:listings(id, title, seller_id, status),
        reporter:profiles!reporter_id(id, full_name)
      `)
      .order('created_at', { ascending: false })
    if (data) setReports(data)
    setLoading(false)
  }

  const resolveReport = async (report) => {
    const key = report.id ?? report.listing_id
    setWorking(key)
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', report.id)
    setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r))
    setWorking(null)
  }

  const removeListing = async (report) => {
    const key = report.id ?? report.listing_id
    setWorking(key)
    await supabase.from('listings').update({ status: 'removed' }).eq('id', report.listing.id)
    await supabase.from('reports').update({ status: 'resolved' }).eq('listing_id', report.listing.id)
    setReports(prev => prev.map(r =>
      r.listing?.id === report.listing.id ? { ...r, status: 'resolved' } : r
    ))
    setConfirmDelete(null)
    setWorking(null)
  }

  const pendingCount = reports.filter(r => r.status === 'pending').length
  const filtered = reports.filter(r => tab === 'all' || r.status === tab)

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Admin Dashboard</h2>
            <p style={styles.subtitle}>Manage reports · Westminster Marketplace</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <span style={{ ...styles.statNum, color: pendingCount > 0 ? '#dc2626' : '#16a34a' }}>
              {pendingCount}
            </span>
            <span style={styles.statLabel}>Pending</span>
          </div>
          <div style={styles.statBox}>
            <span style={{ ...styles.statNum, color: '#16a34a' }}>
              {reports.filter(r => r.status === 'resolved').length}
            </span>
            <span style={styles.statLabel}>Resolved</span>
          </div>
          <div style={styles.statBox}>
            <span style={{ ...styles.statNum, color: '#6b7280' }}>{reports.length}</span>
            <span style={styles.statLabel}>Total</span>
          </div>
        </div>

        <div style={styles.tabs}>
          {[
            { value: 'pending', label: 'Pending' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'all', label: 'All' },
          ].map(t => (
            <button
              key={t.value}
              style={tab === t.value ? styles.tabActive : styles.tab}
              onClick={() => setTab(t.value)}
            >
              {t.label}
              {t.value === 'pending' && pendingCount > 0 && (
                <span style={styles.tabBadge}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        <div style={styles.list}>
          {loading ? (
            <p style={styles.empty}>Loading reports…</p>
          ) : filtered.length === 0 ? (
            <div style={styles.emptyBox}>
              <p style={styles.emptyIcon}>{tab === 'pending' ? '✅' : '📋'}</p>
              <p style={styles.emptyTitle}>
                {tab === 'pending' ? 'No pending reports — all clear!' : 'No reports found'}
              </p>
            </div>
          ) : (
            filtered.map(report => {
              const cardKey = report.id ?? `${report.listing_id}-${report.created_at}`
              const workingKey = report.id ?? report.listing_id
              const isWorking = working === workingKey
              return (
                <div key={cardKey} style={report.status === 'resolved' ? { ...styles.card, ...styles.cardResolved } : styles.card}>
                  <div style={styles.cardTop}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={styles.listingName}>{report.listing?.title ?? '(listing deleted)'}</p>
                      <p style={styles.meta}>
                        Reported by <strong>{report.reporter?.full_name ?? 'Unknown'}</strong> ·{' '}
                        {new Date(report.created_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span style={report.status === 'resolved' ? styles.resolvedBadge : styles.pendingBadge}>
                      {report.status}
                    </span>
                  </div>

                  <div style={styles.reasonRow}>
                    <span style={styles.reasonLabel}>Reason</span>
                    <span style={styles.reasonText}>{report.reason}</span>
                  </div>

                  {report.details && (
                    <p style={styles.details}>"{report.details}"</p>
                  )}

                  {report.status === 'pending' && (
                    <div style={styles.actions}>
                      {report.listing && (
                        <button
                          style={styles.viewBtn}
                          onClick={() => { onViewListingById(report.listing.id); onClose() }}
                        >
                          View Listing
                        </button>
                      )}
                      <button
                        style={styles.resolveBtn}
                        onClick={() => resolveReport(report)}
                        disabled={isWorking}
                      >
                        {isWorking ? '…' : '✓ Resolve'}
                      </button>
                      {report.listing && report.listing.status !== 'removed' && (
                        confirmDelete === cardKey ? (
                          <div style={styles.confirmRow}>
                            <span style={styles.confirmText}>Remove this listing?</span>
                            <button
                              style={styles.confirmYes}
                              onClick={() => removeListing(report)}
                              disabled={isWorking}
                            >
                              {isWorking ? '…' : 'Remove'}
                            </button>
                            <button style={styles.confirmNo} onClick={() => setConfirmDelete(null)}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button style={styles.removeBtn} onClick={() => setConfirmDelete(cardKey)}>
                            🗑 Remove
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              )
            })
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
    backgroundColor: 'rgba(15,6,38,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1200,
    padding: '1rem',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '640px',
    maxHeight: '88vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
    overflow: 'hidden',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '1.25rem 1.5rem 1rem',
    borderBottom: '1px solid #f0ebf8',
    flexShrink: 0,
    backgroundColor: '#1a0844',
  },
  title: {
    margin: '0 0 0.2rem',
    fontSize: '1.2rem',
    color: '#c9a84c',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontWeight: 600,
    letterSpacing: '0.05em',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: '0.04em',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.1rem',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.5)',
    padding: '0.25rem',
    lineHeight: 1,
    flexShrink: 0,
  },
  statsRow: {
    display: 'flex',
    borderBottom: '1px solid #f0ebf8',
    flexShrink: 0,
  },
  statBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0.85rem 0.5rem',
    borderRight: '1px solid #f0ebf8',
  },
  statNum: {
    fontSize: '1.6rem',
    fontWeight: 700,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    lineHeight: 1,
    marginBottom: '0.2rem',
  },
  statLabel: {
    fontSize: '0.65rem',
    color: '#9b8daa',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #f0ebf8',
    flexShrink: 0,
    backgroundColor: '#fdfcfb',
  },
  tab: {
    flex: 1,
    padding: '0.7rem 0.5rem',
    border: 'none',
    borderBottom: '2px solid transparent',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '0.75rem',
    color: '#9b8daa',
    fontWeight: 400,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
  },
  tabActive: {
    flex: 1,
    padding: '0.7rem 0.5rem',
    border: 'none',
    borderBottom: '2px solid #1a0844',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '0.75rem',
    color: '#1a0844',
    fontWeight: 700,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
  },
  tabBadge: {
    backgroundColor: '#dc2626',
    color: 'white',
    borderRadius: '10px',
    padding: '1px 6px',
    fontSize: '0.65rem',
    fontWeight: 700,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  empty: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: '2rem',
    margin: 0,
  },
  emptyBox: {
    textAlign: 'center',
    padding: '3rem 1rem',
  },
  emptyIcon: {
    fontSize: '2.5rem',
    margin: '0 0 0.75rem',
  },
  emptyTitle: {
    color: '#6b7280',
    fontSize: '0.9rem',
    margin: 0,
    fontWeight: 500,
  },
  card: {
    backgroundColor: 'white',
    border: '1px solid #f0e6f4',
    borderRadius: '6px',
    padding: '1rem',
    boxShadow: '0 1px 4px rgba(26,8,68,0.05)',
  },
  cardResolved: {
    backgroundColor: '#fafafa',
    opacity: 0.75,
  },
  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    marginBottom: '0.6rem',
  },
  listingName: {
    margin: '0 0 0.2rem',
    fontWeight: 600,
    fontSize: '0.9rem',
    color: '#120826',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  meta: {
    margin: 0,
    fontSize: '0.72rem',
    color: '#9b8daa',
  },
  pendingBadge: {
    flexShrink: 0,
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontSize: '0.62rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    border: '1px solid #fde68a',
  },
  resolvedBadge: {
    flexShrink: 0,
    backgroundColor: '#dcfce7',
    color: '#166534',
    fontSize: '0.62rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    border: '1px solid #bbf7d0',
  },
  reasonRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.4rem',
  },
  reasonLabel: {
    fontSize: '0.65rem',
    color: '#9b8daa',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  reasonText: {
    fontSize: '0.82rem',
    color: '#374151',
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  details: {
    margin: '0 0 0.6rem',
    fontSize: '0.8rem',
    color: '#6b7280',
    fontStyle: 'italic',
    lineHeight: 1.5,
    paddingLeft: '0.5rem',
    borderLeft: '2px solid #e9d5ff',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.75rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  viewBtn: {
    padding: '0.4rem 0.85rem',
    backgroundColor: 'transparent',
    color: '#4a1fb8',
    border: '1px solid #c4b5fd',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
    letterSpacing: '0.04em',
  },
  resolveBtn: {
    padding: '0.4rem 0.85rem',
    backgroundColor: '#dcfce7',
    color: '#166534',
    border: '1px solid #bbf7d0',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.04em',
  },
  removeBtn: {
    padding: '0.4rem 0.85rem',
    backgroundColor: 'transparent',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
    letterSpacing: '0.04em',
  },
  confirmRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  confirmText: {
    fontSize: '0.78rem',
    color: '#dc2626',
    fontWeight: 500,
  },
  confirmYes: {
    padding: '0.35rem 0.75rem',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmNo: {
    padding: '0.35rem 0.75rem',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
}
