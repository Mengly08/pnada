import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Loader2, XCircle, ArrowLeft, Search, Facebook, MessageCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { ProductList } from './components/ProductList';
import { PaymentModal } from './components/PaymentModal';
import { BannerSlider } from './components/BannerSlider';
import { PopupBanner } from './components/PopupBanner';
import { supabase } from './lib/supabase';
import storeConfig from './lib/config';

const AdminPage = lazy(() => import('./pages/AdminPage').then(module => ({ default: module.AdminPage })));
const ResellerPage = lazy(() => import('./pages/ResellerPage').then(module => ({ default: module.ResellerPage })));

const App = () => {
  const [form, setForm] = useState(() => {
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
  const [formErrors, setFormErrors] = useState({ userId: '', serverId: '', paymentMethod: '' });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [isResellerRoute, setIsResellerRoute] = useState(false);
  const [isResellerLoggedIn, setIsResellerLoggedIn] = useState(false);
  const [showPopupBanner, setShowPopupBanner] = useState(true);
  const [paymentCooldown, setPaymentCooldown] = useState(0);
  const [cooldownInterval, setCooldownInterval] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [showSocialDropdown, setShowSocialDropdown] = useState(false);

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
    const savedForm = localStorage.getItem('customerInfo');
    if (savedForm) {
      const parsedForm = JSON.parse(savedForm);
      if (parsedForm.game === 'mlbb_ph') {
        parsedForm.game = 'mlbb';
        localStorage.setItem('customerInfo', JSON.stringify(parsedForm));
        setForm(parsedForm);
      } else {
        setForm(parsedForm);
      }
    }
  }, []);

  useEffect(() => {
    if (!isAdminRoute && !isResellerRoute && form.game !== 'none') {
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
      const table = game === 'mlbb' ? 'mlbb_products' : 'freefire_products';
      const { data: products, error } = await supabase
        .from(table)
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;

      let transformedProducts = products.map(product => ({
        id: product.id,
        name: product.name,
        diamonds: product.diamonds || undefined,
        price: product.price,
        currency: product.currency,
        type: product.type,
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
      console.error(`Error fetching products for ${game}:`, error.message);
      setProducts([]);
      alert('Failed to load products. Please check your Supabase configuration and try again.');
    } finally {
      setLoading(false);
      setIsThinking(false);
    }
  };

  const validateAccount = async () => {
    if (!form.userId || (form.game === 'mlbb' && !form.serverId)) return;

    setValidating(true);
    setValidationResult(null);

    try {
      let response;
      if (form.game === 'mlbb') {
        response = await axios.get(
          `https://api.isan.eu.org/nickname/ml?id=${encodeURIComponent(form.userId)}&zone=${encodeURIComponent(form.serverId)}`
        );
      } else if (form.game === 'freefire') {
        response = await axios.get(
          `https://rapidasiagame.com/api/v1/idff.php?UserId=${encodeURIComponent(form.userId)}`
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
        alert('Account not found. Please check your User ID and Zone ID.');
      }
    } catch (error) {
      console.error('Failed to validate account:', error.message);
      setValidationResult(null);
      alert('Failed to validate account. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (paymentCooldown > 0) return;

    const errors = {};
    if (!form.userId) errors.userId = 'User ID is required';
    if (form.game === 'mlbb' && !form.serverId) errors.serverId = 'Zone ID is required';
    if (!form.product) {
      alert('Please select a product');
      return;
    }
    if (!selectedPayment) errors.paymentMethod = 'Please select a payment method';
    if ((form.game === 'mlbb' && !validationResult?.success) || (form.game === 'freefire' && !validationResult?.status)) {
      alert(`Please check your ${form.game === 'mlbb' ? 'Mobile Legends' : 'Free Fire'} account first`);
      return;
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const productIdentifier = form.product.code || form.product.diamonds || form.product.name;
    const format = form.game === 'mlbb'
      ? `${form.userId} ${form.serverId} ${productIdentifier}`
      : `${form.userId} 0 ${productIdentifier}`;
    setOrderFormat(format);
    setShowCheckout(true);
  };

  const clearSavedInfo = () => {
    localStorage.removeItem('customerInfo');
    setForm({ userId: '', serverId: '', product: null, game: form.game, nickname: undefined });
    setValidationResult(null);
  };

  const handlePaymentClick = () => {
    setSelectedPayment(prev => (prev === 'khqr' ? null : 'khqr'));
  };

  if (isAdminRoute) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#ffffff]">
          <Loader2 className="w-10 h-10 animate-spin text-[#31ff26]" />
          <span className="ml-2 text-[#1a1a1a]">Loading admin panel...</span>
        </div>
      }>
        <AdminPage />
      </Suspense>
    );
  }

  if (isResellerRoute) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#ffffff]">
          <Loader2 className="w-10 h-10 animate-spin text-[#31ff26]" />
          <span className="ml-2 text-[#1a1a1a]">Loading reseller panel...</span>
        </div>
      }>
        <ResellerPage onLogin={() => { setIsResellerLoggedIn(true); window.location.href = '/'; }} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#ffffff] flex flex-col relative text-[#1a1a1a]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kh+Ang+Chittbous&family=Poppins:wght@400;600&display=swap');
        .khmer-font { font-family: 'Kh Ang Chittbous', sans-serif; }
        .poppins-font { font-family: 'Poppins', sans-serif; }
        .bg-light { background-color: #f9f9f9; }
        .bg-accent { background: linear-gradient(90deg, #31ff26, #87f8fa); }
        .price-box {
          background: linear-gradient(135deg, #ffd700, #ffeb3b);
          padding: 4px 8px; border-radius: 4px; display: inline-block;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); font-weight: 600;
        }
        .logo-container { width: 60px; height: 60px; }
        .logo-image { width: 100%; height: 100%; object-fit: contain; transition: transform 0.3s ease; }
        .section-header {
          display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
          border-bottom: 2px solid #e0e0e0; padding-bottom: 8px;
        }
        .section-number {
          width: 32px; height: 32px; background: #31ff26; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.25rem; font-weight: 700; color: #fff; margin-right: 8px;
        }
        .inner-content, .inner-content.payment-section {
          background: linear-gradient(135deg, #87f8fa, #87f8fa);
          padding: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border: 2px solid #31ff26; color: #fff;
        }
        .inner-content.products-section {
          background: transparent; padding: 0; border-radius: 0; box-shadow: none;
        }
        .payment-box {
          background: #fff; border: 2px solid #ff69b4; border-radius: 8px;
          padding: 8px 12px; margin-bottom: 16px; display: flex; align-items: center;
          justify-content: space-between; position: relative; transition: all 0.3s ease;
          cursor: pointer; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .payment-box.selected::after {
          content: ''; position: absolute; right: 8px; top: 50%;
          transform: translateY(-50%); width: 12px; height: 12px;
          background: #87f8fa; border-radius: 50%; border: 2px solid #ff69b4;
        }
        .payment-box:hover {
          transform: scale(1.04); box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        .payment-content { display: flex; align-items: center; gap: 8px; flex: 1; }
        .payment-image { width: 32px; height: 32px; object-fit: contain; border-radius: 4px; }
        .payment-text p:first-child { font-size: 1rem; font-weight: 600; color: #1a1a1a; }
        .payment-text p:last-child { font-size: 0.8rem; color: #333; opacity: 0.85; }
        .input-field {
          background: #fff; color: #1a1a1a; border: 2px solid #ffd700;
          padding: 8px; border-radius: 4px; width: 100%; text-align: center;
          transition: all 0.3s ease; font-family: 'Poppins', sans-serif;
        }
        .input-field:focus { border-color: #31ff26; outline: none; box-shadow: 0 0 8px rgba(255, 77, 77, 0.3); }
        .mlbb-form4 {
          display: flex; justify-content: space-between; align-items: center;
          background: linear-gradient(135deg, #87f8fa, #87f8fa);
          padding: 10px; border-radius: 8px; width: 100%;
          position: fixed; bottom: 0; left: 0; right: 0;
          max-width: 100%; z-index: 1000; box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
        }
        .mlbb-container43 { display: flex; flex-direction: column; color: #fff; }
        .mlbb-text30, .mlbb-text33 { font-size: 14px; margin-bottom: 5px; color: #fff; }
        .mlbb-text32, .mlbb-text35 { font-weight: 700; margin-left: 5px; color: #ffd700; }
        .mlbb-container44 { display: flex; justify-content: flex-end; }
        .mlbb-button2, .check-id-button {
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(90deg, #31ff26, #87f8fa);
          color: #fff; padding: 10px 24px; border-radius: 5px; border: none;
          cursor: pointer; font-size: 16px; font-weight: 600; transition: all 0.3s ease;
          min-width: 150px; height: 48px; box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
        }
        .mlbb-button2:hover, .check-id-button:hover {
          transform: translateY(-2px); box-shadow: 0 5px 10px rgba(0, 0, 0, 0.3);
        }
        .mlbb-button2:disabled, .check-id-button:disabled {
          opacity: 0.65; cursor: not-allowed; background: #666;
        }
        .mlbb-icon64 { margin-right: 8px; }
        .mlbb-text36, .check-id-text { text-transform: uppercase; color: #fff; }
        .game-card {
          display: flex; flex-direction: column; align-items: center;
          cursor: pointer; transition: all 0.3s ease; background: transparent;
          border-radius: 8px; padding: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          border: 2px solid #e0e0e0;
        }
        .game-card:hover { transform: scale(1.1); background: transparent; }
        .game-card.disabled { cursor: not-allowed; opacity: 0.75; }
        .game-card.disabled:hover { transform: none; }
        .game-image {
          width: 100%; max-width: 300px; min-width: 300px; aspect-ratio: 1 / 1;
          object-fit: contain; border-radius: 8px; border: 3px solid #ffd700;
          transition: transform 0.3s ease;
        }
        .game-container {
          display: grid; grid-template-columns: repeat(2, minmax(300px, 1fr));
          gap: 2.5rem; justify-content: center; width: 100%; max-width: 1200px;
          padding: 2.5rem 0;
        }
        .coming-soon {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.85); color: #ffd700; padding: 8px 16px;
          border-radius: 4px; font-size: 1.2rem; font-weight: 600; text-align: center;
          text-shadow: 1px 1px 3px #000;
        }
        @media (max-width: 768px) {
          .game-container { grid-template-columns: repeat(2, minmax(250px, 1fr)); gap: 2rem; }
          .game-image { max-width: 250px; min-width: 250px; }
          .game-card h3 { font-size: 1.5rem; }
        }
        @media (max-width: 480px) {
          .game-container { grid-template-columns: 1fr; gap: 1.5rem; }
          .game-image { max-width: 200px; min-width: 200px; }
          .game-card h3 { font-size: 1.2rem; }
          .mlbb-form4 { width: 95%; bottom: 20px; }
        }
        .social-dropdown { position: relative; }
        .social-menu {
          position: absolute; top: 100%; right: 0; background: #fff;
          border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          display: flex; flex-direction: column; padding: 8px; z-index: 1000;
          border: 1px solid #e0e0e0;
        }
        .social-menu a {
          display: flex; align-items: center; gap: 8px; padding: 8px;
          color: #1a1a1a; text-decoration: none; transition: all 0.3s ease;
          border-radius: 6px;
        }
        .social-menu a:hover { background: #f9f9f9; transform: translateX(5px); }
        .products-section * { background-color: transparent !important; }
        nav {
          background: linear-gradient(90deg, #31ff26, #87f8fa);
          padding: 1.5rem 2.5rem; border-bottom: 3px solid #fff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        nav a, nav button { transition: all 0.3s ease; }
        nav a:hover .logo-image, nav button:hover { transform: scale(1.15); }
        nav input {
          background: #fff; border-radius: 25px; padding: 10px 15px;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        nav input:focus { box-shadow: 0 0 8px rgba(255, 215, 0, 0.5); }
        footer { background: #f9f9f9; padding: 2rem 1rem; border-top: 2px solid #e0e0e0; }
        footer a svg { transition: all 0.3s ease; }
        footer a:hover svg { transform: rotate(20deg) scale(1.3); color: #31ff26; }
        .support-button {
          background: linear-gradient(90deg, #31ff26, #87f8fa);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        .support-button:hover {
          background: linear-gradient(90deg, #87f8fa, #31ff26);
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);
        }
      `}</style>

      <nav className="bg-accent text-white p-3 shadow-lg sticky top-0 z-50 flex items-center justify-between">
        <a href="/" className="flex items-center">
          <div className="logo-container">
            <img
              src="https://raw.githubusercontent.com/Mengly08/pic/refs/heads/main/logo.png"
              alt="Logo"
              className="logo-image transition-transform"
            />
          </div>
        </a>
        <div className="flex items-center w-1/2 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-12 pr-5 py-3 rounded-full bg-white text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 w-6 h-6" />
          </div>
        </div>
        <div className="social-dropdown">
          <button
            onClick={() => setShowSocialDropdown(!showSocialDropdown)}
            className="text-white hover:text-yellow-300 transition-all flex items-center gap-3 bg-[#31ff26] px-5 py-3 rounded-full shadow-md"
          >
            <MessageCircle className="w-7 h-7" />
            <span className="poppins-font font-semibold">Contact Us</span>
          </button>
          {showSocialDropdown && (
            <div className="social-menu">
              <a href="https://www.facebook.com/share/1CVHbXejqR/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer">
                <Facebook className="w-6 h-6 text-blue-600" />
                <span className="poppins-font">Facebook</span>
              </a>
              <a href="https://t.me/kakrona_168" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-6 h-6 text-blue-400" />
                <span className="poppins-font">Telegram</span>
              </a>
            </div>
          )}
        </div>
      </nav>

      {isThinking && (
        <div className="flex items-center justify-center py-4 bg-[#f9f9f9] text-[#1a1a1a]">
          <Loader2 className="w-8 h-8 animate-spin text-[#31ff26]" />
          <span className="ml-3 text-lg poppins-font">Processing...</span>
        </div>
      )}

      <div className="flex-grow">
        <div className="container mx-auto px-6 py-6">
          <div className="bg-[#f9f9f9] rounded-2xl shadow-xl overflow-hidden">
            <BannerSlider banners={storeConfig.banners} />
          </div>
        </div>

        {showTopUp ? (
          <main className="container mx-auto px-4 py-6">
            <div className="header py-2">
              <img
                src="https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/Untitled-1%20(1).png"
                alt="Banner"
                className="w-full h-auto max-h-48 sm:max-h-64 object-contain rounded-xl"
              />
            </div>
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={() => {
                    setShowTopUp(false);
                    setShowCheckout(false);
                    setValidationResult(null);
                    setForm(prev => ({ ...prev, nickname: undefined }));
                  }}
                  className="text-[#1a1a1a] hover:text-yellow-300 transition-all text-sm flex items-center gap-2 bg-[#f9f9f9] px-4 py-2 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5" /> <span className="poppins-font">Back to Games</span>
                </button>
                {(form.userId || form.serverId) && (
                  <button
                    onClick={clearSavedInfo}
                    className="text-[#1a1a1a] hover:text-yellow-300 transition-all text-sm flex items-center gap-2 bg-[#f9f9f9] px-4 py-2 rounded-lg"
                  >
                    <XCircle className="w-5 h-5" /> <span className="poppins-font">Clear Saved Info</span>
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 rounded-lg">
              <div className="inner-content">
                <div className="section-header">
                  <div className="section-number">01</div>
                  <h3 className="text-base font-semibold poppins-font">Enter Your Info</h3>
                  <img
                    src="https://zttopup.com/_next/image?url=%2Fassets%2Fzttopup%2Fhello-kitty.gif&w=1920&q=75"
                    alt="Hello Kitty"
                    className="w-10 h-10 ml-auto"
                  />
                </div>
                <form className="space-y-4">
                  <div className="flex justify-center gap-4">
                    <div>
                      <input
                        type="text"
                        name="userId"
                        className="input-field"
                        placeholder="User ID"
                        value={form.userId}
                        onChange={(e) => {
                          const value = e.target.value.trim().replace(/[^0-9]/g, '');
                          setForm(prev => ({ ...prev, userId: value, nickname: undefined }));
                          setValidationResult(null);
                          setFormErrors(prev => ({ ...prev, userId: undefined }));
                        }}
                      />
                      {formErrors.userId && <p className="text-red-500 text-xs mt-1">{formErrors.userId}</p>}
                    </div>
                    {form.game === 'mlbb' && (
                      <div>
                        <input
                          type="text"
                          name="zoneId"
                          className="input-field"
                          placeholder="Zone ID"
                          value={form.serverId}
                          onChange={(e) => {
                            const value = e.target.value.trim().replace(/[^0-9]/g, '');
                            setForm(prev => ({ ...prev, serverId: value, nickname: undefined }));
                            setValidationResult(null);
                            setFormErrors(prev => ({ ...prev, serverId: undefined }));
                          }}
                        />
                        {formErrors.serverId && <p className="text-red-500 text-xs mt-1">{formErrors.serverId}</p>}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center items-center gap-2">
                    <button
                      type="button"
                      onClick={validateAccount}
                      disabled={validating || !form.userId || (form.game === 'mlbb' && !form.serverId)}
                      className="check-id-button"
                    >
                      {validating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span className="check-id-text poppins-font">Checking...</span>
                        </>
                      ) : (
                        <span className="check-id-text poppins-font">Check ID</span>
                      )}
                    </button>
                    {(validationResult?.success || validationResult?.status) && (
                      <div className="flex items-center gap-2 text-green-500 text-sm poppins-font">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Account found: {form.nickname}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 text-gray-600 text-xs poppins-font">
                    To see your User ID, log into the game, tap your Avatar on the left screen, then select "Check ID". Your User ID will be displayed. Example: User ID: 123456789, Zone ID: 1234.
                  </div>
                </form>
              </div>
            </div>

            <div className="p-6 rounded-lg">
              <div className="inner-content products-section">
                <div className="section-header">
                  <div className="section-number">02</div>
                  <h3 className="text-lg font-semibold poppins-font">Diamond Products</h3>
                </div>
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="w-12 h-12 animate-spin text-[#31ff26]" />
                    <span className="ml-2 text-sm poppins-font">Loading products...</span>
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
            </div>

            <div className="p-6 rounded-lg">
              <div className="inner-content payment-section">
                <div className="section-header">
                  <div className="section-number">03</div>
                  <h3 className="text-base font-semibold poppins-font">Payment Methods</h3>
                </div>
                <div
                  className={`payment-box ${selectedPayment === 'khqr' ? 'selected' : ''}`}
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
                      <p className="khmer-font">Scan to pay with any bank app</p>
                    </div>
                  </div>
                </div>
                {formErrors.paymentMethod && <p className="text-red-500 text-xs mt-1">{formErrors.paymentMethod}</p>}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="accept"
                    className="w-5 h-5 text-[#31ff26] border-[#31ff26] rounded focus:ring-[#31ff26]"
                    checked
                    disabled
                  />
                  <label htmlFor="accept" className="text-gray-600 text-sm poppins-font">
                    I agree to the <a href="/term-and-policy" className="text-[#31ff26] hover:underline">Terms</a>
                  </label>
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
                        className="mlbb-button2"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" className="mlbb-icon64">
                          <g fill="none" fillRule="evenodd">
                            <path d="m12.calendar_month 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.10-.01z"></path>
                            <path d="M5 6.5a.5.5 0 1 1 .5-.5H16a1 1 0 1 0 0-2H5.5A2.5 2.5 0 0 0 3 6.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5.5a.5.5 0 0 1-.5-.5M15.5 15a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3" fill="#fff"></path>
                          </g>
                        </svg>
                        <span className="mlbb-text36 poppins-font">Pay Now</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </main>
        ) : (
          <main className="container mx-auto px-4 py-6">
            <div className="flex flex-col items-center">
              <div className="header py-2">
                <img
                  src="https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/Untitled-1%20(1).png"
                  alt="Banner"
                  className="w-full h-auto max-h-48 sm:max-h-64 object-contain rounded-xl"
                />
              </div>
              <div className="game-container">
                {/* First Row: Mobile Legends KH and Free Fire */}
                <div
                  className="game-card"
                  onClick={() => {
                    setForm(prev => ({ ...prev, game: 'mlbb' }));
                    setShowTopUp(true);
                  }}
                >
                  <img
                    src="https://www.daddytopup.com/_next/image?url=https%3A%2F%2Fdaddy-cms.minttopup.xyz%2FUploads%2FImg_Resizer_20240801_2222_57312_4914487dd4.webp&w=1920&q=75"
                    alt="Mobile Legends KH"
                    className="game-image transition-transform hover:scale-105"
                  />
                  <h3 className="text-sm font-semibold poppins-font text-center truncate mt-2">Mobile Legends KH</h3>
                </div>
                <div
                  className="game-card"
                  onClick={() => {
                    setForm(prev => ({ ...prev, game: 'freefire' }));
                    setShowTopUp(true);
                  }}
                >
                  <img
                    src="https://www.daddytopup.com/_next/image?url=https%3A%2F%2Fdaddy-cms.minttopup.xyz%2Fuploads%2Ffree_fire_logo_7b069d4084.jpg&w=750&q=75"
                    alt="Free Fire"
                    className="game-image transition-transform hover:scale-105"
                  />
                  <h3 className="text-sm font-semibold poppins-font text-center truncate mt-2">Free Fire</h3>
                </div>
                {/* Second Row: Mobile Legends PH */}
                <div className="game-card disabled" title="Coming Soon">
                  <div className="relative">
                    <img
                      src="https://www.daddytopup.com/_next/image?url=https%3A%2F%2Fdaddy-cms.minttopup.xyz%2Fuploads%2Fmlbb_ph_4ffb701419.webp&w=750&q=75"
                      alt="Mobile Legends PH"
                      className="game-image"
                    />
                    <span className="coming-soon">Coming Soon</span>
                  </div>
                  <h3 className="text-sm font-semibold poppins-font text-center truncate mt-2">Mobile Legends PH</h3>
                </div>
                {/* Placeholder to maintain two-column layout */}
                <div className="game-card disabled" style={{ visibility: 'hidden' }}>
                  <div className="relative">
                    <img
                      src="https://www.daddytopup.com/_next/image?url=https%3A%2F%2Fdaddy-cms.minttopup.xyz%2Fuploads%2Fmlbb_ph_4ffb701419.webp&w=750&q=75"
                      alt="Placeholder"
                      className="game-image"
                    />
                    <span className="coming-soon">Coming Soon</span>
                  </div>
                  <h3 className="text-sm font-semibold poppins-font text-center truncate mt-2">Placeholder</h3>
                </div>
              </div>
            </div>
          </main>
        )}

        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => window.open(storeConfig.supportUrl, '_blank')}
            className="support-button flex items-center gap-4 bg-red-500 text-white px-4 py-3 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-110"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" className="text-white">
              <path fill="none" d="M0 0h24v24H0z"/>
              <path fill="currentColor" d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"/>
            </svg>
            <span className="font-semibold poppins-font text-sm">Support</span>
          </button>
        </div>

        <footer className="bg-[#f9f9f9] text-[#1a1a1a] py-4">
          <div className="container mx-auto px-4 text-center space-y-4">
            <div className="mb-4">
              <p className="font-bold text-lg poppins-font">Contact Us:</p>
              <div className="flex justify-center gap-4">
                <a href="https://www.facebook.com/share/1CVHbXejqR/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="text-[#1a1a1a] hover:text-blue-500">
                  <Facebook className="w-6 h-6" />
                </a>
                <a href="https://t.me/kakronabns" target="_blank" rel="noopener noreferrer" className="text-[#1a1a1a] hover:text-blue-500">
                  <MessageCircle className="w-6 h-6" />
                </a>
              </div>
            </div>
            <div className="mb-4">
              <p className="font-bold text-lg poppins-font">Accept Payment:</p>
              <div className="flex justify-center">
                <img
                  alt="khqr"
                  src="https://www.daddytopup.com/_next/image?url=%2Fassets%2Fmain%2Fkhqr.webp&w=828&q=75"
                  className="w-16 h-auto"
                />
              </div>
            </div>
            <div>
              <p className="text-base">
                <a href="/term-and-policy" className="text-[#31ff26] hover:underline">
                  <span className="font-bold">Privacy Policy</span> | <span className="font-bold">Terms & Conditions</span>
                </a>
              </p>
              <p className="text-base poppins-font">© 2025 MLBB Store. All Rights Reserved.</p>
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
            discountPercent={0}
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
