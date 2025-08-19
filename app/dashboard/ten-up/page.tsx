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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Filter, Database, UserPlus, Loader2, Circle, CircleDot, ChevronLeft, ChevronRight, Trash2, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProtectedRoute } from '@/components/protected-route';
import { useCurrentUserId } from '@/hooks/use-current-user';
import { storage, Player } from '@/lib/storage';

// Demo user ID for testing
const DEMO_USER_ID = 'demo-user-123';

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
  const [clubs, setClubs] = useState<string[]>([]);
  const [clubFilter, setClubFilter] = useState<string[]>([]);
  const [clubSearch, setClubSearch] = useState<string>('');
  const [clubOpen, setClubOpen] = useState<boolean>(false);
  const [clubBaseline, setClubBaseline] = useState<string[]>([]);
  
  // Results state
  const [allPlayers, setAllPlayers] = useState<SupabaseNationalPlayer[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<SupabaseNationalPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Player management state
  const [addingPlayer, setAddingPlayer] = useState<string | null>(null);
  const [myLicences, setMyLicences] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<'name' | 'license' | 'ranking' | 'club' | 'league' | 'birth_year'>('ranking');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchAllPlayers();
    fetchLeagues();
    fetchClubs();
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

  const fetchClubs = async () => {
    try {
      const cs = await nationalPlayersAPI.getClubs();
      const valid = cs.filter(c => c && c.trim() !== '');
      setClubs(valid);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    }
  };

  const applyFilters = (overrideKey?: 'name' | 'license' | 'ranking' | 'club' | 'league' | 'birth_year', overrideDir?: 'asc' | 'desc') => {
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
        case 'club':
          return (p.club || '').toLowerCase();
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

  const toggleSort = (key: 'name' | 'license' | 'ranking' | 'club' | 'league' | 'birth_year') => {
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
      if (clubFilter.length > 0) filters.clubs = clubFilter;
      const results = await nationalPlayersAPI.search(searchTerm, filters);
      setAllPlayers(results);
      
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
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Search Players</span>
              </CardTitle>
              <CardDescription>
                Search and add players from the national database to your roster
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Name, license, or club..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchPlayers()}
                  />
                </div>
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label>Clubs</Label>
                  <Popover
                    open={clubOpen}
                    onOpenChange={(open) => {
                      if (open) {
                        setClubBaseline([...clubFilter]);
                      } else {
                        const same = clubBaseline.length === clubFilter.length && clubFilter.every(c => new Set(clubBaseline).has(c));
                        if (!same) {
                          // Commit selection: trigger a fresh server search
                          void searchPlayers();
                        }
                      }
                      setClubOpen(open);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={clubOpen} className="w-full justify-between">
                        {clubFilter.length > 0 ? `${clubFilter.length} selected` : 'All Clubs'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[340px] p-2" align="start">
                      <div className="space-y-2">
                        <Input
                          placeholder="Search clubs..."
                          value={clubSearch}
                          onChange={(e) => setClubSearch(e.target.value)}
                        />
                        <div className="max-h-64 overflow-auto pr-1">
                          {clubs
                            .filter(c => c.toLowerCase().includes(clubSearch.toLowerCase()))
                            .map(c => {
                              const checked = clubFilter.includes(c);
                              return (
                                <label key={c} className="flex items-center gap-2 py-1 px-1 cursor-pointer hover:bg-gray-50 rounded">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(v) =>
                                      setClubFilter(prev => (v ? [...prev, c] : prev.filter(x => x !== c)))
                                    }
                                  />
                                  <span className="text-sm text-gray-800 truncate" title={c}>{c}</span>
                                </label>
                              );
                            })}
                        </div>
                        <div className="flex justify-between pt-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => { setClubFilter([]); setClubOpen(false); }}>Clear</Button>
                          <Button type="button" size="sm" onClick={() => setClubOpen(false)}>Done</Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-end space-x-2">
                  <Button 
                    onClick={searchPlayers}
                    disabled={searching}
                    className="flex-1"
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
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setGenderFilter('all');
                      setRankingMin('');
                      setRankingMax('');
                      setLeagueFilter('all');
                      setClubFilter([]);
                      fetchAllPlayers();
                    }}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
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
              {filteredPlayers.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No players found</h3>
                  <p className="text-gray-500">
                    {searchTerm.trim() 
                      ? "Try adjusting your search criteria or filters."
                      : "No players available in the database."
                    }
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
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
                            <button className="inline-flex items-center gap-1" onClick={() => toggleSort('license')}>
                              <span>License</span>
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
                            <button className="inline-flex items-center gap-1" onClick={() => toggleSort('club')}>
                              <span>Club</span>
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
                                <div className="font-medium text-gray-900">
                                  {player.first_name} {player.last_name}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {player.license_number}
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={getRankingColor(player.ranking)}>
                                P{player.ranking}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {player.club}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {player.league}
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
                                  className="flex items-center space-x-2 text-red-600"
                                >
                                  {addingPlayer === player.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span>Removing...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="h-4 w-4" />
                                      <span>Remove from My Players</span>
                                    </>
                                  )}
                                </Button>
                              ) : (
                              <Button
                                size="sm"
                                onClick={() => addPlayerToLocal(player)}
                                disabled={addingPlayer === player.id}
                                className="flex items-center space-x-2"
                              >
                                {addingPlayer === player.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Adding...</span>
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="h-4 w-4" />
                                    <span>Add to My Players</span>
                                  </>
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
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-sm text-gray-700">
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
                          Previous
                        </Button>
                        
                        <div className="flex items-center space-x-1">
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
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
