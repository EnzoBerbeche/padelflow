'use client';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* NeyoPadel Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
            <img 
              src="/icons/icon.svg?v=2" 
              alt="NeyoPadel Logo" 
              className="w-8 h-8"
            />
            <span className="text-xl font-semibold text-gray-900">NeyoPadel</span>
          </Link>
          <div className="flex items-center space-x-3 flex-shrink-0">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">
                <Home className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          {/* Success Icon and Title */}
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to NeyoPadel!
            </h1>
            <p className="text-gray-600">
              Your account has been created successfully
            </p>
          </div>

          {/* Email Confirmation */}
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-center space-x-2 text-green-700 mb-2">
                <Mail className="w-5 h-5" />
                <span className="font-medium">Check your email</span>
              </div>
              <p className="text-sm text-green-600">
                We've sent you a confirmation email. Please click the link in the email to verify your account and start using NeyoPadel.
              </p>
            </div>
            
            <p className="text-sm text-gray-600">
              Didn't receive the email? Check your spam folder or contact support.
            </p>
            
            <div className="space-y-3">
              <Link href="/sign-in">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
              
              <Link href="/">
                <Button variant="ghost" className="w-full text-gray-600 hover:text-gray-900">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}