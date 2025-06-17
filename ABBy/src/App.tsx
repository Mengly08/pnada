"use client"

import { useState, useEffect } from "react"
import { Loader2, XCircle, ArrowLeft, Search, Facebook, MessageCircle, CheckCircle2 } from "lucide-react"
import axios from "axios"

const App = () => {
  const [form, setForm] = useState(() => {
    const savedForm = localStorage.getItem("customerInfo")
    return savedForm
      ? JSON.parse(savedForm)
      : {
          userId: "",
          serverId: "",
          product: null,
          game: "mlbb",
          nickname: undefined,
        }
  })

  const [showTopUp, setShowTopUp] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [orderFormat, setOrderFormat] = useState("")
  const [formErrors, setFormErrors] = useState({ userId: "", serverId: "", paymentMethod: "" })
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [paymentCooldown, setPaymentCooldown] = useState(0)
  const [cooldownInterval, setCooldownInterval] = useState(null)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [isThinking, setIsThinking] = useState(false)
  const [showSocialDropdown, setShowSocialDropdown] = useState(false)

  const diamondCombinations = {
    "86": { total: "86", breakdown: "86+0bonus" },
    "172": { total: "172", breakdown: "172+0bonus" },
    "257": { total: "257", breakdown: "257+0bonus" },
    "343": { total: "343", breakdown: "257+86bonus" },
    "429": { total: "429", breakdown: "257+172bonus" },
    "514": { total: "514", breakdown: "514+0bonus" },
    "600": { total: "600", breakdown: "514+86bonus" },
    "706": { total: "706", breakdown: "706+0bonus" },
    "792": { total: "792", breakdown: "706+86bonus" },
    "878": { total: "878", breakdown: "706+172bonus" },
    "963": { total: "963", breakdown: "706+257bonus" },
    "1049": { total: "1049", breakdown: "963+86bonus" },
    "1135": { total: "1135", breakdown: "963+172bonus" },
    "1220": { total: "1220", breakdown: "963+257bonus" },
    "1412": { total: "1412", breakdown: "1412+0bonus" },
    "1584": { total: "1584", breakdown: "1412+172bonus" },
    "1756": { total: "1756", breakdown: "1412+344bonus" },
    "1926": { total: "1926", breakdown: "1412+514bonus" },
    "2195": { total: "2195", breakdown: "2195+0bonus" },
    "2384": { total: "2384", breakdown: "2195+189bonus" },
    "2637": { total: "2637", breakdown: "2195+442bonus" },
    "2810": { total: "2810", breakdown: "2195+615bonus" },
  }

  const formatItemDisplay = (product) => {
    if (!product) return "None"
    const identifier = product.diamonds || product.name
    const combo = diamondCombinations[identifier]
    if (!combo) return identifier
    return combo.breakdown.endsWith("+0bonus") ? combo.total : `${combo.total} (${combo.breakdown})`
  }

  useEffect(() => {
    const savedForm = localStorage.getItem("customerInfo")
    if (savedForm) {
      const parsedForm = JSON.parse(savedForm)
      if (parsedForm.game === "mlbb_ph") {
        parsedForm.game = "mlbb"
        localStorage.setItem("customerInfo", JSON.stringify(parsedForm))
        setForm(parsedForm)
      } else {
        setForm(parsedForm)
      }
    }
  }, [])

  useEffect(() => {
    if (form.game !== "none") {
      console.log("Fetching products for game:", form.game)
      fetchProducts(form.game)
    }
  }, [form.game])

  useEffect(() => {
    return () => {
      if (cooldownInterval) clearInterval(cooldownInterval)
    }
  }, [cooldownInterval])

  useEffect(() => {
    if (form.userId || form.serverId || form.nickname) {
      localStorage.setItem(
        "customerInfo",
        JSON.stringify({
          userId: form.userId,
          serverId: form.serverId,
          game: form.game,
          product: null,
          nickname: form.nickname,
        }),
      )
    }
  }, [form.userId, form.serverId, form.game, form.nickname])

  const startPaymentCooldown = () => {
    setPaymentCooldown(7)
    if (cooldownInterval) clearInterval(cooldownInterval)
    const interval = setInterval(() => {
      setPaymentCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    setCooldownInterval(interval)
  }

  const fetchProducts = async (game) => {
    setLoading(true)
    setIsThinking(true)
    try {
      const response = await fetch('/productslist.txt')
      if (!response.ok) throw new Error('Failed to fetch products')
      const text = await response.text()
      const productsData = JSON.parse(text)
      
      const filteredProducts = productsData.filter(product => product.game === game).map(product => ({
        ...product,
        id: product.id.toString(),
        price: parseFloat(product.price)
      }))

      setProducts(filteredProducts)
      setLoading(false)
      setIsThinking(false)
    } catch (error) {
      console.error(`Error fetching products for ${game}:`, error.message)
      setProducts([])
      setLoading(false)
      setIsThinking(false)
      alert("Failed to load products. Please try again later.")
    }
  }

  const validateAccount = async () => {
    if (!form.userId || (form.game === "mlbb" && !form.serverId)) return

    setValidating(true)
    setValidationResult(null)

    try {
      let response
      if (form.game === "mlbb") {
        response = await axios.get(
          `https://api.isan.eu.org/nickname/ml?id=${encodeURIComponent(form.userId)}&zone=${encodeURIComponent(form.serverId)}`,
        )
      } else if (form.game === "freefire") {
        response = await axios.get(
          `https://rapidasiagame.com/api/v1/idff.php?UserId=${encodeURIComponent(form.userId)}`,
        )
      }

      if (form.game === "mlbb" && response.data.success) {
        setValidationResult(response.data)
        setForm((prev) => ({ ...prev, nickname: response.data.name }))
      } else if (form.game === "freefire" && response.data.status === "success") {
        setValidationResult(response.data)
        setForm((prev) => ({ ...prev, nickname: response.data.username }))
      } else {
        setValidationResult(null)
        alert("Account not found. Please check your User ID and Zone ID.")
      }
    } catch (error) {
      console.error("Failed to validate account:", error.message)
      setValidationResult(null)
      alert("Failed to validate account. Please try again.")
    } finally {
      setValidating(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (paymentCooldown > 0) return

    const errors = {}
    if (!form.userId) errors.userId = "User ID is required"
    if (form.game === "mlbb" && !form.serverId) errors.serverId = "Zone ID is required"
    if (!form.product) {
      alert("Please select a product")
      return
    }
    if (!selectedPayment) errors.paymentMethod = "Please select a payment method"
    if (
      (form.game === "mlbb" && !validationResult?.success) ||
      (form.game === "freefire" && !validationResult?.status)
    ) {
      alert(`Please check your ${form.game === "mlbb" ? "Mobile Legends" : "Free Fire"} account first`)
      return
    }

    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    const productIdentifier = form.product.code || form.product.diamonds || form.product.name
    const format =
      form.game === "mlbb"
        ? `${form.userId} ${form.serverId} ${productIdentifier}`
        : `${form.userId} 0 ${productIdentifier}`
    setOrderFormat(format)
    setShowCheckout(true)
  }

  const clearSavedInfo = () => {
    localStorage.removeItem("customerInfo")
    setForm({ userId: "", serverId: "", product: null, game: form.game, nickname: undefined })
    setValidationResult(null)
  }

  const handlePaymentClick = () => {
    setSelectedPayment((prev) => (prev === "khqr" ? null : "khqr"))
  }

  const ProductList = ({ products, selectedProduct, onSelect, game }) => {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
        {products.map((product) => (
          <div
            key={product.id}
            className={`
              bg-white rounded-lg p-4 cursor-pointer transition-all duration-300 border-2
              ${
                selectedProduct?.id === product.id
                  ? "border-green-500 bg-green-50 transform scale-105 shadow-lg"
                  : "border-gray-200 hover:border-green-400 hover:shadow-lg hover:scale-102"
              }
            `}
            onClick={() => onSelect(product)}
          >
            <div className="text-center">
              <h3 className="font-semibold text-sm text-gray-800 mb-1">
                {product.diamonds ? formatItemDisplay(product) : product.name}
              </h3>
              <p className="text-green-600 font-bold text-lg price-box">${product.price.toFixed(2)}</p>
              {product.type && <p className="text-xs text-gray-500 mt-1 capitalize">{product.type}</p>}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const PaymentModal = ({ form, orderFormat, onClose, discountPercent }) => {
    return (
      <div className="こちらfixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn">
        <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl transform transition-all duration-300">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Payment Details</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-700">Order Summary</h3>
              <p className="text-sm text-gray-600">Game: {form.game === "mlbb" ? "Mobile Legends" : "Free Fire"}</p>
              <p className="text-sm text-gray-600">User ID: {form.userId}</p>
              {form.game === "mlbb" && <p className="text-sm text-gray-600">Zone ID: {form.serverId}</p>}
              <p className="text-sm text-gray-600">Item: {formatItemDisplay(form.product)}</p>
              <p className="text-lg font-bold text-green-600">Total: ${form.product?.price.toFixed(2)}</p>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-700 mb-2">Payment Method</h3>
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
                <img
                  src="https://www.daddytopup.com/_next/image?url=%2Fassets%2Fmain%2Fkhqr.webp&w=1920&q=75"
                  alt="KHQR"
                  className="w-8 h-8"
                />
                <span className="font-medium">ABA KHQR</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-gray-500 mb-4">Order Format: {orderFormat}</p>
              <button
                onClick={onClose}
                className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors duration-300"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-green-500 flex flex-col relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Khmer:wght@100;200;300;400;500;600;700;800;900&display=swap');
        body {
          background-color: #22c55e !important;
        }
        .khmer-font {
          font-family: 'Noto Sans Khmer', sans-serif;
        }
        .bg-green-theme {
          background-color: #22c55e;
        }
        .price-box {
          background-color: #fef08a;
          padding: 6px 12px;
          border-radius: 6px;
          display: inline-block;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .logo-container {
          width: 80px;
          height: 80px;
          transition: transform 0.3s ease;
        }
        .logo-container:hover {
          transform: scale(1.1);
        }
        .logo-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .section-number {
          width: 40px;
          height: 40px;
          background-color: #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: bold;
          color: #16a34a;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .inner-content,
        .inner-content.payment-section {
          background-color: #16a34a !important;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: transform 0.3s ease;
        }
        .inner-content:hover {
          transform: translateY(-4px);
        }
        .inner-content.products-section {
          background-color: #22c55e !important;
          padding: 0;
          border-radius: 0;
          box-shadow: none;
        }
        .payment-box {
          background-color: #ffffff;
          border: 2px solid #16a34a;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .payment-box.selected {
          border-color: #22c55e;
          background-color: #f0fdf4;
        }
        .payment-box.selected::after {
          content: '✓';
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 24px;
          height: 24px;
          background-color: #16a34a;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }
        .payment-box:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .payment-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }
        .payment-image {
          width: 40px;
          height: 40px;
          object-fit: contain;
          border-radius: 6px;
        }
        .payment-text p:first-child {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1f2937;
        }
        .payment-text p:last-child {
          font-size: 0.9rem;
          color: #4b5563;
        }
        .input-field {
          background-color: #ffffff;
          color: #1f2937;
          border: 2px solid #16a34a;
          padding: 10px;
          border-radius: 6px;
          width: 100%;
          text-align: center;
          transition: border-color 0.3s ease;
        }
        .input-field:focus {
          border-color: #22c55e;
          outline: none;
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
        }
        .mlbb-form4 {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #16a34a;
          padding: 12px;
          border-radius: 12px;
          width: 100%;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          box-shadow: 0 -4px 12px rgba(0, 0,0,0.2);
        }
        .mlbb-container43 {
          display: flex;
          flex-direction: column;
          color: #fff;
        }
        .mlbb-text30, .mlbb-text33 {
          font-size: 15px;
          margin-bottom: 6px;
          color: #fff;
        }
        .mlbb-text32, .mlbb-text35 {
          font-weight: bold;
          margin-left: 6px;
          color: #fef08a;
        }
        .mlbb-container44 {
          display: flex;
          justify-content: flex-end;
        }
        .mlbb-button2, .check-id-button {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #fef08a;
          color: #1f2937;
          padding: 12px 28px;
          border-radius: 8px;
          border: 2px solid #16a34a;
          cursor: pointer;
          font-size: 16px;
          font-weight: 700;
          transition: all 0.3s ease;
          min-width: 160px;
          height: 50px;
        }
        .mlbb-button2:hover, .check-id-button:hover {
          background-color: #16a34a;
          color: #fff;
          border-color: #fef08a;
        }
        .mlbb-button2:disabled, .check-id-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .mlbb-button2:disabled:hover, .check-id-button:disabled:hover {
          background-color: #fef08a;
          color: #1f2937;
          border-color: #16a34a;
        }
        .mlbb-icon64 {
          margin-right: 8px;
        }
        .mlbb-text36, .check-id-text {
          text-transform: uppercase;
          color: #1f2937;
        }
        .mlbb-button2:hover .mlbb-text36, .check-id-button:hover .check-id-text {
          color: #fff;
        }
        .game-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, #16a34a, #22c55e);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          position: relative;
          overflow: hidden;
        }
        .game-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        }
        .game-card.disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }
        .game-card.disabled:hover {
          transform: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .game-image {
          width: 100%;
          max-width: 220px;
          min-width: 180px;
          aspect-ratio: 1 / 1;
          object-fit: contain;
          border-radius: 12px;
          transition: transform 0.3s ease;
        }
        .game-card:hover .game-image {
          transform: scale(1.05);
        }
        .game-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1.5rem;
          justify-content: center;
          width: 100%;
          max-width: 1200px;
          padding-bottom: 2rem;
        }
        .coming-soon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: rgba(0, 0, 0, 0.85);
          color: #fef08a;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 1.1rem;
          font-weight: bold;
          text-align: center;
          text-transform: uppercase;
        }
        .banner-slider {
          background: linear-gradient(135deg, #16a34a, #22c55e);
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 2.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .popular-section {
          background: linear-gradient(135deg, #16a34a, #22c55e);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 2.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .popular-card {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: 16px;
          margin: 8px;
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          transition: transform 0.3s ease;
        }
        .popular-card:hover {
          transform: translateY(-4px);
        }
        @media (max-width: 480px) {
          .game-container {
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 1rem;
          }
          .game-image {
            max-width: 140px;
            min-width: 140px;
          }
          .game-card h3 {
            font-size: 0.9rem;
            color: #ffffff;
          }
        }
        @media (min-width: 481px) and (max-width: 768px) {
          .game-container {
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 1.25rem;
          }
          .game-image {
            max-width: 160px;
            min-width: 160px;
          }
          .game-card h3 {
            font-size: 0.95rem;
            color: #ffffff;
          }
        }
        @media (min-width: 769px) {
          .game-container {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 1.5rem;
          }
          .game-image {
            max-width: 220px;
            min-width: 180px;
          }
          .game-card h3 {
            font-size: 1rem;
            color: #ffffff;
          }
        }
        .social-dropdown {
          position: relative;
        }
        .social-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          padding: 12px;
          z-index: 1000;
          transform: translateY(4px);
          transition: all 0.3s ease;
        }
        .social-menu a {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          color: #1f2937;
          text-decoration: none;
          transition: all 0.2s ease;
          border-radius: 6px;
        }
        .social-menu a:hover {
          background-color: #f0f0f0;
          color: #16a34a;
        }
        .products-section, .products-section * {
          background-color: #22c55e !important;
        }
        .loading-container {
          background-color: #22c55e !important;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <nav className="bg-green-600 text-white p-4 shadow-xl sticky top-0 z-50 flex items-center justify-between">
        <a href="/" className="flex items-center">
          <div className="logo-container">
            <img
              src="https://i.pinimg.com/736x/3d/ba/c9/3dbac9cb5059676aa310b165e8ed6804.jpg"
              alt="Logo"
              className="logo-image"
            />
          </div>
        </a>
        <div className="flex items-center w-1/2 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search games or products..."
              className="w-full pl-12 pr-4 py-2 rounded-full bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
          </div>
        </div>
        <div className="social-dropdown">
          <button
            onClick={() => setShowSocialDropdown(!showSocialDropdown)}
            className="text-white hover:text-gray-200 transition-colors flex items-center gap-2 bg-green-700 px-4 py-2 rounded-lg"
          >
            <MessageCircle className="w-6 h-6" />
            <span>Contact Us</span>
          </button>
          {showSocialDropdown && (
            <div className="social-menu">
              <a
                href="https://www.facebook.com/share/1CVHbXejqR/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook className="w-5 h-5" />
                Facebook
              </a>
              <a href="https://t.me/kakrona_168" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-5 h-5" />
                Telegram
              </a>
            </div>
          )}
        </div>
      </nav>

      {isThinking && (
        <div className="flex items-center justify-center py-3 bg-green-700 text-white">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
          <span className="ml-2 text-sm font-medium">Loading...</span>
        </div>
      )}

      <div className="flex-grow">
        {/* Banner Slider */}
        <div className="container mx-auto px-4 py-8">
          <div className="banner-slider">
            <div className="relative h-56 md:h-72 lg:h-80 overflow-hidden">
              <img src="https://i.imgur.com/mWkJX0f.png" alt="Banner" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                <div className="text-center text-white">
                  <h2 className="text-3xl md:text-5xl font-bold mb-3 animate-fadeIn">LUFFY TOPUP</h2>
                  <p className="text-base md:text-xl">Your trusted platform for instant gaming top-ups</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showTopUp ? (
          <main className="container mx-auto px-4 py-10">
            <div className="max-w-5xl mx-auto space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={() => {
                    setShowTopUp(false)
                    setShowCheckout(false)
                    setValidationResult(null)
                    setForm((prev) => ({ ...prev, nickname: undefined }))
                  }}
                  className="text-white hover:text-gray-200 transition-colors text-sm flex items-center gap-2 bg-green-600 px-5 py-3 rounded-lg shadow-md hover:bg-green-700"
                >
                  <ArrowLeft className="w-5 h-5" /> Back to Games
                </button>
                {(form.userId || form.serverId) && (
                  <button
                    onClick={clearSavedInfo}
                    className="text-white hover:text-gray-200 transition-colors text-sm flex items-center gap-2 bg-red-600 px-5 py-3 rounded-lg shadow-md hover:bg-red-700"
                  >
                    <XCircle className="w-5 h-5" /> Clear Saved Info
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 rounded-xl">
              <div className="inner-content">
                <div className="section-header">
                  <div className="section-number">01</div>
                  <h3 className="text-xl font-semibold text-white khmer-font">បញ្ចូលព័ត៌មានរបស់អ្នក</h3>
                </div>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        name="userId"
                        className="input-field"
                        placeholder="Enter User ID"
                        value={form.userId}
                        onChange={(e) => {
                          const value = e.target.value.trim().replace(/[^0-9]/g, "")
                          setForm((prev) => ({ ...prev, userId: value, nickname: undefined }))
                          setValidationResult(null)
                          setFormErrors((prev) => ({ ...prev, userId: undefined }))
                        }}
                      />
                      {formErrors.userId && <p className="text-red-300 text-xs mt-2">{formErrors.userId}</p>}
                    </div>
                    {form.game === "mlbb" && (
                      <div>
                        <input
                          type="text"
                          name="zoneId"
                          className="input-field"
                          placeholder="Enter Zone ID"
                          value={form.serverId}
                          onChange={(e) => {
                            const value = e.target.value.trim().replace(/[^0-9]/g, "")
                            setForm((prev) => ({ ...prev, serverId: value, nickname: undefined }))
                            setValidationResult(null)
                            setFormErrors((prev) => ({ ...prev, serverId: undefined }))
                          }}
                        />
                        {formErrors.serverId && <p className="text-red-300 text-xs mt-2">{formErrors.serverId}</p>}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                    <button
                      type="button"
                      onClick={validateAccount}
                      disabled={validating || !form.userId || (form.game === "mlbb" && !form.serverId)}
                      className="check-id-button w-full sm:w-auto"
                    >
                      {validating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          <span className="check-id-text">Checking...</span>
                        </>
                      ) : (
                        <span className="check-id-text">Check ID</span>
                      )}
                    </button>
                    {(validationResult?.success || validationResult?.status) && (
                      <div className="flex items-center gap-2 text-green-300 text-sm">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Account found: {form.nickname}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 text-white text-sm khmer-font leading-relaxed">
                    ដើម្បីឃើញ User ID សូមចូលទៅក្នុងហ្គេម ហើយចុចរូបភាព Avatar នៅខាងឆ្វេងអេក្រង់កញ្ចក់ ហើយចុចទៅកាន់ "Check ID" ពេលនោះ User
                    ID នឹងបង្ហាញឲ្យឃើញ បន្ទាប់មកសូមយក User ID នោះមកបំពេញ។ ឧទាហរណ៍: User ID: 123456789, Zone ID: 1234។
                  </div>
                </form>
              </div>
            </div>

            <div className="p-6 rounded-xl">
              <div className="inner-content products-section">
                <div className="section-header">
                  <div className="section-number">02</div>
                  <h3 className="text-xl font-semibold text-white khmer-font">ផលិតផល Diamond</h3>
                </div>
                {loading ? (
                  <div className="flex justify-center items-center py-10 loading-container">
                    <Loader2 className="w-12 h-12 animate-spin text-white" />
                    <span className="ml-3 text-white text-lg">Loading products...</span>
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-white text-center py-10">
                    No products available for this game. Please check your productslist.txt file or try again later.
                  </div>
                ) : (
                  <ProductList
                    products={products}
                    selectedProduct={form.product}
                    onSelect={(product) => setForm((prev) => ({ ...prev, product }))}
                    game={form.game}
                  />
                )}
              </div>
            </div>

            <div className="p-6 rounded-xl">
              <div className="inner-content payment-section">
                <div className="section-header">
                  <div className="section-number">03</div>
                  <h3 className="text-xl font-semibold text-white khmer-font">វិធីបង់ប្រាក់</h3>
                </div>
                <div
                  className={`payment-box ${selectedPayment === "khqr" ? "selected" : ""}`}
                  onClick={handlePaymentClick}
                >
                  <div className="payment-content">
                    <img
                      src="https://www.daddytopup.com/_next/image?url=%2Fassets%2Fmain%2Fkhqr.webp&w=1920&q=75"
                      alt="KHQR"
                      className="payment-image"
                    />
                    <div className="payment-text">
                      <p>ABA KHQR</p>
                      <p className="khmer-font">ស្កែនដើម្បីបង់ប្រាក់ជាមួយកម្មវិធីធនាគារណាមួយ</p>
                    </div>
                  </div>
                </div>
                {formErrors.paymentMethod && <p className="text-red-300 text-xs mt-2">{formErrors.paymentMethod}</p>}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="accept"
                    className="w-5 h-5 text-green-500 border-white rounded focus:ring-green-500"
                    checked
                    disabled
                  />
                  <label htmlFor="accept" className="text-white text-sm khmer-font">
                    ខ្ញុំយល់ព្រមតាម{" "}
                    <a href="/term-and-policy" className="text-green-300 hover:underline">
                      លក្ខខណ្ឌ
                    </a>
                  </label>
                </div>
                {form.product && (
                  <form className="mlbb-form4" onSubmit={handleSubmit}>
                    <div className="mlbb-container43">
                      <span id="price-show" className="mlbb-text30">
                        <span>Total:</span>
                        <span className="mlbb-text32">${form.product ? form.product.price.toFixed(2) : "0.00"}</span>
                      </span>
                      <span id="item-show" className="mlbb-text33">
                        <span>Item:</span>
                        <span className="mlbb-text35">{formatItemDisplay(form.product)}</span>
                      </span>
                    </div>
                    <div className="mlbb-container44">
                      <button
                        type="submit"
                        disabled={
                          (!validationResult?.success && !validationResult?.status) ||
                          !form.product ||
                          paymentCooldown > 0 ||
                          !selectedPayment
                        }
                        className="mlbb-button2 button"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" className="mlbb-icon64">
                          <g fill="none" fillRule="evenodd">
                            <path d="m12.calendar_month 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.1-.01z"></path>
                            <path
                              d="M5 6.5a.5.5 0 1 1 .5-.5H16a1 1 0 1 0 0-2H5.5A2.5 2.5 0 0 0 3 6.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5.5a.5.5 0 0 1-.5-.5M15.5 15a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3"
                              fill="#16a34a"
                            ></path>
                          </g>
                        </svg>
                        <span className="mlbb-text36">Pay Now</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </main>
        ) : (
          <main className="container mx-auto px-4 py-8">
            {/* Popular Section */}
            <div className="popular-section mb-10">
              <div className="flex items-center gap-4 mb-6">
                <svg width="40" height="38" viewBox="0 0 24 24" className="text-white">
                  <path
                    d="M17.66 11.2c-.23-.3-.51-.56-.77-.82c-.67-.6-1.43-1.03-2.07-1.66C13.33 7.26 13 4.85 13.95 3c-.95.23-1.78.75-2.49 1.32c-2.59 2.08-3.61 5.75-2.39 8.9c.04.1.08.2.08.33c0 .22-.15.42-.35.5c-.23.1-.47.04-.66-.12a.6.6 0 0 1-.14-.17c-1.13-1.43-1.31-3.48-.55-5.12C5.78 10 4.87 12.3 5 14.47c.06.5.12 1 .29 1.5c.14.6.41 1.2.71 1.73c1.08 1.73 2.95 2.97 4.96 3.22c2.14.27 4.43-.12 6.07-1.6c1.83-1.66 2.47-4.32 1.53-6.6l-.13-.26c-.21-.46-.77-1.26-.77-1.26m-3.16 6.3c-.28.24-.74.5-1.1.6c-1.12.4-2.24-.16-2.9-.82c1.19-.28 1.9-1.16 2.11-2.05c.17-.8-.15-1.46-.28-2.23c-.12-.74-.1-1.37.17-2.06c.19.38.39.76.63 1.06c.77 1 1.98 1.44 2.24 2.8c.04.14.06.28.06.43c.03.82-.33 1.72-.93 2.27"
                    fill="currentColor"
                  />
                </svg>
                <h1 className="text-3xl font-bold text-white">Popular Games</h1>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <div className="popular-card text-center">
                  <img
                    src="https://downloadr2.apkmirror.com/wp-content/uploads/2024/05/42/6632d219632fb_com.mobile.legends.png"
                    alt="Mobile Legends"
                    className="w-20 h-20 mx-auto mb-3 rounded-lg"
                  />
                  <h3 className="text-white font-semibold text-lg">Mobile Legends</h3>
                  <p className="text-green-200 text-sm">Instant Top-up</p>
                </div>

                <div className="popular-card text-center">
                  <img
                    src="https://play-lh.googleusercontent.com/nIV146CRuDyVKmYaXWtFR0BK7iZFqq4UyQPfY_iZOqolvk-USWmG9YupzKWDsN59fm6K=w240-h480-rw"
                    alt="Free Fire"
                    className="w-20 h-20 mx-auto mb-3 rounded-lg"
                  />
                  <h3 className="text-white font-semibold text-lg">Free Fire</h3>
                  <p className="text-green-200 text-sm">Instant Top-up</p>
                </div>

                <div className="popular-card text-center opacity-70">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/en/thumb/4/44/PlayerUnknown%27s_Battlegrounds_Mobile.webp/180px-PlayerUnknown%27s_Battlegrounds_Mobile.webp.png"
                    alt="PUBG Mobile"
                    className="w-20 h-20 mx-auto mb-3 rounded-lg"
                  />
                  <h3 className="text-white font-semibold text-lg">PUBG Mobile</h3>
                  <p className="text-green-200 text-sm">Coming Soon</p>
                </div>

                <div className="popular-card text-center opacity-70">
                  <img
                    src="https://i.pinimg.com/736x/34/66/03/346603fe9ff5b071463b03e550dac76a.jpg"
                    alt="HOK"
                    className="w-20 h-20 mx-auto mb-3 rounded-lg"
                  />
                  <h3 className="text-white font-semibold text-lg">HOK</h3>
                  <p className="text-green-200 text-sm">Coming Soon</p>
                </div>
              </div>
            </div>

            {/* Games Grid */}
            <div className="flex flex-col items-center">
              <div className="game-container">
                <div
                  className="game-card"
                  onClick={() => {
                    console.log("Setting game to mlbb")
                    setForm((prev) => ({ ...prev, game: "mlbb" }))
                    setShowTopUp(true)
                  }}
                >
                  <img
                    src="https://downloadr2.apkmirror.com/wp-content/uploads/2024/05/42/6632d219632fb_com.mobile.legends.png"
                    alt="Mobile Legends"
                    className="game-image"
                  />
                  <h3 className="text-base font-semibold text-white text-center truncate mt-3">Mobile Legends</h3>
                  <p className="text-green-200 text-sm text-center">Instant Top-up</p>
                </div>

                <div
                  className="game-card"
                  onClick={() => {
                    console.log("Setting game to freefire")
                    setForm((prev) => ({ ...prev, game: "freefire" }))
                    setShowTopUp(true)
                  }}
                >
                  <img
                    src="https://play-lh.googleusercontent.com/nIV146CRuDyVKmYaXWtFR0BK7iZFqq4UyQPfY_iZOqolvk-USWmG9YupzKWDsN59fm6K=w240-h480-rw"
                    alt="Free Fire"
                    className="game-image"
                  />
                  <h3 className="text-base font-semibold text-white text-center truncate mt-3">Free Fire</h3>
                  <p className="text-green-200 text-sm text-center">Instant Top-up</p>
                </div>

                <div className="game-card disabled" title="Coming Soon">
                  <div className="relative">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/en/thumb/4/44/PlayerUnknown%27s_Battlegrounds_Mobile.webp/180px-PlayerUnknown%27s_Battlegrounds_Mobile.webp.png"
                      alt="PUBG Mobile"
                      className="game-image"
                    />
                    <span className="coming-soon">Coming Soon</span>
                  </div>
                  <h3 className="text-base font-semibold text-white text-center truncate mt-3">PUBG Mobile</h3>
                </div>

                <div className="game-card disabled" title="Coming Soon">
                  <div className="relative">
                    <img
                      src="https://i.pinimg.com/736x/34/66/03/346603fe9ff5b071463b03e550dac76a.jpg"
                      alt="HOK"
                      className="game-image"
                    />
                    <span className="coming-soon">Coming Soon</span>
                  </div>
                  <h3 className="text-base font-semibold text-white text-center truncate mt-3">HOK</h3>
                </div>
              </div>
            </div>
          </main>
        )}

        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={() => window.open("https://t.me/sambathjj", "_blank")}
            className="flex items-center gap-3 bg-white text-gray-800 px-5 py-3 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl hover:bg-green-100"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-green-300/30 rounded-full animate-ping opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" className="text-gray-800">
                <path fill="none" d="M0 0h24v24H0z" />
                <path
                  fill="currentColor"
                  d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"
                />
              </svg>
            </div>
            <span className="font-medium">Support</span>
          </button>
        </div>

        <footer className="bg-green-600 text-white py-6 w-full">
          <div className="container mx-auto px-4 text-center">
            <div className="mb-4">
              <p className="font-bold text-white text-lg">Contact Us:</p>
              <div className="flex justify-center gap-6 mt-2">
                <a
                  href="https://www.facebook.com/share/1CVHbXejqR/?mibextid=wwXIfr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-green-200 transition-colors"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02" />
                  </svg>
                </a>
                <a
                  href="https://t.me/kakronabns"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-green-200 transition-colors"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6m4.5 5.4c-.6.1-1.2.3-1.8.5v6.2c0 2.5-2 4.5-4.5 4.5S6 16.6 6 14.1s2-4.5 4.5-4.5c.3 0 .6 0 .9.1v-2.2c-.3 0-.6-.1-.9-.1-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6V8.9c.6-.4 1.2-.7 1.8-.9v-1.6z" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="mb-4">
              <p className="font-bold text-white text-lg">Accept Payment:</p>
              <div className="flex justify-center mt-2">
                <img
                  alt="khqr"
                  src="https://www.daddytopup.com/_next/image?url=%2Fassets%2Fmain%2Fkhqr.webp&w=828&q=75"
                  className="w-[80px] h-auto"
                />
              </div>
            </div>
            <div>
              <p className="text-sm">
                <a href="/term-and-policy" className="text-white hover:text-green-200">
                  <span className="font-bold underline" style={{ textUnderlineOffset: "5px" }}>
                    PRIVACY POLICY
                  </span>{" "}
                  |{" "}
                  <span className="font-bold underline" style={{ textUnderlineOffset: "5px" }}>
                    TERMS AND CONDITION
                  </span>
                </a>
              </p>
              <p className="text-sm text-white mt-2">COPYRIGHT © LUFFY TOPUP. ALL RIGHTS RESERVED.</p>
            </div>
          </div>
        </footer>

        {showCheckout && (
          <PaymentModal
            form={form}
            orderFormat={orderFormat}
            onClose={() => {
              setShowCheckout(false)
              startPaymentCooldown()
            }}
            discountPercent={0}
          />
        )}
      </div>
    </div>
  )
}

export default App
