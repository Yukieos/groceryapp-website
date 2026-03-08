import { useState, useRef } from 'react'
import './App.css'

const MODEL_API_URL = "https://yukieos-groceryclassifier.hf.space"
const PRICE_API_URL = "https://groceryclassification-api.vercel.app"

function App() {
  const [searchMethod, setSearchMethod] = useState('image')
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result)
    reader.readAsDataURL(file)
    setResult(null)
    setError(null)
  }

  const handleTabChange = (method) => {
    setSearchMethod(method)
    setResult(null)
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (searchMethod === 'image' && !selectedFile) return
    if (searchMethod === 'text' && !searchText.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    let predictedClass = null

    try {
      if (searchMethod === 'image') {
        const formData = new FormData()
        formData.append('photo', selectedFile)

        const modelRes = await fetch(`${MODEL_API_URL}/infer`, {
          method: 'POST',
          body: formData,
        })
        if (!modelRes.ok) throw new Error('Image classification failed. Try again.')
        const modelData = await modelRes.json()
        predictedClass = modelData.category
      } else {
        predictedClass = searchText.trim()
      }

      const priceRes = await fetch(`${PRICE_API_URL}/search_price?q=${encodeURIComponent(predictedClass)}`)
      if (!priceRes.ok) throw new Error('Price search failed. Try again.')
      const priceData = await priceRes.json()

      setResult({ classification: predictedClass, prices: priceData })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = !loading &&
    (searchMethod === 'image' ? !!selectedFile : !!searchText.trim())

  return (
    <div className="page">
      <div className="card">
        <div className="header">
          <div className="header-icon">🛒</div>
          <h1>GroceryScan</h1>
          <p>Upload a photo or type an item to find the best price</p>
        </div>

        <div className="tab-group">
          <button
            className={`tab-btn ${searchMethod === 'image' ? 'active' : ''}`}
            onClick={() => handleTabChange('image')}
            type="button"
          >
            📷 Image Search
          </button>
          <button
            className={`tab-btn ${searchMethod === 'text' ? 'active' : ''}`}
            onClick={() => handleTabChange('text')}
            type="button"
          >
            🔍 Text Search
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {searchMethod === 'image' && (
            <>
              {preview ? (
                <>
                  <img src={preview} alt="Preview" className="preview-img" />
                  <button
                    type="button"
                    className="change-img-btn"
                    onClick={() => { setSelectedFile(null); setPreview(null); setResult(null) }}
                  >
                    Change image
                  </button>
                </>
              ) : (
                <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                  <div className="upload-icon">📂</div>
                  <p>Click or drag an image here</p>
                  <p className="upload-hint">Supports JPG, PNG, WEBP</p>
                </div>
              )}
            </>
          )}

          {searchMethod === 'text' && (
            <input
              type="text"
              className="text-input"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="e.g. apple, organic milk, avocado..."
            />
          )}

          <button type="submit" className="submit-btn" disabled={!canSubmit}>
            <span className="btn-inner">
              {loading && <span className="spinner" />}
              {loading ? 'Searching...' : 'Find Best Price'}
            </span>
          </button>
        </form>

        {error && <div className="error-banner">{error}</div>}
      </div>

      {result && (
        <div className="results">
          <div className="results-header">
            <h2>Price Comparison</h2>
          </div>
          <div className="detected-badge">
            <span>Detected:</span>
            <span>{result.classification}</span>
          </div>

          {result.prices.length === 0 ? (
            <div className="no-results">No matching products found.</div>
          ) : (
            <div className="price-grid">
              {result.prices.map((item, i) => (
                <div key={i} className="price-card">
                  <div className="price-card-left">
                    <span className="price-card-name">{item.product_name}</span>
                    <span className="price-card-vendor">{item.vendor}</span>
                  </div>
                  <div className="price-card-right">
                    <span className="price-value">${item.price}</span>
                    <span className="similarity-pill">{Math.round(item.similarity * 100)}% match</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
