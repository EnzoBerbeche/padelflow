'use client';

import { Trophy, Home, Users, Calendar, Settings, LogOut, Menu, X, Database, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useSupabaseUser } from '@/hooks/use-current-user';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const navigation = [
  { name: 'Tournaments', href: '/dashboard/tournaments', icon: Calendar },
  { name: 'Players', href: '/dashboard/players', icon: Users },
  { name: 'Ten\'Up', href: '/dashboard/ten-up', icon: Database },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Start closed on mobile
  const { user } = useSupabaseUser();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const md: any = user?.user_metadata || {};
    const dn = (md.display_name || '').toString();
    const ph = (md.phone || '').toString();
    setDisplayName(dn);
    setPhone(ph);
  }, [user]);

  const updateAccount = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { display_name: displayName, phone } });
    setSaving(false);
    if (!error) setIsAccountOpen(false);
    // Optionally add toast here in future
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 mr-2"
              >
                {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <Link href="/dashboard/tournaments" className="flex items-center space-x-2">
                <Trophy className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold text-gray-900">PadelFlow</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <DropdownMenu open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">{(user?.user_metadata as any)?.display_name || user?.email || 'Account'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="max-w-[240px] truncate">{user?.email || 'Not signed in'}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setIsUserMenuOpen(false); setIsAccountOpen(true); }}>Account settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className={cn(
          "bg-white shadow-sm min-h-screen border-r transition-all duration-300 ease-in-out fixed lg:relative z-50 overflow-hidden",
          "lg:w-64 lg:translate-x-0",
          isSidebarOpen 
            ? "w-64 translate-x-0" 
            : "w-0 -translate-x-full lg:w-64 lg:translate-x-0"
        )}>
          <div className="px-4 py-6">
            <ul className="space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setIsSidebarOpen(false)} // Close sidebar on mobile when clicking
                      className={cn(
                        'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 w-full">
          {children}
        </main>
      </div>
      <Dialog open={isAccountOpen} onOpenChange={(open) => {
        setIsAccountOpen(open);
        if (!open) setIsUserMenuOpen(false);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account settings</DialogTitle>
            <DialogDescription>Update your display name and phone number.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled />
            </div>
            <div className="space-y-1">
              <Label>Display name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => setIsAccountOpen(false)}>Cancel</Button>
            </DialogClose>
            <Button onClick={updateAccount} disabled={saving || !user}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}