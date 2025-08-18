'use client';

import { useState, useEffect } from 'react';
import { nationalPlayersAPI, SupabaseNationalPlayer } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Database, UserPlus, Loader2, Circle, CircleDot, ChevronLeft, ChevronRight } from 'lucide-react';
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

  useEffect(() => {
    fetchAllPlayers();
    fetchLeagues();
  }, []);

  useEffect(() => {
    // Apply filters and update pagination
    applyFilters();
  }, [allPlayers, searchTerm, genderFilter, rankingMin, rankingMax, leagueFilter]);

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

  const applyFilters = () => {
    let filtered = [...allPlayers];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      const tokens = searchLower.split(/\s+/).filter(Boolean);
      filtered = filtered.filter(player => {
        const first = (player.first_name || '').toLowerCase();
        const last = (player.last_name || '').toLowerCase();
        const club = (player.club || '').toLowerCase();
        const license = (player.license_number || '').toLowerCase();
        const full1 = `${first} ${last}`.trim();
        const full2 = `${last} ${first}`.trim();

        // Match if any single-field includes the whole query
        if (
          first.includes(searchLower) ||
          last.includes(searchLower) ||
          club.includes(searchLower) ||
          license.includes(searchLower) ||
          full1.includes(searchLower) ||
          full2.includes(searchLower)
        ) return true;

        // If multi-token, require all tokens to be present in either order
        if (tokens.length > 1) {
          const allInFull1 = tokens.every(t => full1.includes(t));
          const allInFull2 = tokens.every(t => full2.includes(t));
          if (allInFull1 || allInFull2) return true;
        }

        return false;
      });
    }

    // Apply gender filter
    if (genderFilter !== 'all') {
      filtered = filtered.filter(player => player.gender === genderFilter);
    }

    // Apply ranking filters
    if (rankingMin) {
      filtered = filtered.filter(player => player.ranking >= parseInt(rankingMin));
    }
    if (rankingMax) {
      filtered = filtered.filter(player => player.ranking <= parseInt(rankingMax));
    }

    // Apply league filter
    if (leagueFilter !== 'all') {
      filtered = filtered.filter(player => player.league === leagueFilter);
    }

    // Sort from lowest to highest ranking
    filtered.sort((a, b) => a.ranking - b.ranking);

    setFilteredPlayers(filtered);
    
    // Reset to first page when filters change
    setCurrentPage(1);
    
    // Calculate total pages
    setTotalPages(Math.ceil(filtered.length / ITEMS_PER_PAGE));
  };

  const searchPlayers = async () => {
    if (!searchTerm.trim()) {
      // If no search term, show all players
      applyFilters();
      return;
    }
    
    setSearching(true);
    try {
      const filters: any = {};
      if (genderFilter !== 'all') filters.gender = genderFilter;
      if (rankingMin) filters.rankingMin = parseInt(rankingMin);
      if (rankingMax) filters.rankingMax = parseInt(rankingMax);
      if (leagueFilter !== 'all') filters.league = leagueFilter;

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
      const userId = currentUserId || DEMO_USER_ID;
      
      // Check if player already exists
      const existingPlayers = storage.players.getCurrentUserPlayers(userId);
      const existingPlayer = existingPlayers.find(p => p.license_number === nationalPlayer.license_number);
      
      if (existingPlayer) {
        toast({
          title: "Player Already Exists",
          description: `A player with license number ${nationalPlayer.license_number} already exists in your roster.`,
          variant: "destructive",
        });
        return;
      }

      // Handle license number format for national players
      let licenseNumber = nationalPlayer.license_number;
      
      // If license number is too short, pad it with zeros
      if (licenseNumber.length < 7) {
        licenseNumber = licenseNumber.padStart(7, '0');
      }
      // If license number is too long, truncate it
      else if (licenseNumber.length > 8) {
        licenseNumber = licenseNumber.substring(0, 8);
      }

      // Convert national player to local player format
      const newPlayer = {
        license_number: licenseNumber,
        first_name: nationalPlayer.first_name,
        last_name: nationalPlayer.last_name,
        ranking: nationalPlayer.ranking,
        email: '', // National players don't have email
        phone: '', // National players don't have phone
        club: nationalPlayer.club,
        year_of_birth: nationalPlayer.birth_year,
        date_of_birth: '', // National players don't have date_of_birth
        gender: nationalPlayer.gender === 'men' ? 'Mr' : 'Mme' as 'Mr' | 'Mme',
        organizer_id: userId,
        owner_id: userId,
      };

      storage.players.create(newPlayer);
      
      toast({
        title: "Player Added",
        description: `${nationalPlayer.first_name} ${nationalPlayer.last_name} has been added to your roster.`,
      });
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
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Name</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">License</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Ranking</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Club</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">League</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Birth Year</th>
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
