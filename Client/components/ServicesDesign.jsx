'use client'
import React, { useState, useEffect } from 'react';
import { CreditCard, Package, Database, DollarSign, Calendar, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

const DashboardPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    currentBalance: 0,
    todayOrdersCount: 0,
    todayRevenue: 0,
    todayOrders: []
  });

  const viewAllOrders = () => {
    router.push('/orders');
  };

  useEffect(() => {
    // Check if user is authenticated
    const authToken = localStorage.getItem('igettoken');
    if (!authToken) {
      router.push('/Signin');
      return;
    }

    fetchDashboardData(authToken);
  }, [router]);

  // Fetch dashboard data from API
  const fetchDashboardData = async (token) => {
    try {
      setLoading(true);
      
      const response = await fetch('https://keymedia-consult.onrender.com/api/dashboard/today', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Format data capacity
  const formatDataCapacity = (capacity) => {
    if (capacity >= 1000) {
      return (capacity / 1000).toFixed(1) + " GB";
    }
    return capacity + " GB";
  };

  // Format date to readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time from date
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // MTN Brand color
  const dataHubBlue = "#4682B4";
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calculate total GB sold today
  const totalGbSold = dashboardData.todayOrders?.reduce((total, order) => {
    const capacityInGb = order.capacity >= 1000 ? order.capacity : order.capacity ;
    return total + capacityInGb;
  }, 0).toFixed(1);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">KDC</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">KEYMEDIA CONSULT</h1>
            </div>
            <div className="flex items-center text-gray-600">
              <Calendar className="h-5 w-5 mr-2" />
              <span>{today}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Stats */}
        <div className="mb-8 bg-white rounded-lg shadow overflow-hidden">
          <div className="h-2 bg-blue-500"></div>
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Key Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Account Balance Box */}
              <div className="rounded-lg p-4 flex flex-col items-center justify-center bg-blue-50">
                <CreditCard className="h-6 w-6 mb-2 text-blue-500" />
                <span className="text-sm font-medium text-gray-600">Account Balance</span>
                <span className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(dashboardData.currentBalance)}</span>
              </div>
              
              {/* Orders Today Box */}
              <div className="rounded-lg p-4 flex flex-col items-center justify-center bg-blue-50">
                <Package className="h-6 w-6 mb-2 text-blue-500" />
                <span className="text-sm font-medium text-gray-600">Orders Today</span>
                <div className="flex items-center mt-1">
                  <span className="text-xl font-bold text-gray-900">{dashboardData.todayOrdersCount}</span>
                </div>
              </div>
              
              {/* GB Sold Today Box */}
              <div className="rounded-lg p-4 flex flex-col items-center justify-center bg-blue-50">
                <Database className="h-6 w-6 mb-2 text-blue-500" />
                <span className="text-sm font-medium text-gray-600">GB Sold Today</span>
                <div className="flex items-center mt-1">
                  <span className="text-xl font-bold text-gray-900">{totalGbSold} GB</span>
                </div>
              </div>
              
              {/* Revenue Today Box */}
              <div className="rounded-lg p-4 flex flex-col items-center justify-center bg-blue-50">
                <DollarSign className="h-6 w-6 mb-2 text-blue-500" />
                <span className="text-sm font-medium text-gray-600">Revenue Today</span>
                <div className="flex items-center mt-1">
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(dashboardData.todayRevenue)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="mb-8 bg-white rounded-lg shadow overflow-hidden">
          <div className="h-2 bg-blue-500"></div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Today's Transactions</h2>
              <button className="text-sm text-blue-500 hover:text-blue-600 font-medium" onClick={viewAllOrders}>View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bundle Type
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Package
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData.todayOrders && dashboardData.todayOrders.length > 0 ? (
                    dashboardData.todayOrders.map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{order.recipientNumber}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{order.bundleType}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{formatTime(order.createdAt)}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDataCapacity(order.capacity)}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'failed' ? 'bg-red-100 text-red-800' : 
                              'bg-blue-100 text-blue-800'}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{formatCurrency(order.price)}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-4 py-4 text-center text-sm text-gray-500">
                        No transactions today
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="h-2 bg-blue-500"></div>
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => router.push('/mtn')}
                className="rounded-lg p-4 flex flex-col items-center bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors">
                <Package className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">New Order</span>
              </button>
              <button 
                onClick={() => router.push('/orders')}
                className="rounded-lg p-4 flex flex-col items-center bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors">
                <Clock className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Order History</span>
              </button>
              
              <button 
                onClick={() => router.push('/deposite')}
                className="rounded-lg p-4 flex flex-col items-center bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors">
                <CreditCard className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Add Funds</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;