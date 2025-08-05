'use client';

import { useState, useEffect } from 'react';
import { storage, Player, Team, TeamWithPlayers, Tournament } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Plus, Edit, Trash2, Lock, Unlock, Award, User, Mail, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUserId } from '@/hooks/use-current-user';

// Demo user ID for testing
const DEMO_USER_ID = 'demo-user-123';

interface TournamentTeamsProps {
  tournament: Tournament;
  teams: TeamWithPlayers[];
  onTeamsUpdate: () => void;
}

export function TournamentTeams({ tournament, teams, onTeamsUpdate }: TournamentTeamsProps) {
  const { toast } = useToast();
  const currentUserId = useCurrentUserId();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false);
  const [showAddTeamDialog, setShowAddTeamDialog] = useState(false);
  const [newPlayerForm, setNewPlayerForm] = useState({
    first_name: '',
    last_name: '',
    license_number: '',
    ranking: '',
    email: '',
    phone: '',
  });
  const [newTeamForm, setNewTeamForm] = useState({
    player1: null as Player | null,
    player2: null as Player | null,
  });

  useEffect(() => {
    fetchPlayers();
  }, [currentUserId]);

  const fetchPlayers = () => {
    try {
      const userId = currentUserId || DEMO_USER_ID;
      const data = storage.players.getCurrentUserPlayers(userId);
      setPlayers(data);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const addPlayer = () => {
    if (!newPlayerForm.first_name || !newPlayerForm.last_name || 
        !newPlayerForm.license_number || !newPlayerForm.ranking) {
      toast({
        title: "Error",
        description: "Please fill in all required player fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const userId = currentUserId || DEMO_USER_ID;
      const player = storage.players.create({
        ...newPlayerForm,
        ranking: parseInt(newPlayerForm.ranking) || 0,
        organizer_id: userId,
        owner_id: userId, // Set owner_id for new players
        club: 'Club Padel', // Default club
        date_of_birth: new Date().toISOString().split('T')[0], // Default to today
        year_of_birth: new Date().getFullYear() - 25, // Default to 25 years old
        gender: 'Mr' as 'Mr' | 'Mme', // Default gender
      });

      setPlayers([...players, player]);
      setNewPlayerForm({
        first_name: '',
        last_name: '',
        license_number: '',
        ranking: '',
        email: '',
        phone: '',
      });

      toast({
        title: "Success",
        description: "Player added successfully!",
      });
    } catch (error) {
      console.error('Error adding player:', error);
      toast({
        title: "Error",
        description: "Failed to add player",
        variant: "destructive",
      });
    }
  };

  const addTeam = () => {
    if (!newTeamForm.player1 || !newTeamForm.player2) {
      toast({
        title: "Error",
        description: "Please select both players",
        variant: "destructive",
      });
      return;
    }

    if (newTeamForm.player1.id === newTeamForm.player2.id) {
      toast({
        title: "Error",
        description: "Please select two different players",
        variant: "destructive",
      });
      return;
    }

    // Check if players are already in other teams
    const existingPlayerIds = teams.flatMap(team => team.players.map(p => p.id));
    if (existingPlayerIds.includes(newTeamForm.player1.id) || existingPlayerIds.includes(newTeamForm.player2.id)) {
      toast({
        title: "Error",
        description: "One or both players are already in another team",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const weight = newTeamForm.player1.ranking + newTeamForm.player2.ranking;
      const teamName = `${newTeamForm.player1.last_name} - ${newTeamForm.player2.last_name}`;

      // Create team
      const team = storage.teams.create({
        name: teamName,
        weight,
      });

      // Link team to tournament
      storage.tournamentTeams.create(tournament.id, team.id);

      // Link players to team
      storage.teamPlayers.create(team.id, newTeamForm.player1.id);
      storage.teamPlayers.create(team.id, newTeamForm.player2.id);

      setNewTeamForm({
        player1: null,
        player2: null,
      });
      setShowAddTeamDialog(false);
      onTeamsUpdate();

      toast({
        title: "Success",
        description: "Team added successfully!",
      });
    } catch (error) {
      console.error('Error adding team:', error);
      toast({
        title: "Error",
        description: "Failed to add team",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeTeam = (teamId: string) => {
    try {
      storage.teams.delete(teamId);
      onTeamsUpdate();
      toast({
        title: "Success",
        description: "Team removed successfully!",
      });
    } catch (error) {
      console.error('Error removing team:', error);
      toast({
        title: "Error",
        description: "Failed to remove team",
        variant: "destructive",
      });
    }
  };

  const toggleTeamsLock = () => {
    if (!tournament.teams_locked && teams.length === 0) {
      toast({
        title: "Error",
        description: "Add teams before locking",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update seed numbers based on weight when locking
      if (!tournament.teams_locked) {
        const sortedTeams = [...teams].sort((a, b) => a.weight - b.weight);
        
        for (let i = 0; i < sortedTeams.length; i++) {
          storage.teams.update(sortedTeams[i].id, { seed_number: i + 1 });
        }
      } else {
        // When unlocking teams, reset format and delete matches
        storage.tournaments.update(tournament.id, { format_id: undefined });
        storage.matches.deleteByTournament(tournament.id);
        
        // Reset seed numbers
        for (const team of teams) {
          storage.teams.update(team.id, { seed_number: undefined });
        }
      }

      storage.tournaments.update(tournament.id, { 
        teams_locked: !tournament.teams_locked 
      });

      onTeamsUpdate();
      toast({
        title: "Success",
        description: tournament.teams_locked 
          ? "Teams unlocked! Format and matches have been reset." 
          : "Teams locked successfully!",
      });
    } catch (error) {
      console.error('Error toggling teams lock:', error);
      toast({
        title: "Error",
        description: "Failed to update teams lock",
        variant: "destructive",
      });
    }
  };

  const getAvailablePlayers = () => {
    const existingPlayerIds = teams.flatMap(team => team.players.map(p => p.id));
    return players.filter(player => !existingPlayerIds.includes(player.id));
  };

  const sortedTeams = [...teams].sort((a, b) => a.weight - b.weight);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Teams Management</h2>
          <p className="text-gray-600">Add and manage teams for this tournament</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={showAddTeamDialog} onOpenChange={setShowAddTeamDialog}>
            <DialogTrigger asChild>
              <Button disabled={tournament.teams_locked}>
                <Plus className="h-4 w-4 mr-2" />
                Add Team
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Team</DialogTitle>
                <DialogDescription>
                  Select two players to create a team. Team name will be generated automatically.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Player Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Player 1</Label>
                    <Select
                      value={newTeamForm.player1?.id || ''}
                      onValueChange={(value) => {
                        const player = getAvailablePlayers().find(p => p.id === value);
                        setNewTeamForm({ ...newTeamForm, player1: player || null });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select player 1" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailablePlayers().map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.first_name} {player.last_name} (R: {player.ranking})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Player 2</Label>
                    <Select
                      value={newTeamForm.player2?.id || ''}
                      onValueChange={(value) => {
                        const player = getAvailablePlayers().find(p => p.id === value);
                        setNewTeamForm({ ...newTeamForm, player2: player || null });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select player 2" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailablePlayers().map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.first_name} {player.last_name} (R: {player.ranking})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Team Preview */}
                {newTeamForm.player1 && newTeamForm.player2 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Team Preview</h4>
                    <p className="text-sm">
                      <strong>Team Name:</strong> {newTeamForm.player1.last_name} - {newTeamForm.player2.last_name}
                    </p>
                    <p className="text-sm">
                      <strong>Total Weight:</strong> {newTeamForm.player1.ranking + newTeamForm.player2.ranking}
                    </p>
                  </div>
                )}

                {/* Add New Player Section */}
                <div className="border-t pt-6">
                  <h4 className="text-lg font-medium mb-4">Or Add New Player</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>First Name *</Label>
                      <Input
                        placeholder="First name"
                        value={newPlayerForm.first_name}
                        onChange={(e) => setNewPlayerForm({ ...newPlayerForm, first_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Last Name *</Label>
                      <Input
                        placeholder="Last name"
                        value={newPlayerForm.last_name}
                        onChange={(e) => setNewPlayerForm({ ...newPlayerForm, last_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>License Number *</Label>
                      <Input
                        placeholder="License number"
                        value={newPlayerForm.license_number}
                        onChange={(e) => setNewPlayerForm({ ...newPlayerForm, license_number: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Ranking *</Label>
                      <Input
                        type="number"
                        placeholder="Ranking"
                        value={newPlayerForm.ranking}
                        onChange={(e) => setNewPlayerForm({ ...newPlayerForm, ranking: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="Email"
                        value={newPlayerForm.email}
                        onChange={(e) => setNewPlayerForm({ ...newPlayerForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        placeholder="Phone"
                        value={newPlayerForm.phone}
                        onChange={(e) => setNewPlayerForm({ ...newPlayerForm, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={addPlayer} variant="outline" className="mt-4">
                    Add Player to Database
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddTeamDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addTeam} disabled={loading}>
                    {loading ? 'Adding...' : 'Add Team'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button 
            variant={tournament.teams_locked ? "destructive" : "default"}
            onClick={toggleTeamsLock}
          >
            {tournament.teams_locked ? (
              <>
                <Unlock className="h-4 w-4 mr-2" />
                Unlock Teams
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Lock Teams
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Warning when unlocking */}
      {tournament.teams_locked && (tournament.format_id || teams.some(t => t.seed_number)) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-yellow-800">
              <Unlock className="h-5 w-5" />
              <div>
                <p className="font-medium">Warning: Unlocking teams will reset tournament progress</p>
                <p className="text-sm">This will delete all matches and reset the tournament format. Teams can be modified again.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teams Table */}
      {sortedTeams.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No teams yet</h3>
            <p className="text-gray-500 mb-6">
              Add teams to start building your tournament bracket
            </p>
            <Button disabled={tournament.teams_locked} onClick={() => setShowAddTeamDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Tournament Teams ({sortedTeams.length})</span>
              <Badge variant="outline">
                Sorted by Weight (Lowest to Highest)
              </Badge>
            </CardTitle>
            <CardDescription>
              Teams are automatically ranked by their combined player rankings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Player 1</TableHead>
                  <TableHead>Player 2</TableHead>
                  <TableHead className="text-center">Weight</TableHead>
                  {!tournament.teams_locked && (
                    <TableHead className="w-20 text-center">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTeams.map((team, index) => (
                  <TableRow key={team.id} className="hover:bg-gray-50">
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        TS{index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {team.name}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">
                          {team.players[0]?.first_name} {team.players[0]?.last_name}
                        </p>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>License: {team.players[0]?.license_number}</span>
                          <Badge variant="outline" className="text-xs">
                            R: {team.players[0]?.ranking}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">
                          {team.players[1]?.first_name} {team.players[1]?.last_name}
                        </p>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>License: {team.players[1]?.license_number}</span>
                          <Badge variant="outline" className="text-xs">
                            R: {team.players[1]?.ranking}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono text-lg">
                        {team.weight}
                      </Badge>
                    </TableCell>
                    {!tournament.teams_locked && (
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTeam(team.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
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