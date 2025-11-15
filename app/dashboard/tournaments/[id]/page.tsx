'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { tournamentsAPI, tournamentTeamsAPI, type AppTournament } from '@/lib/supabase';
import { storage, TeamWithPlayers, MatchWithTeams } from '@/lib/storage';
import { tournamentMatchesAPI } from '@/lib/supabase';
import { useCurrentUserId } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Calendar, MapPin, Share2, Lock, Settings, Clock, Target, Trophy, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useToast } from '@/hooks/use-toast';
import { TournamentTeams } from '@/components/tournament-teams';
import { TournamentFormats } from '@/components/tournament-formats';
import { TournamentMatches } from '@/components/tournament-matches';
import { TournamentRegistration } from '@/components/tournament-registration';
import { TournamentRegistrationsList } from '@/components/tournament-registrations-list';
import { ProtectedRoute } from '@/components/protected-route';
import { tournamentRegistrationsAPI } from '@/lib/supabase';

// Owner-only access via Supabase RLS

interface TournamentPageProps {
  params: Promise<{ id: string }>;
}

// Helper to extract all matches from a bracket tree as flat objects
function extractMatchesFromBracketTree(node: any, matches: any[] = []): any[] {
  if (!node) return matches;
  
  // If this node has both home and visitor teams, it's a match
  if (node.sides?.home?.team?.id && node.sides?.visitor?.team?.id) {
    matches.push({
      id: node.id,
      name: node.name,
      home: node.sides.home.team,
      visitor: node.sides.visitor.team,
      stage: node.name,
      order_index: matches.length + 1,
    });
  }
  
  // Recursively process children
  if (node.sides) {
    if (node.sides.home && node.sides.home.child) {
      extractMatchesFromBracketTree(node.sides.home.child, matches);
    }
    if (node.sides.visitor && node.sides.visitor.child) {
      extractMatchesFromBracketTree(node.sides.visitor.child, matches);
    }
  }
  
  return matches;
}

