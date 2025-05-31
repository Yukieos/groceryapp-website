import { useState } from 'react'
import './App.css'

const MODEL_API_URL = "https://yukieos-groceryclassifier.hf.space"
const PRICE_API_URL = "https://grocery-classification.onrender.com"

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchMethod, setSearchMethod] = useState('image') // 'image' or 'text'
  const [searchText, setSearchText] = useState('')

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (searchMethod === 'image' && !selectedFile) return
    if (searchMethod === 'text' && !searchText.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    let predictedClass = null

    try {
      if (searchMethod === 'image') {
        // Step 1a: Get classification from Hugging Face (Image)
        const formData = new FormData()
        formData.append('photo', selectedFile)

        const modelResponse = await fetch(`${MODEL_API_URL}/infer`, {
          method: 'POST',
          body: formData,
        })

        if (!modelResponse.ok) {
          throw new Error('Classification failed')
        }

        const modelData = await modelResponse.json()
        predictedClass = modelData.category
      } else {
        // Step 1b: Use text input directly (Text)
        predictedClass = searchText.trim()
      }

      // Step 2: Get price from Render
      const priceResponse = await fetch(`${PRICE_API_URL}/search_price?q=${encodeURIComponent(predictedClass)}`)
      if (!priceResponse.ok) {
        throw new Error('Price search failed')
      }

      const priceData = await priceResponse.json()

      setResult({
        classification: predictedClass, // Use predictedClass from image or searchText
        prices: priceData
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>Find your best price for grocery</h1>
      
      <div className="search-method-toggle">
        <label>
          <input 
            type="radio" 
            value="image" 
            checked={searchMethod === 'image'} 
            onChange={() => setSearchMethod('image')}
          />
          Image Search
        </label>
        <label>
          <input 
            type="radio" 
            value="text" 
            checked={searchMethod === 'text'} 
            onChange={() => setSearchMethod('text')}
          />
          Text Search
        </label>
      </div>

      <form onSubmit={handleSubmit}>
        {searchMethod === 'image' && (
          <div className="upload-section">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="file-input"
            />
            {preview && (
              <div className="preview">
                <img src={preview} alt="Preview" />
              </div>
            )}
          </div>
        )}

        {searchMethod === 'text' && (
          <div className="text-search-section">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Enter grocery item name"
              className="text-input"
            />
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading || (searchMethod === 'image' && !selectedFile) || (searchMethod === 'text' && !searchText.trim())}
          className="submit-button"
        >
          {loading ? 'Processing...' : 'Analyze'}
        </button>
      </form>

      {error && (
        <div className="error">
          Error: {error}
        </div>
      )}

      {result && (
        <div className="result">
          <h2>Results</h2>
          <h3>Predicted Class: {result.classification}</h3>
          <div className="price-list">
            {result.prices.map((item, index) => (
              <div key={index} className="price-item">
                <p>{item.product_name}</p>
                <p>Vendor: {item.vendor}</p>
                <p>Price: ${item.price}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
