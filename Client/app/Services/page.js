'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Package, Filter, Loader, AlertCircle, Wifi, Smartphone } from 'lucide-react';

// MTN Bundle Component with custom styling
const MTNBundle = ({ bundle, onClick }) => (
  <div 
    onClick={(e) => {
      e.stopPropagation();
      onClick(bundle);
    }}
    className="bg-yellow-400 dark:bg-yellow-500 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
  >
    <div className="p-4 flex flex-col items-center">
      <div className="w-16 h-8 bg-black dark:bg-gray-900 rounded-full flex items-center justify-center mb-4">
        <span className="text-yellow-400 dark:text-yellow-500 font-bold">MTN</span>
      </div>
      <div className="text-3xl font-bold text-black dark:text-white mb-4">{bundle.capacity} MB</div>
      <div className="w-full grid grid-cols-2 bg-green-900 dark:bg-green-800 text-white">
        <div className="p-4 text-center border-r border-green-800 dark:border-green-700">
          <div className="text-xl font-bold">{formatPrice(bundle.price)}</div>
          <div className="text-sm">Price</div>
        </div>
        <div className="p-4 text-center">
          <div className="text-xl font-bold">No-Expiry</div>
          <div className="text-sm">Duration</div>
        </div>
      </div>
    </div>
  </div>
);

// Other Provider Bundle Component
const StandardBundle = ({ bundle, onClick, typeColor }) => (
  <div 
    onClick={(e) => {
      e.stopPropagation();
      onClick(bundle);
    }}
    className={`border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${typeColor}`}
  >
    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
      <h2 className="text-xl font-semibold">{bundle.name}</h2>
      <div className={`flex items-center px-2 py-1 rounded text-xs ${typeColor}`}>
        {getProviderIcon(bundle.type)}
        <span>{bundle.type}</span>
      </div>
    </div>
    <div className="p-4">
      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-600">Data Capacity</span>
        <span className="font-medium">{bundle.capacity} MB</span>
      </div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-gray-600">Price</span>
        <span className="text-lg font-bold text-green-600">{formatPrice(bundle.price)}</span>
      </div>
      <button 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors"
      >
        Purchase Bundle
      </button>
    </div>
  </div>
);

const formatPrice = (price) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
};

// Define colors for different providers
const getTypeColor = (type) => {
  const colors = {
    'mtnup2u': 'bg-yellow-200 text-yellow-800 border-yellow-400',
    'mtn-fibre': 'bg-yellow-200 text-yellow-800 border-yellow-400',
    'mtn-justforu': 'bg-yellow-200 text-yellow-800 border-yellow-400',
    'AT-ishare': 'bg-purple-200 text-purple-800 border-purple-400',
    'Telecel-5959': 'bg-red-200 text-red-800 border-red-400',
    'AfA-registration': 'bg-gray-200 text-gray-800 border-gray-400',
    'other': 'bg-zinc-200 text-zinc-800 border-zinc-400'
  };
  return colors[type] || colors.other;
};

const getProviderIcon = (type) => {
  switch (type) {
    case 'mtnup2u':
    case 'mtn-fibre':
    case 'mtn-justforu':
      return <Wifi className="h-4 w-4 mr-1" />;
    case 'AT-ishare':
      return <Smartphone className="h-4 w-4 mr-1" />;
    case 'Telecel-5959':
      return <Wifi className="h-4 w-4 mr-1" />;
    default:
      return <Package className="h-4 w-4 mr-1" />;
  }
};

// Check if a bundle type is MTN
const isMTNBundle = (type) => {
  return ['mtnup2u', 'mtn-fibre', 'mtn-justforu'].includes(type);
};

export default function BundlesPage() {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const router = useRouter();

  useEffect(() => {
    const fetchBundles = async () => {
      try {
        setLoading(true);
        const response = await axios.get('https://keymedia-consult.onrender.com/api/iget/bundle', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('igettoken')}`
          }
        });

        if (response.data.success) {
          setBundles(response.data.data);
        } else {
          throw new Error('Failed to fetch bundles');
        }
      } catch (err) {
        setError(err.message || 'An error occurred while fetching bundles');
      } finally {
        setLoading(false);
      }
    };

    fetchBundles();
  }, []);

  const bundleTypes = ['all', ...new Set(bundles.map(bundle => bundle.type))];

  const filteredBundles = selectedType === 'all'
    ? bundles
    : bundles.filter(bundle => bundle.type === selectedType);

  const handleBundleSelect = (bundle) => {
    router.push(`/bundles/${bundle.type}/${bundle._id}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Available Data Bundles</h1>

      {/* Filter Section */}
      <div className="mb-6">
        <div className="flex items-center text-sm font-medium mb-2">
          <Filter className="h-4 w-4 mr-1" />
          <span>Filter by provider:</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {bundleTypes.map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedType === type 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              } transition-colors`}
            >
              {type === 'all' ? 'All Providers' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Status Messages */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader className="h-5 w-5 mr-2 animate-spin" />
          <span>Loading bundles...</span>
        </div>
      )}
      
      {error && (
        <div className="flex items-center text-red-500 py-6">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Error: {error}</span>
        </div>
      )}
      
      {!loading && !error && filteredBundles.length === 0 && (
        <p className="text-gray-500 py-6">No bundles available.</p>
      )}

      {/* Bundles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBundles.map((bundle) => (
          isMTNBundle(bundle.type) ? (
            <MTNBundle 
              key={bundle._id}
              bundle={bundle}
              onClick={handleBundleSelect}
            />
          ) : (
            <StandardBundle
              key={bundle._id}
              bundle={bundle}
              onClick={handleBundleSelect}
              typeColor={getTypeColor(bundle.type)}
            />
          )
        ))}
      </div>
    </div>
  );
}