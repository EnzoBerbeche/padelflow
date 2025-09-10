'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LogIn, Mail, Lock, UserPlus, ArrowLeft, Home } from 'lucide-react';
import { ensureProfileExists } from '@/lib/profile';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signInWithPassword = async () => {
    setLoading(true);
    setMessage(null);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      // Show error message instead of redirecting to sign-up
      setMessage(error.message);
      return;
    }
    if (data.session) {
      // Backfill display_name if missing
      const displayName = data.user?.user_metadata?.display_name as string | undefined;
      if (!displayName) {
        const given = (data.user?.user_metadata?.first_name || data.user?.user_metadata?.given_name || '').trim();
        const family = (data.user?.user_metadata?.last_name || data.user?.user_metadata?.family_name || '').trim();
        const name = (data.user?.user_metadata?.full_name || data.user?.user_metadata?.name || '').trim();
        const computed = `${given || ''} ${family || ''}`.trim() || name;
        if (computed) {
          await supabase.auth.updateUser({ data: { display_name: computed } });
        }
      }

      // Ensure profile exists with phone captured from metadata
      try {
        const md: any = data.user?.user_metadata || {};
        await ensureProfileExists({
          userId: data.user!.id,
          firstName: (md.first_name || md.given_name || '').trim(),
          lastName: (md.last_name || md.family_name || '').trim(),
          phone: (md.phone || null) as string | null,
        });
      } catch {
        // no-op: don't block sign-in on profile creation failure
      }

      router.replace('/dashboard');
    }
  };

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
            <Link href="/sign-up">
              <Button variant="ghost" size="sm">Sign Up</Button>
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
        <div className="max-w-md w-full">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16">
                <img 
                  src="/icons/icon.svg?v=2" 
                  alt="NeyoPadel Logo" 
                  className="w-full h-full"
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600">
              Sign in to access your padel dashboard
            </p>
          </div>

          {/* Sign In Form */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              {message && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{message}</p>
                </div>
              )}

              <Button 
                className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium" 
                onClick={signInWithPassword} 
                disabled={loading || !email || !password}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <Link 
                  href={`/sign-up?email=${encodeURIComponent(email || '')}`} 
                  className="text-green-600 hover:text-green-700 font-medium hover:underline"
                >
                  Create an account
                </Link>
                <button
                  type="button"
                  className="text-gray-600 hover:text-gray-900 hover:underline"
                  onClick={async () => {
                    if (!email) { setMessage('Enter your email to reset your password.'); return; }
                    setMessage(null);
                    try {
                      const res = await fetch('/api/auth/check-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email }),
                      });
                      if (res.ok) {
                        const json = await res.json();
                        if (!json?.exists) {
                          setMessage('No account found with this email. Please sign up.');
                          return;
                        }
                      }
                    } catch {
                      // If check fails, continue to call reset to avoid blocking
                    }
                    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password` });
                    setMessage(error ? error.message : 'Check your email to reset your password.');
                  }}
                >
                  Forgot password?
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}