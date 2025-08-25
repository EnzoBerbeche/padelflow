'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Trophy, TrendingUp, TrendingDown, Users, MapPin, Calendar, Target, Award, UserCheck, Eye } from 'lucide-react';
import { useSupabaseUser } from '@/hooks/use-current-user';
import { userPlayerLinkAPI, UserPlayerLinkWithRanking } from '@/lib/supabase';
import { playersAPI, SupabasePlayersEnrichedRow } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

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
        const currentRanking = link.rang || 0;
        const bestRanking = link.meilleur_classement || currentRanking;
        
        setStats({
          totalTournaments: link.nb_tournois || 0,
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

  const getRankingColor = (ranking: number) => {
    if (ranking <= 100) return 'bg-red-100 text-red-800 border-red-200';
    if (ranking <= 500) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (ranking <= 1000) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (ranking <= 1500) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getEvolutionIcon = (evolution: number | null) => {
    if (!evolution) return null;
    if (evolution < 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (evolution > 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return null;
  };

  const getEvolutionText = (evolution: number | null) => {
    if (!evolution) return 'No change';
    if (evolution < 0) return `+${Math.abs(evolution)} (Improved)`;
    if (evolution > 0) return `+${evolution} (Declined)`;
    return 'No change';
  };

  const getEvolutionColor = (evolution: number | null) => {
    if (!evolution) return 'text-gray-600';
    if (evolution < 0) return 'text-green-600';
    if (evolution > 0) return 'text-red-600';
    return 'text-gray-600';
  };

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
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Player'}! 🎾
            </h1>
            <p className="text-primary-foreground/90 text-lg">
              Your padel journey continues. Here's what's happening with your profile and followed players.
            </p>
          </div>

          {/* User Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tournaments Played</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTournaments}</div>
                <p className="text-xs text-muted-foreground">
                  Total tournaments participated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Players Following</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPlayers}</div>
                <p className="text-xs text-muted-foreground">
                  Players in your watchlist
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Ranking</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">P{stats.averageRanking}</div>
                <p className="text-xs text-muted-foreground">
                  Your current ranking
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Best Ranking</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">P{stats.bestRanking}</div>
                <p className="text-xs text-muted-foreground">
                  Your best achievement
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Linked Player Profile */}
            {playerLink ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <UserCheck className="h-5 w-5 text-green-600" />
                    <span>Your Player Profile</span>
                  </CardTitle>
                  <CardDescription>
                    You are linked to this player in the rankings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-green-800">
                        {playerLink.nom || `Player ${playerLink.licence}`}
                      </h3>
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        {playerLink.genre === 'Homme' ? 'Men' : 'Women'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-green-600 font-medium">Licence:</span>
                        <span className="ml-2 text-green-800">{playerLink.licence}</span>
                      </div>
                      <div>
                        <span className="text-green-600 font-medium">Club:</span>
                        <span className="ml-2 text-green-800">{playerLink.club || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-green-600 font-medium">Current Ranking:</span>
                        <Badge className={`ml-2 ${getRankingColor(playerLink.rang || 0)}`}>
                          P{playerLink.rang || 'N/A'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-green-600 font-medium">Evolution:</span>
                        <div className="flex items-center ml-2">
                          {getEvolutionIcon(playerLink.evolution)}
                          <span className={`ml-1 ${getEvolutionColor(playerLink.evolution)}`}>
                            {getEvolutionText(playerLink.evolution)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" className="flex-1" asChild>
                      <Link href="/dashboard/settings">
                        <UserCheck className="h-4 w-4 mr-2" />
                        Manage Profile
                      </Link>
                    </Button>
                    {playerLink.club && (
                      <Button variant="outline" className="flex-1" asChild>
                        <Link href={`/dashboard/clubs/${encodeURIComponent(playerLink.club)}`}>
                          <MapPin className="h-4 w-4 mr-2" />
                          View Club
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <UserCheck className="h-5 w-5 text-gray-600" />
                    <span>Player Profile</span>
                  </CardTitle>
                  <CardDescription>
                    Link your account to a player in the rankings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-8 text-gray-500">
                    <UserCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="mb-4">You haven't linked your account to a player yet.</p>
                    <Button asChild>
                      <Link href="/dashboard/settings">
                        <UserCheck className="h-4 w-4 mr-2" />
                        Link Your Profile
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Quick Actions</span>
                </CardTitle>
                <CardDescription>
                  Access your most used features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href="/dashboard/tournaments">
                    <Calendar className="h-4 w-4 mr-2" />
                    View Tournaments
                  </Link>
                </Button>
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href="/dashboard/players">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Players
                  </Link>
                </Button>
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href="/dashboard/ten-up">
                    <Target className="h-4 w-4 mr-2" />
                    Ten'Up Rankings
                  </Link>
                </Button>
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href="/dashboard/settings">
                    <UserCheck className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Followed Players Table */}
          {followedPlayers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Players You Follow</span>
                </CardTitle>
                <CardDescription>
                  Track the performance of your followed players
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Player</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Licence</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Current Ranking</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Evolution</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Club</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {followedPlayers.map((player) => (
                        <tr key={player.player_id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {player.genre === 'Homme' ? 'Men' : 'Women'}
                              </Badge>
                              <span className="font-medium">
                                {player.nom || `Player ${player.licence}`}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-mono">
                            {player.licence}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={getRankingColor(player.rang || 0)}>
                              P{player.rang || 'N/A'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              {getEvolutionIcon(player.evolution)}
                              <span className={`ml-1 ${getEvolutionColor(player.evolution)}`}>
                                {getEvolutionText(player.evolution)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {player.club || 'N/A'}
                          </td>
                          <td className="py-3 px-4">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/dashboard/players/${player.licence}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Link>
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

          {/* Empty State for Followed Players */}
          {followedPlayers.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Players You Follow</span>
                </CardTitle>
                <CardDescription>
                  Start following players to track their performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="mb-4">You haven't started following any players yet.</p>
                  <Button asChild>
                    <Link href="/dashboard/players">
                      <Users className="h-4 w-4 mr-2" />
                      Browse Players
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