'use client'
import { useState, useEffect } from 'react';
import axios from 'axios';
import Head from 'next/head';
import AdminLayout from '@/components/adminWraper';
import * as XLSX from 'xlsx';
import { Phone, User, Search } from 'lucide-react';

export default function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [displayedOrders, setDisplayedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState({
    status: '',
    bundleType: '',
    startDate: '',
    endDate: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [itemsPerPage] = useState(20);
  const [senderID, setSenderID] = useState('EL VENDER'); // New state for sender ID

  // Fetch orders on component mount
  useEffect(() => {
    fetchOrders();
  }, []);

  // First, apply filters to get filtered orders list
  useEffect(() => {
    if (orders.length > 0) {
      applyFilters();
    }
  }, [filter, orders, searchQuery]);

  // Then, update the displayed orders based on pagination
  useEffect(() => {
    updateDisplayedOrders();
  }, [filteredOrders, currentPage, itemsPerPage]);
  
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all orders without pagination for client-side filtering
      const response = await axios.get(`https://iget.onrender.com/api/orders/all?limit=1000`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('igettoken')}`
        }
      });
      
      if (response.data && response.data.success) {
        // Store all orders
        const allOrders = response.data.data || [];
        setOrders(allOrders);
        
        // Initial filtering will be applied by the useEffect
        console.log(`Fetched ${allOrders.length} total orders`);
      } else {
        setOrders([]);
        setFilteredOrders([]);
        setDisplayedOrders([]);
        setError('Failed to fetch orders data');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch orders');
      console.error('Error fetching orders:', err);
      setOrders([]);
      setFilteredOrders([]);
      setDisplayedOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    // Start with all orders
    let result = [...orders];
    
    // Apply search filter first
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(order => 
        // Search by order ID or reference
        (order._id && order._id.toLowerCase().includes(query)) ||
        (order.orderReference && order.orderReference.toLowerCase().includes(query)) ||
        // Search by user information
        (order.user?.username && order.user.username.toLowerCase().includes(query)) ||
        (order.user?.email && order.user.email.toLowerCase().includes(query)) ||
        (order.user?.phone && order.user.phone.toLowerCase().includes(query)) ||
        // Search by recipient number
        (order.recipientNumber && order.recipientNumber.toLowerCase().includes(query)) ||
        // Search by AfA registration metadata
        (order.metadata?.fullName && order.metadata.fullName.toLowerCase().includes(query)) ||
        (order.phoneNumber && order.phoneNumber.toLowerCase().includes(query))
      );
    }
    
    // Apply status filter
    if (filter.status) {
      result = result.filter(order => order.status === filter.status);
    }
    
    // Apply bundle type filter
    if (filter.bundleType) {
      result = result.filter(order => order.bundleType === filter.bundleType);
    }
    
    // Apply date range filters
    if (filter.startDate) {
      const startDate = new Date(filter.startDate);
      startDate.setHours(0, 0, 0, 0);
      result = result.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= startDate;
      });
    }
    
    if (filter.endDate) {
      const endDate = new Date(filter.endDate);
      endDate.setHours(23, 59, 59, 999);
      result = result.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate <= endDate;
      });
    }
    
    // Update filtered orders and calculate total pages
    setFilteredOrders(result);
    const total = Math.ceil(result.length / itemsPerPage);
    setTotalPages(total > 0 ? total : 1);
    
    // Reset to first page when filters change
    setCurrentPage(1);
    
    console.log(`Applied filters: ${result.length} orders match the criteria`);
  };

  const updateDisplayedOrders = () => {
    // Apply pagination to filtered orders
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedResult = filteredOrders.slice(startIndex, startIndex + itemsPerPage);
    setDisplayedOrders(paginatedResult);
    
    console.log(`Page ${currentPage}: Showing ${paginatedResult.length} orders (${startIndex + 1}-${startIndex + paginatedResult.length} of ${filteredOrders.length})`);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Updated to include senderID
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.put(`https://iget.onrender.com/api/orders/${orderId}/status`, {
        status: newStatus,
        senderID: senderID // Include senderID in the request
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('igettoken')}`
        }
      });
      
      if (response.data && response.data.success) {
        // Update the order in all orders array
        const updatedOrders = orders.map(order => 
          order._id === orderId ? { ...order, status: newStatus } : order
        );
        setOrders(updatedOrders);
        
        // Re-apply filters to update filtered and displayed orders
        const updatedFiltered = filteredOrders.map(order => 
          order._id === orderId ? { ...order, status: newStatus } : order
        );
        setFilteredOrders(updatedFiltered);
        
        const updatedDisplayed = displayedOrders.map(order => 
          order._id === orderId ? { ...order, status: newStatus } : order
        );
        setDisplayedOrders(updatedDisplayed);
      } else {
        setError('Failed to update order status');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update order status');
      console.error('Error updating order status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Updated to include senderID
  const handleBulkStatusChange = async (newStatus) => {
    if (!newStatus || selectedOrders.length === 0) {
      setError('Please select at least one order and a status to update');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const updatePromises = selectedOrders.map(orderId => 
        axios.put(`https://iget.onrender.com/api/orders/${orderId}/status`, {
          status: newStatus,
          senderID: senderID // Include senderID in the request
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('igettoken')}`
          }
        })
      );
      
      await Promise.all(updatePromises);
      
      // Update orders in all states
      const updatedOrders = orders.map(order => 
        selectedOrders.includes(order._id) ? { ...order, status: newStatus } : order
      );
      setOrders(updatedOrders);
      
      const updatedFiltered = filteredOrders.map(order => 
        selectedOrders.includes(order._id) ? { ...order, status: newStatus } : order
      );
      setFilteredOrders(updatedFiltered);
      
      const updatedDisplayed = displayedOrders.map(order => 
        selectedOrders.includes(order._id) ? { ...order, status: newStatus } : order
      );
      setDisplayedOrders(updatedDisplayed);
      
      // Clear selected orders
      setSelectedOrders([]);
      setBulkStatus('');
    } catch (err) {
      setError('Failed to update multiple orders');
      console.error('Error updating multiple orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelect = (orderId) => {
    setSelectedOrders(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId);
      } else {
        return [...prev, orderId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === displayedOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(displayedOrders.map(order => order._id));
    }
  };

  const handleSelectAllFiltered = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(order => order._id));
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    // Manually trigger filter application
    applyFilters();
  };

  const resetFilters = () => {
    setFilter({
      status: '',
      bundleType: '',
      startDate: '',
      endDate: ''
    });
    setSearchQuery('');
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
      case 'refunded':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100';
    }
  };

  const exportToExcel = async () => {
    try {
      // Determine which orders to export - selected orders if any are selected, otherwise all filtered orders
      const ordersToExport = selectedOrders.length > 0 
        ? orders.filter(order => selectedOrders.includes(order._id))
        : filteredOrders;
      
      // Create a simpler Excel structure focusing on number and capacity
      const excelData = ordersToExport.map(order => ({
        'Recipient Number': order.recipientNumber || order.phoneNumber || 'N/A', 
        'Capacity (GB)': order.capacity ? (order.capacity).toFixed(1) : 0,
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
      
      // Auto-size columns
      const maxWidth = excelData.reduce((w, r) => Math.max(w, r['Recipient Number'].length), 10);
      const wscols = [
        { wch: maxWidth }, // Recipient Number 
        { wch: 12 },       // Capacity
      ];
      worksheet['!cols'] = wscols;
      
      const filename = selectedOrders.length > 0 
        ? `Selected_Orders_Export_${new Date().toISOString().slice(0,10)}.xlsx` 
        : `Orders_Export_${new Date().toISOString().slice(0,10)}.xlsx`;
      
      XLSX.writeFile(workbook, filename);
    } catch (err) {
      setError('Failed to export orders to Excel');
      console.error('Error exporting orders:', err);
    }
  };

  return (
    <AdminLayout>
      <Head>
        <title>Orders Management | Admin Dashboard</title>
      </Head>
      
      <div className="p-4 sm:p-6 max-w-7xl mx-auto bg-white dark:bg-gray-900">
        {/* Header with Sender ID input */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold mb-4 sm:mb-0 text-gray-900 dark:text-white">Order Management</h1>
          <div className="flex flex-wrap gap-2 items-center">
            {/* New Sender ID input field */}
            <div className="flex items-center space-x-2">
              <label htmlFor="senderID" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                SMS Sender ID:
              </label>
              <input
                type="text"
                id="senderID"
                value={senderID}
                onChange={(e) => setSenderID(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md p-2 text-sm"
                placeholder="Sender ID"
                maxLength="11"
              />
            </div>
            
            {selectedOrders.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedOrders.length} orders selected:
                </span>
                <select
                  className="text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md p-2"
                  value={bulkStatus}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkStatusChange(e.target.value);
                    } else {
                      setBulkStatus(e.target.value);
                    }
                  }}
                >
                  <option value="">Bulk Update Status</option>
                  <option value="pending">Set All to Pending</option>
                  <option value="processing">Set All to Processing</option>
                  <option value="completed">Set All to Completed</option>
                  <option value="failed">Set All to Failed</option>
                  <option value="refunded">Set All to Refunded</option>
                </select>
                <button
                  onClick={handleSelectAllFiltered}
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {selectedOrders.length === filteredOrders.length 
                    ? "Deselect All Filtered" 
                    : "Select All Filtered Orders"}
                </button>
              </div>
            ) : null}
            <button
              onClick={exportToExcel}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {selectedOrders.length > 0 
                ? `Export Selected (${selectedOrders.length})` 
                : `Export All Filtered (${filteredOrders.length})`}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by ID, username, email, phone or recipient number..."
              className="pl-10 pr-10 py-2 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button 
                  onClick={clearSearch}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter Form */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
          <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Status</label>
              <select
                id="status"
                name="status"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={filter.status}
                onChange={handleFilterChange}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="bundleType" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Bundle Type</label>
              <select
                id="bundleType"
                name="bundleType"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={filter.bundleType}
                onChange={handleFilterChange}
              >
                <option value="">All Types</option>
                <option value="mtnup2u">MTN Up2U</option>
                <option value="mtn-justforu">MTN JustForU</option>
                <option value="AT-ishare">AT iShare</option>
                <option value="Telecel-5959">Telecel 5959</option>
                <option value="AfA-registration">AfA Registration</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Start Date</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={filter.startDate}
                onChange={handleFilterChange}
              />
            </div>
            
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-200">End Date</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={filter.endDate}
                onChange={handleFilterChange}
              />
            </div>
            
            <div className="md:col-span-2 lg:col-span-4 flex flex-wrap gap-2">
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Reset All Filters
              </button>
            </div>
          </form>
        </div>

        {/* Data Stats with Sender ID info */}
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 flex flex-wrap gap-4">
          <div>Total Orders: <span className="font-semibold">{orders.length}</span></div>
          <div>Filtered Orders: <span className="font-semibold">{filteredOrders.length}</span></div>
          <div>Current Page: <span className="font-semibold">{currentPage} of {totalPages}</span></div>
          <div>Displayed Orders: <span className="font-semibold">{displayedOrders.length}</span></div>
          <div>SMS Sender ID: <span className="font-semibold">{senderID}</span></div>
          {searchQuery && (
            <div>Search Results: <span className="font-semibold">{filteredOrders.length} matching "{searchQuery}"</span></div>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-100 p-4 mb-4" role="alert">
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="overflow-x-auto w-full">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                          onChange={handleSelectAll}
                          checked={displayedOrders.length > 0 && selectedOrders.length === displayedOrders.length}
                        />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Order ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Bundle Type</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Recipient</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Capacity</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {displayedOrders.length > 0 ? (
                    displayedOrders.map((order) => (
                      <tr key={order._id} className={selectedOrders.includes(order._id) ? "bg-indigo-50 dark:bg-indigo-900" : ""}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                              onChange={() => handleOrderSelect(order._id)}
                              checked={selectedOrders.includes(order._id)}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {order.orderReference || order._id.substring(0, 8) + '...'}
                        </td>
                        
                        {/* Special display for AfA-registration bundle type */}
                        {order.bundleType === 'AfA-registration' ? (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <User className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {order.metadata?.fullName || order.user?.username || 'N/A'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {order.bundleType}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Phone className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {order.phoneNumber || order.recipientNumber || order.user?.phone || 'N/A'}
                                </div>
                              </div>
                            </td>
                            {/* Empty capacity cell for AfA registrations */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              -
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">{order.user?.username || 'N/A'}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{order.user?.email || 'N/A'}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{order.user?.phone || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {order.bundleType}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {order.recipientNumber || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {order.capacity ? (order.capacity) : 'N/A'} GB
                            </td>
                          </>
                        )}
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          ₵{order.price?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {/* Updated to show sender ID will be used */}
                          <div className="flex flex-col space-y-2">
                            <select 
                              className="text-sm text-indigo-600 dark:text-indigo-400 bg-transparent border border-indigo-300 dark:border-indigo-700 rounded-md p-1"
                              value={order.status || ''}
                              onChange={(e) => handleStatusChange(order._id, e.target.value)}
                            >
                              <option value="" disabled>Change Status</option>
                              <option value="pending" className="bg-white dark:bg-gray-700">Pending</option>
                              <option value="processing" className="bg-white dark:bg-gray-700">Processing</option>
                              <option value="completed" className="bg-white dark:bg-gray-700">Completed</option>
                              <option value="failed" className="bg-white dark:bg-gray-700">Failed</option>
                              <option value="refunded" className="bg-white dark:bg-gray-700">Refunded</option>
                            </select>
                            <span className="text-xs text-gray-500 dark:text-gray-400">SMS: {senderID}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        {searchQuery || Object.values(filter).some(v => v !== '') 
                          ? "No orders found matching your filters" 
                          : "No orders found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredOrders.length > 0 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 flex flex-wrap items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6 mt-4 rounded-lg shadow">
            <div className="flex-1 flex flex-wrap justify-between">
              <div className="mb-2 sm:mb-0">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredOrders.length)}
                  </span> of{' '}
                  <span className="font-medium">{filteredOrders.length}</span> orders
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${
                      currentPage === 1 ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Page numbers - more visible pages for better navigation */}
                  {[...Array(totalPages).keys()].map((number) => {
                    const pageNumber = number + 1;
                    
                    // Show first and last pages, and a range around current page
                    if (
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      (pageNumber >= Math.max(1, currentPage - 2) && 
                       pageNumber <= Math.min(totalPages, currentPage + 2))
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`relative inline-flex items-center px-4 py-2 border ${
                            currentPage === pageNumber
                              ? 'z-10 bg-indigo-50 dark:bg-indigo-900 border-indigo-500 text-indigo-600 dark:text-indigo-200'
                              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                          } text-sm font-medium`}
                        >
                          {pageNumber}
                        </button>
                      );
                    }
                    
                    // Show ellipsis for gaps
                    if ((pageNumber === 2 && currentPage > 4) ||
                        (pageNumber === totalPages - 1 && currentPage < totalPages - 3)) {
                      return (
                        <span 
                          key={`ellipsis-${pageNumber}`} 
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          ...
                        </span>
                      );
                    }
                    
                    return null;
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${
                      currentPage === totalPages ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
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
      </div>
    </AdminLayout>
  );
}