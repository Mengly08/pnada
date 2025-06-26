"use client"

import type React from "react"
import { useState, useEffect, lazy, Suspense } from "react"
import { Loader2, ArrowLeft, XCircle, ChevronLeft, ChevronRight } from "lucide-react"
import axios from "axios"
import type { TopUpForm, GameProduct } from "./types"
import { supabase } from "./lib/supabase"

const AdminPage = lazy(() => import("./pages/AdminPage").then((module) => ({ default: module.AdminPage })))
const ResellerPage = lazy(() => import("./pages/ResellerPage").then((module) => ({ default: module.ResellerPage })))

function App() {
  const [form, setForm] = useState<TopUpForm>(() => {
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
  const [formErrors, setFormErrors] = useState<{ userId?: string; serverId?: string; paymentMethod?: string }>({})
  const [products, setProducts] = useState<GameProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdminRoute, setIsAdminRoute] = useState(false)
  const [isResellerRoute, setIsResellerRoute] = useState(false)
  const [isResellerLoggedIn, setIsResellerLoggedIn] = useState(false)
  const [showPopupBanner, setShowPopupBanner] = useState(true)
  const [paymentCooldown, setPaymentCooldown] = useState(0)
  const [cooldownInterval, setCooldownInterval] = useState<NodeJS.Timeout | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "successful" | "failed">("idle")
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)

  // Banner images
  const bannerImages = [
    "https://raw.githubusercontent.com/Mengly08/xnxx/refs/heads/main/photo_2025-06-17_23-29-27.jpg",
    "https://raw.githubusercontent.com/Mengly08/xnxx/refs/heads/main/photo_2025-06-17_23-29-27.jpg",
    "https://raw.githubusercontent.com/Mengly08/xnxx/refs/heads/main/photo_2025-06-17_23-29-27.jpg",
  ]

  const specialOffers = [
    "https://raw.githubusercontent.com/Mengly08/xnxx/refs/heads/main/photo_2025-06-25_07-05-23.jpg",
    "https://raw.githubusercontent.com/Mengly08/xnxx/refs/heads/main/photo_2025-06-25_07-05-08.jpg",
    "https://raw.githubusercontent.com/Mengly08/xnxx/refs/heads/main/photo_2025-06-25_07-05-37.jpg",
  ]

  // Diamond combination mapping
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

  // Format item display based on diamond combinations
  const formatItemDisplay = (product: GameProduct | null) => {
    if (!product) return "None"
    const identifier = product.diamonds || product.name
    const combo = diamondCombinations[identifier]
    if (!combo) return identifier
    return combo.breakdown.endsWith("+0bonus") ? combo.total : `${combo.total} (${combo.breakdown})`
  }

  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname
      setIsAdminRoute(path === "/adminlogintopup")
      setIsResellerRoute(path === "/reseller")
      const resellerAuth = localStorage.getItem("PANDA KH_reseller_auth")
      setIsResellerLoggedIn(resellerAuth === "true")
    }
    checkRoute()
    window.addEventListener("popstate", checkRoute)
    return () => window.removeEventListener("popstate", checkRoute)
  }, [])

  useEffect(() => {
    if (!isAdminRoute && !isResellerRoute && showTopUp) {
      fetchProducts(form.game)
    }
  }, [form.game, isAdminRoute, isResellerRoute, showTopUp])

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
    setPaymentCooldown(3)
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

  const fetchProducts = async (game: "mlbb" | "freefire") => {
    console.log("Fetching products for:", game)
    setLoading(true)
    try {
      const table = game === "mlbb" ? "mlbb_products" : game === "freefire" ? "freefire_products" : "gameshow_products"
      console.log("Using table:", table)
      const { data: products, error } = await supabase.from(table).select("*").order("id", { ascending: true })

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      console.log("Products fetched:", products?.length || 0)

      let transformedProducts: GameProduct[] = products.map((product) => ({
        id: product.id,
        name: product.name,
        diamonds: product.diamonds || undefined,
        price: product.price,
        currency: product.currency,
        type: product.type as "diamonds" | "subscription" | "special",
        game,
        image: product.image || undefined,
        code: product.code || undefined,
      }))

      const isReseller = localStorage.getItem("PANDA KH_reseller_auth") === "true"
      if (isReseller) {
        const { data: resellerPrices, error: resellerError } = await supabase
          .from("reseller_prices")
          .select("*")
          .eq("game", game)
        if (!resellerError && resellerPrices) {
          transformedProducts = transformedProducts.map((product) => {
            const resellerPrice = resellerPrices.find((rp) => rp.product_id === product.id && rp.game === product.game)
            return resellerPrice
              ? { ...product, price: resellerPrice.price, resellerPrice: resellerPrice.price }
              : product
          })
        }
      }
      console.log("Transformed products:", transformedProducts.length)
      setProducts(transformedProducts)
    } catch (error) {
      console.error(`Error fetching products for ${game}:`, error)
      setProducts([])
      alert("Failed to load products. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const validateAccount = async () => {
    if (!form.userId) return

    setValidating(true)
    setValidationResult(null)

    try {
      let response
      if (form.game === "mlbb") {
        if (!form.serverId) {
          setValidating(false)
          return
        }
        response = await axios.get(`https://api.isan.eu.org/nickname/ml?id=${form.userId}&zone=${form.serverId}`)
      } else {
        response = await axios.get(`https://rapidasiagame.com/api/v1/idff.php?UserID=${form.userId}`)
      }

      if (form.game === "mlbb" && response.data.success) {
        setValidationResult(response.data)
        setForm((prev) => ({ ...prev, nickname: response.data.name }))
      } else if (form.game === "freefire" && response.data.status === "success") {
        setValidationResult(response.data)
        setForm((prev) => ({ ...prev, nickname: response.data.username }))
      } else {
        setValidationResult(null)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred"
      console.error("Failed to validate account:", errorMessage)
      setValidationResult(null)
    } finally {
      setValidating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (paymentCooldown > 0) {
      console.log("Payment blocked due to cooldown:", paymentCooldown)
      return
    }

    const errors: { userId?: string; serverId?: string; paymentMethod?: string } = {}
    if (!form.userId) errors.userId = "User ID is required"
    if (form.game === "mlbb" && !form.serverId) errors.serverId = "Zone ID is required"
    if (!form.product) {
      alert("Please select a product")
      return
    }
    if (!selectedPayment) errors.paymentMethod = "Please select a payment method"
    if (!validationResult?.success && !validationResult?.status) {
      alert(`Please check your ${form.game === "mlbb" ? "Mobile Legends" : "Free Fire"} account first`)
      return
    }

    setFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      console.log("Form errors:", errors)
      return
    }

    setPaymentStatus("idle")
    const productIdentifier = form.product.code || form.product.diamonds || form.product.name
    const format =
      form.game === "mlbb"
        ? `${form.userId} ${form.serverId} ${productIdentifier}`
        : `${form.userId} 0 ${productIdentifier}`
    setOrderFormat(format)
    setShowCheckout(true)
    console.log("Payment modal opened with order:", format)
  }

  const clearSavedInfo = () => {
    localStorage.removeItem("customerInfo")
    setForm({ userId: "", serverId: "", product: null, game: form.game, nickname: undefined })
    setValidationResult(null)
    setPaymentStatus("idle")
  }

  const handleClosePayment = () => {
    setShowCheckout(false)
    setPaymentStatus("idle")
    startPaymentCooldown()
  }

  const nextBanner = () => {
    setCurrentBannerIndex((prev) => (prev + 1) % bannerImages.length)
  }

  const prevBanner = () => {
    setCurrentBannerIndex((prev) => (prev - 1 + bannerImages.length) % bannerImages.length)
  }

  if (isAdminRoute) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin" /> Loading...
          </div>
        }
      >
        <AdminPage />
      </Suspense>
    )
  }

  if (isResellerRoute) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin" /> Loading...
          </div>
        }
      >
        <ResellerPage
          onLogin={() => {
            setIsResellerLoggedIn(true)
            window.location.href = "/"
          }}
        />
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-fixed bg-cover bg-center flex flex-col" style={{ backgroundColor: "#1f2138" }}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Concert+One&family=Dangrek&display=swap');
          
          .concert-one-regular {
            font-family: "Concert One", sans-serif;
            font-weight: 400;
            font-style: normal;
          }
          
          .dangrek {
            font-family: "Dangrek", serif;
            font-weight: 400;
            font-style: normal;
          }
          
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          
          @keyframes glow {
            0% { box-shadow: 0 0 10px rgba(231, 42, 245, 0.5), 0 0 20px rgba(231, 42, 245, 0.3); }
            50% { box-shadow: 0 0 20px rgba(231, 42, 245, 0.8), 0 0 30px rgba(231, 42, 245, 0.5); }
            100% { box-shadow: 0 0 10px rgba(231, 42, 245, 0.5), 0 0 20px rgba(231, 42, 245, 0.3); }
          }
          .glow-effect {
            animation: glow 2s infinite;
          }
          .mlbb-form4 {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #5aff4a;
            padding: 10px;
            border-radius: 8px;
            width: 100%;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
          }
          .mlbb-container43 {
            display: flex;
            flex-direction: column;
            color: #fff;
          }
          .mlbb-text30, .mlbb-text33 {
            font-size: 14px;
            margin-bottom: 5px;
          }
          .mlbb-text32, .mlbb-text35 {
            font-weight: bold;
            margin-left: 5px;
          }
          .mlbb-container44 {
            display: flex;
            justify-content: flex-end;
          }
          .mlbb-button2 {
            display: flex;
            align-items: center;
            background-color: #fff;
            color: #5aff4a;
            padding: 8px 16px;
            border-radius: 5px;
            border: 2px solid #5aff4a;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: background-color 0.3s, color 0.3s;
          }
          .mlbb-button2:hover {
            background-color: #ff1493;
            color: #fff;
          }
          .mlbb-button2:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .mlbb-icon64 {
            margin-right: 8px;
          }
          .mlbb-text36 {
            text-transform: uppercase;
          }
          .payment-option {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background-color: #5aff4a;
            padding: 10px;
            border-radius: 8px;
            width: 100%;
            height: 60px;
            cursor: pointer;
            transition: background-color 0.3s;
          }
          .payment-option.selected {
            background-color: #ff1493;
          }
          .payment-option-content {
            display: flex;
            align-items: center;
            color: #fff;
          }
          .payment-option img {
            width: 40px;
            height: 40px;
            margin-right: 10px;
          }
          .payment-option-text {
            font-size: 16px;
            font-weight: bold;
          }
          .payment-option-subtext {
            font-size: 12px;
          }
          .selection-circle {
            width: 20px;
            height: 20px;
            border: 2px solid #fff;
            border-radius: 50%;
            cursor: pointer;
            transition: background-color 0.3s, border-color 0.3s;
          }
          .selection-circle.selected {
            background-color: #fff;
          }
          .main-top {
            display: flex;
            align-items: center;
            background-color: #5aff4a;
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 10px;
          }
          .img-cover {
            flex: 0 0 auto;
            margin-right: 10px;
          }
          .img-cover img {
            width: 50px;
            height: 50px;
            object-fit: contain;
            border-radius: 8px;
          }
          .content-bloc {
            flex: 1;
            color: #fff;
          }
          .title {
            font-size: 20px;
            font-weight: bold;
            margin: 0;
            color: #fff;
          }
          .list {
            list-style: none;
            padding: 0;
            margin: 5px 0 0 0;
          }
          .sub {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 14px;
          }
          .text {
            color: #fff;
          }
          .p-content {
            font-size: 14px;
            color: #fff;
            margin: 10px 0;
          }
          .kh-font {
            font-family: 'Khmer', sans-serif;
            font-size: 10px;
            color: #fff;
          }
          
          /* Professional Game Card Styles */
          .game-card {
            background: white;
            border-radius: 12px;
            padding: 12px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: visible;
            border: 1px solid white;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 180px;
            height: 188px;
          }

          .game-card:hover {
            opacity: 0.8;
            transform: none;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .game-card-available {
            border-color: white;
          }

          .game-card-coming-soon {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .game-card-coming-soon:hover {
            opacity: 0.7;
            transform: none;
          }

          .status-badge {
            display: none;
          }

          .game-icon {
            width: 100px;
            height: 100px;
            border-radius: 12px;
            margin: 0 auto 8px;
            object-fit: cover;
            transition: transform 0.3s ease;
            aspect-ratio: 1;
          }

          .game-card:hover .game-icon {
            transform: none;
          }

          .game-title {
            font-size: 12px;
            font-weight: 800;
            color: #545454;
            text-align: center;
            margin-bottom: 12px;
            line-height: 1.3;
            width: 98.66px;
            height: 46px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-stroke: 2px black;
            -webkit-text-stroke: 2px black;
          }

          @media (min-width: 640px) {
            .game-title {
              font-size: 20px;
            }
          }

          .game-subtitle {
            display: none;
          }

          .game-button {
            background-color: #545454;
            color: white;
            padding: 8px 16px;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 600;
            text-align: center;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
            text-transform: none;
            letter-spacing: normal;
            white-space: nowrap;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: translateY(20px);
            width: 148px;
            height: 32px;
          }

          @media (min-width: 768px) {
            .game-button {
              width: 148px;
              height: 32px;
            }
          }

          @media (min-width: 640px) {
            .game-button {
              font-size: 16px;
            }
          }

          .button-available:hover {
            background-color: #374151;
          }

          .button-coming-soon {
            background-color: #9CA3AF;
            color: #6B7280;
            cursor: not-allowed;
          }

          /* Fixed Product List Styles */
          .product-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            padding: 0 16px;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
          }

          .product-card-150x72 {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            height: 48px !important;
            min-height: 48px !important;
            max-height: 48px !important;
            background: #ffffff;
            border-radius: 8px;
            padding: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            border: 2px solid #2196F3;
          }

          .product-card-150x72:hover {
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
            border-color: #1976D2;
          }

          .product-card-150x72.selected {
            background: #e3f2fd;
            border-color: #1565C0;
            box-shadow: 0 0 0 2px rgba(21, 101, 192, 0.2);
          }

          .product-card-150x72 .product-image {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            object-fit: cover;
            flex-shrink: 0;
          }

          .product-card-150x72 .product-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 2px;
            min-width: 0;
          }

          .product-card-150x72 .product-title {
            font-size: 11px;
            font-weight: 600;
            color: #1a1a1a;
            line-height: 1.2;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            word-break: break-word;
          }

          .product-card-150x72 .product-price {
            font-size: 12px;
            font-weight: 700;
            color: #00bcd4;
            white-space: nowrap;
          }

          .product-card-150x72 .selected-indicator {
            position: absolute;
            top: -2px;
            right: -2px;
            width: 0;
            height: 0;
            border-top: 16px solid #00bcd4;
            border-left: 16px solid transparent;
            border-radius: 0 8px 0 0;
          }

          .product-card-150x72 .selected-indicator::after {
            content: '✓';
            position: absolute;
            top: -14px;
            right: 1px;
            color: white;
            font-size: 10px;
            font-weight: bold;
          }

          /* Responsive adjustments */
          @media (max-width: 480px) {
            .product-grid {
              gap: 8px;
              padding: 0 12px;
              grid-template-columns: repeat(2, 1fr);
            }
            
            .product-card-150x72 {
              width: 100% !important;
              height: 48px !important;
              padding: 6px;
              gap: 6px;
            }
            
            .product-card-150x72 .product-image {
              width: 28px;
              height: 28px;
            }
            
            .product-card-150x72 .product-title {
              font-size: 10px;
            }
            
            .product-card-150x72 .product-price {
              font-size: 11px;
            }
          }

          /* Ensure no white panels or dividers */
          .right-panel {
            background-color: #2a2c4a;
            border-radius: 8px;
            padding: 16px;
          }

          .line-clamp-1 {
            overflow: hidden;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 1;
          }

          .line-clamp-2 {
            overflow: hidden;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
          }
        `}
      </style>

      {/* Animated Header */}
      <nav
        className="p-4 shadow-md flex items-center justify-between w-full top-0 z-50"
        style={{
          height: "100px",
          backgroundImage: 'url("https://raw.githubusercontent.com/Mengly08/xnxx/refs/heads/main/photo_2025-06-26_10-53-57.jpg")',
          backgroundSize: "contain",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#0000FF",
        }}
      >
        <div className="container mx-auto flex items-center justify-between w-full">
          <div className="flex items-center space-x-4">
            <p className="text-xs text-white/80 dangrek"></p>
          </div>
        </div>
      </nav>

      <div className="flex-grow">
        {!showTopUp ? (
          <main>
            {/* Main Banner */}
            <div className="w-full p-4 m-0 mt-[10px]">
              <div className="rounded-lg overflow-hidden">
                <div className="relative h-auto group">
                  <img
                    src={bannerImages[currentBannerIndex] || "/placeholder.svg"}
                    alt={`Banner ${currentBannerIndex + 1}`}
                    className="w-full object-cover transition-opacity duration-500"
                    style={{ maxHeight: "500px", width: "100%", objectFit: "cover" }}
                  />
                  <button
                    onClick={prevBanner}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/30 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextBanner}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/30 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                    {bannerImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentBannerIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          index === currentBannerIndex ? "bg-white w-4" : "bg-white/50 hover:bg-white/80"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Special Offers */}
            <div className="w-full p-4 sm:p-4 bg-[#1f2138]">
              <div className="container mx-auto">
                <div className="mb-2 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-white concert-one-regular">SPECIAL OFFERS</h3>
                  <p className="text-xs sm:text-sm text-gray-300 dangrek">
                    {"Don't miss out! Top up now and grab exclusive promotion!"}
                  </p>
                </div>
                <div className="flex flex-row overflow-x-auto space-x-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4 sm:space-x-0 scrollbar-hide">
                  {specialOffers.map((offer, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0 overflow-hidden cursor-pointer w-[160px] h-[80px] sm:w-full sm:h-[120px] md:h-[150px] lg:h-[180px]"
                    >
                      <img
                        src={offer || "/placeholder.svg"}
                        alt={`Child Banner ${index + 1}`}
                        className="w-full h-full object-contain transition-opacity duration-300 hover:opacity-90"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Games Section */}
            <div className="max-w-7xl mx-auto px-4 py-8">
              {/* Section Header */}
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 concert-one-regular">MOBILE GAMES</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-[#FFDE01] to-[#FFB800] mx-auto rounded-full"></div>
              </div>

              {/* Available Games */}
              <div className="mb-16">
                <h3 className="text-xl font-semibold text-white mb-8 concert-one-regular flex items-center">
                  <div className="w-3 h-3 bg-[#5AFF4A] rounded-full mr-3"></div>
                  Available Now
                </h3>
                <div className="flex justify-center gap-6">
                  {/* Free Fire Card */}
                  <a
                    onClick={() => {
                      setForm((prev) => ({ ...prev, game: "freefire" }))
                      setShowTopUp(true)
                    }}
                    className="game-card game-card-available cursor-pointer"
                  >
                    <div>
                      <img
                        src="https://i.postimg.cc/d1R9p3KG/Brown-Mascot-Gamer-Logo-2.jpg"
                        alt="Free Fire KH"
                        className="game-icon"
                      />
                    </div>
                    <div className="game-title">Free Fire KH</div>
                    <div className="flex items-center justify-center w-full">
                      <button className="game-button button-available">Top - Up</button>
                    </div>
                  </a>

                  {/* Mobile Legends Card */}
                  <a
                    onClick={() => {
                      setForm((prev) => ({ ...prev, game: "mlbb" }))
                      setShowTopUp(true)
                    }}
                    className="game-card game-card-available cursor-pointer"
                  >
                    <div>
                      <img
                        src="https://i.postimg.cc/05B6xx2S/Brown-Mascot-Gamer-Logo-6.jpg"
                        alt="Mobile Legends KH"
                        className="game-icon"
                      />
                    </div>
                    <div className="game-title">Mobile Legends KH</div>
                    <div className="flex items-center justify-center w-full">
                      <button className="game-button button-available">Top - Up</button>
                    </div>
                  </a>
                </div>
              </div>

              {/* Coming Soon Games */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-8 concert-one-regular flex items-center">
                  <div className="w-3 h-3 bg-[#FF1493] rounded-full mr-3"></div>
                  Coming Soon
                </h3>
                <div className="flex justify-center gap-6 mb-6">
                  {/* BABA JI */}
                  <div className="game-card game-card-coming-soon">
                    <div className="status-badge status-coming-soon">Coming Soon</div>
                    <img
                      src="https://static.gameloop.com/syzs_cms/202411/0c1b802dbf58e04cf330d4631741e980.png?imageMogr2/thumbnail/172.8x172.8/format/webp"
                      alt="BABA JI"
                      className="game-icon"
                    />
                    <h3 className="game-title">BABA JI</h3>
                    <button className="game-button button-coming-soon">Coming Soon</button>
                  </div>

                  {/* Mobile Legends PH */}
                  <div className="game-card game-card-coming-soon">
                    <div className="status-badge status-coming-soon">Coming Soon</div>
                    <img
                      src="https://raw.githubusercontent.com/Cheagjihvg/feliex-assets/refs/heads/main/IMG_2707.PNG"
                      alt="Mobile Legends PH"
                      className="game-icon"
                    />
                    <h3 className="game-title">MLBB PH</h3>
                    <button className="game-button button-coming-soon">Coming Soon</button>
                  </div>
                </div>
                <div className="flex justify-center gap-6">
                  {/* PUBG Mobile */}
                  <div className="game-card game-card-coming-soon">
                    <div className="status-badge status-coming-soon">Coming Soon</div>
                    <img
                      src="https://i.postimg.cc/QCLqYpZR/pubg-mobile-icon.png"
                      alt="PUBG Mobile"
                      className="game-icon"
                    />
                    <h3 className="game-title">PUBG Mobile</h3>
                    <button className="game-button button-coming-soon">Coming Soon</button>
                  </div>

                  {/* Genshin Impact */}
                  <div className="game-card game-card-coming-soon">
                    <div className="status-badge status-coming-soon">Coming Soon</div>
                    <img
                      src="https://i.postimg.cc/9FLzYpKR/genshin-impact-icon.png"
                      alt="Genshin Impact"
                      className="game-icon"
                    />
                    <h3 className="game-title">Genshin Impact</h3>
                    <button className="game-button button-coming-soon">Coming Soon</button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        ) : (
          <main className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowTopUp(false)
                    setShowCheckout(false)
                    setValidationResult(null)
                    setForm((prev) => ({ ...prev, nickname: undefined }))
                    setPaymentStatus("idle")
                  }}
                  className="text-white bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                {(form.userId || form.serverId) && (
                  <button
                    onClick={clearSavedInfo}
                    className="text-red-300 bg-red-500/10 px-3 py-1.5 rounded-lg flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Clear
                  </button>
                )}
              </div>

              <div className="right-panel rounded-xl p-6" style={{ backgroundColor: "#2a2c4a" }}>
                <style jsx>{`
                  .right-panel {
                    font-family: inherit;
                  }
                  .section {
                    margin-bottom: 2rem;
                  }
                  .section-title {
                    display: flex;
                    align-items: center;
                    margin-bottom: 1rem;
                  }
                  .index {
                    background: #FFDE01;
                    color: black;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    margin-right: 1rem;
                  }
                  .title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: white;
                  }
                  .section-sub {
                    padding-left: 3rem;
                  }
                  .check-id {
                    margin-bottom: 2rem;
                  }
                  .game-part {
                    margin-bottom: 1rem;
                  }
                  .game-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    margin-bottom: 1rem;
                  }
                  .col input {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    font-size: 1rem;
                  }
                  .game-checkid-btn {
                    margin-bottom: 1rem;
                  }
                  .game-checkid-btn-sub {
                    background-color: #FFDE01;
                    color: black;
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background-color 0.3s;
                  }
                  .game-checkid-btn-sub:hover:not(:disabled) {
                    background-color: #FFB800;
                  }
                  .game-checkid-btn-sub:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                  }
                  .content {
                    font-size: 0.875rem;
                    color: white;
                    line-height: 1.5;
                  }
                  .promotion {
                    margin-bottom: 2rem;
                  }
                  .title-section {
                    margin-bottom: 1rem;
                  }
                  .title-cover {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: white;
                  }
                  .package-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 1rem;
                    list-style: none;
                    padding: 0;
                    margin: 0;
                  }
                  .package-card {
                    background: white;
                    border: 2px solid #f0f0f0;
                    border-radius: 12px;
                    padding: 1rem;
                    cursor: pointer;
                    transition: all 0.3s;
                  }
                  .package-card:hover {
                    border-color: #FFDE01;
                    transform: translateY(-2px);
                  }
                  .package.active {
                    border-color: #FFDE01;
                    background: #FFFBF0;
                  }
                  .package {
                    width: 100%;
                  }
                  .top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                  }
                  .package-content {
                    flex: 1;
                  }
                  .package-price {
                    font-size: 1.25rem;
                    font-weight: bold;
                    color: #333;
                    margin: 0 0 0.25rem 0;
                  }
                  .package-title {
                    font-size: 0.875rem;
                    color: #666;
                    margin: 0;
                  }
                  .img {
                    width: 50px;
                    height: 50px;
                    border-radius: 8px;
                  }
                  .payment {
                    list-style: none;
                    padding: 0;
                    margin: 0 0 2rem 0;
                  }
                  .select-bloc {
                    width: 100%;
                    background: none;
                    border: none;
                    padding: 0;
                    cursor: pointer;
                  }
                  .select {
                    display: flex;
                    align-items: center;
                    padding: 1rem;
                    border: 2px solid #f0f0f0;
                    border-radius: 12px;
                    transition: all 0.3s;
                  }
                  .select.active {
                    border-color: #FFDE01;
                    background: #FFFBF0;
                  }
                  .logo {
                    width: 60px;
                    height: 60px;
                    margin-right: 1rem;
                  }
                  .logo img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    border-radius: 10px;
                  }
                  .select-content {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex: 1;
                  }
                  .select-content .title {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: #333;
                    margin: 0 0 0.25rem 0;
                  }
                  .dsp {
                    font-size: 0.875rem;
                    color: #666;
                    margin: 0;
                  }
                  .term {
                    margin-bottom: 2rem;
                  }
                  .term .title {
                    font-size: 1rem;
                    font-weight: 600;
                    color: white;
                    margin-bottom: 1rem;
                  }
                  .checkbox {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                  }
                  .checkbox p {
                    color: white;
                  }
                  .custom-checkbox {
                    width: 18px;
                    height: 18px;
                  }
                  .link {
                    color: #FFDE01;
                    text-decoration: underline;
                  }
                  .total {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem;
                    background: #f8f9fa;
                    border-radius: 12px;
                  }
                  .total .title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #333;
                  }
                  .btn-cover {
                    background: none;
                    border: none;
                    padding: 0;
                  }
                  .btn-submit {
                    background: #FFDE01;
                    color: black;
                    padding: 0.75rem 2rem;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background-color 0.3s;
                  }
                  .btn-submit:hover {
                    background: #FFB800;
                  }
                  .btn-cover:disabled .btn-submit {
                    opacity: 0.5;
                    cursor: not-allowed;
                  }
                `}</style>

                <section className="section">
                  <div className="section-title">
                    <div className="index">
                      <span>01</span>
                    </div>
                    <div className="title">
                      <p>បញ្ចូលព័ត៌មានរបស់អ្នក</p>
                    </div>
                  </div>
                  <div className="section-sub">
                    <div className="check-id">
                      <form onSubmit={handleSubmit}>
                        <div className="game-part">
                          <div className="game-row">
                            <div className="col">
                              <input
                                type="text"
                                name="number"
                                className="form-control"
                                placeholder="User ID"
                                required
                                id="userId"
                                value={form.userId}
                                onChange={(e) => {
                                  const value = e.target.value.trim().replace(/[^0-9]/g, "")
                                  setForm((prev) => ({ ...prev, userId: value, nickname: undefined }))
                                  setValidationResult(null)
                                  setFormErrors((prev) => ({ ...prev, userId: undefined }))
                                }}
                              />
                            </div>
                            {form.game === "mlbb" && (
                              <div className="col">
                                <input
                                  type="text"
                                  name="number"
                                  className="form-control"
                                  placeholder="Zone ID"
                                  required
                                  id="zoneId"
                                  value={form.serverId}
                                  onChange={(e) => {
                                    const value = e.target.value.trim().replace(/[^0-9]/g, "")
                                    setForm((prev) => ({ ...prev, serverId: value, nickname: undefined }))
                                    setValidationResult(null)
                                    setFormErrors((prev) => ({ ...prev, serverId: undefined }))
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          <div className="game-checkid-btn">
                            <button
                              type="button"
                              className="game-checkid-btn-sub"
                              disabled={!form.userId || (form.game === "mlbb" && !form.serverId) || validating}
                              onClick={validateAccount}
                            >
                              {validating ? "Checking..." : "Check ID"}
                            </button>
                          </div>
                        </div>
                      </form>
                      <div className="pt-2">
                        <p className="content">
                          ដើម្បីឃើញ UserID សូមចូលទៅក្នងហ្គេម ហើយចុចរូបភាព Avatar នៅខាងឆ្វេងអេក្រង់កញ្ចក់ ហើយចុចទៅកាន់"Check ID" ពេលនោះ
                          User ID និងបង្ហាញឲ្យឃើញ បន្ទាប់មកសូមយក User ID នោះមកបំពេញ។ ឧទាហរណ៍: User ID: 123456789, Zone ID: 1234។
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="w-full max-w-4xl mx-auto px-4 py-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#0000FF] rounded-full flex items-center justify-center text-white dangrek">
                      2
                    </div>
                    <p className="text-lg text-white dangrek">ជ្រើសរើសកញ្ជប់</p>
                  </div>

                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">ជ្រើសរើសកញ្ចប់ពេជ្យ</h2>
                    <p className="text-white">Choose your preferred package</p>
                  </div>

                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      <span className="ml-2 text-gray-600">Loading products...</span>
                    </div>
                  ) : products.length > 0 ? (
                    <div className="space-y-6 font-poppins">
                      {/* Best Seller Section */}
                      {products.filter((p) => p.type === "special").length > 0 && (
                        <div>
                          <img
                            src="https://sjc.microlink.io/fGUvt6iF919NvXcbsv3TXpIZOOtMr46-x63mqi6iZSxW1XK9WLX0Hr5eAFYFwCXs2UOovX5bhHwbTGCD29j88w.jpeg"
                            alt="Promotion"
                            className="mb-3 mx-auto block"
                            style={{ width: "128.84px", height: "48px" }}
                          />
                          <div className="product-grid">
                            {products
                              .filter((p) => p.type === "special")
                              .map((product) => (
                                <div
                                  key={product.id}
                                  onClick={() => setForm((prev) => ({ ...prev, product }))}
                                  className={`product-card-150x72 ${form.product?.id === product.id ? "selected" : ""}`}
                                >
                                  {form.product?.id === product.id && <div className="selected-indicator"></div>}
                                  <img
                                    src={product.image || "/placeholder.svg?height=40&width=40"}
                                    alt={product.name}
                                    className="product-image"
                                    loading="lazy"
                                  />
                                  <div className="product-content">
                                    <h3 className="product-title">{formatItemDisplay(product)}</h3>
                                    <p className="product-price">${product.price.toFixed(2)}</p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Saving Packages Section */}
                      {products.filter((p) => p.type === "diamonds" || p.type === "subscription").length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <div className="p-1.5 bg-blue-500/10 rounded-lg shadow-sm"></div>
                            Saving Packages
                          </h3>
                          <div className="space-y-2">
                            <div className="product-grid">
                              {products
                                .filter((p) => p.type === "diamonds" || p.type === "subscription")
                                .map((product) => (
                                  <div
                                    key={product.id}
                                    onClick={() => setForm((prev) => ({ ...prev, product }))}
                                    className={`product-card-150x72 ${form.product?.id === product.id ? "selected" : ""}`}
                                  >
                                    {form.product?.id === product.id && <div className="selected-indicator"></div>}
                                    <img
                                      src={product.image || "/placeholder.svg?height=40&width=40"}
                                      alt={product.name}
                                      className="product-image"
                                      loading="lazy"
                                    />
                                    <div className="product-content">
                                      <h3 className="product-title">{formatItemDisplay(product)}</h3>
                                      <p className="product-price">${product.price.toFixed(2)}</p>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="bg-white/5 rounded-xl p-6 border border-gray-200 shadow-lg">
                        <svg
                          className="w-10 h-10 text-gray-400 mx-auto mb-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3l14 9-14 9V3z" />
                        </svg>
                        <p className="text-lg font-medium text-white">
                          No products available for {form.game === "mlbb" ? "Mobile Legends" : "Free Fire"}".
                        </p>
                        <p className="text-sm text-white mt-1">Please check back later for new products.</p>
                      </div>
                    </div>
                  )}
                </section>

                <section className="section">
                  <div className="section-title">
                    <div className="index">
                      <span>03</span>
                    </div>
                    <div className="title">
                      <p>បង់ប្រាក់</p>
                    </div>
                  </div>
                  <div className="section-sub">
                    <ul className="payment">
                      <li>
                        <button
                          type="button"
                          className="select-bloc"
                          onClick={() => setSelectedPayment(selectedPayment === "khqr" ? null : "khqr")}
                        >
                          <div className={`select ${selectedPayment === "khqr" ? "active" : ""}`}>
                            <div className="logo">
                              <img
                                alt="ABA KHQR"
                                width="512"
                                height="461"
                                src="https://www.saktopup.com/_next/image?url=%2Fassets%2Fmain%2Fkhqr-lg.webp&w=1920&q=75"
                              />
                            </div>
                            <div className="select-content">
                              <div className="content">
                                <p className="title">ABA KHQR</p>
                                <p className="dsp">Scan to pay with any banking app</p>
                              </div>
                              <div className="flex" style={{ alignItems: "center", paddingTop: "5px" }}>
                                <div>
                                  <div
                                    style={{
                                      padding: "5px",
                                      border: "1px solid black",
                                      borderRadius: "100px",
                                      display: "flex",
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: "10px",
                                        height: "10px",
                                        backgroundColor: selectedPayment === "khqr" ? "black" : "transparent",
                                        borderRadius: "100px",
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      </li>
                    </ul>
                    <div className="term">
                      <h2 className="title">TERMS & CONDITION</h2>
                      <div className="checkbox">
                        <div>
                          <input type="checkbox" id="accept" className="custom-checkbox" />
                        </div>
                        <p>
                          ខ្ញុំយល់ព្រមតាម{" "}
                          <a className="link" href="/term-and-policy">
                            <span className="text">លក្ខខណ្ឌ</span>
                          </a>
                        </p>
                      </div>
                    </div>
                    <div className="total">
                      <div className="title">
                        <p>
                          សរុប:{" "}
                          <span style={{ color: "#FFDE01" }}>
                            ${form.product ? form.product.price.toFixed(2) : "0.00"}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-cover"
                        disabled={
                          (!validationResult?.success && !validationResult?.status) ||
                          !form.product ||
                          paymentCooldown > 0 ||
                          !selectedPayment
                        }
                        onClick={handleSubmit}
                      >
                        <div className="btn-submit">
                          <span>ទិញឥឡូវនេះ</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </main>
        )}

        {/* Support Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => window.open("https://t.me/PANDA KHchannel", "_blank")}
            className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-full shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              <img
                src="https://raw.githubusercontent.com/Mengly08/xnxx/refs/heads/main/photo_2025-06-13_09-34-17%20(1).png"
                alt="Support Icon"
                className="w-16 h-16 rounded-full object-cover"
              />
            </div>
          </button>
        </div>

        {/* Professional Footer */}
        <footer className="relative bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white py-16 border-t-4 border-[#FFDE01] shadow-2xl overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-transparent to-purple-900/20"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg%20width=%2260%22%20height=%2260%22%20viewBox=%220%200%2060%2060%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill=%22none%22%20fillRule=%22evenodd%22%3E%3Cg%20fill=%22%23ffffff%22%20fillOpacity=%220.05%22%3E%3Ccircle%20cx=%2230%22%20cy=%2230%22%20r=%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
          </div>

          <div className="container mx-auto px-6 relative z-10">
            {/* Main Footer Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-16">
              {/* Left Side - Brand & Description */}
              <div className="space-y-8">
                <div className="group">
                  <div className="flex items-center space-x-4 mb-6">
                    <img
                      alt="PANDA KH Logo"
                      src="https://raw.githubusercontent.com/Mengly08/xnxx/refs/heads/main/photo_2025-06-13_09-34-17%20(1).png"
                      className="h-16 w-16 rounded-full transition-all duration-300 group-hover:scale-110 shadow-lg hover:shadow-xl hover:shadow-[#FFDE01]/20 object-cover border-2 border-[#FFDE01]/30"
                    />
                    <div>
                      <h3 className="text-2xl font-bold text-[#FFDE01] concert-one-regular">PANDA KH</h3>
                      <p className="text-sm text-white-400 dangrek">Premium Gaming Top-Up Service</p>
                    </div>
                  </div>
                  <p className="text-white-300 text-base leading-relaxed max-w-lg dangrek">
                    Experience seamless online game top-up services with unbeatable deals on Mobile Legends, Free Fire,
                    and more. Fast, secure, and reliable transactions every time with 24/7 customer support.
                  </p>
                </div>

                {/* Why Choose Us */}
                <div>
                  <h4 className="text-xl font-bold mb-6 text-[#FFDE01] border-b border-[#FFDE01]/30 pb-2 concert-one-regular">
                    Why Choose PANDA KH?
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#5AFF4A] rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold text-white text-sm">Lowest Prices</p>
                        <p className="text-xs text-white-400 dangrek">Best rates guaranteed</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#5AFF4A] rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold text-white text-sm">Instant Delivery</p>
                        <p className="text-xs text-white-400 dangrek">Within 5-10 minutes</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#5AFF4A] rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold text-white text-sm">Secure Payment</p>
                        <p className="text-xs text-white-400 dangrek">Multiple payment options</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#5AFF4A] rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold text-white text-sm">24/7 Support</p>
                        <p className="text-xs text-white-400 dangrek">Always here to help</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Contact & Social */}
              <div className="space-y-8">
                {/* Contact Information */}
                <div>
                  <h4 className="text-xl font-bold mb-6 text-[#FFDE01] border-b border-[#FFDE01]/30 pb-2 concert-one-regular">
                    Get In Touch
                  </h4>
                  <div className="space-y-4">
                    <p className="text-white-300 text-sm dangrek">
                      Need help? Contact us via Telegram for instant support and assistance with your orders.
                    </p>
                    <a
                      href="https://t.me/PANDA KHchannel"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-6 py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 group"
                    >
                      <svg
                        className="w-5 h-5 group-hover:scale-110 transition-transform"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19c-.14.75-.42 1-.68 1.03c-.58.05-1.02-.38-1.58-.75c-.88-.58-1.38-.94-2.23-1.5c-.94-.65-.33-1.01.21-1.59c.14-.15 2.71-2.48 2.76-2.69c.01-.05.01-.10-.02-.14c-.04-.05-.10-.03-.14-.02c-.06.02-1.49.95-4.22 2.79c-.40.27-.76.41-1.08.40c-.36-.01-1.04-.20-1.55-.37c-.63-.20-1.13-.31-1.09-.66c.02-.18.27-.36.74-.55c2.92-1.27 4.86-2.11 5.83-2.51c2.78-1.16 3.35-1.36 3.73-1.36c.08 0 .27.02.39.12c.10.08.13.19.12.27"></path>
                      </svg>
                      <span className="font-semibold">Contact Support</span>
                    </a>
                  </div>
                </div>

                {/* Social Media */}
                <div>
                  <h4 className="text-xl font-bold mb-6 text-[#FFDE01] border-b border-[#FFDE01]/30 pb-2 concert-one-regular">
                    Follow Us
                  </h4>
                  <div className="flex flex-wrap gap-4">
                    <a
                      href="https://www.facebook.com/share/1KSfDF4py9/?mibextid=wwXIfr"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center justify-center w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-600/40"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.04c-5.5 0-10 4.49-10 10.02c0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89c1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02"></path>
                      </svg>
                    </a>
                    <a
                      href="https://www.instagram.com/"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-pink-500/40"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1-1.25-1.25M12 8a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4"></path>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Copyright & Credits */}
            <div className="border-t border-gray-700 pt-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-white-400 text-sm order-2 md:order-1 dangrek">
                  © {new Date().getFullYear()} PANDA KH. All rights reserved.
                </p>
                <div className="order-1 md:order-2 flex items-center gap-4">
                  <a
                    href="/term-and-policy"
                    className="text-white-400 hover:text-white text-sm transition-colors dangrek"
                  >
                    Terms of Service
                  </a>
                  <a
                    href="/privacy-policy"
                    className="text-white-400 hover:text-white text-sm transition-colors dangrek"
                  >
                    Privacy Policy
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App
