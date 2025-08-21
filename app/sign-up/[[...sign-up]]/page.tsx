'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserPlus, Mail, Lock, User, Phone, ArrowLeft, Home } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ensureProfileExists } from '@/lib/profile';

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const fromQuery = searchParams.get('email');
    if (fromQuery) setEmail(fromQuery);
  }, [searchParams]);

  const signUpWithEmail = async () => {
    setLoading(true);
    setMessage(null);
    if (password !== confirmPassword) {
      setLoading(false);
      setMessage('Passwords do not match');
      return;
    }
    // Check duplicate email on server
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.exists) {
          setLoading(false);
          setMessage('An account with this email already exists. Please sign in.');
          return;
        }
      } else {
        console.warn('Email existence check returned non-OK');
      }
    } catch (e) {
      console.warn('Email existence check failed', e);
      // proceed to sign up and rely on Supabase error if duplicate
    }

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/dashboard/tournaments`,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
          display_name: `${firstName || ''} ${lastName || ''}`.trim(),
        },
      }
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
    } else {
      // If email confirmations are enabled, user must confirm via email
      if (!data.session) {
        // Redirect to thank you page instead of showing small message
        router.push('/sign-up/thank-you');
      } else {
        // If session exists (no email confirmation required), create profile immediately
        try {
          await ensureProfileExists({
            userId: data.user!.id,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim() || null,
          });
        } catch {
          // no-op: don't block sign-up on profile creation failure
        }
        router.replace('/dashboard/tournaments');
      }
    }
  };

  // OAuth disabled for now
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Join PadelFlow
          </CardTitle>
          <CardDescription className="text-gray-600 text-base">
            Create your account to start managing tournaments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Prénom
                </Label>
                <Input 
                  id="firstName" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium text-gray-700 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Nom
                </Label>
                <Input 
                  id="lastName" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center">
                <Phone className="w-4 h-4 mr-2" />
                Téléphone
              </Label>
              <Input 
                id="phone" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>
            
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
            
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-sm font-medium text-gray-700 flex items-center">
                <Lock className="w-4 h-4 mr-2" />
                Confirm Password
              </Label>
              <Input 
                id="confirm" 
                type="password" 
                placeholder="••••••••" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              onClick={signUpWithEmail} 
              disabled={loading || !email}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="h-px bg-gray-200" />
            
            <div className="flex flex-col space-y-2">
              <Link href="/sign-in" className="text-gray-700 hover:text-gray-900 font-medium flex items-center justify-center hover:underline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Already have an account? Sign in
              </Link>
              
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