// pages/dashboard/today.js
'use client'
import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, ShoppingBag, Wallet, RefreshCw, Plus, History, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TodayStats() {
  const [stats, setStats] = useState({
    ordersToday: 0,
    totalOrderAmount: 0,
    walletRevenue: 0,
    transactionsCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchTodayStats = async () => {
      try {
        setLoading(true);
        
        // Get token from local storage
        const token = localStorage.getItem('igettoken');
        
        if (!token) {
          setError('Authentication token not found');
          router.push('/Signin');
          return;
        }
        
        const response = await fetch('https://iget.onrender.com/api/today/stats', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch today\'s stats');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setStats(data.data);
        } else {
          throw new Error(data.message || 'Failed to fetch today\'s stats');
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching today\'s stats:', err);
        
        // If token is invalid or expired, redirect to login
        if (err.message === 'Invalid authentication token' || err.message === 'Authentication token expired') {
          localStorage.removeItem('token');
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchTodayStats();
    
    // Set up auto-refresh every 5 minutes
    const refreshInterval = setInterval(fetchTodayStats, 5 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [router]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  const handleDepositClick = () => {
    router.push('/dashboard/deposit');
  };
  
  const handleOrderHistoryClick = () => {
    router.push('/dashboard/orders');
  };
  
  const [showNetworkOptions, setShowNetworkOptions] = useState(false);
  
  const handleNewOrderClick = () => {
    setShowNetworkOptions(true);
  };
  
  const handleNetworkSelect = (network) => {
    setShowNetworkOptions(false);
    if (network === 'mtn') {
      router.push('/dashboard/mtn');
    } else if (network === 'telecel') {
      router.push('/dashboard/telecel');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="animate-spin h-8 w-8 text-blue-500" />
        <span className="ml-2">Loading today's stats...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Today's Activity</h1>
        <div className="flex flex-wrap gap-3 justify-center md:justify-end w-full md:w-auto">
          <button 
            onClick={handleDepositClick}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg shadow-md hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-all duration-300"
          >
            <Plus className="h-4 w-4 mr-2" />
            Top Up Wallet
          </button>
          <button 
            onClick={handleOrderHistoryClick}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-medium rounded-lg shadow-md hover:from-green-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 transition-all duration-300"
          >
            <History className="h-4 w-4 mr-2" />
            Order History
          </button>
          <button 
            onClick={handleNewOrderClick}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium rounded-lg shadow-md hover:from-purple-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75 transition-all duration-300"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            New Order
          </button>
        </div>
      </div>
      
      {showNetworkOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Select Network</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleNetworkSelect('mtn')}
                className="py-3 px-4 bg-yellow-400 text-yellow-900 font-semibold rounded-lg hover:bg-yellow-500 transition-all duration-300"
              >
                MTN
              </button>
              <button
                onClick={() => handleNetworkSelect('telecel')}
                className="py-3 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all duration-300"
              >
                Telecel
              </button>
            </div>
            <button
              onClick={() => setShowNetworkOptions(false)}
              className="mt-4 w-full py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-all duration-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Orders Today Card */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-700">Orders Today</h3>
            <ShoppingBag className="h-4 w-4 text-gray-500" />
          </div>
          <div className="text-2xl font-bold">{stats.ordersToday}</div>
          <p className="text-xs text-gray-500">
            Total value: {formatCurrency(stats.totalOrderAmount)}
          </p>
        </div>
        
        {/* Total Order Amount Card */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-700">Total Order Amount</h3>
            <div className="h-4 w-4 text-gray-500 font-bold">GHS</div>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalOrderAmount)}</div>
          <p className="text-xs text-gray-500">
            From {stats.ordersToday} orders today
          </p>
        </div>
        
        {/* Wallet Revenue Card */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-700">Wallet Revenue</h3>
            <Wallet className="h-4 w-4 text-gray-500" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(stats.walletRevenue)}</div>
          <p className="text-xs text-gray-500 flex items-center">
            {stats.walletRevenue >= 0 ? (
              <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
            ) : (
              <ArrowDown className="h-3 w-3 text-red-500 mr-1" />
            )}
            From deposits and withdrawals
          </p>
        </div>
        
        {/* Transactions Card */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-700">Transactions</h3>
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </div>
          <div className="text-2xl font-bold">{stats.transactionsCount}</div>
          <p className="text-xs text-gray-500">
            Wallet transactions today
          </p>
        </div>
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        <p>Last updated: {new Date().toLocaleTimeString()}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </button>
      </div>
    </div>
  );
}