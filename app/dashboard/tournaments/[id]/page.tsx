'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { storage, Tournament, TeamWithPlayers, MatchWithTeams } from '@/lib/storage';
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

// Demo user ID for testing
const DEMO_USER_ID = 'demo-user-123';

interface TournamentPageProps {
  params: {
    id: string;
  };
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
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('teams');

  const { id } = use(params as any) as { id: string };

  useEffect(() => {
    fetchTournament();
  }, [id]);

  const fetchTournament = () => {
    try {
      const tournamentData = storage.tournaments.getById(id);
      if (!tournamentData || tournamentData.organizer_id !== DEMO_USER_ID) {
        throw new Error('Tournament not found');
      }
      
      setTournament(tournamentData);
      
      const teamsData = storage.getTeamsWithPlayers(id);
      setTeams(teamsData);

      const matchesData = storage.getMatchesWithTeams(id);
      setMatches(matchesData);
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

  const copyPublicLink = () => {
    if (tournament) {
      const publicUrl = `${window.location.origin}/public/${tournament.public_id}`;
      navigator.clipboard.writeText(publicUrl);
      toast({
        title: "Success",
        description: "Public link copied to clipboard!",
      });
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
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
              <div className="flex items-center space-x-4 mt-2 text-gray-600">
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
            <Button variant="outline" onClick={copyPublicLink}>
              <Share2 className="h-4 w-4 mr-2" />
              Copy Public Link
            </Button>
            <Button variant="outline" onClick={viewPublicPage}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Public Page
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="format" disabled={!tournament.teams_locked}>
              Format
            </TabsTrigger>
            <TabsTrigger value="matches" disabled={!tournament.format_id}>
              Matches
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="space-y-6">
            <TournamentTeams 
              tournament={tournament}
              teams={teams}
              onTeamsUpdate={fetchTournament}
            />
          </TabsContent>

          <TabsContent value="format" className="space-y-6">
            <TournamentFormats 
              tournament={tournament}
              teams={teams}
              onFormatSelect={fetchTournament}
            />
          </TabsContent>

          <TabsContent value="matches" className="space-y-6">
            <TournamentMatches 
              tournament={tournament}
              teams={teams}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}