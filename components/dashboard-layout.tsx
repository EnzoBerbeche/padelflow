'use client';

import { Trophy, Home, Users, Calendar, Settings, LogOut, Menu, X, Database } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserButton, SignOutButton } from '@clerk/nextjs';
import { useState } from 'react';

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
              <UserButton afterSignOutUrl="/" />
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
    </div>
  );
}