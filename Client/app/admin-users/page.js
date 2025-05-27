// pages/admin/users/index.js
'use client'
import { useState, useEffect, useRef } from 'react';
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
  const moneyCounterRef = useRef(null);
  
  const router = useRouter();

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
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

  const calculateTotalMoney = () => {
    const total = users.reduce((acc, user) => {
      return acc + (user.wallet?.balance || 0);
    }, 0);
    setTotalMoney(total);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://keymedia-consult.onrender.com/api/admin/users', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('igettoken')}`
        }
      });
      
      // Check if response.data itself is an array
      if (Array.isArray(response.data)) {
        setUsers(response.data);
      } 
      // Check if response.data has a users property that is an array
      else if (response.data && Array.isArray(response.data.users)) {
        setUsers(response.data.users);
      }
      // Check if response.data has a data property that is an array (common API pattern)
      else if (response.data && Array.isArray(response.data.data)) {
        setUsers(response.data.data);
      }
      // If we can't determine the structure, set an empty array
      else {
        console.error('Unexpected API response format:', response.data);
        setUsers([]);
      }
      
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
      console.error('Error fetching users:', err);
      setUsers([]); // Ensure users is an array even in error case
    } finally {
      setLoading(false);
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
      console.error('Error fetching transactions:', err);
      setTransactionHistory([]);
    } finally {
      setTransactionLoading(false);
    }
  };

  const handleOpenModal = (type, user) => {
    setSelectedUser(user);
    setModalType(type);
    setShowModal(true);
    
    if (type === 'changeRole') {
      // Initialize with the user's current role
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
    setError(null); // Clear any errors when closing modal
    setShowTransactionHistory(false);
  };

  const handleDeleteUser = async () => {
    try {
      await axios.delete(`https://keymedia-consult.onrender.com/api/admin/users/${selectedUser._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('igettoken')}`
        }
      });
      setUsers(users.filter(user => user._id !== selectedUser._id));
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
    
    // Check if user has sufficient balance
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

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.username?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query) ||
      (user.phone && user.phone.toLowerCase().includes(query))
    );
  });

  return (
    <AdminLayout>
      <Head>
        <title>User Management | Admin Dashboard</title>
      </Head>
      
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold mb-4 sm:mb-0 dark:text-white">User Management</h1>
          
          {/* Total Money Card */}
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
          
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search users..."
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="absolute right-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 dark:bg-red-900 dark:border-red-600 dark:text-red-200" role="alert">
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
          </div>
        ) : (
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
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
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
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 
                            user.role === 'agent' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}>
                          {user.role || 'user'}
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
                          <span>{(user.wallet?.balance || 0).toFixed(2)} {user.wallet?.currency || 'USD'}</span>
                          <button 
                            onClick={() => handleOpenModal('transactions', user)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 mt-1 dark:text-indigo-400 dark:hover:text-indigo-300">
                            View Transactions
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button 
                            onClick={() => handleOpenModal('deposit', user)}
                            className="text-green-600 hover:text-green-900 bg-green-50 px-2 py-1 rounded dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800">
                            Credit
                          </button>
                          <button 
                            onClick={() => handleOpenModal('debit', user)}
                            className="text-red-600 hover:text-red-900 bg-red-50 px-2 py-1 rounded dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800">
                            Debit
                          </button>
                          <button 
                            onClick={() => handleOpenModal('changeRole', user)}
                            className="text-blue-600 hover:text-blue-900 bg-blue-50 px-2 py-1 rounded dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800">
                            Change Role
                          </button>
                          <button 
                            onClick={() => handleOpenModal('toggleStatus', user)}
                            className={`${user.isActive ? 'text-orange-600 hover:text-orange-900 bg-orange-50 dark:bg-orange-900 dark:text-orange-200 dark:hover:bg-orange-800' : 'text-green-600 hover:text-green-900 bg-green-50 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'} px-2 py-1 rounded`}>
                            {user.isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button 
                            onClick={() => handleOpenModal('deleteApiKey', user)}
                            className="text-yellow-600 hover:text-yellow-900 bg-yellow-50 px-2 py-1 rounded dark:bg-yellow-800 dark:text-yellow-200 dark:hover:bg-yellow-700">
                            Delete API Key
                          </button>
                          <button 
                            onClick={() => handleOpenModal('deleteUser', user)}
                            className="text-red-600 hover:text-red-900 bg-red-50 px-2 py-1 rounded dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal - Using Portal to avoid z-index issues */}
      {showModal && selectedUser && (
        <>
          {/* Modal backdrop - higher z-index than sidebar */}
          <div className="fixed inset-0 z-50 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-gray-900 dark:bg-opacity-75"></div>
          
          {/* Modal dialog - even higher z-index */}
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
              <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${modalType === 'transactions' ? 'sm:max-w-4xl' : 'sm:max-w-lg'} sm:w-full dark:bg-gray-800`}>
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

                    {modalType === 'deleteApiKey' && (
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Delete API Key</h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500 dark:text-gray-300">
                            Are you sure you want to delete the API key for user "{selectedUser.username}"? This will revoke API access.
                          </p>
                        </div>
                      </div>
                    )}

                    {modalType === 'deposit' && (
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Credit User Wallet</h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
                            Add funds to {selectedUser.username}'s wallet. Current balance: {(selectedUser.wallet?.balance || 0).toFixed(2)} {selectedUser.wallet?.currency || 'USD'}
                          </p>
                          <form onSubmit={handleDeposit}>
                            <div className="mb-4">
                              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount ({selectedUser.wallet?.currency || 'USD'})</label>
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
                            Deduct funds from {selectedUser.username}'s wallet. Current balance: {(selectedUser.wallet?.balance || 0).toFixed(2)} {selectedUser.wallet?.currency || 'USD'}
                          </p>
                          <form onSubmit={handleDebit}>
                            <div className="mb-4">
                              <label htmlFor="debit-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount ({selectedUser.wallet?.currency || 'USD'})</label>
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
                                <option value="admin">Admin</option>
                              </select>
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
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Admin</th>
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
                                            {transaction.type === 'deposit' ? '+' : '-'}{transaction.amount.toFixed(2)} {transaction.currency || 'USD'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                          {transaction.balanceAfter?.toFixed(2) || 'N/A'} {transaction.currency || 'USD'}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                          {transaction.description || 'N/A'}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                          {transaction.processedByInfo?.username || 'N/A'}
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
                        className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 ${selectedUser.isActive ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'} text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm`}
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

                  {modalType === 'deleteApiKey' && (
                    <>
                      <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-600 text-base font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:ml-3 sm:w-auto sm:text-sm"
                        onClick={handleDeleteApiKey}
                      >
                        Delete API Key
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