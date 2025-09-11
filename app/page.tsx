'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Trophy, Users, Calendar, Share2, Search, TrendingUp, BarChart3, UserPlus, MapPin, Trophy as TrophyIcon, Smartphone, X } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/hooks/use-current-user';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

export default function Home() {
  const { isSignedIn, isLoaded } = useSupabaseAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{id: string; email: string; player?: any}[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [allResults, setAllResults] = useState<{id: string; email: string; player?: any}[]>([]);
  const [showIOSInstallPrompt, setShowIOSInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const resultsPerPage = 10;
  
  // Redirect authenticated users to home dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  // Detect iOS and show install prompt
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
    
    // Check if user has already dismissed the prompt
    const hasDismissedPrompt = localStorage.getItem('ios-install-prompt-dismissed');
    
    if (isIOSDevice && !hasDismissedPrompt) {
      // Show prompt after a short delay
      const timer = setTimeout(() => {
        setShowIOSInstallPrompt(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Handle iOS install prompt
  const handleDismissIOSPrompt = () => {
    setShowIOSInstallPrompt(false);
    localStorage.setItem('ios-install-prompt-dismissed', 'true');
  };

  // Handle search when button is clicked
  const handleSearchClick = () => {
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    }
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    const startIndex = (page - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    const pageResults = allResults.slice(startIndex, endIndex);
    
    setSearchResults(pageResults);
    setCurrentPage(page);
  };

  // Calculate pagination info
  const totalPages = Math.ceil(totalResults / resultsPerPage);
  const startResult = (currentPage - 1) * resultsPerPage + 1;
  const endResult = Math.min(currentPage * resultsPerPage, totalResults);

  // Handle search functionality
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setAllResults([]);
      setTotalResults(0);
      setCurrentPage(1);
      return;
    }
    
    // Check if Supabase is properly configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('❌ Supabase not configured properly');
      setSearchResults([]);
      setAllResults([]);
      setTotalResults(0);
      return;
    }
    
    setIsSearching(true);
    try {
      // Split query into individual words and normalize case
      const searchWords = query.trim().split(/\s+/).filter(word => word.length > 0);
      
      // Debug: Check Supabase configuration
      console.log('🔍 Search started for:', query);
      console.log('🌐 Environment:', process.env.NODE_ENV);
      console.log('🔗 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing');
      console.log('🔑 Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
      console.log('📝 Search words:', searchWords);
      
      let searchQuery = supabase
        .from('tenup_latest')
        .select('idcrm, nom, prenom, nom_complet, classement, sexe, ligue')
        .order('classement', { ascending: true });
      
      // Simplified search - just search for the entire query in nom_complet
      const searchTerm = query.trim().toLowerCase();
      searchQuery = searchQuery.ilike('nom_complet', `%${searchTerm}%`);
      
      const { data, error } = await searchQuery;
      
      console.log('📊 Search result:', { data: data?.length || 0, error });
      
      if (error) {
        console.error('❌ Search error:', error);
        setSearchResults([]);
        setAllResults([]);
        setTotalResults(0);
        return;
      } else {
        const transformedResults = (data || []).map(player => ({
          id: player.idcrm.toString(),
          email: `${player.nom_complet || `${player.prenom} ${player.nom}`} (${player.classement})`,
          player: player
        }));
        
        setAllResults(transformedResults);
        setTotalResults(transformedResults.length);
        setCurrentPage(1);
        
        const firstPageResults = transformedResults.slice(0, resultsPerPage);
        setSearchResults(firstPageResults);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setAllResults([]);
      setTotalResults(0);
    } finally {
      setIsSearching(false);
    }
  };

  // Show loading while checking authentication
  if (isLoaded && isSignedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2 flex-shrink-0">
            <img 
              src="/icons/icon.svg?v=2" 
              alt="NeyoPadel Logo" 
              className="w-8 h-8"
            />
            <span className="text-xl font-semibold text-gray-900">NeyoPadel</span>
          </div>
          <div className="flex items-center space-x-3 flex-shrink-0">
            {isSignedIn ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">Dashboard</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/sign-up">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* iOS Install Prompt */}
      {showIOSInstallPrompt && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Install NeyoPadel on your iPhone
                  </p>
                  <p className="text-xs text-blue-700">
                    Tap the Share button <Share2 className="inline h-3 w-3" /> and select "Add to Home Screen"
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismissIOSPrompt}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Centered Hero Section - Google-like positioning */}
      <main className="min-h-screen flex flex-col items-center justify-start px-4 pt-32">
        <div className="max-w-4xl w-full text-center">
          {/* Logo and Tagline */}
          <div className="mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20">
                <img 
                  src="/icons/icon.svg?v=2" 
                  alt="NeyoPadel Logo" 
                  className="w-full h-full"
                />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-semibold text-gray-900 mb-3">
              NeyoPadel
            </h1>
            <p className="text-xl text-gray-600 font-light">
              The only padel app you need
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search players, clubs, tournaments..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchClick();
                  }
                }}
                className="pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-full focus:border-green-500 focus:ring-0 shadow-sm w-full"
              />
            </div>
            <div className="flex justify-center">
              <Button 
                onClick={handleSearchClick}
                disabled={!searchQuery.trim() || isSearching}
                className="bg-green-600 hover:bg-green-700 px-8 py-2 rounded-full"
              >
                {isSearching ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Searching...</span>
                  </div>
                ) : (
                  'Search'
                )}
              </Button>
            </div>
          </div>

          {/* Search Results Table */}
          {searchResults.length > 0 && (
            <div className="max-w-6xl mx-auto mb-8 mt-8">
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Search Results ({totalResults} players found)
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Player
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ranking
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Gender
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          League
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {searchResults.map((result) => (
                        <tr key={result.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {result.player?.nom_complet || `${result.player?.prenom} ${result.player?.nom}`}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900 font-medium">
                              {result.player?.classement || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-500">
                              {result.player?.sexe || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-500">
                              {result.player?.ligue || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {isSignedIn ? (
                              <Link href={`/dashboard/players/${result.player?.idcrm}`}>
                                <Button size="sm" variant="outline">
                                  View Profile
                                </Button>
                              </Link>
                            ) : (
                              <Link href="/sign-up">
                                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                  Sign Up to View
                                </Button>
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-700">
                    Showing {startResult} to {endResult} of {totalResults} results
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className={currentPage === pageNum ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        {pageNum}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Value Proposition Section - Only visible when scrolling */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
              Everything you need to elevate your padel game
            </h2>
            <p className="text-base md:text-lg text-gray-600">
              Track your progress, analyze your matches, and connect with the padel community
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Track Progression</h3>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Analyze Matches</h3>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <UserPlus className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Follow Players</h3>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Discover Clubs</h3>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}