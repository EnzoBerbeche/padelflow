'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { tournamentsAPI, tournamentRegistrationsAPI, tournamentTeamsAPI, tournamentMatchesAPI, type AppTournament, type AppTournamentRegistration } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, MapPin, Users, Clock, Share2, Target, Settings, List, BarChart3, Crown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BracketFromJsonTemplate } from '@/components/bracket-from-json-template';
import type { UITeamWithPlayers } from '@/lib/supabase';
import type { TeamWithPlayers } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface PublicTournamentPageProps {
  params: Promise<{ publicId: string }>;
}

export default function PublicTournamentPage({ params }: PublicTournamentPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<AppTournament | null>(null);
  const [registrations, setRegistrations] = useState<AppTournamentRegistration[]>([]);
  const [teams, setTeams] = useState<UITeamWithPlayers[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);

  // Next.js 15 migration: use React.use() to unwrap params
  const { publicId } = use(params);

  useEffect(() => {
    fetchTournamentData();
  }, [publicId]);

  const fetchTournamentData = async () => {
    try {
      // Fetch tournament by publicId
      const tournamentData = await tournamentsAPI.getByPublicId(publicId);
      if (!tournamentData) {
        throw new Error('Tournament not found');
      }
      
      setTournament(tournamentData);
      
      // Check if current user is the organizer
      setIsOrganizer(false);
      
      // Fetch registrations using public access method
      if (tournamentData.registration_id) {
        const registrationsData = await tournamentRegistrationsAPI.listByRegistrationId(tournamentData.registration_id);
        setRegistrations(registrationsData);
      } else {
        // Fallback: try direct access (may fail due to RLS)
        try {
          const registrationsData = await tournamentRegistrationsAPI.listByTournament(tournamentData.id);
          setRegistrations(registrationsData);
        } catch (error) {
          console.error('Error fetching registrations (fallback):', error);
          setRegistrations([]);
        }
      }
      
      // If tournament is locked (started), fetch teams and matches
      if (tournamentData.teams_locked) {
        const teamsData = await tournamentTeamsAPI.listWithPlayers(tournamentData.id);
        setTeams(teamsData);
        
        const matchesData = await tournamentMatchesAPI.listByTournament(tournamentData.id);
        setMatches(matchesData);
      }
    } catch (error) {
      console.error('Error fetching tournament data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du tournoi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Succès",
          description: "Lien copié dans le presse-papiers",
        });
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = window.location.href;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast({
          title: "Succès",
          description: "Lien copié dans le presse-papiers",
        });
      }
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien",
        variant: "destructive",
      });
    }
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

  // Separate registrations by status
  // Include 'pending' and 'confirmed' as confirmed registrations
  const confirmedRegistrations = registrations.filter(r => 
    r.status === 'confirmed' || r.status === 'pending'
  );
  const waitlistRegistrations = registrations.filter(r => r.status === 'waitlist');

  // Calculate team weight for sorting
  const calculateTeamWeight = (reg: AppTournamentRegistration): number => {
    const rank1 = reg.player1_ranking || 9999;
    const rank2 = reg.player2_ranking || 9999;
    return rank1 + rank2;
  };

  // Sort confirmed registrations by weight
  const sortedConfirmed = [...confirmedRegistrations].sort((a, b) => {
    return calculateTeamWeight(a) - calculateTeamWeight(b);
  });

  // Sort waitlist by creation date (first registered first)
  const sortedWaitlist = [...waitlistRegistrations].sort((a, b) => {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  // Calculate standings from matches
  const calculateStandings = () => {
    if (!teams.length || !matches.length) return [];
    
    const teamStats = teams.map(team => ({
      team,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      matchesPlayed: 0,
    }));

    matches.forEach(match => {
      if (match.winner_team_id && match.team_1_id && match.team_2_id) {
        const team1Index = teamStats.findIndex(t => t.team.id === match.team_1_id);
        const team2Index = teamStats.findIndex(t => t.team.id === match.team_2_id);
        
        if (team1Index !== -1 && team2Index !== -1) {
          const team1 = teamStats[team1Index];
          const team2 = teamStats[team2Index];
          
          // Parse score if available
          let score1 = 0, score2 = 0;
          if (match.score) {
            const scores = match.score.split('-').map((s: string) => parseInt(s.trim()) || 0);
            score1 = scores[0] || 0;
            score2 = scores[1] || 0;
          }
          
          team1.matchesPlayed++;
          team2.matchesPlayed++;
          team1.pointsFor += score1;
          team1.pointsAgainst += score2;
          team2.pointsFor += score2;
          team2.pointsAgainst += score1;
          
          if (match.winner_team_id === match.team_1_id) {
            team1.wins++;
            team2.losses++;
          } else {
            team2.wins++;
            team1.losses++;
          }
        }
      }
    });

    // Sort by wins (desc), then by point difference
    return teamStats.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      const diffA = a.pointsFor - a.pointsAgainst;
      const diffB = b.pointsFor - b.pointsAgainst;
      return diffB - diffA;
    });
  };

  const standings = tournament?.teams_locked ? calculateStandings() : [];

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
          <h2 className="text-2xl font-bold text-gray-900">Tournoi introuvable</h2>
          <p className="text-gray-600 mt-2">Le tournoi que vous recherchez n'existe pas ou a été supprimé.</p>
        </div>
      </div>
    );
  }

  const isTournamentStarted = tournament.teams_locked;

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
                    {format(new Date(tournament.date), 'PPP', { locale: fr })}
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
                  Retour à la gestion
                </Button>
              )}
              <Button onClick={copyLink} variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Partager
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {isTournamentStarted ? (
          <Tabs defaultValue="registrations" className="space-y-6">
            <TabsList>
              <TabsTrigger value="registrations">
                <List className="h-4 w-4 mr-2" />
                Inscriptions
              </TabsTrigger>
              <TabsTrigger value="bracket">
                <BarChart3 className="h-4 w-4 mr-2" />
                Déroulé
              </TabsTrigger>
              <TabsTrigger value="standings">
                <Crown className="h-4 w-4 mr-2" />
                Classement
              </TabsTrigger>
            </TabsList>

            <TabsContent value="registrations" className="space-y-6">
              <RegistrationsTable 
                confirmed={sortedConfirmed} 
                waitlist={sortedWaitlist}
                tournament={tournament}
              />
            </TabsContent>

            <TabsContent value="bracket" className="space-y-6">
              <BracketViewer 
                tournament={tournament}
                teams={teams}
                matches={matches}
              />
            </TabsContent>

            <TabsContent value="standings" className="space-y-6">
              <StandingsTable standings={standings} />
            </TabsContent>
          </Tabs>
        ) : (
          <RegistrationsTable 
            confirmed={sortedConfirmed} 
            waitlist={sortedWaitlist}
            tournament={tournament}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Trophy className="h-6 w-6" />
            <span className="text-xl font-semibold">NeyoPadel</span>
          </div>
          <p className="text-gray-400">
            Gestion professionnelle de tournois pour la communauté du padel
          </p>
        </div>
      </footer>
    </div>
  );
}

