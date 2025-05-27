'use client'
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { Package, AlertCircle, ChevronLeft, RefreshCw, Search, Moon, Sun } from 'lucide-react';

// UserOrders component
export default function UserOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchPhone, setSearchPhone] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check user's preferred color scheme on component mount
  useEffect(() => {
    // Check if user prefers dark mode or has set it in localStorage
    const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedMode = localStorage.getItem('darkMode');
    setIsDarkMode(savedMode === 'true' || (savedMode === null && userPrefersDark));
    
    // Apply dark mode class to document if needed
    if (savedMode === 'true' || (savedMode === null && userPrefersDark)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('darkMode', newMode);
      
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      return newMode;
    });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter orders based on search term
  useEffect(() => {
    if (!searchPhone.trim()) {
      setFilteredOrders(orders);
    } else {
      const filtered = orders.filter(order => 
        order.recipientNumber && 
        order.recipientNumber.toLowerCase().includes(searchPhone.toLowerCase())
      );
      setFilteredOrders(filtered);
    }
  }, [searchPhone, orders]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get token from localStorage
      const token = localStorage.getItem('igettoken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch('https://iget.onrender.com/api/orders/my-orders', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch orders');
      }
      
      setOrders(result.data || []);
      setFilteredOrders(result.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase();
    
    // Light mode colors
    if (!isDarkMode) {
      switch (statusLower) {
        case 'completed':
          return 'bg-green-100 text-green-800';
        case 'pending':
          return 'bg-yellow-100 text-yellow-800';
        case 'processing':
          return 'bg-blue-100 text-blue-800';
        case 'cancelled':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    } 
    // Dark mode colors
    else {
      switch (statusLower) {
        case 'completed':
          return 'bg-green-900 text-green-100';
        case 'pending':
          return 'bg-yellow-900 text-yellow-100';
        case 'processing':
          return 'bg-blue-900 text-blue-100';
        case 'cancelled':
          return 'bg-red-900 text-red-100';
        default:
          return 'bg-gray-700 text-gray-100';
      }
    }
  };

  // Handle search input changes
  const handleSearchChange = (e) => {
    setSearchPhone(e.target.value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchPhone('');
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <Head>
        <title>My Orders | iGetData</title>
        <meta name="description" content="View your data bundle purchase history" />
      </Head>
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <button 
              onClick={() => router.back()} 
              className={`mr-4 p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-3xl font-bold flex items-center">
              <Package className="mr-2" /> My Orders
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-800 text-yellow-300' : 'bg-gray-100 text-gray-700'}`}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <button 
              onClick={fetchOrders} 
              className={`flex items-center ${
                isDarkMode 
                  ? 'bg-blue-700 hover:bg-blue-800' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white py-2 px-4 rounded-lg transition-colors`}
              disabled={loading}
            >
              <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        {/* Search box */}
        <div className={`mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg shadow`}>
          <div className="flex items-center">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
              </div>
              <input
                type="text"
                placeholder="Search by phone number..."
                value={searchPhone}
                onChange={handleSearchChange}
                className={`pl-10 pr-4 py-2 w-full rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                    : 'bg-gray-50 text-gray-900 border-gray-300 focus:border-blue-500'
                } border focus:ring-blue-500 focus:outline-none`}
              />
              {searchPhone && (
                <button 
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>✕</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {error && (
          <div className={`${isDarkMode ? 'bg-red-900 border-red-700 text-red-100' : 'bg-red-50 border-red-500 text-red-700'} border-l-4 p-4 mb-6 rounded-md`}>
            <div className="flex items-center">
              <AlertCircle className={isDarkMode ? "text-red-300" : "text-red-500"} size={20} />
              <p className="ml-2">{error}</p>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${isDarkMode ? 'border-blue-400' : 'border-blue-500'}`}></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-8 text-center`}>
            <Package size={64} className={`mx-auto ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mb-4`} />
            {searchPhone ? (
              <>
                <h3 className={`text-xl font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>No matching orders found</h3>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-6`}>
                  No orders found with phone number containing "{searchPhone}"
                </p>
                <button 
                  onClick={clearSearch} 
                  className={`${
                    isDarkMode 
                      ? 'bg-blue-700 hover:bg-blue-800' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white py-2 px-6 rounded-lg transition-colors`}
                >
                  Clear Search
                </button>
              </>
            ) : (
              <>
                <h3 className={`text-xl font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>No Orders Found</h3>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-6`}>You haven't made any data bundle purchases yet.</p>
                <button 
                  onClick={() => router.push('/services')} 
                  className={`${
                    isDarkMode 
                      ? 'bg-blue-700 hover:bg-blue-800' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white py-2 px-6 rounded-lg transition-colors`}
                >
                  Browse Available Bundles
                </button>
              </>
            )}
          </div>
        ) : (
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Order ID
                    </th>
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Bundle
                    </th>
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Amount
                    </th>
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Status
                    </th>
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {filteredOrders.map((order) => (
                    <tr key={order._id} className={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                        {order.orderReference}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                          {order.capacity ? `${order.capacity} GB` : 'N/A'} 
                          {order.bundleType && ` (${order.bundleType})`}
                        </div>
                        {order.recipientNumber && (
                          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {order.recipientNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                          GH¢ {order.price || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status || 'Unknown'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className={isDarkMode ? 'bg-gray-700 px-6 py-4' : 'bg-gray-50 px-6 py-4'}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {searchPhone ? (
                  <>Showing {filteredOrders.length} of {orders.length} order{orders.length !== 1 ? 's' : ''}</>
                ) : (
                  <>Showing {orders.length} order{orders.length !== 1 ? 's' : ''}</>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}