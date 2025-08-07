'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Calendar, Share2 } from 'lucide-react';
import Link from 'next/link';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  
  // Redirect authenticated users to tournaments page
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/dashboard/tournaments');
    }
  }, [isSignedIn, isLoaded, router]);

  // Show loading while checking authentication
  if (isLoaded && isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to tournaments...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">PadelFlow</h1>
          </div>
          <div className="flex items-center space-x-4">
            {isSignedIn ? (
              <>
                <Link href="/dashboard/tournaments">
                  <Button>Dashboard</Button>
                </Link>
                <UserButton afterSignOutUrl="/" />
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <Button variant="outline">Sign In</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button>Sign Up</Button>
                </SignUpButton>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Professional Padel Tournament Management
            </h2>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Organize, manage, and share padel tournaments with ease. From player registration 
              to bracket generation and live scoring - everything you need in one platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isSignedIn ? (
                <Link href="/dashboard/tournaments">
                  <Button size="lg" className="text-lg px-8 py-3">
                    Go to Tournaments
                  </Button>
                </Link>
              ) : (
                <>
                  <SignUpButton mode="modal">
                    <Button size="lg" className="text-lg px-8 py-3">
                      Get Started
                    </Button>
                  </SignUpButton>
                  <Link href="/public/demo123">
                    <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                      View Demo Tournament
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need to Run Perfect Tournaments
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built by padel enthusiasts for tournament organizers who demand excellence
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Tournament Creation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Set up tournaments with all the details - dates, locations, and formats
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Team Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Manage players, create teams, and automatically calculate seedings
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Match Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Auto-generate brackets with classification matches for every team
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <Share2 className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Public Sharing</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Share tournament progress with participants and spectators
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 padel-gradient text-white">
        <div className="container mx-auto text-center">
          <h3 className="text-3xl font-bold mb-4">
            Ready to Organize Your Next Tournament?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            Try our demo to see how easy tournament management can be
          </p>
          {isSignedIn ? (
            <Link href="/dashboard/tournaments">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
                Go to Tournaments
              </Button>
            </Link>
          ) : (
            <SignUpButton mode="modal">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
                Get Started Now
              </Button>
            </SignUpButton>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Trophy className="h-8 w-8" />
            <span className="text-2xl font-bold">PadelFlow</span>
          </div>
          <p className="text-gray-400">
            Professional tournament management for the padel community
          </p>
        </div>
      </footer>
    </div>
  );
}