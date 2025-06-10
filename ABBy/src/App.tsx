import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Loader2, XCircle, ArrowLeft, Search, Facebook, MessageCircle, CheckCircle2, ArrowRight } from 'lucide-react';
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
      const timeout = setTimeout(() => {
        setLoading(false);
        setIsThinking(false);
        alert('Request timed out. Please try again.');
      }, 10000);
      const table = game === 'mlbb' ? 'mlbb_products' : 'freefire_products';
      const { data: products, error } = await supabase
        .from(table)
        .select('*')
        .order('id', { ascending: true });
      clearTimeout(timeout);
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
        <div className="min-h-screen flex items-center justify-center bg-[#f971ff]">
          <Loader2 className="w-10 h-10 animate-spin text-white" />
          <span className="ml-2 text-white">Loading admin panel...</span>
        </div>
      }>
        <AdminPage />
      </Suspense>
    );
  }

  if (isResellerRoute) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f971ff]">
          <Loader2 className="w-10 h-10 animate-spin text-white" />
          <span className="ml-2 text-white">Loading reseller panel...</span>
        </div>
      }>
        <ResellerPage onLogin={() => { setIsResellerLoggedIn(true); window.location.href = '/'; }} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-dark flex flex-col relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kh+Ang+Chittbous&display=swap');
        body {
          background-color: #f971ff !important;
        }
        .khmer-font {
          font-family: 'Kh Ang Chittbous', sans-serif;
        }
        .bg-dark {
          background-color: #f971ff;
        }
        .price-box {
          background-color: #ffd700;
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
        }
        .logo-container {
          width: 60px;
          height: 60px;
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
          margin-bottom: 16px;
        }
        .section-number {
          width: 32px;
          height: 32px;
          background-color: #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: bold;
          color: #000000;
          margin-right: 8px;
        }
        .inner-content,
        .inner-content.payment-section {
          background-color: #ffffff !important;
          padding: 16px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .inner-content.products-section {
          background-color: #f971ff !important;
          padding: 0;
          border-radius: 0;
          box-shadow: none;
        }
        .payment-box {
          background-color: #ffffff;
          border: 2px solid #f971ff;
          border-radius: 8px;
          padding: 8px 12px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          transition: transform 0.2s ease-in-out;
          cursor: pointer;
        }
        .payment-box.selected::after {
          content: '';
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 12px;
          height: 12px;
          background-color: #f971ff;
          border-radius: 50%;
          border: 2px solid #f971ff;
        }
        .payment-box:hover {
          transform: scale(1.02);
        }
        .payment-content {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }
        .payment-image {
          width: 32px;
          height: 32px;
          object-fit: contain;
          border-radius: 4px;
        }
        .payment-text {
          flex: 1;
        }
        .payment-text p:first-child {
          font-size: 1rem;
          font-weight-semibold;
          color: #000000;
          margin-bottom: 2px;
        }
        .payment-text p:last-child {
          font-size: 0.8rem;
          color: #000000;
          opacity: 0.7;
        }
        .input-field {
          background-color: #ffffff;
          color: #000000;
          border: 1px solid #f971ff;
          padding: 8px;
          border-radius: 4px;
          width: 100%;
          text-align: center;
        }
        .mlbb-form4 {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #ffffff;
          padding: 10px;
          border-radius: 8px;
          width: 100%;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          box-shadow: 0 -2px 10px rgba(0, 0,0,0.2);
        }
        .mlbb-container43 {
          display: flex;
          flex-direction: column;
          color: #000000;
        }
        .mlbb-text30, .mlbb-text33 {
          font-size: 14px;
          margin-bottom: 5px;
          color: #000000;
        }
        .mlbb-text32, .mlbb-text35 {
          font-weight: bold;
          margin-left: 5px;
          color: #000000;
        }
        .mlbb-container44 {
          display: flex;
          justify-content: flex-end;
        }
        .mlbb-button2, .check-id-button {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f971ff;
          color: #ffffff;
          padding: 10px 24px;
          border-radius: 5px;
          border: 2px solid #000000;
          cursor: pointer;
          font-size: 16px;
          font-weight: 700;
          transition: background-color 0.3s, color 0.3s;
          min-width: 150px;
          height: 48px;
        }
        .mlbb-button2:hover, .check-id-button:hover {
          background-color: #000000;
          color: #f971ff;
        }
        .mlbb-button2:disabled, .check-id-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .mlbb-button2:disabled:hover, .check-id-button:disabled:hover {
          background-color: #f971ff;
          color: #ffffff;
        }
        .mlbb-icon64 {
          margin-right: 8px;
        }
        .mlbb-text36, .check-id-text {
          text-transform: uppercase;
          color: #ffffff;
        }
        .mlbb-button2:hover .mlbb-text36, .check-id-button:hover .check-id-text {
          color: #f971ff;
        }
        .game-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .game-card:hover {
          transform: scale(1.05);
        }
        .game-card.disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
        .game-card.disabled:hover {
          transform: none;
        }
        .game-image {
          width: 100%;
          max-width: 200px;
          min-width: 200px;
          aspect-ratio: 1 / 1;
          object-fit: contain;
          border-radius: 8px;
        }
        .game-container {
          display: grid;
          grid-template-columns: repeat(2, minmax(140px, 200px));
          gap: 1.5rem;
          justify-content: center;
          width: 100%;
          max-width: 1200px;
          padding-bottom: 1.5rem;
        }
        .coming-soon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 1rem;
          font-weight: bold;
          text-align: center;
        }
        @media (max-width: 480px) {
          .game-container {
            grid-template-columns: repeat(2, minmax(140px, 160px));
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
            grid-template-columns: repeat(2, minmax(160px, 180px));
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
            grid-template-columns: repeat(2, minmax(180px, 200px));
            gap: 1.5rem;
          }
          .game-image {
            max-width: 200px;
            min-width: 200px;
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
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          padding: 8px;
          z-index: 1000;
        }
        .social-menu a {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          color: #000000;
          text-decoration: none;
          transition: background-color 0.2s;
        }
        .social-menu a:hover {
          background-color: #f0f0f0;
        }
        .products-section, .products-section * {
          background-color: #f971ff !important;
        }
        .loading-container {
          background-color: #f971ff !important;
        }
        /* Flash Sale Styles */
        .bg-muted {
          background-color: #1a3c34;
        }
        .text-foreground {
          color: #ffffff;
        }
        .text-primary {
          color: #f971ff;
        }
        .text-destructive {
          color: #ff4d4f;
        }
        .red-line-through {
          text-decoration: line-through;
        }
        .fs-countdown {
          display: flex;
          align-items: center;
        }
        .time {
          font-size: 1rem;
          font-weight: bold;
          color: #ffffff;
        }
        .separator {
          font-size: 1rem;
          color: #ffffff;
          margin: 0 4px;
        }
        .marquee-content {
          display: flex;
          gap: 1rem;
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        .group:hover .animate-marquee {
          animation-play-state: paused;
        }
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        .bar {
          width: 100%;
          height: 8px;
          background-color: #e0e0e0;
          border-radius: 4px;
          margin-top: 4px;
          position: relative;
        }
        .progress {
          height: 100%;
          background-color: #f971ff;
          border-radius: 4px;
          transition: width 0.3s ease-in-out;
        }
        .progress-text {
          font-size: 0.75rem;
          color: #ffffff;
          margin-top: 4px;
          display: block;
        }
        .border-murky-800 {
          border: 1px solid rgba(26, 60, 52, 0.75);
        }
        .bg-murky-800 {
          background-color: #1a3c34;
        }
        .bg-primary-500 {
          background-color: #f971ff;
        }
        .text-primary-foreground {
          color: #ffffff;
        }
        .w-square-diagonal {
          width: 96px;
          transform: rotate(45deg);
        }
        .text-xxs {
          font-size: 0.65rem;
        }
        /* Comment Section Styles */
        .border-murky-600 {
          border-color: #2a4c44;
        }
        .text-darkColor {
          color: #000000;
        }
        .bg-gradient-to-b {
          background: linear-gradient(to bottom, #1a3c34, #1a3c34);
        }
        .clip-path-number {
          clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
        }
        .text-besar {
          font-size: 3rem;
        }
        .text-secondary-foreground {
          color: #d1d5db;
        }
        .text-murky-20 {
          color: #e5e7eb;
        }
      `}</style>

      <nav className="bg-[#f971ff] text-white p-3 shadow-lg sticky top-0 z-50 flex items-center justify-between">
        <a href="/" className="flex items-center">
          <div className="logo-container">
            <img
              src="https://raw.githubusercontent.com/Mengly08/picsa/refs/heads/main/profile.png"
              alt="Logo"
              className="logo-image"
            />
          </div>
        </a>
        <div className="flex items-center w-1/2 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 rounded-full bg-white text-black focus:outline-none focus:ring-2 focus:ring-white"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
          </div>
        </div>
        <div className="social-dropdown">
          <button
            onClick={() => setShowSocialDropdown(!showSocialDropdown)}
            className="text-white hover:text-gray-300 transition-colors flex items-center gap-2"
          >
            <MessageCircle className="w-6 h-6" />
            <span>Contact Us</span>
          </button>
          {showSocialDropdown && (
            <div className="social-menu">
              <a href="https://www.facebook.com/share/1CVHbXejqR/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer">
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
        <div className="flex items-center justify-center py-2 bg-[#f971ff] text-white">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
          <span className="ml-2 text-sm text-white">Grok is thinking...</span>
        </div>
      )}

      <div className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          <div className="bg-[#f971ff] rounded-2xl shadow-xl overflow-hidden">
            <BannerSlider banners={storeConfig.banners} />
          </div>

          <div className="container mt-6">
            <div className="rounded-2xl bg-muted/50">
              <div className="px-4 pb-3 pt-4">
                <h3 className="flex items-center space-x-4 text-foreground">
                  <div className="text-lg font-semibold uppercase leading-relaxed tracking-wider flex items-center">
                    <lottie-player
                      src="https://lottie.host/72527c22-6566-4eda-b453-dc61dd77ef2b/rt3d8phYjG.json"
                      speed="1"
                      style={{ width: '25px', height: '30px' }}
                      loop
                      autoplay
                      direction="1"
                      mode="normal"
                      background="transparent"
                    ></lottie-player>
                    FLASHSALE
                  </div>
                  <div className="flex items-center gap-1 text-sm capitalize">
                    <div className="fs-countdown ml-3">
                      <div className="time" id="hours">14</div>
                      <div className="separator">:</div>
                      <div className="time" id="minutes">19</div>
                      <div className="separator">:</div>
                      <div className="time" id="seconds">49</div>
                    </div>
                  </div>
                </h3>
                <p className="pl-6 text-xs text-foreground">Order now! Limited supplies.</p>
              </div>
              <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden pb-2 pt-1">
                <div className="group flex overflow-hidden p-2 [--gap:1rem] [gap:var(--gap)] flex-row container [--duration:20s]">
                  <div
                    data-run-marquee="true"
                    data-run-marquee-vertical="false"
                    className="flex shrink-0 justify-around [gap:var(--gap)] animate-marquee flex-row group-hover:[animation-play-state:paused]"
                  >
                    <div id="special_deals">
                      <div className="list marquee-content">
                        {[
                          {
                            href: "https://xiatopup.com/id/mobile-legends",
                            image: "/assets/thumbnail/fd3bcd628921c82a8931aadf0aadf0818d5e7f70.JPEG",
                            title: "MLBB KH - 86 Diamonds",
                            originalPrice: "$1.20",
                            discountedPrice: "$1.20",
                            progress: "95%",
                            remaining: "995",
                            type: "Promotion",
                            discount: "$0.00"
                          },
                          {
                            href: "https://xiatopup.com/id/mobile-legends",
                            image: "/assets/thumbnail/fd3bcd628921c82a8931aadf0aadf0818d5e7f70.JPEG",
                            title: "MLBB KH - 257 Diamonds",
                            originalPrice: "$3.59",
                            discountedPrice: "$3.59",
                            progress: "11%",
                            remaining: "11",
                            type: "Promotion",
                            discount: "$0.00"
                          },
                          {
                            href: "https://xiatopup.com/id/free-fire",
                            image: "/assets/thumbnail/f7421aead19147b22b9c4dae8af8f5ef5eb33518.JPEG",
                            title: "Free Fire - 25 Diamonds",
                            originalPrice: "$0.23",
                            discountedPrice: "$0.10",
                            progress: "94%",
                            remaining: "94",
                            type: "Event",
                            discount: "$0.13"
                          },
                          {
                            href: "https://xiatopup.com/id/free-fire",
                            image: "/assets/thumbnail/f7421aead19147b22b9c4dae8af8f5ef5eb33518.JPEG",
                            title: "Free Fire - Level Up",
                            originalPrice: "$3.99",
                            discountedPrice: "$3.99",
                            progress: "99%",
                            remaining: "9999",
                            type: "",
                            discount: "$0.00"
                          }
                        ].map((item, index) => (
                          <a
                            key={index}
                            className="relative w-[265px] cursor-pointer rounded-xl p-4 border-murky-800/75 bg-murky-800"
                            href={item.href}
                            style={{ outline: 'none' }}
                          >
                            <div className="flex flex-row items-center gap-3">
                              <img
                                alt=""
                                loading="lazy"
                                width="48"
                                height="48"
                                decoding="async"
                                className="rounded-lg bg-muted"
                                src={item.image}
                                style={{ color: 'transparent' }}
                              />
                              <div className="flex flex-col space-y-1">
                                <figcaption className="text-sm font-medium text-foreground">{item.title}</figcaption>
                                <p className="text-xs font-medium text-destructive line-through red-line-through">{item.originalPrice}</p>
                                <p className="text-xs font-medium text-primary">{item.discountedPrice}</p>
                                <div className="bar">
                                  <div className="progress" style={{ width: item.progress }}></div>
                                  <span className="progress-text">Remaining: {item.remaining}</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-foreground">{item.type}</div>
                            <div className="w-24 absolute aspect-square -top-[9px] -right-[9px] overflow-hidden rounded-sm">
                              <div className="absolute top-0 left-0 bg-primary/50 h-2 w-2"></div>
                              <div className="absolute bottom-0 right-0 bg-primary/50 h-2 w-2"></div>
                              <div className="absolute block w-square-diagonal py-1 text-center text-xxs font-semibold uppercase bottom-0 right-0 rotate-45 origin-bottom-right shadow-sm bg-primary-500 text-primary-foreground">
                                ECONOMICAL {item.discount}
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showTopUp ? (
          <main className="container mx-auto px-4 py-8">
            <div className="header py-2">
              <img
                src="https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/Untitled-1%20(1).png"
                alt="Banner"
                className="w-full h-auto max-h-48 sm:max-h-64 object-contain"
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
                  className="text-white hover:text-gray-300 transition-colors text-sm flex items-center gap-2 bg-[#f971ff] px-4 py-2 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5 text-white" /> Back to Games
                </button>
                {(form.userId || form.serverId) && (
                  <button
                    onClick={clearSavedInfo}
                    className="text-white hover:text-gray-300 transition-colors text-sm flex items-center gap-2 bg-[#f971ff] px-4 py-2 rounded-lg"
                  >
                    <XCircle className="w-5 h-5 text-white" /> Clear Saved Info
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 rounded-lg">
              <div className="inner-content">
                <div className="section-header">
                  <div className="section-number">01</div>
                  <h3 className="text-base font-semibold text-black khmer-font">បញ្ចូលព័ត៌មានរបស់អ្នក</h3>
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
                      {formErrors.userId && <p className="text-[#f971ff] text-xs mt-1">{formErrors.userId}</p>}
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
                        {formErrors.serverId && <p className="text-[#f971ff] text-xs mt-1">{formErrors.serverId}</p>}
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
                          <span className="check-id-text">Checking...</span>
                        </>
                      ) : (
                        <span className="check-id-text">Check ID</span>
                      )}
                    </button>
                    {(validationResult?.success || validationResult?.status) && (
                      <div className="flex items-center gap-2 text-[#f971ff] text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Account found: {form.nickname}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 text-black text-xs khmer-font">
                    ដើម្បីឃើញ UserID សូមចូលទៅក្នុងហ្គេម ហើយចុចរូបភាព Avatar នៅខាងឆ្វេងអេក្រង់កញ្ចក់ ហើយចុចទៅកាន់ "Check ID" ពេលនោះ User ID នឹងបង្ហាញឲ្យឃើញ បន្ទាប់មកសូមយក User ID នោះមកបំពេញ។ ឧទាហរណ៍: User ID: 123456789, Zone ID: 1234។
                  </div>
                </form>
              </div>
            </div>

            <div className="p-6 rounded-lg">
              <div className="inner-content products-section">
                <div className="section-header">
                  <div className="section-number">02</div>
                  <h3 className="text-lg font-semibold text-white khmer-font">ផលិតផល Diamond</h3>
                </div>
                {loading ? (
                  <div className="flex justify-center items-center py-8 loading-container">
                    <Loader2 className="w-12 h-12 animate-spin text-white" />
                    <span className="ml-2 text-white">Loading products...</span>
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-white text-center py-8">
                    No products available for this game. Please try again later.
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
                  <h3 className="text-base font-semibold text-black khmer-font">វិធីបង់ប្រាក់</h3>
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
                      <p className="khmer-font">ស្កែនដើម្បីបង់ប្រាក់ជាមួយកម្មវិធីធនាគារណាមួយ</p>
                    </div>
                  </div>
                </div>
                {formErrors.paymentMethod && <p className="text-[#f971ff] text-xs mt-1">{formErrors.paymentMethod}</p>}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="accept"
                    className="w-5 h-5 text-[#f971ff] border-[#f971ff] rounded focus:ring-[#f971ff]"
                    checked
                    disabled
                  />
                  <label htmlFor="accept" className="text-black text-sm khmer-font">
                    ខ្ញុំយល់ព្រមតាម <a href="/term-and-policy" className="text-[#f971ff] hover:underline">លក្ខខណ្ឌ</a>
                  </label>
                </div>

                {/* Comment Section */}
                <div className="mt-4 block rounded-xl bg-murky-800 shadow-2xl md:hidden">
                  <div className="flex border-b border-murky-600">
                    <div className="flex flex-row items-center gap-1 text-darkColor rounded-md">
                      <div className="items-center justify-start flex bg-gradient-to-b from-murky-800 to-murky-800 clip-path-number p-4 h-12 w-16" style={{ borderTopLeftRadius: '12px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
                          <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd"></path>
                        </svg>
                      </div>
                      <h3 className="px-2 py-2 text-base font-semibold leading-6 text-white sm:px-4">Comment</h3>
                    </div>
                  </div>
                  <div className="flow-root p-6">
                    <div className="flex flex-col overflow-hidden">
                      <div className="mx-6 flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-8 w-8 flex-shrink-0 text-yellow-400">
                          <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd"></path>
                        </svg>
                        <div>
                          <span className="text-5xl text-besar">0.0</span> <span> / </span><span>5.0</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="mx-6 flex items-center justify-center text-xs font-bold">0% Buyers are satisfied with this product.</div>
                        <div className="mx-6 flex items-center justify-center gap-2 text-xs">From 1 Comment.</div>
                      </div>
                    </div>
                    <div className="flex flex-col overflow-hidden pt-6">
                      {[...Array(5)].map((_, i) => (
                        <ul key={5 - i} className="rating-list" style={{ listStyleType: 'none', paddingLeft: 0 }}>
                          <li className="rating-item" style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                            <div className="rating-value" style={{ width: '30px', textAlign: 'right', marginRight: '10px' }}>
                              {5 - i}
                            </div>
                            <div className="star-rating" style={{ display: 'flex', alignItems: 'center', marginRight: '10px' }}>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden="true"
                                style={{ height: '20px', width: '20px', color: '#ffc107' }}
                              >
                                <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd"></path>
                              </svg>
                            </div>
                            <div className="bar" style={{ flexGrow: 1, height: '10px', backgroundColor: '#ddd', borderRadius: '5px', overflow: 'hidden' }}>
                              <div className="progress" style={{ height: '100%', backgroundColor: '#ffc107', borderRadius: '5px', width: '0%' }}></div>
                            </div>
                            <div className="count" style={{ width: '50px', marginLeft: '0px', textAlign: 'right' }}>0</div>
                          </li>
                        </ul>
                      ))}
                    </div>
                    <div className="mt-6">
                      <p className="text-sm text-secondary-foreground">Do you like this product? Tell us and other prospective buyers about your experience.</p>
                    </div>
                    <hr />
                    <div className="flow-root pt-5">
                      <div className="-my-6 divide-y">
                        <div className="py-3">
                          <div className="flex items-center">
                            <div className="w-full">
                              <div className="flex items-start justify-between">
                                <h4 className="mt-0.5 text-xs font-bold text-white">Be****en</h4>
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <svg
                                      key={i}
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 20 20"
                                      fill="white"
                                      aria-hidden="true"
                                      className="text-yellow-400 h-4 w-4 flex-shrink-0"
                                    >
                                      <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382l-1.831-4.401z" clipRule="evenodd"></path>
                                    </svg>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex w-full justify-between pt-1 text-xxs">
                            <span>Weekly Pass</span>
                            <span>2025-06-05 19:22:30</span>
                          </div>
                          <div className="text-murky-20 mt-1 space-y-6 text-sm italic">
                            <div>“The topup process is fast and the price is very cheap!”</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-5 mt-5">
                      <a
                        className="inline-flex items-center justify-center whitespace-nowrap text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent/75 hover:text-accent-foreground h-8 rounded-md px-4 bg-[#1a3c34]/50 pr-3 flex items-center gap-2"
                        href="/id/reviews"
                        style={{ outline: 'none' }}
                      >
                        <span>See all reviews</span>
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
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
                            <path d="m12.calendar_month 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.10-.01z"></path>
                            <path d="M5 6.5a.5.5 0 1 1 .5-.5H16a1 1 0 0 0 0-2H5.5A2.5 2.5 0 0 0 3 6.5V18a2 2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0-2H5.5a.5.5 0 0 1-.5-.5M15.5 15a1.5 1.5 0 1 0 0-3a1.5 1.5 0 .0 .0 3 0 .0"></path>
                          </g>
                        </svg>
                        <span className="mlbb-text36">Pay Now</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
          </main>
        ) : (
          <main className="container mx-auto px-4 py-6">
            <div className="flex flex-col items-center">
              <div className="header py-2">
                <img
                  src="https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/Untitled-1%20(1).png"
                  alt="Banner"
                  className="w-full h-auto max-h-48 sm:max-h-64 object max-h-12px sm:h-auto contain"
                />
              </div>
              <div className="game-container">
                <div
                  className="game-card"
                  onClick={() => {
                    console.log('Setting game to mlbb');
                    setShowTopUp(true);
                    setForm(prev => ({ ...prev, game: 'mlbb' }));
                    setShowTopUp(true);
                  }}
                >
                  <img
                    src="https://res.cloudinary.com/dhztk4abr/image/upload/v1746748734/products/nq9h3azwlgffpt02c82q.png?w=384&q=75"
                    alt="Mobile Legends"
                    className="game-image"
                  />
                  <h3 className="text-sm font-semibold text-white text-center truncate mt-2">Mobile Legends</h3>
                </div>
                <div
                  className="game-card"
                  onClick={() => {
                    console.log('Setting game to freefire');
                    setForm(prev => ({ ...prev, game: 'freefire' }));
                    setShowTopUp(true);
                  }}
                >
                  <img
                    src="https://play-lh.googleusercontent.com/sKh_B4ZLfu0hf3zqx9z98b2-APe2rxDb8dIW-QqFHyS3cpzDK2Qq8tAbRAz3rXzOFtdAw"
                    alt="Free Fire"
                    className="game-image"
                  />
                  <h3 className="text-sm font-semibold text-white text-center truncate mt-2">Free Fire</h3>
                </div>
                <div className="game-card disabled" title="Coming Soon">
                  <div className="relative">
                    <img
                      src="https://mob.cloudinary.com/daddy-retopup.com/_next/image?url=https%3A%2F%2F%2fdaddy-cms.minttopup.xyz%2FUploads%2Fmlbb_ph_4ffb701419.webp&w=750&q=75"
                      alt="Mobile Legends PH"
                      className="game-image"
                    />
                    <span className="coming-soon">Coming Soon</span>
                  </div>
                  <h3 className="text-sm font-semibold text-center text-white truncate">Mobile Legends PH</h3>
                </div>
              </div>
            </div>
          </main>
        )}

        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => window.open(storeConfig.supportUrl, '_blank')}
            className="flex items-center gap-2 bg-white text-black px-4 py-3 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105">
            <div className="relative">
              <div className="absolute inset-0 bg-gray-300/30 rounded-full animate-ping opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" className="text-black">
                <path fill="none" d="M0 0h24v24H0z"/>
                <path fill="currentColor" d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"/>
              </svg>
            </div>
            <span className="font-medium">Support</span>
          </button>
        </div>

        <footer className="bg-[#f971ff] text-white py-4 w-full">
          <div className="container mx-auto px-4 text-center">
            <div className="mb-2">
              <p className="font-bold text-white">Contact Us:</p>
              <div className="flex justify-center gap-4">
                <a href="https://www.facebook.com/share/1CVHbXejqR/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.04c-5.5 0-10 4.49-10 10.02c0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02"/>
                  </svg>
                </a>
                <a href="https://t.me/kakronabns" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6m4.5 5.4c-.6.1-1.2.3-1.8.5v6.2c0 2.5-2 4.5-4.5 4.5S6 16.6 6 14.1s2-4.5 4.5-4.5c.3 0 .6 0 .9.1v-2.2c-.3 0-.6-.1-.9-.1-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6V8.9c.6-.4 1.2-.7 1.8-.9v-1.6z"/>
                  </svg>
                </a>
                <a href="https://t.me/kakronabns" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6m4.5 5.4c-.6.1-1.2.3-1.8.5v6.2c0 2.5-2 4.5-4.5 4.5S6 16.6 6 14.1s2-4.5 4.5-4.5c.3 0 .6 0 .9.1v-2.2c-.3 0-.6-.1-.9-.1-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6V8.9c.6-.4 1.2-.7 1.8-.9v-1.6z"/>
                  </svg>
                </a>
              </div>
            </div>
            <div className="mb-2">
              <p className="font-bold text-white">Accept Payment:</p>
              <div className="flex justify-center">
                <img
                  alt="khqr"
                  src="https://www.daddytopup.com/_next/image?url=%2Fassets%2Fmain%2Fkhqr.webp&w=828&q=75"
                  className="w-[70px] h-auto"
                />
              </div>
            </div>
            <div>
              <p className="text-xs">
                <a href="/term-and-policy" className="text-white">
                  <span className="font-bold underline" style={{ textUnderlineOffset: '3px' }}>PRIVACY POLICY</span> |{' '}
                  <span className="font-bold underline" style={{ textUnderlineOffset: '3px' }}>TERMS AND CONDITION</span>
                </a>
              </p>
              <p className="text-xs text-white">COPYRIGHT © MLBB STORE. ALL RIGHTS RESERVED.</p>
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
