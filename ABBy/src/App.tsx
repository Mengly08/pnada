import React, { useState, useEffect, Suspense } from 'react';
import { Loader2, XCircle, ArrowLeft, Search, CheckCircle2, MessageCircle, Facebook, LogOut } from 'lucide-react';
import { ProductList } from './components/ProductList';
import { PaymentModal } from './components/PaymentModal';
import { BannerSlider } from './components/BannerSlider';
import { PopupBanner } from './components/PopupBanner';
import { supabase } from './lib/supabase';
import storeConfig from './lib/config';

const App = () => {
  const [form, setForm] = useState(() => {
    const savedForm = localStorage.getItem('customerInfo');
    return savedForm ? JSON.parse(savedForm) : {
      userId: '',
      serverId: '',
      product: null,
      game: 'mlbb'
    };
  });

  const [showTopUp, setShowTopUp] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderFormat, setOrderFormat] = useState('');
  const [formErrors, setFormErrors] = useState({ userId: '', serverId: '' });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [isResellerRoute, setIsResellerRoute] = useState(false);
  const [isResellerLoggedIn, setIsResellerLoggedIn] = useState(false);
  const [showPopupBanner, setShowPopupBanner] = useState(true);
  const [paymentCooldown, setPaymentCooldown] = useState(0);
  const [cooldownInterval, setCooldownInterval] = useState(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [isPaymentSelected, setIsPaymentSelected] = useState(false);
  const [isMainLeftClicked, setIsMainLeftClicked] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState('');

  const diamondCombinations = {
    '86': { total: '86', breakdown: '86+0bonus' },
    '172': { total: '172', breakdown: '172+0bonus' },
    '257': { total: '257', breakdown: '257+0bonus' },
    '343': { total: '343', breakdown: '257+86bonus' },
    '429': { total: '429', breakdown: '257+172bonus' },
    '514': { total: '514', breakdown: '514+0bonus' },
    '600': { total: '600', breakdown: '514+86bonus' },
    '706': { total: '706', breakdown: '706+0bonus' },
    '792': { total: '792', breakdown: '706+86bonus' },
    '878': { total: '878', breakdown: '706+172bonus' },
    '963': { total: '963', breakdown: '706+257bonus' },
    '1049': { total: '1049', breakdown: '963+86bonus' },
    '1135': { total: '1135', breakdown: '963+172bonus' },
    '1220': { total: '1220', breakdown: '963+257bonus' },
    '1412': { total: '1412', breakdown: '1412+0bonus' },
    '1584': { total: '1584', breakdown: '1412+172bonus' },
    '1756': { total: '1756', breakdown: '1412+344bonus' },
    '1926': { total: '1926', breakdown: '1412+514bonus' },
    '2195': { total: '2195', breakdown: '2195+0bonus' },
    '2384': { total: '2384', breakdown: '2195+189bonus' },
    '2637': { total: '2637', breakdown: '2195+442bonus' },
    '2810': { total: '2810', breakdown: '2195+615bonus' }
  };

  const formatItemDisplay = (product) => {
    if (!product) return 'None';
    const identifier = product.diamonds || product.name;
    const combo = diamondCombinations[identifier];
    if (!combo) return identifier;
    return combo.breakdown.endsWith('+0bonus') ? combo.total : `${combo.total} (${combo.breakdown})`;
  };

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
    return () => window.removeEventListener('popstate', checkRoute);
  }, []);

  useEffect(() => {
    if (!isAdminRoute && !isResellerRoute) {
      fetchProducts(form.game);
    }
  }, [form.game, isAdminRoute, isResellerRoute]);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDateTime(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok', hour12: false }));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownInterval) clearInterval(cooldownInterval);
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
    if (cooldownInterval) clearInterval(cooldownInterval);
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

  const fetchProducts = async (game) => {
    setLoading(true);
    setIsThinking(true);
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
      } else if (game === 'Pubg') {
        const response = await supabase
          .from('Pubg_products')
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
      if (error) throw error;
      let transformedProducts = data.map(product => ({
        id: product.id,
        name: product.name,
        diamonds: product.diamonds || undefined,
        price: product.price,
        currency: product.currency,
        type: product.type,
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
            return resellerPrice ? { ...product, price: resellerPrice.price, resellerPrice: resellerPrice.price } : product;
          });
        }
      }
      setProducts(transformedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
      setIsThinking(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (paymentCooldown > 0) return;
    const errors = {};
    if (!form.userId) errors.userId = 'User ID is required';
    if ((form.game === 'mlbb' || form.game === 'Pubg') && !form.serverId) errors.serverId = 'Server ID is required';
    if (!form.product) return alert('Please select a product');
    if (!isPaymentSelected) return alert('Please select a payment method');
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const productIdentifier = form.product.code || form.product.diamonds || form.product.name;
    const format = (form.game === 'mlbb' || form.game === 'Pubg')
      ? `${form.userId} ${form.serverId} ${productIdentifier}`
      : `${form.userId} 0 ${productIdentifier}`;
    setOrderFormat(format);
    setShowCheckout(true);
  };

  const clearSavedInfo = () => {
    localStorage.removeItem('customerInfo');
    setForm({ userId: '', serverId: '', product: null, game: form.game });
  };

  const handleCheckId = (e) => {
    e.preventDefault();
    const newForm = {
      ...form,
      userId: e.currentTarget.elements.namedItem('userId').value,
      serverId: e.currentTarget.elements.namedItem('zoneId').value
    };
    setForm(newForm);
    if (newForm.userId && (form.game !== 'mlbb' && form.game !== 'Pubg' || newForm.serverId)) {
      fetchProducts(form.game);
    }
  };

  if (isAdminRoute || isResellerRoute) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-blue-900">
          <Loader2 className="w-10 h-10 animate-spin text-yellow-400" />
          <span className="ml-2 text-white">Loading {isAdminRoute ? 'admin' : 'reseller'} panel...</span>
        </div>
      }>
        <div className="min-h-screen flex items-center justify-center bg-blue-900 text-white">
          {isAdminRoute ? 'Admin Page (Not Implemented)' : 'Reseller Page (Not Implemented)'}
        </div>
      </Suspense>
    );
  }

  // Hardcoded product data for demo
  const hardcodedProducts = [
    { id: 1, name: 'Weekly Pass', price: 1.34, diamonds: null, game: 'mlbb' },
    { id: 2, name: 'Weekly Pass x2', price: 2.75, diamonds: null, game: 'mlbb' },
    { id: 3, name: 'Weekly Pass x5', price: 6.85, diamonds: null, game: 'mlbb' },
    { id: 4, name: '86 DM + Weekly', price: 2.86, diamonds: '86', game: 'mlbb' },
    { id: 5, name: '257 DM + Weekly', price: 4.95, diamonds: '257', game: 'mlbb' },
    { id: 6, name: '55 DM', price: 0.79, diamonds: '55', game: 'mlbb' },
    { id: 7, name: '86 DM', price: 1.90, diamonds: '86', game: 'mlbb' },
    { id: 8, name: '165 DM', price: 2.15, diamonds: '165', game: 'mlbb' },
    { id: 9, name: '172 DM', price: 2.20, diamonds: '172', game: 'mlbb' },
    { id: 10, name: '257 DM', price: 3.30, diamonds: '257', game: 'mlbb' },
    { id: 11, name: '429 DM', price: 5.50, diamonds: '429', game: 'mlbb' },
    { id: 12, name: '514 DM', price: 6.50, diamonds: '514', game: 'mlbb' },
    { id: 13, name: '565 DM', price: 6.95, diamonds: '565', game: 'mlbb' },
    { id: 14, name: '600 DM', price: 7.50, diamonds: '600', game: 'mlbb' },
    { id: 15, name: '100 DM', price: 1.50, diamonds: '100', game: 'freefire' },
    { id: 16, name: '310 DM', price: 3.50, diamonds: '310', game: 'freefire' },
    { id: 17, name: '520 DM', price: 5.50, diamonds: '520', game: 'freefire' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 to-indigo-900 text-white flex flex-col relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kh+Ang+Chittbous&family=Fredoka+One&display=swap');
        
        .khmer-font {
          font-family: 'Kh Ang Chittbous', sans-serif;
        }
        
        .fredoka-font {
          font-family: 'Fredoka One', cursive;
        }
        
        .game-card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .game-card:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 24px rgba(255, 215, 0, 0.3);
        }
        
        .product-box {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
        }
        
        .product-box:hover {
          transform: scale(1.03);
          box-shadow: 0 6px 20px rgba(255, 215, 0, 0.4);
        }
        
        .selected-product {
          border: 2px solid #ffd700;
          box-shadow: 0 0 12px rgba(255, 215, 0, 0.6);
        }
        
        .glow-effect {
          animation: glow 1.5s ease-in-out infinite alternate;
        }
        
        @keyframes glow {
          from {
            box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
          }
          to {
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
          }
        }
        
        .banner-slide {
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        
        .payment-button {
          background: linear-gradient(135deg, #f97316, #ef4444);
          transition: all 0.3s ease;
        }
        
        .payment-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(249, 115, 22, 0.4);
        }
        
        .mlbb-form {
          position: sticky;
          bottom: 1rem;
          z-index: 1000;
          backdrop-filter: blur(10px);
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .input-field {
          background-color: rgba(255, 255, 255, 0.1);
          border: 1px solid #ffd700;
          color: white;
          transition: all 0.3s ease;
        }
        
        .input-field:focus {
          border-color: #f97316;
          box-shadow: 0 0 8px rgba(249, 115, 22, 0.4);
        }
      `}</style>

      <nav className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 shadow-lg backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="https://raw.githubusercontent.com/Mengly08/xnxx/refs/heads/main/2_20250421_214050_0001%20(1).png"
              alt="Logo"
              className="w-16 h-16 rounded-full border-2 border-yellow-400"
            />
            <div>
              <h1 className="text-2xl font-bold fredoka-font text-yellow-400">NCC Store</h1>
              <p className="text-xs text-yellow-200">Your Ultimate Game Top-Up Destination</p>
              {isResellerLoggedIn && (
                <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-medium">Reseller Mode</span>
              )}
            </div>
          </div>
          <div className="text-sm text-yellow-200 khmer-font">{currentDateTime}</div>
        </div>
      </nav>

      {isThinking && (
        <div className="flex items-center justify-center py-2 bg-blue-900 text-white">
          <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
          <span className="ml-2 text-sm khmer-font">កំពុងគិត...</span>
        </div>
      )}

      <div className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          <div className="bg-gradient-to-r from-blue-800 to-indigo-800 rounded-2xl shadow-xl overflow-hidden">
            <BannerSlider banners={storeConfig.banners} />
          </div>
        </div>

        {showTopUp ? (
          <main className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={() => {
                    setShowTopUp(false);
                    setShowCheckout(false);
                  }}
                  className="text-white hover:text-yellow-300 transition-colors text-sm flex items-center gap-2 bg-blue-800/50 px-4 py-2 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5" /> ត្រឡប់ទៅហ្គេម
                </button>

                {(form.userId || form.serverId) && (
                  <button
                    onClick={clearSavedInfo}
                    className="text-red-300 hover:text-red-200 transition-colors text-sm flex items-center gap-2 bg-red-500/20 px-4 py-2 rounded-lg"
                  >
                    <XCircle className="w-5 h-5" /> លុបព័ត៌មាន
                  </button>
                )}
              </div>

              <div
                className="bg-blue-900/90 rounded-xl p-6 shadow-xl border border-yellow-400/20"
                onClick={() => setIsMainLeftClicked(!isMainLeftClicked)}
              >
                <div className="flex items-start gap-4">
                  <img
                    src={form.game === 'mlbb'
                      ? 'https://play-lh.googleusercontent.com/M9_okpLdBz0unRHHeX7FcZxEPLZDIQNCGEBoql7MxgSitDL4wUy4iYGQxfvqYogexQ'
                      : 'https://play-lh.googleusercontent.com/WWcssdzTZvx7Fc84lfMpVuyMXg83_PwrfpgSBd0IID_IuupsYVYJ34S9R2_5x57gHQ'}
                    alt={form.game === 'mlbb' ? 'Mobile Legends' : 'Free Fire'}
                    className="w-16 h-16 rounded-xl border-2 border-yellow-400"
                  />
                  <div className="flex-1">
                    <h2 className="text-xl font-bold fredoka-font text-yellow-400">
                      {form.game === 'mlbb' ? 'Mobile Legends' : 'Free Fire'}
                    </h2>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-2">
                        <img
                          src="https://raw.githubusercontent.com/Cheagjihvg/feliex-assets/refs/heads/main/48_-Protected_System-_Yellow-512-removebg-preview.png"
                          alt="Safety Guarantee"
                          className="w-5 h-5"
                        />
                        <span className="text-sm text-yellow-300 khmer-font">ការធានាសុវត្ថិភាព</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <img
                          src="https://raw.githubusercontent.com/Cheagjihvg/feliex-assets/refs/heads/main/IMG_1820.PNG"
                          alt="Instant Delivery"
                          className="w-5 h-5"
                        />
                        <span className="text-sm text-yellow-300 khmer-font">ការដឹកជញ្ជូនភ្លាមៗ</span>
                      </div>
                    </div>
                  </div>
                </div>
                {isMainLeftClicked && (
                  <div className="mt-4">
                    <img
                      src="https://cdn.qwenlm.ai/0976d6fb-e73e-4052-afa7-20665020094f/4cbcd21d-3bb6-4b72-a979-76307b230fdd_sticker.webp"
                      alt="Sticker"
                      className="w-96 h-auto rounded-lg mx-auto"
                    />
                  </div>
                )}
              </div>

              <div className="bg-blue-900/90 rounded-xl p-6 shadow-xl border border-yellow-400/20">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-blue-900 font-bold">01</div>
                  <h3 className="ml-2 text-lg font-semibold text-yellow-400 khmer-font">បញ្ចូលព័ត៌មានរបស់អ្នក</h3>
                </div>
                <form onSubmit={handleCheckId} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-yellow-200 khmer-font">
                        {form.game === 'mlbb' ? 'User ID' : 'Free Fire ID'}
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-300 w-4 h-4" />
                        <input
                          type="text"
                          name="userId"
                          className="input-field pl-9 w-full rounded-lg px-3 py-2 text-sm"
                          placeholder={`បញ្ចូល ${form.game === 'mlbb' ? 'User ID' : 'Free Fire ID'}`}
                          value={form.userId}
                          onChange={(e) => setForm({ ...form, userId: e.target.value })}
                        />
                        {formErrors.userId && (
                          <p className="text-red-400 text-xs mt-1">{formErrors.userId}</p>
                        )}
                      </div>
                    </div>
                    {(form.game === 'mlbb' || form.game === 'Pubg') && (
                      <div>
                        <label className="block text-sm font-medium mb-1 text-yellow-200 khmer-font">Zone ID</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-300 w-4 h-4" />
                          <input
                            type="text"
                            name="zoneId"
                            className="input-field pl-9 w-full rounded-lg px-3 py-2 text-sm"
                            placeholder="បញ្ចូល Zone ID"
                            value={form.serverId}
                            onChange={(e) => setForm({ ...form, serverId: e.target.value })}
                          />
                          {formErrors.serverId && (
                            <p className="text-red-400 text-xs mt-1">{formErrors.serverId}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="submit"
                      className="payment-button px-6 py-2 rounded-lg text-white font-semibold flex items-center gap-2"
                      disabled={!form.userId || ((form.game === 'mlbb' || form.game === 'Pubg') && !form.serverId)}
                    >
                      <CheckCircle2 className="w-5 h-5" /> ពិនិត្យ ID
                    </button>
                  </div>
                  <div className="text-xs text-yellow-200 khmer-font mt-2">
                    ដើម្បីឃើញ UserID សូមចូលទៅក្នុងហ្គេម ហើយចុចរូបភាព Avatar នៅខាងឆ្វេងអេក្រង់កញ្ចក់ ហើយចុចទៅកាន់ "Check ID"។ ឧទាហរណ៍: User ID: 123456789, Zone ID: 1234។
                  </div>
                </form>
              </div>

              <div className="bg-blue-900/90 rounded-xl p-6 shadow-xl border border-yellow-400/20">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-blue-900 font-bold">02</div>
                  <h3 className="ml-2 text-lg font-semibold text-yellow-400 khmer-font">ផលិតផល Diamond</h3>
                </div>
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="w-12 h-12 animate-spin text-yellow-400" />
                    <span className="ml-2 text-white khmer-font">កំពុងផ្ទុកផលិតផល...</span>
                  </div>
                ) : (
                  <ProductList
                    products={products.length > 0 ? products : hardcodedProducts.filter(p => p.game === form.game)}
                    onSelect={(product) => setForm({ ...form, product })}
                    selectedProduct={form.product}
                  />
                )}
              </div>

              <div className="bg-blue-900/90 rounded-xl p-6 shadow-xl border border-yellow-400/20">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-blue-900 font-bold">03</div>
                  <h3 className="ml-2 text-lg font-semibold text-yellow-400 khmer-font">វិធីបង់ប្រាក់</h3>
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://www.daddytopup.com/_next/image?url=%2Fassets%2Fmain%2Fkhqr.webp&w=1920&q=75"
                      alt="KHQR"
                      className="w-12 h-12 object-contain"
                    />
                    <div>
                      <p className="text-white font-semibold">ABA KHQR</p>
                      <p className="text-white text-sm khmer-font">
                        ស្កែនដើម្បីបង់ប្រាក់ជាមួយកម្មវិធីធនាគារណាមួយ
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPaymentSelected(!isPaymentSelected)}
                    className="w-6 h-6 rounded-full border-2 border-yellow-400 flex items-center justify-center"
                  >
                    <div className={`w-4 h-4 rounded-full ${isPaymentSelected ? 'bg-yellow-400' : 'bg-white'}`} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="accept"
                    className="w-5 h-5 text-yellow-400 border-yellow-400 rounded focus:ring-yellow-400"
                  />
                  <label htmlFor="accept" className="text-white text-sm khmer-font">
                    ខ្ញុំយល់ព្រមតាម{' '}
                    <a href="/term-and-policy" className="text-yellow-400 hover:underline">លក្ខខណ្ឌ</a>
                  </label>
                </div>
                {form.product && (
                  <form className="mlbb-form rounded-xl p-4 mt-4 flex justify-between items-center">
                    <div className="space-y-2">
                      <div className="text-sm khmer-font">
                        <span>សរុប:</span>
                        <span className="font-bold ml-2">${form.product.price.toFixed(2)}</span>
                      </div>
                      <div className="text-sm khmer-font">
                        <span>ផលិតផល:</span>
                        <span className="font-bold ml-2">{formatItemDisplay(form.product)}</span>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={!form.product || paymentCooldown > 0 || !isPaymentSelected}
                      onClick={handleSubmit}
                      className="payment-button px-6 py-3 rounded-lg text-white font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {paymentCooldown > 0 ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          សូមរង់ចាំ {paymentCooldown}s
                        </>
                      ) : (
                        <>
                          <svg width="24" height="24" viewBox="0 0 24 24" className="fill-current">
                            <path d="M5 6.5a.5.5 0 1 1 .5-.5H16a1 1 0 1 0 0-2H5.5A2.5 2.5 0 0 0 3 6.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5.5a.5.5 0 0 1-.5-.5M15.5 15a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3" fill="currentColor" />
                          </svg>
                          បង់ប្រាក់ឥឡូវ
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </main>
        ) : (
          <main className="container mx-auto px-4 py-6">
            <div className="flex flex-col items-center">
              <div className="w-full max-w-4xl">
                <img
                  src="https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/Untitled-1%20(1).png"
                  alt="Banner"
                  className="w-full h-auto max-h-64 object-contain rounded-lg"
                />
              </div>
              <div className="flex flex-row justify-center gap-4 mt-6 flex-wrap">
                <div
                  className="game-card bg-blue-800/50 rounded-xl p-4 text-center cursor-pointer shadow-lg border border-yellow-400/20"
                  onClick={() => {
                    setForm({ ...form, game: 'mlbb' });
                    setShowTopUp(true);
                  }}
                >
                  <img
                    src="https://www.daddytopup.com/_next/image?url=https%3A%2F%2Fdaddy-cms.minttopup.xyz%2FUploads%2FImg_Resizer_20240801_2222_57312_4914487dd4.webp&w=1080&q=75"
                    alt="Mobile Legends"
                    className="w-32 h-32 rounded-lg mx-auto mb-3 object-contain"
                  />
                  <h3 className="text-sm font-semibold text-yellow-400 fredoka-font">Mobile Legends</h3>
                </div>

                <div className="game-card bg-blue-800/50 rounded-xl p-4 text-center relative opacity-60" style={{ pointerEvents: 'none' }}>
                  <img
                    src="https://www.daddytopup.com/_next/image?url=https%3A%2F%2Fdaddy-cms.minttopup.xyz%2FUploads%2Fpg_small_icon_4f9917d451.webp&w=1080&q=75"
                    alt="Pubg"
                    className="w-32 h-32 rounded-lg mx-auto mb-3 object-contain"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <span className="text-white font-bold bg-black/70 px-4 py-2 rounded khmer-font">មកដល់ឆាប់ៗនេះ</span>
                  </div>
                  <h3 className="text-sm font-semibold text-yellow-400 fredoka-font">Pubg</h3>
                </div>

                <div
                  className="game-card bg-blue-800/50 rounded-xl p-4 text-center cursor-pointer shadow-lg border border-yellow-400/20"
                  onClick={() => {
                    setForm({ ...form, game: 'freefire' });
                    setShowTopUp(true);
                  }}
                >
                  <img
                    src="https://www.daddytopup.com/_next/image?url=https%3A%2F%2Fdaddy-cms.minttopup.xyz%2FUploads%2Ffree_fire_logo_7b069d4084.jpg&w=1080&q=75"
                    alt="Free Fire"
                    className="w-32 h-32 rounded-lg mx-auto mb-3 object-contain"
                  />
                  <h3 className="text-sm font-semibold text-yellow-400 fredoka-font">Free Fire</h3>
                </div>
              </div>
            </div>
          </main>
        )}

        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => window.open(storeConfig.supportUrl, '_blank')}
            className="flex items-center gap-2 bg-yellow-400 text-black px-4 py-3 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium khmer-font">ទំនាក់ទំនង</span>
          </button>
        </div>

        <footer className="bg-blue-900/90 text-white py-6">
          <div className="container mx-auto px-4 text-center">
            <div className="mb-4">
              <p className="font-bold khmer-font">ទំនាក់ទំនងយើងខ្ញុំ:</p>
              <div className="flex justify-center gap-4 mt-2">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href={storeConfig.channelUrl} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.94-.65-.33-1.01.21-1.59.14-.15 2.71-2.48 2.76-2.69.01-.05.01-.10-.02-.14-.04-.05-.10-.03-.14-.02-.06.02-1.49.95-4.22 2.79-.40.27-.76.41-1.08.40-.36-.01-1.04-.20-1.55-.37-.63-.20-1.13-.31-1.09-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.10.08.13.19.12.27"/>
                  </svg>
                </a>
              </div>
            </div>
            <div className="mb-4">
              <p className="font-bold khmer-font">ទទួលការទូទាត់:</p>
              <img
                src="https://www.daddytopup.com/_next/image?url=%2Fassets%2Fmain%2Fkhqr.webp&w=828&q=75"
                alt="KHQR"
                className="w-20 h-auto mx-auto mt-2"
              />
            </div>
            <div>
              <p className="text-xs khmer-font">
                <a href="/term-and-policy" className="text-yellow-400 hover:underline">
                  <span className="font-bold">គោលការណ៍ឯកជនភាព</span> |{' '}
                  <span className="font-bold">លក្ខខណ្ឌ</span>
                </a>
              </p>
              <p className="text-xs khmer-font">{storeConfig.footer.copyright}</p>
            </div>
          </div>
        </footer>

        {showCheckout && (
          <PaymentModal
            form={form}
            orderFormat={orderFormat}
            onClose={() => {
              setShowCheckout(false);
              startPaymentCooldown();
            }}
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
};

export default App;
