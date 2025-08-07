'use client';

import { useState, useEffect } from 'react';
import { storage, Player } from '@/lib/storage';
import { nationalPlayersAPI, SupabaseNationalPlayer } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Edit, Trash2, MoreVertical, User, Mail, Phone, Search, Filter, Award, Circle, CircleDot, ChevronDown, Database, UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProtectedRoute } from '@/components/protected-route';
import { useCurrentUserId } from '@/hooks/use-current-user';

// Demo user ID for testing
const DEMO_USER_ID = 'demo-user-123';

export default function PlayersPage() {
  const { toast } = useToast();
  const currentUserId = useCurrentUserId();
  const [players, setPlayers] = useState<Player[]>([]);
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
  const [rankingFilter, setRankingFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [clubFilter, setClubFilter] = useState<string>('all');
  const [licenseError, setLicenseError] = useState<string>('');

  // National players state
  const [nationalPlayers, setNationalPlayers] = useState<SupabaseNationalPlayer[]>([]);
  const [nationalSearchTerm, setNationalSearchTerm] = useState('');
  const [nationalGenderFilter, setNationalGenderFilter] = useState<'men' | 'women' | 'all'>('all');
  const [nationalRankingMin, setNationalRankingMin] = useState<string>('');
  const [nationalRankingMax, setNationalRankingMax] = useState<string>('');
  const [nationalLeagueFilter, setNationalLeagueFilter] = useState<string>('all');
  const [nationalLeagues, setNationalLeagues] = useState<string[]>([]);
  const [searchingNational, setSearchingNational] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayers();
    fetchNationalLeagues();
  }, [currentUserId]);

  const fetchPlayers = () => {
    try {
      const userId = currentUserId || DEMO_USER_ID;
      const data = storage.players.getCurrentUserPlayers(userId);
      setPlayers(data);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNationalLeagues = async () => {
    try {
      const leagues = await nationalPlayersAPI.getLeagues();
      // Filter out empty or null league values
      const validLeagues = leagues.filter(league => league && league.trim() !== '');
      setNationalLeagues(validLeagues);
    } catch (error) {
      console.error('Error fetching leagues:', error);
    }
  };

  const searchNationalPlayers = async () => {
    if (!nationalSearchTerm.trim()) return;
    
    setSearchingNational(true);
    try {
      const filters: any = {};
      if (nationalGenderFilter !== 'all') filters.gender = nationalGenderFilter;
      if (nationalRankingMin) filters.rankingMin = parseInt(nationalRankingMin);
      if (nationalRankingMax) filters.rankingMax = parseInt(nationalRankingMax);
      if (nationalLeagueFilter !== 'all') filters.league = nationalLeagueFilter;

      const results = await nationalPlayersAPI.search(nationalSearchTerm, filters);
      setNationalPlayers(results);
      
      if (results.length === 0) {
        toast({
          title: "No Results",
          description: "No players found matching your search criteria.",
        });
      }
    } catch (error) {
      console.error('Error searching national players:', error);
      toast({
        title: "Search Error",
        description: "Failed to search national players. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSearchingNational(false);
    }
  };

  const addNationalPlayerToLocal = async (nationalPlayer: SupabaseNationalPlayer) => {
    setAddingPlayer(nationalPlayer.id);
    
    try {
      const userId = currentUserId || DEMO_USER_ID;
      
      // Check if player already exists
      const existingPlayer = players.find(p => p.license_number === nationalPlayer.license_number);
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
      fetchPlayers();
      
      toast({
        title: "Player Added",
        description: `${nationalPlayer.first_name} ${nationalPlayer.last_name} has been added to your roster.`,
      });
    } catch (error) {
      console.error('Error adding national player:', error);
      
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const userId = currentUserId || DEMO_USER_ID;
      if (editingPlayer) {
        // Update existing player
        storage.players.update(editingPlayer.id, {
          ...formData,
          ranking: parseInt(formData.ranking) || 0,
          year_of_birth: parseInt(formData.year_of_birth) || new Date().getFullYear() - 25,
          organizer_id: userId,
        });
        toast({
          title: "Success",
          description: "Player updated successfully!",
        });
        fetchPlayers();
        setIsDialogOpen(false);
        resetForm();
      } else {
        // Create new player
        storage.players.create({
          ...formData,
          ranking: parseInt(formData.ranking) || 0,
          year_of_birth: parseInt(formData.year_of_birth) || new Date().getFullYear() - 25,
          organizer_id: userId,
          owner_id: userId, // Set owner_id for new players
        });
        toast({
          title: "Success",
          description: "Player created successfully!",
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

  // Get unique clubs for filter
  const uniqueClubs = Array.from(new Set(players.map(p => p.club))).sort();

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
                    <Label htmlFor="gender">Gender *</Label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'Mr' | 'Mme' })}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full"
                      required
                    >
                      <option value="Mr">Mr</option>
                      <option value="Mme">Mme</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        required
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
                    <Label htmlFor="ranking">Ranking *</Label>
                    <Input
                      id="ranking"
                      type="number"
                      value={formData.ranking}
                      onChange={(e) => setFormData({ ...formData, ranking: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="club">Club *</Label>
                    <Input
                      id="club"
                      value={formData.club}
                      onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year_of_birth">Year of Birth *</Label>
                    <Input
                      id="year_of_birth"
                      type="number"
                      min={new Date().getFullYear() - 100}
                      max={new Date().getFullYear() - 1}
                      value={formData.year_of_birth}
                      onChange={(e) => setFormData({ ...formData, year_of_birth: e.target.value })}
                      required
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
          </div>

          {/* Tabs */}
          <Tabs defaultValue="local" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="local" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>My Players ({players.length})</span>
              </TabsTrigger>
              <TabsTrigger value="national" className="flex items-center space-x-2">
                <Database className="h-4 w-4" />
                <span>National Database</span>
              </TabsTrigger>
            </TabsList>

            {/* Local Players Tab */}
            <TabsContent value="local" className="space-y-6">
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
                                {player.club}
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
            </TabsContent>

            {/* National Database Tab */}
            <TabsContent value="national" className="space-y-6">
              {/* Search Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>National Player Database</span>
                  </CardTitle>
                  <CardDescription>
                    Search and add players from the national database to your roster
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="national-search">Search</Label>
                      <Input
                        id="national-search"
                        placeholder="Name, license, or club..."
                        value={nationalSearchTerm}
                        onChange={(e) => setNationalSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && searchNationalPlayers()}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="national-gender">Gender</Label>
                      <Select value={nationalGenderFilter} onValueChange={(value: 'men' | 'women' | 'all') => setNationalGenderFilter(value)}>
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
                      <Label htmlFor="national-ranking-min">Min Ranking</Label>
                      <Input
                        id="national-ranking-min"
                        type="number"
                        placeholder="0"
                        value={nationalRankingMin}
                        onChange={(e) => setNationalRankingMin(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="national-ranking-max">Max Ranking</Label>
                      <Input
                        id="national-ranking-max"
                        type="number"
                        placeholder="2000"
                        value={nationalRankingMax}
                        onChange={(e) => setNationalRankingMax(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="national-league">League</Label>
                      <Select value={nationalLeagueFilter} onValueChange={setNationalLeagueFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Leagues</SelectItem>
                          {nationalLeagues.map(league => (
                            <SelectItem key={league} value={league}>{league}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button 
                        onClick={searchNationalPlayers}
                        disabled={searchingNational || !nationalSearchTerm.trim()}
                        className="w-full"
                      >
                        {searchingNational ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-2" />
                            Search Players
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Search Results */}
              {nationalPlayers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Search Results ({nationalPlayers.length})</CardTitle>
                    <CardDescription>
                      Click "Add to My Players" to add a player to your roster
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
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
                          {nationalPlayers.map((player) => (
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
                                  onClick={() => addNationalPlayerToLocal(player)}
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
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
} 