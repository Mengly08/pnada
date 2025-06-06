import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Check, Loader2, AlertCircle, Timer, CheckCircle } from 'lucide-react';
import { TopUpForm } from '../types';
import axios from 'axios';
import { getConfig, getPaymentConfig } from '../lib/config';
import { supabase } from '../lib/supabase';

interface Props {
  form: TopUpForm;
  orderFormat: string;
  onClose: () => void;
  discountPercent?: number;
}

export function PaymentModal({ form, orderFormat, onClose, discountPercent = 0 }: Props) {
  const config = getConfig();
  const paymentConfig = getPaymentConfig();
  
  const [status, setStatus] = useState<'pending' | 'success' | 'checking' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [md5Hash, setMd5Hash] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasSentToTelegram, setHasSentToTelegram] = useState(false);
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [transactionId, setTransactionId] = useState<string>('');
  const [nextCheckTime, setNextCheckTime] = useState(5);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [lastQrGeneration, setLastQrGeneration] = useState<number>(0);
  const [qrCooldown, setQrCooldown] = useState(0);

  const MAX_VERIFICATION_ATTEMPTS = 12;
  const VERIFICATION_TIMEOUT = 60000; // 60 seconds
  const QR_COOLDOWN_PERIOD = 180; // 3 minutes in seconds
  const CHECK_INTERVAL = 5000; // 5 seconds between checks

  const verificationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const verificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const productName = useMemo(() => 
    form.product?.diamonds ? `${form.product.diamonds} diamond` : form.product?.name || '',
  [form.product]);

  const finalAmount = useMemo(() => {
    if (!form.product?.price) return 0;
    const discount = (form.product.price * discountPercent) / 100;
    const amount = form.product.price - discount;
    return Math.round(amount * 100) / 100;
  }, [form.product?.price, discountPercent]);

  const cleanup = useCallback(() => {
    if (verificationIntervalRef.current) {
      clearInterval(verificationIntervalRef.current);
      verificationIntervalRef.current = null;
    }
    if (qrTimeoutRef.current) {
      clearTimeout(qrTimeoutRef.current);
      qrTimeoutRef.current = null;
    }
    if (checkCountdownRef.current) {
      clearInterval(checkCountdownRef.current);
      checkCountdownRef.current = null;
    }
    if (verificationTimeoutRef.current) {
      clearTimeout(verificationTimeoutRef.current);
      verificationTimeoutRef.current = null;
    }
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startCheckCountdown = () => {
    setNextCheckTime(5);
    const interval = setInterval(() => {
      setNextCheckTime(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);
    checkCountdownRef.current = interval;
  };

  const startQrCooldown = () => {
    setQrCooldown(QR_COOLDOWN_PERIOD);
    const interval = setInterval(() => {
      setQrCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    cooldownIntervalRef.current = interval;
  };

  const sendToTelegram = async () => {
    if (hasSentToTelegram) return;
    
    try {
      const txId = `tb${Math.floor(100000 + Math.random() * 900000)}`;
      setTransactionId(txId);

      const { data: tokenResult, error: tokenError } = await supabase
        .rpc('create_payment_token', {
          order_info: {
            transactionId: txId,
            game: form.game,
            amount: finalAmount,
            item: form.product?.name,
            userId: form.userId,
            serverId: form.game === 'freefire' ? '0' : form.serverId,
            orderId: Date.now().toString(),
            orderDate: new Date().toLocaleString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }),
            mainMessage: `${form.userId} ${form.game === 'freefire' ? '0' : form.serverId} ${form.product?.code || form.product?.diamonds || form.product?.name}`,
            orderMessage: `Top up successful✅\n\n` +
              `-Transaction: ${txId}\n` +
              `-Game: ${form.game === 'mlbb' ? 'Mobile Legends' : 'Free Fire'}\n` +
              `-Amount: ${finalAmount} $\n` +
              `-Item: ${form.product?.name}\n` +
              `-User ID: ${form.userId}\n` +
              `-Server ID: ${form.game === 'freefire' ? '0' : form.serverId}\n` +
              `-Order ID: S${Date.now()}\n` +
              `-Order Date: ${new Date().toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              })}`
          }
        });

      if (tokenError || !tokenResult) {
        throw new Error('Failed to generate payment token');
      }

      const response = await axios.post('/api/telegram', {}, {
        headers: {
          'Authorization': `Bearer ${tokenResult}`
        }
      });

      if (!response.data.success) {
        throw new Error('Failed to send message to Telegram');
      }
      
      setHasSentToTelegram(true);
    } catch (error) {
      console.error('Error sending to Telegram:', error);
      setErrorMessage('Failed to send order confirmation. Please try again.');
      setStatus('error');
    }
  };

  const verifyPayment = useCallback(async () => {
    if (!md5Hash || isProcessing || status === 'success') return false;

    setIsProcessing(true);
    try {
      const response = await axios.post('/api/verify-payment', { md5: md5Hash });
      
      // Payment successful
      if (response.data?.responseCode === 0) {
        cleanup();

        if (status !== 'success') {
          setStatus('success');
          setShowSuccessAnimation(true);

          // Double verify payment before sending to Telegram
          const secondVerification = await axios.post('/api/verify-payment', { md5: md5Hash });
          if (secondVerification.data?.responseCode === 0 && !hasSentToTelegram) {
            await sendToTelegram();
          }
        }
        return true;
      }
      
      // Transaction not found - continue checking
      if (response.data?.responseCode === 1) {
        return false;
      }

      // Other error codes - show error
      cleanup();
      setStatus('error');
      setErrorMessage('Payment verification failed. Please try again or contact support.');
      return false;

    } catch (error) {
      console.error('Payment verification failed:', error);
      cleanup();
      setStatus('error');
      setErrorMessage('Payment verification failed. Please try again or contact support.');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [md5Hash, cleanup, sendToTelegram, isProcessing, status, hasSentToTelegram]);

  const startRandomInterval = () => {
    startCheckCountdown();
    verificationIntervalRef.current = setTimeout(async () => {
      if (!isProcessing) {
        setCheckCount(prev => prev + 1);
        await verifyPayment();
      }
      startRandomInterval();
    }, CHECK_INTERVAL);

    // Set verification timeout
    verificationTimeoutRef.current = setTimeout(() => {
      cleanup();
      setAutoCheckEnabled(false);
      setStatus('error');
      setErrorMessage('Payment verification timeout. Please try again or contact support if payment was made.');
    }, VERIFICATION_TIMEOUT);
  };

  useEffect(() => {
    if (md5Hash && !verificationIntervalRef.current) {
      setAutoCheckEnabled(true);
      setVerificationAttempts(0);

      const firstCheckTimeout = setTimeout(() => {
        verifyPayment();
        startRandomInterval();
      }, 7000);

      qrTimeoutRef.current = setTimeout(() => {
        cleanup();
        setAutoCheckEnabled(false);
        setStatus('error');
        setErrorMessage('QR code has expired. Please try again.');
      }, 300000);

      return () => {
        clearTimeout(firstCheckTimeout);
        clearTimeout(verificationIntervalRef.current);
        clearTimeout(qrTimeoutRef.current);
        verificationIntervalRef.current = null;
        qrTimeoutRef.current = null;
      };
    }
  }, [md5Hash, isProcessing, verifyPayment, cleanup]);

  useEffect(() => {
    const generateKHQR = async () => {
      if (isProcessing || finalAmount < 0.01 || qrCode || qrCooldown > 0) return;
      
      const now = Date.now();
      if (now - lastQrGeneration < QR_COOLDOWN_PERIOD * 1000) {
        const remainingCooldown = Math.ceil((QR_COOLDOWN_PERIOD * 1000 - (now - lastQrGeneration)) / 1000);
        setQrCooldown(remainingCooldown);
        startQrCooldown();
        return;
      }
      
      setStatus('checking');
      setErrorMessage('');
      setIsProcessing(true);
      
      try {
        if (finalAmount < 0.01) {
          throw new Error('Amount must be at least 0.01 USD. Please remove the promo code for small purchases.');
        }

        const payload = {    
          bakongAccountID: paymentConfig.khqr.accountId,
          accName: paymentConfig.khqr.accountName,
          accountInformation: paymentConfig.khqr.accountInformation,
          currency: paymentConfig.khqr.currency,
          amount: finalAmount,
          address: paymentConfig.khqr.address
        };

        const response = await axios.post('/api/khqr', payload);

        if (response.status === 200 || response.status === 201) {
          const { success, qrImage, md5 } = response.data;
          if (success && qrImage && md5) {
            setQrCode(qrImage);
            setMd5Hash(md5);
            setLastQrGeneration(now);
          } else {
            throw new Error('Invalid response from QR code generator');
          }
        } else {
          throw new Error(`Server returned status ${response.status}`);
        }
      } catch (error) {
        let errorMessage = 'Failed to generate QR code';
        if (axios.isAxiosError(error)) {
          errorMessage = error.response?.data?.message || 'Network error. Please try again.';
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        setStatus('error');
        setErrorMessage(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    };

    generateKHQR();
  }, [finalAmount, isProcessing, lastQrGeneration, paymentConfig.khqr, qrCode, qrCooldown]);

  const handleClose = useCallback(() => {
    cleanup();
    onClose();
  }, [cleanup, onClose]);

  const handleContinueShopping = useCallback(() => {
    onClose();
  }, [onClose]);

  const successReceipt = useMemo(() => (
    <div className="bg-white rounded-lg p-4 shadow-lg space-y-3">
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-xl font-bold text-green-700">ការទិញរបស់អ្នកត្រូវបានជោគជ័យ</h3>
      </div>
      
      <div className="space-y-2 text-gray-700">
        <div className="border-b border-gray-200 pb-2">
          <h4 className="font-semibold">Product</h4>
          <p>{productName}</p>
        </div>
        
        <div className="border-b border-gray-200 pb-2">
          <h4 className="font-semibold">USER ID</h4>
          <p>{form.userId}</p>
        </div>
        
        {form.game === 'mlbb' && (
          <div className="border-b border-gray-200 pb-2">
            <h4 className="font-semibold">SERVER ID</h4>
            <p>{form.serverId}</p>
          </div>
        )}
        
        {form.game === 'freefire' && (
          <div className="border-b border-gray-200 pb-2">
            <h4 className="font-semibold">SERVER ID</h4>
            <p>0</p>
          </div>
        )}
        
        {form.nickname && (
          <div className="border-b border-gray-200 pb-2">
            <h4 className="font-semibold">NICKNAME</h4>
            <p>{form.nickname}</p>
          </div>
        )}
        
        <div className="border-b border-gray-200 pb-2">
          <h4 className="font-semibold">PAYMENT</h4>
          <p>KHQR</p>
        </div>
        
        <div className="border-b border-gray-200 pb-2">
          <h4 className="font-semibold">PRICE</h4>
          <p>{finalAmount.toFixed(2)} USD</p>
        </div>
        
        <div className="border-b border-gray-200 pb-2">
          <h4 className="font-semibold">TRANSACTION ID</h4>
          <p>{transactionId}</p>
        </div>
      </div>
      
      <div className="text-center text-sm text-gray-500 pt-2">
        <p>សូមថតវិក័យបត្រទុកដើម្បីផ្ទៀងផ្ទាត់</p>
      </div>
      
      <button
        onClick={handleContinueShopping}
        className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
      >
        ទិញបន្តទៀត
      </button>
    </div>
  ), [form.userId, form.serverId, form.nickname, form.game, productName, finalAmount, transactionId, handleContinueShopping]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div 
        className="bg-gradient-to-br from-purple-900 to-pink-900 rounded-2xl p-4 max-w-md w-full relative shadow-2xl border border-white/10 transform transition-all duration-300 will-change-transform max-h-[90vh] overflow-y-auto"
        style={{
          backgroundImage: `url("${config.backgroundImageUrl}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: showSuccessAnimation ? 'scale(1.05)' : 'scale(1)'
        }}
      >
        <div className="absolute inset-0 bg-black/50 rounded-2xl backdrop-blur-sm" />
        
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-white/60 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10 space-y-3">
          {status === 'success' ? (
            successReceipt
          ) : (
            <div className="bg-white rounded-lg p-3 shadow-lg space-y-2">
              <div className="flex items-center gap-2">
                <img 
                  src="https://play-lh.googleusercontent.com/ABNDYwddbqTFpqp809iNq3r9LjrE2qTZ8xFqWmc-iLfHe2vyPAPwZrN_4S1QCFaLDYE=w240-h480-rw"
                  alt="KHQR Logo"
                  className="w-8 h-8"
                />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-sm">Scan with Bakong</h4>
                  <p className="text-xs text-gray-500">QR code expires in 5 minutes</p>
                </div>
              </div>
              
              {qrCode ? (
                <img 
                  src={qrCode} 
                  alt="KHQR Code" 
                  className="w-full max-w-[180px] mx-auto"
                  loading="lazy"
                />
              ) : qrCooldown > 0 ? (
                <div className="text-center py-4">
                  <Timer className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm text-gray-600">Please wait {qrCooldown}s before generating a new QR code</p>
                </div>
              ) : (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              )}
          
              <p className="text-center text-sm font-medium text-gray-700">
                🔄 <span className="text-red-500">សូមត្រឡប់មកវិញបន្ទាប់ពីបង់ប្រាក់, ដើម្បីរង់ចាំការពិនិត្យការបង់ប្រាក់</span> 🔄
              </p>
          
              {autoCheckEnabled && (
                <div className="text-xs text-center text-gray-500">
                  <div className="flex items-center justify-center gap-1">
                    <Timer className="w-3 h-3 animate-pulse" />
                    <span>Next check in {nextCheckTime}s (Check #{checkCount})</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-red-200 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
