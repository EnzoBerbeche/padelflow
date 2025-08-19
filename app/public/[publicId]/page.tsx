'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { tournamentsAPI, type AppTournament } from '@/lib/supabase';
import { storage, TeamWithPlayers, MatchWithTeams } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, MapPin, Users, Clock, Share2, Target, Crown, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Bracket } from 'react-tournament-bracket';

// Public view (policies for public viewing can be added later)

interface PublicTournamentPageProps {
  params: Promise<{ publicId: string }>;
}

export default function PublicTournamentPage({ params }: PublicTournamentPageProps) {
  const router = useRouter();
  const [tournament, setTournament] = useState<AppTournament | null>(null);
  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);

  // Next.js 15 migration: use React.use() to unwrap params
  const { publicId } = use(params);

  useEffect(() => {
    fetchTournamentData();
  }, [publicId]);

  const fetchTournamentData = async () => {
    try {
      // For now, fetch by publicId via Supabase (will work for owner until public policy is added)
      const tournamentData = await tournamentsAPI.getByPublicId(publicId);
      if (!tournamentData) {
        throw new Error('Tournament not found');
      }
      
      setTournament(tournamentData);
      
      // Check if current user is the organizer
      setIsOrganizer(false);
      
      const teamsData = storage.getTeamsWithPlayers(tournamentData.id);
      setTeams(teamsData);
      
      const matchesData = storage.getMatchesWithTeams(tournamentData.id);
      setMatches(matchesData);
    } catch (error) {
      console.error('Error fetching tournament data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    // Could add a toast notification here
  };

  const goToOrganizerView = () => {
    if (tournament) {
      router.push(`/dashboard/tournaments/${tournament.id}`);
    }
  };

  const getLevelColor = (level: string) => {
    const colors = {
      'P25': 'bg-green-100 text-green-800',
      'P100': 'bg-blue-100 text-blue-800',
      'P250': 'bg-purple-100 text-purple-800',
      'P500': 'bg-orange-100 text-orange-800',
      'P1000': 'bg-red-100 text-red-800',
      'P1500': 'bg-pink-100 text-pink-800',
      'P2000': 'bg-gray-100 text-gray-800',
    };
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: string) => {
    const colors = {
      'All': 'bg-indigo-100 text-indigo-800',
      'Men': 'bg-blue-100 text-blue-800',
      'Women': 'bg-pink-100 text-pink-800',
      'Mixed': 'bg-purple-100 text-purple-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Helper function to get team rank display
  const getTeamRankDisplay = (team: TeamWithPlayers) => {
    if (team.is_wo) return 'WO';
    return team.seed_number ? `TS${team.seed_number}` : 'TS?';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Tournament not found</h2>
          <p className="text-gray-600 mt-2">The tournament you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const sortedTeams = [...teams].sort((a, b) => (a.seed_number || 0) - (b.seed_number || 0));

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Trophy className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
                <div className="flex items-center space-x-4 mt-1 text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {format(new Date(tournament.date), 'PPP')}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {tournament.start_time}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {tournament.location}
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge className={getLevelColor(tournament.level)}>
                    {tournament.level}
                  </Badge>
                  <Badge className={getTypeColor(tournament.type)}>
                    {tournament.type}
                  </Badge>
                  <Badge variant="outline">
                    <Target className="h-3 w-3 mr-1" />
                    {tournament.number_of_courts} courts
                  </Badge>
                  <Badge variant="outline">
                    {tournament.conditions}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isOrganizer && (
                <Button onClick={goToOrganizerView} variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Back to Organizer View
                </Button>
              )}
              <Button onClick={copyLink} variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Share Tournament
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Bracket Tree Display (tree-based format) */}
        {tournament.bracket && (
          <div className="my-8">
            <h2 className="text-2xl font-bold mb-4">Bracket</h2>
            <div className="overflow-x-auto">
              <Bracket game={tournament.bracket} />
            </div>
          </div>
        )}
        {/* Teams */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">Teams</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedTeams.map((team, index) => (
              <Card key={team.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="font-mono">
                        {getTeamRankDisplay(team)}
                      </Badge>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                    </div>
                    <div className="flex space-x-2">
                      <Badge variant="outline">
                        Weight: {team.weight}
                      </Badge>
                      {team.is_wo && (
                        <Badge variant="outline" className="text-orange-600">
                          Walkover
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {team.players.map((player) => (
                      <div key={player.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{player.first_name} {player.last_name}</p>
                          <p className="text-sm text-gray-600">License: {player.license_number}</p>
                        </div>
                        <Badge variant="outline">R: {player.ranking}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Trophy className="h-6 w-6" />
            <span className="text-xl font-bold">PadelFlow</span>
          </div>
          <p className="text-gray-400">
            Professional tournament management for the padel community
          </p>
        </div>
      </footer>
    </div>
  );
}