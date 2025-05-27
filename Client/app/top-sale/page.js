"use client"
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { 
  Award, 
  Users, 
  Sun, 
  Moon, 
  DollarSign, 
  Calendar, 
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Check
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import AdminLayout from '@/components/adminWraper';

export default function TopSales() {
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState({});
  const [percentages, setPercentages] = useState([10, 5, 3]);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [isRewarding, setIsRewarding] = useState(false);
  const [rewardSuccess, setRewardSuccess] = useState(false);
  const [rewardResults, setRewardResults] = useState([]);
  
  const { theme, setTheme } = useTheme();
  
  useEffect(() => {
    // Check if we're in browser environment before accessing localStorage
    if (typeof window !== 'undefined') {
      fetchTopUsers();
    }
  }, []);
  
  const fetchTopUsers = async () => {
    try {
      setLoading(true);
      
      // Get token from localStorage
      const token = localStorage.getItem('igettoken');
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        toast.error('Authentication failed. Please log in again.');
        return;
      }
      
      const res = await axios.get('https://iget.onrender.com/api/admin/top-sales-users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Log the response to see what's coming back
      console.log('API Response:', res.data);
      
      const userData = res.data.data || [];
      
      // Enhanced logging of user data
      userData.forEach((user, index) => {
        console.log(`User ${index + 1}:`, {
          userId: user.userId,
          username: user.username,
          email: user.email,
          totalSales: user.totalSales,
          transactionCount: user.transactionCount
        });
      });
      
      setTopUsers(userData);
      setPeriod(res.data.period || {});
      setError(null);
    } catch (err) {
      console.error('API Error:', err.response || err);
      setError(err.response?.data?.message || 'Failed to fetch top users');
      toast.error('Failed to load top sales performers');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePercentageChange = (index, value) => {
    const newPercentages = [...percentages];
    newPercentages[index] = Math.max(0, Math.min(100, parseFloat(value) || 0));
    setPercentages(newPercentages);
  };
  
  const handleRewardSubmit = async () => {
    try {
      setIsRewarding(true);
      
      // Get token from localStorage
      const token = localStorage.getItem('igettoken');
      
      if (!token) {
        toast.error('Authentication failed. Please log in again.');
        return;
      }
      
      const res = await axios.post('https://iget.onrender.com/api/admin/reward-top-performers', {
        percentages: percentages,
        description: `Performance reward for top sales from ${formatDate(period.from)} to ${formatDate(period.to)}`
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Reward Response:', res.data);
      
      setRewardResults(res.data.rewards || []);
      setRewardSuccess(true);
      toast.success('Rewards distributed successfully!');
      
      // Refetch users after rewarding
      fetchTopUsers();
    } catch (err) {
      console.error('Reward Error:', err.response || err);
      toast.error(err.response?.data?.message || 'Failed to distribute rewards');
    } finally {
      setIsRewarding(false);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount);
  };
  
  const calculateReward = (sales, percentage) => {
    return sales * (percentage / 100);
  };
  
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  
  const renderMedal = (position) => {
    const colors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
    return position < 3 ? (
      <Award className={`${colors[position]} h-6 w-6`} />
    ) : null;
  };
  
  // Helper function to safely display user information
  const displayUsername = (user) => {
    if (!user) return "Unknown User";
    return user.username || user.email || `User ID: ${user.userId}` || "Unknown User";
  };
  
  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <Award className="mr-2 h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                Top Sales Performers
              </h1>
              <p className="mt-1 text-gray-500 dark:text-gray-400 flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {period.from && period.to ? (
                  <span>Period: {formatDate(period.from)} - {formatDate(period.to)}</span>
                ) : (
                  <span>Last 6 Days</span>
                )}
              </p>
            </div>
            
            <div className="flex items-center">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 mr-4"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              
              <button
                onClick={() => setIsRewardModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:ring-offset-gray-900"
                disabled={topUsers.length === 0}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Reward Top Performers
              </button>
            </div>
          </div>
          
          {/* Main content */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-500 mr-3" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          ) : (
            <div>
              {topUsers.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Sales Data</h3>
                  <p className="mt-1 text-gray-500 dark:text-gray-400">
                    There are no purchase transactions in the past 6 days.
                  </p>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    The system is looking for transactions with type 'purchase'.
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {topUsers.map((user, index) => (
                      <li key={user.userId} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900">
                              {renderMedal(index)}
                              {index >= 3 && (
                                <span className="text-gray-700 dark:text-gray-300 font-medium">{index + 1}</span>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {displayUsername(user)}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user?.email || "No email available"}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatCurrency(user.totalSales)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {user.transactionCount} transactions
                            </div>
                            {percentages[index] !== undefined && (
                              <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                                Potential Reward: {formatCurrency(calculateReward(user.totalSales, percentages[index]))}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Modal Portal - Move the modal outside of the main layout flow */}
      {isRewardModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-[100]" style={{isolation: 'isolate'}}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
            {/* Modal backdrop */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 dark:bg-gray-900 opacity-75" 
              aria-hidden="true"
              onClick={() => {
                if (!isRewarding) {
                  setIsRewardModalOpen(false);
                  setRewardSuccess(false);
                  setRewardResults([]);
                }
              }}
            ></div>
            
            {/* Modal container - centered */}
            <div 
              className="inline-block overflow-hidden text-left align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 relative z-[110]"
              onClick={(e) => e.stopPropagation()}
            >
              {rewardSuccess ? (
                <div>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900">
                    <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Rewards Distributed Successfully!
                    </h3>
                    <div className="mt-4">
                      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {rewardResults.map((result) => (
                          <li key={result.userId} className="py-3">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {result.username || `User ID: ${result.userId}` || "Unknown User"}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {formatCurrency(result.rewardAmount)} ({result.percentage}%)
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-6">
                    <button
                      type="button"
                      className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:ring-offset-gray-800 sm:text-sm"
                      onClick={() => {
                        setIsRewardModalOpen(false);
                        setRewardSuccess(false);
                        setRewardResults([]);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900">
                    <Award className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Reward Top Performers
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Set the percentage of total sales to reward each top performer.
                        The reward will be calculated based on their total sales in the past 6 days.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5">
                    <ul className="space-y-4">
                      {topUsers.slice(0, 3).map((user, index) => (
                        <li key={user.userId} className="flex items-center justify-between">
                          <div className="flex items-center">
                            {renderMedal(index)}
                            <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                              {displayUsername(user)}
                            </span>
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              ({formatCurrency(user.totalSales)})
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={percentages[index]}
                              onChange={(e) => handlePercentageChange(index, e.target.value)}
                              className="block w-16 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                            />
                            <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 min-w-[100px] text-right">
                              {formatCurrency(calculateReward(user.totalSales, percentages[index]))}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:ring-offset-gray-800 sm:col-start-2 sm:text-sm"
                      onClick={handleRewardSubmit}
                      disabled={isRewarding}
                    >
                      {isRewarding ? (
                        <>
                          <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                          Processing...
                        </>
                      ) : (
                        'Distribute Rewards'
                      )}
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:ring-offset-gray-800 sm:mt-0 sm:col-start-1 sm:text-sm"
                      onClick={() => setIsRewardModalOpen(false)}
                      disabled={isRewarding}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}