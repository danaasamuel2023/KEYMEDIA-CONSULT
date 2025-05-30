// components/SMSMessaging.js
'use client'
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageCircle, Users, User, Send, Filter, CheckCircle, AlertCircle, X } from 'lucide-react';
import AdminLayout from '@/components/adminWraper';

const SMSMessaging = () => {
  // State variables
  const [message, setMessage] = useState('');
  const [senderID, setSenderID] = useState('EL VENDER');
  const [isSending, setIsSending] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [messageType, setMessageType] = useState('all'); // 'all', 'selected', 'single'
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [smsBalance, setSmsBalance] = useState(null);
  const [filters, setFilters] = useState({
    role: '',
    isActive: true
  });
  const [notification, setNotification] = useState(null);
  const formRef = useRef(null);

  // Get token from local storage
  const getToken = () => {
    return localStorage.getItem('igettoken');
  };

  // Create axios instance with authorization header
  const createAuthAxios = () => {
    const token = getToken();
    return axios.create({
      headers: {
        'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}`
      }
    });
  };

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
    checkSmsBalance();
  }, []);

  // Scroll to top when notification changes
  useEffect(() => {
    if (notification) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [notification]);

  // Fetch users from the API
  const fetchUsers = async () => {
    try {
      const authAxios = createAuthAxios();
      const response = await authAxios.get('https://keymedia-consult.onrender.com/api/admin/users');
      setUsers(response.data.data || []);
    } catch (err) {
      showError('Failed to fetch users. Please check your connection.');
      console.error('Error fetching users:', err);
    }
  };

  // Check SMS balance
  const checkSmsBalance = async () => {
    try {
      const authAxios = createAuthAxios();
      const response = await authAxios.get('https://keymedia-consult.onrender.com/api/messages/sms-balance');
      setSmsBalance(response.data.data);
    } catch (err) {
      console.error('Error checking SMS balance:', err);
    }
  };

  // Show error notification
  const showError = (message) => {
    setError(message);
    setNotification({
      type: 'error',
      message
    });
    
    // Auto-dismiss error after 5 seconds
    setTimeout(() => {
      setNotification(null);
      setError(null);
    }, 5000);
  };

  // Show success notification
  const showSuccess = (result) => {
    setResult(result);
    setNotification({
      type: 'success',
      message: `Successfully sent to ${result.successful} out of ${result.total} recipients.${
        result.failed > 0 ? ` ${result.failed} messages failed to send.` : ''
      }`
    });
    
    // Auto-dismiss success after 5 seconds
    setTimeout(() => {
      setNotification(null);
      setResult(null);
    }, 5000);
  };

  // Handle sending SMS to all users
  const handleSendToAll = async () => {
    if (!message) {
      showError('Message content is required');
      return;
    }

    try {
      setIsSending(true);
      setError(null);
      
      const authAxios = createAuthAxios();
      const response = await authAxios.post('https://keymedia-consult.onrender.com/api/messages/send-to-all', {
        message,
        senderID,
        filters
      });
      
      showSuccess(response.data.results);
      setMessage('');
      checkSmsBalance(); // Update balance after sending
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to send messages. Please try again.');
      console.error('Error sending messages:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Handle sending SMS to selected users
  const handleSendToSelected = async () => {
    if (!message) {
      showError('Message content is required');
      return;
    }

    if (!selectedUsers.length) {
      showError('Please select at least one user');
      return;
    }

    try {
      setIsSending(true);
      setError(null);
      
      const authAxios = createAuthAxios();
      const response = await authAxios.post('https://keymedia-consult.onrender.com/api/messages/send-to-selected', {
        message,
        senderID,
        userIds: selectedUsers
      });
      
      showSuccess(response.data.results);
      setMessage('');
      setSelectedUsers([]);
      checkSmsBalance(); // Update balance after sending
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to send messages. Please try again.');
      console.error('Error sending messages:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Handle sending SMS to a single user
  const handleSendToSingleUser = async (userId) => {
    if (!message) {
      showError('Message content is required');
      return;
    }

    try {
      setIsSending(true);
      setError(null);
      
      const authAxios = createAuthAxios();
      const response = await authAxios.post(`https://keymedia-consult.onrender.com/api/messages/send-to-user/${userId}`, {
        message,
        senderID
      });
      
      showSuccess({
        total: 1,
        successful: response.data.success ? 1 : 0,
        failed: response.data.success ? 0 : 1
      });
      
      setMessage('');
      checkSmsBalance(); // Update balance after sending
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to send message. Please try again.');
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Handle user selection
  const handleUserSelect = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Handle sending based on message type
  const handleSend = () => {
    switch (messageType) {
      case 'all':
        handleSendToAll();
        break;
      case 'selected':
        handleSendToSelected();
        break;
      case 'single':
        if (selectedUsers.length === 1) {
          handleSendToSingleUser(selectedUsers[0]);
        } else {
          showError('Please select exactly one user for single message');
        }
        break;
      default:
        handleSendToAll();
    }
  };

  // Dismiss notification
  const dismissNotification = () => {
    setNotification(null);
    setError(null);
    setResult(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto dark:bg-gray-900 dark:text-gray-100">
      {/* Fixed notification bar */}
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-3xl shadow-lg rounded-lg px-6 py-4 flex items-center justify-between ${
          notification.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/70 border-l-4 border-green-500' 
            : 'bg-red-50 dark:bg-red-900/70 border-l-4 border-red-500'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <CheckCircle className="text-green-500 dark:text-green-400 mr-3 flex-shrink-0" size={24} />
            ) : (
              <AlertCircle className="text-red-500 dark:text-red-400 mr-3 flex-shrink-0" size={24} />
            )}
            <p className={notification.type === 'success' 
              ? 'text-green-700 dark:text-green-200' 
              : 'text-red-700 dark:text-red-200'
            }>
              {notification.message}
            </p>
          </div>
          <button 
            onClick={dismissNotification}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center dark:text-white">
          <MessageCircle className="mr-2 dark:text-blue-400" size={24} />
          SMS Messaging Dashboard
        </h1>
        
        {smsBalance && (
          <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-md mb-4">
            <p className="text-blue-700 dark:text-blue-300 font-medium">
              SMS Balance: {smsBalance.balance} {smsBalance.currency}
            </p>
          </div>
        )}
      </div>

      <div ref={formRef} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message Type</label>
          <div className="flex flex-wrap gap-2">
            <button
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                messageType === 'all' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200' 
                  : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              onClick={() => setMessageType('all')}
            >
              <Users size={18} className="mr-1" />
              All Users
            </button>
            <button
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                messageType === 'selected' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200' 
                  : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              onClick={() => setMessageType('selected')}
            >
              <User size={18} className="mr-1" />
              Selected Users
            </button>
            <button
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                messageType === 'single' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200' 
                  : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              onClick={() => setMessageType('single')}
            >
              <MessageCircle size={18} className="mr-1" />
              Single User
            </button>
          </div>
        </div>

        {messageType === 'all' && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-md">
            <div className="flex items-center mb-2">
              <Filter size={18} className="mr-1 dark:text-gray-300" />
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Filters</label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">User Role</label>
                <select 
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  value={filters.role}
                  onChange={(e) => setFilters({...filters, role: e.target.value})}
                >
                  <option value="">All Roles</option>
                  <option value="user">User</option>
                  <option value="vendor">Vendor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Status</label>
                <select 
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  value={filters.isActive.toString()}
                  onChange={(e) => setFilters({...filters, isActive: e.target.value === 'true'})}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                  <option value="">All</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {(messageType === 'selected' || messageType === 'single') && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Users {messageType === 'single' ? '(select one user)' : `(${selectedUsers.length} selected)`}
            </label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-md max-h-60 overflow-y-auto bg-white dark:bg-gray-700">
              {users.length === 0 ? (
                <div className="p-4 text-gray-500 dark:text-gray-400 flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading users...
                </div>
              ) : (
                users.map(user => (
                  <div 
                    key={user._id} 
                    className={`flex items-center p-3 border-b border-gray-100 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-colors ${
                      selectedUsers.includes(user._id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                    onClick={() => {
                      if (messageType === 'single') {
                        setSelectedUsers([user._id]);
                      } else {
                        handleUserSelect(user._id);
                      }
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={selectedUsers.includes(user._id)} 
                      onChange={() => {}} 
                      className="mr-3 accent-blue-600 dark:accent-blue-500 h-4 w-4"
                    />
                    <div className="flex-grow">
                      <p className="font-medium dark:text-gray-200">{user.username}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.phone || 'No phone'}</p>
                    </div>
                    {user.role && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                        user.role === 'vendor' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {user.role}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sender ID
          </label>
          <input 
            type="text" 
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            value={senderID}
            onChange={(e) => setSenderID(e.target.value)}
            placeholder="Sender ID (max 11 characters)"
            maxLength={11}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Max 11 characters, alphanumeric only
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Message
          </label>
          <textarea
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md h-32 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
          ></textarea>
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {message.length} characters ({Math.ceil(message.length / 160)} SMS)
            </p>
            <p className={`text-xs ${message.length > 160 * 2 ? 'text-orange-500 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}>
              {message.length > 160 && `Message will be split into ${Math.ceil(message.length / 160)} parts`}
            </p>
          </div>
        </div>

        <button
          className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white py-3 px-4 rounded-md transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          onClick={handleSend}
          disabled={isSending || !message}
        >
          {isSending ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending...
            </>
          ) : (
            <>
              <Send size={18} className="mr-2" />
              Send Message
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Wrap the component with AdminLayout and export it
const SMSMessagingWithAdminLayout = () => (
  <AdminLayout>
    <SMSMessaging />
  </AdminLayout>
);

export default SMSMessagingWithAdminLayout;