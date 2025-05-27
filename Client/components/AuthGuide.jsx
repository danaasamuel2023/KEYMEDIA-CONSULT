// components/AuthGuard.js
'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthGuard({ children }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get token from localStorage
        const token = localStorage.getItem('igettoken');
        
        // If no token exists, redirect to auth page
        if (!token) {
          console.log('No token found, redirecting to login');
          router.push('/Signin');
          return;
        }
        
        // Verify token with your backend
        const response = await fetch('https://iget.onrender.com/api/dashboard/verify-token', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          // Token is invalid or expired
          console.log('Invalid token, logging out');
          localStorage.removeItem('igettoken');
          localStorage.removeItem('userData');
          router.push('/Signin');
          return;
        }
        
        // Token is valid, allow access to protected route
        setLoading(false);
        
      } catch (error) {
        console.error('Auth verification error:', error);
        // On error, clear auth data and redirect to login
        localStorage.removeItem('igettoken');
        localStorage.removeItem('userData');
        router.push('/auth');
      }
    };
    
    checkAuth();
  }, [router]);

  // Show nothing while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If authenticated, render the protected content
  return children;
}