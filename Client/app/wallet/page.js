// pages/wallet/transactions.js
'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import Link from 'next/link';
import { 
  FaWallet, FaArrowDown, FaArrowUp, FaSpinner, FaHistory, 
  FaSync, FaCheckCircle, FaTimesCircle, FaHourglassHalf, 
  FaArrowLeft, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';

export default function Transactions() {
  const router = useRouter();
  
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [verifiedTransactions, setVerifiedTransactions] = useState([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize] = useState(20); // Fixed at 20 items per page
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  
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
      router.push('/Signin?callbackUrl=/wallet/transactions');
    }
  }, [authChecked, isAuthenticated, router]);
  
  // Fetch wallet balance and transactions when component mounts or page changes
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchWalletBalance();
      fetchTransactions(currentPage);
    }
  }, [isAuthenticated, token, currentPage]);
  
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
  
  const fetchTransactions = async (page = 1) => {
    setIsLoading(true);
    setError('');
    
    try {
      // Using the transaction endpoint with pagination
      const response = await fetch(`https://keymedia-consult.onrender.com/api/depsoite/transactions?page=${page}&limit=${pageSize}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.data.transactions);
        
        // Update pagination state
        const { pagination } = data.data;
        if (pagination) {
          setTotalPages(pagination.totalPages);
          setTotalItems(pagination.totalItems);
          setHasNextPage(pagination.hasNextPage);
          setHasPreviousPage(pagination.hasPreviousPage);
        }
        
        // If any transactions were verified during the fetch, store them
        if (data.data.verified && data.data.verified.length > 0) {
          setVerifiedTransactions(data.data.verified);
          
          // Update the wallet balance if we verified some transactions
          fetchWalletBalance();
        }
      } else {
        setError(data.message || 'Failed to fetch transactions');
      }
    } catch (err) {
      setError('Failed to load transactions. Please try again.');
      console.error('Transaction fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const refreshTransactions = async () => {
    setIsRefreshing(true);
    await fetchTransactions(currentPage);
    await fetchWalletBalance();
    setIsRefreshing(false);
  };
  
  const goToNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };
  
  const goToPreviousPage = () => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Get appropriate status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FaCheckCircle className="text-green-500" />;
      case 'pending':
        return <FaHourglassHalf className="text-yellow-500" />;
      case 'failed':
        return <FaTimesCircle className="text-red-500" />;
      default:
        return <FaHistory className="text-gray-500" />;
    }
  };
  
  // Get transaction type icon
  const getTypeIcon = (type) => {
    switch (type) {
      case 'deposit':
        return <FaArrowDown className="text-green-500" />;
      case 'withdrawal':
        return <FaArrowUp className="text-red-500" />;
      case 'purchase':
        return <FaArrowUp className="text-blue-500" />;
      default:
        return <FaHistory className="text-gray-500" />;
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
        <title>Transaction History - I-Get Bundle Services</title>
        <meta name="description" content="View your wallet transaction history" />
      </Head>
      
      <div className={`min-h-screen ${darkMode 
        ? 'bg-gray-900 text-gray-100' 
        : 'bg-gradient-to-b from-blue-50 to-white text-gray-800'}`}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Back Navigation */}
          <Link href="/wallet" className={`inline-flex items-center mb-4 ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
            <FaArrowLeft className="mr-2" /> Back to Wallet
          </Link>
          
          <div className={`${darkMode 
            ? 'bg-gray-800 shadow-xl' 
            : 'bg-white shadow-lg'} rounded-xl overflow-hidden`}>
            {/* Header */}
            <div className={`${darkMode 
              ? 'bg-blue-800' 
              : 'bg-blue-600'} text-white px-6 py-4`}>
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold">Transaction History</h1>
                  <p className="opacity-90">View and manage your wallet transactions</p>
                </div>
                <button 
                  onClick={refreshTransactions}
                  disabled={isRefreshing}
                  className={`p-2 rounded-full ${
                    darkMode 
                      ? 'bg-blue-700 hover:bg-blue-600' 
                      : 'bg-blue-500 hover:bg-blue-400'
                  } transition-colors`}
                  title="Refresh transactions"
                >
                  <FaSync className={`${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Recently Verified Transactions Alert */}
              {verifiedTransactions.length > 0 && (
                <div className={`${darkMode 
                  ? 'bg-green-900/20 border-green-800 text-green-400' 
                  : 'bg-green-50 border-green-200 text-green-700'} border px-4 py-3 rounded mb-6`}>
                  <div className="flex items-center">
                    <FaCheckCircle className="mr-2" />
                    <p>{verifiedTransactions.length} pending transaction{verifiedTransactions.length > 1 ? 's' : ''} verified successfully!</p>
                  </div>
                </div>
              )}
              
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
              
              {/* Transactions List */}
              <div className={`overflow-hidden rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                {isLoading ? (
                  <div className={`flex flex-col items-center justify-center py-12 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <FaSpinner className="animate-spin text-3xl mb-4 text-blue-500" />
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Loading transactions...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center py-12 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <FaHistory className="text-4xl mb-4 text-gray-400" />
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>No transactions found</p>
                    <Link href="/wallet/deposit" className={`mt-4 inline-flex items-center px-4 py-2 rounded-lg ${
                      darkMode 
                        ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    } transition-colors`}>
                      <FaWallet className="mr-2" /> Make a Deposit
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className={`${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Reference</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                          {transactions.map((transaction) => (
                            <tr key={transaction._id} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="mr-2">
                                    {getTypeIcon(transaction.type)}
                                  </div>
                                  <span className="capitalize">{transaction.type}</span>
                                </div>
                              </td>
                              <td className={`px-4 py-4 whitespace-nowrap font-medium ${
                                transaction.type === 'deposit' 
                                  ? darkMode ? 'text-green-400' : 'text-green-600'
                                  : darkMode ? 'text-red-400' : 'text-red-600'
                              }`}>
                                {transaction.type === 'deposit' ? '+' : '-'}GHS {transaction.amount.toFixed(2)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="mr-2">
                                    {getStatusIcon(transaction.status)}
                                  </div>
                                  <span className={`capitalize ${
                                    transaction.status === 'completed'
                                      ? darkMode ? 'text-green-400' : 'text-green-600'
                                      : transaction.status === 'pending'
                                        ? darkMode ? 'text-yellow-400' : 'text-yellow-600'
                                        : darkMode ? 'text-red-400' : 'text-red-600'
                                  }`}>
                                    {transaction.status}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                {formatDate(transaction.createdAt)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm truncate max-w-[140px]">
                                {transaction.reference}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Pagination Controls */}
                    <div className={`px-4 py-3 flex items-center justify-between border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={goToPreviousPage}
                          disabled={!hasPreviousPage}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                            hasPreviousPage
                              ? darkMode
                                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                              : darkMode
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Previous
                        </button>
                        <button
                          onClick={goToNextPage}
                          disabled={!hasNextPage}
                          className={`ml-3 relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                            hasNextPage
                              ? darkMode
                                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                              : darkMode
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                            Showing <span className="font-medium">{transactions.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0}</span> to{' '}
                            <span className="font-medium">{Math.min(currentPage * pageSize, totalItems)}</span> of{' '}
                            <span className="font-medium">{totalItems}</span> results
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                              onClick={goToPreviousPage}
                              disabled={!hasPreviousPage}
                              className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium ${
                                hasPreviousPage
                                  ? darkMode
                                    ? 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                                  : darkMode
                                    ? 'border-gray-700 bg-gray-800 text-gray-500 cursor-not-allowed'
                                    : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              <span className="sr-only">Previous</span>
                              <FaChevronLeft className="h-5 w-5" aria-hidden="true" />
                            </button>
                            
                            {/* Current Page Display */}
                            <span
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                darkMode
                                  ? 'border-gray-700 bg-gray-700 text-white'
                                  : 'border-gray-300 bg-blue-50 text-blue-600'
                              }`}
                            >
                              {currentPage}
                            </span>
                            
                            <button
                              onClick={goToNextPage}
                              disabled={!hasNextPage}
                              className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium ${
                                hasNextPage
                                  ? darkMode
                                    ? 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                                  : darkMode
                                    ? 'border-gray-700 bg-gray-800 text-gray-500 cursor-not-allowed'
                                    : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              <span className="sr-only">Next</span>
                              <FaChevronRight className="h-5 w-5" aria-hidden="true" />
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Transaction Info */}
              <div className={`mt-8 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-4`}>
                <h3 className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>Transaction Information</h3>
                <ul className={`space-y-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Showing {pageSize} transactions per page
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Pending deposits are automatically verified with Paystack
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Your wallet is immediately credited after successful payment verification
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Click the refresh button to manually check for any pending transactions
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