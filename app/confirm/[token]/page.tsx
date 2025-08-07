'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage, PendingRegistration } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, MapPin, Clock, Users, CheckCircle, AlertCircle, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { use } from 'react';

interface ConfirmPageProps {
  params: Promise<{ token: string }>;
}

export default function ConfirmPage({ params }: ConfirmPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState<PendingRegistration | null>(null);
  const [tournament, setTournament] = useState<any>(null); // Tournament type is any for now

  const { token } = use(params); // Next.js 15 migration

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      setLoading(true);
      
      // Verify the token
      const isValid = storage.confirmationTokens.verify(token);
      if (!isValid) {
        toast({
          title: "Invalid or Expired Link",
          description: "This confirmation link is invalid or has expired.",
          variant: "destructive",
        });
        router.push('/');
        return;
      }

      // Get all pending registrations directly from localStorage
      const allPendingRegistrations = JSON.parse(localStorage.getItem('padelflow_pending_registrations') || '[]');
      console.log('All pending registrations from localStorage:', allPendingRegistrations);
      
      const pendingReg = allPendingRegistrations.find((pr: any) => pr.confirmation_token === token);
      
      if (!pendingReg) {
        console.error('Pending registration not found for token:', token);
        console.log('Searching for token:', token);
        console.log('All pending registrations:', allPendingRegistrations);
        toast({
          title: "Registration Not Found",
          description: "The registration could not be found.",
          variant: "destructive",
        });
        router.push('/');
        return;
      }

      setPendingRegistration(pendingReg);

      // Get the tournament directly from localStorage
      const allTournaments = JSON.parse(localStorage.getItem('padelflow_tournaments') || '[]');
      const tournamentData = allTournaments.find((t: any) => t.id === pendingReg.tournament_id);
      
      if (!tournamentData) {
        toast({
          title: "Tournament Not Found",
          description: "The tournament could not be found.",
          variant: "destructive",
        });
        router.push('/');
        return;
      }

      setTournament(tournamentData);
    } catch (error) {
      console.error('Error verifying token:', error);
      toast({
        title: "Error",
        description: "Failed to verify the confirmation link.",
        variant: "destructive",
      });
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async () => {
    if (!pendingRegistration || !tournament) return;
    
    setProcessing(true);
    try {
      // Get all teams in this tournament
      const tournamentTeams = storage.tournamentTeams.getByTournament(tournament.id);
      const allTeamsWithPlayers = tournamentTeams.map((team: any) => ({
        ...team,
        players: storage.teamPlayers.getByTeam(team.team_id).map((teamPlayer: any) => {
          const allPlayers = storage.players.getAll('');
          return allPlayers.find((p: any) => p.id === teamPlayer.player_id);
        }).filter(Boolean)
      }));

      // Check if any player is already registered in this tournament
      const alreadyRegisteredPlayers = [];
      for (const playerData of pendingRegistration.players) {
        const isAlreadyRegistered = allTeamsWithPlayers.some((team: any) =>
          team.players.some((player: any) => player.license_number === playerData.license_number)
        );
        
        if (isAlreadyRegistered) {
          alreadyRegisteredPlayers.push(playerData);
        }
      }

      if (alreadyRegisteredPlayers.length > 0) {
        const playerNames = alreadyRegisteredPlayers.map(p => `${p.first_name} ${p.last_name}`).join(', ');
        toast({
          title: "Players Already Registered",
          description: `${playerNames} is/are already registered in this tournament.`,
          variant: "destructive",
        });
        return;
      }

      // Create players (they don't exist or aren't in this tournament)
      const createdPlayers = pendingRegistration.players.map(playerData => {
        // Try to create the player first
        try {
          console.log('Attempting to create player:', playerData);
          return storage.players.create({
            license_number: playerData.license_number,
            first_name: playerData.first_name,
            last_name: playerData.last_name,
            ranking: playerData.ranking,
            club: playerData.club,
            year_of_birth: 1990, // Default value
            date_of_birth: new Date(1990, 0, 1).toISOString().split('T')[0], // Default date
            gender: playerData.gender === 'men' ? 'Mr' : 'Mme',
            organizer_id: 'registration-system',
            email: pendingRegistration.email,
          });
        } catch (error) {
          // If player creation fails (already exists), find the existing player
          console.log('Player creation failed, finding existing player:', error);
          const allPlayers = storage.players.getAll('');
          const existingPlayer = allPlayers.find(p => p.license_number === playerData.license_number);
          if (existingPlayer) {
            console.log('Found existing player:', existingPlayer);
            return existingPlayer;
          }
          // If still not found, re-throw the error
          throw error;
        }
      });

      // Create team
      const teamName = `${createdPlayers[0].first_name} ${createdPlayers[0].last_name} & ${createdPlayers[1].first_name} ${createdPlayers[1].last_name}`;
      const team = storage.teams.create({
        name: teamName,
        weight: 0,
      });

      // Link team to tournament
      storage.tournamentTeams.create(tournament.id, team.id);

      // Link players to team
      createdPlayers.forEach(player => {
        storage.teamPlayers.create(team.id, player.id);
      });

      // Delete pending registration
      storage.pendingRegistrations.delete(pendingRegistration.id);

      toast({
        title: "Registration Confirmed!",
        description: "Your team has been successfully registered for the tournament.",
      });

      router.push(`/public/${tournament.public_id}`);
    } catch (error) {
      console.error('Error completing registration:', error);
      
      // Check if it's a "player already exists" error
      if (error instanceof Error && error.message.includes('already exists')) {
        const licenseNumber = error.message.match(/license number (\d+)/)?.[1];
        toast({
          title: "Joueur déjà inscrit",
          description: `Le joueur avec le numéro de licence ${licenseNumber} est déjà inscrit dans ce tournoi.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Échec de l'inscription. Veuillez réessayer.",
          variant: "destructive",
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'P25': return 'bg-green-100 text-green-800';
      case 'P100': return 'bg-blue-100 text-blue-800';
      case 'P250': return 'bg-yellow-100 text-yellow-800';
      case 'P500': return 'bg-orange-100 text-orange-800';
      case 'P1000': return 'bg-red-100 text-red-800';
      case 'P1500': return 'bg-purple-100 text-purple-800';
      case 'P2000': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Men': return 'bg-blue-100 text-blue-800';
      case 'Women': return 'bg-pink-100 text-pink-800';
      case 'Mixed': return 'bg-purple-100 text-purple-800';
      case 'All': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying confirmation link...</p>
        </div>
      </div>
    );
  }

  if (!pendingRegistration || !tournament) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Invalid Confirmation Link</CardTitle>
            <CardDescription className="text-center">
              This confirmation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <CardTitle className="text-2xl">Registration Confirmation</CardTitle>
                <CardDescription>Confirm your team registration</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tournament Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-orange-500" />
                Tournament Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">{tournament.name}</h3>
                <div className="space-y-2 text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(tournament.date), 'PPP')}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {tournament.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {tournament.start_time}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {tournament.number_of_teams} teams
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge className={getLevelColor(tournament.level)}>
                  {tournament.level}
                </Badge>
                <Badge className={getTypeColor(tournament.type)}>
                  {tournament.type}
                </Badge>
                <Badge variant="outline">
                  {tournament.conditions}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Team Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-500" />
                Your Team
              </CardTitle>
              <CardDescription>
                Confirm your team registration details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Players */}
              <div className="space-y-3">
                <h4 className="font-medium">Players</h4>
                {pendingRegistration.players.map((player, index) => (
                  <div
                    key={player.license_number}
                    className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div>
                      <div className="font-medium">
                        {player.first_name} {player.last_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {player.license_number} • {player.club} • Ranking: {player.ranking}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {player.gender}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <h4 className="font-medium">Contact Email</h4>
                <div className="p-3 bg-gray-50 border rounded-lg">
                  <span className="text-sm">{pendingRegistration.email}</span>
                </div>
              </div>

              {/* Confirmation Button */}
              <Button
                onClick={completeRegistration}
                disabled={processing}
                className="w-full"
              >
                {processing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Confirm Registration
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              What Happens Next?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <div className="font-medium">Team Created</div>
                  <div className="text-sm text-gray-600">
                    Your team will be created and added to the tournament.
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <div className="font-medium">Tournament Access</div>
                  <div className="text-sm text-gray-600">
                    You'll be redirected to the tournament page to view your registration.
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <div className="font-medium">Tournament Updates</div>
                  <div className="text-sm text-gray-600">
                    Check the tournament page regularly for updates and match schedules.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 