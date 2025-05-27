// pages/admin-settings.js
'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import { 
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Settings
} from 'lucide-react';
import AdminLayout from '@/components/adminWraper';

export default function ApiSettingsPage() {
  const [settings, setSettings] = useState({
    apiIntegrations: {
      mtnHubnetEnabled: true,
      atHubnetEnabled: true
    },
    notifications: {
      smsEnabled: true,
      emailEnabled: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [updating, setUpdating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is admin
    const userData = localStorage.getItem('userData');
    const user = userData ? JSON.parse(userData) : null;
    
    if (!user || !user.id || user.role !== 'admin') {
      router.push('/login');
      return;
    }
    
    // Fetch current settings
    fetchSettings();
  }, [router]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Get admin auth token
      const token = localStorage.getItem('igettoken');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch('https://iget.onrender.com/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setSettings(data.data);
      } else {
        throw new Error('Invalid response format');
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load admin settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMtnApi = async () => {
    await toggleApi('mtn');
  };

  const toggleAtApi = async () => {
    await toggleApi('at');
  };

  const toggleApi = async (type) => {
    try {
      setUpdating(true);
      
      // Get admin auth token
      const token = localStorage.getItem('igettoken');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const endpoint = type === 'mtn' ? 'toggle-mtn-api' : 'toggle-at-api';
      
      const response = await fetch(`https://iget.onrender.com/api/admin/settings/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update setting: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state based on toggle type
        if (type === 'mtn') {
          setSettings(prev => ({
            ...prev,
            apiIntegrations: {
              ...prev.apiIntegrations,
              mtnHubnetEnabled: data.data.mtnHubnetEnabled
            }
          }));
          setSuccess(`MTN Hubnet API integration has been ${data.data.mtnHubnetEnabled ? 'enabled' : 'disabled'}`);
        } else {
          setSettings(prev => ({
            ...prev,
            apiIntegrations: {
              ...prev.apiIntegrations,
              atHubnetEnabled: data.data.atHubnetEnabled
            }
          }));
          setSuccess(`AT-ishare Hubnet API integration has been ${data.data.atHubnetEnabled ? 'enabled' : 'disabled'}`);
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        throw new Error('Update failed');
      }
      
      setError(null);
    } catch (err) {
      console.error('Error updating setting:', err);
      setError(`Failed to update setting. ${err.message}`);
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      setUpdating(false);
    }
  };

  const updateNotificationSettings = async (type, value) => {
    try {
      setUpdating(true);
      
      // Get admin auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const updates = {
        notifications: {
          ...settings.notifications,
          [type]: value
        }
      };
      
      const response = await fetch('http://localhost:5000/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update setting: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
        setSuccess(`${type === 'smsEnabled' ? 'SMS' : 'Email'} notifications have been ${value ? 'enabled' : 'disabled'}`);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        throw new Error('Update failed');
      }
      
      setError(null);
    } catch (err) {
      console.error('Error updating setting:', err);
      setError(`Failed to update setting. ${err.message}`);
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AdminLayout>
      <Head>
        <title>API Integration Settings</title>
      </Head>
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">API Integration Settings</h1>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 flex items-start dark:bg-red-900 dark:border-red-800 dark:text-red-200">
            <AlertTriangle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6 flex items-start dark:bg-green-900 dark:border-green-800 dark:text-green-200">
            <CheckCircle2 size={20} className="mr-2 flex-shrink-0 mt-0.5" />
            <p>{success}</p>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw size={32} className="animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* API Integration Settings Card */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center mb-6">
                <Settings size={24} className="text-indigo-600 dark:text-indigo-400 mr-3" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">API Integration Settings</h2>
              </div>
              
              <div className="space-y-6">
                <p className="text-slate-600 mb-4 dark:text-slate-300">
                  Enable or disable direct API integration with Hubnet for different bundle types. 
                  When disabled, orders will be placed in pending status for manual processing.
                </p>
                
                {/* MTN Hubnet Toggle */}
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 dark:border-gray-700 dark:hover:bg-gray-700">
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-white">MTN Bundle API Integration</h3>
                    <p className="text-sm text-slate-600 mt-1 dark:text-slate-400">
                      When enabled, MTN bundle orders will be processed automatically through Hubnet API
                    </p>
                  </div>
                  <button
                    onClick={toggleMtnApi}
                    disabled={updating}
                    className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none"
                    aria-pressed={settings.apiIntegrations?.mtnHubnetEnabled}
                  >
                    {settings.apiIntegrations?.mtnHubnetEnabled ? (
                      <ToggleRight size={24} className="text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <ToggleLeft size={24} className="text-slate-400 dark:text-slate-500" />
                    )}
                  </button>
                </div>
                
                {/* AT-ishare Hubnet Toggle */}
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 dark:border-gray-700 dark:hover:bg-gray-700">
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-white">AT-ishare Bundle API Integration</h3>
                    <p className="text-sm text-slate-600 mt-1 dark:text-slate-400">
                      When enabled, AT-ishare bundle orders will be processed automatically through Hubnet API
                    </p>
                  </div>
                  <button
                    onClick={toggleAtApi}
                    disabled={updating}
                    className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none"
                    aria-pressed={settings.apiIntegrations?.atHubnetEnabled}
                  >
                    {settings.apiIntegrations?.atHubnetEnabled ? (
                      <ToggleRight size={24} className="text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <ToggleLeft size={24} className="text-slate-400 dark:text-slate-500" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Notification Settings Card */}
          
            
            {/* Last Updated Info */}
            {settings.lastUpdatedAt && (
              <div className="text-sm text-slate-500 mt-4 dark:text-slate-400">
                Last updated: {new Date(settings.lastUpdatedAt).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}