export default function TournamentPage({ params }: TournamentPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const currentUserId = useCurrentUserId();
  const [tournament, setTournament] = useState<AppTournament | null>(null);
  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('registrations');


  // Next.js 15: params is a Promise, need to unwrap it
  const { id } = use(params);

  useEffect(() => {
    if (currentUserId) {
      fetchTournament();
    }
  }, [id, currentUserId]);

  const fetchTournament = async () => {
    try {
      // Try to get tournament as owner or registered user
      const tournamentData = await tournamentsAPI.getByIdOrRegistered(id);
      
      if (!tournamentData) {
        throw new Error('Tournament not found');
      }
      
      setTournament(tournamentData);
      
      // Load teams with players from Supabase and map to UI shape
      const supaTeams = await tournamentTeamsAPI.listWithPlayers(id);
      const mappedTeams: TeamWithPlayers[] = supaTeams.map(t => ({
        id: t.id,
        name: t.name,
        weight: t.weight,
        seed_number: t.seed_number,
        is_wo: t.is_wo,
        created_at: t.created_at,
        updated_at: t.updated_at,
        players: t.players.map(p => ({
          id: p.id,
          license_number: p.license_number,
          first_name: p.first_name,
          last_name: p.last_name,
          ranking: p.ranking,
          email: undefined,
          phone: undefined,
          year_of_birth: p.year_of_birth ?? 0,
          date_of_birth: '',
          gender: p.gender as any,
          organizer_id: tournamentData.owner_id || '',
          owner_id: tournamentData.owner_id,
          created_at: p.created_at,
          updated_at: p.updated_at,
        })),
      }));
      setTeams(mappedTeams);

      // Load matches from Supabase and map to UI shape using teams
      const matchesRows = await tournamentMatchesAPI.listByTournament(id);
      const teamById = new Map(teams.map((t) => [t.id, t] as const));
      const mappedMatches: MatchWithTeams[] = matchesRows.map(r => ({
        id: r.id,
        tournament_id: r.tournament_id,
        round: r.round,
        team_1_id: r.team_1_id || undefined,
        team_2_id: r.team_2_id || undefined,
        winner_team_id: r.winner_team_id || undefined,
        score: r.score || undefined,
        order_index: r.order_index,
        terrain_number: r.terrain_number || undefined,
        match_type: r.match_type,
        bracket_type: (r.bracket_type as any) || undefined,
        json_match_id: r.json_match_id || undefined,
        rotation_group: r.rotation_group || undefined,
        stage: r.stage || undefined,
        bracket_location: r.bracket_location || undefined,
        ranking_game: r.ranking_game || undefined,
        ranking_label: r.ranking_label || undefined,
        team1_source: r.team1_source || undefined,
        team2_source: r.team2_source || undefined,
        created_at: r.created_at,
        updated_at: r.updated_at,
        team_1: r.team_1_id ? (teamById.get(r.team_1_id) as any) : undefined,
        team_2: r.team_2_id ? (teamById.get(r.team_2_id) as any) : undefined,
        winner_team: r.winner_team_id ? (teamById.get(r.winner_team_id) as any) : undefined,
      }));
      setMatches(mappedMatches);


    } catch (error) {
      console.error('Error fetching tournament:', error);
      toast({
        title: "Error",
        description: "Failed to load tournament",
        variant: "destructive",
      });
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const copyPublicLink = async () => {
    if (tournament) {
      const publicUrl = `${window.location.origin}/public/${tournament.public_id}`;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(publicUrl);
          toast({
            title: "Success",
            description: "Public link copied to clipboard!",
          });
        } else {
          // Fallback for older browsers or non-secure contexts
          const textArea = document.createElement('textarea');
          textArea.value = publicUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          toast({
            title: "Success",
            description: "Public link copied to clipboard!",
          });
        }
      } catch (error) {
        console.error('Failed to copy link:', error);
        toast({
          title: "Error",
          description: "Failed to copy link to clipboard",
          variant: "destructive",
        });
      }
    }
  };

  const viewPublicPage = () => {
    if (tournament) {
      const publicUrl = `${window.location.origin}/public/${tournament.public_id}`;
      window.open(publicUrl, '_blank');
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

  const bracketMatches = tournament && tournament.bracket ? extractMatchesFromBracketTree(tournament.bracket) : matches;

  // Debug logging for bracketMatches
  console.log('=== DEBUG: bracketMatches ===');
  console.log('tournament.bracket:', tournament?.bracket);
  console.log('matches from storage:', matches);
  console.log('bracketMatches:', bracketMatches);
  console.log('bracketMatches length:', bracketMatches?.length);
  console.log('bracketMatches structure:', JSON.stringify(bracketMatches, null, 2));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!tournament) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Tournament not found</h2>
          <Link href="/dashboard">
            <Button className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{tournament.name}</h1>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mt-2 text-gray-600">
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
                <div className="flex flex-wrap items-center gap-2 mt-2">
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <Badge variant={tournament.teams_locked ? "default" : "secondary"}>
                {tournament.teams_locked ? (
                  <>
                    <Lock className="h-3 w-3 mr-1" />
                    Teams Locked
                  </>
                ) : (
                  <>
                    <Settings className="h-3 w-3 mr-1" />
                    Teams Open
                  </>
                )}
              </Badge>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Button variant="outline" size="sm" onClick={copyPublicLink}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Copy Public Link
                </Button>
                <Button variant="outline" size="sm" onClick={viewPublicPage}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Public Page
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-1">
            <TabsTrigger value="registrations" className="text-xs lg:text-sm">Inscrits</TabsTrigger>
            <TabsTrigger value="teams" className="text-xs lg:text-sm">Équipes</TabsTrigger>
            <TabsTrigger value="registration" className="text-xs lg:text-sm">Inscription</TabsTrigger>
            <TabsTrigger value="format" disabled={!tournament.teams_locked} className="text-xs lg:text-sm">
              Format
            </TabsTrigger>
            <TabsTrigger value="matches" disabled={!tournament.format_id} className="text-xs lg:text-sm">
              Matchs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registrations" className="space-y-6 mt-6">
            <TournamentRegistrationsList 
              tournament={tournament}
              onUpdate={fetchTournament}
            />
          </TabsContent>

          <TabsContent value="teams" className="space-y-6 mt-6">
            <TournamentTeams 
              tournament={tournament}
              teams={teams}
              onTeamsUpdate={fetchTournament}
            />
          </TabsContent>

          <TabsContent value="registration" className="space-y-6 mt-6">
            <TournamentRegistration 
              tournament={tournament}
              onUpdate={fetchTournament}
            />
          </TabsContent>

          <TabsContent value="format" className="space-y-6 mt-6">
            <TournamentFormats 
              tournament={tournament}
              teams={teams}
              onFormatSelect={fetchTournament}
            />
          </TabsContent>

          <TabsContent value="matches" className="space-y-6 mt-6">
            <TournamentMatches 
              tournament={tournament}
              teams={teams}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
    </ProtectedRoute>
  );
}