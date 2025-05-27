'use client'

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '@/components/adminWraper';

const BundleManagement = () => {
  const [bundles, setBundles] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingBundle, setEditingBundle] = useState(null);
  
  // Form states
  const [bundleForm, setBundleForm] = useState({
    type: '',
    price: '',
    capacity: '',
    rolePricing: {
      admin: '',
      user: '',
      agent: '',
      Editor: ''
    }
  });
  
  const bundleTypes = [
    'mtnup2u',
    'mtn-justforu',
    'AT-ishare',
    'Telecel-5959',
    'AfA-registration',
  ];

  const userRoles = [
    { id: 'user', label: 'User' },
    { id: 'admin', label: 'Admin' },
    { id: 'agent', label: 'Agent' },
    { id: 'Editor', label: 'Editor' }
  ];

  // Fetch bundles by type
  const fetchBundles = async (type) => {
    if (!type) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('igettoken');
      const response = await axios.get(`https://iget.onrender.com/api/iget/bundle/${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBundles(response.data.data);
    } catch (err) {
      showMessage('error', err.response?.data?.message || 'Failed to fetch bundles');
    } finally {
      setLoading(false);
    }
  };

  // Handle type selection
  const handleTypeChange = (e) => {
    const type = e.target.value;
    setSelectedType(type);
    setEditingBundle(null);
    setBundleForm({
      type,
      price: '',
      capacity: '',
      rolePricing: {
        admin: '',
        user: '',
        agent: '',
        Editor: ''
      }
    });
    if (type) {
      fetchBundles(type);
    } else {
      setBundles([]);
    }
  };

  // Handle form changes for main fields
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setBundleForm({
      ...bundleForm,
      [name]: value
    });
  };
  
  // Handle role pricing changes
  const handleRolePriceChange = (role, value) => {
    setBundleForm({
      ...bundleForm,
      rolePricing: {
        ...bundleForm.rolePricing,
        [role]: value
      }
    });
  };
  
  // Show message
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };
  
  // Start editing a bundle
  const startEditing = (bundle) => {
    setEditingBundle(bundle._id);
    
    // Initialize form with bundle data
    setBundleForm({
      type: selectedType,
      price: bundle.price,
      capacity: bundle.capacity,
      rolePricing: bundle.rolePricing || {
        admin: '',
        user: '',
        agent: '',
        Editor: ''
      }
    });
  };
  
  // Save bundle (new or edit)
  const saveBundle = async (e) => {
    e.preventDefault();
    
    if (!bundleForm.type || !bundleForm.price || !bundleForm.capacity) {
      showMessage('error', 'All fields are required');
      return;
    }

    // Validate role prices
    const rolePricing = {};
    let hasInvalidPrice = false;
    
    userRoles.forEach(role => {
      const price = parseFloat(bundleForm.rolePricing[role.id]);
      if (isNaN(price) || price < 0) {
        hasInvalidPrice = true;
      } else {
        rolePricing[role.id] = price;
      }
    });
    
    if (hasInvalidPrice) {
      showMessage('error', 'All role prices must be valid numbers');
      return;
    }

    setLoading(true);
    
    try {
      const token = localStorage.getItem('igettoken');
      
      // Prepare data with role-based pricing
      const data = {
        type: bundleForm.type,
        price: parseFloat(bundleForm.price),
        capacity: bundleForm.capacity,
        rolePricing
      };
      
      if (editingBundle) {
        // Update existing bundle
        await axios.put(`https://iget.onrender.com/api/iget/${editingBundle}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showMessage('success', 'Bundle updated successfully');
      } else {
        // Add new bundle
        await axios.post('https://iget.onrender.com/api/iget/addbundle', data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showMessage('success', 'Bundle added successfully');
      }
      
      // Reset and refresh
      setEditingBundle(null);
      setBundleForm({
        type: selectedType,
        price: '',
        capacity: '',
        rolePricing: {
          admin: '',
          user: '',
          agent: '',
          Editor: ''
        }
      });
      fetchBundles(selectedType);
    } catch (err) {
      showMessage('error', err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  // Delete bundle
  const deleteBundle = async (id) => {
    if (!confirm('Are you sure you want to deactivate this bundle?')) return;
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('igettoken');
      await axios.delete(`https://iget.onrender.com/api/iget/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showMessage('success', 'Bundle deactivated successfully');
      fetchBundles(selectedType);
    } catch (err) {
      showMessage('error', err.response?.data?.message || 'Failed to deactivate bundle');
    } finally {
      setLoading(false);
    }
  };
  
  // Cancel editing
  const cancelEdit = () => {
    setEditingBundle(null);
    setBundleForm({
      type: selectedType,
      price: '',
      capacity: '',
      rolePricing: {
        admin: '',
        user: '',
        agent: '',
        Editor: ''
      }
    });
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4 text-black dark:text-white">Bundle Management</h1>
        
        {/* Alert Message */}
        {message.text && (
          <div className={`p-3 mb-4 rounded ${
            message.type === 'error' 
              ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' 
              : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
          }`}>
            {message.text}
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Bundle Form */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-black dark:text-white">Bundle Type</label>
              <select
                value={selectedType}
                onChange={handleTypeChange}
                className="w-full border rounded p-2 bg-white dark:bg-gray-700 text-black dark:text-white"
              >
                <option value="">Select a type</option>
                {bundleTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <form onSubmit={saveBundle} className="mt-4">
              <h2 className="text-lg font-medium mb-3 text-black dark:text-white">
                {editingBundle ? 'Edit Bundle' : 'Add New Bundle'}
              </h2>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1 text-black dark:text-white">Standard Price</label>
                <input
                  type="number"
                  name="price"
                  value={bundleForm.price}
                  onChange={handleFormChange}
                  className="w-full border rounded p-2 bg-white dark:bg-gray-700 text-black dark:text-white"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-black dark:text-white">Capacity (MB)</label>
                <input
                  type="text"
                  name="capacity"
                  value={bundleForm.capacity}
                  onChange={handleFormChange}
                  className="w-full border rounded p-2 bg-white dark:bg-gray-700 text-black dark:text-white"
                  placeholder="e.g. 5000"
                  required
                />
              </div>

              {/* Role-Based Pricing Section */}
              <div className="mb-4">
                <h3 className="text-md font-medium mb-2 text-black dark:text-white">Role-Based Pricing</h3>
                <div className="space-y-2">
                  {userRoles.map(role => (
                    <div key={role.id} className="flex items-center">
                      <div className="w-24">
                        <label className="block text-sm font-medium text-black dark:text-white">{role.label} Price:</label>
                      </div>
                      <input
                        type="number"
                        value={bundleForm.rolePricing[role.id]}
                        onChange={(e) => handleRolePriceChange(role.id, e.target.value)}
                        className="border rounded p-1 w-24 ml-2 bg-white dark:bg-gray-700 text-black dark:text-white"
                        step="0.01"
                        min="0"
                        required
                        placeholder="0.00"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-1 text-gray-600 dark:text-gray-300">
                  Note: Enter prices manually for all roles.
                </p>
              </div>
              
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={loading || !selectedType}
                  className={`px-4 py-2 rounded ${
                    loading || !selectedType 
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-400' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'
                  }`}
                >
                  {loading ? 'Processing...' : editingBundle ? 'Update Bundle' : 'Add Bundle'}
                </button>
                
                {editingBundle && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
          
          {/* Right Column - Bundle List */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
            <h2 className="text-lg font-medium mb-3 text-black dark:text-white">
              {selectedType ? `${selectedType} Bundles` : 'Select a bundle type'}
            </h2>
            
            {loading && <p className="text-gray-500 dark:text-gray-400">Loading...</p>}
            
            {!loading && bundles.length === 0 && selectedType && (
              <p className="text-gray-500 dark:text-gray-400">No active bundles found.</p>
            )}
            
            {!loading && bundles.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <th className="p-2 text-left text-black dark:text-white">Capacity</th>
                      <th className="p-2 text-left text-black dark:text-white">Standard Price</th>
                      <th className="p-2 text-left text-black dark:text-white">Role Prices</th>
                      <th className="p-2 text-center text-black dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundles.map((bundle) => (
                      <tr key={bundle._id} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="p-2 text-black dark:text-white">
                          {(bundle.capacity / 1000).toFixed(bundle.capacity % 1000 === 0 ? 0 : 1)} GB
                        </td>
                        <td className="p-2 text-black dark:text-white">
                          GH₵ {parseFloat(bundle.price).toFixed(2)}
                        </td>
                        <td className="p-2">
                          {bundle.rolePricing ? (
                            <div className="text-xs space-y-1">
                              {Object.entries(bundle.rolePricing).map(([role, price]) => (
                                <div key={role} className="flex items-center">
                                  <span className="font-semibold capitalize w-14 text-black dark:text-white">
                                    {role}:
                                  </span>
                                  <span className="text-black dark:text-white">
                                    GH₵ {parseFloat(price).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Standard pricing
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => startEditing(bundle)}
                            className="text-blue-600 dark:text-blue-400 mr-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteBundle(bundle._id)}
                            className="text-red-600 dark:text-red-400"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default BundleManagement;