// Component for registrations table
function RegistrationsTable({ 
  confirmed, 
  waitlist, 
  tournament 
}: { 
  confirmed: AppTournamentRegistration[]; 
  waitlist: AppTournamentRegistration[]; 
  tournament: AppTournament;
}) {
  const calculateTeamWeight = (reg: AppTournamentRegistration): number => {
    const rank1 = reg.player1_ranking || 9999;
    const rank2 = reg.player2_ranking || 9999;
    return rank1 + rank2;
  };

  return (
    <div className="space-y-6">
      {/* Confirmed Registrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Inscrits ({confirmed.length}/{tournament.number_of_teams || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {confirmed.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aucune inscription confirmée</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Équipe</TableHead>
                  <TableHead>Joueur 1</TableHead>
                  <TableHead>Joueur 2</TableHead>
                  <TableHead className="text-right">Poids</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {confirmed.map((reg, index) => (
                  <TableRow key={reg.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {reg.player1_last_name} / {reg.player2_last_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{reg.player1_first_name} {reg.player1_last_name}</div>
                        <div className="text-sm text-gray-500">Licence: {reg.player1_license_number}</div>
                        {reg.player1_ranking && (
                          <Badge variant="outline" className="mt-1">R: {reg.player1_ranking}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{reg.player2_first_name} {reg.player2_last_name}</div>
                        <div className="text-sm text-gray-500">Licence: {reg.player2_license_number}</div>
                        {reg.player2_ranking && (
                          <Badge variant="outline" className="mt-1">R: {reg.player2_ranking}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {calculateTeamWeight(reg)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Waitlist */}
      {waitlist.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <List className="h-5 w-5 mr-2" />
              Liste d'attente ({waitlist.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Équipe</TableHead>
                  <TableHead>Joueur 1</TableHead>
                  <TableHead>Joueur 2</TableHead>
                  <TableHead className="text-right">Poids</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlist.map((reg, index) => (
                  <TableRow key={reg.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {reg.player1_last_name} / {reg.player2_last_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{reg.player1_first_name} {reg.player1_last_name}</div>
                        <div className="text-sm text-gray-500">Licence: {reg.player1_license_number}</div>
                        {reg.player1_ranking && (
                          <Badge variant="outline" className="mt-1">R: {reg.player1_ranking}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{reg.player2_first_name} {reg.player2_last_name}</div>
                        <div className="text-sm text-gray-500">Licence: {reg.player2_license_number}</div>
                        {reg.player2_ranking && (
                          <Badge variant="outline" className="mt-1">R: {reg.player2_ranking}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {calculateTeamWeight(reg)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Component for bracket viewer (read-only)
function BracketViewer({ 
  tournament, 
  teams, 
  matches 
}: { 
  tournament: AppTournament; 
  teams: UITeamWithPlayers[]; 
  matches: any[];
}) {
  if (!tournament.format_json) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-gray-500">Le format du tournoi n'est pas encore disponible</p>
        </CardContent>
      </Card>
    );
  }

  // Convert UITeamWithPlayers to TeamWithPlayers format expected by BracketFromJsonTemplate
  const teamsForBracket: TeamWithPlayers[] = teams.map(team => ({
    id: team.id,
    name: team.name,
    weight: team.weight,
    seed_number: team.seed_number,
    is_wo: team.is_wo,
    created_at: team.created_at,
    updated_at: team.updated_at,
    players: team.players.map(p => ({
      id: p.id,
      license_number: p.license_number,
      first_name: p.first_name,
      last_name: p.last_name,
      ranking: p.ranking || 0,
      email: undefined,
      phone: undefined,
      club: undefined,
      year_of_birth: p.year_of_birth ?? 0,
      date_of_birth: '',
      gender: p.gender, // Already 'Mr' | 'Mme'
      organizer_id: tournament.owner_id || '',
      owner_id: tournament.owner_id,
      created_at: p.created_at,
      updated_at: p.updated_at,
    })),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Déroulé du Tournoi</CardTitle>
      </CardHeader>
      <CardContent>
        <BracketFromJsonTemplate
          tournamentId={tournament.id}
          template={tournament.format_json}
          teams={teamsForBracket}
          randomAssignments={tournament.random_assignments || {}}
          onUpdateTemplate={() => {}} // Read-only, no update
          totalCourts={tournament.number_of_courts || 4}
        />
      </CardContent>
    </Card>
  );
}

// Component for standings table
function StandingsTable({ standings }: { standings: Array<{ team: UITeamWithPlayers; wins: number; losses: number; pointsFor: number; pointsAgainst: number; matchesPlayed: number }> }) {
  if (standings.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-gray-500">Aucun résultat disponible pour le moment</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Crown className="h-5 w-5 mr-2" />
          Classement Live
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Position</TableHead>
              <TableHead>Équipe</TableHead>
              <TableHead className="text-center">Matchs</TableHead>
              <TableHead className="text-center">Victoires</TableHead>
              <TableHead className="text-center">Défaites</TableHead>
              <TableHead className="text-center">Points Pour</TableHead>
              <TableHead className="text-center">Points Contre</TableHead>
              <TableHead className="text-center">Différence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((stat, index) => {
              const players = stat.team.players.map(p => p.last_name).join(' / ');
              const diff = stat.pointsFor - stat.pointsAgainst;
              return (
                <TableRow key={stat.team.id}>
                  <TableCell className="font-bold">
                    {index === 0 && <Crown className="h-4 w-4 inline mr-1 text-yellow-500" />}
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{players}</div>
                    {stat.team.seed_number && (
                      <Badge variant="outline" className="mt-1">TS{stat.team.seed_number}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{stat.matchesPlayed}</TableCell>
                  <TableCell className="text-center font-medium text-green-600">{stat.wins}</TableCell>
                  <TableCell className="text-center font-medium text-red-600">{stat.losses}</TableCell>
                  <TableCell className="text-center">{stat.pointsFor}</TableCell>
                  <TableCell className="text-center">{stat.pointsAgainst}</TableCell>
                  <TableCell className={`text-center font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {diff > 0 ? '+' : ''}{diff}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
