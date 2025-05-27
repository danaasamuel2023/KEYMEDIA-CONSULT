// pages/auth.js
'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import logo from '../../images/igetLogo - Copy.jpg'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const router = useRouter();

  // Check for dark mode on component mount and when system preference changes
  useEffect(() => {
    // Check if user prefers dark mode
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeQuery.matches);

    // Listen for changes in system dark mode preference
    const handleDarkModeChange = (e) => {
      setIsDarkMode(e.matches);
    };
    
    darkModeQuery.addEventListener('change', handleDarkModeChange);
    
    // Clean up event listener
    return () => {
      darkModeQuery.removeEventListener('change', handleDarkModeChange);
    };
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    setError('');
    
    if (isLogin) {
      if (!formData.username || !formData.password) {
        setError('Username and password are required');
        return false;
      }
    } else {
      if (!formData.username || !formData.email || !formData.password || !formData.phone) {
        setError('All fields are required');
        return false;
      }
      
      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        return false;
      }
      
      // Simple phone validation
      const phoneRegex = /^\d{10,15}$/;
      if (!phoneRegex.test(formData.phone.replace(/[^\d]/g, ''))) {
        setError('Please enter a valid phone number');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const endpoint = isLogin ? 'https://keymedia-consult.onrender.com/api/login' : 'https://keymedia-consult.onrender.com/api/register';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }
      
      // Store token and user data in localStorage
      localStorage.setItem('igettoken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));
      
      // Redirect to dashboard
      router.push('/');
      
    } catch (error) {
      setError(error.message);
      console.error('Authentication error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  // Updated classes to extend container to edges and match the black navbar
  // Removed min-h-screen from pageClass and added it to containerClass
  const containerClass = isDarkMode 
    ? "min-h-screen bg-gray-900 flex flex-col pt-0" 
    : "min-h-screen bg-white flex flex-col pt-0";
  
  const pageClass = "flex-grow flex items-center justify-center";
    
  const cardClass = isDarkMode
    ? "bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md"
    : "bg-white p-8 rounded-lg shadow-md w-full max-w-md";
    
  const headingClass = isDarkMode
    ? "text-2xl font-bold text-center mb-6 text-white"
    : "text-2xl font-bold text-center mb-6 text-gray-900";
    
  const labelClass = isDarkMode
    ? "block text-white font-medium mb-2"
    : "block text-gray-800 font-medium mb-2";
    
  const inputClass = isDarkMode
    ? "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white border-gray-600 placeholder-gray-400"
    : "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 text-gray-900 placeholder-gray-500";
    
  const errorClass = isDarkMode
    ? "bg-red-900 text-white p-3 rounded mb-4 font-medium"
    : "bg-red-100 text-red-800 p-3 rounded mb-4 font-medium";
    
  const linkTextClass = isDarkMode
    ? "text-blue-400 hover:underline font-medium"
    : "text-blue-600 hover:underline font-medium";
    
  const paragraphClass = isDarkMode
    ? "text-white"
    : "text-gray-700";

  const buttonClass = "w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 font-medium";

  return (
    <div className={containerClass}>
      <Head>
        <title>{isLogin ? 'Login' : 'Sign Up'} | IGet</title>
        <meta name="description" content="Authentication page" />
      </Head>
      
      <div className={pageClass}>
        <div className={cardClass}>
          <div className="flex justify-center mb-6">
            {/* Company Logo */}
            <div className="relative w-48 h-16">
              <Image 
                src={logo} 
                alt="Iget Logo" 
                layout="fill"
                objectFit="contain"
                priority
              />
            </div>
          </div>

          <h1 className={headingClass}>
            {isLogin ? 'Login to Your Account' : 'Create an Account'}
          </h1>
          
          {error && (
            <div className={errorClass}>
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="username" className={labelClass}>
                Username or Email
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={inputClass}
                placeholder="Enter your FullName"
              />
            </div>
            
            {!isLogin && (
              <>
                <div className="mb-4">
                  <label htmlFor="email" className={labelClass}>
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Enter your email"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="phone" className={labelClass}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Enter your phone number"
                  />
                </div>
              </>
            )}
            
            <div className="mb-6">
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={inputClass}
                placeholder="Enter your password"
              />
            </div>
            
            <button
              type="submit"
              className={buttonClass}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                isLogin ? 'Login' : 'Sign Up'
              )}
            </button>
            
            {isLogin && (
              <div className="mt-4 text-center">
                <Link href="/forgot-password" className={linkTextClass}>
                  Forgot password?
                </Link>
              </div>
            )}
          </form>
          
          <div className="mt-6 text-center">
            <p className={paragraphClass}>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                type="button"
                onClick={toggleAuthMode}
                className={`ml-2 ${linkTextClass}`}
              >
                {isLogin ? 'Sign Up' : 'Login'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}