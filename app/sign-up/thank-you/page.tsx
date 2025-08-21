'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ThankYouPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md text-center shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome to PadelFlow!
          </CardTitle>
          <CardDescription className="text-gray-600 text-base">
            Your account has been created successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 text-blue-700 mb-2">
              <Mail className="w-5 h-5" />
              <span className="font-medium">Check your email</span>
            </div>
            <p className="text-sm text-blue-600">
              We've sent you a confirmation email. Please click the link in the email to verify your account and start using PadelFlow.
            </p>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Didn't receive the email? Check your spam folder or contact support.
            </p>
            
            <div className="flex flex-col space-y-2">
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
        </CardContent>
      </Card>
    </div>
  );
}
