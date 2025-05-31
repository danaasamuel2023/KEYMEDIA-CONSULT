'use client'
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import logo from '../images/igetLogo - Copy.jpg'

const Navigation = () => {
   const [isMenuOpen, setIsMenuOpen] = useState(false);
   const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false);
   const [user, setUser] = useState(null);
   const [balance, setBalance] = useState(null);
   const router = useRouter();

   // Create refs for dropdown containers to detect outside clicks
   const servicesDropdownRef = useRef(null);
   const mobileMenuRef = useRef(null);

   // Helper function to check if user has admin privileges
   const isAdmin = (userRole) => {
     const adminRoles = ['admin', 'credit_admin', 'debit_admin', 'wallet_admin', 'Editor'];
     return adminRoles.includes(userRole);
   };

   // Helper function to get role display name
   const getRoleDisplayName = (role) => {
     switch(role) {
       case 'admin': return 'Full Admin';
       case 'credit_admin': return 'Credit Admin';
       case 'debit_admin': return 'Debit Admin';
       case 'wallet_admin': return 'Wallet Admin';
       case 'agent': return 'Agent';
       case 'Editor': return 'Editor';
       default: return 'User';
     }
   };

   // Helper function to get role badge color
   const getRoleBadgeColor = (role) => {
     switch(role) {
       case 'admin': return 'bg-purple-500';
       case 'credit_admin': return 'bg-green-500';
       case 'debit_admin': return 'bg-red-500';
       case 'wallet_admin': return 'bg-blue-500';
       case 'agent': return 'bg-cyan-500';
       case 'Editor': return 'bg-orange-500';
       default: return 'bg-gray-500';
     }
   };

   // Helper function to get admin navigation based on role
   const getAdminNavigation = (role) => {
     switch(role) {
       case 'Editor':
         return {
           mainLink: '/admin-orders',
           mainLabel: 'Orders Management',
           description: 'Manage and update order statuses'
         };
       case 'wallet_admin':
         return {
           mainLink: '/admin-users',
           mainLabel: 'Wallet Operations',
           description: 'Credit and debit user wallets'
         };
       case 'admin':
         return {
           mainLink: '/admin-users',
           mainLabel: 'Admin Panel',
           description: 'Full administrative access'
         };
       default:
         return {
           mainLink: '/admin-users',
           mainLabel: 'Admin Panel',
           description: 'Administrative access'
         };
     }
   };

   // Check for authentication token on component mount and window focus
   useEffect(() => {
     const checkAuth = () => {
       try {
         const token = localStorage.getItem('igettoken');
         const userData = localStorage.getItem('userData');

         if (token && userData) {
           setUser(JSON.parse(userData));
           fetchUserBalance(token);
         } else {
           setUser(null);
           setBalance(null);
         }
       } catch (error) {
         console.error('Error checking authentication:', error);
         setUser(null);
         setBalance(null);
       }
     };

     checkAuth();
     window.addEventListener('focus', checkAuth);

     return () => {
       window.removeEventListener('focus', checkAuth);
     };
   }, []);

   // Handle click outside to close menus
   useEffect(() => {
     const handleClickOutside = (event) => {
       // Close services dropdown if click is outside
       if (
         servicesDropdownRef.current && 
         !servicesDropdownRef.current.contains(event.target)
       ) {
         setIsServicesDropdownOpen(false);
       }
     };

     document.addEventListener('mousedown', handleClickOutside);

     return () => {
       document.removeEventListener('mousedown', handleClickOutside);
     };
   }, []);

   // Fetch user balance from API
   const fetchUserBalance = async (token) => {
     try {
       const response = await fetch('https://keymedia-consult.onrender.com/api/iget/balance', {
         method: 'GET',
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json'
         }
       });

       if (!response.ok) {
         throw new Error('Failed to fetch balance');
       }

       const data = await response.json();

       if (data.success) {
         setBalance(data.data);
       }
     } catch (error) {
       console.error('Error fetching user balance:', error);
     }
   };

   // Toggle mobile menu
   const toggleMenu = () => {
     setIsMenuOpen(!isMenuOpen);
     // Close services dropdown when main menu is toggled
     setIsServicesDropdownOpen(false);
   };

   // Toggle services dropdown (only used for desktop view now)
   const toggleServicesDropdown = (e) => {
     e.preventDefault();
     e.stopPropagation();
     setIsServicesDropdownOpen(!isServicesDropdownOpen);
   };

   // Handle logout
   const handleLogout = () => {
     localStorage.removeItem('igettoken');
     localStorage.removeItem('userData');
     setUser(null);
     setBalance(null);
     router.push('/Signin');
     // Close menu after logout
     setIsMenuOpen(false);
   };

   // Improved navigation handler for service links - fix for mobile view
   const navigateToService = (service) => {
     // Close menus first
     setIsMenuOpen(false);
     setIsServicesDropdownOpen(false);
     
     // Then navigate programmatically
     router.push(`/${service}`);
   };

   // Handle regular link click to close menus
   const handleLinkClick = () => {
     // Close both menus
     setIsMenuOpen(false);
     setIsServicesDropdownOpen(false);
   };

   // Bundle service types from schema
   const serviceTypes = [
     'AfA-registration',
     'mtn',
     'at-ishare',
     'telecel'
   ];

   return (
     <nav className="bg-gradient-to-r from-gray-900 to-black text-white shadow-2xl sticky top-0 z-50">
       <div className="container mx-auto px-4 lg:px-6">
         <div className="flex justify-between items-center h-16">
           {/* Logo */}
           <div className="flex items-center flex-shrink-0">
             <Link 
               href="/" 
               onClick={handleLinkClick}
               className="flex items-center hover:opacity-80 transition-opacity"
             >
               <div className="relative h-10 w-10 overflow-hidden rounded-lg shadow-md">
                 <Image
                   src={logo}
                   alt="iGet Logo"
                   layout="fill"
                   objectFit="cover"
                   className="rounded-lg"
                   priority
                 />
               </div>
               <span className="ml-3 font-bold text-xl tracking-wide">KEYMEDIA</span>
             </Link>
           </div>

           {/* Desktop Navigation */}
           <div className="hidden lg:flex items-center space-x-8">
             <Link 
               href="/" 
               className="hover:text-blue-400 transition-colors duration-200 font-medium"
               onClick={handleLinkClick}
             >
               Home
             </Link>
             <Link 
               href="/api-key" 
               className="hover:text-blue-400 transition-colors duration-200 font-medium"
               onClick={handleLinkClick}
             >
               API Keys
             </Link>

             {/* Services Dropdown */}
             <div className="relative" ref={servicesDropdownRef}>
               <button
                 onClick={toggleServicesDropdown}
                 className="flex items-center hover:text-blue-400 transition-colors duration-200 font-medium"
               >
                 Services
                 <svg
                   className={`w-4 h-4 ml-1 transition-transform duration-200 ${isServicesDropdownOpen ? 'rotate-180' : ''}`}
                   fill="none"
                   stroke="currentColor"
                   viewBox="0 0 24 24"
                 >
                   <path
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     strokeWidth="2"
                     d="M19 9l-7 7-7-7"
                   />
                 </svg>
               </button>

               {isServicesDropdownOpen && (
                 <div className="absolute left-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl py-2 z-20 border border-gray-700">
                   {serviceTypes.map((service, index) => (
                     <button
                       key={index}
                       className="block w-full text-left px-4 py-3 hover:bg-gray-700 capitalize transition-colors duration-200 text-sm font-medium"
                       onClick={() => navigateToService(service)}
                     >
                       {service}
                     </button>
                   ))}
                 </div>
               )}
             </div>

             {user ? (
               <>
                 <Link 
                   href="/bulk" 
                   className="hover:text-blue-400 transition-colors duration-200 font-medium"
                   onClick={handleLinkClick}
                 >
                   Bulk Purchase
                 </Link>
                 <Link 
                   href="/orders" 
                   className="hover:text-blue-400 transition-colors duration-200 font-medium"
                   onClick={handleLinkClick}
                 >
                   My Orders
                 </Link>
                 <Link 
                   href="/api-doc" 
                   className="hover:text-blue-400 transition-colors duration-200 font-medium"
                   onClick={handleLinkClick}
                 >
                   API Docs
                 </Link>

                 {/* Enhanced Admin Access with role-based navigation */}
                 {isAdmin(user.role) && (
                   <div className="flex items-center">
                     <Link 
                       href={getAdminNavigation(user.role).mainLink}
                       className="hover:text-blue-400 transition-colors duration-200 flex items-center font-medium"
                       onClick={handleLinkClick}
                     >
                       <span>{getAdminNavigation(user.role).mainLabel}</span>
                       <span className={`ml-2 px-3 py-1 text-xs rounded-full text-white font-semibold ${getRoleBadgeColor(user.role)} shadow-md`}>
                         {getRoleDisplayName(user.role)}
                       </span>
                     </Link>
                   </div>
                 )}

                 {/* User Profile Dropdown */}
                 <div className="relative">
                   <button
                     className="flex items-center bg-gray-800 rounded-xl px-4 py-2 hover:bg-gray-700 transition-colors duration-200 border border-gray-600"
                     onClick={toggleMenu}
                   >
                     <div className="flex flex-col items-start mr-3">
                       <span className="max-w-[120px] truncate text-sm font-medium" title={user.username}>
                         {user.username && user.username.includes('@') 
                           ? user.username.split('@')[0] 
                           : user.username}
                       </span>
                       {/* Show role badge under username for admin users */}
                       {isAdmin(user.role) && (
                         <span className={`text-xs px-2 py-0.5 rounded-full text-white mt-1 ${getRoleBadgeColor(user.role)} font-semibold`}>
                           {getRoleDisplayName(user.role)}
                         </span>
                       )}
                     </div>
                     {balance ? (
                       <span className="text-xs bg-gradient-to-r from-green-400 to-green-600 text-white rounded-full px-3 py-1 font-semibold shadow-md">
                         {balance.balance.toFixed(2)} {balance.currency}
                       </span>
                     ) : (
                       <span className="text-xs bg-gray-600 text-white rounded-full px-3 py-1 animate-pulse">
                         Loading...
                       </span>
                     )}
                   </button>

                   {isMenuOpen && (
                     <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl py-2 z-20 border border-gray-700">
                       <Link 
                         href="/api-key" 
                         className="block px-4 py-3 hover:bg-gray-700 transition-colors duration-200 text-sm"
                         onClick={handleLinkClick}
                       >
                         <div className="flex items-center">
                           <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                           </svg>
                           API Keys
                         </div>
                       </Link>
                       <hr className="border-gray-700 my-1" />
                       <button 
                         onClick={handleLogout} 
                         className="block w-full text-left px-4 py-3 hover:bg-red-600 transition-colors duration-200 text-sm text-red-400 hover:text-white"
                       >
                         <div className="flex items-center">
                           <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                           </svg>
                           Logout
                         </div>
                       </button>
                     </div>
                   )}
                 </div>
               </>
             ) : (
               <div className="flex items-center space-x-4">
                 <Link 
                   href="/Signin" 
                   className="hover:text-blue-400 transition-colors duration-200 font-medium"
                   onClick={handleLinkClick}
                 >
                   Login
                 </Link>
                 <Link 
                   href="/Signin" 
                   className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-6 py-2 rounded-lg transition-all duration-200 font-medium shadow-lg"
                   onClick={handleLinkClick}
                 >
                   Register
                 </Link>
               </div>
             )}
           </div>

           {/* Mobile menu button */}
           <div className="lg:hidden">
             <button 
               onClick={toggleMenu} 
               className="text-white focus:outline-none p-2 rounded-lg hover:bg-gray-800 transition-colors duration-200"
               aria-label="Toggle mobile menu"
             >
               <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 {isMenuOpen ? (
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 ) : (
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                 )}
               </svg>
             </button>
           </div>
         </div>

         {/* Improved Mobile Navigation */}
         {isMenuOpen && (
           <div className="lg:hidden fixed inset-0 bg-black bg-opacity-95 z-50 overflow-y-auto">
             <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
               {/* Mobile Header */}
               <div className="flex items-center justify-between p-6 border-b border-gray-700">
                 <div className="flex items-center">
                   <div className="relative h-10 w-10 overflow-hidden rounded-lg">
                     <Image
                       src={logo}
                       alt="iGet Logo"
                       layout="fill"
                       objectFit="cover"
                       className="rounded-lg"
                     />
                   </div>
                   <span className="ml-3 font-bold text-xl text-white">iGet</span>
                 </div>
                 <button 
                   onClick={toggleMenu}
                   className="text-white p-2 rounded-lg hover:bg-gray-800 transition-colors duration-200"
                   aria-label="Close mobile menu"
                 >
                   <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>

               {/* Mobile Menu Content */}
               <div className="px-6 py-8 space-y-6">
                 {/* User Info Section - Enhanced and Clickable */}
                 {user && (
                   <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl border border-gray-600 shadow-lg overflow-hidden">
                     {/* Clickable User Info Area */}
                     {isAdmin(user.role) ? (
                       <Link 
                         href={getAdminNavigation(user.role).mainLink}
                         className="block p-6 hover:bg-gray-700 transition-colors duration-200"
                         onClick={handleLinkClick}
                       >
                         <div className="flex items-start justify-between mb-4">
                           <div className="flex-1">
                             <h3 className="text-white font-semibold text-lg">{user.username}</h3>
                             <div className="flex items-center mt-2">
                               <span className={`px-3 py-1 text-xs rounded-full text-white font-semibold ${getRoleBadgeColor(user.role)}`}>
                                 {getRoleDisplayName(user.role)}
                               </span>
                             </div>
                           </div>
                           {balance && (
                             <div className="text-right">
                               <div className="text-gray-400 text-sm">Balance</div>
                               <div className="text-green-400 font-bold text-lg">
                                 {balance.balance.toFixed(2)} {balance.currency}
                               </div>
                             </div>
                           )}
                         </div>
                         {/* Role-specific description with navigation hint */}
                         <div className="flex items-center justify-between">
                           <div className="text-gray-300 text-sm">
                             {getAdminNavigation(user.role).description}
                           </div>
                           <div className="flex items-center text-blue-400 text-xs">
                             <span className="mr-1">Tap to access</span>
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                             </svg>
                           </div>
                         </div>
                       </Link>
                     ) : (
                       <div className="p-6">
                         <div className="flex items-start justify-between mb-4">
                           <div className="flex-1">
                             <h3 className="text-white font-semibold text-lg">{user.username}</h3>
                             <div className="flex items-center mt-2">
                               <span className={`px-3 py-1 text-xs rounded-full text-white font-semibold ${getRoleBadgeColor(user.role)}`}>
                                 {getRoleDisplayName(user.role)}
                               </span>
                             </div>
                           </div>
                           {balance && (
                             <div className="text-right">
                               <div className="text-gray-400 text-sm">Balance</div>
                               <div className="text-green-400 font-bold text-lg">
                                 {balance.balance.toFixed(2)} {balance.currency}
                               </div>
                             </div>
                           )}
                         </div>
                         {/* Regular user description */}
                         <div className="text-gray-300 text-sm">
                           Regular user account
                         </div>
                       </div>
                     )}
                   </div>
                 )}

                 {/* Navigation Links */}
                 <div className="space-y-2">
                   <Link 
                     href="/" 
                     className="flex items-center px-4 py-4 text-white hover:bg-gray-800 rounded-xl transition-colors duration-200 border border-transparent hover:border-gray-600"
                     onClick={handleLinkClick}
                   >
                     <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                     </svg>
                     Home
                   </Link>

                   {/* Services Section - Collapsible */}
                   <div className="bg-gray-800 rounded-xl border border-gray-600 overflow-hidden">
                     <div className="px-4 py-3 text-white font-semibold border-b border-gray-700 bg-gray-750">
                       <div className="flex items-center">
                         <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14-7l2 2-2 2M5 3l2 2-2 2" />
                         </svg>
                         Services
                       </div>
                     </div>
                     <div className="p-2 space-y-1">
                       {serviceTypes.map((service, index) => (
                         <button
                           key={index}
                           className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 capitalize rounded-lg transition-colors duration-200 text-sm"
                           onClick={() => navigateToService(service)}
                         >
                           {service}
                         </button>
                       ))}
                     </div>
                   </div>

                   {user ? (
                     <>
                       <Link 
                         href="/bulk" 
                         className="flex items-center px-4 py-4 text-white hover:bg-gray-800 rounded-xl transition-colors duration-200 border border-transparent hover:border-gray-600"
                         onClick={handleLinkClick}
                       >
                         <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14-7l2 2-2 2M5 3l2 2-2 2" />
                         </svg>
                         Bulk Purchase
                       </Link>

                       <Link 
                         href="/orders" 
                         className="flex items-center px-4 py-4 text-white hover:bg-gray-800 rounded-xl transition-colors duration-200 border border-transparent hover:border-gray-600"
                         onClick={handleLinkClick}
                       >
                         <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                         </svg>
                         My Orders
                       </Link>

                       <Link 
                         href="/api-doc" 
                         className="flex items-center px-4 py-4 text-white hover:bg-gray-800 rounded-xl transition-colors duration-200 border border-transparent hover:border-gray-600"
                         onClick={handleLinkClick}
                       >
                         <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                         </svg>
                         API Documentation
                       </Link>

                       {/* Enhanced Admin Section with role-based navigation */}
                       {isAdmin(user.role) && (
                         <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl border border-gray-600 overflow-hidden">
                           <div className="px-4 py-3 text-white font-semibold border-b border-gray-600 flex items-center justify-between">
                             <div className="flex items-center">
                               <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                               </svg>
                               {getAdminNavigation(user.role).mainLabel}
                             </div>
                             <span className={`px-3 py-1 text-xs rounded-full text-white font-semibold ${getRoleBadgeColor(user.role)}`}>
                               {getRoleDisplayName(user.role)}
                             </span>
                           </div>
                           <div className="p-2">
                             <Link 
                               href={getAdminNavigation(user.role).mainLink}
                               className="flex items-center w-full px-4 py-3 text-white hover:bg-gray-700 rounded-lg transition-colors duration-200"
                               onClick={handleLinkClick}
                             >
                               <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                               </svg>
                               {user.role === 'Editor' ? 'Go to Orders' : 
                                user.role === 'wallet_admin' ? 'Go to Wallet Operations' : 
                                'Go to Admin Panel'}
                             </Link>
                             
                             {/* Role-specific description */}
                             <div className="px-4 py-2 text-gray-400 text-xs">
                               {getAdminNavigation(user.role).description}
                             </div>
                           </div>
                         </div>
                       )}

                       <Link 
                         href="/api-key" 
                         className="flex items-center px-4 py-4 text-white hover:bg-gray-800 rounded-xl transition-colors duration-200 border border-transparent hover:border-gray-600"
                         onClick={handleLinkClick}
                       >
                         <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                         </svg>
                         API Keys
                       </Link>

                       {/* Logout Button */}
                       <button 
                         onClick={handleLogout} 
                         className="flex items-center w-full px-4 py-4 text-red-400 hover:bg-red-600 hover:text-white rounded-xl transition-colors duration-200 border border-red-600 hover:border-red-500 mt-6"
                       >
                         <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                         </svg>
                         Logout
                       </button>
                     </>
                   ) : (
                     <div className="space-y-3 pt-4">
                       <Link 
                         href="/Signin" 
                         className="flex items-center justify-center px-4 py-4 text-white hover:bg-gray-800 rounded-xl transition-colors duration-200 border border-gray-600 hover:border-gray-500"
                         onClick={handleLinkClick}
                       >
                         Login
                       </Link>
                       <Link 
                         href="/Signin" 
                         className="flex items-center justify-center px-4 py-4 text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl transition-all duration-200 font-semibold shadow-lg"
                         onClick={handleLinkClick}
                       >
                         Register
                       </Link>
                     </div>
                   )}
                 </div>
               </div>
             </div>
           </div>
         )}
       </div>
     </nav>
   );
};

export default Navigation;