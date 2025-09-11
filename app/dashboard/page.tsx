'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Trophy, TrendingUp, TrendingDown, Users, MapPin, Calendar, Target, Award, UserCheck, Eye, Search, Filter, ChevronDown, UserMinus, ChevronUp, BarChart3, Smartphone, UserPlus } from 'lucide-react';
import { useSupabaseUser } from '@/hooks/use-current-user';
import { userPlayerLinkAPI, UserPlayerLinkWithRanking } from '@/lib/supabase';
import { playersAPI, SupabasePlayersEnrichedRow } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { InstallGuideModal } from '@/components/install-guide-modal';

export default function HomePage() {
  const { user } = useSupabaseUser();
  const { toast } = useToast();
  const [playerLink, setPlayerLink] = useState<UserPlayerLinkWithRanking | null>(null);
  const [followedPlayers, setFollowedPlayers] = useState<SupabasePlayersEnrichedRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTournaments: 0,
    totalPlayers: 0,
    averageRanking: 0,
    bestRanking: 0,
  });

  // Enhanced filtering and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [rankingFilter, setRankingFilter] = useState<string>('all');
  const [leagueFilter, setLeagueFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'nom_complet' | 'licence' | 'classement' | 'ligue' | 'age_sportif'>('classement');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);


  useEffect(() => {
    loadUserData();
  }, []);


  const loadUserData = async () => {
    setIsLoading(true);
    try {
      // Load user's linked player
      const link = await userPlayerLinkAPI.getMyPlayerLink();
      setPlayerLink(link);

      // Load followed players
      const players = await playersAPI.getMyPlayersEnriched();
      setFollowedPlayers(players);

      // Calculate statistics
      if (link) {
        const evolution = link.evolution || 0;
        const currentRanking = link.classement || 0;
        const bestRanking = link.meilleur_classement || currentRanking;
        
        setStats({
          totalTournaments: link.nombre_tournois || 0,
          totalPlayers: players.length,
          averageRanking: currentRanking,
          bestRanking: bestRanking,
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRankingColor = (ranking: number, gender: string) => {
    if (gender === 'F') {
      return 'bg-pink-100 text-pink-800';
    } else {
      return 'bg-blue-100 text-blue-800';
    }
  };

  const getEvolutionIcon = (evolution: number | null) => {
    if (!evolution) return null;
    if (evolution > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (evolution < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return null;
  };

  const getEvolutionText = (evolution: number | null) => {
    if (!evolution) return 'Aucun changement';
    if (evolution > 0) return `+${evolution}`;
    if (evolution < 0) return `${evolution}`;
    return 'Aucun changement';
  };

  const getEvolutionColor = (evolution: number | null) => {
    if (!evolution) return 'text-gray-600';
    if (evolution > 0) return 'text-green-600';
    if (evolution < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const unfollowPlayer = async (playerId: string) => {
    try {
      const result = await playersAPI.deleteById(playerId);
      if (result.ok) {
        // Remove the player from the local state
        setFollowedPlayers(prev => prev.filter(p => p.player_id !== playerId));
        
        // Update stats
        setStats(prev => ({
          ...prev,
          totalPlayers: prev.totalPlayers - 1
        }));

        toast({
          title: "Success",
          description: "Player unfollowed successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to unfollow player",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error unfollowing player:', error);
      toast({
        title: "Error",
        description: "Failed to unfollow player",
        variant: "destructive",
      });
    }
  };

  // Enhanced filtering logic
  const filteredPlayers = followedPlayers.filter(player => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (player.nom_complet?.toLowerCase() || player.nom?.toLowerCase() || '').includes(searchTermLower) ||
      (player.licence?.toLowerCase() || '').includes(searchTermLower);
    
    const matchesRanking = rankingFilter === 'all' || 
      (rankingFilter === 'p25' && (player.classement || 0) <= 25) ||
      (rankingFilter === 'p100' && (player.classement || 0) <= 100) ||
      (rankingFilter === 'p250' && (player.classement || 0) <= 250) ||
      (rankingFilter === 'p500' && (player.classement || 0) <= 500) ||
      (rankingFilter === 'p1000' && (player.classement || 0) <= 1000) ||
      (rankingFilter === 'p1500' && (player.classement || 0) <= 1500) ||
      (rankingFilter === 'p2000' && (player.classement || 0) <= 2000);
    
    const matchesGender = genderFilter === 'all' || player.sexe === genderFilter;
    
    const matchesLeague = leagueFilter === 'all' || player.ligue === leagueFilter;
    
    return matchesSearch && matchesRanking && matchesGender && matchesLeague;
  });

  // Sort filtered players
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
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

  const handleSort = (field: 'nom_complet' | 'licence' | 'classement' | 'ligue' | 'age_sportif') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setGenderFilter('all');
    setRankingFilter('all');
    setLeagueFilter('all');
  };

  // Get unique leagues for filter
  const uniqueLeagues = Array.from(new Set(followedPlayers.map(p => p.ligue).filter((league): league is string => league !== null && league !== undefined)));

  if (isLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Welcome Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold mb-2">
                Bon retour, {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Joueur'}! 🎾
              </h1>
            </div>
          </div>

          {/* Player Link CTA - Show only if user is not linked to a player */}
          {!playerLink && (
            <Card className="border-2 border-dashed border-green-200 bg-green-50/50">
              <CardContent className="p-6 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <UserCheck className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      Liez votre compte à votre profil joueur
                    </h3>
                    <p className="text-gray-600 max-w-md">
                      Connectez votre compte à votre profil FFT pour accéder à vos statistiques personnalisées, 
                      suivre votre évolution et profiter de toutes les fonctionnalités de NeyoPadel.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link href="/dashboard/settings">
                      <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2">
                        <Search className="h-4 w-4 mr-2" />
                        Rechercher mon profil
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      className="border-green-600 text-green-600 hover:bg-green-50 px-6 py-2"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Comment faire ?
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-4">
                <CardTitle className="text-xs md:text-sm font-medium">Tournois Joués</CardTitle>
                <Trophy className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                <div className="text-lg md:text-2xl font-bold">{stats.totalTournaments}</div>
                <p className="text-xs text-muted-foreground hidden md:block">
                  Total de tournois participés
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-4">
                <CardTitle className="text-xs md:text-sm font-medium">Évolution</CardTitle>
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                <div className="text-lg md:text-2xl font-bold">
                  {playerLink?.evolution ? (
                    <div className="flex items-center">
                      {getEvolutionIcon(playerLink.evolution)}
                      <span className={`ml-2 ${getEvolutionColor(playerLink.evolution)}`}>
                        {playerLink.evolution > 0 ? `+${playerLink.evolution}` : playerLink.evolution}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground hidden md:block">
                  {playerLink?.evolution ? (playerLink.evolution > 0 ? 'Amélioré' : 'Décliné') : 'Aucun changement'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-4">
                <CardTitle className="text-xs md:text-sm font-medium">Classement Actuel</CardTitle>
                <Target className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                <div className="text-lg md:text-2xl font-bold">P{stats.averageRanking}</div>
                <p className="text-xs text-muted-foreground hidden md:block">
                  Votre classement actuel
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-4">
                <CardTitle className="text-xs md:text-sm font-medium">Meilleur Classement</CardTitle>
                <Award className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                <div className="text-lg md:text-2xl font-bold">P{stats.bestRanking}</div>
                <p className="text-xs text-muted-foreground hidden md:block">
                  Votre meilleure performance
                </p>
              </CardContent>
            </Card>
          </div>

          {/* My Stats Button */}
          {playerLink && (
            <div className="flex justify-center">
              <Button asChild className="bg-primary hover:bg-primary/90 text-white">
                <Link href={`/dashboard/players/${playerLink.licence}`}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Voir Mes Statistiques
                </Link>
              </Button>
            </div>
          )}


          {/* Enhanced Followed Players Section */}
          {followedPlayers.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="h-5 w-5" />
                    <span>Mes Joueurs ({filteredPlayers.length})</span>
                  </CardTitle>
                  <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                    <Link href="/dashboard/ten-up">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Ajouter des joueurs
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filter Toggle Button */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center space-x-2 w-full sm:w-auto"
                  >
                    <Filter className="h-4 w-4" />
                    <span>{showFilters ? 'Masquer les Filtres' : 'Afficher les Filtres'}</span>
                    {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  
                  {showFilters && (
                    <Button 
                      variant="outline"
                      onClick={clearFilters}
                      className="flex items-center space-x-2 w-full sm:w-auto"
                    >
                      <Filter className="h-4 w-4" />
                      <span>Clear Filters</span>
                    </Button>
                  )}
                </div>

                {/* Collapsible Filter Controls */}
                {showFilters && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="player-gender">Gender</Label>
                        <Select value={genderFilter} onValueChange={(value: string) => setGenderFilter(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="H">Men</SelectItem>
                            <SelectItem value="F">Women</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="player-ranking">Max Ranking</Label>
                        <Select value={rankingFilter} onValueChange={(value: string) => setRankingFilter(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Rankings</SelectItem>
                            <SelectItem value="p25">P25 and below</SelectItem>
                            <SelectItem value="p100">P100 and below</SelectItem>
                            <SelectItem value="p250">P250 and below</SelectItem>
                            <SelectItem value="p500">P500 and below</SelectItem>
                            <SelectItem value="p1000">P1000 and below</SelectItem>
                            <SelectItem value="p1500">P1500 and below</SelectItem>
                            <SelectItem value="p2000">P2000 and below</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="player-league">Ligue</Label>
                        <Select value={leagueFilter} onValueChange={(value: string) => setLeagueFilter(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Toutes les Ligues</SelectItem>
                            {uniqueLeagues.map(league => (
                              <SelectItem key={league} value={league}>{league}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile-Optimized Player List */}
                {sortedPlayers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="mb-2">No players match your current filters.</p>
                    <p className="text-sm">Try adjusting your search criteria or filters.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Desktop Table - Hidden on Mobile */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              <button
                                onClick={() => handleSort('nom_complet')}
                                className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                              >
                                <span>Joueur</span>
                                {sortField === 'nom_complet' && (
                                  <ChevronDown className={`h-4 w-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                                )}
                              </button>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              <button
                                onClick={() => handleSort('classement')}
                                className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                              >
                                <span>Classement Actuel</span>
                                {sortField === 'classement' && (
                                  <ChevronDown className={`h-4 w-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                                )}
                              </button>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              <button
                                onClick={() => handleSort('ligue')}
                                className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                              >
                                <span>Ligue</span>
                                {sortField === 'ligue' && (
                                  <ChevronDown className={`h-4 w-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                                )}
                              </button>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              <button
                                onClick={() => handleSort('age_sportif')}
                                className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                              >
                                <span>Âge</span>
                                {sortField === 'age_sportif' && (
                                  <ChevronDown className={`h-4 w-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                                )}
                              </button>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Évolution</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-900">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedPlayers.map((player) => (
                            <tr key={player.player_id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div className="flex items-center space-x-2">
                                  <Link 
                                    href={`/dashboard/players/${player.licence}`}
                                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                  >
                                    {player.nom_complet || `Player ${player.licence}`}
                                  </Link>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <Badge className={getRankingColor(player.classement || 0, player.sexe || 'H')}>
                                  {player.classement || 'N/A'}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-gray-600">
                                {player.ligue || '-'}
                              </td>
                              <td className="py-3 px-4 text-gray-600">
                                {player.age_sportif || '-'}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center">
                                  {getEvolutionIcon(player.evolution)}
                                  <span className={`ml-1 ${getEvolutionColor(player.evolution)}`}>
                                    {getEvolutionText(player.evolution)}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => unfollowPlayer(player.player_id)}
                                >
                                  <UserMinus className="h-4 w-4 mr-1" />
                                  Unfollow
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards - Visible only on Mobile */}
                    <div className="md:hidden space-y-3">
                      {sortedPlayers.map((player) => (
                        <div key={player.player_id} className="bg-white border rounded-lg p-4 shadow-sm">
                          {/* Player Name and Gender */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <Link 
                                href={`/dashboard/players/${player.licence}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm"
                              >
                                {player.nom_complet || `Player ${player.licence}`}
                              </Link>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => unfollowPlayer(player.player_id)}
                              className="text-xs"
                            >
                              <UserMinus className="h-3 w-3 mr-1" />
                              Unfollow
                            </Button>
                          </div>

                          {/* Main Info Row - Ranking and Evolution */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <Badge className={`${getRankingColor(player.classement || 0, player.sexe || 'H')} text-sm`}>
                                {player.classement || 'N/A'}
                              </Badge>
                              <div className="flex items-center">
                                {getEvolutionIcon(player.evolution)}
                                <span className={`ml-1 text-sm font-medium ${getEvolutionColor(player.evolution)}`}>
                                  {player.evolution ? (player.evolution > 0 ? `+${player.evolution}` : player.evolution) : 'No change'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Secondary Info - League and Age */}
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span className="truncate max-w-[60%]">
                              {player.ligue || 'No league'}
                            </span>
                            {player.age_sportif && (
                              <span className="text-xs">
                                Age: {player.age_sportif}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Empty State for Followed Players */}
          {followedPlayers.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Mes Joueurs</span>
                </CardTitle>
                <CardDescription>
                  Commencez à suivre des joueurs pour suivre leurs performances
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="mb-4">Vous n'avez pas encore commencé à suivre de joueurs.</p>
                  <Button asChild>
                    <Link href="/dashboard/ten-up">
                      <Users className="h-4 w-4 mr-2" />
                      Parcourir les Joueurs
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
} 