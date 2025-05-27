'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ATFlexiNetBundleCards = () => {
  const [bundles, setBundles] = useState([]);
  const [filteredBundles, setFilteredBundles] = useState([]);
  const [selectedBundleIndex, setSelectedBundleIndex] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [processingOrder, setProcessingOrder] = useState(false);

  // Fetch bundles from API with authorization
  useEffect(() => {
    const fetchBundles = async () => {
      try {
        setIsLoading(true);
        
        // Get token from localStorage
        const token = localStorage.getItem('igettoken');
        
        if (!token) {
          setMessage({ 
            text: 'Please login to view available data bundles', 
            type: 'error' 
          });
          setIsLoading(false);
          return;
        }
        
        // Make API request with authorization header
        const response = await axios.get('https://keymedia-consult.onrender.com/api/iget/bundle', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Filter for AT bundles only
        const atBundles = response.data.data.filter(bundle => 
          bundle.network === 'AT-ishare' || bundle.type === 'AT-ishare');
        setBundles(atBundles);
        setFilteredBundles(atBundles);
      } catch (err) {
        console.error('Failed to fetch bundles:', err);
        const errorMessage = err.response?.data?.message || 'Failed to load bundles. Please try again later.';
        setMessage({ text: errorMessage, type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBundles();
  }, []);

  // AT Logo SVG
  const ATLogo = () => (
    <svg width="80" height="80" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="85" fill="#00ADEF" stroke="#fff" strokeWidth="2"/>
      <text x="100" y="85" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="40" fill="white">AT</text>
      <text x="100" y="125" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="24" fill="white">FLEXINET</text>
    </svg>
  );

  const handleSelectBundle = (index) => {
    setSelectedBundleIndex(index === selectedBundleIndex ? null : index);
    setPhoneNumber('');
    setMessage({ text: '', type: '' });
  };

  const validatePhoneNumber = (number) => {
    // Basic AT Ghana number validation (starts with 023, 026, or 053)
    const pattern = /^(023|026|053)\d{7}$/;
    return pattern.test(number);
  };

  const handlePurchase = async (bundle) => {
    // Reset message state
    setMessage({ text: '', type: '' });
    
    // Validate phone number
    if (!phoneNumber) {
      setMessage({ text: 'Please enter a phone number', type: 'error' });
      return;
    }
    
    // Commented out for flexibility, but you can uncomment if strict validation is needed
    // if (!validatePhoneNumber(phoneNumber)) {
    //   setMessage({ text: 'Please enter a valid AT phone number', type: 'error' });
    //   return;
    // }

    // Get token from localStorage
    const token = localStorage.getItem('igettoken')
    if (!token) {
      setMessage({ text: 'Please login to purchase data bundles', type: 'error' });
      return;
    }

    setProcessingOrder(true);

    try {
      // Call the placeorder endpoint (same as in the MTN component)
      const response = await axios.post(
        'https://keymedia-consult.onrender.com/api/orders/placeorder',
        {
          recipientNumber: phoneNumber,
          capacity: bundle.capacity,
          price: parseFloat(bundle.price),
          bundleType: bundle.type || 'AT-ishare'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        setMessage({ 
          text: `${(bundle.capacity).toFixed(bundle.capacity % 1000 === 0 ? 0 : 1)}GB data bundle purchased successfully for ${phoneNumber}`, 
          type: 'success',
          orderDetails: response.data.data // Store order details for display
        });
        setSelectedBundleIndex(null);
        setPhoneNumber('');
      } else {
        setMessage({ 
          text: response.data.message || 'Failed to process order', 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Purchase error:', error);
      setMessage({ 
        text: error.response?.data?.message || error.message || 'Failed to purchase data bundle', 
        type: 'error' 
      });
    } finally {
      setProcessingOrder(false);
    }
  };

  if (isLoading && bundles.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  // Display login message if no token is found
  if (!localStorage.getItem('igettoken')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center mb-6">
          <ATLogo />
          <h1 className="text-3xl font-bold ml-4">AT FLEXINET Data Bundles</h1>
        </div>
        <div className="bg-yellow-100 p-10 text-center rounded-lg border border-yellow-400">
          <p className="text-lg text-yellow-800">Please login to view and purchase AT FLEXINET data bundles.</p>
          <button 
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
            onClick={() => window.location.href = '/login'} // Adjust the login URL as needed
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center mb-6">
        <ATLogo />
        <h1 className="text-3xl font-bold ml-4">AT FLEXINET Data Bundles</h1>
      </div>
      
      {message.text && (
        <div className={`mb-4 p-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
          {message.type === 'success' && message.orderDetails && (
            <div className="mt-2 text-sm">
              <p><strong>Order Reference:</strong> {message.orderDetails.order.orderReference}</p>
              <p><strong>Transaction Ref:</strong> {message.orderDetails.transaction.reference}</p>
              <p><strong>New Balance:</strong> GH₵ {message.orderDetails.walletBalance.toFixed(2)}</p>
            </div>
          )}
        </div>
      )}

      {filteredBundles.length === 0 && !isLoading ? (
        <div className="bg-blue-100 p-10 text-center rounded-lg border border-blue-400">
          <p className="text-lg text-blue-800">No AT FLEXINET Data bundles available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBundles.map((bundle, index) => (
            <div key={index} className="flex flex-col">
              <div 
                className={`flex flex-col bg-blue-500 overflow-hidden shadow-md cursor-pointer transition-transform duration-300 hover:translate-y-[-5px] ${selectedBundleIndex === index ? 'rounded-t-lg' : 'rounded-lg'}`}
                onClick={() => handleSelectBundle(index)}
              >
                <div className="flex flex-col items-center justify-center p-5 space-y-3">
                  <div className="w-20 h-20 flex justify-center items-center">
                    <ATLogo />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {(bundle.capacity).toFixed(bundle.capacity % 1000 === 0 ? 0 : 1)} GB
                  </h3>
                </div>
                <div className="grid grid-cols-2 text-white bg-black"
                     style={{ borderRadius: selectedBundleIndex === index ? '0' : '0 0 0.5rem 0.5rem' }}>
                  <div className="flex flex-col items-center justify-center p-3 text-center border-r border-r-gray-600">
                    <p className="text-lg">GH₵ {parseFloat(bundle.price).toFixed(2)}</p>
                    <p className="text-sm font-bold">Price</p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 text-center">
                    <p className="text-lg">{bundle.validity || "30 Days"}</p>
                    <p className="text-sm font-bold">Duration</p>
                  </div>
                </div>
              </div>
              
              {selectedBundleIndex === index && (
                <div className="bg-blue-500 p-4 rounded-b-lg shadow-md">
                  <div className="mb-4">
                    <input
                      type="tel"
                      className="w-full px-4 py-2 rounded bg-blue-400 text-white placeholder-blue-100 border border-blue-300 focus:outline-none focus:border-blue-200"
                      placeholder="Enter recipient number (e.g., 0231234567)"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => handlePurchase(bundle)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed"
                    disabled={processingOrder}
                  >
                    {processingOrder ? 'Processing...' : 'Purchase'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ATFlexiNetBundleCards;