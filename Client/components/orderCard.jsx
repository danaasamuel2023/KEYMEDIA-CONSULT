// components/orders/OrderCard.js
import { useState } from 'react';
import { format } from 'date-fns';

export default function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  
  // Status badge style based on order status
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'refunded':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
      <div className="flex flex-col md:flex-row justify-between">
        <div className="flex flex-col mb-2 md:mb-0">
          <span className="text-sm text-gray-500 dark:text-gray-400">Order ID</span>
          <span className="font-medium text-gray-900 dark:text-white">{order.orderReference || order._id}</span>
        </div>
        
        <div className="flex flex-col mb-2 md:mb-0">
          <span className="text-sm text-gray-500 dark:text-gray-400">Bundle</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {order.capacity}MB {order.bundleType}
          </span>
        </div>
        
        <div className="flex flex-col mb-2 md:mb-0">
          <span className="text-sm text-gray-500 dark:text-gray-400">Price</span>
          <span className="font-medium text-gray-900 dark:text-white">${order.price.toFixed(2)}</span>
        </div>
        
        <div className="flex flex-col mb-2 md:mb-0">
          <span className="text-sm text-gray-500 dark:text-gray-400">Time</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {format(new Date(order.createdAt), 'h:mm a')}
          </span>
        </div>
        
        <div className="flex flex-col mb-2 md:mb-0">
          <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(order.status)}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          {expanded ? 'Hide Details' : 'View Details'}
        </button>
      </div>
      
      {expanded && (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Recipient Number</h4>
              <p className="text-gray-900 dark:text-white">{order.recipientNumber}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Created At</h4>
              <p className="text-gray-900 dark:text-white">
                {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
            
            {order.updatedAt && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</h4>
                <p className="text-gray-900 dark:text-white">
                  {format(new Date(order.updatedAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}