'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { storage, Tournament, TeamWithPlayers, MatchWithTeams } from '@/lib/storage';
import { useCurrentUserId } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Calendar, MapPin, Share2, Lock, Settings, Clock, Target, Trophy, ExternalLink, Link as LinkIcon, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useToast } from '@/hooks/use-toast';
import { TournamentTeams } from '@/components/tournament-teams';
import { TournamentFormats } from '@/components/tournament-formats';
import { TournamentMatches } from '@/components/tournament-matches';
import { ProtectedRoute } from '@/components/protected-route';

// Demo user ID for testing
const DEMO_USER_ID = 'demo-user-123';

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
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('teams');
  const [registrationLink, setRegistrationLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Next.js 15: params is a Promise, need to unwrap it
  const { id } = use(params);

  useEffect(() => {
    if (currentUserId) {
      fetchTournament();
    }
  }, [id, currentUserId]);

  const fetchTournament = () => {
    try {
      const tournamentData = storage.tournaments.getById(id);
      if (!tournamentData) {
        throw new Error('Tournament not found');
      }
      
      // Check if user can access this tournament
      const canAccess = 
        tournamentData.owner_id === currentUserId || // User owns the tournament
        !tournamentData.owner_id || // Legacy tournament (no owner_id)
        tournamentData.organizer_id === DEMO_USER_ID; // Demo tournament
      
      if (!canAccess) {
        throw new Error('Tournament not found');
      }
      
      setTournament(tournamentData);
      
      const teamsData = storage.getTeamsWithPlayers(id);
      setTeams(teamsData);

      const matchesData = storage.getMatchesWithTeams(id);
      setMatches(matchesData);

      // Fetch registration link if enabled
      if (tournamentData.registration_enabled) {
        const link = storage.registrationLinks.getByTournament(id);
        if (link && link.is_active) {
          setRegistrationLink(link.link_id);
        }
      }
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

  const generateRegistrationLink = () => {
    if (!tournament) return;
    
    try {
      const link = storage.registrationLinks.create(tournament.id);
      setRegistrationLink(link.link_id);
      
      // Update tournament to enable registration
      storage.tournaments.update(tournament.id, {
        registration_enabled: true,
        registration_link_id: link.link_id,
      });
      
      setTournament(prev => prev ? {
        ...prev,
        registration_enabled: true,
        registration_link_id: link.link_id,
      } : null);
      
      toast({
        title: "Success",
        description: "Registration link generated successfully!",
      });
    } catch (error) {
      console.error('Error generating registration link:', error);
      toast({
        title: "Error",
        description: "Failed to generate registration link",
        variant: "destructive",
      });
    }
  };

  const deactivateRegistrationLink = () => {
    if (!tournament) return;
    
    try {
      storage.registrationLinks.deactivate(tournament.id);
      setRegistrationLink(null);
      
      // Update tournament to disable registration
      storage.tournaments.update(tournament.id, {
        registration_enabled: false,
        registration_link_id: undefined,
      });
      
      setTournament(prev => prev ? {
        ...prev,
        registration_enabled: false,
        registration_link_id: undefined,
      } : null);
      
      toast({
        title: "Success",
        description: "Registration link deactivated successfully!",
      });
    } catch (error) {
      console.error('Error deactivating registration link:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate registration link",
        variant: "destructive",
      });
    }
  };

  const copyRegistrationLink = () => {
    if (!registrationLink) return;
    
    const registrationUrl = `${window.location.origin}/register/${registrationLink}`;
    navigator.clipboard.writeText(registrationUrl);
    setCopiedLink(true);
    
    toast({
      title: "Success",
      description: "Registration link copied to clipboard!",
    });
    
    setTimeout(() => setCopiedLink(false), 2000);
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
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-1">
            <TabsTrigger value="teams" className="text-xs lg:text-sm">Teams</TabsTrigger>
            <TabsTrigger value="registration" className="text-xs lg:text-sm">Registration</TabsTrigger>
            <TabsTrigger value="format" disabled={!tournament.teams_locked} className="text-xs lg:text-sm">
              Format
            </TabsTrigger>
            <TabsTrigger value="matches" disabled={!tournament.format_id} className="text-xs lg:text-sm">
              Matches
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="space-y-6 mt-6">
            <TournamentTeams 
              tournament={tournament}
              teams={teams}
              onTeamsUpdate={fetchTournament}
            />
          </TabsContent>

          <TabsContent value="registration" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <LinkIcon className="h-5 w-5" />
                  <span>Player Registration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Registration Link</h3>
                      <p className="text-gray-600">
                        Generate a link that allows players to register themselves for this tournament
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {tournament.registration_enabled ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>

                  {tournament.registration_enabled && registrationLink ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700 mb-1">Registration URL</p>
                            <p className="text-sm text-gray-600 break-all">
                              {`${window.location.origin}/register/${registrationLink}`}
                            </p>
                          </div>
                          <Button
                            onClick={copyRegistrationLink}
                            variant="outline"
                            size="sm"
                            className="ml-2"
                          >
                            {copiedLink ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={deactivateRegistrationLink}
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                        >
                          Deactivate Link
                        </Button>
                        <Button
                          onClick={() => window.open(`${window.location.origin}/register/${registrationLink}`, '_blank')}
                          variant="outline"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Test Registration
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center">
                          <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800">
                              Registration not enabled
                            </p>
                            <p className="text-sm text-yellow-700">
                              Generate a registration link to allow players to register themselves
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button onClick={generateRegistrationLink}>
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Generate Registration Link
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border-t pt-6">
                  <h4 className="text-md font-semibold mb-3">How it works</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>• Players can register themselves and their partners using the registration link</p>
                    <p>• Each team will be automatically added to the tournament</p>
                    <p>• Players will be created in your player database</p>
                    <p>• You can deactivate the link at any time to stop new registrations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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