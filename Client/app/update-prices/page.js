'use client'

import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Search, AlertCircle, X, Edit2, Save, Check, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';
import AdminLayout from '@/components/adminWraper';

const BundlePriceList = () => {
  const [bundleData, setBundleData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBundle, setEditingBundle] = useState(null);
  const [editPrices, setEditPrices] = useState({
    standard: '',
    admin: '',
    user: '',
    agent: '',
    Editor: ''
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedBundle, setExpandedBundle] = useState(null);
  
  const bundleTypes = [
    'mtnup2u',
    'mtn-justforu',
    'AT-ishare',
    'Telecel-5959',
    'AfA-registration',
  ];

  const userRoles = [
    { id: 'admin', label: 'Admin' },
    { id: 'user', label: 'User' },
    { id: 'agent', label: 'Agent' },
    { id: 'Editor', label: 'Editor' },
    { id: 'super_agent', label: 'Super Agent' } // Added Super Agent role
  ];

  useEffect(() => {
    fetchAllBundles();
  }, []);

  const fetchAllBundles = async () => {
    setRefreshing(true);
    setLoading(true);
    
    try {
      const token = localStorage.getItem('igettoken');
      const results = {};
      
      // Fetch all bundle types in parallel
      const requests = bundleTypes.map(type => 
        axios.get(`https://keymedia-consult.onrender.com/api/iget/bundle/${type}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(response => {
          results[type] = response.data.data;
        })
        .catch(err => {
          console.error(`Error fetching ${type} bundles:`, err);
          results[type] = []; // Set empty array for failed requests
        })
      );
      
      await Promise.all(requests);
      setBundleData(results);
    } catch (err) {
      setError('Failed to fetch bundle data. Please try again.');
      console.error('Bundle fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredBundleTypes = searchTerm 
    ? bundleTypes.filter(type => type.toLowerCase().includes(searchTerm.toLowerCase()))
    : bundleTypes;

  const filteredBundles = (type) => {
    const bundles = bundleData[type] || [];
    if (!searchTerm) return bundles;
    
    return bundles.filter(bundle => 
      (bundle.capacity.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bundle.price.toString().includes(searchTerm))
    );
  };

  const showAnyResults = filteredBundleTypes.some(type => filteredBundles(type).length > 0);
  
  const toggleBundleDetails = (bundleId) => {
    setExpandedBundle(expandedBundle === bundleId ? null : bundleId);
  };

  const startEditing = (bundle) => {
    setEditingBundle(bundle._id);
    
    // Initialize with current values
    setEditPrices({
      standard: bundle.price.toString(),
      admin: bundle.rolePricing?.admin?.toString() || bundle.price.toString(),
      user: bundle.rolePricing?.user?.toString() || bundle.price.toString(),
      agent: bundle.rolePricing?.agent?.toString() || bundle.price.toString(),
      Editor: bundle.rolePricing?.Editor?.toString() || bundle.price.toString()
    });
  };
  
  const cancelEditing = () => {
    setEditingBundle(null);
    setEditPrices({
      standard: '',
      admin: '',
      user: '',
      agent: '',
      Editor: ''
    });
  };
  
  const handlePriceChange = (role, value) => {
    setEditPrices(prev => ({
      ...prev,
      [role]: value
    }));
  };
  
  const updateBundlePrice = async (bundleId, bundleType) => {
    // Validate prices
    for (const [role, price] of Object.entries(editPrices)) {
      if (!price.trim() || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
        setError(`Invalid price for ${role === 'standard' ? 'standard price' : role} role`);
        return;
      }
    }
    
    setUpdateLoading(true);
    
    try {
      const token = localStorage.getItem('igettoken');
      
      // Format role pricing data for API
      const rolePricing = {
        admin: parseFloat(editPrices.admin),
        user: parseFloat(editPrices.user),
        agent: parseFloat(editPrices.agent),
        Editor: parseFloat(editPrices.Editor)
      };
      
      await axios.put(`https://keymedia-consult.onrender.com/api/iget/${bundleId}`, {
        price: parseFloat(editPrices.standard),
        rolePricing
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state to reflect the change
      setBundleData(prevData => {
        const updatedBundles = [...prevData[bundleType]];
        const bundleIndex = updatedBundles.findIndex(b => b._id === bundleId);
        
        if (bundleIndex !== -1) {
          updatedBundles[bundleIndex] = {
            ...updatedBundles[bundleIndex],
            price: parseFloat(editPrices.standard),
            rolePricing
          };
        }
        
        return {
          ...prevData,
          [bundleType]: updatedBundles
        };
      });
      
      setSuccessMessage('Prices updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      cancelEditing();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update prices');
    } finally {
      setUpdateLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bundle Prices</h1>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <div className="relative flex-grow sm:flex-grow-0">
              <input
                type="text"
                placeholder="Search bundles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </button>
              )}
            </div>
            
            <button
              onClick={fetchAllBundles}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="flex-grow">{error}</span>
            <button onClick={() => setError('')} className="flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span className="flex-grow">{successMessage}</span>
            <button onClick={() => setSuccessMessage('')} className="flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {!showAnyResults && !loading && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>
              {searchTerm 
                ? `No bundles found matching "${searchTerm}". Try a different search term.`
                : 'No bundles found. Try refreshing the page.'}
            </span>
          </div>
        )}

        <div className="space-y-6">
          {filteredBundleTypes.map((type) => {
            const bundles = filteredBundles(type);
            if (bundles.length === 0) return null;
            
            return (
              <div key={type} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{type}</h2>
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {bundles.map((bundle) => (
                      <div 
                        key={bundle._id}
                        className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                      >
                        {editingBundle === bundle._id ? (
                          // Editing mode
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                {(bundle.capacity)} GB
                              </span>
                            </div>
                            
                            <div className="space-y-2">
                              {/* Standard price edit */}
                              <div className="flex items-center">
                                <span className="text-gray-700 dark:text-gray-300 mr-2 w-20">Standard:</span>
                                <div className="flex items-center flex-1">
                                  <span className="text-gray-700 dark:text-gray-300 mr-1">GH¢</span>
                                  <input
                                    type="number"
                                    value={editPrices.standard}
                                    onChange={(e) => handlePriceChange('standard', e.target.value)}
                                    className="flex-grow p-1 border rounded w-full bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                                    step="0.01"
                                    min="0"
                                  />
                                </div>
                              </div>
                              
                              {/* Role-based prices edit */}
                              {userRoles.map(role => (
                                <div key={role.id} className="flex items-center">
                                  <span className="text-gray-700 dark:text-gray-300 mr-2 w-20 capitalize">
                                    {role.label}:
                                  </span>
                                  <div className="flex items-center flex-1">
                                    <span className="text-gray-700 dark:text-gray-300 mr-1">GH¢</span>
                                    <input
                                      type="number"
                                      value={editPrices[role.id]}
                                      onChange={(e) => handlePriceChange(role.id, e.target.value)}
                                      className="flex-grow p-1 border rounded w-full bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                                      step="0.01"
                                      min="0"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <div className="flex justify-between mt-2">
                              <button
                                onClick={() => updateBundlePrice(bundle._id, type)}
                                disabled={updateLoading}
                                className="p-2 text-sm bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-700 flex items-center gap-1"
                              >
                                {updateLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="p-2 text-sm bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500 flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Display mode
                          <div className="flex flex-col">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                {(bundle.capacity)} GB
                              </span>
                              <button
                                onClick={() => startEditing(bundle)}
                                className="p-1 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                title="Edit prices"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="flex justify-between items-center mt-2">
                              <div className="text-gray-700 dark:text-gray-300 font-medium">
                                GH¢ {parseFloat(bundle.price).toFixed(2)}
                              </div>
                              <button 
                                onClick={() => toggleBundleDetails(bundle._id)}
                                className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                title={expandedBundle === bundle._id ? "Hide role prices" : "Show role prices"}
                              >
                                {expandedBundle === bundle._id ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                            
                            {/* Expanded role pricing details */}
                            {expandedBundle === bundle._id && (
                              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 text-sm">
                                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Role Prices:</h4>
                                {bundle.rolePricing ? (
                                  <div className="space-y-1">
                                    {userRoles.map(role => (
                                      <div key={role.id} className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400 capitalize">{role.label}:</span>
                                        <span className="text-gray-800 dark:text-gray-200">
                                          GH¢ {parseFloat(bundle.rolePricing[role.id] || bundle.price).toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-gray-500 dark:text-gray-400">
                                    No role-specific pricing set
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default BundlePriceList;