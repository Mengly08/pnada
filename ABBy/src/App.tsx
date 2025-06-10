import React, { useState, useEffect, Suspense } from 'react';
import { Loader2, XCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ProductList } from './components/ProductList';
import { PaymentModal } from './components/PaymentModal';
import { BannerSlider } from './components/BannerSlider';
import { PopupBanner } from './components/PopupBanner';
import { supabase } from './lib/supabase';
import storeConfig from './lib/config';
import Lottie from 'lottie-react';

const App = () => {
  const [form, setForm] = useState(() => {
    const savedForm = localStorage.getItem('customerInfo');
    return savedForm
      ? JSON.parse(savedForm)
      : {
          userId: '',
          serverId: '',
          product: null,
          game: 'mlbb',
          nickname: undefined,
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
  const [isMainLeftClicked, setIsMainLeftClicked] = useState(false);
  const [showSocialDropdown, setShowSocialDropdown] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [isPaymentSelected, setIsPaymentSelected] = useState(false);
  const [count, setCount] = useState(1);

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
    '2810': { total: '2810', breakdown: '2195+615bonus' },
  };

  useEffect(() => {
    const target = 62000;
    const duration = 15000;
    const increment = target / (duration / 16);

    const timer = setInterval(() => {
      setCount((prev) => {
        if (prev >= target) {
          clearInterval(timer);
          return target;
        }
        return prev + Math.ceil(increment);
      });
    }, 16);

    return () => clearInterval(timer);
  }, []);

  // Countdown timer for Flash Sale
  useEffect(() => {
    const endTime = new Date().getTime() + 20 * 3600 * 1000 + 43 * 60 * 1000 + 25 * 1000; // 20h 43m 25s
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTime - now;
      if (distance < 0) {
        clearInterval(timer);
        document.getElementById('hours').textContent = '00';
        document.getElementById('minutes').textContent = '00';
        document.getElementById('seconds').textContent = '00';
        return;
      }
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
      document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
      document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
      localStorage.setItem(
        'customerInfo',
        JSON.stringify({
          userId: form.userId,
          serverId: form.serverId,
          game: form.game,
          product: null,
          nickname: form.nickname,
        })
      );
    }
  }, [form.userId, form.serverId, form.game, form.nickname]);

  const startPaymentCooldown = () => {
    setPaymentCooldown(7);
    if (cooldownInterval) clearInterval(cooldownInterval);
    const interval = setInterval(() => {
      setPaymentCooldown((prev) => {
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
      } else {
        const response = await supabase
          .from('freefire_products')
          .select('*')
          .order('id', { ascending: true });
        data = response.data;
        error = response.error;
      }
      if (error) throw error;
      let transformedProducts = data.map((product) => ({
        id: product.id,
        name: product.name,
        diamonds: product.diamonds || undefined,
        price: product.price,
        currency: product.currency,
        type: product.type,
        game: game,
        image: product.image || undefined,
        code: product.code || undefined,
      }));
      if (isReseller) {
        const resellerPricesResponse = await supabase
          .from('reseller_prices')
          .select('*')
          .eq('game', game);
        if (!resellerPricesResponse.error && resellerPricesResponse.data) {
          const resellerPrices = resellerPricesResponse.data;
          transformedProducts = transformedProducts.map((product) => {
            const resellerPrice = resellerPrices.find(
              (rp) => rp.product_id === product.id && rp.game === product.game
            );
            return resellerPrice
              ? { ...product, price: resellerPrice.price, resellerPrice: resellerPrice.price }
              : product;
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

  const validateAccount = async () => {
    if (!form.userId || form.game !== 'mlbb') return;

    setValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch(
        `https://api.isan.eu.org/nickname/ml?id=${form.userId}&zone=${form.serverId}`
      );
      const data = await response.json();

      if (data.success) {
        setValidationResult(data);
        setForm((prev) => ({ ...prev, nickname: data.name }));
      } else {
        setValidationResult(null);
        alert('Account not found. Please check your User ID and Zone ID.');
      }
    } catch (error) {
      console.error('Failed to validate account:', error);
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
    if (form.game === 'mlbb' && !form.serverId) errors.serverId = 'Server ID is required';
    if (!form.product) return alert('Please select a product');
    if (form.game === 'mlbb' && !validationResult?.success) {
      return alert('Please check your Mobile Legends account first');
    }
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const productIdentifier = form.product.code || form.product.diamonds || form.product.name;
    const format =
      form.game === 'mlbb'
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

  const handleProductSelect = (product) => {
    setForm({ ...form, product });
  };

  const handlePaymentClick = () => {
    setIsPaymentSelected(!isPaymentSelected);
  };

  const scrollLeft = () => {
    const scrollCard = document.querySelector('.home-scroll-card');
    if (scrollCard) {
      scrollCard.scrollBy({ left: -250, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const scrollCard = document.querySelector('.home-scroll-card');
    if (scrollCard) {
      scrollCard.scrollBy({ left: 250, behavior: 'smooth' });
    }
  };

  if (isAdminRoute) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fad2f9' }}>
            <Loader2 className="w-10 h-10 animate-spin text-white" />
            <span className="ml-2 text-white">Loading admin panel...</span>
          </div>
        }
      >
        <div>Admin Page (Not Implemented)</div>
      </Suspense>
    );
  }

  if (isResellerRoute) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fad2f9' }}>
            <Loader2 className="w-10 h-10 animate-spin text-white" />
            <span className="ml-2 text-white">Loading reseller panel...</span>
          </div>
        }
      >
        <div>Reseller Page (Not Implemented)</div>
      </Suspense>
    );
  }

  const hardcodedProducts = [
    { id: 1, name: 'Weekly Pass', price: 1.34, diamonds: null },
    { id: 2, name: 'Weekly Pass x2', price: 2.75, diamonds: null },
    { id: 3, name: 'Weekly Pass x5', price: 6.85, diamonds: null },
    { id: 4, name: '86 DM + Weekly', price: 2.86, diamonds: '86' },
    { id: 5, name: '257 DM + Weekly', price: 4.95, diamonds: '257' },
    { id: 6, name: '55 DM', price: 0.79, diamonds: '55' },
    { id: 7, name: '86 DM', price: 1.90, diamonds: '86' },
    { id: 8, name: '165 DM', price: 2.15, diamonds: '165' },
    { id: 9, name: '172 DM', price: 2.20, diamonds: '172' },
    { id: 10, name: '257 DM', price: 3.30, diamonds: '257' },
    { id: 11, name: '429 DM', price: 5.50, diamonds: '429' },
    { id: 12, name: '514 DM', price: 6.50, diamonds: '514' },
    { id: 13, name: '565 DM', price: 6.95, diamonds: '565' },
    { id: 14, name: '600 DM', price: 7.50, diamonds: '600' },
  ];

  return (
    <div className="min-h-screen flex flex-col relative" style={{ backgroundColor: '#fad2f9' }}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Kh+Ang+Chittbous&display=swap');
          .khmer-font {
            font-family: 'Kh Ang Chittbous', sans-serif;
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
          .header-image {
            height: 20px;
            width: auto;
          }
          .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
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
          .inner-content.products-section,
          .inner-content.payment-section,
          .inner-content.user-info-section {
            background-color: #f078fa !important;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .inner-header {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
          }
          .payment-box {
            background-color: #ffffff;
            border: 2px solid #ff69b4;
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
            background-color: #ff0000;
            border-radius: 50%;
            border: 2px solid #ff69b4;
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
            font-weight: 600;
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
            border: 1px solid #ffff00;
            padding: 8px;
            border-radius: 4px;
            width: 100%;
            text-align: center;
          }
          .mlbb-form4 {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #f078fa;
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
            color: #fff;
          }
          .mlbb-text32, .mlbb-text35 {
            font-weight: bold;
            margin-left: 5px;
            color: #fff;
          }
          .mlbb-container44 {
            display: flex;
            justify-content: flex-end;
          }
          .mlbb-button2, .check-id-button {
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #fff;
            color: #000000;
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
            color: #fff;
          }
          .mlbb-button2:disabled, .check-id-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .mlbb-button2:disabled:hover, .check-id-button:disabled:hover {
            background-color: #fff;
            color: #000000;
          }
          .mlbb-icon64 {
            margin-right: 8px;
          }
          .mlbb-text36, .check-id-text {
            text-transform: uppercase;
            color: #000000;
          }
          .mlbb-button2:hover .mlbb-text36, .check-id-button:hover .check-id-text {
            color: #fff;
          }
          div[class*="p-6 rounded-lg"] {
            background-color: transparent !important;
          }
          .game-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            background-color: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            padding: 16px;
            width: 100%;
            max-width: 250px;
            transition: opacity 0.3s;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .game-card:hover {
            opacity: 0.9;
          }
          .game-image {
            width: 100%;
            max-width: 200px;
            height: auto;
            aspect-ratio: 1 / 1;
            object-fit: cover;
            border-radius: 8px;
          }
          .game-title {
            color: #333333;
            font-size: 16px;
            font-weight: 700;
            text-align: center;
            margin-top: 12px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .top-up-button {
            background-color: #ff4444;
            color: #ffffff;
            padding: 8px 24px;
            border-radius: 20px;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
            width: 100%;
            max-width: 140px;
            margin-top: 12px;
            transition: background-color 0.3s;
          }
          .top-up-button:hover {
            background-color: #cc0000;
          }
          .game-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: 1fr;
            gap: 2rem;
            justify-items: center;
            width: 100%;
            max-width: 600px;
            padding: 2.5rem 0;
          }
          .counter-box {
            display: inline-block;
            margin: 0 auto;
          }
          .counter-box h2 {
            font-size: 4.5rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
            color: #ffffff;
          }
          .counter-box h2 sup {
            font-size: 2.25rem;
            color: #ffffff;
          }
          .counter-box h5 {
            font-size: 1.75rem;
            font-weight: 500;
            color: #ffffff;
          }
          .feature-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
            text-align: center;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.2);
            min-width: 200px;
            min-height: 200px;
          }
          .feature-card img {
            width: 100px;
            height: 100px;
            object-fit: contain;
            margin-bottom: 16px;
          }
          .feature-card p {
            font-family: 'Kh Ang Chittbous', sans-serif;
            font-size: 1.75rem;
            font-weight: 600;
            color: #ffffff;
            text-align: center;
          }
          .features-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 16px;
          }
          .features-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            max-width: 600px;
            margin: 0 auto;
          }
          .feature-card {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(8px);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          .feature-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
            background: rgba(255, 255, 255, 0.2);
          }
          .feature-icon {
            width: 60px;
            height: 60px;
            object-fit: contain;
            margin-bottom: 12px;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
            transition: transform 0.3s ease;
          }
          .feature-card:hover .feature-icon {
            transform: scale(1.1);
          }
          .feature-text {
            font-size: 1.2rem;
            font-weight: 700;
            color: #fff;
            font-family: 'Kh Ang Chittbous', sans-serif;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          }
          .home-container14 {
            max-width: 1200px;
            margin: 0 auto;
            padding: 16px;
          }
          .home-txtpopulars {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }
          .home-container15 {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .home-icon10 {
            color: #ff4500;
          }
          .home-text32 {
            font-size: 1.5rem;
            font-weight: 700;
            color: #333;
          }
          .home-container16 {
            display: flex;
            gap: 8px;
          }
          .home-back, .home-next {
            width: 36px;
            height: 36px;
            background: #f0f0f0;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.3s;
          }
          .home-back:hover, .home-next:hover {
            background: #e0e0e0;
          }
          .home-icon12, .home-icon14 {
            color: #666;
          }
          .home-scroll-card {
            display: flex;
            overflow-x: auto;
            gap: 16px;
            padding-bottom: 8px;
            scroll-behavior: smooth;
          }
          .home-scroll-card::-webkit-scrollbar {
            height: 6px;
          }
          .home-scroll-card::-webkit-scrollbar-thumb {
            background: #ccc;
            border-radius: 3px;
          }
          .home-card1 {
            flex: 0 0 250px;
            background: #fff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s;
          }
          .home-card1:hover {
            transform: translateY(-4px);
          }
          .home-navlink21 {
            text-decoration: none;
            color: inherit;
          }
          .home-container18 {
            display: flex;
            flex-direction: column;
          }
          .home-image21 {
            width: 100%;
            height: 150px;
            object-fit: cover;
          }
          .home-container19 {
            padding: 12px;
          }
          .home-container21 {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .home-container22, .home-container23, .home-container24, .home-container25 {
            display: flex;
            align-items: center;
          }
          .home-text43 {
            font-size: 1.1rem;
            font-weight: 600;
            color: #333;
          }
          .home-text46 {
            font-size: 0.9rem;
            color: #666;
          }
          .home-text47 {
            font-size: 1rem;
            font-weight: 700;
            color: #ff4500;
            margin-right: 8px;
          }
          .game-center-header {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 16px;
            text-align: center;
          }
          .game-center-header img {
            width: 100%;
            max-width: 800px;
            height: auto;
            max-height: 300px;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }
          .game-center-header img.placeholder {
            background-color: #f0f0f0;
            color: #666;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            font-weight: 500;
          }
          /* Flash Sale Styles */
          @keyframes marquee {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(calc(-100% - var(--gap)));
            }
          }
          .animate-marquee {
            animation: marquee var(--duration) linear infinite;
          }
          .group:hover .animate-marquee {
            animation-play-state: paused;
          }
          .bar {
            width: 100%;
            height: 8px;
            background-color: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 4px;
          }
          .progress {
            height: 100%;
            background-color: #3b82f6;
            transition: width 0.3s ease;
          }
          .progress-text {
            display: block;
            font-size: 0.75rem;
            color: #6b7280;
            margin-top: 2px;
          }
          .fs-countdown {
            display: flex;
            align-items: center;
            gap: 2px;
          }
          .time {
            background-color: #000;
            color: #fff;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.9rem;
            min-width: 24px;
            text-align: center;
          }
          .separator {
            color: #000;
            font-size: 0.9rem;
            margin: 0 2px;
          }
          .w-square-diagonal {
            width: 100%;
            transform: translateY(50%) rotate(45deg);
          }
          @media (max-width: 768px) {
            .features-grid {
              grid-template-columns: 1fr;
              max-width: 300px;
            }
            .feature-card {
              padding: 12px;
            }
            .feature-icon {
              width: 50px;
              height: 50px;
            }
            .feature-text {
              font-size: 1.1rem;
            }
            .game-card {
              max-width: 200px;
            }
            .game-image {
              max-width: 160px;
            }
            .game-title {
              font-size: 15px;
            }
            .top-up-button {
              font-size: 15px;
            }
            .game-container {
              max-width: 450px;
              gap: 1.5rem;
            }
            .counter-box h2 {
              font-size: 4rem;
            }
            .counter-box h2 sup {
              font-size: 2rem;
            }
            .counter-box h5 {
              font-size: 1.5rem;
            }
            .feature-card {
              min-width: 180px;
              min-height: 180px;
              padding: 20px;
            }
            .feature-card img {
              width: 90px;
              height: 90px;
            }
            .feature-card p {
              font-size: 1.5rem;
            }
            .game-center-header img {
              max-width: 600px;
              max-height: 200px;
            }
          }
          @media (max-width: 480px) {
            .features-grid {
              gap: 12px;
            }
            .feature-card {
              padding: 10px;
            }
            .feature-icon {
              width: 40px;
              height: 40px;
            }
            .feature-text {
              font-size: 0.9rem;
            }
            .game-card {
              max-width: 150px;
              padding: 10px;
            }
            .game-image {
              max-width: 120px;
            }
            .game-title {
              font-size: 14px;
              height: 40px;
            }
            .top-up-button {
              font-size: 14px;
              padding: 6px 20px;
              max-width: 120px;
            }
            .game-container {
              max-width: 360px;
              gap: 1rem;
              padding: 1.5rem 0;
            }
            .counter-box h2 {
              font-size: 3.5rem;
            }
            .counter-box h2 sup {
              font-size: 1.75rem;
            }
            .counter-box h5 {
              font-size: 1.25rem;
            }
            .feature-card {
              min-width: 150px;
              min-height: 150px;
              padding: 16px;
            }
            .feature-card img {
              width: 80px;
              height: 80px;
            }
            .feature-card p {
              font-size: 1.25rem;
            }
            .game-center-header img {
              max-width: 400px;
              max-height: 150px;
            }
          }
        `}
      </style>

      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="https://raw.githubusercontent.com/Cheagjihvg/xia-asssets/refs/heads/main/logo-no-background.png"
            alt="Logo"
            style={{ width: '60px', height: '60px', objectFit: 'contain' }}
          />
        </a>
        <div style={{ flex: 1, margin: '0 1rem', maxWidth: '400px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search..."
              style={{
                width: '100%',
                padding: '0.5rem 1rem 0.5rem 2.5rem',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '9999px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                outline: 'none',
                transition: 'all 0.3s',
                color: '#000',
                fontSize: '1rem',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
              }}
              value={form.game}
              onChange={(e) => setForm({ ...form, game: e.target.value })}
            />
            <svg
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '1.25rem',
                height: '1.25rem',
                color: '#6b7280',
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeLinecap="round"
              strokeWidth="2"
            >
              <path d="M15 15l6 6m-11-6a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSocialDropdown(!showSocialDropdown)}
            style={{
              color: '#000',
              padding: '0.5rem',
              transition: 'color 0.3s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#1f2937')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#000')}
          >
            <svg
              style={{ width: '1.5rem', height: '1.5rem' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeLinecap="round"
              strokeWidth="2"
            >
              <path d="M4 6h16M4 12h16m-7 6h7"></path>
            </svg>
          </button>
          {showSocialDropdown && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                marginTop: '0.5rem',
                width: '12rem',
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                zIndex: 50,
              }}
            >
              <ul style={{ padding: '0.5rem 0', listStyle: 'none' }}>
                <li>
                  <a
                    href="https://t.me/Xiast4re"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.5rem 1rem',
                      color: '#1f2937',
                      textDecoration: 'none',
                      transition: 'background-color 0.3s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }}
                    >
                      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path>
                    </svg>
                    Support
                  </a>
                </li>
                <li>
                  <a
                    href="https://t.me/Xiast0re"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.5rem 1rem',
                      color: '#1f2937',
                      textDecoration: 'none',
                      transition: 'background-color 0.3s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }}
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Telegram Channel
                  </a>
                </li>
                <li>
                  <a
                    href="https://facebook.com/yourpage"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.5rem 1rem',
                      color: '#1f2937',
                      textDecoration: 'none',
                      transition: 'background-color 0.3s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }}
                    >
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                    </svg>
                    Facebook
                  </a>
                </li>
              </ul>
            </div>
          )}
        </div>
      </header>

      {isThinking && (
        <div className="flex items-center justify-center py-2" style={{ backgroundColor: '#fad2f9' }}>
          <Loader2 className="w-6 h-6 animate-spin text-white" />
          <span className="ml-2 text-sm text-white">Grok is thinking...</span>
        </div>
      )}

      <div className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          <div className="rounded-2xl shadow-xl overflow-hidden" style={{ backgroundColor: '#fad2f9' }}>
            <BannerSlider banners={storeConfig.banners} />
          </div>
        </div>

        <div className="home-container14">
          <div className="home-txtpopulars">
            <div className="home-container15">
              <svg width="35" height="33" viewBox="0 0 24 24" className="home-icon10">
                <path d="M17.66 11.2c-.23-.3-.51-.56-.77-.82c-.67-.6-1.43-1.03-2.07-1.66C13.33 7.26 13 4.85 13.95 3c-.95.23-1.78.75-2.49 1.32c-2.59 2.08-3.61 5.75-2.39 8.9c.04.1.08.2.08.33c0 .22-.15.42-.35.5c-.23.1-.47.04-.66-.12a.6.6 0 0 1-.14-.17c-1.13-1.43-1.31-3.48-.55-5.12C5.78 10 4.87 12.3 5 14.47c.06.5.12 1 .29 1.5c.14.6.41 1.2.71 1.73c1.08 1.73 2.95 2.97 4.96 3.22c2.14.27 4.43-.12 6.07-1.6c1.83-1.66 2.47-4.32 1.53-6.60l-.13-.26c-.21-.46-.77-1.26-.77-1.26m-3.16 6.3c-.28.24-.74.5-1.1.6c-1.12.4-2.24-.16-2.9-.82c1.19-.28 1.9-1.16 2.11-2.05c.17-.8-.15-1.46-.28-2.23c-.12-.74-.1-1.37.17-2.06c.19.38.39.76.63 1.06c.77 1 1.98 1.44 2.24 2.8c.04.14.06.28.06.43c.03.82-.33 1.72-.93 2.27" fill="currentColor"></path>
              </svg>
              <h1 className="home-text32">Popular</h1>
            </div>
            <div className="home-container16">
              <div onClick={scrollLeft} className="home-back">
                <svg width="18" height="18" viewBox="0 0 20 20" className="home-icon12">
                  <path d="M4 10l9 9l1.4-1.5L7 10l7.4-7.5L13 1z" fill="currentColor"></path>
                </svg>
              </div>
              <div onClick={scrollRight} className="home-next">
                <svg width="18" height="18" viewBox="0 0 20 20" className="home-icon14">
                  <path d="M7 1L5.6 2.5L13 10l-7.4 7.5L7 19l9-9z" fill="currentColor"></path>
                </svg>
              </div>
            </div>
          </div>
          <div className="home-scroll-card">
            <div className="home-card1">
              <a
                href="/game/free-fire"
                className="home-navlink21"
                onClick={(e) => {
                  e.preventDefault();
                  setForm({ ...form, game: 'freefire' });
                  setShowTopUp(true);
                }}
              >
                <div id="discount1" className="home-container18 loaded">
                  <img
                    alt="Free Fire"
                    src="https://play-lh.googleusercontent.com/sKh_B4ZLfu0jzqx9z98b2APe2rxDb8dIW-QqFHyS3cpzDK2Qq8tAbRAz3rXzOFtdAw"
                    loading="lazy"
                    className="home-image21"
                  />
                  <div className="home-container19">
                    <div className="home-container21">
                      <div className="home-container22">
                        <span id="d-name" className="home-text43">
                          Free Fire
                        </span>
                      </div>
                      <div className="home-container23">
                        <span id="d-price" className="home-text44"></span>
                        <span className="home-text45"> </span>
                      </div>
                      <div className="home-container24">
                        <span id="d-description" className="home-text46">
                          Instant
                        </span>
                      </div>
                      <div className="home-container25">
                        <h1 id="d-discount" className="home-text47">
                          TOPUP
                        </h1>
                        <span id="50" className="home-text48"></span>
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            </div>
            <div className="home-card1">
              <a
                href="/game/mlbb"
                className="home-navlink21"
                onClick={(e) => {
                  e.preventDefault();
                  setForm({ ...form, game: 'mlbb' });
                  setShowTopUp(true);
                }}
              >
                <div id="discount1" className="home-container18 loaded">
                  <img
                    alt="Mobile Legends"
                    src="https://res.cloudinary.com/dhztk4abr/image/upload/v1746748734/products/nq9h3azwlgffpt02c82q.png?w=256&q=75"
                    loading="lazy"
                    className="home-image21"
                  />
                  <div className="home-container19">
                    <div className="home-container21">
                      <div className="home-container22">
                        <span id="d-name" className="home-text43">
                          Mobile Legends
                        </span>
                      </div>
                      <div className="home-container23">
                        <span id="d-price" className="home-text44"></span>
                        <span className="home-text45"> </span>
                      </div>
                      <div className="home-container24">
                        <span id="d-description" className="home-text46">
                          Instant (Philippines)
                        </span>
                      </div>
                      <div className="home-container25">
                        <h1 id="d-discount" className="home-text47">
                          TOPUP
                        </h1>
                        <span id="50" className="home-text48"></span>
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Flash Sale Section */}
        <div className="container mx-auto px-4 py-6">
          <div className="rounded-2xl bg-gray-100/50">
            <div className="px-4 pb-3 pt-4">
              <h3 className="flex items-center space-x-4 text-gray-900">
                <div className="text-lg font-semibold uppercase leading-relaxed tracking-wider flex items-center">
                  <Lottie
                    animationData={{ src: 'https://lottie.host/72527c22-6566-4eda-b453-dc61dd77be2b/rt3d8phYjG.json' }}
                    loop
                    autoplay
                    style={{ width: '25px', height: '30px' }}
                  />
                  FLASHSALE
                </div>
                <div className="flex items-center gap-1 text-sm capitalize">
                  <div className="fs-countdown ml-3">
                    <div className="time" id="hours">
                      20
                    </div>
                    <div className="separator">:</div>
                    <div className="time" id="minutes">
                      43
                    </div>
                    <div className="separator">:</div>
                    <div className="time" id="seconds">
                      25
                    </div>
                  </div>
                </div>
              </h3>
              <p className="pl-6 text-xs text-gray-600">Order now! Limited supplies.</p>
            </div>
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden pb-2 pt-1">
              <div className="group flex overflow-hidden p-2 [--gap:1rem] [gap:var(--gap)] flex-row container [--duration:20s]">
                <div
                  data-run-marquee="true"
                  className="flex shrink-0 justify-around [gap:var(--gap)] animate-marquee group-hover:[animation-play-state:paused]"
                >
                  <div className="special-deals">
                    <div id="special_deals" className="list swiper-box marquee-content flex gap-4">
                      {[
                        {
                          href: '/game/mobile-legends',
                          imgSrc: '/assets/thumbnail/mlbb.jpg',
                          title: 'MLBB KH - 86 Diamonds',
                          oldPrice: '$1.50',
                          price: '$1.20',
                          remaining: 995,
                          type: 'Promotion',
                          discount: '$0.30',
                        },
                        {
                          href: '/game/mobile-legends',
                          imgSrc: '/assets/thumbnail/mlbb.jpg',
                          title: 'MLBB KH - 257 Diamonds',
                          oldPrice: '$4.00',
                          price: '$3.59',
                          remaining: 11,
                          type: 'Promotion',
                          discount: '$0.41',
                        },
                        {
                          href: '/game/free-fire',
                          imgSrc: '/assets/thumbnail/freefire.jpg',
                          title: 'Free Fire - 25 Diamonds',
                          oldPrice: '$0.23',
                          price: '$0.10',
                          remaining: 94,
                          type: 'Event',
                          discount: '$0.13',
                        },
                        {
                          href: '/game/free-fire',
                          imgSrc: '/assets/thumbnail/freefire.jpg',
                          title: 'Free Fire - Level Up',
                          oldPrice: '$4.50',
                          price: '$3.99',
                          remaining: 9999,
                          type: 'Discount',
                          discount: '$0.51',
                        },
                      ].map((item, index) => (
                        <a
                          key={index}
                          className="relative w-[265px] cursor-pointer rounded-xl p-4 border border-gray-800/75 bg-gray-800"
                          href={item.href}
                          style={{ outline: 'none' }}
                          onClick={(e) => {
                            e.preventDefault();
                            setForm({ ...form, game: item.href.includes('mobile-legends') ? 'mlbb' : 'freefire' });
                            setShowTopUp(true);
                          }}
                        >
                          <div className="flex flex-row items-center gap-3">
                            <img
                              alt={item.title}
                              loading="lazy"
                              width="48"
                              height="48"
                              decoding="async"
                              className="rounded-lg bg-gray-200"
                              src={item.imgSrc}
                              style={{ color: 'transparent' }}
                            />
                            <div className="flex flex-col space-y-1">
                              <figcaption className="text-sm font-medium text-gray-100">{item.title}</figcaption>
                              <p className="text-xs font-medium text-red-500 line-through">{item.oldPrice}</p>
                              <p className="text-xs font-medium text-blue-500">{item.price}</p>
                              <div className="bar">
                                <div className="progress" style={{ width: `${(item.remaining / 9999) * 100}%` }}></div>
                                <span className="progress-text">Remaining: {item.remaining}</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-gray-100">{item.type}</div>
                          <div className="w-24 absolute aspect-square -top-[9px] -right-[9px] overflow-hidden rounded-sm">
                            <div className="absolute top-0 left-0 bg-blue-100/50 h-2 w-2"></div>
                            <div className="absolute bottom-0 right-0 bg-blue-600/50 h-2 w-2"></div>
                            <div className="absolute block w-square-diagonal py-1 text-center text-xxs font-semibold uppercase bottom-0 right-0 rotate-45 origin-bottom-right shadow-sm bg-blue-500 text-white">
                              SAVE {item.discount}
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

        {showTopUp ? (
          <main className="container mx-auto px-4 py-8">
            <div className="game-center-header">
              <img
                src="https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/Untitled-1%20(1).png"
                alt="Game Center Banner"
                className="w-full h-auto"
                loading="lazy"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/800x300?text=Banner+Not+Found';
                  e.target.className += ' placeholder';
                }}
              />
            </div>
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={() => {
                    setShowTopUp(false);
                    setShowCheckout(false);
                    setValidationResult(null);
                    setForm((prev) => ({ ...prev, nickname: undefined }));
                  }}
                  className="text-white hover:text-gray-300 transition-colors text-sm flex items-center gap-2 px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#fad2f9' }}
                >
                  <ArrowLeft className="w-5 h-5 text-white" /> Back to Games
                </button>
                {(form.userId || form.serverId) && (
                  <button
                    onClick={clearSavedInfo}
                    className="text-white hover:text-gray-300 transition-colors text-sm flex items-center gap-2 px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#fad2f9' }}
                  >
                    <XCircle className="w-5 h-5 text-white" /> Clear Saved Info
                  </button>
                )}
              </div>
            </div>

            <div
              className="main-left rounded-lg p-6"
              onClick={() => setIsMainLeftClicked(!isMainLeftClicked)}
              style={{ backgroundColor: '#fad2f9' }}
            >
              <div className="top-left flex items-start gap-4">
                <div className="img">
                  <img
                    src="https://raw.githubusercontent.com/Cheagjihvg/xia-asssets/refs/heads/main/logo-no-background.png"
                    alt="ZT-Topup Logo"
                    className="w-16 h-16 rounded-lg"
                  />
                </div>
                <div className="content-bloc">
                  <h1 className="title text-lg font-semibold text-white">
                    {form.game === 'mlbb' ? 'Mobile Legends' : 'Free Fire'}
                  </h1>
                  <ul className="list flex gap-2 mt-2">
                    <li className="arrow-bloc">
                      <div
                        className="arrow-right text-xs font-bold px-2 py-1 rounded text-white"
                        style={{ backgroundColor: '#fad2f9' }}
                      >
                        <div className="sub">Instant Delivery</div>
                      </div>
                    </li>
                    <li className="arrow-bloc">
                      <div
                        className="arrow-right text-xs font-bold px-2 py-1 rounded text-white"
                        style={{ backgroundColor: '#fad2f9' }}
                      >
                        <div className="sub">Official Distributor</div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="ruler-bloc mt-4">
                <hr className="ruler border-t border-gray-600" />
              </div>
            </div>

            <div className="p-6 rounded-lg">
              <div className="inner-content user-info-section">
                <div className="inner-header">
                  <div className="section-number">01</div>
                  <h3 className="text-base font-semibold text-white khmer-font">បញ្ចូលព័ត៌មានរបស់អ្នក</h3>
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
                        required
                        value={form.userId}
                        onChange={(e) => {
                          const value = e.target.value.trim().replace(/[^0-9]/g, '');
                          setForm((prev) => ({ ...prev, userId: value, nickname: undefined }));
                          setValidationResult(null);
                          setFormErrors((prev) => ({ ...prev, userId: undefined }));
                        }}
                      />
                      {formErrors.userId && <p className="text-red-400 text-xs mt-1">{formErrors.userId}</p>}
                    </div>
                    {form.game === 'mlbb' && (
                      <div>
                        <input
                          type="text"
                          name="zoneId"
                          className="input-field"
                          placeholder="Zone ID"
                          required
                          value={form.serverId}
                          onChange={(e) => {
                            const value = e.target.value.trim().replace(/[^0-9]/g, '');
                            setForm((prev) => ({ ...prev, serverId: value, nickname: undefined }));
                            setValidationResult(null);
                            setFormErrors((prev) => ({ ...prev, serverId: undefined }));
                          }}
                        />
                        {formErrors.serverId && <p className="text-red-400 text-xs mt-1">{formErrors.serverId}</p>}
                      </div>
                    )}
                  </div>
                  {form.game === 'mlbb' && (
                    <div className="flex justify-center items-center gap-2">
                      <button
                        type="button"
                        onClick={validateAccount}
                        disabled={validating || !form.userId || !form.serverId}
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
                      {validationResult?.success && (
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Account found: {form.nickname}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {form.game === 'mlbb' && (
                    <div className="mt-4 text-white text-xs khmer-font">
                      ដើម្បីឃើញ UserID សូមចូលទៅក្នុងហ្គេម ហើយចុចរូបភាព Avatar នៅខាងឆ្វេងអេក្រង់កញ្ចក់ ហើយចុចទៅកាន់ "Check ID" ពេលនោះ User ID នឹងបង្ហាញឲ្យឃើញ បន្ទាប់មកសូមយក User ID នោះមកបំពេញ។ ឧទាហរណ៍: User ID: 123456789, Zone ID: 1234។
                    </div>
                  )}
                </form>
              </div>
            </div>

            <div className="p-6 rounded-lg">
              <div className="inner-content products-section">
                <div className="inner-header">
                  <div className="section-number">02</div>
                  <h3 className="text-lg font-semibold text-white khmer-font">ផលិតផល Diamond</h3>
                </div>
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="w-12 h-12 animate-spin text-white" />
                    <span className="ml-2 text-white">Loading products...</span>
                  </div>
                ) : (
                  <ProductList
                    products={products.length > 0 ? products : hardcodedProducts}
                    onSelect={handleProductSelect}
                    selectedProduct={form.product}
                    game={form.game}
                  />
                )}
              </div>
            </div>

            <div className="p-6 rounded-lg">
              <div className="inner-content payment-section">
                <div className="inner-header">
                  <div className="section-number">03</div>
                  <h3 className="text-base font-semibold text-white khmer-font">វិធីបង់ប្រាក់</h3>
                </div>
                <div className={`payment-box ${isPaymentSelected ? 'selected' : ''}`} onClick={handlePaymentClick}>
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
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  <input
                    type="checkbox"
                    id="accept"
                    className="w-5 h-5 text-white border-white rounded focus:ring-white"
                    checked
                    disabled
                  />
                  <label htmlFor="accept" className="text-white text-sm khmer-font">
                    ខ្ញុំយល់ព្រមតាម <a href="/term-and-policy" className="text-white hover:underline">លក្ខខណ្ឌ</a>
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
                      <button type="submit" disabled={!form.product || paymentCooldown > 0} className="mlbb-button2 button">
                        <svg width="24" height="24" viewBox="0 0 24 24" className="mlbb-icon64">
                          <g fill="none" fillRule="evenodd">
                            <path d="m12.calendar_month 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.10-.01z"></path>
                            <path
                              d="M5 6.5a.5.5 0 1 1 .5-.5H16a1 1 0 1 0 0-2H5.5A2.5 2.5 0 0 0 3 6.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5.5a.5.5 0 0 1-.5-.5M15.5 15a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3"
                              fill="#0a86aa"
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
          <main className="container mx-auto px-4 py-6">
            <div className="flex flex-col items-center">
              <div className="game-container">
                <div
                  className="game-card"
                  onClick={() => {
                    setForm({ ...form, game: 'mlbb' });
                    setShowTopUp(true);
                  }}
                >
                  <div className="flex flex-col items-center">
                    <div className="aspect-square h-[100px] md:h-auto">
                      <img
                        src="https://res.cloudinary.com/dhztk4abr/image/upload/v1746748734/products/nq9h3azwlgffpt02c82q.png"
                        alt="Mobile Legends KH"
                        className="game-image"
                        srcSet="https://play-lh.googleusercontent.com/sKh_B4ZLfu0jzqx9z98b2APe2rxDb8dIW-QqFHyS3cpzDK2Qq8tAbRAz3rXzOFtdAw 1x, https://res.cloudinary.com/dhztk4abr/image/upload/v1746748734/products/nq9h3azwlgffpt02c82q.png?w=384&q=75 2x"
                      />
                    </div>
                    <div className="game-title">Mobile Legends KH</div>
                    <button className="top-up-button">Top - Up</button>
                  </div>
                </div>
                <div
                  className="game-card"
                  onClick={() => {
                    setForm({ ...form, game: 'freefire' });
                    setShowTopUp(true);
                  }}
                >
                  <div className="flex flex-col items-center">
                    <div className="aspect-square h-[100px] md:h-auto">
                      <img
                        src="https://daddy-cms.minttopup.xyz/uploads/free_fire_logo_7b069d4084.jpg"
                        alt="Free Fire"
                        className="game-image"
                        srcSet="https://daddy-cms.minttopup.xyz/uploads/free_fire_logo_7b069d4084.jpg?w=256&q=75 1x, https://daddy-cms.minttopup.xyz/uploads/free_fire_logo_7b069d4084.jpg?w=384&q=75 2x"
                      />
                    </div>
                    <div className="game-title">Free Fire</div>
                    <button className="top-up-button">Top - Up</button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        )}

<section className="features-section py-6" style={{ backgroundColor: '#fad2f9' }}>
          <div className="choose-container max-w-1000 mx-auto px-4">
            <div className="choose-box bg-white rounded-lg p-5 shadow">
              <h2 className="choose-title text-2xl font-bold mb-4 khmer-font">ហេតុអ្វីជ្រើសរើសយើង</h2>
              <div className="choose-content flex items-start gap-4 mb-5">
                <img
                  src="https://raw.githubusercontent.com/Mengly08/xnxx/refs/heads/main/fanny_the_aspirant_full_4k_png_by_newjer53_df0f1hv-fullview.png"
                  alt="Lightning Icon"
                  className="choose-icon w-20 h-40 object-contain"
                />
                <div className="choose-text">
                  <h5 className="text-lg font-semibold khmer-font">Best Topup</h5>
                  <p className="text-sm khmer-font">
                    សួស្តី! Xia Topup ជាសេវាកម្មបញ្ចូលទឹកប្រាក់ទូរស័ព្ទលឿន និងងាយស្រួលបំផុត! រហ័សភ្លាមៗ: បញ្ចូលទឹកប្រាក់ក្នុងរយៈពេលប៉ុន្មានវិនាទី! 
                    សុវត្ថិភាពខ្ពស់: ទិន្នន័យ និងការទូទាត់របស់អ្នកត្រូវបានការពារយ៉ាងល្អ។ 
                    គ្រប់បណ្តាញ: គាំទ្រ KHQR PAYMENT និងអ្នកផ្សេងទៀត។ 
                    ការផ្តល់ជូនពិសេស: ទទួលបានប្រាក់បន្ថែមរាល់ការបញ្ចូល! 
                    ទាញយក WEBSITE Xia Topup ឬចូលគេហទំព័រឥឡូវនេះ ដើម្បីទំនាក់ទំនងគ្មានឈប់! 
                    Xia Topup – ភាពងាយស្រួលនៅចុងម្រាមដៃអ្នក!
                  </p>
                </div>
              </div>
              <a href="https://t.me/xiast0re">
                <button className="choose-button">
                  ព័ត៌មានបន្ថែម
                  <img
                    src="httt"
                    alt="Arrow"
                    className="w-4 h-4"
                  />
                </button>
              </a>
            </div>
          </div>
        </section>

<section className="why-choose-us-section text-white py-6" style={{ backgroundColor: '#fad2f9' }}>
  <style>{`
    .why-choose-us-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 0 10px;
    }
    .why-choose-us-box {
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(8px);
      border-radius: 10px;
      padding: 12px;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }
    .why-choose-us-box:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    }
    .why-choose-us-title {
      font-size: 1.5rem;
      font-weight: 800;
      margin-bottom: 12px;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      font-family: 'Kh Ang Chittbous', sans-serif;
      line-height: 1.2;
      color: #fff;
    }
    .why-choose-us-content {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .why-choose-us-icon {
      width: 72px;
      height: 72px;
      object-fit: contain;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
      transition: transform 0.3s ease;
    }
    .why-choose-us-content:hover .why-choose-us-icon {
      transform: scale(1.05);
    }
    .why-choose-us-text h5 {
      font-size: 1rem;
      font-weight: 700;
      margin-bottom: 6px;
      font-family: 'Kh Ang Chittbous', sans-serif;
      color: #fff;
    }
    .why-choose-us-text p {
      font-size: 0.75rem;
      line-height: 1.4;
      font-family: 'Kh Ang Chittbous', sans-serif;
      color: rgba(255, 255, 255, 0.95);
    }
    .why-choose-us-button {
      display: inline-flex;
      align-items: center;
      background: linear-gradient(90deg, #ff4da6, #ff1a8c);
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      transition: background 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }
    .why-choose-us-button:hover {
      background: linear-gradient(90deg, #ff1a8c, #ff4da6);
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    }
    .why-choose-us-button img {
      width: 14px;
      height: 14px;
      margin-left: 5px;
      filter: brightness(0) invert(1);
    }
    @media (max-width: 768px) {
      .why-choose-us-container {
        max-width: 600px;
      }
      .why-choose-us-title {
        font-size: 1.25rem;
      }
      .why-choose-us-box {
        padding: 10px;
      }
      .why-choose-us-content {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .why-choose-us-icon {
        width: 64px;
        height: 64px;
      }
      .why-choose-us-text h5 {
        font-size: 0.9rem;
      }
      .why-choose-us-text p {
        font-size: 0.7rem;
      }
      .why-choose-us-button {
        padding: 5px 10px;
        font-size: 0.75rem;
      }
    }
    @media (max-width: 480px) {
      .why-choose-us-container {
        max-width: 400px;
      }
      .why-choose-us-title {
        font-size: 1rem;
      }
      .why-choose-us-box {
        padding: 8px;
      }
      .why-choose-us-icon {
        width: 56px;
        height: 56px;
      }
      .why-choose-us-text h5 {
        font-size: 0.85rem;
      }
      .why-choose-us-text p {
        font-size: 0.65rem;
      }
      .why-choose-us-button {
        padding: 4px 8px;
        font-size: 0.7rem;
      }
    }
  `}</style>
  <div className="why-choose-us-container">
    <div className="row flex flex-wrap items-center -mx-2">
      <div className="col-md-8 col-lg-6 px-2 mx-auto">
        <div className="why-choose-us-box" data-aos="slide-left" data-aos-duration="500" data-aos-anchor-placement="center-bottom">
          <h2 className="why-choose-us-title">ហេតុអ្វី XIA Topup ជាជម្រើសល្អបំផុត?</h2>
          <div className="why-choose-us-content">
            <img
              src="https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG"
              alt="Diamond Icon"
              className="why-choose-us-icon"
              loading="lazy"
            />
            <div className="why-choose-us-text">
              <h5>សេវាកម្មគួរឱ្យទុកចិត្ត</h5>
              <p>
                XIA Topup ផ្តល់ជូននូវប្រតិបត្តិការបញ្ចូលប្រាក់រហ័ស ការទូទាត់ប្រកបដោយសុវត្ថិភាព និងការគាំទ្រអតិថិជន 24/7។ យើងធានានូវបទពិសោធន៍ហ្គេមដ៏រលូនជាមួយនឹងតម្លៃសមរម្យ និងសេវាកម្មដែលអាចទុកចិត្តបានសម្រាប់អ្នកលេងគ្រប់រូប។
              </p>
            </div>
          </div>
          <a href="https://xiast0re.com/">
            <button className="why-choose-us-button">
              ស្វែងយល់បន្ថែម
              <img
                src="https://xiast0re.com/"
                alt="Arrow"
                className="w-4 h-4"
              />
            </button>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>

<section className="features-section py-6" style={{ backgroundColor: '#fad2f9' }}>
  <style>{`
    .features-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 0 10px;
    }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin: 0 auto;
    }
    .feature-card {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      border-radius: 10px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.25);
    }
    .feature-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
      background: rgba(255, 255, 255, 0.2);
    }
    .feature-icon {
      width: 64px;
      height: 64px;
      object-fit: contain;
      margin-bottom: 8px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
      transition: transform 0.3s ease;
    }
    .feature-card:hover .feature-icon {
      transform: scale(1.05);
    }
    .feature-text {
      font-size: 0.9rem;
      font-weight: 700;
      color: #fff;
      font-family: 'Kh Ang Chittbous', sans-serif;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    @media (max-width: 768px) {
      .features-container {
        max-width: 600px;
      }
      .features-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }
      .feature-card {
        padding: 8px;
      }
      .feature-icon {
        width: 56px;
        height: 56px;
      }
      .feature-text {
        font-size: 0.85rem;
      }
    }
    @media (max-width: 480px) {
      .features-container {
        max-width: 400px;
      }
      .features-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
      }
      .feature-card {
        padding: 6px;
      }
      .feature-icon {
        width: 48px;
        height: 48px;
      }
      .feature-text {
        font-size: 0.8rem;
      }
    }
  `}</style>
  <div className="features-container">
    <div className="features-grid">
      <div
        className="feature-card"
        data-aos="fade-right"
        data-aos-duration="500"
      >
        <img
          src="https://raw.githubusercontent.com/Mengly08/xnxx/refs/heads/main/pngtree-shield-with-a-check-mark-safe-and-protect-logo-icon-png-image_1870456-removebg-preview.png"
          alt="Secured Icon"
          className="feature-icon"
          loading="lazy"
        />
        <p className="feature-text">សុវត្ថិភាព</p>
      </div>
      <div
        className="feature-card"
        data-aos="fade-left"
        data-aos-duration="500"
        data-aos-delay="100"
      >
        <img
          src="https://raw.githubusercontent.com/Mengly08/xnxx/refs/heads/main/photo_2025-05-31_12-30-54-removebg-preview.png"
          alt="Fast Top-Up Icon"
          className="feature-icon"
          loading="lazy"
        />
        <p className="feature-text">បញ្ចូលពេជ្រលឿន</p>
      </div>
    </div>
  </div>
</section>



        <div>
          <div style={{ marginBottom: '0px' }}>
            <img
              src="https://raw.githubusercontent.com/Mengly08/xnxx/refs/heads/main/Untitled%20design.png"
              alt="Top Footer Image"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>

          <footer
            className="footer-section text-pink-500 py-6"
            style={{ backgroundColor: 'white' }}
          >
            <style>{`
              .footer-text {
                color: #ec4899;
              }
              .footer-text a {
                color: #ec4899;
                text-decoration: none;
              }
              .footer-text a:hover {
                color: #db2777;
              }
            `}</style>
            <div className="container mx-auto px-4">
              <div className="row flex flex-wrap -mx-4">
                <div className="col-md-6 col-lg-3 px-4">
                  <div className="footer-box">
                    <a className="navbar-brand" href="https://xiast0re.com">
                      <img
                        className="img-fluid w-32"
                        src="https://raw.githubusercontent.com/Mengly08/xnxx/refs/heads/main/photo_2025-05-31_12-30-54-removebg-preview.png"
                        alt="XIA Shop Logo"
                      />
                    </a>
                    <p className="max-w-[250px] mt-4 footer-text">
                      មានសំណួរមែនទេ ទំនាក់ទំនងមកទីនេះ 
                     </p>
            <ul className="mt-4 space-y-2">
              <li className="flex items-center">
                <img
                  src="https://xiast0re.com"
                  alt="call"
                  className="w-5 h-5 mr-2"
                />
                <span className="footer-text">+855 885077708 </span>
              </li>
              <li className="flex items-center">
                <img
                  src="https://xiast0re.com"
                  alt="email"
                  className="w-5 h-5 mr-2"
                />
                <span className="footer-text">xiast0re.com</span>
              </li>
              <li className="flex items-center">
                <img
                  src="https://xiast0re.com"
                  alt="address"
                  className="w-5 h-5 mr-2"
                />
                <span className="footer-text">ភ្នំពេញ</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="col-md-6 col-lg-3 px-4 mt-6 md:mt-0">
          <div className="footer-box">
            <h5 className="font-weight-bold text-lg footer-text" style={{ fontWeight: 'bolder' }}>
              ដាក់រហ័ស
            </h5>
            <ul className="mt-4 space-y-2">
              <li>
                <a href="https://xiast0re.com" className="footer-text">
                  ទំព័រដើម
                </a>
              </li>
              <li>
                <a href="https://xiast0re.com" className="footer-text">
                  អំពី
                </a>
              </li>
              <li>
                <a href="https://xiast0re.com" className="footer-text">
                  ប្លុក
                </a>
              </li>
              <li>
                <a href="https://t.me/XiaSt0re" className="footer-text">
                  ទំនាក់ទំនង
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="col-md-6 col-lg-3 px-4 mt-6 md:mt-0">
          <div className="footer-box">
            <h5 className="font-weight-bold text-lg footer-text custom--h5">
              ពន្ទុ
            </h5>
            <ul className="mt-4 space-y-2">
              <li>
                <a href="https://xiast0re.com" className="footer-text">
                  សំណួរពី website
                </a>
              </li>
              <li>
                <a
                  href="https://xiast0re.com"
                  className="footer-text"
                >
                  លក្ខខណ្ឌ
                </a>
              </li>
              <li>
                <a
                  href="https://xiast0re.com"
                  className="footer-text"
                >
                  គោលការណ៍
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="col-md-6 col-lg-3 px-4 mt-6 md:mt-0">
          <div className="footer-box">
            <h5 className="font-weight-bold text-lg footer-text custom--h5">ជាវព៖ឹ្តបត័៌មាន</h5>
            <form action="https://xiast0re.com" method="post" className="mt-4">
              <div className="input-group mb-3">
                <input
                  type="email"
                  name="email"
                  className="form-control bg-gray-200 text-black border-gray-300 rounded-l-md"
                  placeholder="បញ្ៃអ៊ីមៃល"
                  aria-label="Email"
                  aria-describedby="basic-addon"
                />
                <span className="input-group-text bg-gray-600 text-white border-none rounded-r-md">
                  <button type="submit">
                    <img
                      src="https://raw.githubusercontent.com/Cheagjihvg/xia-asssets/refs/heads/main/logo-no-background.png"
                      alt="Send"
                      className="w-5 h-5"
                    />
                  </button>
                </span>
              </div>
            </form>
            <div className="social-links mt-4 flex space-x-4">
              <a
                href="https://www.facebook.com/profile.php?id=61576472652507"
                title="Facebook"
                className="footer-text"
              >
                <i className="fab fa-facebook-f" aria-hidden="true"></i>
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61576472652507"
                title="YouTube"
                className="footer-text"
              >
                <i className="fab fa-youtube" aria-hidden="true"></i>
              </a>
              <a href="https://t.me/Xiast4re" title="Telegram" className="footer-text">
                <i className="fab fa-telegram" aria-hidden="true"></i>
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61576472652507"
                title="TikTok"
                className="footer-text"
              >
                <i className="fab fa-tiktok" aria-hidden="true"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="row mt-4 text-end">
        <div className="col-12">
          <p className="footer-text">
            We accept: {' '}
            <img
              src="https://raw.githubusercontent.com/Cheagjihvg/xia-asssets/refs/heads/main/logo-no-background.png"
              alt="KHQR"
              style={{ height: '24px' }}
            />
          </p>
        </div>
      </div>
      <div className="footer-bottom mt-4">
        <div className="row">
          <div className="col-md-6 col-12">
            <p className="copyright text-sm footer-text">
              ©2025 {' '}
              <a href="https://xiast0re.com/" className="footer-text">
                {' '}https://xiast0re.com/
              </a>
              មានទួកឯកសារនិងសិទអាជីពកម្ម
            </p>
          </div>
          <div className="col-md-6 col-12 text-end">
            <a href="https://xiast0re.com/" className="footer-text">
              Khmer
            </a>
          </div>
        </div>
      </div>
    </div>
  </footer>
</div>


        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => window.open(storeConfig.supportUrl, '_blank')}
            className="flex items-center justify-center w-16 h-16 bg-white text-black rounded-full shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gray-300/30 rounded-full animate-ping opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              <img
                src="https://raw.githubusercontent.com/Mengly08/xnxx/refs/heads/main/photo_2025-05-31_12-30-54-removebg-preview.png"
                alt="Support Logo"
                className="w-16 h-auto rounded-full object-cover"
              />
            </div>
          </button>
        </div>

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
          <PopupBanner image={storeConfig.popupBanner.image} onClose={() => setShowPopupBanner(false)} />
        )}
      </div>
    </div>
  );
};

export default App;
