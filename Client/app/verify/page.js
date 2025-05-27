// pages/wallet/verify.js
'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import Link from 'next/link';
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaWallet, FaArrowLeft } from 'react-icons/fa';

export default function PaymentVerification() {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('Verifying payment...');
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
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
  
  // Check authentication status and initialize verification
  useEffect(() => {
    const initVerification = async () => {
      const storedToken = localStorage.getItem('igettoken');
      const storedUserData = localStorage.getItem('userData');
      
      if (storedToken && storedUserData) {
        try {
          const userData = JSON.parse(storedUserData);
          setToken(storedToken);
          setIsAuthenticated(true);
          
          // Get reference from URL or localStorage
          const urlParams = new URLSearchParams(window.location.search);
          const reference = urlParams.get('reference') || localStorage.getItem('paystack_reference');
          
          if (reference) {
            await verifyPaystackTransaction(reference, storedToken);
          } else {
            setVerificationStatus('No payment reference found.');
            setError('Missing payment reference. Please try again or contact support.');
            setIsLoading(false);
          }
        } catch (err) {
          console.error('Error parsing user data:', err);
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
      
      setAuthChecked(true);
    };
    
    initVerification();
  }, []);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      router.push('/Signin?callbackUrl=/wallet/verify');
    }
  }, [authChecked, isAuthenticated, router]);
  
  // Function to verify transaction
  const verifyPaystackTransaction = async (reference, authToken) => {
    if (!reference || !authToken) return;
    
    setIsLoading(true);
    setVerificationStatus('Verifying payment...');
    
    try {
      // Using the verify-payment endpoint from the backend
      const verifyResponse = await fetch(` https://keymedia-consult.onrender.com/api/depsoite/verify-payment?reference=${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const verifyData = await verifyResponse.json();
      
      if (verifyData.success) {
        setVerificationStatus('Payment successful! Your wallet has been credited.');
        setTransactionDetails(verifyData.data);
        
        // Clear the stored reference
        localStorage.removeItem('paystack_reference');
        localStorage.removeItem('paystack_transaction_id');
        
        // Update wallet balance
        fetchWalletBalance(authToken);
        
        // Remove the reference from URL without page reload
        const url = new URL(window.location.href);
        url.searchParams.delete('reference');
        window.history.replaceState({}, document.title, url.toString());
      } else {
        setVerificationStatus('Payment verification failed. Please contact support.');
        setError(verifyData.message || 'Failed to verify payment');
      }
    } catch (err) {
      console.error('Error verifying payment:', err);
      setVerificationStatus('Error verifying payment. Please check your account or contact support.');
      setError('Error verifying payment');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch wallet balance
  const fetchWalletBalance = async (authToken) => {
    try {
      const response = await fetch('https://keymedia-consult.onrender.com/api/iget/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
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
        <title>Payment Verification - I-Get Bundle Services</title>
        <meta name="description" content="Verify your payment for I-Get Bundle Services" />
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
              <h1 className="text-2xl font-bold">Payment Verification</h1>
              <p className="opacity-90">Verifying your deposit transaction</p>
            </div>
            
            <div className="p-6">
              {/* Status Card */}
              <div className={`${darkMode 
                ? 'bg-gray-700' 
                : 'bg-gray-50'} rounded-lg p-6 text-center mb-6`}>
                
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center">
                    <FaSpinner className={`text-5xl ${darkMode ? 'text-blue-400' : 'text-blue-500'} animate-spin mb-4`} />
                    <h2 className="text-xl font-semibold mb-2">{verificationStatus}</h2>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Please wait while we verify your payment...</p>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center">
                    <FaTimesCircle className={`text-5xl ${darkMode ? 'text-red-400' : 'text-red-500'} mb-4`} />
                    <h2 className="text-xl font-semibold mb-2">{verificationStatus}</h2>
                    <p className={`${darkMode ? 'text-red-400' : 'text-red-600'} mb-4`}>{error}</p>
                    <Link href="/wallet/deposit" className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium ${darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                      <FaArrowLeft /> Back to Deposit
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <FaCheckCircle className={`text-5xl ${darkMode ? 'text-green-400' : 'text-green-500'} mb-4`} />
                    <h2 className="text-xl font-semibold mb-2">{verificationStatus}</h2>
                    
                    {/* Wallet Balance */}
                    <div className={`${darkMode 
                      ? 'bg-gradient-to-r from-blue-800 to-blue-900' 
                      : 'bg-gradient-to-r from-blue-500 to-blue-700'} rounded-lg text-white p-4 my-4 w-full max-w-md`}>
                      <div className="flex items-center">
                        <div className="bg-white/20 p-3 rounded-full mr-4">
                          <FaWallet className="text-2xl" />
                        </div>
                        <div>
                          <p className="text-sm opacity-90">Updated Balance</p>
                          <h2 className="text-2xl font-bold">GHS {walletBalance.toFixed(2)}</h2>
                        </div>
                      </div>
                    </div>
                    
                    {/* Transaction Details */}
                    {transactionDetails && (
                      <div className={`w-full max-w-md text-left p-4 rounded-lg ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'} mt-4`}>
                        <h3 className="font-medium mb-2">Transaction Details</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Reference:</span>
                            <span className="font-medium">{transactionDetails.reference}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Amount:</span>
                            <span className="font-medium">GHS {transactionDetails.amount?.toFixed(2) || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status:</span>
                            <span className={`font-medium ${
                              transactionDetails.status === 'completed' 
                                ? darkMode ? 'text-green-400' : 'text-green-600' 
                                : darkMode ? 'text-yellow-400' : 'text-yellow-600'
                            }`}>{transactionDetails.status}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-6 space-x-4">
                      <Link href="/wallet/deposit" className={`inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>
                        <FaArrowLeft /> Back to Deposit
                      </Link>
                      <Link href="/dashboard" className={`inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium ${darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                        Go to Dashboard
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}