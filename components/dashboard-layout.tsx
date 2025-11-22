'use client';

import { Trophy, Home, Users, Calendar, Settings, LogOut, Menu, X, User as UserIcon, Wrench, BarChart3, Building2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { useSupabaseUser } from '@/hooks/use-current-user';
import { useUserRole } from '@/hooks/use-user-role';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Navigation sections structure
interface NavigationSection {
  title: string;
  items: Array<{
    name: string;
    href: string;
    icon: any;
    children?: Array<{ name: string; href: string; icon: any }>;
  }>;
}

// Section Joueur (visible pour tous)
const playerSection: NavigationSection = {
  title: 'Joueur',
  items: [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Tournois', href: '/dashboard/tournois', icon: Trophy },
    { name: 'Game Analyzer', href: '/dashboard/game-analyzer', icon: BarChart3 },
  ],
};

// Section Club (uniquement pour clubs et admins)
const clubSection: NavigationSection = {
  title: 'Club',
  items: [
    { name: 'Mes Clubs', href: '/dashboard/club', icon: Building2 },
    { name: 'Mes Tournois', href: '/dashboard/club/tournaments', icon: Trophy },
    { name: 'Mes JA', href: '/dashboard/club/juge-arbitres', icon: Users },
  ],
};

// Section JA (uniquement pour JA et admins)
const jugeArbitreSection: NavigationSection = {
  title: 'JA',
  items: [
    { name: 'Gestion des Tournois', href: '/dashboard/tournaments', icon: Calendar },
  ],
};

// Section Admin (uniquement pour admins)
const adminSection: NavigationSection = {
  title: 'Admin',
  items: [
    { name: 'Migrate Formats', href: '/dashboard/migrate-formats', icon: Wrench },
    { name: 'System Settings', href: '/dashboard/admin/settings', icon: Settings },
    { name: 'User Management', href: '/dashboard/admin/users', icon: Users },
    { name: 'Club Management', href: '/dashboard/admin/clubs', icon: Building2 },
  ],
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Start closed on mobile
  const { user } = useSupabaseUser();
  const { role, loading: roleLoading } = useUserRole();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Get navigation sections based on user role
  const getNavigationSections = (): NavigationSection[] => {
    if (roleLoading) return [playerSection];
    
    const sections: NavigationSection[] = [playerSection];
    
    switch (role) {
      case 'admin':
        // Admins voient toutes les sections
        sections.push(clubSection, jugeArbitreSection, adminSection);
        break;
      case 'club':
        sections.push(clubSection);
        break;
      case 'juge_arbitre':
        sections.push(jugeArbitreSection);
        break;
      case 'player':
      default:
        // Players voient seulement la section Joueur
        break;
    }
    
    return sections;
  };

  const navigationSections = getNavigationSections();


  const renderNavigationItem = (item: any) => {
    // More precise active detection to avoid conflicts between /dashboard and /dashboard/ten-up
    const isActive = pathname === item.href || 
      (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
    
    if (item.children) {
      // Render expandable admin section
      return (
        <li key={item.name} className="space-y-2">
          <div className="flex items-center px-3 py-2 text-sm font-medium text-gray-700">
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </div>
          <ul className="ml-6 space-y-1">
            {item.children.map((child: any) => {
              const isChildActive = pathname === child.href || pathname.startsWith(child.href + '/');
              return (
                <li key={child.name}>
                  <Link
                    href={child.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={cn(
                      'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isChildActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <child.icon className="mr-3 h-4 w-4" />
                    {child.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>
      );
    }
    
    // Render regular navigation item
    return (
      <li key={item.name}>
        <Link
          href={item.href}
          onClick={() => setIsSidebarOpen(false)}
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
  };

  const renderNavigationSection = (section: NavigationSection) => {
    return (
      <div key={section.title} className="mb-6">
        <div className="px-3 mb-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {section.title}
          </h3>
        </div>
        <ul className="space-y-1">
          {section.items.map((item) => renderNavigationItem(item))}
        </ul>
      </div>
    );
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
              <Link href="/dashboard" className="flex items-center space-x-2">
                <img 
                  src="/icons/icon.svg?v=2" 
                  alt="NeyoPadel Logo" 
                  className="h-8 w-8"
                />
                <span className="text-xl font-semibold text-gray-900">NeyoPadel</span>
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
                <DropdownMenuLabel className="max-w-[240px] truncate">
                  {user?.email || 'Not signed in'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    window.location.href = '/dashboard/settings';
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Paramètres
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = '/';
                  }}
                  className="text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Se déconnecter
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
          <div className="px-4 py-6 flex flex-col h-full overflow-y-auto">
            <div className="flex-1 space-y-1">
              {navigationSections.map((section) => renderNavigationSection(section))}
            </div>
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