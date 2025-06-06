import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Search, Loader2, CheckCircle2, XCircle, ArrowLeft, MessageCircle, Facebook, LogOut } from 'lucide-react';
import axios from 'axios';
import { GameSelector } from './components/GameSelector';
import { ProductList } from './components/ProductList';
import { PaymentModal } from './components/PaymentModal';
import { TopUpForm, GameProduct } from './types';
import { supabase } from './lib/supabase';
import storeConfig from './lib/config';
import { BannerSlider } from './components/BannerSlider';
import { PopupBanner } from './components/PopupBanner';
import { PromoCodeInput } from './components/PromoCodeInput';

const AdminPage = lazy(() => import('./pages/AdminPage').then(module => ({ default: module.AdminPage })));
const ResellerPage = lazy(() => import('./pages/ResellerPage').then(module => ({ default: module.ResellerPage })));

function App() {
  const [form, setForm] = useState<TopUpForm>(() => {
    const savedForm = localStorage.getItem('customerInfo');
    return savedForm ? JSON.parse(savedForm) : {
      userId: '',
      serverId: '',
      product: null,
      game: 'mlbb'
    };
  });

  const [showTopUp, setShowTopUp] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [orderFormat, setOrderFormat] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<MLBBValidationResponse | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [formErrors, setFormErrors] = useState<{userId?: string; serverId?: string}>({});
  const [products, setProducts] = useState<GameProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [isResellerRoute, setIsResellerRoute] = useState(false);
  const [isResellerLoggedIn, setIsResellerLoggedIn] = useState(false);
  const [showPopupBanner, setShowPopupBanner] = useState(true);
  const [paymentCooldown, setPaymentCooldown] = useState(0);
  const [cooldownInterval, setCooldownInterval] = useState<NodeJS.Timeout | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);

  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname;
      setIsAdminRoute(path === '/adminlogintopup');
      setIsResellerRoute(path === '/reseller');
      
      const resellerAuth = localStorage.getItem('jackstore_reseller_auth');
      setIsResellerLoggedIn(resellerAuth === 'true');
    };
    
    checkRoute();
    
    window.addEventListener('popstate', checkRoute);
    
    return () => {
      window.removeEventListener('popstate', checkRoute);
    };
  }, []);

  useEffect(() => {
    if (!isAdminRoute && !isResellerRoute) {
      fetchProducts(form.game);
    }
  }, [form.game, isAdminRoute, isResellerRoute]);

  useEffect(() => {
    return () => {
      if (cooldownInterval) {
        clearInterval(cooldownInterval);
      }
    };
  }, [cooldownInterval]);

  useEffect(() => {
    if (form.userId || form.serverId) {
      localStorage.setItem('customerInfo', JSON.stringify({
        userId: form.userId,
        serverId: form.serverId,
        game: form.game,
        product: null
      }));
    }
  }, [form.userId, form.serverId, form.game]);

  const startPaymentCooldown = () => {
    setPaymentCooldown(7);
    if (cooldownInterval) {
      clearInterval(cooldownInterval);
    }
    const interval = setInterval(() => {
      setPaymentCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setCooldownInterval(interval);
  };

  const fetchProducts = async (game: 'mlbb' | 'freefire') => {
    setLoading(true);
    try {
      let data;
      let error;
      
      const isReseller = localStorage.getItem('jackstore_reseller_auth') === 'true';
      
      if (game === 'mlbb') {
        const response = await supabase
          .from('mlbb_products')
          .select('*')
          .order('id', { ascending: true });
        
        data = response.data;
        error = response.error;
      } else {
        const response = await supabase
          .from('freefire_products')
          .select('*')
          .order('id', { ascending: true });
        
        data = response.data;
        error = response.error;
      }
      
      if (error) {
        throw error;
      }
      
      let transformedProducts: GameProduct[] = data.map(product => ({
        id: product.id,
        name: product.name,
        diamonds: product.diamonds || undefined,
        price: product.price,
        currency: product.currency,
        type: product.type as 'diamonds' | 'subscription' | 'special',
        game: game,
        image: product.image || undefined,
        code: product.code || undefined
      }));
      
      if (isReseller) {
        const resellerPricesResponse = await supabase
          .from('reseller_prices')
          .select('*')
          .eq('game', game);
        
        if (!resellerPricesResponse.error && resellerPricesResponse.data) {
          const resellerPrices = resellerPricesResponse.data;
          
          transformedProducts = transformedProducts.map(product => {
            const resellerPrice = resellerPrices.find(
              rp => rp.product_id === product.id && rp.game === product.game
            );
            
            if (resellerPrice) {
              return {
                ...product,
                price: resellerPrice.price,
                resellerPrice: resellerPrice.price
              };
            }
            
            return product;
          });
        }
      }
      
      setProducts(transformedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const validateAccount = async () => {
    if (!form.userId || !form.serverId || form.game !== 'mlbb') return;
    
    setValidating(true);
    setValidationResult(null);
    
    try {
      const response = await axios.get<MLBBValidationResponse>(
        `https://api.isan.eu.org/nickname/ml?id=${form.userId}&zone=${form.serverId}`
      );
      
      if (response.data.success) {
        setValidationResult(response.data);
        setForm(prev => ({ ...prev, nickname: response.data.name }));
      } else {
        setValidationResult(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      console.error('Failed to validate account:', errorMessage);
      setValidationResult(null);
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (paymentCooldown > 0) {
      return;
    }

    const errors: {userId?: string; serverId?: string} = {};
    
    if (!form.userId) {
      errors.userId = 'User ID is required';
    }
    if (form.game === 'mlbb' && !form.serverId) {
      errors.serverId = 'Server ID is required';
    }
    if (!form.product) {
      return alert('Please select a product');
    }

    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }

    if (form.game === 'mlbb' && !validationResult?.success) {
      return alert('Please check your Mobile Legends account first');
    }
    
    const productIdentifier = form.product.code || form.product.diamonds || form.product.name;
    
    const format = form.game === 'mlbb' 
      ? `${form.userId} ${form.serverId} ${productIdentifier}`
      : `${form.userId} 0 ${productIdentifier}`;
    
    setOrderFormat(format);
    setShowCheckout(true);
  };

  const clearSavedInfo = () => {
    localStorage.removeItem('customerInfo');
    setForm({
      userId: '',
      serverId: '',
      product: null,
      game: form.game
    });
    setValidationResult(null);
  };

  const handleClosePayment = () => {
    setShowCheckout(false);
    setShowPayment(false);
    startPaymentCooldown();
  };

  const handlePromoCode = (discount: number) => {
    setDiscountPercent(discount);
  };

  const clearPromoCode = () => {
    setDiscountPercent(0);
  };

  if (isAdminRoute) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <Loader2 className="w-10 h-10 animate-spin text-green-500" />
          <span className="ml-2 text-gray-700">Loading admin panel...</span>
        </div>
      }>
        <AdminPage />
      </Suspense>
    );
  }

  if (isResellerRoute) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <Loader2 className="w-10 h-10 animate-spin text-green-500" />
          <span className="ml-2 text-gray-700">Loading reseller panel...</span>
        </div>
      }>
        <ResellerPage onLogin={() => {
          setIsResellerLoggedIn(true);
          window.location.href = '/';
        }} />
      </Suspense>
    );
  }

return (
<div
  className="min-h-screen bg-fixed bg-cover bg-center flex flex-col relative"
  style={{ backgroundColor: '#ffb4f5' }} // Soft pink background
>
  {/* Bottom Sticker */}
  <img
    src="https://raw.githubusercontent.com/Cheagjihvg/xia-asssets/refs/heads/main/6271593103857141020-removebg-preview.png"
    alt="Bottom Sticker"
    className="absolute bottom-4 right-4 w-40 h-40 z-10" // Positioned at bottom-right
  />
  <nav 
    className={`bg-gradient-to-r from-${storeConfig.colors.primary}-900/90 to-${storeConfig.colors.secondary}-900/90 text-white p-4 shadow-lg backdrop-blur-md sticky top-0 z-50`} 
     style={{ backgroundImage: `url("${storeConfig.backgroundImageUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={storeConfig.logoUrl} alt="Logo" className="w-20 h-20 rounded-full" />
            <div>
              <h1 className="text-3xl font-black text-black tracking-tight whitespace-nowrap">
                {storeConfig.storeName}
              </h1>
              <p className="text-xs text-black/80">{storeConfig.storeTagline}</p>
              {isResellerLoggedIn && (
                <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-medium">Reseller Mode</span>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <div className={`bg-gradient-to-r from-${storeConfig.colors.primary}-900 to-${storeConfig.colors.secondary}-900 rounded-3xl shadow-2xl overflow-hidden`}>
            <BannerSlider banners={storeConfig.banners} />
          </div>
        </div>

{!showTopUp ? (
  <main className="container mx-auto px-4 py-8">
    <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">

      {/* MLBB */}
      <div
        onClick={() => {
          setForm(prev => ({ ...prev, game: 'mlbb' }));
          setShowTopUp(true);
        }}
        className="bg-pink-100/10 backdrop-blur-lg border border-pink-300/30 rounded-3xl p-4 text-pink-100 hover:bg-pink-200/10 transition-all duration-300 group cursor-pointer shadow-md hover:shadow-pink-400/30"
      >
        <img
          src={storeConfig.games.mlbb.logoUrl}
          alt="Mobile Legends"
          className="w-20 h-20 rounded-2xl mx-auto mb-3 transform group-hover:scale-110 transition-transform"
        />
        <h3
          className="text-xl font-bold text-pink-600 text-center tracking-wide uppercase"
          style={{
            fontFamily: '"Fredoka One", cursive',
          }}
        >
          🎮 {storeConfig.games.mlbb.name}
        </h3>
        <p className="text-xs text-center text-black mt-2 font-light">
          ✨ {storeConfig.games.mlbb.tagline}
        </p>
        <div className="mt-4 w-full bg-gradient-to-r from-pink-400 via-pink-300 to-pink-400 text-white py-2 px-4 rounded-full text-sm font-semibold hover:shadow-xl hover:shadow-pink-400/30 transform hover:-translate-y-1 transition-all duration-300">
          💎 Top Up Now
        </div>
      </div>

      {/* Free Fire */}
      <div
        onClick={() => {
          setForm(prev => ({ ...prev, game: 'freefire' }));
          setShowTopUp(true);
        }}
        className="bg-pink-100/10 backdrop-blur-lg border border-pink-300/30 rounded-3xl p-4 text-pink-100 hover:bg-pink-200/10 transition-all duration-300 group cursor-pointer shadow-md hover:shadow-pink-400/30"
      >
        <img
          src={storeConfig.games.freefire.logoUrl}
          alt="Free Fire"
          className="w-20 h-20 rounded-2xl mx-auto mb-3 transform group-hover:scale-110 transition-transform"
        />
        <h3
          className="text-xl font-bold text-pink-600 text-center tracking-wide uppercase"
          style={{
            fontFamily: '"Fredoka One", cursive',
          }}
        >
          🔥 {storeConfig.games.freefire.name}
        </h3>
        <p className="text-xs text-center text-black mt-2 font-light">
          ✨ {storeConfig.games.freefire.tagline}
        </p>
        <div className="mt-4 w-full bg-gradient-to-r from-pink-400 via-pink-300 to-pink-400 text-white py-2 px-4 rounded-full text-sm font-semibold hover:shadow-xl hover:shadow-pink-400/30 transform hover:-translate-y-1 transition-all duration-300">
          💎 Top Up Now
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
                    setShowTopUp(false);
                    setShowCheckout(false);
                  }}
                  className="text-white hover:text-green-200 transition-colors text-sm flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Games
                </button>

                {(form.userId || form.serverId) && (
                  <button
                    onClick={clearSavedInfo}
                    className="text-red-300 hover:text-red-200 transition-colors text-sm flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-lg"
                  >
                    <XCircle className="w-4 h-4" /> Clear Saved Info
                  </button>
                )}
              </div>

    {/* Top-Up Panel */}
    <div 
      className="bg-[#1f2138] border border-white/10 rounded-xl p-6 text-white shadow-xl" // Updated background color
    >
      <div className="flex flex-col space-y-4">
        {/* Game Info Header */}
        <div className="flex items-start gap-4">
          <img 
            src={form.game === 'mlbb' ? 
              "https://play-lh.googleusercontent.com/M9_okpLdBz0unRHHeX7FcZxEPLZDIQNCGEBoql7MxgSitDL4wUy4iYGQxfvqYogexQ" :
              "https://play-lh.googleusercontent.com/WWcssdzTZvx7Fc84lfMpVuyMXg83_PwrfpgSBd0IID_IuupsYVYJ34S9R2_5x57gHQ"
            } 
            alt={form.game === 'mlbb' ? "Mobile Legends" : "Free Fire"}
            className="w-16 h-16 rounded-xl"
          />
          <div className="flex-1">
            <h2 className="text-xl font-bold">
              {form.game === 'mlbb' ? 'Mobile Legend' : 'Free Fire'}
            </h2>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-2">
                <img 
                  src="https://raw.githubusercontent.com/Cheagjihvg/feliex-assets/refs/heads/main/48_-Protected_System-_Yellow-512-removebg-preview.png"
                  alt="Safety Guarantee"
                  className="w-5 h-5"
                />
                <span className="text-sm text-pink-300">Safety Guarantees</span>
              </div>
              <div className="flex items-center gap-2">
                <img 
                  src="https://raw.githubusercontent.com/Cheagjihvg/feliex-assets/refs/heads/main/IMG_1820.PNG"
                  alt="Instant Delivery"
                  className="w-5 h-5"
                />
                <span className="text-sm text-pink-300">Instant Delivery</span>
              </div>
            </div>
          </div>
        </div>

                  {/* Form section */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className={`grid ${form.game === 'mlbb' ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-4`}>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {form.game === 'mlbb' ? 'User ID' : 'Free Fire ID'}
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white-300 w-4 h-4" />
                          <input
                            type="number"
                            value={form.userId}
                            onChange={(e) => {
                              setForm(prev => ({ ...prev, userId: e.target.value, nickname: undefined }));
                              setValidationResult(null);
                              setFormErrors(prev => ({ ...prev, userId: undefined }));
                            }}
className="pl-9 w-full rounded-lg bg-pink-100/10 border border-pink-300/20 px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200 text-white placeholder-pink-300 text-sm"
                            placeholder={`Enter your ${form.game === 'mlbb' ? 'User ID' : 'Free Fire ID'}`}
                          />
                          {formErrors.userId && (
                            <p className="text-red-400 text-xs mt-1">{formErrors.userId}</p>
                          )}
                        </div>
                      </div>
                      {form.game === 'mlbb' && (
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Server ID
                          </label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white-300 w-4 h-4" />
                            <input
                              type="number"
                              value={form.serverId}
                              onChange={(e) => {
                                setForm(prev => ({ ...prev, serverId: e.target.value, nickname: undefined }));
                                setValidationResult(null);
                                setFormErrors(prev => ({ ...prev, serverId: undefined }));
                              }}
                              className="pl-9 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-white placeholder-pink-300 text-sm"
                              placeholder="Enter your Server ID"
                            />
                            {formErrors.serverId && (
                              <p className="text-red-400 text-xs mt-1">{formErrors.serverId}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {form.game === 'mlbb' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={validateAccount}
                          disabled={!form.userId || !form.serverId || validating}
                          className="w-full max-w-[3000px] bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm justify-center"

                        >
                          {validating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Checking...
                            </>
                          ) : (
                            <>
                              <Search className="w-4 h-4" />
                              Check ID
                            </>
                          )}
                        </button>
                        {validationResult?.success && (
                          <div className="flex items-center gap-2 text-green-400 text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Account found: {form.nickname}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        Select Package
                      </h3>
                      {loading ? (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="w-8 h-8 animate-spin text-white" />
                          <span className="ml-2 text-white">Loading products...</span>
                        </div>
                      ) : (
                        <ProductList
                          products={products}
                          selectedProduct={form.product}
                          onSelect={(product) => setForm(prev => ({ ...prev, product }))}
                          game={form.game}
                        />
                      )}
                    </div>

                  {form.product && (
                    <div className="bg-pink-100/20 rounded-lg p-4 border border-pink-300">
                      <h4 className="text-sm font-medium mb-2 text-white">Order Summary</h4>
                      <div className="space-y-2 font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-pink-300">ID:</span>
                          <span className="text-white">{form.userId}</span>
                        </div>
                        {form.game === 'mlbb' && (
                          <div className="flex items-center gap-2">
                            <span className="text-pink-300">SERVER ID:</span>
                            <span className="text-white">{form.serverId}</span>
                          </div>
                        )}
                        {form.game === 'freefire' && (
                          <div className="flex items-center gap-2">
                            <span className="text-pink-300">SERVER ID:</span>
                            <span className="text-white">0</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-pink-300">ITEM:</span>
                          <span className="text-white">{form.product.code || form.product.diamonds || form.product.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-pink-300">PRICE:</span>
                          <span className="text-white">${form.product.price.toFixed(2)} USD</span>
                        </div>
                      </div>
                    </div>
                  )}

                    <div className="sticky bottom-4 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-lg mt-8">
                      <button
                        type="submit"
                        disabled={form.game === 'mlbb' && !validationResult?.success || !form.product || paymentCooldown > 0}
className="w-full bg-gradient-to-r from-pink-400 to-pink-300 text-white py-3 px-6 rounded-lg hover:from-pink-500 hover:to-pink-400 transition-all duration-300 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-pink-400 disabled:hover:to-pink-300 hover:shadow-lg hover:shadow-pink-400/20 transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                      >
                        {paymentCooldown > 0 ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Please wait {paymentCooldown}s
                          </>
                        ) : (
                          'Continue to Payment'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </main>
        )}

        <footer className="bg-black/90 text-white py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap justify-center gap-3 mb-4">
                {isResellerLoggedIn && (
                  <button
                    onClick={() => {
                      localStorage.removeItem('jackstore_reseller_auth');
                      localStorage.removeItem('jackstore_reseller_username');
                      window.location.reload();
                    }}
                    className="flex items-center gap-2 bg-red-500/80 hover:bg-red-600/80 px-4 py-2 rounded-full transition-all duration-300"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                )}
  <a 
    href={storeConfig.supportUrl} 
    target="_blank" 
    rel="noopener noreferrer"
    className="flex items-center gap-2 bg-yellow-500/80 hover:bg-yellow-600/80 px-4 py-2 rounded-full transition-all duration-300"
  >
    <MessageCircle className="w-4 h-4" />
    <span className="text-sm font-medium">Support</span>
  </a>

  {/* Channel Button (Telegram Light Blue) */}
  <a 
    href={storeConfig.channelUrl} 
    target="_blank" 
    rel="noopener noreferrer"
    className="flex items-center gap-2 bg-[#0088CC]/80 hover:bg-[#0077B5]/80 px-4 py-2 rounded-full transition-all duration-300"
  >
    <svg
      viewBox="0 0 496 512"
      className="w-5 h-5 fill-current text-white"
    >
      <path d="M248 8C111 8 0 119 0 256S111 504 248 504 496 393 496 256 385 8 248 8zM363 176.7c-3.7 39.2-19.9 134.4-28.1 178.3-3.5 18.6-10.3 24.8-16.9 25.4-14.4 1.3-25.3-9.5-39.3-18.7-21.8-14.3-34.2-23.2-55.3-37.2-24.5-16.1-8.6-25 5.3-39.5 3.7-3.8 67.1-61.5 68.3-66.7 .2-.7 .3-3.1-1.2-4.4s-3.6-.8-5.1-.5q-3.3 .7-104.6 69.1-14.8 10.2-26.9 9.9c-8.9-.2-25.9-5-38.6-9.1-15.5-5-27.9-7.7-26.8-16.3q.8-6.7 18.5-13.7 108.4-47.2 144.6-62.3c68.9-28.6 83.2-33.6 92.5-33.8 2.1 0 6.6 .5 9.6 2.9a10.5 10.5 0 0 1 3.5 6.7A43.8 43.8 0 0 1 363 176.7z" />
    </svg>
    <span className="text-sm font-medium">Channel</span>
  </a>

  {/* Facebook Button (Facebook Blue) */}
  <a 
    href="https://www.facebook.com/profile.php?id=61555667287488" 
    target="_blank" 
    rel="noopener noreferrer"
    className="flex items-center gap-2 bg-[#1877F2]/80 hover:bg-[#166FE5]/80 px-4 py-2 rounded-full transition-all duration-300"
  >
    <Facebook className="w-4 h-4" />
    <span className="text-sm font-medium">Facebook</span>
  </a>
</div>
              <div className="text-center text-white/60 text-sm">
                <p>{storeConfig.footer.copyright}</p>
              </div>
            </div>
          </div>
        </footer>

        {showCheckout && (
          <PaymentModal
            form={form}
            orderFormat={orderFormat}
            onClose={handleClosePayment}
            discountPercent={discountPercent}
          />
        )}

        {storeConfig.popupBanner.enabled && showPopupBanner && (
          <PopupBanner
            image={storeConfig.popupBanner.image}
            onClose={() => setShowPopupBanner(false)}
          />
        )}
      </div>
    </div>
  );
}

export default App;
