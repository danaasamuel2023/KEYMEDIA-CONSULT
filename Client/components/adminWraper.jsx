// components/AdminLayout.js - Simplified version with Editor restrictions
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

export default function AdminLayout({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const [permissions, setPermissions] = useState({});
  const router = useRouter();

  useEffect(() => {
    // Check authentication and admin status
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('igettoken');
        const userDataStr = localStorage.getItem('userData');
        
        if (!token) {
          router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
          return;
        }

        // Check if user has any admin role (including wallet_admin, Editor, etc.)
        if (userDataStr) {
          try {
            const userData = JSON.parse(userDataStr);
            const adminRoles = ['admin', 'credit_admin', 'debit_admin', 'wallet_admin', 'Editor'];
            if (adminRoles.includes(userData.role)) {
              setIsAdmin(true);
              setIsAuthenticated(true);
              setAdminData(userData);
              // Fetch detailed permissions from backend
              await fetchAdminPermissions(token);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.error('Error parsing userData from localStorage:', e);
          }
        }

        // Verify with backend if local storage doesn't confirm admin status
        try {
          const response = await axios.get('https://iget.onrender.com/api/admin/my-permissions', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (response.data.success) {
            const adminInfo = response.data.admin;
            const userPermissions = response.data.permissions;
            
            // Check if user has any admin privileges
            const hasAdminAccess = adminInfo.role === 'admin' || 
                                 adminInfo.role === 'credit_admin' || 
                                 adminInfo.role === 'debit_admin' ||
                                 adminInfo.role === 'wallet_admin' ||
                                 adminInfo.role === 'Editor';
            
            if (hasAdminAccess) {
              setIsAdmin(true);
              setAdminData(adminInfo);
              setPermissions(userPermissions);
              
              // Update localStorage with current admin data
              localStorage.setItem('userData', JSON.stringify(adminInfo));
              localStorage.setItem('userRole', adminInfo.role);
            } else {
              // Not an admin, redirect to regular dashboard
              router.push('/');
              return;
            }
          } else {
            // No admin access
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
            router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
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

  const fetchAdminPermissions = async (token) => {
    try {
      const response = await axios.get('https://iget.onrender.com/api/admin/my-permissions', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setPermissions(response.data.permissions);
        setAdminData(response.data.admin);
      }
    } catch (error) {
      console.error('Error fetching admin permissions:', error);
      // Set minimal permissions if fetch fails
      setPermissions({
        canViewAllUsers: false,
        canViewAllTransactions: false,
        canCredit: false,
        canDebit: false,
        canChangeRoles: false,
        canDeleteUsers: false,
        canUpdateOrderStatus: false
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('igettoken');
    localStorage.removeItem('userData');
    localStorage.removeItem('userRole');
    router.push('/Signin');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Helper function to get role display name
  const getRoleDisplayName = (role) => {
    switch(role) {
      case 'admin': return 'Full Admin';
      case 'credit_admin': return 'Credit Admin';
      case 'debit_admin': return 'Debit Admin';
      case 'wallet_admin': return 'Wallet Admin';
      case 'Editor': return 'Editor';
      default: return role || 'Admin';
    }
  };

  // Helper function to get role badge color
  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'credit_admin': return 'bg-green-100 text-green-800';
      case 'debit_admin': return 'bg-red-100 text-red-800';
      case 'wallet_admin': return 'bg-blue-100 text-blue-800';
      case 'Editor': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to determine what navigation items to show based on role
  const getNavigationItems = () => {
    const items = [];
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    
    // STRICT EDITOR RESTRICTIONS - Only show Orders for Editors
    if (adminData?.role === 'Editor') {
      items.push({
        href: '/admin-orders',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
        ),
        label: 'Orders Management',
        isActive: currentPath === '/admin-orders' || currentPath.includes('/admin-orders'),
        badge: 'Editor Access',
        badgeColor: 'text-orange-300'
      });
      return items; // Return early for Editors - no other navigation items
    }
    
    // For non-Editor roles, show appropriate navigation items
    // Users/Wallet Operations - Show for wallet admins and full admins
    if (adminData?.role === 'admin' || adminData?.role === 'wallet_admin' || 
        adminData?.role === 'credit_admin' || adminData?.role === 'debit_admin' ||
        permissions.canViewAllUsers || permissions.canCredit || permissions.canDebit) {
      items.push({
        href: '/admin-users',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
        label: adminData?.role === 'admin' ? 'Users' : 'Wallet Operations',
        isActive: currentPath === '/admin-users' || currentPath.includes('/admin-users'),
        badge: !permissions.canViewAllUsers ? '(Limited)' : null,
        badgeColor: 'text-yellow-300'
      });
    }

    // Orders - Show for full admins (Editors handled above)
    if (adminData?.role === 'admin' || permissions.canUpdateOrderStatus) {
      items.push({
        href: '/admin-orders',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
        ),
        label: 'Orders',
        isActive: currentPath === '/admin-orders' || currentPath.includes('/admin-orders')
      });
    }

    // Full Admin Only Routes
    if (adminData?.role === 'admin') {
      items.push(
        {
          href: '/admin-rules',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          label: 'Rules',
          isActive: currentPath === '/admin-rules' || currentPath.includes('/admin-rules')
        },
        {
          href: '/Transactions',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Transactions',
          isActive: currentPath === '/Transactions' || currentPath.includes('/Transactions')
        },
        {
          href: '/admin/bundles',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          ),
          label: 'Bundles',
          isActive: currentPath === '/admin/bundles' || currentPath.includes('/admin/bundles')
        },
        {
          href: '/update-prices',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Update Prices',
          isActive: currentPath === '/update-prices' || currentPath.includes('/update-prices')
        },
        {
          href: '/top-sale',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ),
          label: 'Top Sale',
          isActive: currentPath === '/top-sale' || currentPath.includes('/top-sale')
        },
        {
          href: '/sms',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          ),
          label: 'SMS',
          isActive: currentPath === '/sms' || currentPath.includes('/sms')
        },
        {
          href: '/admin-settings',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
          label: 'API Configure',
          isActive: currentPath === '/admin-settings' || currentPath.includes('/admin-settings')
        }
      );
    }

    return items;
  };

  // Get role-specific information section
  const getRoleInfoSection = () => {
    if (adminData?.role === 'admin') return null; // Full admin doesn't need info section
    
    const roleInfo = {
      wallet_admin: {
        title: 'Wallet Admin Access',
        description: 'You can credit and debit user wallets',
        color: 'bg-blue-800'
      },
      credit_admin: {
        title: 'Credit Admin Access',
        description: 'You can only credit user wallets',
        color: 'bg-green-800'
      },
      debit_admin: {
        title: 'Debit Admin Access',
        description: 'You can only debit user wallets',
        color: 'bg-red-800'
      },
      Editor: {
        title: 'Editor Access - Orders Only',
        description: 'You can update order statuses and manage orders',
        color: 'bg-orange-800'
      }
    };

    const info = roleInfo[adminData?.role];
    if (!info) return null;

    return (
      <div className="px-2 py-4">
        <div className={`${info.color} rounded-lg p-3`}>
          <div className="text-white text-sm">
            <div className="font-medium mb-1">{info.title}</div>
            <div className="text-orange-200 text-xs">{info.description}</div>
            {adminData?.role === 'Editor' && (
              <div className="text-orange-200 text-xs mt-2">
                <div className="font-medium">Access Restrictions:</div>
                <div>• Orders management only</div>
                <div>• No access to other admin sections</div>
                <div>• Cannot view user wallets or transactions</div>
              </div>
            )}
            {adminData?.role !== 'Editor' && (
              <div className="text-blue-200 text-xs mt-2">
                {adminData?.role === 'Editor' ? 
                  'Access the Orders section to manage order operations.' :
                  'Access the Users section to manage wallet operations.'
                }
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Block navigation for Editors attempting to access restricted routes
  const handleNavigationClick = (href, event) => {
    if (adminData?.role === 'Editor' && href !== '/admin-orders') {
      event.preventDefault();
      alert('Access Denied: Editors can only access the Orders section.');
      return false;
    }
    return true;
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  const navigationItems = getNavigationItems();

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-10 md:hidden bg-gray-600 bg-opacity-75"
          onClick={toggleSidebar}
        ></div>
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-20 bg-gray-800 transition-all duration-300 transform
          ${sidebarOpen ? 'md:w-64 w-64' : 'w-0 md:w-16'} overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 bg-gray-900 px-4">
          <div className={`transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 md:hidden'}`}>
            <span className="text-white font-bold text-lg">
              {adminData?.role === 'Editor' ? 'Editor Panel' : 'Admin Panel'}
            </span>
            {adminData && (
              <div className="flex items-center mt-1">
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${getRoleBadgeColor(adminData.role)}`}>
                  {getRoleDisplayName(adminData.role)}
                </span>
                {adminData.role === 'Editor' && (
                  <span className="ml-1 text-xs text-orange-300">(Orders Only)</span>
                )}
              </div>
            )}
          </div>
          
          <button 
            onClick={toggleSidebar}
            className="text-gray-300 hover:text-white focus:outline-none" 
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
            </svg>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-5">
          <div className="px-2 space-y-1">
            {navigationItems.map((item, index) => (
              <Link key={index} href={item.href}>
                <span 
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    item.isActive ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  } cursor-pointer`}
                  onClick={(e) => handleNavigationClick(item.href, e)}
                >
                  {item.icon}
                  <span className={`transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 hidden md:block'}`}>
                    {item.label}
                    {item.badge && (
                      <span className={`ml-1 text-xs ${item.badgeColor || 'text-yellow-300'}`}>
                        {item.badge}
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </nav>
        
        {/* Role-specific Information */}
        {getRoleInfoSection()}
        
        {/* User info and logout */}
        <div className="absolute bottom-0 w-full border-t border-gray-700">
          {/* Admin info section */}
          {adminData && sidebarOpen && (
            <div className="px-4 py-3 border-b border-gray-700">
              <div className="text-sm">
                <div className="text-white font-medium">{adminData.username}</div>
                <div className="text-gray-300 text-xs">{adminData.email}</div>
                <div className="mt-2">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getRoleBadgeColor(adminData.role)}`}>
                    {getRoleDisplayName(adminData.role)}
                  </span>
                  {adminData.role === 'Editor' && (
                    <div className="text-orange-300 text-xs mt-1">Orders Only Access</div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white w-full transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className={`transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 hidden md:block'}`}>
              Logout
            </span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'ml-0 md:ml-16'}`}>
        {/* Top navigation */}
        <div className="bg-white dark:bg-gray-800 shadow-sm z-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center">
                {/* Mobile menu button */}
                <button
                  onClick={toggleSidebar}
                  className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                >
                  <span className="sr-only">Open sidebar</span>
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                {/* Current admin info in header */}
                {adminData && (
                  <div className="ml-4 hidden md:flex items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Logged in as:</span>
                    <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">{adminData.username}</span>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full font-medium ${getRoleBadgeColor(adminData.role)}`}>
                      {getRoleDisplayName(adminData.role)}
                    </span>
                    {adminData.role === 'Editor' && (
                      <span className="ml-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">
                        Orders Only
                      </span>
                    )}
                  </div>
                )}
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

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-4 relative">
          {children}
        </main>
      </div>
    </div>
  );
}