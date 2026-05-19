import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Messages({ session, onClose }) {
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (selected) fetchMessages(selected)
  }, [selected])

  const fetchConversations = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id, content, sent_at, is_read,
        listing:listings(id, title),
        sender:profiles!messages_sender_id_fkey(id, full_name),
        receiver:profiles!messages_receiver_id_fkey(id, full_name)
      `)
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
      .order('sent_at', { ascending: false })

    if (!error && data) {
      const seen = new Set()
      const unique = data.filter(m => {
        const key = `${m.listing?.id}-${m.sender?.id}-${m.receiver?.id}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      setConversations(unique)
    }
    setLoading(false)
  }

  const fetchMessages = async (conv) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id, content, sent_at,
        sender:profiles!messages_sender_id_fkey(id, full_name)
      `)
      .eq('listing_id', conv.listing?.id)
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
      .order('sent_at', { ascending: true })

    if (!error && data) setMessages(data)

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('listing_id', conv.listing?.id)
      .eq('receiver_id', session.user.id)
  }

  const handleReply = async () => {
    if (!reply.trim() || !selected) return
    setSending(true)

    const receiverId = selected.sender?.id === session.user.id
      ? selected.receiver?.id
      : selected.sender?.id

    const { error } = await supabase.from('messages').insert({
      listing_id: selected.listing?.id,
      sender_id: session.user.id,
      receiver_id: receiverId,
      content: reply,
    })

    if (!error) {
      setReply('')
      fetchMessages(selected)
      fetchConversations()
    }
    setSending(false)
  }

  const getOtherPerson = (conv) => {
    return conv.sender?.id === session.user.id
      ? conv.receiver?.full_name
      : conv.sender?.full_name
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>📨 Messages</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>

          {/* Conversations list */}
          <div style={styles.sidebar}>
            {loading ? (
              <p style={styles.empty}>Loading...</p>
            ) : conversations.length === 0 ? (
              <p style={styles.empty}>No messages yet</p>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  style={selected?.id === conv.id ? styles.convActive : styles.conv}
                  onClick={() => setSelected(conv)}
                >
                  <div style={styles.convAvatar}>
                    {getOtherPerson(conv)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={styles.convInfo}>
                    <p style={styles.convName}>{getOtherPerson(conv)}</p>
                    <p style={styles.convListing}>📦 {conv.listing?.title}</p>
                    <p style={styles.convPreview}>{conv.content}</p>
                  </div>
                  {!conv.is_read && conv.receiver?.id === session.user.id && (
                    <span style={styles.unreadDot} />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Message thread */}
          <div style={styles.thread}>
            {!selected ? (
              <div style={styles.noSelected}>
                <p>👈 Select a conversation</p>
              </div>
            ) : (
              <>
                <div style={styles.threadHeader}>
                  <strong>{getOtherPerson(selected)}</strong>
                  <span style={styles.threadListing}>re: {selected.listing?.title}</span>
                </div>

                <div style={styles.messageList}>
                  {messages.map(msg => {
                    const isMine = msg.sender?.id === session.user.id
                    return (
                      <div
                        key={msg.id}
                        style={isMine ? styles.msgRight : styles.msgLeft}
                      >
                        <div style={isMine ? styles.bubbleRight : styles.bubbleLeft}>
                          {msg.content}
                        </div>
                        <p style={styles.msgTime}>
                          {new Date(msg.sent_at).toLocaleTimeString([], {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )
                  })}
                </div>

                <div style={styles.replyBox}>
                  <textarea
                    style={styles.replyInput}
                    placeholder="Type a reply..."
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    rows={2}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleReply()
                      }
                    }}
                  />
                  <button
                    style={styles.sendBtn}
                    onClick={handleReply}
                    disabled={sending}
                  >
                    {sending ? '...' : '➤'}
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
    maxWidth: '700px',
    height: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
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
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '240px',
    borderRight: '1px solid #e5e7eb',
    overflowY: 'auto',
    flexShrink: 0,
  },
  empty: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: '2rem 1rem',
    fontSize: '0.9rem',
  },
  conv: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.85rem 1rem',
    cursor: 'pointer',
    borderBottom: '1px solid #f3f4f6',
    position: 'relative',
  },
  convActive: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.85rem 1rem',
    cursor: 'pointer',
    borderBottom: '1px solid #f3f4f6',
    backgroundColor: '#f5f3ff',
    position: 'relative',
  },
  convAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#4a1fb8',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  convInfo: {
    flex: 1,
    minWidth: 0,
  },
  convName: {
    margin: 0,
    fontWeight: 'bold',
    fontSize: '0.9rem',
    color: '#111827',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  convListing: {
    margin: '0.1rem 0',
    fontSize: '0.75rem',
    color: '#4a1fb8',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  convPreview: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#6b7280',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  unreadDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#4a1fb8',
    flexShrink: 0,
    marginTop: '4px',
  },
  thread: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  noSelected: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    fontSize: '1rem',
  },
  threadHeader: {
    padding: '0.85rem 1.25rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    flexShrink: 0,
  },
  threadListing: {
    fontSize: '0.8rem',
    color: '#6b7280',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
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
    borderRadius: '16px 16px 4px 16px',
    maxWidth: '70%',
    fontSize: '0.9rem',
    lineHeight: '1.4',
  },
  bubbleLeft: {
    backgroundColor: '#f3f4f6',
    color: '#111827',
    padding: '0.6rem 1rem',
    borderRadius: '16px 16px 16px 4px',
    maxWidth: '70%',
    fontSize: '0.9rem',
    lineHeight: '1.4',
  },
  msgTime: {
    fontSize: '0.7rem',
    color: '#9ca3af',
    margin: '0.2rem 0.5rem 0',
  },
  replyBox: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    borderTop: '1px solid #e5e7eb',
    flexShrink: 0,
  },
  replyInput: {
    flex: 1,
    padding: '0.6rem 0.85rem',
    borderRadius: '20px',
    border: '1px solid #e5e7eb',
    fontSize: '0.9rem',
    resize: 'none',
    outline: 'none',
    fontFamily: 'sans-serif',
  },
  sendBtn: {
    width: '40px',
    height: '40px',
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
}
