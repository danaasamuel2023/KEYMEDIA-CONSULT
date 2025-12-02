'use client'
import React, { useState, useEffect } from 'react';
import { AlertCircle, FileSpreadsheet, Upload, Check, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';

const BulkPurchaseComponent = () => {
  // Input state
  const [bulkInput, setBulkInput] = useState('');
  const [bundleType, setBundleType] = useState('mtnup2u');
  const [recipientNumber, setRecipientNumber] = useState('');
  
  // Data state
  const [bundleOptions, setBundleOptions] = useState({}); // Will be populated from API
  const [availableCapacities, setAvailableCapacities] = useState([]);
  const [parsedEntries, setParsedEntries] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [networkOptions, setNetworkOptions] = useState([
    { value: 'mtnup2u', label: 'MTN Up2U' },
    { value: 'TELECEL', label: 'Telecel' }
  ]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  
  // Fetch initial data on component mount
  useEffect(() => {
    const initializeData = async () => {
      await fetchBundleData();
      await fetchWalletBalance();
      setLoading(false);
    };
    
    initializeData();
  }, []);
  
  // Update network options when bundle data is loaded
  useEffect(() => {
    if (Object.keys(bundleOptions).length > 0) {
      const networks = Object.keys(bundleOptions).map(key => {
        let label = key;
        
        // Map network keys to friendly names
        if (key === 'mtnup2u') label = 'MTN Up2U';
        else if (key === 'TELECEL' || key === 'telecel-5959') label = 'Telecel';
        else if (key === 'YELLO' || key === 'mtn') label = 'MTN';
        else if (key === 'AT_PREMIUM' || key === 'at') label = 'AirtelTigo Premium';
        else if (key === 'mtn-justforu') label = 'MTN Just For U';
        
        return {
          value: key,
          label: label
        };
      });
      
      if (networks.length > 0) {
        setNetworkOptions(networks);
        // Set default selected network to first available
        setBundleType(networks[0].value);
      }
    }
  }, [bundleOptions]);
  
  // Parse bulk input when it changes or when bundle type changes
  useEffect(() => {
    if (bulkInput.trim() === '') {
      setParsedEntries([]);
      setTotalCost(0);
      return;
    }
    
    try {
      // Split by lines first
      const lines = bulkInput.trim().split('\n');
      const entries = [];
      let calculatedTotal = 0;
      
      // Make sure we have bundle prices for the selected network
      if (!bundleOptions[bundleType]) {
        throw new Error(`No pricing information available for ${bundleType}`);
      }
      
      const networkPrices = bundleOptions[bundleType];
      
      lines.forEach((line, index) => {
        const parts = line.trim().split(' ');
        
        if (parts.length >= 2) {
          const recipient = parts[0].trim();
          const capacity = parts[1].trim();
          
          // Validate phone number - must be exactly 10 digits starting with 0
          if (!/^0\d{9}$/.test(recipient)) {
            throw new Error(`Line ${index + 1}: Invalid phone number format. Must be 10 digits starting with 0`);
          }
          
          // Validate capacity
          if (!networkPrices[capacity]) {
            throw new Error(`Line ${index + 1}: Invalid capacity. Must be one of: ${Object.keys(networkPrices).join(', ')}`);
          }
          
          const price = networkPrices[capacity];
          calculatedTotal += parseFloat(price);
          
          entries.push({
            recipient,
            capacity,
            price: parseFloat(price), // Ensure price is a number
            lineNumber: index + 1,
            bundleType: bundleType // Include bundle type for each entry
          });
        } else {
          throw new Error(`Line ${index + 1}: Each line must contain both phone number and capacity separated by a space`);
        }
      });
      
      setParsedEntries(entries);
      setTotalCost(calculatedTotal);
      setError('');
    } catch (err) {
      setError(err.message);
      setParsedEntries([]);
      setTotalCost(0);
    }
  }, [bulkInput, bundleType, bundleOptions]);
  
  // Fetch bundle data from API
  const fetchBundleData = async () => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('igettoken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await fetch('https://keymedia-consult.onrender.com/api/iget/bundle', { 
        headers 
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch bundle data');
      }
      
      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid bundle data format');
      }
      
      // Create a mapping of capacities to their prices by network type
      const bundlePricing = {};
      const capacities = new Set();
      
      data.data.forEach(bundle => {
        const type = bundle.type;
        const capacity = bundle.capacity.toString();
        const price = bundle.userPrice !== undefined ? bundle.userPrice : bundle.price;
        
        if (!bundlePricing[type]) {
          bundlePricing[type] = {};
        }
        
        bundlePricing[type][capacity] = price;
        capacities.add(capacity);
      });
      
      setBundleOptions(bundlePricing);
      setAvailableCapacities(Array.from(capacities).sort((a, b) => parseFloat(a) - parseFloat(b)));
      
    } catch (error) {
      console.error('Error fetching bundle data:', error);
      setError('Failed to load bundle prices. Please try again.');
    }
  };
  
  // Fetch user's wallet balance
  const fetchWalletBalance = async () => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('igettoken');
      
      if (!token) {
        console.error('No auth token found');
        return;
      }
      
      const response = await fetch('https://keymedia-consult.onrender.com/api/iget/balance', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallet balance');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setWalletBalance(data.data.balance);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (parsedEntries.length === 0) {
      setError('No valid entries to process');
      return;
    }
    
    if (totalCost > walletBalance) {
      setError('Insufficient wallet balance for this bulk purchase');
      return;
    }
    
    setIsProcessing(true);
    setError('');
    
    try {
      // Get token from localStorage
      const token = localStorage.getItem('igettoken');
      
      if (!token) {
        setError('You need to be logged in to make a purchase');
        setIsProcessing(false);
        return;
      }
      
      // FIXED: Include price and bundleType with each order
      const response = await fetch('https://keymedia-consult.onrender.com/api/orders/bulk-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          networkKey: bundleType,
          orders: parsedEntries.map(entry => ({
            recipient: entry.recipient,
            capacity: entry.capacity,
            price: entry.price,           // ADDED: Include price
            bundleType: entry.bundleType  // ADDED: Include bundleType
          }))
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResults(data);
        setBulkInput('');
        fetchWalletBalance(); // Refresh wallet balance
      } else {
        setError(data.message || 'Failed to process bulk purchase');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Bulk purchase error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file upload (Excel)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Only allow Excel files
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Only Excel files (.xlsx or .xls) are supported');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        // Parse Excel file
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Convert to the required format (phone capacity)
        const formattedData = jsonData
          .filter(row => Array.isArray(row) && row.length >= 2) // Must have at least 2 columns
          .map(row => {
            // Get the first two columns
            const phoneNumber = row[0]?.toString().trim();
            const capacity = row[1]?.toString().trim();
            
            // Return formatted line
            return `${phoneNumber} ${capacity}`;
          })
          .filter(line => line.split(' ').length === 2); // Must have both phone and capacity
        
        // Set the formatted data as input
        setBulkInput(formattedData.join('\n'));
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        setError('Failed to parse Excel file. Please check the format.');
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  // Download Excel template
  const downloadExcelTemplate = () => {
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Get template capacities
    const templateCapacities = availableCapacities.length > 0 
      ? [
          availableCapacities[0], 
          availableCapacities[Math.min(2, availableCapacities.length - 1)],
          availableCapacities[Math.min(4, availableCapacities.length - 1)]
        ]
      : ['1', '5', '10'];
    
    // Create template data
    const templateData = [
      ['Phone Number', 'Capacity (GB)'],
      ['0241234567', templateCapacities[0]],
      ['0201234567', templateCapacities[1]],
      ['0551234567', templateCapacities[2]]
    ];
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    
    // Set column widths
    const colWidths = [
      { wch: 15 },  // Phone Number column
      { wch: 15 }   // Capacity column
    ];
    worksheet['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bulk Purchase');
    
    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, 'bulk_purchase_template.xlsx');
  };

  // Loading state
  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      <span className="ml-3 text-lg">Loading bundle data...</span>
    </div>
  );

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Bulk Data Purchase</h2>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <p className="text-gray-300">Current Balance: <span className="font-semibold text-white">{walletBalance.toFixed(2)} GHS</span></p>
          {totalCost > 0 && (
            <p className="text-gray-300">
              Total Cost: <span className={`font-semibold ${totalCost > walletBalance ? 'text-red-500' : 'text-green-400'}`}>
                {totalCost.toFixed(2)} GHS
              </span>
            </p>
          )}
        </div>
        
        {totalCost > walletBalance && (
          <div className="bg-red-900/30 border border-red-700 rounded p-2 mb-4 text-red-400 flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <p>Insufficient balance for this bulk purchase. Please add funds to your wallet.</p>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-white font-medium mb-2">Network</label>
          <select 
            value={bundleType}
            onChange={(e) => setBundleType(e.target.value)}
            className="w-full bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {networkOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mb-2">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-white font-medium">Bulk Purchase Instructions</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={downloadExcelTemplate}
                className="text-blue-400 flex items-center text-sm hover:text-blue-300"
              >
                <FileSpreadsheet size={16} className="mr-1" />
                Download Template
              </button>
              
              <label className="text-green-400 flex items-center text-sm hover:text-green-300 cursor-pointer">
                <Upload size={16} className="mr-1" />
                Upload Excel
                <input 
                  type="file" 
                  accept=".xlsx,.xls" 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>
          
          <div className="bg-gray-800/50 rounded p-3 mb-2 text-gray-300 text-sm">
            <p>Enter each purchase on a new line in the format: <span className="font-mono bg-gray-800 px-1 rounded">phone_number capacity</span></p>
            <p className="mt-1">Phone numbers must be 10 digits starting with 0 (e.g., 0241234567)</p>
            <p className="mt-1">Example:</p>
            <pre className="font-mono bg-gray-800 p-2 rounded mt-1 text-gray-300">
              {availableCapacities.length > 0 ? (
                <>
                  0241234567 {availableCapacities[Math.min(2, availableCapacities.length - 1)]}
                  {'\n'}0201234567 {availableCapacities[Math.min(4, availableCapacities.length - 1)]}
                  {'\n'}0551234567 {availableCapacities[0]}
                </>
              ) : (
                <>
                  0241234567 5
                  {'\n'}0201234567 10
                  {'\n'}0551234567 1
                </>
              )}
            </pre>
          </div>
        </div>
        
        <div className="mb-4">
          <textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            className="w-full bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            rows={10}
            placeholder="Enter your bulk purchase data here..."
          />
        </div>
        
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded p-3 mb-4 text-red-400">
            {error}
          </div>
        )}
        
        {parsedEntries.length > 0 && (
          <div className="mb-4">
            <h3 className="text-white font-medium mb-2">Preview ({parsedEntries.length} orders)</h3>
            <div className="bg-gray-800/50 rounded border border-gray-700 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Line</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Recipient</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Capacity (GB)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Price (GHS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {parsedEntries.slice(0, 5).map((entry, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-300">{entry.lineNumber}</td>
                      <td className="px-4 py-2 text-sm text-gray-300">{entry.recipient}</td>
                      <td className="px-4 py-2 text-sm text-gray-300">{entry.capacity}</td>
                      <td className="px-4 py-2 text-sm text-gray-300">{parseFloat(entry.price).toFixed(2)}</td>
                    </tr>
                  ))}
                  {parsedEntries.length > 5 && (
                    <tr>
                      <td colSpan="4" className="px-4 py-2 text-sm text-gray-400 text-center">
                        + {parsedEntries.length - 5} more entries
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-800">
                  <tr>
                    <td colSpan="3" className="px-4 py-2 text-sm text-gray-300 font-medium text-right">Total:</td>
                    <td className="px-4 py-2 text-sm text-white font-medium">{totalCost.toFixed(2)} GHS</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
        
        <button
          type="submit"
          disabled={isProcessing || parsedEntries.length === 0 || totalCost > walletBalance}
          className={`w-full py-3 rounded font-medium flex items-center justify-center ${
            isProcessing || parsedEntries.length === 0 || totalCost > walletBalance
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isProcessing ? (
            <>Processing...</>
          ) : (
            <>
              Submit Bulk Purchase
              <ArrowRight size={18} className="ml-2" />
            </>
          )}
        </button>
      </form>
      
      {results && (
        <div className="mt-6 bg-gray-800 rounded p-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-3">
            <Check className="text-green-400" size={20} />
            Bulk Purchase Results
          </h3>
          
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Total Orders:</span>
              <span className="text-white">{results.data.totalOrders}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Successful:</span>
              <span className="text-green-400">{results.data.successful}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Failed:</span>
              <span className="text-red-400">{results.data.failed}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Total Amount:</span>
              <span className="text-white">{results.data.totalAmount.toFixed(2)} GHS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Remaining Balance:</span>
              <span className="text-white">{results.data.newBalance.toFixed(2)} GHS</span>
            </div>
          </div>
          
          {results.data.orders && results.data.orders.length > 0 && (
            <div>
              <h4 className="text-white font-medium mb-2">Order Details:</h4>
              <div className="bg-gray-800/50 rounded border border-gray-700 overflow-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Recipient</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Capacity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {results.data.orders.map((order, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-300">{order.recipient}</td>
                        <td className="px-4 py-2 text-sm text-gray-300">{order.capacity} GB</td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            order.status === 'completed' 
                              ? 'bg-green-900/50 text-green-400' 
                              : order.status === 'processing'
                                ? 'bg-blue-900/50 text-blue-400'
                                : order.status === 'failed'
                                  ? 'bg-red-900/50 text-red-400'
                                  : 'bg-yellow-900/50 text-yellow-400'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-300">{order.reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkPurchaseComponent;