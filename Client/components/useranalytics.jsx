// pages/order-trends.js
'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import axios from 'axios';

// Chart components for visualization
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const OrderTrends = () => {
  const [trendsData, setTrendsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const router = useRouter();

  useEffect(() => {
    const fetchTrendsData = async () => {
      // Reset states
      setLoading(true);
      setError(null);
      
      try {
        // Get token from localStorage
        const token = localStorage.getItem('igettoken');
        
        if (!token) {
          setError('Authentication token not found. Please login.');
          setLoading(false);
          return;
        }
        
        // Set authorization header
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
          }
        };
        
        // Fetch the weekly trends data
        const response = await axios.get(
          `http://localhost:5000/api/orders/trends/user-weekly`, 
          config
        );
        
        setTrendsData(response.data.data);
      } catch (err) {
        console.error('Error fetching order trends:', err);
        
        if (err.response && err.response.status === 401) {
          setError('Your session has expired. Please login again.');
          // Redirect to login after 2 seconds
          setTimeout(() => router.push('/login'), 2000);
        } else {
          setError(err.response?.data?.message || 'Failed to fetch order trends data');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrendsData();
  }, [dateRange, router]);
  
  const handleDateChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Head>
        <title>My Order Trends | Dashboard</title>
        <meta name="description" content="View your weekly ordering patterns" />
      </Head>
      
      <h1 className="text-3xl font-bold mb-6">My Weekly Order Trends</h1>
      
      {/* Date range filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Filter by Date</h2>
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              className="mt-1 p-2 border rounded-md w-full"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              className="mt-1 p-2 border rounded-md w-full"
            />
          </div>
        </div>
      </div>
      
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-3">Loading your order trends...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      )}
      
      {!loading && !error && trendsData && (
        <div>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
              <p className="mt-2 text-3xl font-bold">{trendsData.totalOrders}</p>
              <p className="text-gray-500 text-sm mt-1">
                From {trendsData.dateRange.from} to {trendsData.dateRange.to}
              </p>
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-500">Preferred Order Day</h3>
              <p className="mt-2 text-3xl font-bold">{trendsData.preferredOrderDay}</p>
              <p className="text-gray-500 text-sm mt-1">
                {trendsData.preferredOrderDayPercentage}% of your orders
              </p>
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-500">Date Range</h3>
              <p className="mt-2 text-lg font-medium">
                {trendsData.dateRange.from} to {trendsData.dateRange.to}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                {Math.ceil((new Date(trendsData.dateRange.to) - new Date(trendsData.dateRange.from)) / (1000 * 60 * 60 * 24))} days
              </p>
            </div>
          </div>
          
          {/* Chart visualization */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Weekly Ordering Pattern</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={trendsData.orderPattern}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'percentage') return `${value}%`;
                      return value;
                    }}
                  />
                  <Legend />
                  <Bar name="Number of Orders" dataKey="count" fill="#3B82F6" />
                  <Bar name="Percentage" dataKey="percentage" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Detailed data table */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Detailed Order Distribution</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Day
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trendsData.orderPattern.map((day) => (
                    <tr key={day.dayIndex} className={day.day === trendsData.preferredOrderDay ? 'bg-blue-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{day.day}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{day.count}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">GHS{day.totalAmount.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{day.percentage}%</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {!loading && !error && (!trendsData || trendsData.totalOrders === 0) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                No order data found for the selected period. Try expanding your date range or place some orders to see your trends.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTrends;