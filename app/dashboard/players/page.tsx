'use client';

import { useState, useEffect } from 'react';
import { storage, Player } from '@/lib/storage';
import { playersAPI, SupabasePlayersEnrichedRow } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Edit, Trash2, MoreVertical, Search, Circle, CircleDot, ChevronDown, Target, Filter } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { ProtectedRoute } from '@/components/protected-route';
import { useCurrentUserId, useSupabaseAuth } from '@/hooks/use-current-user';



export default function PlayersPage() {
  const { toast } = useToast();
  const currentUserId = useCurrentUserId();
  const { isSignedIn } = useSupabaseAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [cloudPlayers, setCloudPlayers] = useState<SupabasePlayersEnrichedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState({
    license_number: '',
    first_name: '',
    last_name: '',
    ranking: '',
    email: '',
    phone: '',
    club: '',
    year_of_birth: '',
    date_of_birth: '', // OLD: Will be removed after migration
    gender: 'Mr' as 'Mr' | 'Mme',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [rankingFilter, setRankingFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [clubFilter, setClubFilter] = useState<string>('all');
  const [licenseError, setLicenseError] = useState<string>('');
  const [sortField, setSortField] = useState<string>('nom');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchPlayers();
  }, [currentUserId]);

  const fetchPlayers = async () => {
    try {
      if (!currentUserId) {
        setPlayers([]);
        return;
      }
      const data = storage.players.getCurrentUserPlayers(currentUserId);
      setPlayers(data);

      // Also fetch Supabase players enriched (if signed in)
      const enriched = await playersAPI.getMyPlayersEnriched();
      setCloudPlayers(enriched);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      license_number: '',
      first_name: '',
      last_name: '',
      ranking: '',
      email: '',
      phone: '',
      club: '',
      year_of_birth: '',
      date_of_birth: '', // OLD: Will be removed after migration
      gender: 'Mr' as 'Mr' | 'Mme',
    });
    setEditingPlayer(null);
    setLicenseError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // When signed in, add to Supabase by licence only
      if (isSignedIn && !editingPlayer) {
        const licence = (formData.license_number || '').trim();
        if (!licence) {
          setLicenseError('License number is required');
          return;
        }

        const result = await playersAPI.addLicenceForCurrentUser(licence);
        if (!result.ok) {
          setLicenseError(result.error || 'Failed to add player');
          toast({
            title: 'Error',
            description: result.error || 'Failed to add player',
            variant: 'destructive',
          });
          return;
        }

        toast({ title: 'Success', description: 'Player added to your cloud list.' });
        await fetchPlayers();
        setIsDialogOpen(false);
        resetForm();
        return;
      }

      if (!currentUserId) {
        toast({
          title: 'Error',
          description: 'You must be signed in to perform this action',
          variant: 'destructive',
        });
        return;
      }
      if (editingPlayer) {
        // Update existing player (local storage)
        storage.players.update(editingPlayer.id, {
          ...formData,
          ranking: parseInt(formData.ranking) || 0,
          year_of_birth: parseInt(formData.year_of_birth) || new Date().getFullYear() - 25,
          organizer_id: currentUserId,
        });
        toast({
          title: 'Success',
          description: 'Player updated successfully!',
        });
        fetchPlayers();
        setIsDialogOpen(false);
        resetForm();
      } else {
        // Create new local player (when not signed in)
        storage.players.create({
          ...formData,
          ranking: parseInt(formData.ranking) || 0,
          year_of_birth: parseInt(formData.year_of_birth) || new Date().getFullYear() - 25,
          organizer_id: currentUserId,
          owner_id: currentUserId,
        });
        toast({
          title: 'Success',
          description: 'Player created successfully!',
        });
        fetchPlayers();
        setIsDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving player:', error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          setLicenseError('This license number is already registered. Please use a different one.');
          toast({
            title: "License Number Already Exists",
            description: error.message + ". Please use a different license number.",
            variant: "destructive",
          });
        } else if (error.message.includes('License number must be')) {
          setLicenseError(error.message);
          toast({
            title: "Invalid License Number",
            description: error.message,
            variant: "destructive",
          });
        } else if (error.message.includes('Year of birth must be')) {
          toast({
            title: "Invalid Year of Birth",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message || "Failed to save player",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to save player",
          variant: "destructive",
        });
      }
      
      // Keep the form open so user can fix the error
      // Only close on successful save
    }
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      license_number: player.license_number,
      first_name: player.first_name,
      last_name: player.last_name,
      ranking: player.ranking.toString(),
      email: player.email || '',
      phone: player.phone || '',
      club: player.club,
      year_of_birth: (player.year_of_birth || new Date().getFullYear() - 25).toString(),
      date_of_birth: player.date_of_birth || '',
      gender: player.gender,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (playerId: string) => {
    try {
      storage.players.delete(playerId);
      fetchPlayers();
      toast({
        title: "Success",
        description: "Player deleted successfully!",
      });
    } catch (error) {
      console.error('Error deleting player:', error);
      toast({
        title: "Error",
        description: "Failed to delete player",
        variant: "destructive",
      });
    }
  };

  const handleCloudDelete = async (playerId: string) => {
    try {
      const res = await playersAPI.deleteById(playerId);
      if (!res.ok) {
        toast({ title: 'Error', description: res.error || 'Failed to delete player', variant: 'destructive' });
        return;
      }
      await fetchPlayers();
      toast({ title: 'Success', description: 'Player removed from your list.' });
    } catch (error) {
      console.error('Error deleting cloud player:', error);
      toast({ title: 'Error', description: 'Failed to delete player', variant: 'destructive' });
    }
  };

  const getRankingColor = (ranking: number) => {
    const validRanking = ranking || 0;
    if (validRanking <= 25) return 'bg-green-100 text-green-800';
    if (validRanking <= 100) return 'bg-blue-100 text-blue-800';
    if (validRanking <= 250) return 'bg-purple-100 text-purple-800';
    if (validRanking <= 500) return 'bg-orange-100 text-orange-800';
    if (validRanking <= 1000) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getGenderIcon = (gender: string) => {
    return gender === 'Mr' ? <Circle className="h-4 w-4 text-blue-500" /> : <CircleDot className="h-4 w-4 text-pink-500" />;
  };

  // Get unique clubs for filter (from both local and cloud players)
  const uniqueClubs = Array.from(new Set([
    ...players.map(p => p.club),
    ...cloudPlayers.map(p => p.club)
  ].filter((club): club is string => club !== null && club !== undefined && club.trim() !== ''))).sort();

  const filteredPlayers = players.filter(player => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (player.first_name?.toLowerCase() || '').includes(searchTermLower) ||
      (player.last_name?.toLowerCase() || '').includes(searchTermLower) ||
      (player.license_number?.toLowerCase() || '').includes(searchTermLower) ||
      (player.club?.toLowerCase() || '').includes(searchTermLower) ||
      (player.email?.toLowerCase() || '').includes(searchTermLower);
    
    const matchesRanking = rankingFilter === 'all' || 
      (rankingFilter === 'top25' && player.ranking <= 25) ||
      (rankingFilter === 'top100' && player.ranking <= 100) ||
      (rankingFilter === 'top250' && player.ranking <= 250) ||
      (rankingFilter === 'top500' && player.ranking <= 500) ||
      (rankingFilter === 'top1000' && player.ranking <= 1000);
    
    const matchesGender = genderFilter === 'all' || player.gender === genderFilter;
    const matchesClub = clubFilter === 'all' || player.club === clubFilter;
    
    return matchesSearch && matchesRanking && matchesGender && matchesClub;
  });

  // Filter cloud players based on search criteria
  const filteredCloudPlayers = cloudPlayers.filter(player => {
    const searchTermLower = playerSearchTerm.toLowerCase();
    const matchesSearch = 
      (player.nom?.toLowerCase() || '').includes(searchTermLower) ||
      (player.licence?.toLowerCase() || '').includes(searchTermLower) ||
      (player.club?.toLowerCase() || '').includes(searchTermLower);
    
    const matchesRanking = rankingFilter === 'all' || 
      (rankingFilter === 'top25' && (player.rang || 0) <= 25) ||
      (rankingFilter === 'top100' && (player.rang || 0) <= 100) ||
      (rankingFilter === 'top250' && (player.rang || 0) <= 250) ||
      (rankingFilter === 'top500' && (player.rang || 0) <= 500) ||
      (rankingFilter === 'top1000' && (player.rang || 0) <= 1000);
    
    const matchesGender = genderFilter === 'all' || player.genre === genderFilter;
    const matchesClub = clubFilter === 'all' || player.club === clubFilter;
    
    return matchesSearch && matchesRanking && matchesGender && matchesClub;
  });

  // Sort filtered cloud players
  const sortedCloudPlayers = [...filteredCloudPlayers].sort((a, b) => {
    let aValue: any = a[sortField as keyof SupabasePlayersEnrichedRow];
    let bValue: any = b[sortField as keyof SupabasePlayersEnrichedRow];
    
    // Handle null/undefined values
    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';
    
    // Handle numeric values
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    // Handle string values
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    
    if (sortDirection === 'asc') {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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
              <h1 className="text-3xl font-bold text-gray-900">Players</h1>
              <p className="text-gray-600 mt-1">Manage your padel players</p>
            </div>
            {isSignedIn ? (
              <Link href="/dashboard/ten-up">
                <Button className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add from Ten'Up</span>
                </Button>
              </Link>
            ) : (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center space-x-2" onClick={resetForm}>
                    <Plus className="h-4 w-4" />
                    <span>New Player</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{editingPlayer ? 'Edit Player' : 'New Player'}</DialogTitle>
                    <DialogDescription>
                      {editingPlayer ? 'Update player information.' : 'Add a new player to your roster.'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender {isSignedIn ? '' : '*'}</Label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'Mr' | 'Mme' })}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full"
                      required={!isSignedIn}
                    >
                      <option value="Mr">Mr</option>
                      <option value="Mme">Mme</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name {isSignedIn ? '' : '*'}</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        required={!isSignedIn}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name {isSignedIn ? '' : '*'}</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        required={!isSignedIn}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="license_number">License Number *</Label>
                    <Input
                      id="license_number"
                      value={formData.license_number}
                      onChange={(e) => {
                        setFormData({ ...formData, license_number: e.target.value });
                        setLicenseError(''); // Clear error when user starts typing
                      }}
                      className={licenseError ? 'border-red-500 focus:border-red-500' : ''}
                      required
                    />
                    {licenseError && (
                      <p className="text-sm text-red-600 mt-1">{licenseError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ranking">Ranking {isSignedIn ? '' : '*'}</Label>
                    <Input
                      id="ranking"
                      type="number"
                      value={formData.ranking}
                      onChange={(e) => setFormData({ ...formData, ranking: e.target.value })}
                      required={!isSignedIn}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="club">Club {isSignedIn ? '' : '*'}</Label>
                    <Input
                      id="club"
                      value={formData.club}
                      onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                      required={!isSignedIn}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year_of_birth">Year of Birth {isSignedIn ? '' : '*'}</Label>
                    <Input
                      id="year_of_birth"
                      type="number"
                      min={new Date().getFullYear() - 100}
                      max={new Date().getFullYear() - 1}
                      value={formData.year_of_birth}
                      onChange={(e) => setFormData({ ...formData, year_of_birth: e.target.value })}
                      required={!isSignedIn}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingPlayer ? 'Update' : 'Create'} Player
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

                     {/* Cloud Players (Supabase) Section */}
           <div className="space-y-6">
             {/* Player Search */}
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center space-x-2">
                   <Search className="h-5 w-5" />
                   <span>Search My Players</span>
                 </CardTitle>
                 <CardDescription>
                   Search and filter through your own players list
                 </CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="player-search">Search</Label>
                     <Input
                       id="player-search"
                       placeholder="Name, license, or club..."
                       value={playerSearchTerm}
                       onChange={(e) => setPlayerSearchTerm(e.target.value)}
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="player-gender">Gender</Label>
                     <Select value={genderFilter} onValueChange={(value: string) => setGenderFilter(value)}>
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">All</SelectItem>
                         <SelectItem value="Homme">Men</SelectItem>
                         <SelectItem value="Femme">Women</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="player-ranking-min">Min Ranking</Label>
                     <Input
                       id="player-ranking-min"
                       type="number"
                       placeholder="0"
                       value={rankingFilter === 'all' ? '' : rankingFilter === 'top25' ? '1' : rankingFilter === 'top100' ? '26' : rankingFilter === 'top250' ? '101' : rankingFilter === 'top500' ? '251' : rankingFilter === 'top1000' ? '501' : ''}
                       onChange={(e) => {
                         const value = parseInt(e.target.value);
                         if (value <= 25) setRankingFilter('top25');
                         else if (value <= 100) setRankingFilter('top100');
                         else if (value <= 250) setRankingFilter('top250');
                         else if (value <= 500) setRankingFilter('top500');
                         else if (value <= 1000) setRankingFilter('top1000');
                         else setRankingFilter('all');
                       }}
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="player-club">Club</Label>
                     <Select value={clubFilter} onValueChange={setClubFilter}>
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">All Clubs</SelectItem>
                         {uniqueClubs.map(club => (
                           <SelectItem key={club} value={club}>{club || 'Unknown Club'}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
                 <div className="flex justify-end">
                   <Button 
                     variant="outline"
                     onClick={() => {
                       setPlayerSearchTerm('');
                       setGenderFilter('all');
                       setRankingFilter('all');
                       setClubFilter('all');
                     }}
                   >
                     <Filter className="h-4 w-4 mr-2" />
                     Clear Filters
                   </Button>
                 </div>
               </CardContent>
             </Card>
            
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>My Players (Supabase)</CardTitle>
                    <CardDescription>Players linked by licence and enriched from latest rankings</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                                                                   {sortedCloudPlayers.length === 0 ? (
                   <div className="text-gray-500">
                     {cloudPlayers.length === 0 ? "No players yet in the cloud list." : "No players match your current filters."}
                   </div>
                 ) : (
                   <div className="overflow-x-auto">
                     <table className="w-full">
                                               <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              <button
                                onClick={() => handleSort('nom')}
                                className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                              >
                                <span>Name</span>
                                {sortField === 'nom' && (
                                  <ChevronDown className={`h-4 w-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                                )}
                              </button>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              <button
                                onClick={() => handleSort('licence')}
                                className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                              >
                                <span>Licence</span>
                                {sortField === 'licence' && (
                                  <ChevronDown className={`h-4 w-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                                )}
                              </button>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              <button
                                onClick={() => handleSort('rang')}
                                className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                              >
                                <span>Ranking</span>
                                {sortField === 'rang' && (
                                  <ChevronDown className={`h-4 w-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                                )}
                              </button>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              <button
                                onClick={() => handleSort('club')}
                                className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                              >
                                <span>Club</span>
                                {sortField === 'club' && (
                                  <ChevronDown className={`h-4 w-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                                )}
                              </button>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              <button
                                onClick={() => handleSort('ligue')}
                                className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                              >
                                <span>League</span>
                                {sortField === 'ligue' && (
                                  <ChevronDown className={`h-4 w-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                                )}
                              </button>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              <button
                                onClick={() => handleSort('annee_naissance')}
                                className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                              >
                                <span>Birth Year</span>
                                {sortField === 'annee_naissance' && (
                                  <ChevronDown className={`h-4 w-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                                )}
                              </button>
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-gray-900">Actions</th>
                          </tr>
                        </thead>
                                               <tbody>
                          {sortedCloudPlayers.map((p) => (
                          <tr key={p.player_id} className="border-b hover:bg-gray-50">
                                                         <td className="py-3 px-4 text-gray-900">
                               <div className="flex items-center space-x-2">
                                 {p.genre === 'Homme' ? <Circle className="h-4 w-4 text-blue-500" /> : <CircleDot className="h-4 w-4 text-pink-500" />}
                                 <Link 
                                   href={`/dashboard/players/${p.licence}`}
                                   className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                 >
                                   {p.nom || `Player ${p.licence}`}
                                 </Link>
                               </div>
                             </td>
                            <td className="py-3 px-4 text-gray-600">{p.licence}</td>
                            <td className="py-3 px-4">
                              <Badge className={getRankingColor(p.rang || 0)}>P{p.rang || 0}</Badge>
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                          {p.club || '-'}
                        </td>
                            <td className="py-3 px-4 text-gray-600">{p.ligue || '-'}</td>
                            <td className="py-3 px-4 text-gray-600">{p.annee_naissance || '-'}</td>
                            <td className="py-3 px-4 text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 px-2 text-red-600 hover:text-red-700">
                                    <Trash2 className="h-4 w-4 mr-1" /> Remove
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Player</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove this player from your list?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleCloudDelete(p.player_id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Local Players Section (shown only when not signed in) */}
          {!isSignedIn && (
          <div className="space-y-6">
            {/* Search */}
            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search players by name, license, club, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Players Table */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>My Players ({filteredPlayers.length})</CardTitle>
                    <CardDescription>
                      Manage your padel players roster
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {players.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No players yet</h3>
                    <p className="text-gray-500 mb-6">
                      Add your first player to start building your roster
                    </p>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Player
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">
                            <div className="flex items-center space-x-1">
                              <span>Name</span>
                            </div>
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">
                            <div className="flex items-center space-x-1">
                              <span>License</span>
                            </div>
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">
                            <div className="flex items-center space-x-1">
                              <span>Ranking</span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setRankingFilter('all')}>
                                    All Rankings
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setRankingFilter('top25')}>
                                    Top 25
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setRankingFilter('top100')}>
                                    Top 100
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setRankingFilter('top250')}>
                                    Top 250
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setRankingFilter('top500')}>
                                    Top 500
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setRankingFilter('top1000')}>
                                    Top 1000
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">
                            <div className="flex items-center space-x-1">
                              <span>Gender</span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setGenderFilter('all')}>
                                    All
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setGenderFilter('Mr')}>
                                    Mr
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setGenderFilter('Mme')}>
                                    Mme
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">
                            <div className="flex items-center space-x-1">
                              <span>Club</span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setClubFilter('all')}>
                                    All Clubs
                                  </DropdownMenuItem>
                                  {uniqueClubs.map(club => (
                                    <DropdownMenuItem key={club} onClick={() => setClubFilter(club)}>
                                      {club}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">
                            <div className="flex items-center space-x-1">
                              <span>Year of Birth</span>
                            </div>
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">
                            <div className="flex items-center space-x-1">
                              <span>Email</span>
                            </div>
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">
                            <div className="flex items-center space-x-1">
                              <span>Phone</span>
                            </div>
                          </th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">
                            <div className="flex items-center space-x-1">
                              <span>Actions</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPlayers.map((player) => (
                          <tr key={player.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                {getGenderIcon(player.gender)}
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
                                P{player.ranking || 0}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {player.gender}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {player.club || '-'}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {player.year_of_birth || (player.date_of_birth ? new Date(player.date_of_birth).getFullYear() : '-')}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {player.email || '-'}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {player.phone || '-'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/players/${player.license_number}`}>
                                      <Target className="h-4 w-4 mr-2" />
                                      View Statistics
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEdit(player)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem 
                                        className="text-red-600 focus:text-red-600"
                                        onSelect={(e) => e.preventDefault()}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Player</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{player.first_name} {player.last_name}"? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleDelete(player.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete Player
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredPlayers.length === 0 && players.length > 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No players match your current filters.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
