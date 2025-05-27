'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TelecelBundleCards = () => {
  const [bundles, setBundles] = useState([]);
  const [filteredBundles, setFilteredBundles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchaseStatus, setPurchaseStatus] = useState(null);
  const [recipientNumber, setRecipientNumber] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Fetch bundles from API
  useEffect(() => {
    const fetchBundles = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get token from localStorage for authenticated requests
        const token = localStorage.getItem('igettoken');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const response = await axios.get('https://iget.onrender.com/api/iget/bundle', { headers });
        
        // If the API returns userRole, save it
        if (response.data.userRole) {
          setUserRole(response.data.userRole);
        }
        
        // Filter for Telecel bundles only
        const telecelBundles = response.data.data.filter(bundle => 
          bundle.network === 'telecel' || bundle.type === 'Telecel-5959');
        
        setBundles(telecelBundles);
        setFilteredBundles(telecelBundles);
      } catch (err) {
        console.error('Failed to fetch bundles:', err);
        setError('Failed to load bundles. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBundles();
  }, []);

  // Telecel Logo SVG
  const TelecelLogo = () => (
    <svg width="80" height="80" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="85" fill="#e30613" stroke="#fff" strokeWidth="2"/>
      <text x="100" y="105" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="20" fill="white">TELECEL</text>
      <text x="100" y="130" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="16" fill="white">ENTERPRICE DATA</text>
      <text x="100" y="150" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="14" fill="white">*126#</text>
    </svg>
  );

  // Get price to display - use userPrice if available, fall back to standard price
  const getDisplayPrice = (bundle) => {
    return bundle.userPrice !== undefined ? bundle.userPrice : bundle.price;
  };

  // Format price for display
  const formatPrice = (price) => {
    return `GH₵ ${parseFloat(price).toFixed(2)}`;
  };

  const openPurchaseModal = (bundle) => {
    setSelectedBundle(bundle);
    setIsModalOpen(true);
    setPurchaseStatus(null);
    setRecipientNumber('');
  };
  
  const closePurchaseModal = () => {
    setIsModalOpen(false);
    setSelectedBundle(null);
    setRecipientNumber('');
    setPurchaseStatus(null);
  };

  const handlePurchase = async () => {
    setProcessingOrder(true);
    
    try {
      // Get token from localStorage
      const token = localStorage.getItem('igettoken');
      
      if (!token) {
        setPurchaseStatus({
          success: false,
          message: 'You need to be logged in to make a purchase'
        });
        setProcessingOrder(false);
        return;
      }
      
      // Make sure we have all the required fields
      if (!selectedBundle || !recipientNumber) {
        setPurchaseStatus({
          success: false,
          message: 'Bundle details and recipient number are required'
        });
        setProcessingOrder(false);
        return;
      }
      
      // Send all the required fields that the backend expects
      const response = await axios.post(
        'https://iget.onrender.com/api/orders/placeorder',
        {
          recipientNumber: recipientNumber,
          capacity: selectedBundle.capacity,
          price: getDisplayPrice(selectedBundle),
          bundleType: selectedBundle.type || 'Telecel-5959'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setPurchaseStatus({
        success: true,
        message: 'Bundle purchased successfully!',
        orderDetails: response.data.data
      });
      
    } catch (err) {
      console.error("Purchase error:", err);
      setPurchaseStatus({
        success: false,
        message: err.response?.data?.message || 'Failed to process your purchase. Please try again.'
      });
    } finally {
      setProcessingOrder(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-center my-10">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center mb-6">
        <TelecelLogo />
        <h1 className="text-3xl font-bold ml-4">Telecel Enterprise Data Bundles</h1>
      </div>
      
      {userRole && userRole !== 'user' && (
        <div className="mb-4 text-center">
          <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
            Viewing prices as: <span className="font-bold capitalize">{userRole}</span>
          </div>
        </div>
      )}

      {/* Bundles Display */}
      {filteredBundles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBundles.map((bundle) => {
            const displayPrice = getDisplayPrice(bundle);
            
            return (
              <div
                key={bundle._id}
                className="flex flex-col overflow-hidden shadow-md transition-transform duration-300 hover:translate-y-[-5px]"
              >
                <div className="flex flex-col items-center justify-center p-5 space-y-3 bg-red-600">
                  <h3 className="text-3xl font-bold text-white">TELECEL</h3>
                  <h3 className="text-xl font-bold text-white">
                    {(bundle.capacity ).toFixed(bundle.capacity % 1000 === 0 ? 0 : 1)} GB
                  </h3>
                </div>
                <div className="grid grid-cols-2 text-white bg-black rounded-b-lg">
                  <div className="flex flex-col items-center justify-center p-3 text-center border-r border-r-gray-600">
                    <p className="text-lg">{formatPrice(displayPrice)}</p>
                    <p className="text-sm font-bold">Price</p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 text-center">
                    <p className="text-lg">{bundle.validity || "60 Days"}</p>
                    <p className="text-sm font-bold">Duration</p>
                  </div>
                </div>
                <button 
                  className="w-full px-4 py-2 bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                  onClick={() => openPurchaseModal(bundle)}
                >
                  Purchase Bundle
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-red-100 p-10 text-center rounded-lg border border-red-400">
          <p className="text-lg text-red-800">No Telecel bundles found.</p>
        </div>
      )}
      
      {/* Purchase Modal */}
      {isModalOpen && selectedBundle && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Bundle</h2>
              <button 
                onClick={closePurchaseModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex justify-between mb-3">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Bundle:</span>
                <span className="text-black dark:text-white font-medium">{(selectedBundle.capacity).toFixed(selectedBundle.capacity % 1000 === 0 ? 0 : 1)} GB</span>
              </div>
              <div className="flex justify-between mb-3">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Price:</span>
                <span className="text-black dark:text-white font-medium">{formatPrice(getDisplayPrice(selectedBundle))}</span>
              </div>
              <div className="flex justify-between mb-3">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Validity:</span>
                <span className="text-black dark:text-white font-medium">{selectedBundle.validity || "60 Days"}</span>
              </div>
            </div>
            
            {!purchaseStatus?.success && (
              <div className="mb-5">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Recipient Phone Number
                </label>
                <input
                  type="tel"
                  value={recipientNumber}
                  onChange={(e) => setRecipientNumber(e.target.value)}
                  placeholder="e.g."
                  className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-white dark:bg-gray-600 dark:border-gray-500 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}
            
            {purchaseStatus && (
              <div className={`p-4 mb-4 rounded-lg ${
                purchaseStatus.success ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                <p className="font-medium">{purchaseStatus.message}</p>
                {purchaseStatus.success && purchaseStatus.orderDetails && (
                  <div className="mt-3 text-sm space-y-1">
                    <p><strong>Order Reference:</strong> {purchaseStatus.orderDetails.order.orderReference}</p>
                    <p><strong>Transaction Ref:</strong> {purchaseStatus.orderDetails.transaction.reference}</p>
                    <p><strong>New Balance:</strong> GH₵ {purchaseStatus.orderDetails.walletBalance.toFixed(2)}</p>
                  </div>
                )}
              </div>
            )}
            
            {!purchaseStatus?.success && (
              <button
                onClick={handlePurchase}
                disabled={processingOrder || !recipientNumber}
                className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-colors ${
                  processingOrder || !recipientNumber
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processingOrder ? 'Processing...' : 'Confirm Purchase'}
              </button>
            )}
            
            {purchaseStatus?.success && (
              <button
                onClick={closePurchaseModal}
                className="w-full py-3 px-4 rounded-lg font-bold text-white bg-gray-600 hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TelecelBundleCards;