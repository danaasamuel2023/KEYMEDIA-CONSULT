// pages/admin/users/index.js - Updated for unified admin roles
'use client'
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '@/components/adminWraper';
import { format } from 'date-fns';

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDescription, setDepositDescription] = useState('');
  const [debitAmount, setDebitAmount] = useState('');
  const [debitDescription, setDebitDescription] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [totalMoney, setTotalMoney] = useState(0);
  const [animateTotal, setAnimateTotal] = useState(false);
  const [adminPermissions, setAdminPermissions] = useState({});
  const [currentAdmin, setCurrentAdmin] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [usersPerPage] = useState(20);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  
  // Search states
  const [searchLoading, setSearchLoading] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  const moneyCounterRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  
  const router = useRouter();

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Fetch users when page or search changes
  useEffect(() => {
    fetchUsers();
  }, [currentPage, debouncedSearchQuery]);

  // Fetch admin permissions on component mount
  useEffect(() => {
    fetchAdminPermissions();
  }, []);

  // Calculate total money when users change
  useEffect(() => {
    if (users.length > 0) {
      calculateTotalMoney();
    }
  }, [users]);

  // Handle animation effect when total money changes
  useEffect(() => {
    if (totalMoney > 0) {
      setAnimateTotal(true);
      const timer = setTimeout(() => {
        setAnimateTotal(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [totalMoney]);

  // Function to animate counting from 0 to total
  useEffect(() => {
    if (moneyCounterRef.current && totalMoney > 0) {
      animateValue(0, totalMoney, 1500);
    }
  }, [totalMoney, animateTotal]);

  const animateValue = (start, end, duration) => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const current = Math.floor(progress * (end - start) + start);
      if (moneyCounterRef.current) {
        moneyCounterRef.current.textContent = current.toFixed(2);
      }
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        if (moneyCounterRef.current) {
          moneyCounterRef.current.textContent = end.toFixed(2);
        }
      }
    };
    window.requestAnimationFrame(step);
  };

  const fetchAdminPermissions = async () => {
    try {
      const response = await axios.get('https://keymedia-consult.onrender.com/api/admin/my-permissions', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('igettoken')}`
        }
      });
      
      if (response.data.success) {
        setAdminPermissions(response.data.permissions);
        setCurrentAdmin(response.data.admin);
      }
    } catch (err) {
      console.error('Error fetching admin permissions:', err);
      // If we can't fetch permissions, assume limited access
      setAdminPermissions({
        canViewAllUsers: false,
        canViewAllTransactions: false,
        canCredit: false,
        canDebit: false,
        canChangeRoles: false,
        canDeleteUsers: false,
        canUpdateOrderStatus: false
      });
    }
  };

  const calculateTotalMoney = () => {
    const total = users.reduce((acc, user) => {
      return acc + (user.wallet?.balance || 0);
    }, 0);
    setTotalMoney(total);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setSearchLoading(debouncedSearchQuery.length > 0);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: usersPerPage.toString(),
      });
      
      // Add search parameter if exists
      if (debouncedSearchQuery.trim()) {
        params.append('search', debouncedSearchQuery.trim());
      }
      
      const response = await axios.get(`https://keymedia-consult.onrender.com/api/admin/users?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('igettoken')}`
        }
      });
      
      // Handle response based on structure
      let userData = [];
      let paginationData = {};
      
      if (Array.isArray(response.data)) {
        userData = response.data;
        paginationData = {
          total: response.data.length,
          page: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false
        };
      } else if (response.data && Array.isArray(response.data.users)) {
        userData = response.data.users;
        paginationData = response.data.pagination || {};
      } else if (response.data && Array.isArray(response.data.data)) {
        userData = response.data.data;
        paginationData = response.data.pagination || {};
      } else {
        console.error('Unexpected API response format:', response.data);
        userData = [];
        paginationData = {};
      }
      
      setUsers(userData);
      
      // Update pagination state
      if (paginationData) {
        setTotalUsers(paginationData.total || userData.length);
        setTotalPages(paginationData.totalPages || 1);
        setHasNextPage(paginationData.hasNextPage || false);
        setHasPrevPage(paginationData.hasPrevPage || false);
      }
      
      setError(null);
    } catch (err) {
      // Handle permission errors gracefully
      if (err.response?.status === 403) {
        setError('Access denied. Please check your admin role.');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch users');
      }
      console.error('Error fetching users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  // Pagination and search handlers
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Reset to first page when searching
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  };

  const fetchUserTransactions = async (userId) => {
    try {
      setTransactionLoading(true);
      const response = await axios.get(`https://keymedia-consult.onrender.com/api/admin/users/${userId}/transactions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('igettoken')}`
        }
      });
      
      if (response.data && Array.isArray(response.data.data)) {
        setTransactionHistory(response.data.data);
      } else {
        console.error('Unexpected transaction API response format:', response.data);
        setTransactionHistory([]);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have permission to view user transactions.');
      } else {
        console.error('Error fetching transactions:', err);
      }
      setTransactionHistory([]);
    } finally {
      setTransactionLoading(false);
    }
  };

  const handleOpenModal = (type, user) => {
    // Check permissions before opening modals
    if (type === 'deposit' && !adminPermissions.canCredit) {
      setError('You do not have permission to credit user wallets.');
      return;
    }
    
    if (type === 'debit' && !adminPermissions.canDebit) {
      setError('You do not have permission to debit user wallets.');
      return;
    }
    
    if (type === 'changeRole' && !adminPermissions.canChangeRoles) {
      setError('You do not have permission to change user roles.');
      return;
    }
    
    if (type === 'deleteUser' && !adminPermissions.canDeleteUsers) {
      setError('You do not have permission to delete users.');
      return;
    }
    
    if (type === 'toggleStatus' && !adminPermissions.canChangeUserStatus) {
      setError('You do not have permission to change user status.');
      return;
    }
    
    if (type === 'transactions' && !adminPermissions.canViewAllTransactions) {
      setError('You do not have permission to view user transactions.');
      return;
    }

    setSelectedUser(user);
    setModalType(type);
    setShowModal(true);
    
    if (type === 'changeRole') {
      setNewRole(user.role || 'user');
    } else if (type === 'deposit') {
      setDepositAmount('');
      setDepositDescription('');
    } else if (type === 'debit') {
      setDebitAmount('');
      setDebitDescription('');
    } else if (type === 'transactions') {
      fetchUserTransactions(user._id);
      setShowTransactionHistory(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setDepositAmount('');
    setDepositDescription('');
    setDebitAmount('');
    setDebitDescription('');
    setModalType('');
    setError(null);
    setShowTransactionHistory(false);
  };

  const handleDeleteUser = async () => {
    try {
      await axios.delete(`https://keymedia-consult.onrender.com/api/admin/users/${selectedUser._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('igettoken')}`
        }
      });
      
      // Refresh the current page
      await fetchUsers();
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
      console.error('Error deleting user:', err);
    }
  };

  const handleToggleUserStatus = async () => {
    try {
      await axios.patch(`https://keymedia-consult.onrender.com/api/admin/users/${selectedUser._id}/status`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('igettoken')}`
        }
      });
      
      // Update user status in local state
      setUsers(users.map(user => 
        user._id === selectedUser._id ? { ...user, isActive: !user.isActive } : user
      ));
      
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user status');
      console.error('Error updating user status:', err);
    }
  };

  const handleDeleteApiKey = async () => {
    try {
      await axios.delete(`https://keymedia-consult.onrender.com/api/admin/users/${selectedUser._id}/api-key`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('igettoken')}`
        }
      });
      
      setUsers(users.map(user => 
        user._id === selectedUser._id ? { ...user, apiKey: undefined } : user
      ));
      
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete API key');
      console.error('Error deleting API key:', err);
    }
  };

  const handleDeposit = async (e) => {
    if (e) e.preventDefault();
    
    if (!depositAmount || isNaN(depositAmount) || parseFloat(depositAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    try {
      const response = await axios.post(`https://keymedia-consult.onrender.com/api/admin/users/${selectedUser._id}/wallet/deposit`, {
        amount: parseFloat(depositAmount),
        description: depositDescription
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('igettoken')}`
        }
      });
      
      // Update the user's wallet balance in the UI
      setUsers(users.map(user => 
        user._id === selectedUser._id 
          ? { ...user, wallet: { ...user.wallet, balance: (user.wallet?.balance || 0) + parseFloat(depositAmount) } } 
          : user
      ));
      
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add funds');
      console.error('Error adding funds:', err);
    }
  };

  const handleDebit = async (e) => {
    if (e) e.preventDefault();
    
    if (!debitAmount || isNaN(debitAmount) || parseFloat(debitAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (selectedUser.wallet?.balance < parseFloat(debitAmount)) {
      setError('Insufficient wallet balance');
      return;
    }
    
    try {
      const response = await axios.post(`https://keymedia-consult.onrender.com/api/admin/users/${selectedUser._id}/wallet/debit`, {
        amount: parseFloat(debitAmount),
        description: debitDescription
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('igettoken')}`
        }
      });
      
      // Update the user's wallet balance in the UI
      setUsers(users.map(user => 
        user._id === selectedUser._id 
          ? { ...user, wallet: { ...user.wallet, balance: (user.wallet?.balance || 0) - parseFloat(debitAmount) } } 
          : user
      ));
      
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deduct funds');
      console.error('Error deducting funds:', err);
    }
  };

  const handleChangeRole = async (e) => {
    if (e) e.preventDefault();
    
    if (!newRole) {
      setError('Please select a role');
      return;
    }
    
    try {
      console.log(`Changing role for user ${selectedUser._id} to ${newRole}`);
      
      await axios.patch(`https://keymedia-consult.onrender.com/api/admin/users/${selectedUser._id}/role`, {
        role: newRole
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('igettoken')}`
        }
      });
      
      // Update the user in the local state
      setUsers(users.map(user => 
        user._id === selectedUser._id ? { ...user, role: newRole } : user
      ));
      
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change user role');
      console.error('Error changing role:', err);
    }
  };

  // Helper function to get role badge color
  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'wallet_admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Editor':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'agent':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'super_agent':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'user':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Helper function to get role display name
  const getRoleDisplayName = (role) => {
    switch(role) {
      case 'wallet_admin': return 'Wallet Admin';
      case 'Editor': return 'Editor';
      case 'admin': return 'Admin';
      case 'agent': return 'Agent';
      case 'user': return 'User';
      case 'super_agent': return 'Super Agent';
      default: return role || 'user';
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return (
    <AdminLayout>
      <Head>
        <title>User Management | Admin Dashboard</title>
      </Head>
      
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex flex-col mb-4 sm:mb-0">
            <h1 className="text-2xl font-bold dark:text-white">User Management</h1>
            {currentAdmin && (
              <div className="flex items-center mt-2 space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Logged in as:</span>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${getRoleBadgeColor(currentAdmin.role)}`}>
                  {currentAdmin.username} ({getRoleDisplayName(currentAdmin.role)})
                </span>
              </div>
            )}
          </div>
          
          {/* Total Money Card */}
          {adminPermissions.hasFullUserAccess && (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-4 sm:mb-0 sm:mr-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users Wallet</h2>
              <div className="flex items-end mt-1">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400 transition-all duration-500 ease-in-out">
                  GHS<span 
                    ref={moneyCounterRef}
                    className={`${animateTotal ? 'text-green-600 scale-110' : 'text-green-600'} transition-all duration-500`}
                  >
                    {totalMoney.toFixed(2)}
                  </span>
                </span>
              </div>
            </div>
          )}
          
          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search users..."
              className="w-full px-4 py-2 pr-10 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchLoading ? (
              <div className="absolute right-3 top-2.5">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : searchQuery ? (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              </button>
            ) : (
              <span className="absolute right-3 top-2.5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
            )}
          </div>
        </div>

        {/* Search Results Info */}
        {debouncedSearchQuery && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {loading ? 'Searching...' : `Found ${totalUsers} result(s) for "${debouncedSearchQuery}"`}
              {totalUsers > 0 && (
                <button 
                  onClick={clearSearch}
                  className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear search
                </button>
              )}
            </p>
          </div>
        )}

        {/* Permission Notice */}
        {adminPermissions.hasLimitedUserAccess && !adminPermissions.hasFullUserAccess && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-200" role="alert">
            <p className="font-medium">Limited Access Mode</p>
            <p className="text-sm">
              Your role ({getRoleDisplayName(currentAdmin?.role)}) can view users and perform specific operations.
              {currentAdmin?.role === 'wallet_admin' && ' You can credit and debit user wallets.'}
              {currentAdmin?.role === 'Editor' && ' You can update order statuses.'}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 dark:bg-red-900 dark:border-red-600 dark:text-red-200" role="alert">
            <p>{error}</p>
          </div>
        )}

        {/* Users Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto bg-white rounded-lg shadow dark:bg-gray-800 dark:shadow-md">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">User</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Role</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Wallet</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-300">{user.email}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-300">{user.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                            {getRoleDisplayName(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${user.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                            {user.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          <div className="flex flex-col">
                            <span>{(user.wallet?.balance || 0).toFixed(2)} {user.wallet?.currency || 'GHS'}</span>
                            {adminPermissions.canViewAllTransactions && (
                              <button 
                                onClick={() => handleOpenModal('transactions', user)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 mt-1 dark:text-indigo-400 dark:hover:text-indigo-300">
                                View Transactions
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-col sm:flex-row gap-2">
                            {adminPermissions.canCredit && (
                              <button 
                                onClick={() => handleOpenModal('deposit', user)}
                                className="text-green-600 hover:text-green-900 bg-green-50 px-2 py-1 rounded dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800">
                                Credit
                              </button>
                            )}
                            {adminPermissions.canDebit && (
                              <button 
                                onClick={() => handleOpenModal('debit', user)}
                                className="text-red-600 hover:text-red-900 bg-red-50 px-2 py-1 rounded dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800">
                                Debit
                              </button>
                            )}
                            {adminPermissions.canChangeRoles && (
                              <button 
                                onClick={() => handleOpenModal('changeRole', user)}
                                className="text-blue-600 hover:text-blue-900 bg-blue-50 px-2 py-1 rounded dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800">
                                Change Role
                              </button>
                            )}
                            {adminPermissions.canChangeUserStatus && (
                              <button 
                                onClick={() => handleOpenModal('toggleStatus', user)}
                                className={`${user.isActive ? 'text-orange-600 hover:text-orange-900 bg-orange-50 dark:bg-orange-900 dark:text-orange-200 dark:hover:bg-orange-800' : 'text-green-600 hover:text-green-900 bg-green-50 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'} px-2 py-1 rounded`}>
                                {user.isActive ? 'Disable' : 'Enable'}
                              </button>
                            )}
                            {adminPermissions.canDeleteUsers && (
                              <button 
                                onClick={() => handleOpenModal('deleteUser', user)}
                                className="text-red-600 hover:text-red-900 bg-red-50 px-2 py-1 rounded dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800">
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        {debouncedSearchQuery ? 'No users found matching your search' : 'No users found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 dark:bg-gray-800 dark:border-gray-700 mt-4 rounded-lg">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={handlePrevPage}
                    disabled={!hasPrevPage}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                      hasPrevPage
                        ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                        : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-900 dark:border-gray-600 dark:text-gray-500'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={!hasNextPage}
                    className={`ml-3 relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                      hasNextPage
                        ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                        : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-900 dark:border-gray-600 dark:text-gray-500'
                    }`}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing{' '}
                      <span className="font-medium">{Math.min((currentPage - 1) * usersPerPage + 1, totalUsers)}</span>
                      {' '}to{' '}
                      <span className="font-medium">{Math.min(currentPage * usersPerPage, totalUsers)}</span>
                      {' '}of{' '}
                      <span className="font-medium">{totalUsers}</span>
                      {' '}results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={handlePrevPage}
                        disabled={!hasPrevPage}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium ${
                          hasPrevPage
                            ? 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                            : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-900 dark:border-gray-600 dark:text-gray-500'
                        }`}
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {getPageNumbers().map((pageNum, index) => (
                        pageNum === '...' ? (
                          <span key={`dots-${index}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300">
                            ...
                          </span>
                        ) : (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === pageNum
                                ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600 dark:bg-indigo-900 dark:border-indigo-400 dark:text-indigo-200'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      ))}
                      
                      <button
                        onClick={handleNextPage}
                        disabled={!hasNextPage}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium ${
                          hasNextPage
                            ? 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                            : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-900 dark:border-gray-600 dark:text-gray-500'
                        }`}
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedUser && (
        <>
          <div className="fixed inset-0 z-50 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-gray-900 dark:bg-opacity-75"></div>
          
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
              <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${modalType === 'transactions' ? 'sm:max-w-6xl' : 'sm:max-w-lg'} sm:w-full dark:bg-gray-800`}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 dark:bg-gray-800">
                  <div className="sm:flex sm:items-start">
                    {modalType === 'deleteUser' && (
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Delete User</h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500 dark:text-gray-300">
                            Are you sure you want to delete the user "{selectedUser.username}"? This action cannot be undone.
                          </p>
                        </div>
                      </div>
                    )}

                    {modalType === 'toggleStatus' && (
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                          {selectedUser.isActive ? 'Disable' : 'Enable'} User
                        </h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500 dark:text-gray-300">
                            Are you sure you want to {selectedUser.isActive ? 'disable' : 'enable'} the user "{selectedUser.username}"?
                          </p>
                        </div>
                      </div>
                    )}

                    {modalType === 'deposit' && (
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Credit User Wallet</h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
                            Add funds to {selectedUser.username}'s wallet. Current balance: {(selectedUser.wallet?.balance || 0).toFixed(2)} {selectedUser.wallet?.currency || 'GHS'}
                          </p>
                          <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg mb-4">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                              <strong>Action will be performed by:</strong> {currentAdmin?.username} ({getRoleDisplayName(currentAdmin?.role)})
                            </p>
                          </div>
                          <form onSubmit={handleDeposit}>
                            <div className="mb-4">
                              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount ({selectedUser.wallet?.currency || 'GHS'})</label>
                              <input
                                type="number"
                                step="0.01"
                                id="amount"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="0.00"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                required
                              />
                            </div>
                            <div className="mb-4">
                              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
                              <input
                                type="text"
                                id="description"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Credit reason"
                                value={depositDescription}
                                onChange={(e) => setDepositDescription(e.target.value)}
                              />
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                    {modalType === 'debit' && (
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Debit User Wallet</h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
                            Deduct funds from {selectedUser.username}'s wallet. Current balance: {(selectedUser.wallet?.balance || 0).toFixed(2)} {selectedUser.wallet?.currency || 'GHS'}
                          </p>
                          <div className="bg-red-50 dark:bg-red-900 p-3 rounded-lg mb-4">
                            <p className="text-sm text-red-800 dark:text-red-200">
                              <strong>Action will be performed by:</strong> {currentAdmin?.username} ({getRoleDisplayName(currentAdmin?.role)})
                            </p>
                          </div>
                          <form onSubmit={handleDebit}>
                            <div className="mb-4">
                              <label htmlFor="debit-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount ({selectedUser.wallet?.currency || 'GHS'})</label>
                              <input
                                type="number"
                                step="0.01"
                                id="debit-amount"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="0.00"
                                value={debitAmount}
                                onChange={(e) => setDebitAmount(e.target.value)}
                                required
                              />
                            </div>
                            <div className="mb-4">
                              <label htmlFor="debit-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
                              <input
                                type="text"
                                id="debit-description"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Debit reason"
                                value={debitDescription}
                                onChange={(e) => setDebitDescription(e.target.value)}
                              />
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                    {modalType === 'changeRole' && (
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Change User Role</h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
                            Change role for user "{selectedUser.username}".
                          </p>
                          <form onSubmit={handleChangeRole}>
                            <div className="mb-4">
                              <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                              <select
                                id="role"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value)}
                              >
                                <option value="user">User</option>
                                <option value="agent">Agent</option>
                                <option value="Editor">Editor</option>
                                <option value="wallet_admin">Wallet Admin</option>
                                <option value="admin">Full Admin</option>
                              </select>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              <strong>Role Descriptions:</strong>
                              <ul className="mt-1 list-disc list-inside">
                                <li><strong>User:</strong> Standard user access</li>
                                <li><strong>Agent:</strong> Extended user features</li>
                                <li><strong>Editor:</strong> Can update order statuses</li>
                                <li><strong>Wallet Admin:</strong> Can credit and debit user wallets</li>
                                <li><strong>Full Admin:</strong> Complete administrative access</li>
                              </ul>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                    {modalType === 'transactions' && (
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                          Transaction History - {selectedUser.username}
                        </h3>
                        <div className="mt-4">
                          {transactionLoading ? (
                            <div className="flex justify-center items-center h-40">
                              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                  <tr>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Date</th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Type</th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Amount</th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Balance</th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Description</th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Admin Details</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                  {transactionHistory.length > 0 ? (
                                    transactionHistory.map((transaction) => (
                                      <tr key={transaction._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                          {transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : 'N/A'}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${transaction.type === 'deposit' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                            {transaction.type === 'deposit' ? 'Credit' : 'Debit'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                          <span className={transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                                            {transaction.type === 'deposit' ? '+' : '-'}{transaction.amount.toFixed(2)} {transaction.currency || 'GHS'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                          {transaction.balanceAfter?.toFixed(2) || 'N/A'} {transaction.currency || 'GHS'}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                          {transaction.description || 'N/A'}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                          {transaction.processedByInfo ? (
                                            <div className="space-y-1">
                                              <div className="text-gray-900 dark:text-white font-medium">
                                                {transaction.processedByInfo.username}
                                              </div>
                                              <div className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(transaction.processedByInfo.role)}`}>
                                                {getRoleDisplayName(transaction.processedByInfo.role)}
                                              </div>
                                              {transaction.processedByInfo.actionTimestamp && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                  {new Date(transaction.processedByInfo.actionTimestamp).toLocaleString()}
                                                </div>
                                              )}
                                              {transaction.processedByInfo.isUnifiedWalletAdmin && (
                                                <div className="text-xs text-blue-600 dark:text-blue-400">
                                                  Unified Wallet Admin
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-gray-500 dark:text-gray-400">N/A</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan="6" className="px-4 py-2 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No transactions found
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse dark:bg-gray-700">
                  {modalType === 'deleteUser' && (
                    <>
                      <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                        onClick={handleDeleteUser}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-600 dark:text-white dark:border-gray-500 dark:hover:bg-gray-500"
                        onClick={handleCloseModal}
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {modalType === 'toggleStatus' && (
                    <>
                      <button
                        type="button"
                        className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                          selectedUser.isActive 
                            ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500' 
                            : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                        }`}
                        onClick={handleToggleUserStatus}
                      >
                        {selectedUser.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-600 dark:text-white dark:border-gray-500 dark:hover:bg-gray-500"
                        onClick={handleCloseModal}
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {modalType === 'deposit' && (
                    <>
                      <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                        onClick={handleDeposit}
                      >
                        Credit Funds
                      </button>
                      <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-600 dark:text-white dark:border-gray-500 dark:hover:bg-gray-500"
                        onClick={handleCloseModal}
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {modalType === 'debit' && (
                    <>
                      <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                        onClick={handleDebit}
                      >
                        Debit Funds
                      </button>
                      <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-600 dark:text-white dark:border-gray-500 dark:hover:bg-gray-500"
                        onClick={handleCloseModal}
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {modalType === 'changeRole' && (
                    <>
                      <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                        onClick={handleChangeRole}
                      >
                        Change Role
                      </button>
                      <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-600 dark:text-white dark:border-gray-500 dark:hover:bg-gray-500"
                        onClick={handleCloseModal}
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {modalType === 'transactions' && (
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm dark:bg-gray-600 dark:text-white dark:border-gray-500 dark:hover:bg-gray-500"
                      onClick={handleCloseModal}
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}