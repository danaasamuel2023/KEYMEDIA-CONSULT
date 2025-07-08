// pages/wallet/deposit.js
'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import Link from 'next/link';
import { FaCreditCard, FaWallet, FaHistory, FaArrowLeft } from 'react-icons/fa';

// Amount options for quick selection
const AMOUNT_OPTIONS = [10, 20, 50, 100, 200, 500];

export default function Deposit() {
  const router = useRouter();
  
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // Check for dark mode preference
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
    
    // Listen for changes in color scheme preference
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleDarkModeChange = (e) => setDarkMode(e.matches);
    darkModeMediaQuery.addEventListener('change', handleDarkModeChange);
    
    return () => {
      darkModeMediaQuery.removeEventListener('change', handleDarkModeChange);
    };
  }, []);
  
  // Check authentication status using localStorage
  useEffect(() => {
    const checkAuth = () => {
      const storedToken = localStorage.getItem('igettoken');
      const storedUserData = localStorage.getItem('userData');
      
      if (storedToken && storedUserData) {
        try {
          const userData = JSON.parse(storedUserData);
          setToken(storedToken);
          setUser(userData);
          setIsAuthenticated(true);
        } catch (err) {
          console.error('Error parsing user data:', err);
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
      
      setAuthChecked(true);
    };
    
    checkAuth();
  }, []);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      router.push('/Signin?callbackUrl=/wallet/deposit');
    }
  }, [authChecked, isAuthenticated, router]);
  
  // Fetch wallet balance when component mounts
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchWalletBalance();
    }
  }, [isAuthenticated, token]);
  
  const fetchWalletBalance = async () => {
    try {
      const response = await fetch('https://keymedia-consult.onrender.com/api/iget/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setWalletBalance(data.data.balance);
      }
    } catch (err) {
      console.error('Failed to fetch wallet balance:', err);
    }
  };
  
  const handleAmountSelect = (value) => {
    setAmount(value);
    setCustomAmount('');
    setError(''); // Clear any existing error
  };
  
  const handleCustomAmountChange = (e) => {
    const value = e.target.value;
    setCustomAmount(value);
    setAmount(value);
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate amount
    const numericAmount = parseFloat(amount);
    
    if (!amount || isNaN(numericAmount)) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (numericAmount < 10) {
      setError('Minimum deposit amount is GHS 10.00');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Convert to pesewas as required by the backend
      const amountInPesewas = Math.round(numericAmount * 100);
      
      // Using the correct deposit endpoint that matches the backend
      const response = await fetch('https://keymedia-consult.onrender.com/api/depsoite/deposit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountInPesewas,
          email: user.email
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store the reference and transaction ID in localStorage for verification
        localStorage.setItem('paystack_reference', data.data.reference);
        localStorage.setItem('paystack_transaction_id', data.data.transactionId);
        
        // Redirect to Paystack payment page
        window.location.href = data.data.authorizationUrl;
      } else {
        setError(data.message || 'Failed to initiate payment');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Deposit error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!authChecked) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className={`w-16 h-16 border-4 ${darkMode ? 'border-blue-400 border-t-gray-900' : 'border-blue-500 border-t-transparent'} rounded-full animate-spin`}></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Deposit Funds - I-Get Bundle Services</title>
        <meta name="description" content="Add funds to your wallet to purchase mobile data bundles" />
      </Head>
      
      <div className={`min-h-screen ${darkMode 
        ? 'bg-gray-900 text-gray-100' 
        : 'bg-gradient-to-b from-blue-50 to-white text-gray-800'}`}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className={`${darkMode 
            ? 'bg-gray-800 shadow-xl' 
            : 'bg-white shadow-lg'} rounded-xl overflow-hidden`}>
            {/* Header */}
            <div className={`${darkMode 
              ? 'bg-blue-800' 
              : 'bg-blue-600'} text-white px-6 py-4`}>
              <h1 className="text-2xl font-bold">Deposit Funds</h1>
              <p className="opacity-90">Add money to your wallet to purchase bundles</p>
            </div>
            
            <div className="p-6">
              {/* Wallet Balance Card */}
              <div className={`${darkMode 
                ? 'bg-gradient-to-r from-blue-800 to-blue-900' 
                : 'bg-gradient-to-r from-blue-500 to-blue-700'} rounded-lg text-white p-4 mb-8`}>
                <div className="flex items-center">
                  <div className="bg-white/20 p-3 rounded-full mr-4">
                    <FaWallet className="text-2xl" />
                  </div>
                  <div>
                    <p className="text-sm opacity-90">Current Balance</p>
                    <h2 className="text-2xl font-bold">GHS {walletBalance.toFixed(2)}</h2>
                  </div>
                </div>
              </div>
              
              {/* Error Message */}
              {error && (
                <div className={`${darkMode 
                  ? 'bg-red-900/20 border-red-800 text-red-400' 
                  : 'bg-red-50 border-red-200 text-red-700'} border px-4 py-3 rounded mb-6`}>
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                {/* Preset Amounts */}
                <div className="mb-6">
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Select Amount (GHS)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {AMOUNT_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`py-3 rounded-lg border ${
                          amount === String(option)
                            ? darkMode 
                              ? 'bg-blue-900/50 border-blue-700 text-blue-300' 
                              : 'bg-blue-100 border-blue-500 text-blue-700'
                            : darkMode 
                              ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' 
                              : 'bg-white border-gray-300 hover:bg-gray-50'
                        } font-medium transition`}
                        onClick={() => handleAmountSelect(String(option))}
                      >
                        GHS {option.toFixed(2)}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Custom Amount Input */}
                <div className="mb-8">
                  <label htmlFor="customAmount" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Or Enter Custom Amount (GHS)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className={darkMode ? 'text-gray-500' : 'text-gray-500'}>GHS</span>
                    </div>
                    <input
                      type="number"
                      id="customAmount"
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                      min="10"
                      step="0.01"
                      placeholder="Enter amount (min. GHS 10)"
                      className={`block w-full pl-12 pr-4 py-3 border ${
                        darkMode 
                          ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500 focus:border-blue-500' 
                          : 'bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      } rounded-lg`}
                    />
                  </div>
                  <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Minimum deposit amount: GHS 10.00
                  </p>
                </div>
                
                {/* Payment Button */}
                <button
                  type="submit"
                  disabled={isLoading || !amount || parseFloat(amount) < 10}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-white ${
                    isLoading || !amount || parseFloat(amount) < 10
                      ? darkMode ? 'bg-gray-700 cursor-not-allowed' : 'bg-gray-400 cursor-not-allowed'
                      : darkMode ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'
                  } transition-colors`}
                >
                  {isLoading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <FaCreditCard />
                      Pay with Paystack
                    </>
                  )}
                </button>
              </form>
              
              {/* Payment Info */}
              <div className={`mt-8 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-4`}>
                <h3 className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>Payment Information</h3>
                <ul className={`space-y-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Minimum deposit amount is GHS 10.00
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    You will be redirected to Paystack's secure payment page
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Your wallet will be credited immediately after successful payment
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Multiple payment options available: Card, Bank Transfer, Mobile Money, etc.
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    For any issues, please contact our support team
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}