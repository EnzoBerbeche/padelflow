'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage, Tournament, RegistrationLink } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, MapPin, Clock, Users, CheckCircle, AlertCircle, Search, Mail, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { nationalPlayersAPI, SupabaseNationalPlayer } from '@/lib/supabase';
import { use } from 'react';
import { createConfirmationEmailHtml, createConfirmationEmailSubject } from '@/lib/email-templates';

interface RegisterPageProps {
  params: Promise<{ linkId: string }>;
}

export default function RegisterPage({ params }: RegisterPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrationLink, setRegistrationLink] = useState<RegistrationLink | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<SupabaseNationalPlayer[]>([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SupabaseNationalPlayer[]>([]);
  const [searching, setSearching] = useState(false);
  const [email, setEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  const { linkId } = use(params); // Next.js 15 migration

  useEffect(() => {
    fetchTournament();
  }, [linkId]);

  const fetchTournament = async () => {
    try {
      setLoading(true);
      
      // Get registration link
      const link = storage.registrationLinks.getByLinkId(linkId);
      if (!link) {
        toast({
          title: "Invalid Link",
          description: "This registration link is invalid or has expired.",
          variant: "destructive",
        });
        router.push('/');
        return;
      }
      setRegistrationLink(link);

      // Get tournament
      const tournamentData = storage.tournaments.getById(link.tournament_id);
      if (!tournamentData) {
        toast({
          title: "Tournament Not Found",
          description: "The tournament for this registration link could not be found.",
          variant: "destructive",
        });
        router.push('/');
        return;
      }
      setTournament(tournamentData);
    } catch (error) {
      console.error('Error fetching tournament:', error);
      toast({
        title: "Error",
        description: "Failed to load tournament information.",
        variant: "destructive",
      });
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const searchPlayers = async () => {
    if (!playerSearch.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await nationalPlayersAPI.search(playerSearch, {
        gender: tournament?.type === 'Men' ? 'men' : tournament?.type === 'Women' ? 'women' : undefined
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching players:', error);
      toast({
        title: "Search Error",
        description: "Failed to search for players. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const addPlayer = (player: SupabaseNationalPlayer) => {
    // Check if already selected
    if (selectedPlayers.find(p => p.license_number === player.license_number)) {
      toast({
        title: "Player Already Selected",
        description: "This player is already in your team.",
        variant: "destructive",
      });
      return;
    }

    // Check if player is already registered in this tournament
    if (tournament) {
      const tournamentTeams = storage.tournamentTeams.getByTournament(tournament.id);
      const allTeamsWithPlayers = tournamentTeams.map((team: any) => ({
        ...team,
        players: storage.teamPlayers.getByTeam(team.team_id).map((teamPlayer: any) => {
          const allPlayers = storage.players.getAll('');
          return allPlayers.find((p: any) => p.id === teamPlayer.player_id);
        }).filter(Boolean)
      }));

      const isAlreadyRegistered = allTeamsWithPlayers.some((team: any) =>
        team.players.some((tournamentPlayer: any) => tournamentPlayer.license_number === player.license_number)
      );

      if (isAlreadyRegistered) {
        toast({
          title: "Player Already Registered",
          description: `${player.first_name} ${player.last_name} is already registered in this tournament.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Check if team is full (max 2 players)
    if (selectedPlayers.length >= 2) {
      toast({
        title: "Team Full",
        description: "You can only select 2 players for a team.",
        variant: "destructive",
      });
      return;
    }

    // Validate gender if tournament has gender restriction
    if (tournament?.type === 'Men' && player.gender !== 'men') {
      toast({
        title: "Gender Mismatch",
        description: "This tournament is for men only.",
        variant: "destructive",
      });
      return;
    }

    if (tournament?.type === 'Women' && player.gender !== 'women') {
      toast({
        title: "Gender Mismatch",
        description: "This tournament is for women only.",
        variant: "destructive",
      });
      return;
    }

    setSelectedPlayers([...selectedPlayers, player]);
    setPlayerSearch('');
    setSearchResults([]);
  };

  const removePlayer = (licenseNumber: string) => {
    setSelectedPlayers(selectedPlayers.filter(p => p.license_number !== licenseNumber));
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!tournament || !registrationLink) {
        toast({
          title: "Error",
          description: "Tournament or registration link not found.",
          variant: "destructive",
        });
        return;
      }

      const pendingRegistration = storage.pendingRegistrations.create({
        tournament_id: tournament.id,
        registration_link_id: registrationLink.id,
        email: email,
        players: selectedPlayers.map(player => ({
          license_number: player.license_number,
          first_name: player.first_name,
          last_name: player.last_name,
          ranking: player.ranking,
          club: player.club,
          gender: player.gender,
        })),
        confirmation_token: '',
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      });

      const confirmationToken = storage.confirmationTokens.create(pendingRegistration.id);
      storage.pendingRegistrations.update(pendingRegistration.id, {
        confirmation_token: confirmationToken.token,
      });

      const confirmationUrl = `${window.location.origin}/confirm/${confirmationToken.token}`;
      
      // Send confirmation email
      const playerNames = selectedPlayers.map(player => `${player.first_name} ${player.last_name}`);
      const emailHtml = createConfirmationEmailHtml(tournament.name, playerNames, confirmationUrl);
      const emailSubject = createConfirmationEmailSubject(tournament.name);

      const emailResponse = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: emailSubject,
          html: emailHtml,
          confirmationUrl: confirmationUrl,
        }),
      });

      if (!emailResponse.ok) {
        throw new Error('Failed to send email');
      }

      const emailResult = await emailResponse.json();

      toast({
        title: "Confirmation Email Sent!",
        description: "Please check your email and click the confirmation link within 1 hour.",
      });
      setSelectedPlayers([]);
      setEmail('');
      setShowEmailForm(false);
    } catch (error) {
      console.error('Error submitting registration:', error);
      toast({
        title: "Error",
        description: "Failed to submit registration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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
          <p className="text-gray-600">Loading tournament information...</p>
        </div>
      </div>
    );
  }

  if (!tournament || !registrationLink) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Invalid Registration Link</CardTitle>
            <CardDescription className="text-center">
              This registration link is invalid or has expired.
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
        {/* Tournament Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="h-8 w-8 text-orange-500" />
              <div>
                <CardTitle className="text-2xl">{tournament.name}</CardTitle>
                <CardDescription>Tournament Registration</CardDescription>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {format(new Date(tournament.date), 'PPP')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{tournament.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{tournament.start_time}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{tournament.number_of_teams} teams</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4">
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
          </CardHeader>
        </Card>

        {/* Registration Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Player Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Select Players
              </CardTitle>
              <CardDescription>
                Search and select 2 players for your team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="player-search">Search Players</Label>
                <div className="flex gap-2">
                  <Input
                    id="player-search"
                    placeholder="Search by name, license number, or club..."
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchPlayers()}
                  />
                  <Button 
                    onClick={searchPlayers} 
                    disabled={searching || !playerSearch.trim()}
                    size="sm"
                  >
                    {searching ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <Label>Search Results</Label>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {searchResults.map((player) => (
                      <div
                        key={player.license_number}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => addPlayer(player)}
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
                </div>
              )}

              {/* Selected Players */}
              {selectedPlayers.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Players ({selectedPlayers.length}/2)</Label>
                  <div className="space-y-2">
                    {selectedPlayers.map((player) => (
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removePlayer(player.license_number)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Form */}
              {selectedPlayers.length === 2 && !showEmailForm && (
                <Button 
                  onClick={() => setShowEmailForm(true)}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Continue to Email
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Email Confirmation */}
          {showEmailForm && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Confirmation
                </CardTitle>
                <CardDescription>
                  Enter your email to receive a confirmation link
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  {/* Selected Players Summary */}
                  <div className="space-y-2">
                    <Label>Team Summary</Label>
                    <div className="space-y-2">
                      {selectedPlayers.map((player) => (
                        <div
                          key={player.license_number}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <span className="text-sm">
                            {player.first_name} {player.last_name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {player.gender}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowEmailForm(false)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting || !email.trim()}
                      className="flex-1"
                    >
                      {submitting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Send Confirmation
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {!showEmailForm && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  How to Register
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      1
                    </div>
                    <div>
                      <div className="font-medium">Search for Players</div>
                      <div className="text-sm text-gray-600">
                        Use the search box to find players by name, license number, or club.
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <div>
                      <div className="font-medium">Select Your Team</div>
                      <div className="text-sm text-gray-600">
                        Click on players to add them to your team. You need exactly 2 players.
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <div>
                      <div className="font-medium">Confirm Registration</div>
                      <div className="text-sm text-gray-600">
                        Enter your email to receive a confirmation link. You'll have 1 hour to confirm.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 