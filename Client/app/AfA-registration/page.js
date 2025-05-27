'use client'
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Check, Moon, Sun, User, Phone, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    price: 1
  });
  
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [afaBundle, setAfaBundle] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [userRole, setUserRole] = useState(null);
  
  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('igettoken');
    if (!token) {
      setError('You need to login first');
      return;
    }
    
    // Get user data from localStorage
    const userData = localStorage.getItem('userData');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    // Check for dark mode preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    setDarkMode(savedTheme === 'dark' || (!savedTheme && prefersDark));
    
    // Fetch AFA bundle pricing
    fetchAfaBundle();
  }, []);
  
  const fetchAfaBundle = async () => {
    try {
      setLoadingPrice(true);
      const token = localStorage.getItem('igettoken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await fetch('https://iget.onrender.com/api/iget/bundle', { headers });
      const data = await response.json();
      
      if (data.success && data.data) {
        // Find AFA bundle (you might need to adjust the filter based on your bundle structure)
        const afaBundleData = data.data.find(bundle => 
          bundle.type === 'AfA-registration' || 
          bundle.name?.toLowerCase().includes('AfA-registration') ||
          bundle.category === 'AfA-registration'
        );
        
        if (afaBundleData) {
          setAfaBundle(afaBundleData);
          // Set the price in form data - use userPrice if available, otherwise standard price
          const price = afaBundleData.userPrice !== undefined ? afaBundleData.userPrice : afaBundleData.price;
          setFormData(prev => ({ ...prev, price }));
        }
        
        // Set user role if available
        if (data.userRole) {
          setUserRole(data.userRole);
        }
      }
    } catch (error) {
      console.error('Error fetching AFA bundle:', error);
      // Fallback to default price if API fails
      setFormData(prev => ({ ...prev, price: 2.5 }));
    } finally {
      setLoadingPrice(false);
    }
  };
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: name === 'price' ? parseFloat(value) : value
    });
  };
  
  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    setSuccess(null);
    
    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.phoneNumber) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('igettoken');
      if (!token) {
        setError('Authentication token not found');
        setIsLoading(false);
        return;
      }
      
      // Combine first and last name for the API that expects fullName
      const apiData = {
        fullName: `${formData.firstName} ${formData.lastName}`,
        phoneNumber: formData.phoneNumber,
        price: formData.price
      };
      
      const response = await fetch('https://iget.onrender.com/api/afa/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(apiData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(data.data);
        
        // Update user data in localStorage without showing balance
        if (user) {
          const updatedUser = {...user};
          if (updatedUser.wallet) {
            updatedUser.wallet.balance = data.data.walletBalance;
          }
          localStorage.setItem('userData', JSON.stringify(updatedUser));
          setUser(updatedUser);
        }
      } else {
        setError(data.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setSuccess(null);
    setFormData({
      firstName: '',
      lastName: '',
      phoneNumber: '',
      price: afaBundle ? (afaBundle.userPrice !== undefined ? afaBundle.userPrice : afaBundle.price) : 2.5
    });
  };
  
  // Format price for display
  const formatPrice = (price) => {
    return `GH₵ ${parseFloat(price).toFixed(2)}`;
  };
  
  // Get display price
  const getDisplayPrice = () => {
    if (afaBundle) {
      return afaBundle.userPrice !== undefined ? afaBundle.userPrice : afaBundle.price;
    }
    return formData.price;
  };
  
  return (
    <div className={darkMode ? 'dark' : ''}>
      <Head>
        <title>AFA Registration</title>
        <meta name="description" content="AFA Registration Form" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
        <div className="container mx-auto px-4 py-8">
          <header className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">
              AFA Registration {!loadingPrice && `(${formatPrice(getDisplayPrice())})`}
            </h1>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </header>

          {/* User Role Display */}
          {userRole && userRole !== 'user' && (
            <div className="mb-4 text-center">
              <div className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-lg">
                Viewing prices as: <span className="font-bold capitalize">{userRole}</span>
              </div>
            </div>
          )}

          {/* Loading Price */}
          {loadingPrice && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Loading current pricing...</span>
              </div>
            </div>
          )}

          {/* AFA Bundle Info */}
          {afaBundle && !loadingPrice && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6 max-w-lg mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">AFA Bundle Details</h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    {/* {afaBundle.capacity && `${afaBundle.capacity} GB • `} */}
                    {/* {afaBundle.validity || '90 Days'} */}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                    {formatPrice(getDisplayPrice())}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!success ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-lg mx-auto">
              <h2 className="text-2xl font-semibold mb-6">New AFA Registration</h2>
              
              {error && (
                <div className="mb-6 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="firstName" className="block mb-2 font-medium">
                    First Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                      type="text" 
                      id="firstName" 
                      name="firstName" 
                      className="pl-10 w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600" 
                      value={formData.firstName}
                      onChange={handleChange}
                      required 
                      placeholder="Enter first name"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block mb-2 font-medium">
                    Last Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                      type="text" 
                      id="lastName" 
                      name="lastName" 
                      className="pl-10 w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600" 
                      value={formData.lastName}
                      onChange={handleChange}
                      required 
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="phoneNumber" className="block mb-2 font-medium">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                      type="tel" 
                      id="phoneNumber" 
                      name="phoneNumber" 
                      className="pl-10 w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600" 
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      required 
                      placeholder="e.g. 0200000000"
                    />
                  </div>
                </div>
                
                <button 
                  onClick={handleSubmit}
                  type="button" 
                  className="w-full mt-8 px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-semibold rounded-lg transition-colors duration-200 flex justify-center items-center"
                  disabled={isLoading || loadingPrice}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : loadingPrice ? (
                    'Loading...'
                  ) : (
                    `Submit Registration - ${formatPrice(getDisplayPrice())}`
                  )}
                </button>
                </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-lg mx-auto text-center">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Registration Successful!</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Your AFA registration has been completed successfully.</p>
                
                <div className="w-full bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <h3 className="text-xl font-medium mb-4 text-left">Registration Details</h3>
                  <div className="grid grid-cols-2 gap-y-3">
                    <div className="text-left text-gray-600 dark:text-gray-400">Name:</div>
                    <div className="text-right font-medium">{success.registration.fullName}</div>
                    
                    <div className="text-left text-gray-600 dark:text-gray-400">Phone Number:</div>
                    <div className="text-right font-medium">{success.order.recipientNumber}</div>
                    
                    <div className="text-left text-gray-600 dark:text-gray-400">Amount Paid:</div>
                    <div className="text-right font-medium">{formatPrice(success.order.price)}</div>
                    
                    <div className="text-left text-gray-600 dark:text-gray-400">Reference:</div>
                    <div className="text-right font-medium text-sm">{success.order.orderReference}</div>
                  </div>
                </div>
                
                <button 
                  onClick={resetForm} 
                  className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-semibold rounded-lg transition-colors duration-200"
                >
                  New Registration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}