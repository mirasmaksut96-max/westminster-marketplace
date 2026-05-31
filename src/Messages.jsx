import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'

const relativeTime = (dateStr) => {
  const now = new Date()
  const d = new Date(dateStr)
  const diff = now - d
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const dateLabel = (dateStr) => {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function Messages({ session, onClose, onMessagesRead }) {
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [myRating, setMyRating] = useState(null)
  const [ratingScore, setRatingScore] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [search, setSearch] = useState('')
  const [hoveredConv, setHoveredConv] = useState(null)
  const [replyFocused, setReplyFocused] = useState(false)
  const messageListRef = useRef(null)
  const replyInputRef = useRef(null)

  useEffect(() => {
    markAllRead()
    fetchConversations()
  }, [])

  const markAllRead = async () => {
    await supabase.rpc('mark_messages_read', { p_receiver_id: session.user.id })
    if (onMessagesRead) onMessagesRead()
  }

  useEffect(() => {
    if (selected) {
      fetchMessages(selected)
      fetchMyRating(selected)
    }
  }, [selected])

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (selected && replyInputRef.current) {
      replyInputRef.current.focus()
    }
  }, [selected])

  useEffect(() => {
    if (!selected) return
    const otherId = selected.sender?.id === session.user.id ? selected.receiver?.id : selected.sender?.id
    const channel = supabase
      .channel(`conv-${selected.listing?.id}-${[session.user.id, otherId].sort().join('-')}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `listing_id=eq.${selected.listing?.id}`,
      }, payload => {
        const msg = payload.new
        if (
          (msg.sender_id === session.user.id && msg.receiver_id === otherId) ||
          (msg.sender_id === otherId && msg.receiver_id === session.user.id)
        ) {
          fetchMessages(selected)
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [selected])

  const getConvKey = (m) => {
    const participants = [m.sender?.id, m.receiver?.id].sort().join('-')
    return `${m.listing?.id}|${participants}`
  }

  const getOtherId = (conv) =>
    conv.sender?.id === session.user.id ? conv.receiver?.id : conv.sender?.id

  const getOtherPerson = (conv) =>
    conv.sender?.id === session.user.id ? conv.receiver?.full_name : conv.sender?.full_name

  const fetchConversations = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id, content, sent_at, is_read,
        listing:listings(id, title, seller_id, status, locked_buyer_id),
        sender:profiles!messages_sender_id_fkey(id, full_name),
        receiver:profiles!messages_receiver_id_fkey(id, full_name)
      `)
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
      .order('sent_at', { ascending: false })

    if (!error && data) {
      const seen = new Set()
      const unique = data.filter(m => {
        const key = getConvKey(m)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      setConversations(unique)
    }
    setLoading(false)
  }

  const fetchMessages = async (conv) => {
    const otherId = getOtherId(conv)
    const { data } = await supabase
      .from('messages')
      .select(`id, content, sent_at, sender:profiles!messages_sender_id_fkey(id, full_name)`)
      .eq('listing_id', conv.listing?.id)
      .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${session.user.id})`)
      .order('sent_at', { ascending: true })

    if (data) setMessages(data)
  }

  const fetchMyRating = async (conv) => {
    const { data } = await supabase
      .from('ratings')
      .select('score, comment')
      .eq('rater_id', session.user.id)
      .eq('listing_id', conv.listing?.id)
      .maybeSingle()
    setMyRating(data || null)
    setRatingScore(0)
    setRatingComment('')
  }

  const handleReply = async () => {
    if (!reply.trim() || !selected) return
    setSending(true)
    const { error } = await supabase.from('messages').insert({
      listing_id: selected.listing?.id,
      sender_id: session.user.id,
      receiver_id: getOtherId(selected),
      content: reply,
    })
    if (!error) {
      setReply('')
      fetchMessages(selected)
      fetchConversations()
    }
    setSending(false)
  }

  const handleOfferResponse = async (msg, accepted) => {
    const buyerId = msg.sender?.id
    const content = accepted ? '✅ Accepted your offer' : '❌ Declined your offer'

    await supabase.from('messages').insert({
      listing_id: selected.listing?.id,
      sender_id: session.user.id,
      receiver_id: buyerId,
      content,
    })

    if (accepted) {
      await supabase
        .from('listings')
        .update({ status: 'pending', locked_buyer_id: buyerId })
        .eq('id', selected.listing?.id)
        .eq('seller_id', session.user.id)

      setSelected(prev => ({
        ...prev,
        listing: { ...prev.listing, status: 'pending', locked_buyer_id: buyerId },
      }))
    }

    fetchMessages(selected)
    fetchConversations()
  }

  const handleSubmitRating = async () => {
    if (ratingScore === 0 || !selected) return
    setSubmittingRating(true)

    const isLockedBuyer = selected.listing?.locked_buyer_id === session.user.id
    const ratedUserId = isLockedBuyer
      ? selected.listing?.seller_id
      : selected.listing?.locked_buyer_id

    const { error } = await supabase.from('ratings').insert({
      rater_id: session.user.id,
      rated_user_id: ratedUserId,
      listing_id: selected.listing?.id,
      score: ratingScore,
      comment: ratingComment,
    })

    if (!error) setMyRating({ score: ratingScore, comment: ratingComment })
    setSubmittingRating(false)
  }

  const isOffer = (c) => c?.startsWith('💰 Offer:')
  const isOfferResponse = (c) => c?.startsWith('✅ Accepted') || c?.startsWith('❌ Declined')
  const hasUnread = (conv) => !conv.is_read && conv.receiver?.id === session.user.id

  const isDealLocked = selected?.listing?.status === 'pending' && !!selected?.listing?.locked_buyer_id
  const isLockedBuyer = isDealLocked && selected?.listing?.locked_buyer_id === session.user.id
  const isSellerOfListing = isDealLocked && selected?.listing?.seller_id === session.user.id
  const isPartyToDeal = isLockedBuyer || isSellerOfListing

  const filteredConversations = conversations.filter(conv => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      getOtherPerson(conv)?.toLowerCase().includes(q) ||
      conv.listing?.title?.toLowerCase().includes(q)
    )
  })

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        <div style={styles.header}>
          <h2 style={styles.title}>Messages</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>

          {/* Sidebar */}
          <div style={styles.sidebar}>
            <div style={styles.searchWrap}>
              <input
                style={styles.searchInput}
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {loading ? (
              <p style={styles.empty}>Loading...</p>
            ) : filteredConversations.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyIcon}>💬</p>
                <p style={styles.emptyText}>
                  {search ? `No results for "${search}"` : 'No messages yet'}
                </p>
                {!search && <p style={styles.emptyHint}>Messages from buyers will appear here</p>}
              </div>
            ) : (
              filteredConversations.map(conv => {
                const convKey = getConvKey(conv)
                const isActive = selected && getConvKey(selected) === convKey
                const unread = hasUnread(conv)
                const isMySent = conv.sender?.id === session.user.id
                const isHovered = hoveredConv === convKey

                let convStyle = { ...styles.conv }
                if (isActive) convStyle = { ...styles.conv, ...styles.convActiveOverride }
                else if (isHovered) convStyle = { ...styles.conv, ...styles.convHoverOverride }

                return (
                  <div
                    key={convKey}
                    style={convStyle}
                    onClick={() => setSelected(conv)}
                    onMouseEnter={() => setHoveredConv(convKey)}
                    onMouseLeave={() => setHoveredConv(null)}
                  >
                    <div style={styles.convAvatar}>
                      {getOtherPerson(conv)?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={styles.convInfo}>
                      <div style={styles.convTopRow}>
                        <span style={unread ? styles.convNameBold : styles.convName}>
                          {getOtherPerson(conv)}
                        </span>
                        <span style={styles.convTime}>{relativeTime(conv.sent_at)}</span>
                      </div>
                      <p style={styles.convListing}>{conv.listing?.title}</p>
                      <p style={unread ? styles.convPreviewBold : styles.convPreview}>
                        {isMySent ? 'You: ' : ''}{conv.content}
                      </p>
                      {conv.listing?.status === 'pending' && (
                        <span style={styles.dealTag}>🤝 Deal locked</span>
                      )}
                    </div>
                    {unread && <span style={styles.unreadDot} />}
                  </div>
                )
              })
            )}
          </div>

          {/* Thread */}
          <div style={styles.thread}>
            {!selected ? (
              <div style={styles.noSelected}>
                <p style={styles.noSelectedIcon}>💬</p>
                <p style={styles.noSelectedText}>Select a conversation</p>
                <p style={styles.noSelectedHint}>Choose from the list on the left</p>
              </div>
            ) : (
              <>
                <div style={styles.threadHeader}>
                  <div style={styles.threadAvatar}>
                    {getOtherPerson(selected)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={styles.threadHeaderInfo}>
                    <span style={styles.threadHeaderName}>{getOtherPerson(selected)}</span>
                    <div style={styles.threadMeta}>
                      <span style={styles.listingPill}>📦 {selected.listing?.title}</span>
                      {isDealLocked && (
                        <span style={styles.dealPill}>
                          🤝 {isLockedBuyer ? 'You are buyer' : 'Deal agreed'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={styles.messageList} ref={messageListRef}>
                  {messages.map((msg, i) => {
                    const isMine = msg.sender?.id === session.user.id
                    const offerReceived = !isMine && isOffer(msg.content)
                    const alreadyResponded = offerReceived && messages.slice(i + 1).some(
                      m => m.sender?.id === session.user.id && isOfferResponse(m.content)
                    )
                    const isSeller = selected.listing?.seller_id === session.user.id
                    const showDateSep = i === 0 || (
                      new Date(msg.sent_at).toDateString() !== new Date(messages[i - 1].sent_at).toDateString()
                    )

                    return (
                      <div key={msg.id}>
                        {showDateSep && (
                          <div style={styles.dateSep}>
                            <span style={styles.dateSepLabel}>{dateLabel(msg.sent_at)}</span>
                          </div>
                        )}

                        {isOfferResponse(msg.content) ? (
                          <div style={styles.statusMsg}>{msg.content}</div>
                        ) : isOffer(msg.content) ? (
                          <div style={isMine ? styles.offerWrapRight : styles.offerWrapLeft}>
                            <div style={isMine ? styles.offerCardSent : styles.offerCardReceived}>
                              <span style={{ ...styles.offerBadge, color: isMine ? 'rgba(255,255,255,0.65)' : '#7c3aed' }}>
                                💰 Offer
                              </span>
                              <span style={{ ...styles.offerAmount, color: isMine ? 'white' : '#1e1b4b' }}>
                                {msg.content.replace('💰 Offer: ', '')}
                              </span>
                            </div>
                            <p style={styles.msgTime}>{relativeTime(msg.sent_at)}</p>
                            {offerReceived && !alreadyResponded && isSeller && !isDealLocked && (
                              <div style={styles.offerActions}>
                                <button style={styles.acceptBtn} onClick={() => handleOfferResponse(msg, true)}>
                                  Accept offer
                                </button>
                                <button style={styles.declineBtn} onClick={() => handleOfferResponse(msg, false)}>
                                  Decline
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={isMine ? styles.msgRight : styles.msgLeft}>
                            <div style={isMine ? styles.bubbleRight : styles.bubbleLeft}>
                              {msg.content}
                            </div>
                            <p style={styles.msgTime}>{relativeTime(msg.sent_at)}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {isPartyToDeal && (
                  <div style={styles.ratingSection}>
                    {myRating ? (
                      <div style={styles.ratedRow}>
                        <span style={styles.ratedLabel}>Your rating:</span>
                        <span style={styles.ratedStars}>
                          {[1,2,3,4,5].map(n => n <= myRating.score ? '★' : '☆').join('')}
                        </span>
                        {myRating.comment && (
                          <span style={styles.ratedComment}>"{myRating.comment}"</span>
                        )}
                      </div>
                    ) : (
                      <>
                        <div style={styles.ratingTopRow}>
                          <span style={styles.ratePrompt}>Rate {getOtherPerson(selected)}</span>
                          <div style={styles.stars}>
                            {[1, 2, 3, 4, 5].map(n => (
                              <button key={n} style={styles.starBtn} onClick={() => setRatingScore(n)}>
                                {n <= ratingScore ? '★' : '☆'}
                              </button>
                            ))}
                          </div>
                        </div>
                        {ratingScore > 0 && (
                          <div style={styles.ratingInputRow}>
                            <input
                              style={styles.ratingInput}
                              placeholder="Add a comment (optional)"
                              value={ratingComment}
                              onChange={e => setRatingComment(e.target.value)}
                            />
                            <button
                              style={styles.submitRatingBtn}
                              onClick={handleSubmitRating}
                              disabled={submittingRating}
                            >
                              {submittingRating ? '...' : 'Submit'}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div style={styles.replyBox}>
                  <textarea
                    ref={replyInputRef}
                    style={{
                      ...styles.replyInput,
                      borderColor: replyFocused ? '#4a1fb8' : '#e5e7eb',
                    }}
                    placeholder="Message... (Enter to send, Shift+Enter for new line)"
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    rows={2}
                    onFocus={() => setReplyFocused(true)}
                    onBlur={() => setReplyFocused(false)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleReply()
                      }
                    }}
                  />
                  <button
                    style={reply.trim() && !sending ? styles.sendBtn : styles.sendBtnDisabled}
                    onClick={handleReply}
                    disabled={sending || !reply.trim()}
                  >
                    ➤
                  </button>
                </div>
              </>
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
    backgroundColor: 'rgba(0,0,0,0.55)',
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
    maxWidth: '860px',
    height: '88vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
    backgroundColor: '#fafafa',
  },
  title: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1rem',
    cursor: 'pointer',
    color: '#6b7280',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },

  // Sidebar
  sidebar: {
    width: '280px',
    borderRight: '1px solid #e5e7eb',
    overflowY: 'auto',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fafafa',
  },
  searchWrap: {
    padding: '0.75rem',
    flexShrink: 0,
  },
  searchInput: {
    width: '100%',
    padding: '0.5rem 0.85rem',
    borderRadius: '20px',
    border: '1px solid #e5e7eb',
    fontSize: '0.85rem',
    outline: 'none',
    backgroundColor: 'white',
    boxSizing: 'border-box',
    color: '#111827',
  },
  empty: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: '2rem 1rem',
    fontSize: '0.9rem',
    margin: 0,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2rem 1rem',
  },
  emptyIcon: {
    fontSize: '2.5rem',
    margin: '0 0 0.5rem',
  },
  emptyText: {
    margin: '0 0 0.25rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyHint: {
    margin: 0,
    fontSize: '0.78rem',
    color: '#9ca3af',
    textAlign: 'center',
  },
  conv: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.65rem',
    padding: '0.85rem 1rem',
    cursor: 'pointer',
    borderBottom: '1px solid #efefef',
    position: 'relative',
  },
  convActiveOverride: {
    backgroundColor: '#f0ebff',
    borderLeft: '3px solid #4a1fb8',
    paddingLeft: '13px',
  },
  convHoverOverride: {
    backgroundColor: '#f5f3ff',
  },
  convAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4a1fb8, #7c3aed)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.95rem',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  convInfo: {
    flex: 1,
    minWidth: 0,
  },
  convTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '0.1rem',
  },
  convName: {
    fontWeight: '500',
    fontSize: '0.88rem',
    color: '#374151',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  convNameBold: {
    fontWeight: '700',
    fontSize: '0.88rem',
    color: '#111827',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  convTime: {
    fontSize: '0.68rem',
    color: '#9ca3af',
    flexShrink: 0,
    marginLeft: '0.5rem',
  },
  convListing: {
    margin: '0 0 0.15rem',
    fontSize: '0.73rem',
    color: '#4a1fb8',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontWeight: '500',
  },
  convPreview: {
    margin: 0,
    fontSize: '0.78rem',
    color: '#9ca3af',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  convPreviewBold: {
    margin: 0,
    fontSize: '0.78rem',
    color: '#374151',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  dealTag: {
    display: 'inline-block',
    marginTop: '0.3rem',
    fontSize: '0.67rem',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '10px',
    padding: '1px 7px',
    fontWeight: '600',
    border: '1px solid #fde68a',
  },
  unreadDot: {
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    backgroundColor: '#4a1fb8',
    flexShrink: 0,
    marginTop: '6px',
  },

  // Thread
  thread: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#f8f7fc',
  },
  noSelected: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    gap: '0.4rem',
  },
  noSelectedIcon: {
    fontSize: '3rem',
    margin: 0,
  },
  noSelectedText: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: '600',
    color: '#6b7280',
  },
  noSelectedHint: {
    margin: 0,
    fontSize: '0.83rem',
    color: '#9ca3af',
  },
  threadHeader: {
    padding: '0.9rem 1.25rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexShrink: 0,
    backgroundColor: 'white',
  },
  threadAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4a1fb8, #7c3aed)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.95rem',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  threadHeaderInfo: {
    flex: 1,
    minWidth: 0,
  },
  threadHeaderName: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#111827',
    display: 'block',
    marginBottom: '0.25rem',
  },
  threadMeta: {
    display: 'flex',
    gap: '0.4rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  listingPill: {
    fontSize: '0.73rem',
    color: '#4a1fb8',
    backgroundColor: '#ede9fe',
    borderRadius: '10px',
    padding: '2px 8px',
    fontWeight: '500',
  },
  dealPill: {
    fontSize: '0.7rem',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '10px',
    padding: '2px 8px',
    fontWeight: '600',
    border: '1px solid #fde68a',
  },

  // Messages
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  dateSep: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0.75rem 0 0.5rem',
  },
  dateSepLabel: {
    fontSize: '0.7rem',
    color: '#9ca3af',
    backgroundColor: '#ede9fe',
    padding: '3px 12px',
    borderRadius: '10px',
    fontWeight: '500',
  },
  msgRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  msgLeft: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  bubbleRight: {
    backgroundColor: '#4a1fb8',
    color: 'white',
    padding: '0.6rem 1rem',
    borderRadius: '18px 18px 4px 18px',
    maxWidth: '68%',
    fontSize: '0.9rem',
    lineHeight: '1.45',
    wordBreak: 'break-word',
  },
  bubbleLeft: {
    backgroundColor: 'white',
    color: '#111827',
    padding: '0.6rem 1rem',
    borderRadius: '18px 18px 18px 4px',
    maxWidth: '68%',
    fontSize: '0.9rem',
    lineHeight: '1.45',
    wordBreak: 'break-word',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
  },
  msgTime: {
    fontSize: '0.67rem',
    color: '#9ca3af',
    margin: '0.2rem 0.4rem 0.15rem',
  },
  statusMsg: {
    textAlign: 'center',
    fontSize: '0.8rem',
    color: '#6b7280',
    margin: '0.5rem 0',
    padding: '0.3rem 0.8rem',
    backgroundColor: '#f3f4f6',
    borderRadius: '10px',
    alignSelf: 'center',
    display: 'block',
    width: 'fit-content',
    marginLeft: 'auto',
    marginRight: 'auto',
  },

  // Offer cards
  offerWrapRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  offerWrapLeft: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  offerCardSent: {
    backgroundColor: '#4a1fb8',
    padding: '0.75rem 1rem',
    borderRadius: '16px 16px 4px 16px',
    maxWidth: '68%',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  offerCardReceived: {
    backgroundColor: 'white',
    border: '2px solid #ddd6fe',
    padding: '0.75rem 1rem',
    borderRadius: '16px 16px 16px 4px',
    maxWidth: '68%',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  offerBadge: {
    fontSize: '0.68rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#6b21a8',
  },
  offerAmount: {
    fontSize: '1.05rem',
    fontWeight: '700',
  },
  offerActions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.4rem',
  },
  acceptBtn: {
    padding: '0.45rem 1rem',
    backgroundColor: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    fontSize: '0.82rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  declineBtn: {
    padding: '0.45rem 1rem',
    backgroundColor: 'white',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: '20px',
    fontSize: '0.82rem',
    fontWeight: '600',
    cursor: 'pointer',
  },

  // Rating
  ratingSection: {
    borderTop: '1px solid #e5e7eb',
    padding: '0.7rem 1.25rem',
    backgroundColor: 'white',
    flexShrink: 0,
  },
  ratedRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  ratedLabel: {
    fontSize: '0.82rem',
    color: '#6b7280',
  },
  ratedStars: {
    color: '#f59e0b',
    fontSize: '1rem',
    letterSpacing: '1px',
  },
  ratedComment: {
    fontSize: '0.82rem',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  ratingTopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  ratePrompt: {
    margin: 0,
    fontSize: '0.82rem',
    fontWeight: '600',
    color: '#374151',
  },
  stars: {
    display: 'flex',
    gap: '0.1rem',
  },
  starBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#f59e0b',
    padding: 0,
    lineHeight: 1,
  },
  ratingInputRow: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  ratingInput: {
    flex: 1,
    padding: '0.4rem 0.85rem',
    borderRadius: '20px',
    border: '1px solid #e5e7eb',
    fontSize: '0.82rem',
    outline: 'none',
    fontFamily: 'sans-serif',
    minWidth: 0,
  },
  submitRatingBtn: {
    padding: '0.4rem 1rem',
    backgroundColor: '#4a1fb8',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    fontSize: '0.82rem',
    fontWeight: '600',
    cursor: 'pointer',
    flexShrink: 0,
  },

  // Reply box
  replyBox: {
    display: 'flex',
    gap: '0.6rem',
    padding: '0.9rem 1.25rem',
    borderTop: '1px solid #e5e7eb',
    flexShrink: 0,
    alignItems: 'flex-end',
    backgroundColor: 'white',
  },
  replyInput: {
    flex: 1,
    padding: '0.65rem 1rem',
    borderRadius: '20px',
    border: '1.5px solid',
    fontSize: '0.9rem',
    resize: 'none',
    outline: 'none',
    fontFamily: 'sans-serif',
    lineHeight: '1.45',
    backgroundColor: '#f9fafb',
    color: '#111827',
    transition: 'border-color 0.15s',
  },
  sendBtn: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: '#4a1fb8',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: '#d1d5db',
    color: 'white',
    border: 'none',
    cursor: 'default',
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
}
