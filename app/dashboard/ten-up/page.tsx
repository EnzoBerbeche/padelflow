'use client';

import { useState, useEffect } from 'react';
import { nationalPlayersAPI, SupabaseNationalPlayer, playersAPI } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Database, UserPlus, Loader2, Circle, CircleDot, ChevronLeft, ChevronRight, Trash2, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { ProtectedRoute } from '@/components/protected-route';
import { useCurrentUserId } from '@/hooks/use-current-user';
import { storage, Player } from '@/lib/storage';



const ITEMS_PER_PAGE = 100;

export default function TenUpPage() {
  const { toast } = useToast();
  const currentUserId = useCurrentUserId();
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'men' | 'women' | 'all'>('all');
  const [rankingMin, setRankingMin] = useState<string>('');
  const [rankingMax, setRankingMax] = useState<string>('');
  const [leagueFilter, setLeagueFilter] = useState<string>('all');
  const [leagues, setLeagues] = useState<string[]>([]);
  
  // Results state
  const [allPlayers, setAllPlayers] = useState<SupabaseNationalPlayer[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<SupabaseNationalPlayer[]>([]);
  const [loading, setLoading] = useState(false); // Start with false since we don't load anything initially
  const [searching, setSearching] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Player management state
  const [addingPlayer, setAddingPlayer] = useState<string | null>(null);
  const [myLicences, setMyLicences] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<'name' | 'license' | 'ranking' | 'league' | 'birth_year'>('ranking');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    // Don't fetch all players by default - wait for user to search
    fetchLeagues();
    // Load current user's licences to toggle Add/Remove
    (async () => {
      const licences = await playersAPI.getMyLicences();
      setMyLicences(licences);
    })();
  }, []);

  useEffect(() => {
    // Bind latest server results and (re)apply current sorting preferences
    applyFilters();
  }, [allPlayers, sortKey, sortDir]);

  const fetchAllPlayers = async () => {
    setLoading(true);
    try {
      const players = await nationalPlayersAPI.getAll();
      setAllPlayers(players);
    } catch (error) {
      console.error('Error fetching all players:', error);
      toast({
        title: "Error",
        description: "Failed to fetch players from the database.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLeagues = async () => {
    try {
      const leagues = await nationalPlayersAPI.getLeagues();
      const validLeagues = leagues.filter(league => league && league.trim() !== '');
      setLeagues(validLeagues);
    } catch (error) {
      console.error('Error fetching leagues:', error);
    }
  };

  const applyFilters = (overrideKey?: 'name' | 'license' | 'ranking' | 'league' | 'birth_year', overrideDir?: 'asc' | 'desc') => {
    // No client-side filtering. Server already applied filters in searchPlayers().
    const bound = [...allPlayers];
    // Apply client-side sort
    const activeKey = overrideKey ?? sortKey;
    const activeDir = overrideDir ?? sortDir;
    const getValue = (p: SupabaseNationalPlayer): string | number => {
      switch (activeKey) {
        case 'name':
          return `${(p.first_name || '').toLowerCase()} ${(p.last_name || '').toLowerCase()}`.trim();
        case 'license':
          return (p.license_number || '').toLowerCase();
        case 'ranking':
          return p.ranking || 0;
        case 'league':
          return (p.league || '').toLowerCase();
        case 'birth_year':
          return p.birth_year || 0;
        default:
          return 0;
      }
    };
    bound.sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      let cmp = 0;
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb));
      }
      return activeDir === 'asc' ? cmp : -cmp;
    });
    setFilteredPlayers(bound);
    setCurrentPage(1);
    setTotalPages(Math.ceil(bound.length / ITEMS_PER_PAGE));
  };

  const toggleSort = (key: 'name' | 'license' | 'ranking' | 'league' | 'birth_year') => {
    const nextDir: 'asc' | 'desc' = sortKey === key ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    setSortKey(key);
    setSortDir(nextDir);
    // Apply immediately using computed values to avoid any stale state issues
    applyFilters(key, nextDir);
  };

  const searchPlayers = async () => {
    setSearching(true);
    try {
      const filters: any = {};
      if (genderFilter !== 'all') filters.gender = genderFilter;
      if (rankingMin) filters.rankingMin = parseInt(rankingMin);
      if (rankingMax) filters.rankingMax = parseInt(rankingMax);
      if (leagueFilter !== 'all') filters.league = leagueFilter;
      const results = await nationalPlayersAPI.search(searchTerm, filters);
      setAllPlayers(results);
      setHasSearched(true); // Mark that a search has been completed
      
      if (results.length === 0) {
        toast({
          title: "No Results",
          description: "No players found matching your search criteria.",
        });
      }
    } catch (error) {
      console.error('Error searching players:', error);
      toast({
        title: "Search Error",
        description: "Failed to search players. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const addPlayerToLocal = async (nationalPlayer: SupabaseNationalPlayer) => {
    setAddingPlayer(nationalPlayer.id);
    
    try {
      // Insert licence into Supabase players (user-scoped)
      const result = await playersAPI.addLicenceForCurrentUser(nationalPlayer.license_number);
      if (!result.ok) {
        toast({
          title: "Cannot Add Player",
          description: result.error || 'Unknown error',
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Player Added",
        description: `${nationalPlayer.first_name} ${nationalPlayer.last_name} has been added to your roster.`,
      });
      // Update local cache to hide the button
      setMyLicences(prev => Array.from(new Set([...prev, nationalPlayer.license_number])));
    } catch (error) {
      console.error('Error adding player:', error);
      
      // Handle specific validation errors
      if (error instanceof Error) {
        if (error.message.includes('License number must be between')) {
          toast({
            title: "Invalid License Number",
            description: "The national player's license number format is not compatible with the local system.",
            variant: "destructive",
          });
        } else if (error.message.includes('Year of birth must be')) {
          toast({
            title: "Invalid Birth Year",
            description: "The national player's birth year is outside the valid range.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message || "Failed to add player to your roster. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to add player to your roster. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setAddingPlayer(null);
    }
  };

  const removePlayerFromList = async (nationalPlayer: SupabaseNationalPlayer) => {
    setAddingPlayer(nationalPlayer.id);
    try {
      const res = await playersAPI.deleteByLicenceForCurrentUser(nationalPlayer.license_number);
      if (!res.ok) {
        toast({ title: 'Error', description: res.error || 'Failed to remove player', variant: 'destructive' });
        return;
      }
      toast({ title: 'Removed', description: `${nationalPlayer.first_name} ${nationalPlayer.last_name} removed from your roster.` });
      setMyLicences(prev => prev.filter(l => l !== nationalPlayer.license_number));
    } finally {
      setAddingPlayer(null);
    }
  };

  const getRankingColor = (ranking: number) => {
    if (ranking <= 25) return 'bg-green-100 text-green-800';
    if (ranking <= 100) return 'bg-blue-100 text-blue-800';
    if (ranking <= 250) return 'bg-purple-100 text-purple-800';
    if (ranking <= 500) return 'bg-orange-100 text-orange-800';
    if (ranking <= 1000) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getCurrentPagePlayers = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredPlayers.slice(startIndex, endIndex);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Ten'Up</h1>
              <p className="text-gray-600 mt-1">National Padel Players Database</p>
            </div>
          </div>

          {/* Search Controls */}
          <Card>
            <CardContent className="space-y-4 pt-6">
              {/* Search Bar - Always Visible */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Name, license..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchPlayers()}
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end space-y-2 sm:space-y-0 sm:space-x-2">
                  <Button 
                    onClick={searchPlayers}
                    disabled={searching}
                    className="flex-1 sm:flex-none"
                  >
                    {searching ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Filter Toggle Button */}
              <div className="flex justify-between items-center">
                <Button 
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2"
                >
                  <Filter className="h-4 w-4" />
                  <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
                  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                
                {showFilters && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setGenderFilter('all');
                      setRankingMin('');
                      setRankingMax('');
                      setLeagueFilter('all');
                      setAllPlayers([]);
                      setHasSearched(false);
                    }}
                    className="flex items-center space-x-2"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Clear Filters</span>
                  </Button>
                )}
              </div>

              {/* Collapsible Filter Controls */}
              {showFilters && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <Select value={genderFilter} onValueChange={(value: 'men' | 'women' | 'all') => setGenderFilter(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="men">Men</SelectItem>
                            <SelectItem value="women">Women</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ranking-min">Min Ranking</Label>
                        <Input
                          id="ranking-min"
                          type="number"
                          placeholder="0"
                          value={rankingMin}
                          onChange={(e) => setRankingMin(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ranking-max">Max Ranking</Label>
                        <Input
                          id="ranking-max"
                          type="number"
                          placeholder="2000"
                          value={rankingMax}
                          onChange={(e) => setRankingMax(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="league">League</Label>
                        <Select value={leagueFilter} onValueChange={setLeagueFilter}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Leagues</SelectItem>
                            {leagues.map(league => (
                              <SelectItem key={league} value={league}>{league}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results - Only show when search has been completed */}
          {(hasSearched || searching) && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Players ({filteredPlayers.length})</CardTitle>
                    <CardDescription>
                      Showing {getCurrentPagePlayers().length} of {filteredPlayers.length} players
                      {searchTerm.trim() && ` matching "${searchTerm}"`}
                    </CardDescription>
                  </div>
                  {filteredPlayers.length > 0 && (
                    <div className="text-sm text-gray-500">
                      Page {currentPage} of {totalPages}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {searching ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Searching...</h3>
                    <p className="text-gray-500">
                      Please wait while we search for players.
                    </p>
                  </div>
                ) : filteredPlayers.length === 0 ? (
                  <div className="text-center py-12">
                    <Database className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No players found</h3>
                    <p className="text-gray-500">
                      Try adjusting your search criteria or filters.
                    </p>
                  </div>
                ) : (
                <>
                                     {/* Mobile Cards View */}
                   <div className="block sm:hidden space-y-3">
                     {getCurrentPagePlayers().map((player) => (
                       <Card key={player.id} className="p-3">
                         <div className="space-y-2">
                           {/* Player Header */}
                           <div className="flex items-center justify-between">
                             <div className="flex items-center space-x-2">
                               {player.gender === 'men' ? (
                                 <Circle className="h-4 w-4 text-blue-500" />
                               ) : (
                                 <CircleDot className="h-4 w-4 text-pink-500" />
                               )}
                               <Link 
                                 href={`/dashboard/players/${player.license_number}?from=ten-up`}
                                 className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                               >
                                 {player.first_name} {player.last_name}
                               </Link>
                             </div>
                             <div className="flex items-center space-x-2">
                               <Badge className={getRankingColor(player.ranking)}>
                                 P{player.ranking}
                               </Badge>
                               {myLicences.includes(player.license_number) ? (
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => removePlayerFromList(player)}
                                   disabled={addingPlayer === player.id}
                                   className="text-red-600 px-2 py-1 h-7 text-xs"
                                 >
                                   {addingPlayer === player.id ? (
                                     <Loader2 className="h-3 w-3 animate-spin" />
                                   ) : (
                                     "Unfollow"
                                   )}
                                 </Button>
                               ) : (
                                 <Button
                                   size="sm"
                                   onClick={() => addPlayerToLocal(player)}
                                   disabled={addingPlayer === player.id}
                                   className="px-2 py-1 h-7 text-xs"
                                 >
                                   {addingPlayer === player.id ? (
                                     <Loader2 className="h-3 w-3 animate-spin" />
                                   ) : (
                                     "Follow"
                                   )}
                                 </Button>
                               )}
                             </div>
                           </div>
                           
                           {/* Player Details - Compact */}
                           <div className="flex items-center justify-between text-sm text-gray-600">
                             <span className="truncate max-w-[60%]">
                               {player.league}
                             </span>
                             <span className="text-xs">
                               Age: {player.birth_year}
                             </span>
                           </div>
                         </div>
                       </Card>
                     ))}
                   </div>
                   
                   {/* Desktop Table View */}
                   <div className="hidden sm:block overflow-x-auto">
                     <table className="w-full">
                       <thead>
                         <tr className="border-b">
                           <th className="text-left py-3 px-4 font-medium text-gray-900">
                             <button className="inline-flex items-center gap-1" onClick={() => toggleSort('name')}>
                               <span>Name</span>
                               <ArrowUpDown className="h-3 w-3 text-gray-500" />
                             </button>
                           </th>
                           <th className="text-left py-3 px-4 font-medium text-gray-900">
                             <button className="inline-flex items-center gap-1" onClick={() => toggleSort('ranking')}>
                               <span>Ranking</span>
                               <ArrowUpDown className="h-3 w-3 text-gray-500" />
                             </button>
                           </th>
                           <th className="text-left py-3 px-4 font-medium text-gray-900">
                             <button className="inline-flex items-center gap-1" onClick={() => toggleSort('league')}>
                               <span>League</span>
                               <ArrowUpDown className="h-3 w-3 text-gray-500" />
                             </button>
                           </th>
                           <th className="text-left py-3 px-4 font-medium text-gray-900">
                             <button className="inline-flex items-center gap-1" onClick={() => toggleSort('birth_year')}>
                               <span>Birth Year</span>
                               <ArrowUpDown className="h-3 w-3 text-gray-500" />
                             </button>
                           </th>
                           <th className="text-right py-3 px-4 font-medium text-gray-900">Actions</th>
                         </tr>
                       </thead>
                       <tbody>
                         {getCurrentPagePlayers().map((player) => (
                           <tr key={player.id} className="border-b hover:bg-gray-50">
                             <td className="py-3 px-4">
                               <div className="flex items-center space-x-2">
                                 {player.gender === 'men' ? (
                                   <Circle className="h-4 w-4 text-blue-500" />
                                 ) : (
                                   <CircleDot className="h-4 w-4 text-pink-500" />
                                 )}
                                 <Link 
                                   href={`/dashboard/players/${player.license_number}?from=ten-up`}
                                   className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                 >
                                   {player.first_name} {player.last_name}
                                 </Link>
                               </div>
                             </td>
                             <td className="py-3 px-4">
                               <Badge className={getRankingColor(player.ranking)}>
                                 P{player.ranking}
                               </Badge>
                             </td>
                             <td className="py-3 px-4 text-gray-600">
                               <span className="truncate block max-w-[200px]" title={player.league}>
                                 {player.league}
                               </span>
                             </td>
                             <td className="py-3 px-4 text-gray-600">
                               {player.birth_year}
                             </td>
                             <td className="py-3 px-4 text-right">
                               {myLicences.includes(player.license_number) ? (
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => removePlayerFromList(player)}
                                   disabled={addingPlayer === player.id}
                                   className="text-red-600 px-2 py-1 h-7 text-xs"
                                 >
                                   {addingPlayer === player.id ? (
                                     <Loader2 className="h-3 w-3 animate-spin" />
                                   ) : (
                                     "Unfollow"
                                   )}
                                 </Button>
                               ) : (
                               <Button
                                 size="sm"
                                 onClick={() => addPlayerToLocal(player)}
                                 disabled={addingPlayer === player.id}
                                 className="px-2 py-1 h-7 text-xs"
                               >
                                 {addingPlayer === player.id ? (
                                   <Loader2 className="h-3 w-3 animate-spin" />
                                 ) : (
                                   "Follow"
                                 )}
                               </Button>
                               )}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>

                                     {/* Pagination */}
                   {totalPages > 1 && (
                     <div className="flex flex-col sm:flex-row items-center justify-between mt-6 space-y-3 sm:space-y-0">
                       <div className="text-sm text-gray-700 text-center sm:text-left">
                         Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredPlayers.length)} of {filteredPlayers.length} results
                       </div>
                       <div className="flex items-center space-x-2">
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => handlePageChange(currentPage - 1)}
                           disabled={currentPage === 1}
                         >
                           <ChevronLeft className="h-4 w-4 mr-1" />
                           <span className="hidden sm:inline">Previous</span>
                         </Button>
                         
                         {/* Mobile: Show current page and total */}
                         <div className="sm:hidden flex items-center space-x-2">
                           <span className="text-sm text-gray-600">
                             {currentPage} of {totalPages}
                           </span>
                         </div>
                         
                         {/* Desktop: Show page numbers */}
                         <div className="hidden sm:flex items-center space-x-1">
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
                               <Button
                                 key={pageNum}
                                 variant={currentPage === pageNum ? "default" : "outline"}
                                 size="sm"
                                 onClick={() => handlePageChange(pageNum)}
                                 className="w-8 h-8 p-0"
                               >
                                 {pageNum}
                               </Button>
                             );
                           })}
                         </div>
                         
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => handlePageChange(currentPage + 1)}
                           disabled={currentPage === totalPages}
                         >
                           <span className="hidden sm:inline">Next</span>
                           <ChevronRight className="h-4 w-4 ml-1" />
                         </Button>
                       </div>
                     </div>
                   )}
                </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
