import { useState } from 'react'
import { supabase } from './supabaseClient'


const CATEGORIES = [
  { label: '📚 Books & Notes', value: 'books' },
  { label: '💻 Electronics', value: 'electronics' },
  { label: '🪑 Furniture', value: 'furniture' },
  { label: '👕 Clothing', value: 'clothing' },
  { label: '🏋️ Sports & Fitness', value: 'sports' },
  { label: '✏️ Stationery', value: 'stationery' },
  { label: '🍳 Kitchen & Home', value: 'kitchen' },
  { label: '📦 Other', value: 'other' },
]


const CONDITIONS = [
  { label: '🌟 New', value: 'new' },
  { label: '✨ Like New', value: 'like_new' },
  { label: '👍 Good', value: 'good' },
  { label: '👌 Fair', value: 'fair' },
  { label: '⚠️ Poor', value: 'poor' },
]


export default function PostListing({ session, onClose, onPosted }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [condition, setCondition] = useState('')
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')


  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 4)
    setImages(files)
  }


  const uploadImages = async () => {
    const urls = []
    for (const file of images) {
      const fileName = `${session.user.id}-${Date.now()}-${file.name}`
      const { data, error } = await supabase.storage
        .from('listing-images')
        .upload(fileName, file)
      if (!error) {
        const { data: urlData } = supabase.storage
          .from('listing-images')
          .getPublicUrl(fileName)
        urls.push(urlData.publicUrl)
      }
    }
    return urls
  }


  const handleSubmit = async () => {
    if (!title || !price || !category || !condition) {
      setMessage('Please fill in all required fields!')
      return
    }


    setLoading(true)
    setMessage('')


    const imageUrls = images.length > 0 ? await uploadImages() : []


    const { data: categoryData } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', category)
      .single()


    if (!categoryData) {
      setMessage('Category not found. Please try again.')
      setLoading(false)
      return
    }


    const { error } = await supabase.from('listings').insert({
      seller_id: session.user.id,
      category_id: categoryData.id,
      title,
      description,
      price: parseFloat(price),
      condition,
      image_urls: imageUrls,
      status: 'active',
    })


    if (error) {
      setMessage('Error posting listing: ' + error.message)
    } else {
      onPosted()
      onClose()
    }


    setLoading(false)
  }


  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Post an Item</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>


        <div style={styles.body}>
          <label style={styles.label}>Title *</label>
          <input
            style={styles.input}
            placeholder="e.g. iPhone 12, Calculus Textbook..."
            value={title}
            onChange={e => setTitle(e.target.value)}
          />


          <label style={styles.label}>Description</label>
          <textarea
            style={styles.textarea}
            placeholder="Describe your item — condition details, reason for selling..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />


          <label style={styles.label}>Price (£) *</label>
          <input
            style={styles.input}
            type="number"
            placeholder="0.00"
            value={price}
            onChange={e => setPrice(e.target.value)}
            min="0"
          />


          <label style={styles.label}>Category *</label>
          <select
            style={styles.input}
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="">Select a category...</option>
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>


          <label style={styles.label}>Condition *</label>
          <div style={styles.conditionRow}>
            {CONDITIONS.map(cond => (
              <button
                key={cond.value}
                style={condition === cond.value ? styles.condActive : styles.condBtn}
                onClick={() => setCondition(cond.value)}
                type="button"
              >
                {cond.label}
              </button>
            ))}
          </div>


          <label style={styles.label}>Photos (up to 4)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            style={styles.fileInput}
          />
          {images.length > 0 && (
            <div style={styles.imagePreview}>
              {images.map((img, i) => (
                <img
                  key={i}
                  src={URL.createObjectURL(img)}
                  alt="preview"
                  style={styles.previewImg}
                />
              ))}
            </div>
          )}


          {message && <p style={styles.message}>{message}</p>}


          <button
            style={styles.submitBtn}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Posting...' : '🚀 Post Listing'}
          </button>
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
    maxWidth: '520px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    backgroundColor: 'white',
    zIndex: 1,
  },
  modalTitle: {
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
    padding: '0.25rem',
  },
  body: {
    padding: '1.5rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.4rem',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    marginBottom: '1.25rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    marginBottom: '1.25rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'sans-serif',
  },
  conditionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginBottom: '1.25rem',
  },
  condBtn: {
    padding: '0.4rem 0.85rem',
    borderRadius: '20px',
    border: '1px solid #e5e7eb',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '0.85rem',
    color: '#374151',
  },
  condActive: {
    padding: '0.4rem 0.85rem',
    borderRadius: '20px',
    border: '1px solid #4a1fb8',
    backgroundColor: '#4a1fb8',
    cursor: 'pointer',
    fontSize: '0.85rem',
    color: 'white',
    fontWeight: 'bold',
  },
  fileInput: {
    marginBottom: '1rem',
    fontSize: '0.9rem',
    width: '100%',
  },
  imagePreview: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
  },
  previewImg: {
    width: '80px',
    height: '80px',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  message: {
    color: '#dc2626',
    fontSize: '0.9rem',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  submitBtn: {
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
}


