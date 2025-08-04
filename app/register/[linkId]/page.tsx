'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage, Tournament, RegistrationLink, Player } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, MapPin, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface RegisterPageProps {
  params: Promise<{ linkId: string }>;
}

export default function RegisterPage({ params }: RegisterPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [registrationLink, setRegistrationLink] = useState<RegistrationLink | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // Player 1
    player1_license_number: '',
    player1_first_name: '',
    player1_last_name: '',
    player1_ranking: 0,
    player1_email: '',
    player1_phone: '',
    player1_club: '',
    player1_year_of_birth: new Date().getFullYear() - 25,
    player1_gender: 'Mr' as 'Mr' | 'Mme',
    // Player 2
    player2_license_number: '',
    player2_first_name: '',
    player2_last_name: '',
    player2_ranking: 0,
    player2_email: '',
    player2_phone: '',
    player2_club: '',
    player2_year_of_birth: new Date().getFullYear() - 25,
    player2_gender: 'Mr' as 'Mr' | 'Mme',
  });

  // Next.js 15 migration: params is a Promise in React 19+
  // @ts-expect-error: params is a Promise in React 19, but a plain object in React 18
  const { linkId } = params;

  useEffect(() => {
    fetchRegistrationData();
  }, [linkId]);

  const fetchRegistrationData = () => {
    try {
      const link = storage.registrationLinks.getByLinkId(linkId);
      if (!link) {
        throw new Error('Registration link not found or inactive');
      }
      
      setRegistrationLink(link);
      
      const tournamentData = storage.tournaments.getById(link.tournament_id);
      if (!tournamentData) {
        throw new Error('Tournament not found');
      }
      
      if (!tournamentData.registration_enabled) {
        throw new Error('Registration is not enabled for this tournament');
      }
      
      setTournament(tournamentData);
    } catch (error) {
      console.error('Error fetching registration data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to check if license number is already used
  const isLicenseNumberUsed = (licenseNumber: string, excludePlayerId?: string): boolean => {
    const allPlayers = storage.players.getAll(tournament?.organizer_id || '');
    return allPlayers.some(player => 
      player.license_number === licenseNumber && 
      (!excludePlayerId || player.id !== excludePlayerId)
    );
  };

  // Function to validate license numbers
  const validateLicenseNumbers = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Check if license numbers are the same
    if (formData.player1_license_number === formData.player2_license_number) {
      errors.push('Both players cannot have the same license number');
    }
    
    // Check if license numbers are already used
    if (isLicenseNumberUsed(formData.player1_license_number)) {
      errors.push('Player 1 license number is already registered');
    }
    
    if (isLicenseNumberUsed(formData.player2_license_number)) {
      errors.push('Player 2 license number is already registered');
    }
    
    return { valid: errors.length === 0, errors };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (!tournament || !registrationLink) {
        throw new Error('Tournament or registration link not found');
      }

      // Validate license numbers
      const licenseValidation = validateLicenseNumbers();
      if (!licenseValidation.valid) {
        throw new Error(licenseValidation.errors.join(', '));
      }

      // Validate required fields
      const requiredFields = [
        'player1_license_number', 'player1_first_name', 'player1_last_name', 'player1_ranking', 'player1_club',
        'player2_license_number', 'player2_first_name', 'player2_last_name', 'player2_ranking', 'player2_club'
      ];
      
      for (const field of requiredFields) {
        if (!formData[field as keyof typeof formData]) {
          throw new Error(`Please fill in all required fields`);
        }
      }

      // Generate team name from player names
      const teamName = `${formData.player1_first_name} ${formData.player1_last_name} - ${formData.player2_first_name} ${formData.player2_last_name}`;

      // Create players
      const player1: Omit<Player, 'id' | 'created_at' | 'updated_at'> = {
        license_number: formData.player1_license_number,
        first_name: formData.player1_first_name,
        last_name: formData.player1_last_name,
        ranking: formData.player1_ranking,
        email: formData.player1_email || undefined,
        phone: formData.player1_phone || undefined,
        club: formData.player1_club,
        year_of_birth: formData.player1_year_of_birth,
        date_of_birth: new Date(formData.player1_year_of_birth, 0, 1).toISOString().split('T')[0],
        gender: formData.player1_gender,
        organizer_id: tournament.organizer_id,
        owner_id: tournament.organizer_id,
      };

      const player2: Omit<Player, 'id' | 'created_at' | 'updated_at'> = {
        license_number: formData.player2_license_number,
        first_name: formData.player2_first_name,
        last_name: formData.player2_last_name,
        ranking: formData.player2_ranking,
        email: formData.player2_email || undefined,
        phone: formData.player2_phone || undefined,
        club: formData.player2_club,
        year_of_birth: formData.player2_year_of_birth,
        date_of_birth: new Date(formData.player2_year_of_birth, 0, 1).toISOString().split('T')[0],
        gender: formData.player2_gender,
        organizer_id: tournament.organizer_id,
        owner_id: tournament.organizer_id,
      };

      // Create players
      const createdPlayer1 = storage.players.create(player1);
      const createdPlayer2 = storage.players.create(player2);

      // Create team
      const team = storage.teams.create({
        name: teamName,
        weight: createdPlayer1.ranking + createdPlayer2.ranking,
      });

      // Add team to tournament
      storage.tournamentTeams.create(tournament.id, team.id);

      // Add players to team
      storage.teamPlayers.create(team.id, createdPlayer1.id);
      storage.teamPlayers.create(team.id, createdPlayer2.id);

      toast({
        title: "Registration Successful!",
        description: `Team "${teamName}" has been registered for ${tournament.name}`,
      });

      // Redirect to tournament public page
      router.push(`/public/${tournament.public_id}`);
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "An error occurred during registration",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tournament || !registrationLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Link Invalid</h2>
          <p className="text-gray-600">This registration link is not valid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <Trophy className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tournament Registration</h1>
              <p className="text-gray-600 mt-1">Register your team for {tournament.name}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Tournament Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Tournament Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{tournament.name}</h3>
                  <div className="space-y-2 text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {format(new Date(tournament.date), 'PPP')}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      {tournament.start_time}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      {tournament.location}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className={getLevelColor(tournament.level)}>
                      {tournament.level}
                    </Badge>
                    <Badge className={getTypeColor(tournament.type)}>
                      {tournament.type}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center mb-1">
                      <Users className="h-4 w-4 mr-2" />
                      {tournament.number_of_courts} courts • {tournament.conditions}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Registration Form */}
          <Card>
            <CardHeader>
              <CardTitle>Team Registration</CardTitle>
              <CardDescription>
                Fill in the information for both players in your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Player 1 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Player 1</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="player1_gender">Gender *</Label>
                      <select
                        id="player1_gender"
                        value={formData.player1_gender}
                        onChange={(e) => setFormData({ ...formData, player1_gender: e.target.value as 'Mr' | 'Mme' })}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full"
                        required
                      >
                        <option value="Mr">Mr</option>
                        <option value="Mme">Mme</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player1_first_name">First Name *</Label>
                      <Input
                        id="player1_first_name"
                        value={formData.player1_first_name}
                        onChange={(e) => setFormData({ ...formData, player1_first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player1_last_name">Last Name *</Label>
                      <Input
                        id="player1_last_name"
                        value={formData.player1_last_name}
                        onChange={(e) => setFormData({ ...formData, player1_last_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player1_license_number">License Number *</Label>
                      <Input
                        id="player1_license_number"
                        value={formData.player1_license_number}
                        onChange={(e) => setFormData({ ...formData, player1_license_number: e.target.value })}
                        placeholder="7-8 characters"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player1_ranking">Ranking *</Label>
                      <Input
                        id="player1_ranking"
                        type="number"
                        value={formData.player1_ranking}
                        onChange={(e) => setFormData({ ...formData, player1_ranking: parseInt(e.target.value) || 0 })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player1_club">Club *</Label>
                      <Input
                        id="player1_club"
                        value={formData.player1_club}
                        onChange={(e) => setFormData({ ...formData, player1_club: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player1_year_of_birth">Year of Birth *</Label>
                      <Input
                        id="player1_year_of_birth"
                        type="number"
                        min={new Date().getFullYear() - 100}
                        max={new Date().getFullYear() - 1}
                        value={formData.player1_year_of_birth}
                        onChange={(e) => setFormData({ ...formData, player1_year_of_birth: parseInt(e.target.value) || new Date().getFullYear() - 25 })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player1_email">Email</Label>
                      <Input
                        id="player1_email"
                        type="email"
                        value={formData.player1_email}
                        onChange={(e) => setFormData({ ...formData, player1_email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player1_phone">Phone</Label>
                      <Input
                        id="player1_phone"
                        type="tel"
                        value={formData.player1_phone}
                        onChange={(e) => setFormData({ ...formData, player1_phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Player 2 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Player 2</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="player2_gender">Gender *</Label>
                      <select
                        id="player2_gender"
                        value={formData.player2_gender}
                        onChange={(e) => setFormData({ ...formData, player2_gender: e.target.value as 'Mr' | 'Mme' })}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full"
                        required
                      >
                        <option value="Mr">Mr</option>
                        <option value="Mme">Mme</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player2_first_name">First Name *</Label>
                      <Input
                        id="player2_first_name"
                        value={formData.player2_first_name}
                        onChange={(e) => setFormData({ ...formData, player2_first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player2_last_name">Last Name *</Label>
                      <Input
                        id="player2_last_name"
                        value={formData.player2_last_name}
                        onChange={(e) => setFormData({ ...formData, player2_last_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player2_license_number">License Number *</Label>
                      <Input
                        id="player2_license_number"
                        value={formData.player2_license_number}
                        onChange={(e) => setFormData({ ...formData, player2_license_number: e.target.value })}
                        placeholder="7-8 characters"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player2_ranking">Ranking *</Label>
                      <Input
                        id="player2_ranking"
                        type="number"
                        value={formData.player2_ranking}
                        onChange={(e) => setFormData({ ...formData, player2_ranking: parseInt(e.target.value) || 0 })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player2_club">Club *</Label>
                      <Input
                        id="player2_club"
                        value={formData.player2_club}
                        onChange={(e) => setFormData({ ...formData, player2_club: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player2_year_of_birth">Year of Birth *</Label>
                      <Input
                        id="player2_year_of_birth"
                        type="number"
                        min={new Date().getFullYear() - 100}
                        max={new Date().getFullYear() - 1}
                        value={formData.player2_year_of_birth}
                        onChange={(e) => setFormData({ ...formData, player2_year_of_birth: parseInt(e.target.value) || new Date().getFullYear() - 25 })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player2_email">Email</Label>
                      <Input
                        id="player2_email"
                        type="email"
                        value={formData.player2_email}
                        onChange={(e) => setFormData({ ...formData, player2_email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player2_phone">Phone</Label>
                      <Input
                        id="player2_phone"
                        type="tel"
                        value={formData.player2_phone}
                        onChange={(e) => setFormData({ ...formData, player2_phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/public/${tournament.public_id}`)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Registering...' : 'Register Team'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 