'use client'
import React, { useState } from 'react';
import { AlertTriangle, XCircle, Info, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import AdminLayout from '@/components/adminWraper';

const NetworkRulesPage = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [showRules, setShowRules] = useState(true);

  return (
    <AdminLayout>
      <div className={`mb-6 ${darkMode ? 'bg-amber-900/30 border-amber-600' : 'bg-amber-50 border-amber-500'} border-l-4 p-4 rounded-md transition-colors duration-200`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <AlertTriangle className={`h-6 w-6 ${darkMode ? 'text-amber-400' : 'text-amber-500'} mr-2 transition-colors duration-200`} />
            <h2 className={`text-lg font-semibold ${darkMode ? 'text-amber-100' : 'text-gray-800'} transition-colors duration-200`}>iGet Ghana Admin Rules</h2>
          </div>
          <button 
            onClick={() => setShowRules(!showRules)} 
            className={`${darkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-500 hover:text-gray-700'} transition-colors duration-200 p-2 rounded-full hover:bg-opacity-10 hover:bg-gray-500`}
            aria-label={showRules ? "Hide rules" : "Show rules"}
          >
            {showRules ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>
        
        {showRules && (
          <div className={`mt-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} space-y-2 transition-colors duration-200`}>
            <p className="flex items-start">
              <span className="mr-2 mt-1"><XCircle className="h-4 w-4 text-red-500" /></span>
              <span>Do not skip any order(s). If you do you will be sacked.</span>
            </p>
            <p className="flex items-start">
              <span className="mr-2 mt-1"><XCircle className="h-4 w-4 text-red-500" /></span>
              <span>Do not process refund during network downtime, service monitoring by the telcos unless communicated to you by the business owner.</span>
            </p>
            <p className="flex items-start">
              <span className="mr-2 mt-1"><XCircle className="h-4 w-4 text-red-500" /></span>
              <span>Do not process refunds to commission numbers (where a network internet data bundle's order has been requested to a number on a different network). You'll be requested to pay for the service since our account will be Debited/limited to beneficiaries to subscription done.</span>
            </p>
            <p className="flex items-start">
              <span className="mr-2 mt-1"><XCircle className="h-4 w-4 text-red-500" /></span>
              <span>Do not change the status of the transactions if it is not so.</span>
            </p>
            <p className="flex items-start">
              <span className="mr-2 mt-1"><Info className={`h-4 w-4 ${darkMode ? 'text-blue-400' : 'text-blue-500'} transition-colors duration-200`} /></span>
              <span>Process top up only after payment has been received to your Mobile money account.</span>
            </p>
            <p className="flex items-start">
              <span className="mr-2 mt-1"><Info className={`h-4 w-4 ${darkMode ? 'text-blue-400' : 'text-blue-500'} transition-colors duration-200`} /></span>
              <span>Ensure all orders have been completed successfully.</span>
            </p>
            <p className="flex items-start">
              <span className="mr-2 mt-1"><Clock className={`h-4 w-4 ${darkMode ? 'text-amber-400' : 'text-amber-500'} transition-colors duration-200`} /></span>
              <span>Do not process orders outside business hours. If you do, you'll be sacked and held liable if audit doesn't tally with the expectations and you'll have to pay for it.</span>
            </p>
            <p className="flex items-start">
              <span className="mr-2 mt-1"><XCircle className="h-4 w-4 text-red-500" /></span>
              <span>Do not respond to messages where you are not in charge of. Intruding in other person's task is offensive and you'll be sacked.</span>
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default NetworkRulesPage;