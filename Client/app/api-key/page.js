'use client'
import { useState, useEffect } from 'react';
import axios from 'axios';

const ApiKeyManager = () => {
  const [apiKeyData, setApiKeyData] = useState({
    hasApiKey: false,
    apiKey: '',
    loading: true,
    error: null
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApiKey = async () => {
    try {
      setApiKeyData(prev => ({ ...prev, loading: true }));
      const response = await axios.get('https://keymedia-consult.onrender.com/api/v1/api-key', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('igettoken')}`
        }
      });
      
      setApiKeyData({
        hasApiKey: response.data.hasApiKey,
        apiKey: response.data.apiKey || '',
        loading: false,
        error: null
      });
    } catch (error) {
      setApiKeyData({
        hasApiKey: false,
        apiKey: '',
        loading: false,
        error: error.response?.data?.message || 'Failed to fetch API key'
      });
    }
  };

  const generateApiKey = async () => {
    try {
      setActionLoading(true);
      const response = await axios.post('https://keymedia-consult.onrender.com/api/v1/generate-api-key', {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('igettoken')}`
        }
      });
      
      setApiKeyData({
        hasApiKey: true,
        apiKey: response.data.data.apiKey,
        loading: false,
        error: null
      });
      setActionLoading(false);
    } catch (error) {
      setApiKeyData(prev => ({
        ...prev,
        error: error.response?.data?.message || 'Failed to generate API key'
      }));
      setActionLoading(false);
    }
  };

  const revokeApiKey = async () => {
    try {
      setActionLoading(true);
      await axios.delete('https://keymedia-consult.onrender.com/api/v1/api-key', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('igettoken')}`
        }
      });
      
      setApiKeyData({
        hasApiKey: false,
        apiKey: '',
        loading: false,
        error: null
      });
      setActionLoading(false);
    } catch (error) {
      setApiKeyData(prev => ({
        ...prev,
        error: error.response?.data?.message || 'Failed to revoke API key'
      }));
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKey();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md dark:shadow-lg transition-colors duration-300">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">API Key Management</h2>

      {apiKeyData.loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      ) : apiKeyData.error ? (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
          {apiKeyData.error}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="py-3 px-4 border-b text-left text-gray-600 dark:text-gray-300">Status</th>
                <th className="py-3 px-4 border-b text-left text-gray-600 dark:text-gray-300">API Key</th>
                <th className="py-3 px-4 border-b text-left text-gray-600 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-4 px-4 border-b">
                  {apiKeyData.hasApiKey ? (
                    <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 py-1 px-3 rounded-full text-sm">
                      Active
                    </span>
                  ) : (
                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 py-1 px-3 rounded-full text-sm">
                      Not Generated
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 border-b font-mono text-gray-900 dark:text-white">
                  {apiKeyData.hasApiKey ? apiKeyData.apiKey : 'No API key generated'}
                </td>
                <td className="py-4 px-4 border-b">
                  {apiKeyData.hasApiKey ? (
                    <button 
                      onClick={revokeApiKey}
                      disabled={actionLoading}
                      className="bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-600 text-white py-2 px-4 rounded-lg disabled:opacity-50"
                    >
                      {actionLoading ? 'Revoking...' : 'Revoke Key'}
                    </button>
                  ) : (
                    <button 
                      onClick={generateApiKey}
                      disabled={actionLoading}
                      className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-600 text-white py-2 px-4 rounded-lg disabled:opacity-50"
                    >
                      {actionLoading ? 'Generating...' : 'Generate Key'}
                    </button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Instructions for using the API key */}
      {apiKeyData.hasApiKey && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Using Your API Key</h3>
          <p className="mb-2 text-gray-700 dark:text-gray-300">Include your API key in request headers:</p>
          <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded overflow-x-auto text-gray-900 dark:text-white">
            <code>
              {`
// Example API request
fetch('https://keymedia-consult.onrender.com/endpoint', {
  headers: {
    'x-api-key': '${apiKeyData.apiKey.replace('••••••••', '[YOUR_FULL_API_KEY]')}'
  }
})
              `}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default ApiKeyManager;