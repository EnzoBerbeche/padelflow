'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Trophy, Users, Calendar, Share2, Search, TrendingUp, BarChart3, UserPlus, MapPin, Trophy as TrophyIcon } from 'lucide-react';
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
  const resultsPerPage = 10;
  
  
  // Redirect authenticated users to home dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/dashboard');
    }
  }, [isSignedIn, isLoaded, router]);

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
    
    setIsSearching(true);
    try {
      // Search in tenup_latest table for players (no limit)
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
      
      if (searchWords.length === 1) {
        // Single word search - search ONLY in nom_complet
        const word = searchWords[0].toLowerCase();
        searchQuery = searchQuery.ilike('nom_complet', `%${word}%`);
      } else if (searchWords.length === 2) {
        // Two words search - search both orders in nom_complet
        const word1 = searchWords[0].toLowerCase();
        const word2 = searchWords[1].toLowerCase();
        
        // Search for both word orders in nom_complet
        searchQuery = searchQuery.or(
          `nom_complet.ilike.%${word1} ${word2}%,nom_complet.ilike.%${word2} ${word1}%`
        );
      } else {
        // More than 2 words - search exact combination as written
        const exactQuery = searchWords.join(' ').toLowerCase();
        searchQuery = searchQuery.ilike('nom_complet', `%${exactQuery}%`);
      }
      
      const { data, error } = await searchQuery;
      
      console.log('📊 Search result:', { data: data?.length || 0, error });
      
      if (error) {
        console.error('❌ Search error:', error);
        setSearchResults([]);
        setAllResults([]);
        setTotalResults(0);
      } else {
        // Transform the data to match our search results format
        const transformedResults = (data || []).map(player => ({
          id: player.idcrm.toString(),
          email: `${player.nom_complet || `${player.prenom} ${player.nom}`} (${player.classement})`,
          player: player
        }));
        
        setAllResults(transformedResults);
        setTotalResults(transformedResults.length);
        setCurrentPage(1);
        
        // Show first page of results
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
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">NeyoPadel</span>
          </div>
          <div className="flex items-center space-x-3">
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

      {/* Google-like Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="max-w-4xl w-full text-center">
          {/* Logo and Tagline */}
          <div className="mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-3xl">N</span>
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-light text-gray-900 mb-4">
              NeyoPadel
            </h1>
            <p className="text-xl text-gray-600 font-light">
              The only padel app you need
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex gap-3">
              <div className="relative flex-1">
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
                  className="pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-full focus:border-green-500 focus:ring-0 shadow-sm"
                />
              </div>
              <Button 
                onClick={handleSearchClick}
                disabled={!searchQuery.trim() || isSearching}
                className="bg-green-600 hover:bg-green-700 px-8 py-4 rounded-full"
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
            <div className="max-w-6xl mx-auto mb-8">
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Search Results ({totalResults} players found)
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Showing {startResult}-{endResult} of {totalResults} results
                  </p>
                </div>
                <div className="overflow-hidden">
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
                      {searchResults.map((result, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {result.player?.nom_complet || `${result.player?.prenom} ${result.player?.nom}`}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              #{result.player?.classement || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.player?.sexe || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.player?.ligue || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                if (isSignedIn) {
                                  // TODO: Navigate to player profile
                                  console.log('Navigate to player:', result.player);
                                } else {
                                  // Redirect to sign up page
                                  router.push('/sign-up');
                                }
                              }}
                              className="text-green-600 hover:text-green-900"
                            >
                              {isSignedIn ? 'View Profile' : 'Sign Up to View'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        
                        {/* Page Numbers */}
                        <div className="flex space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`px-3 py-2 text-sm font-medium rounded-md ${
                                  currentPage === pageNum
                                    ? 'bg-green-600 text-white'
                                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        Page {currentPage} of {totalPages}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Value Proposition Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-gray-900 mb-4">
              Everything you need to elevate your padel game
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Track your progress, analyze your matches, and connect with the padel community
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-lg font-semibold">Track Your Progression</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Monitor your ranking changes and performance improvements over time
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-lg font-semibold">Analyze Your Matches</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Get detailed statistics and insights from every point you play
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-lg font-semibold">Follow Players</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Follow your favorite players and track their stats and progression
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-lg font-semibold">Discover Clubs & Tournaments</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Find local clubs and tournaments to join the padel community
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">N</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">NeyoPadel</span>
          </div>
          <p className="text-gray-500 text-sm">
            The only padel app you need
          </p>
        </div>
      </footer>
    </div>
  );
}