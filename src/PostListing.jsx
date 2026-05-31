import { useState } from 'react'
import { supabase } from './supabaseClient'

const PICKUP_LOCATIONS = [
  { label: 'New Cavendish Street', value: 'New Cavendish Street' },
  { label: 'Regent Street', value: 'Regent Street' },
  { label: 'Marylebone (Westminster Business School)', value: 'Marylebone (Westminster Business School)' },
  { label: 'Harrow Campus', value: 'Harrow Campus' },
  { label: 'Flexible / Anywhere', value: 'Flexible' },
]

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
  { label: 'New', value: 'new' },
  { label: 'Like New', value: 'like_new' },
  { label: 'Good', value: 'good' },
  { label: 'Fair', value: 'fair' },
  { label: 'Poor', value: 'poor' },
]


export default function PostListing({ session, onClose, onPosted, editListing }) {
  const [listingType, setListingType] = useState(editListing?.listing_type || 'sell')
  const [title, setTitle] = useState(editListing?.title || '')
  const [description, setDescription] = useState(editListing?.description || '')
  const [price, setPrice] = useState(editListing?.price != null ? String(editListing.price) : '')
  const [category, setCategory] = useState(editListing?.categories?.slug || '')
  const [condition, setCondition] = useState(editListing?.condition || '')
  const [pickupLocation, setPickupLocation] = useState(editListing?.pickup_location || '')
  const [brand, setBrand] = useState(editListing?.brand || '')
  const [itemSize, setItemSize] = useState(editListing?.item_size || '')
  const [images, setImages] = useState([])
  const [existingImages, setExistingImages] = useState(editListing?.image_urls || [])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')


  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 4)
    setImages(files)
  }


  const uploadImages = async () => {
    const urls = []
    const failed = []
    for (const file of images) {
      const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')
      const fileName = `${session.user.id}-${Date.now()}-${safeName}`
      const { error } = await supabase.storage
        .from('listing-images')
        .upload(fileName, file)
      if (error) {
        failed.push(file.name)
      } else {
        const { data: urlData } = supabase.storage
          .from('listing-images')
          .getPublicUrl(fileName)
        urls.push(urlData.publicUrl)
      }
    }
    if (failed.length > 0) {
      setMessage(`Warning: ${failed.length} photo(s) failed to upload. Check your Supabase storage bucket is set to public.`)
    }
    return urls
  }


  const handleSubmit = async () => {
    if (!title || (listingType === 'sell' && !price) || !category || (listingType === 'sell' && !condition)) {
      setMessage('Please fill in all required fields.')
      return
    }

    setLoading(true)
    setMessage('')

    const newImageUrls = images.length > 0 ? await uploadImages() : []
    const imageUrls = newImageUrls.length > 0 ? newImageUrls : existingImages

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

    if (editListing) {
      const { error } = await supabase.from('listings').update({
        category_id: categoryData.id,
        title,
        description,
        price: parseFloat(price) || 0,
        condition: condition || null,
        image_urls: imageUrls,
        listing_type: listingType,
        pickup_location: pickupLocation || null,
        brand: brand || null,
        item_size: itemSize || null,
      }).eq('id', editListing.id)

      if (error) setMessage('Error saving changes: ' + error.message)
      else { onPosted(); onClose() }
    } else {
      const expiry = new Date()
      expiry.setDate(expiry.getDate() + 30)

      const { error } = await supabase.from('listings').insert({
        seller_id: session.user.id,
        category_id: categoryData.id,
        title,
        description,
        price: parseFloat(price) || 0,
        condition: condition || null,
        image_urls: imageUrls,
        status: 'active',
        listing_type: listingType,
        pickup_location: pickupLocation || null,
        expires_at: expiry.toISOString(),
        brand: brand || null,
        item_size: itemSize || null,
      })

      if (error) setMessage('Error posting listing: ' + error.message)
      else {
        onPosted()
        if (newImageUrls.length === images.length || images.length === 0) onClose()
      }
    }

    setLoading(false)
  }


  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{editListing ? 'Edit Listing' : listingType === 'wanted' ? 'Post a Wanted Ad' : 'Post a Listing'}</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>


        <div style={styles.body}>
          <div style={styles.typeToggle}>
            <button
              style={listingType === 'sell' ? styles.typeActive : styles.typeBtn}
              onClick={() => setListingType('sell')}
              type="button"
            >
              Selling
            </button>
            <button
              style={listingType === 'wanted' ? styles.typeActive : styles.typeBtn}
              onClick={() => setListingType('wanted')}
              type="button"
            >
              Looking For
            </button>
          </div>

          <label style={styles.label}>{listingType === 'wanted' ? 'What are you looking for? *' : 'Title *'}</label>
          <input
            style={styles.input}
            placeholder={listingType === 'wanted' ? 'e.g. Calculus Textbook 10th edition…' : 'e.g. iPhone 12, Calculus Textbook…'}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />


          <label style={styles.label}>Description</label>
          <textarea
            style={styles.textarea}
            placeholder="Describe your item — condition details, reason for selling…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />


          <label style={styles.label}>{listingType === 'wanted' ? 'Max Budget (£)' : 'Price (£) *'}</label>
          <input
            style={styles.input}
            type="number"
            placeholder={listingType === 'wanted' ? 'Any budget' : '0.00'}
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
            <option value="">Select a category…</option>
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>


          {listingType === 'sell' && (
            <>
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
            </>
          )}

          {category && category !== 'other' && (
            <>
              <label style={styles.label}>
                {category === 'books' ? 'Author / Publisher' : 'Brand'}{' '}
                <span style={styles.optional}>(optional)</span>
              </label>
              <input
                style={styles.input}
                placeholder={category === 'books' ? 'e.g. Pearson, Oxford University Press' : 'e.g. Apple, Nike, IKEA'}
                value={brand}
                onChange={e => setBrand(e.target.value)}
              />
            </>
          )}

          {category === 'clothing' && (
            <>
              <label style={styles.label}>Size <span style={styles.optional}>(optional)</span></label>
              <input
                style={styles.input}
                placeholder="e.g. M, L, UK 10, EU 42"
                value={itemSize}
                onChange={e => setItemSize(e.target.value)}
              />
            </>
          )}

          <label style={styles.label}>Preferred Collection Point</label>
          <select
            style={styles.input}
            value={pickupLocation}
            onChange={e => setPickupLocation(e.target.value)}
          >
            <option value="">Select a location…</option>
            {PICKUP_LOCATIONS.map(loc => (
              <option key={loc.value} value={loc.value}>{loc.label}</option>
            ))}
          </select>

          <label style={styles.label}>Photos (up to 4)</label>
          {existingImages.length > 0 && images.length === 0 && (
            <div style={styles.imagePreview}>
              {existingImages.map((url, i) => (
                <img key={i} src={url} alt="current" style={styles.previewImg} />
              ))}
              <p style={{ fontSize: '0.72rem', color: '#9b8daa', margin: '0.4rem 0 0', width: '100%' }}>
                Current photos — upload new ones below to replace them
              </p>
            </div>
          )}
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
            {loading ? (editListing ? 'Saving…' : 'Publishing…') : (editListing ? 'Save Changes' : 'Publish Listing')}
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
    backgroundColor: 'rgba(15,6,38,0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '6px',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #f0ebf8',
    position: 'sticky',
    top: 0,
    backgroundColor: 'white',
    zIndex: 1,
  },
  modalTitle: {
    margin: 0,
    fontSize: '1.3rem',
    color: '#120826',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontWeight: 600,
    letterSpacing: '0.01em',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.1rem',
    cursor: 'pointer',
    color: '#9b8daa',
    padding: '0.25rem',
    lineHeight: 1,
  },
  body: {
    padding: '1.5rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.35rem',
    fontWeight: 500,
    fontSize: '0.72rem',
    color: '#4a3f5c',
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    padding: '0.7rem 0.85rem',
    marginBottom: '1.25rem',
    borderRadius: '4px',
    border: '1px solid #e4dded',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    outline: 'none',
    color: '#120826',
    backgroundColor: '#fdfcfb',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  textarea: {
    width: '100%',
    padding: '0.7rem 0.85rem',
    marginBottom: '1.25rem',
    borderRadius: '4px',
    border: '1px solid #e4dded',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    resize: 'vertical',
    outline: 'none',
    color: '#120826',
    backgroundColor: '#fdfcfb',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  optional: {
    fontSize: '0.75rem',
    color: '#9b8daa',
    fontWeight: 400,
  },
  conditionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
    marginBottom: '1.25rem',
  },
  condBtn: {
    padding: '0.35rem 0.9rem',
    borderRadius: '3px',
    border: '1px solid #e4dded',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '0.82rem',
    color: '#4a3f5c',
    letterSpacing: '0.03em',
  },
  condActive: {
    padding: '0.35rem 0.9rem',
    borderRadius: '3px',
    border: '1px solid #1a0844',
    backgroundColor: '#1a0844',
    cursor: 'pointer',
    fontSize: '0.82rem',
    color: 'white',
    fontWeight: 500,
    letterSpacing: '0.03em',
  },
  fileInput: {
    marginBottom: '1rem',
    fontSize: '0.85rem',
    width: '100%',
    color: '#4a3f5c',
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
    borderRadius: '4px',
    border: '1px solid #e4dded',
  },
  message: {
    color: '#b91c1c',
    fontSize: '0.85rem',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  submitBtn: {
    width: '100%',
    padding: '0.85rem',
    backgroundColor: '#1a0844',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  typeToggle: {
    display: 'flex',
    gap: '0.4rem',
    marginBottom: '1.5rem',
  },
  typeBtn: {
    flex: 1,
    padding: '0.6rem',
    borderRadius: '4px',
    border: '1px solid #e4dded',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '0.82rem',
    color: '#4a3f5c',
    letterSpacing: '0.05em',
  },
  typeActive: {
    flex: 1,
    padding: '0.6rem',
    borderRadius: '4px',
    border: '1px solid #1a0844',
    backgroundColor: '#1a0844',
    cursor: 'pointer',
    fontSize: '0.82rem',
    color: 'white',
    fontWeight: 500,
    letterSpacing: '0.05em',
  },
}
