"use client"

import { useState, useEffect } from "react"
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Shield,
  Zap,
  Clock,
  Search,
  Bell,
  Menu,
  X,
  User,
  Settings,
  Gamepad2,
  ShoppingCart,
  CreditCard,
  Flame,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

export default function PandaTopup() {
  const [currentBanner, setCurrentBanner] = useState(0)
  const [currentTime, setCurrentTime] = useState("")
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showPromoPopup, setShowPromoPopup] = useState(true)
  const [showCheckout, setShowCheckout] = useState(false)
  const [form, setForm] = useState({
    userId: "",
    serverId: "",
    product: null,
    game: "mlbb",
    nickname: undefined,
  })
  const [orderFormat, setOrderFormat] = useState("")
  const [discountPercent, setDiscountPercent] = useState(0)

  // Store config for popup banner
  const storeConfig = {
    popupBanner: {
      enabled: true,
      image: "/placeholder.svg?height=300&width=400&text=Special+Offer",
    },
  }

  const banners = [
    "/placeholder.svg?height=400&width=800&text=Mobile+Legends+Banner",
    "/placeholder.svg?height=400&width=800&text=Free+Fire+Banner",
    "/placeholder.svg?height=400&width=800&text=MLBB+Special+Offer",
  ]

  const popularGames = [
    {
      id: 1,
      name: "COIN TOPUP",
      subtitle: "Your balance:",
      image: "/placeholder.svg?height=80&width=80",
      available: true,
      popular: false,
      price: "TOPUP",
    },
    {
      id: 2,
      name: "Mobile Legends",
      subtitle: "Instant",
      image: "/placeholder.svg?height=80&width=80",
      available: true,
      popular: true,
      price: "TOPUP",
    },
    {
      id: 3,
      name: "Free Fire",
      subtitle: "Instant",
      image: "/placeholder.svg?height=80&width=80",
      available: true,
      popular: true,
      price: "TOPUP",
    },
  ]

  const gameCategories = [
    {
      id: 1,
      name: "MOBILE LEGENDS",
      developer: "MOONTON",
      image: "/placeholder.svg?height=120&width=200",
      badge: "តម្លៃទាបខ្លាំង",
      badgeColor: "bg-red-500",
    },
    {
      id: 2,
      name: "MLBB PH SG MY",
      developer: "MOONTON",
      image: "/placeholder.svg?height=120&width=200",
      badge: "តម្លៃទាប",
      badgeColor: "bg-green-500",
    },
    {
      id: 3,
      name: "MOBILE LEGENDS",
      developer: "INDONESIA 🇮🇩",
      image: "/placeholder.svg?height=120&width=200",
      badge: "តម្លៃទាប",
      badgeColor: "bg-green-500",
    },
    {
      id: 4,
      name: "FREE FIRE",
      developer: "GARENA",
      image: "/placeholder.svg?height=120&width=200",
      badge: "តម្លៃទាប",
      badgeColor: "bg-green-500",
    },
    {
      id: 5,
      name: "FREE FIRE VN",
      developer: "GARENA",
      image: "/placeholder.svg?height=120&width=200",
      badge: "តម្លៃទាប",
      badgeColor: "bg-green-500",
    },
    {
      id: 6,
      name: "FREE FIRE THAI",
      developer: "GARENA",
      image: "/placeholder.svg?height=120&width=200",
      badge: "តម្លៃទាប",
      badgeColor: "bg-green-500",
    },
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [banners.length])

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleString("en-US", {
          timeZone: "Asia/Bangkok",
          hour12: true,
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const nextBanner = () => {
    setCurrentBanner((prev) => (prev + 1) % banners.length)
  }

  const prevBanner = () => {
    setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length)
  }

  const handleClosePayment = () => {
    setShowCheckout(false)
  }

  // Mock PaymentModal component
  const PaymentModal = ({ form, orderFormat, onClose, discountPercent }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Payment Details</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-4">
          <p>
            <strong>Order:</strong> {orderFormat}
          </p>
          <p>
            <strong>Game:</strong> {form.game}
          </p>
          <p>
            <strong>Discount:</strong> {discountPercent}%
          </p>
          <Button className="w-full bg-green-600 hover:bg-green-700 text-white">Proceed to Payment</Button>
        </div>
      </div>
    </div>
  )

  // Mock PopupBanner component
  const PopupBanner = ({ image, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-white rounded-lg overflow-hidden max-w-sm mx-4">
        <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
        <Image
          src={image || "/placeholder.svg"}
          alt="Special Offer"
          width={400}
          height={300}
          className="w-full h-auto"
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-gray-700"
                onClick={() => setIsMenuOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </Button>

              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xl">P</span>
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full"></div>
                </div>
                <div className="hidden md:block">
                  <h1 className="text-2xl font-bold text-gray-800">PANDA TOPUP</h1>
                  <p className="text-sm text-gray-600">Premium Gaming Store</p>
                </div>
              </div>
            </div>

            {/* Center Section - Icons */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-700 hover:bg-gray-100"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search Mobile Legends and Free Fire"
              >
                <Search className="w-5 h-5" />
              </Button>

              <Button variant="ghost" size="icon" className="text-gray-700 hover:bg-gray-100" aria-label="Browse MLBB">
                <Gamepad2 className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="text-gray-700 hover:bg-gray-100"
                aria-label="Check Free Fire Events"
              >
                <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                  <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                </div>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="text-gray-700 hover:bg-gray-100"
                aria-label="View Shopping Cart"
                onClick={() => setShowCheckout(true)}
              >
                <ShoppingCart className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="text-gray-700 hover:bg-gray-100 relative"
                onClick={() => setIsNotificationOpen(true)}
              >
                <Bell className="w-5 h-5" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              </Button>

              {isLoggedIn ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsProfileOpen(true)}
                >
                  <User className="w-5 h-5" />
                </Button>
              ) : (
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setIsLoggedIn(true)}>
                  Log In
                </Button>
              )}

              <div className="text-right hidden lg:block">
                <p className="text-xs text-gray-600">{currentTime}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Banner */}
        <section className="container mx-auto px-4 py-8">
          <Card className="overflow-hidden border-gray-200">
            <div className="relative h-64 md:h-96 group">
              <Image
                src={banners[currentBanner] || "/placeholder.svg"}
                alt={`Banner ${currentBanner + 1}`}
                fill
                className="object-cover transition-all duration-700 ease-in-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>

              {/* Banner Content */}
              <div className="absolute bottom-8 left-8 text-white">
                <h2 className="text-3xl md:text-5xl font-bold mb-2">Mobile Legends & Free Fire</h2>
                <p className="text-lg mb-4">Get diamonds and items instantly with special offers for MLBB and FF</p>
                <Button className="bg-green-600 hover:bg-green-700">Buy Now</Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all duration-300"
                onClick={prevBanner}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all duration-300"
                onClick={nextBanner}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                {banners.map((_, index) => (
                  <button
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentBanner ? "bg-white scale-125" : "bg-white/50 hover:bg-white/80"
                    }`}
                    onClick={() => setCurrentBanner(index)}
                  />
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* Popular Games Section */}
        <section className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-800">Popular</h2>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-gray-600">Super Deals</span>
                  <div className="flex items-center space-x-1 text-green-600 font-mono">
                    <span id="hours">00</span>
                    <span>:</span>
                    <span id="minutes">00</span>
                    <span>:</span>
                    <span id="seconds">00</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button variant="outline" size="icon" className="border-gray-300">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="icon" className="border-gray-300">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {popularGames.map((game) => (
              <Card
                key={game.id}
                className="relative overflow-hidden border-gray-200 hover:border-green-300 transition-all duration-300 group cursor-pointer hover:shadow-lg"
              >
                {game.popular && (
                  <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold px-2 py-1 rounded-full z-10">
                    HOT
                  </div>
                )}

                <CardContent className="p-4 text-center">
                  <div className="relative mb-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center">
                      <Image
                        src={game.image || "/placeholder.svg"}
                        alt={game.name}
                        width={64}
                        height={64}
                        className="object-cover"
                      />
                    </div>
                    {game.available && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-gray-800 mb-1">{game.name}</h3>
                  <p className="text-xs text-gray-600 mb-2">{game.subtitle}</p>

                  <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white text-xs">
                    {game.price}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-gray-200 p-6 text-center hover:shadow-lg transition-shadow">
              <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Secure Payment</h3>
              <p className="text-gray-600">100% secure with KHQR & ABA Pay</p>
            </Card>
            <Card className="border-gray-200 p-6 text-center hover:shadow-lg transition-shadow">
              <Zap className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Instant Delivery</h3>
              <p className="text-gray-600">Get your items in 1-5 minutes</p>
            </Card>
            <Card className="border-gray-200 p-6 text-center hover:shadow-lg transition-shadow">
              <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">24/7 Support</h3>
              <p className="text-gray-600">Round-the-clock assistance</p>
            </Card>
          </div>
        </section>

        {/* Game Categories */}
        <section className="container mx-auto px-4 py-8">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-800">Games Shop</h2>
              <p className="text-gray-600">Browse all available games</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {gameCategories.map((category) => (
              <Card
                key={category.id}
                className="relative overflow-hidden border-gray-200 hover:border-green-300 transition-all duration-300 group cursor-pointer hover:shadow-lg"
              >
                <div className="relative h-32 bg-gray-100">
                  <Image
                    src={category.image || "/placeholder.svg"}
                    alt={category.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                  <div
                    className={`absolute top-3 right-3 ${category.badgeColor} text-white text-xs font-bold px-2 py-1 rounded-full`}
                  >
                    {category.badge}
                  </div>
                </div>

                <CardContent className="p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{category.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{category.developer}</p>

                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">Browse Items</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-80 bg-white p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-gray-800">Menu</h2>
              <Button variant="ghost" size="icon" className="text-gray-700" onClick={() => setIsMenuOpen(false)}>
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="space-y-4">
              <Button variant="ghost" className="w-full justify-start text-gray-700">
                <Gamepad2 className="w-5 h-5 mr-3" />
                MLBB
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700">
                <Flame className="w-5 h-5 mr-3" />
                Free Fire
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700">
                <ShoppingCart className="w-5 h-5 mr-3" />
                My Orders
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700">
                <CreditCard className="w-5 h-5 mr-3" />
                Top Up
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700">
                <Settings className="w-5 h-5 mr-3" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Promo Popup */}
      {showPromoPopup && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm">
          <Card className="bg-white border-gray-200 shadow-2xl overflow-hidden">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10"
                onClick={() => setShowPromoPopup(false)}
              >
                <X className="w-4 h-4" />
              </Button>

              <div className="flex items-center p-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden mr-4 bg-gray-100">
                  <Image
                    src="/placeholder.svg?height=64&width=64"
                    alt="Promo"
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                </div>

                <div className="flex-1">
                  <h3 className="font-bold text-sm text-gray-800">Mobile Legends Weekly Pass តម្លៃពិសេស 1.27$</h3>
                  <p className="text-xs text-gray-600 mt-1">🔥 ទិញឥឡូវនេះ!</p>
                  <p className="text-xs text-gray-400 mt-1">5 mins ago</p>
                  <p className="text-xs text-green-600 mt-1">✔ verified by PANDA TOPUP</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Support Buttons */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col space-y-3">
        <Button
          size="lg"
          className="bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <MessageCircle className="w-6 h-6 mr-2" />
          Live Chat
        </Button>
      </div>

      <div className="fixed bottom-6 right-6 z-40">
        <Button
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <MessageCircle className="w-6 h-6 mr-2" />
          Telegram
        </Button>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-16">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">P</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">PANDA TOPUP</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Experience seamless online game top-up services with unbeatable deals on Mobile Legends, Free Fire, and
                more.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4">Follow Us</h4>
              <div className="flex space-x-4">
                <Button variant="ghost" size="icon" className="text-gray-600 hover:text-blue-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.94-.65-.33-1.01.21-1.59.14-.15 2.71-2.48 2.76-2.69.01-.05.01-.1-.02-.14-.04-.05-.1-.03-.14-.02-.06.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.40-.36-.01-1.04-.20-1.55-.37-.63-.2-1.13-.31-1.09-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.12.27" />
                  </svg>
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-600 hover:text-blue-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.94-.65-.33-1.01.21-1.59.14-.15 2.71-2.48 2.76-2.69.01-.05.01-.1-.02-.14-.04-.05-.1-.03-.14-.02-.06.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.40-.36-.01-1.04-.20-1.55-.37-.63-.2-1.13-.31-1.09-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.12.27" />
                  </svg>
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-600 hover:text-pink-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.321 5.562a5 5 0 0 1-.443-.258a6.2 6.2 0 0 1-1.137-.966c-.849-.971-1.166-1.956-1.282-2.645h.004c-.097-.573-.057-.943-.05-.943h-3.865v14.943q.002.3-.008.595l-.004.073q0 .016-.003.033v.009a3.28 3.28 0 0 1-1.65 2.604a3.2 3.2 0 0 1-1.6.422c-1.8 0-3.26-1.468-3.26-3.281s1.46-3.282 3.26-3.282c.341 0 .68.054 1.004.16l.005-3.936a7.18 7.18 0 0 0-5.532 1.62a7.6 7.6 0 0 0-1.655 2.04c-.163.281-.779 1.412-.853 3.246c-.047 1.04.266 2.12.415 2.565v.01c.093.262.457 1.158 1.049 1.913a7.9 7.9 0 0 0 1.674 1.58v-.01l.009.01c1.87 1.27 3.945 1.187 3.945 1.187c.359-.015 1.562 0 2.928-.647c1.515-.718 2.377-1.787 2.377-1.787a7.4 7.4 0 0 0 1.296-2.153c.35-.92.466-2.022.466-2.462V8.273c.047.028.672.441.672.441s.9.577 2.303.952c1.006.267 2.363.324 2.363.324V6.153c-.475.052-1.44-.098-2.429-.59" />
                  </svg>
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4">We Accept</h4>
              <div className="flex space-x-3">
                <div className="bg-gray-100 rounded-lg p-2">
                  <span className="text-gray-800 font-bold text-sm">KHQR</span>
                </div>
                <div className="bg-gray-100 rounded-lg p-2">
                  <span className="text-gray-800 font-bold text-sm">ABA</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4">Contact</h4>
              <div className="space-y-2 text-gray-600 text-sm">
                <p>Telegram: @pandatopup</p>
                <p>Phone: +855 88 676 2892</p>
                <p>Email: support@pandatopup.com</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-8 pt-8 text-center">
            <p className="text-gray-500 text-sm">© 2025 PANDA TOPUP. All rights reserved. Developed by PANDA Team</p>
          </div>
        </div>
      </footer>

      {/* Payment Modal */}
      {showCheckout && (
        <PaymentModal
          form={form}
          orderFormat={orderFormat}
          onClose={handleClosePayment}
          discountPercent={discountPercent}
        />
      )}

      {/* Popup Banner */}
      {storeConfig.popupBanner.enabled && showPromoPopup && (
        <PopupBanner image={storeConfig.popupBanner.image} onClose={() => setShowPromoPopup(false)} />
      )}
    </div>
  )
}
