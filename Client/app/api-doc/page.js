'use client'
import React, { useState } from 'react';
import Head from 'next/head';

export default function ApiDocumentation() {
  const [activeTab, setActiveTab] = useState('placeOrder');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Head>
        <title>Iget API Documentation</title>
        <meta name="description" content="API documentation for the Iget platform" />
      </Head>

      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Iget API Documentation</h1>
          <p className="mt-2 text-purple-100">Bundle Management API</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="md:w-64 flex-shrink-0">
            <nav className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sticky top-4">
              <ul className="space-y-1">
                <li>
                  <button 
                    onClick={() => setActiveTab('placeOrder')}
                    className={`w-full text-left px-4 py-2 rounded ${activeTab === 'placeOrder' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200'}`}
                  >
                    Place Order
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('getOrderByReference')}
                    className={`w-full text-left px-4 py-2 rounded ${activeTab === 'getOrderByReference' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200'}`}
                  >
                    Get Order By Reference
                  </button>
                </li>
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-grow">
            {activeTab === 'placeOrder' && (
              <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Place an Order</h2>
                
                <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-500 rounded">
                  <p className="text-blue-800 dark:text-blue-200">
                    This endpoint allows you to purchase mobile data bundles for any phone number. 
                    Payment is automatically processed from your wallet balance.
                  </p>
                </div>

                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-500 rounded">
                  <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                    <strong>Important:</strong> Always store the <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">orderReference</code> returned in the response. 
                    This reference is essential for tracking and verifying the status of orders, especially when handling callbacks or checking order completion status.
                  </p>
                </div>
                
                <div className="mb-4">
                  <span className="bg-green-500 text-white text-sm font-bold px-2 py-1 rounded-md mr-2">POST</span>
                  <code className="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-200 px-2 py-1">/api/developer/orders/place</code>
                </div>
                
                <h3 className="text-lg font-semibold mt-6 mb-3 dark:text-gray-200">Authentication</h3>
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left dark:text-gray-200">Header</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left dark:text-gray-200">Value</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left dark:text-gray-200">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 font-mono text-sm dark:text-gray-200">X-API-Key</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 font-mono text-sm dark:text-gray-200">your_api_key</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">Your API key for authentication</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <h3 className="text-lg font-semibold mt-6 mb-3 dark:text-gray-200">Request Body</h3>
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-6">
                  <pre className="text-sm overflow-x-auto dark:text-gray-200">
{`{
  "recipientNumber": "0201234567",    // Required: Phone number starting with 0
  "capacity": 1,                    // Required: Bundle capacity in GB
  "bundleType": "mtnup2u"             // Required: Bundle type (see Bundle Types section)
}`}
                  </pre>
                </div>
                
                <h4 className="font-medium text-gray-700 dark:text-gray-200 mb-2">Field Descriptions:</h4>
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left dark:text-gray-200">Field</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left dark:text-gray-200">Type</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left dark:text-gray-200">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">recipientNumber</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">String</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">
                          Phone number must start with 0 (local format).<br/>
                          Example: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">0201234567</code>
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">capacity</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">Number</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">
                          Data bundle size in  (GB).<br/>
                          Common values: 1, 2, 5, 10, 20
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">bundleType</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">String</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">
                          Type of bundle to purchase.<br/>
                          Values: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">mtnup2u</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">mtn-fibre</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">mtn-justforu</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">AT-ishare</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">Telecel-5959</code>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <h3 className="text-lg font-semibold mt-6 mb-3 dark:text-gray-200">Response (201 Created)</h3>
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-6">
                  <pre className="text-sm overflow-x-auto dark:text-gray-200">
{`{
  "success": true,
  "message": "Order placed successfully and payment processed",
  "data": {
    "order": {
      "id": "6074e5b5c72e3a001fc4b3a1",
      "orderReference": "ORD-123456",
      "recipientNumber": "0201234567",
      "bundleType": "mtnup2u",
      "capacity": 1,
      "price": 5.99,
      "status": "pending",
      "createdAt": "2025-03-16T12:34:56.789Z"
    },
    "transaction": {
      "id": "6074e5b5c72e3a001fc4b3a2",
      "reference": "API-TXN-1647431696789-123",
      "amount": 5.99,
      "status": "completed"
    },
    "walletBalance": 94.01
  }
}`}
                  </pre>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3 dark:text-gray-200">Order Status Values</h3>
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left dark:text-gray-200">Status</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left dark:text-gray-200">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-xs font-medium">pending</span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">
                          Order has been created and payment processed, but bundle has not yet been delivered
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">completed</span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">
                          Bundle has been successfully delivered to the recipient
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-xs font-medium">failed</span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">
                          Order could not be completed due to an error. Check failureReason field for details
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium">processing</span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">
                          Order is being processed by the network provider
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <h3 className="text-lg font-semibold mt-6 mb-3 dark:text-gray-200">Example Request</h3>
                <div className="bg-gray-800 text-green-400 p-3 rounded-lg overflow-x-auto">
                  <pre>
{`curl -X POST https://iget.onrender.com/api/developer/orders/place \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{
    "recipientNumber": "0201234567",
    "capacity": 1,
    "bundleType": "mtnup2u"
  }'`}
                  </pre>
                </div>
              </section>
            )}

            {activeTab === 'getOrderByReference' && (
              <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Get Order By Reference</h2>
                
                <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-500 rounded">
                  <p className="text-blue-800 dark:text-blue-200">
                    This endpoint allows you to retrieve details about a specific order using its unique reference. 
                    This is especially useful for checking the status of an order after it has been placed.
                  </p>
                </div>

                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-500 rounded">
                  <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                    <strong>Best Practice:</strong> Always store the <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">orderReference</code> in your database when placing an order. 
                    This reference should be used to track the order status through its lifecycle, especially for reconciliation processes.
                  </p>
                </div>
                
                <div className="mb-4">
                  <span className="bg-blue-500 text-white text-sm font-bold px-2 py-1 rounded-md mr-2">GET</span>
                  <code className="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-200 px-2 py-1">/api/developer/orders/reference/:orderRef</code>
                </div>
                
                <h3 className="text-lg font-semibold mt-6 mb-3 dark:text-gray-200">Authentication</h3>
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left dark:text-gray-200">Header</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left dark:text-gray-200">Value</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left dark:text-gray-200">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 font-mono text-sm dark:text-gray-200">X-API-Key</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 font-mono text-sm dark:text-gray-200">your_api_key</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">Your API key for authentication</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <h3 className="text-lg font-semibold mt-6 mb-3 dark:text-gray-200">Path Parameters</h3>
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left dark:text-gray-200">Parameter</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left dark:text-gray-200">Type</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left dark:text-gray-200">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">orderRef</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">String</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">
                          The unique order reference returned when placing an order.<br/>
                          Example: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">ORD-123456</code>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <h3 className="text-lg font-semibold mt-6 mb-3 dark:text-gray-200">Response (200 OK)</h3>
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-6">
                  <pre className="text-sm overflow-x-auto dark:text-gray-200">
{`{
  "success": true,
  "data": {
    "order": {
      "id": "6074e5b5c72e3a001fc4b3a1",
      "orderReference": "ORD-123456",
      "recipientNumber": "0201234567",
      "bundleType": "mtnup2u",
      "capacity": 1,
      "price": 5.99,
      "status": "completed",
      "createdAt": "2025-03-16T12:34:56.789Z",
      "completedAt": "2025-03-16T12:36:23.456Z",
      "failureReason": null
    },
    "transaction": {
      "reference": "API-TXN-1647431696789-123",
      "amount": 5.99,
      "status": "completed"
    }
  }
}`}
                  </pre>
                </div>
                
                <h3 className="text-lg font-semibold mt-6 mb-3 dark:text-gray-200">Error Responses</h3>
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left dark:text-gray-200">Status Code</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left dark:text-gray-200">Error Message</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left dark:text-gray-200">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">400</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">Order reference is required</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">The order reference was not provided in the request</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">404</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">Order not found or not authorized to access</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">The order with the given reference doesn't exist or doesn't belong to the authenticated user</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">500</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">Server error</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 dark:text-gray-200">An unexpected error occurred on the server</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <h3 className="text-lg font-semibold mt-6 mb-3 dark:text-gray-200">Example Request</h3>
                <div className="bg-gray-800 text-green-400 p-3 rounded-lg overflow-x-auto">
                  <pre>
{`curl -X GET https://iget.onrender.com/api/developer/orders/reference/ORD-123456 \\
  -H "X-API-Key: your_api_key_here"`}
                  </pre>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}