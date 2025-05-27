// app/layout.js
'use client'

import { usePathname } from 'next/navigation';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/nav";
import AuthGuard from "@/components/AuthGuide";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Define routes that should be accessible without authentication
const publicRoutes = ['/auth', '/Signin', '/signup', '/forgot-password'];

function RootLayout({ children }) {
  const pathname = usePathname();
  
  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {isPublicRoute ? (
          // For public routes, don't use AuthGuard
          <>
            <Navigation />
            {children}
          </>
        ) : (
          // For protected routes, use AuthGuard
          <AuthGuard>
            <Navigation />
            {children}
          </AuthGuard>
        )}
      </body>
    </html>
  );
}

export default RootLayout;