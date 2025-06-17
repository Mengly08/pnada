import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Search, Loader2, ArrowLeft, XCircle, CheckCircle2 } from 'lucide-react';
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
      game: 'mlbb',
      nickname: undefined
    };
  });
  const [showTopUp, setShowTopUp] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderFormat, setOrderFormat] = useState('');
  const [formErrors, setFormErrors] = useState<{userId?: string; serverId?: string; paymentMethod?: string}>({});
  const [products, setProducts] = useState<GameProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [isResellerRoute, setIsResellerRoute] = useState(false);
  const [isResellerLoggedIn, setIsResellerLoggedIn] = useState(false);
  const [showPopupBanner, setShowPopupBanner] = useState(true);
  const [paymentCooldown, setPaymentCooldown] = useState(0);
  const [cooldownInterval, setCooldownInterval] = useState<NodeJS.Timeout | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'successful' | 'failed'>('idle');

  // Diamond combination mapping
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

  // Format item display based on diamond combinations
  const formatItemDisplay = (product: GameProduct | null) => {
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
    return () => {
      if (cooldownInterval) clearInterval(cooldownInterval);
    };
  }, [cooldownInterval]);

  useEffect(() => {
    if (form.userId || form.serverId || form.nickname) {
      localStorage.setItem('customerInfo', JSON.stringify({
        userId: form.userId,
        serverId: form.serverId,
        game: form.game,
        product: null,
        nickname: form.nickname
      }));
    }
  }, [form.userId, form.serverId, form.game, form.nickname]);

  const startPaymentCooldown = () => {
    setPaymentCooldown(3);
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

  const fetchProducts = async (game: 'mlbb' | 'freefire') => {
    setLoading(true);
    try {
      const table = game === 'mlbb' ? 'mlbb_products' : game === 'freefire' ? 'freefire_products' : 'gameshow_products';
      const { data: products, error } = await supabase
        .from(table)
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;

      let transformedProducts: GameProduct[] = products.map(product => ({
        id: product.id,
        name: product.name,
        diamonds: product.diamonds || undefined,
        price: product.price,
        currency: product.currency,
        type: product.type as 'diamonds' | 'subscription' | 'special',
        game,
        image: product.image || undefined,
        code: product.code || undefined
      }));

      const isReseller = localStorage.getItem('jackstore_reseller_auth') === 'true';
      if (isReseller) {
        const { data: resellerPrices, error: resellerError } = await supabase
          .from('reseller_prices')
          .select('*')
          .eq('game', game);
        if (!resellerError && resellerPrices) {
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
      console.error(`Error fetching products for ${game}:`, error);
      setProducts([]);
      alert('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateAccount = async () => {
    if (!form.userId) return;

    setValidating(true);
    setValidationResult(null);

    try {
      let response;
      if (form.game === 'mlbb') {
        if (!form.serverId) {
          setValidating(false);
          return;
        }
        response = await axios.get(
          `https://api.isan.eu.org/nickname/ml?id=${form.userId}&zone=${form.serverId}`
        );
      } else {
        response = await axios.get(
          `https://rapidasiagame.com/api/v1/idff.php?UserID=${form.userId}`
        );
      }

      if (form.game === 'mlbb' && response.data.success) {
        setValidationResult(response.data);
        setForm(prev => ({ ...prev, nickname: response.data.name }));
      } else if (form.game === 'freefire' && response.data.status === 'success') {
        setValidationResult(response.data);
        setForm(prev => ({ ...prev, nickname: response.data.username }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentCooldown > 0) {
      console.log('Payment blocked due to cooldown:', paymentCooldown);
      return;
    }

    const errors: {userId?: string; serverId?: string; paymentMethod?: string} = {};
    if (!form.userId) errors.userId = 'User ID is required';
    if (form.game === 'mlbb' && !form.serverId) errors.serverId = 'Zone ID is required';
    if (!form.product) {
      alert('Please select a product');
      return;
    }
    if (!selectedPayment) errors.paymentMethod = 'Please select a payment method';
    if (!validationResult?.success && !validationResult?.status) {
      alert(`Please check your ${form.game === 'mlbb' ? 'Mobile Legends' : 'Free Fire'} account first`);
      return;
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      console.log('Form errors:', errors);
      return;
    }

    setPaymentStatus('idle');
    const productIdentifier = form.product.code || form.product.diamonds || form.product.name;
    const format = form.game === 'mlbb'
      ? `${form.userId} ${form.serverId} ${productIdentifier}`
      : `${form.userId} 0 ${productIdentifier}`;
    setOrderFormat(format);
    setShowCheckout(true);
    console.log('Payment modal opened with order:', format);
  };

  const clearSavedInfo = () => {
    localStorage.removeItem('customerInfo');
    setForm({ userId: '', serverId: '', product: null, game: form.game, nickname: undefined });
    setValidationResult(null);
    setPaymentStatus('idle');
  };

  const handleClosePayment = () => {
    setShowCheckout(false);
    setPaymentStatus('idle');
    startPaymentCooldown();
  };

  if (isAdminRoute) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin" /> Loading...</div>}>
        <AdminPage />
      </Suspense>
    );
  }

  if (isResellerRoute) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin" /> Loading...</div>}>
        <ResellerPage onLogin={() => { setIsResellerLoggedIn(true); window.location.href = '/'; }} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-cover bg-center flex flex-col" style={{ backgroundImage: `url("${storeConfig.backgroundImageUrl}")` }}>
      <style>
        {`
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
          .banner-image {
            width: 100%;
            max-height: 300px;
            object-fit: contain;
            border-radius: 8px;
            margin-bottom: 16px;
          }
        `}
      </style>

      <nav className="bg-gradient-to-r from-purple-600 to-green-500 text-white p-4 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={storeConfig.logoUrl} alt="Zado Store" className="w-10 h-10 rounded-full" />
            <span className="text-xl font-bold">Zado STORE</span>
          </div>
          <div className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white text-black"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex flex-col justify-between h-6 w-8">
              <span className="bg-white h-1 w-full rounded"></span>
              <span className="bg-white h-1 w-full rounded"></span>
              <span className="bg-white h-1 w-full rounded"></span>
            </button>
            <button className="bg-white text-black px-4 py-2 rounded-lg">Login</button>
          </div>
        </div>
      </nav>

      <div className="flex-grow">
        {!showTopUp ? (
          <main className="px-4 py-4">
            <div className="flex flex-col items-center">
              {/* Banner Image Added Here */}
              <div className="w-full max-w-4xl mb-8">
                <img
                  src="https://raw.githubusercontent.com/Mengly08/xnxx/refs/heads/main/photo_2025-06-17_23-29-27.jpg"
                  alt="Banner"
                  className="banner-image"
                />
              </div>
              <div className="w-full max-w-4xl mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  🔥 Popular!
                  <span className="text-sm font-normal text-gray-600">The most popular products today.</span>
                </h2>
                <div className="flex flex-row gap-4 overflow-x-auto pb-4">
                  <div
                    onClick={() => {
                      setForm(prev => ({ ...prev, game: 'mlbb' }));
                      setShowTopUp(true);
                    }}
                    className="w-[240px] h-[100px] bg-gray-200 rounded-lg shadow-lg flex items-center cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-gray-400"
                  >
                    <img
                      src="https://play-lh.googleusercontent.com/M9_okpLdBz0unRHHeX7FcZxEPLZDIQNCGEBoql7MxgSitDL4wUy4iYGQxfvqYogexQ"
                      alt="Mobile Legends"
                      className="w-16 h-16 ml-4 rounded-lg object-contain"
                    />
                    <div className="ml-4 flex-1 pr-4">
                      <h3 className="text-sm font-semibold text-black break-words leading-tight">
                        Mobile Legends
                      </h3>
                      <p className="text-xs text-gray-600 break-words">Moonton</p>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setForm(prev => ({ ...prev, game: 'freefire' }));
                      setShowTopUp(true);
                    }}
                    className="w-[240px] h-[100px] bg-gray-200 rounded-lg shadow-lg flex items-center cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-gray-400"
                  >
                    <img
                      src="https://play-lh.googleusercontent.com/WWcssdzTZvx7Fc84lfMpVuyMXg83_PwrfpgSBd0IID_IuupsYVYJ34S9R2_5x57gHQ"
                      alt="Free Fire"
                      className="w-16 h-16 ml-4 rounded-lg object-contain"
                    />
                    <div className="ml-4 flex-1 pr-4">
                      <h3 className="text-sm font-semibold text-black break-words leading-tight">
                        Free Fire
                      </h3>
                      <p className="text-xs text-gray-600 break-words">Garena</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full max-w-4xl">
                <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_0_10px_rgba(255,105,180,0.8)]">
                  📱 ផលិតផលដែលមាន 🔥
                </h2>
                <div className="flex flex-row gap-4 overflow-x-auto pb-4 md:flex-wrap md:justify-center md:overflow-x-hidden">
                  <div
                    onClick={() => {
                      setForm(prev => ({ ...prev, game: 'mlbb' }));
                      setShowTopUp(true);
                    }}
                    className="flex flex-col items-center cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-green-400"
                  >
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <div className="absolute inset-0 w-32 h-32 bg-white border-2 border-gray-300 rounded-full shadow-lg z-0"></div>
                      <img
                        src={storeConfig.games.mlbb.logoUrl}
                        alt="Mobile Legends"
                        className="w-24 h-24 rounded-md object-contain border-4 border-white shadow-md relative z-10"
                      />
                    </div>
                    <div className="w-32 mt-2">
                      <h3 className="text-sm font-semibold text-black text-center break-words">
                        Mobile Legends
                      </h3>
                    </div>
                  </div>
                  <div
                    onClick={() => {
                      setForm(prev => ({ ...prev, game: 'freefire' }));
                      setShowTopUp(true);
                    }}
                    className="flex flex-col items-center cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-green-400"
                  >
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <div className="absolute inset-0 w-32 h-32 bg-white border-2 border-gray-300 rounded-full shadow-lg z-0"></div>
                      <img
                        src={storeConfig.games.freefire.logoUrl}
                        alt="Free Fire"
                        className="w-24 h-24 rounded-md object-contain border-4 border-white shadow-md relative z-10"
                      />
                    </div>
                    <div className="w-32 mt-2">
                      <h3 className="text-sm font-semibold text-black text-center break-words">
                        Free Fire
                      </h3>
                    </div>
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
                    setShowTopUp(false); 
                    setShowCheckout(false); 
                    setValidationResult(null);
                    setForm(prev => ({ ...prev, nickname: undefined }));
                    setPaymentStatus('idle');
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
              <div className="bg-[#85ff79] border-4 border-[#85ff79] rounded-xl p-6 text-white">
                <div className="main-top">
                  <div className="img-cover">
                    <img
                      src="https://angel-cms.minttopup.xyz/uploads/mlbb_logo_16b189b25f.webp"
                      alt="mlbb-logo"
                      loading="lazy"
                      width="50"
                      height="50"
                      className="img"
                    />
                  </div>
                  <div className="content-bloc">
                    <h1 className="title">Mobile Legend</h1>
                    <ul className="list">
                      <li className="sub"><span className="text">សុវត្តិភាព</span></li>
                      <li className="sub"><span className="text">រហ័ស</span></li>
                    </ul>
                  </div>
                </div>
                <p>បញ្ចូលព័ត៌មាន</p>
                <p className="p-content">
                  ទិញពេជ្រ Mobile Legends: Bang Bang ក្នុងតម្លៃសមរម្យ! តាមរយះអាយឌី ID របស់អ្នក,
                  ជ្រើសរើសកញ្ចប់ពេជ្យ ដែលអ្នកពេញចិត្តទិញ, ដោយបង់ប្រាក់តាមមធ្យោបាយដែលអ្នកមាន,
                  ពេជ្រនឹងបញ្ជូនទៅក្នុងគណនេយ្យ MLBB របស់អ្នកក្នុងរយះពេលពីចន្លោះ 10នាទី ដល់ 3ម៉ោង។
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">USER ID</label>
                      <input
                        type="text"
                        value={form.userId}
                        onChange={(e) => {
                          const value = e.target.value.trim().replace(/[^0-9]/g, '');
                          setForm(prev => ({ ...prev, userId: value, nickname: undefined }));
                          setValidationResult(null);
                          setFormErrors(prev => ({ ...prev, userId: undefined }));
                        }}
                        className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2 text-black"
                        placeholder="Enter your User ID"
                      />
                      {formErrors.userId && <p className="text-red-400 text-xs mt-1">{formErrors.userId}</p>}
                    </div>
                    {form.game === 'mlbb' && (
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">ZONE ID</label>
                        <input
                          type="text"
                          value={form.serverId}
                          onChange={(e) => {
                            const value = e.target.value.trim().replace(/[^0-9]/g, '');
                            setForm(prev => ({ ...prev, serverId: value, nickname: undefined }));
                            setValidationResult(null);
                            setFormErrors(prev => ({ ...prev, serverId: undefined }));
                          }}
                          className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2 text-black"
                          placeholder="Enter your Zone ID"
                        />
                        {formErrors.serverId && <p className="text-red-400 text-xs mt-1">{formErrors.serverId}</p>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={validateAccount}
                      disabled={
                        !form.userId ||
                        (form.game === 'mlbb' && !form.serverId) ||
                        validating
                      }
                      className="bg-[#5aff4a] text-white px-4 py-2 rounded-lg hover:bg-[#ff1493] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                    {(validationResult?.success || validationResult?.status) && (
                      <div className="flex items-center gap-2 text-green-400 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Account found: {form.nickname}</span>
                      </div>
                    )}
                  </div>
                  <p className="kh-font">
                    ដើម្បីឃើញ UserID សូមចូលទៅក្នងហ្គេម ហើយចុចរូបភាព Avatar នៅខាងឆ្វេងអេក្រង់កញ្ចក់
                    ហើយចុចទៅកាន់"Check ID" ពេលនោះ User ID នឹងបង្ហាញឲ្យឃើញ បន្ទាប់មកសូមយក User ID
                    នោះមកបំពេញ�। ឧទាហរណ៍: User ID: 123456789, Zone ID: 1234។
                  </p>
                  <h3 className="text-lg font-semibold text-black">Select Package</h3>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-black" />
                    </div>
                  ) : (
                    <ProductList
                      products={products}
                      selectedProduct={form.product}
                      onSelect={(product) => setForm(prev => ({ ...prev, product }))}
                      game={form.game}
                    />
                  )}
                  <h3 className="text-lg font-semibold text-black">Select Payment Method</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div
                      className={`payment-option ${selectedPayment === 'khqr' ? 'selected' : ''}`}
                      onClick={() => setSelectedPayment(selectedPayment === 'khqr' ? null : 'khqr')}
                    >
                      <div className="payment-option-content">
                        <img
                          src="https://www.saktopup.com/_next/image?url=%2Fassets%2Fmain%2Fkhqr-lg.webp&w=1920&q=75"
                          alt="KHQR"
                          className="w-40px h-40px object-contain mr-4"
                        />
                        <div>
                          <div className="payment-option-text">ABA KHQR</div>
                          <div className="payment-option-subtext">Scan to pay with any banking app</div>
                        </div>
                      </div>
                      <div
                        className={`selection-circle ${selectedPayment === 'khqr' ? 'selected' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPayment(selectedPayment === 'khqr' ? null : 'khqr');
                        }}
                      ></div>
                    </div>
                  </div>
                  {formErrors.paymentMethod && <p className="text-red-400 text-xs mt-1">{formErrors.paymentMethod}</p>}
                </form>
              </div>
              {form.product && (
                <form className="mlbb-form4" onSubmit={handleSubmit}>
                  <div className="mlbb-container43">
                    <span id="price-show" className="mlbb-text30">
                      <span>Total:</span>
                      <span className="mlbb-text32">${form.product ? form.product.price.toFixed(2) : '0.00'}</span>
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
                          <path d="m12.calendar_month 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l-.004-.011l.017-.43l-.003-.012l-.10-.01z"></path>
                          <path d="M5 6.5a.5.5 0 1 1 .5-.5H16a1 1 0 1 0 0-2H5.5A2.5 2.5 0 0 0 3 6.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5.5a.5.5 0 0 1-.5-.5M15.5 15a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3" fill="currentColor"></path>
                        </g>
                      </svg>
                      <span className="mlbb-text36">Pay Now</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </main>
        )}
        <div className="fixed bottom-6 right-6 z-50">
          <button 
            onClick={() => window.open(storeConfig.supportUrl, '_blank')}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" className="text-white">
              <path fill="none" d="M0 0h24v24H0z"></path>
              <path fill="currentColor" d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"></path>
            </svg>
            <span className="font-medium">Support</span>
          </button>
        </div>
        <footer className="text-black py-6 bg-white">
          <div className="container mx-auto px-4 text-center">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Contact Us</h4>
            <div className="flex justify-center space-x-4 mb-6">
              <a href={storeConfig.fb || "https://facebook.com"} target="_blank" rel="noopener noreferrer" className="text-black">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02"></path>
                </svg>
              </a>
              <a href={storeConfig.supportUrl} target="_blank" rel="noopener noreferrer" className="text-black">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 10 6.48 10 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.94-.65-.33-1.01.21-1.59.14-.15 2.71-2.48 2.76-2.69.01-.05.01-.10-.02-.14-.04-.05-.10-.03-.14-.02-.06.02-1.49.95-4.22 2.79-.40.27-.76.41-1.08.4-.36-.01-1.04-.20-1.55-.37-.63-.20-1.13-.31-1.09-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.12.27"></path>
                </svg>
              </a>
            </div>
            <p className="text-sm text-gray-600 mb-4">We accept payment</p>
            <img src="https://via.placeholder.com/80x80.png?text=Payment" alt="Payment Method" className="w-16 h-16 rounded-lg mx-auto mb-6" />
            <div className="flex justify-center space-x-2 mb-4">
              <a href="#" className="text-green-500 text-sm">Privacy Policy</a>
              <span className="text-gray-600">|</span>
              <a href="#" className="text-green-500 text-sm">Terms and Condition</a>
            </div>
            <p className="text-gray-600 text-sm">Copyright © The Zado Store. ALL Rights Reserved.</p>
          </div>
        </footer>
        {showCheckout && (
          <PaymentModal
            form={form}
            orderFormat={orderFormat}
            onClose={handleClosePayment}
            discountPercent={0}
            setPaymentStatus={setPaymentStatus}
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
