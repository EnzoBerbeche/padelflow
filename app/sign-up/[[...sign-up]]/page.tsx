'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserPlus, Mail, Lock, User, Phone, ArrowLeft, Home } from 'lucide-react';
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
  const [licenceNumber, setLicenceNumber] = useState('');

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
        emailRedirectTo: `${location.origin}/dashboard`,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
          licence_number: licenceNumber.trim(),
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
           
           // Try to automatically link to player if licence number is provided
           if (licenceNumber.trim()) {
             try {
               const { supabase } = await import('@/lib/supabase');
               // Check if the licence number exists in tenup_latest
               const { data: playerData } = await supabase
                 .from('tenup_latest')
                 .select('idcrm')
                 .eq('idcrm', parseInt(licenceNumber.trim()))
                 .maybeSingle();
               
               if (playerData) {
                 // Create the player link
                 await supabase
                   .from('players')
                   .insert({
                     user_id: data.user!.id,
                     licence: playerData.idcrm.toString(),
                   });
               }
             } catch (error) {
               console.warn('Failed to auto-link player:', error);
               // Don't block the signup process
             }
           }
         } catch {
           // no-op: don't block sign-up on profile creation failure
         }
         router.replace('/dashboard');
       }
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
              Join NeyoPadel
            </h1>
            <p className="text-gray-600">
              Create your account to join the padel community
            </p>
          </div>

          {/* Sign Up Form */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                    Prénom <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="firstName" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                    Nom <span className="text-red-500">*</span>
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
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
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
                <Label htmlFor="licence" className="text-sm font-medium text-gray-700">
                  Numéro de Licence
                </Label>
                <Input 
                  id="licence" 
                  value={licenceNumber} 
                  onChange={(e) => setLicenceNumber(e.target.value)}
                  placeholder="Votre numéro de licence FFT"
                  className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
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
                  Password <span className="text-red-500">*</span>
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
                <Label htmlFor="confirm" className="text-sm font-medium text-gray-700">
                  Confirm Password <span className="text-red-500">*</span>
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
                className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium" 
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
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}