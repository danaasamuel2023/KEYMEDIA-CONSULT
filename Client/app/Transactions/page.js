// pages/admin/transactions/index.js
'use client'
import { useState, useEffect } from 'react';
import axios from 'axios';
import Head from 'next/head';
import AdminLayout from '@/components/adminWraper';
import { format } from 'date-fns';

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'deposit', 'debit'
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    fetchTransactions();
  }, [currentPage, filter]); // Re-fetch when page or filter changes
  
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      // Add pagination and filtering directly to the API call
      const response = await axios.get('https://iget.onrender.com/api/admin/transactions', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('igettoken')}`
        },
        params: {
          page: currentPage,
          limit: 20,
          type: filter !== 'all' ? filter : undefined
        }
      });
      
      if (response.data && Array.isArray(response.data.data)) {
        setTransactions(response.data.data);
        
        // Set pagination data if available
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages);
        }
      } else {
        console.error('Unexpected API response format:', response.data);
        setTransactions([]);
      }
      
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch transactions');
      console.error('Error fetching transactions:', err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Apply client-side search filtering
  const filteredTransactions = transactions.filter(txn => {
    // No need to filter by type since we're doing that server-side now
    
    // Apply search query
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      txn.reference?.toLowerCase().includes(query) ||
      txn.description?.toLowerCase().includes(query) ||
      txn.user?.username?.toLowerCase().includes(query) ||
      txn.processedByInfo?.username?.toLowerCase().includes(query)
    );
  });
  
  // Handle pagination
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };
  
  return (
    <AdminLayout>
      <Head>
        <title>Transaction History | Admin Dashboard</title>
      </Head>
      
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold mb-4 sm:mb-0 dark:text-white">Transaction History</h1>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search transactions..."
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
            
            <select
              className="px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              value={filter}
              onChange={handleFilterChange}
            >
              <option value="all">All Transactions</option>
              <option value="deposit">Deposits Only</option>
              <option value="debit">Debits Only</option>
            </select>
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Reference</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">User</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Amount</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Description</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Processed By</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((txn) => (
                    <tr key={txn._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {txn.reference}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {txn.user?.username || 'Unknown User'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {txn.user?.email || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${txn.type === 'deposit' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                          'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'}`}>
                          {txn.type === 'deposit' ? 'Deposit' : 'Debit'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        <span className={txn.type === 'deposit' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}>
                          {txn.type === 'deposit' ? '+' : '-'}{txn.amount} {txn.currency || 'GHS'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {txn.description || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {txn.processedByInfo?.username || 'Unknown Admin'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {txn.processedByInfo?.email || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {txn.createdAt ? format(new Date(txn.createdAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <nav className="flex items-center">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-l-md border ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:border-gray-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700'
                }`}
              >
                Previous
              </button>
              
              <div className="px-4 py-1 border-t border-b bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-r-md border ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:border-gray-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700'
                }`}
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}