'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

      router.replace('/dashboard/tournaments');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-gray-600 text-base">
            Sign in to manage your tournaments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center">
                <Mail className="w-4 h-4 mr-2" />
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
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center">
                <Lock className="w-4 h-4 mr-2" />
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
              className="w-full h-11 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200" 
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
                className="text-green-600 hover:text-green-700 font-medium flex items-center hover:underline"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Create an account
              </Link>
              <button
                type="button"
                className="text-gray-600 hover:text-gray-900 flex items-center hover:underline"
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
            
            <div className="h-px bg-gray-200" />
            
            <div className="flex flex-col space-y-2">
              <Link href="/" className="text-gray-700 hover:text-gray-900 font-medium flex items-center justify-center hover:underline">
                <Home className="w-4 h-4 mr-2" />
                Back to home
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 