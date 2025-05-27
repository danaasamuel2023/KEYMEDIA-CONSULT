// components/AdminLayout.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

export default function AdminLayout({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default to open on larger screens
  const router = useRouter();

  useEffect(() => {
    // Check authentication and admin status
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('igettoken');
        const userDataStr = localStorage.getItem('userData');
        
        if (!token) {
          router.push('/login?redirect=' + encodeURIComponent(router.asPath));
          return;
        }

        // If userRole is stored in local storage, use it for quick check
        if (userDataStr) {
          try {
            const userData = JSON.parse(userDataStr);
            if (userData.role === 'admin') {
              setIsAdmin(true);
              setIsAuthenticated(true);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.error('Error parsing userData from localStorage:', e);
          }
        }

        // Verify with backend if local storage doesn't confirm admin status
        try {
          const response = await axios.get('https://iget.onrender.com/api/auth/check-admin', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (response.data.isAdmin) {
            setIsAdmin(true);
            localStorage.setItem('userRole', 'admin');
          } else {
            // Not an admin, redirect to regular dashboard
            router.push('/');
            return;
          }
          
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error checking admin status:', error);
          // Handle expired or invalid token
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem('igettoken');
            localStorage.removeItem('userData');
            router.push('/login?redirect=' + encodeURIComponent(router.asPath));
          } else {
            // For other errors, assume not admin
            router.push('/');
          }
          return;
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('igettoken');
    localStorage.removeItem('userData');
    router.push('/Signin');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not authenticated or not admin, this will already be redirected by useEffect

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile sidebar backdrop - only show on mobile when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-10 md:hidden bg-gray-600 bg-opacity-75"
          onClick={toggleSidebar}
        ></div>
      )}
      
      {/* Sidebar - collapsed state controlled by sidebarOpen - Lower z-index to prevent overlap with modals */}
      <div 
        className={`fixed inset-y-0 left-0 z-20 bg-gray-800 transition-all duration-300 transform
          ${sidebarOpen ? 'md:w-64 w-64' : 'w-0 md:w-16'} overflow-hidden`}
      >
        {/* Sidebar Header with Toggle Button */}
        <div className="flex items-center justify-between h-16 bg-gray-900 px-4">
          <span className={`text-white font-bold text-xl transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 md:hidden'}`}>
            Admin Dashboard
          </span>
          
          {/* Toggle button for desktop */}
          <button 
            onClick={toggleSidebar}
            className="text-gray-300 hover:text-white focus:outline-none" 
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
            </svg>
          </button>
        </div>

        {/* Nav Menu */}
        <nav className="mt-5">
          <div className="px-2 space-y-1">
            <Link href="/admin-rules">
              <span className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${router.pathname === '/admin/dashboard' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} cursor-pointer`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className={`transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 hidden md:block'}`}>
                  Rules
                </span>
              </span>
            </Link>
            <Link href="/admin-users">
              <span className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${router.pathname === '/admin/users' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} cursor-pointer`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className={`transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 hidden md:block'}`}>
                  Users
                </span>
              </span>
            </Link>
            <Link href="/Transactions">
              <span className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${router.pathname === '/admin/transactions' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} cursor-pointer`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={`transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 hidden md:block'}`}>
                  Transactions
                </span>
              </span>
            </Link>
            <Link href="/admin/bundles">
              <span className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${router.pathname === '/admin/bundles' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} cursor-pointer`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span className={`transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 hidden md:block'}`}>
                  Bundles
                </span>
              </span>
            </Link>
            <Link href="/admin-orders">
              <span className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${router.pathname === '/admin/orders' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} cursor-pointer`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                <span className={`transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 hidden md:block'}`}>
                  Orders
                </span>
              </span>
            </Link>
            <Link href="/update-prices">
              <span className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${router.pathname === '/update-prices' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} cursor-pointer`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={`transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 hidden md:block'}`}>
                  Update Prices
                </span>
              </span>
            </Link>
            {/* Top Sale Link */}
            <Link href="/top-sale">
              <span className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${router.pathname === '/top-sale' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} cursor-pointer`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className={`transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 hidden md:block'}`}>
                  Top Sale
                </span>
              </span>
            </Link>
            {/* SMS Link */}
            <Link href="/sms">
              <span className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${router.pathname === '/admin/sms-all' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} cursor-pointer`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className={`transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 hidden md:block'}`}>
                  SMS
                </span>
              </span>
            </Link>
            {/* API Configure Link - NEW */}
            <Link href="/admin-settings">
              <span className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${router.pathname === '/admin-settings' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} cursor-pointer`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className={`transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 hidden md:block'}`}>
                  API Configure
                </span>
              </span>
            </Link>
            {/* <Link href="/admin/settings">
              <span className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${router.pathname === '/admin/settings' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} cursor-pointer`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className={`transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 hidden md:block'}`}>
                  Settings
                </span>
              </span>
            </Link> */}
          </div>
        </nav>
        
        {/* Logout button */}
        <div className="absolute bottom-0 w-full">
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white w-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className={`transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 hidden md:block'}`}>
              Logout
            </span>
          </button>
        </div>
      </div>

      {/* Main content - adjust width based on sidebar state */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'ml-0 md:ml-16'}`}>
        {/* Top navigation - Lower z-index to prevent overlap with modals */}
        <div className="bg-white dark:bg-gray-800 shadow-sm z-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center">
                {/* Mobile menu button - only visible on mobile */}
                <button
                  onClick={toggleSidebar}
                  className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                >
                  <span className="sr-only">Open sidebar</span>
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                {/* Page title could go here */}
              </div>
              
              <div className="flex items-center justify-end flex-1">
                <div className="ml-4 flex items-center md:ml-6">
                  <Link href="/" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                    <span className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content - Ensure it doesn't have a z-index that conflicts with modals */}
        <main className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-4 relative">
          {children}
        </main>
      </div>
    </div>
  );
}