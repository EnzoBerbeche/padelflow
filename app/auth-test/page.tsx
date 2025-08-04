'use client';

import { useUser, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthTestPage() {
  const { isSignedIn, isLoaded, user } = useUser();

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Clerk Authentication Test</CardTitle>
          <CardDescription>
            Debug page to test Clerk authentication functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Environment Variables</h3>
              <div className="text-sm space-y-1">
                <p>CLERK_PUBLISHABLE_KEY: {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing'}</p>
                <p>CLERK_SECRET_KEY: {process.env.CLERK_SECRET_KEY ? '✅ Set' : '❌ Missing'}</p>
                <p>SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
                <p>SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Clerk Status</h3>
              <div className="text-sm space-y-1">
                <p>Is Loaded: {isLoaded ? '✅ Yes' : '❌ No'}</p>
                <p>Is Signed In: {isSignedIn ? '✅ Yes' : '❌ No'}</p>
                <p>User ID: {user?.id || 'None'}</p>
                <p>User Email: {user?.emailAddresses?.[0]?.emailAddress || 'None'}</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            {!isSignedIn ? (
              <>
                <SignInButton mode="modal">
                  <Button>Sign In</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button variant="outline">Sign Up</Button>
                </SignUpButton>
              </>
            ) : (
              <>
                <UserButton afterSignOutUrl="/auth-test" />
                <Button variant="outline" onClick={() => console.log('User:', user)}>
                  Log User Info
                </Button>
              </>
            )}
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Debug Information</h4>
            <p className="text-sm text-blue-700">
              Check the browser console for detailed logs about Clerk initialization and any errors.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                console.log('Environment check:', {
                  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'Set' : 'Missing',
                  clerkSecretKey: process.env.CLERK_SECRET_KEY ? 'Set' : 'Missing',
                  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
                  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
                });
                console.log('Clerk status:', { isLoaded, isSignedIn, user });
              }}
              className="mt-2"
            >
              Log Debug Info
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 