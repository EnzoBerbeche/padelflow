'use client';

import { useState, useEffect } from 'react';
import { storage, Player, TeamWithPlayers } from '@/lib/storage';
import { tournamentTeamsAPI, playersAPI, tournamentsAPI, tournamentMatchesAPI } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Plus, Edit, Trash2, Lock, Unlock, Award, User, Mail, Phone, X, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUserId } from '@/hooks/use-current-user';




interface UITournament {
  id: string;
  teams_locked: boolean;
  number_of_teams: number;
  format_id?: string;
  type: 'All' | 'Men' | 'Women' | 'Mixed';
}

interface TournamentTeamsProps {
  tournament: UITournament;
  teams: TeamWithPlayers[];
  onTeamsUpdate: () => void;
}

export function TournamentTeams({ tournament, teams, onTeamsUpdate }: TournamentTeamsProps) {
  const { toast } = useToast();
  const currentUserId = useCurrentUserId();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<'name' | 'license' | 'ranking' | 'gender'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchPlayers();
  }, [currentUserId]);

  const fetchPlayers = async () => {
    try {
      // Pull the user's players from Supabase (enriched view) and map to UI Player shape
      const enriched = await playersAPI.getMyPlayersEnriched();
      const mapped: Player[] = (enriched || []).map((r) => {
        const fullName = (r.nom || '').trim();
        let firstName = '';
        let lastName = '';
        if (fullName) {
          const parts = fullName.split(/\s+/);
          if (parts.length === 1) {
            lastName = parts[0];
          } else {
            lastName = parts.pop() as string;
            firstName = parts.join(' ');
          }
        }

        return {
          id: r.player_id,
          license_number: r.licence,
          first_name: firstName,
          last_name: lastName,
          ranking: r.rang ?? 9999,
          email: undefined,
          phone: undefined,
          year_of_birth: r.annee_naissance || 0,
          date_of_birth: '',
          gender: r.genre === 'Homme' ? 'Mr' : 'Mme',
          organizer_id: '',
          owner_id: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Player;
      });
      setPlayers(mapped);
    } catch (error) {
      console.error('Error fetching players from Supabase:', error);
      setPlayers([]);
    }
  };

  const addSelectedTeam = async () => {
    if (selectedPlayers.length !== 2) {
      toast({
        title: "Error",
        description: "Please select exactly 2 players",
        variant: "destructive",
      });
      return;
    }

    // Check if we've reached the team limit
    if (teams.length >= tournament.number_of_teams) {
      toast({
        title: "Error",
        description: `Cannot add more teams. Tournament limit is ${tournament.number_of_teams} teams.`,
        variant: "destructive",
      });
      return;
    }

    const player1 = players.find(p => p.id === selectedPlayers[0]);
    const player2 = players.find(p => p.id === selectedPlayers[1]);

    if (!player1 || !player2) {
      toast({
        title: "Error",
        description: "Selected players not found",
        variant: "destructive",
      });
      return;
    }

    // Check if players are already in other teams
    const existingPlayerIds = teams.flatMap(team => team.players.map(p => p.id));
    if (existingPlayerIds.includes(player1.id) || existingPlayerIds.includes(player2.id)) {
      toast({
        title: "Error",
        description: "One or both players are already in another team",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const newTeam = await tournamentTeamsAPI.createWithTwoPlayersFromLocal(
        tournament.id,
        player1,
        player2
      );
      if (!newTeam) throw new Error('Team creation failed');

      // Clear selection and refresh
      setSelectedPlayers([]);
      onTeamsUpdate();

      toast({
        title: "Success",
        description: "Team added successfully! You can continue adding more teams.",
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

  const removeTeam = async (teamId: string) => {
    try {
      const res = await tournamentTeamsAPI.deleteTeam(teamId);
      if (!res.ok) throw new Error(res.error || 'Delete failed');
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

  const toggleTeamsLock = async () => {
    if (!tournament.teams_locked && teams.length === 0) {
      toast({
        title: "Error",
        description: "Add teams before locking",
        variant: "destructive",
      });
      return;
    }

    try {
      const nextLocked = !tournament.teams_locked;

      // Update seed numbers based on weight when locking
      if (nextLocked) {
        const sortedTeams = [...teams].sort((a, b) => a.weight - b.weight);
        for (let i = 0; i < sortedTeams.length; i++) {
          await tournamentTeamsAPI.updateTeam(sortedTeams[i].id, { seed_number: i + 1 });
        }
      } else {
        // When unlocking teams, reset format and delete matches in Supabase
        await tournamentsAPI.update(tournament.id, { 
          teams_locked: nextLocked, 
          format_id: undefined, 
          format_json: undefined, 
          random_assignments: undefined, 
          bracket: undefined as any,
        });
        // Reset seed numbers in Supabase
        for (const team of teams) {
          await tournamentTeamsAPI.updateTeam(team.id, { seed_number: null });
        }
        // Clear matches in Supabase
        await tournamentMatchesAPI.deleteByTournament(tournament.id);
      }

      // Persist teams_locked on tournament when locking
      if (nextLocked) {
        await tournamentsAPI.update(tournament.id, { teams_locked: nextLocked });
      }

      onTeamsUpdate();
      toast({
        title: "Success",
        description: nextLocked
          ? "Teams locked!"
          : "Teams unlocked! Format and matches have been reset.",
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
    // Do not allow selecting a player already assigned to any team in this tournament
    const assignedLicences = new Set<string>(
      teams.flatMap(team => team.players.map(p => p.license_number))
    );

    // Filter players based on tournament type and remove already assigned ones
    let filteredPlayers = players.filter(player => !assignedLicences.has(player.license_number));
    
    // Apply gender filter based on tournament type
    switch (tournament.type) {
      case 'Men':
        filteredPlayers = filteredPlayers.filter(player => player.gender === 'Mr');
        break;
      case 'Women':
        filteredPlayers = filteredPlayers.filter(player => player.gender === 'Mme');
        break;
      case 'Mixed':
        // For mixed tournaments, allow both genders
        break;
      case 'All':
        // For 'All' tournaments, allow both genders
        break;
      default:
        // Default to allowing all players
        break;
    }
    
    return filteredPlayers;
  };

  const getFilteredPlayers = () => {
    const availablePlayers = getAvailablePlayers();
    if (!playerSearch.trim()) return availablePlayers;
    
    const searchLower = playerSearch.toLowerCase();
    return availablePlayers.filter(player => 
      (player.first_name?.toLowerCase() || '').includes(searchLower) ||
      (player.last_name?.toLowerCase() || '').includes(searchLower) ||
      (player.license_number?.toLowerCase() || '').includes(searchLower)
    );
  };

  const formatPlayerName = (firstName: string, lastName: string) => {
    const formattedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    const formattedLastName = lastName.toUpperCase();
    return `${formattedFirstName} ${formattedLastName}`;
  };

  const handleSort = (column: 'name' | 'license' | 'ranking' | 'gender') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedPlayers = (players: Player[]) => {
    return [...players].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case 'name':
          aValue = `${a.last_name} ${a.first_name}`.toLowerCase();
          bValue = `${b.last_name} ${b.first_name}`.toLowerCase();
          break;
        case 'license':
          aValue = a.license_number.toLowerCase();
          bValue = b.license_number.toLowerCase();
          break;
        case 'ranking':
          aValue = a.ranking;
          bValue = b.ranking;
          break;
        case 'gender':
          aValue = a.gender.toLowerCase();
          bValue = b.gender.toLowerCase();
          break;
        default:
          aValue = `${a.last_name} ${a.first_name}`.toLowerCase();
          bValue = `${b.last_name} ${b.first_name}`.toLowerCase();
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (sortDirection === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      } else {
        if (sortDirection === 'asc') {
          return (aValue as number) - (bValue as number);
        } else {
          return (bValue as number) - (aValue as number);
        }
      }
    });
  };

  const handlePlayerSelection = (playerId: string, checked: boolean) => {
    if (checked) {
      if (selectedPlayers.length >= 2) {
        toast({
          title: "Error",
          description: "You can only select 2 players at a time",
          variant: "destructive",
        });
        return;
      }
      setSelectedPlayers([...selectedPlayers, playerId]);
    } else {
      setSelectedPlayers(selectedPlayers.filter(id => id !== playerId));
    }
  };

  const sortedTeams = [...teams].sort((a, b) => a.weight - b.weight);
  const filteredPlayers = getSortedPlayers(getFilteredPlayers());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-semibold">Teams Management</h2>
          <p className="text-gray-600">
            Add and manage teams for this tournament 
            <span className="ml-2 font-medium text-blue-600">
              ({teams.length}/{tournament.number_of_teams} teams)
            </span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          {!tournament.teams_locked && (
            <Button 
              onClick={() => {
                setShowPlayerSelection(!showPlayerSelection);
                if (!showPlayerSelection) {
                  setSelectedPlayers([]);
                  setPlayerSearch('');
                }
              }}
              variant={showPlayerSelection ? "outline" : "default"}
              disabled={teams.length >= tournament.number_of_teams}
            >
              <Plus className="h-4 w-4 mr-2" />
              {showPlayerSelection ? "Close Selection" : "Add Teams"}
            </Button>
          )}
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

      {/* Player Selection Table */}
      {showPlayerSelection && !tournament.teams_locked && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">Select Players for Team</CardTitle>
            <CardDescription>
              Search and select exactly 2 players to create a team. You can add multiple teams without leaving this page.
            </CardDescription>
            {teams.length >= tournament.number_of_teams && (
              <div className="mt-2 px-3 py-2 rounded-md bg-orange-100 border border-orange-300 text-orange-800 text-sm w-fit">
                Team limit reached ({tournament.number_of_teams} teams)
              </div>
            )}
          </CardHeader>
          <CardContent>
            {/* Team Limit Warning inside card header now; keep spacing here */}
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search players by name, license, or club..."
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Selection Status */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Badge variant={selectedPlayers.length === 2 ? "default" : "secondary"}>
                  {selectedPlayers.length}/2 players selected
                </Badge>
                {selectedPlayers.length === 2 && (
                  <Button 
                    onClick={addSelectedTeam} 
                    disabled={loading}
                    size="sm"
                  >
                    {loading ? "Adding..." : "Add Team"}
                  </Button>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {filteredPlayers.length} players available
                {tournament.type !== 'Mixed' && tournament.type !== 'All' && (
                  <span className="text-blue-600 ml-1">
                    (filtered for {tournament.type})
                  </span>
                )}
              </div>
            </div>

            {/* Players Table */}
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Name</span>
                          {sortColumn === 'name' && (
                            <span className="text-xs">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('license')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>License</span>
                          {sortColumn === 'license' && (
                            <span className="text-xs">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-center cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('ranking')}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>Ranking</span>
                          {sortColumn === 'ranking' && (
                            <span className="text-xs">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-center cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('gender')}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>Gender</span>
                          {sortColumn === 'gender' && (
                            <span className="text-xs">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlayers.map((player) => {
                      const isSelected = selectedPlayers.includes(player.id);
                      return (
                        <TableRow 
                          key={player.id} 
                          className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                          onClick={() => handlePlayerSelection(player.id, !isSelected)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              {isSelected && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              )}
                              <span className={isSelected ? 'font-semibold text-blue-700' : ''}>
                                {formatPlayerName(player.first_name, player.last_name)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {player.license_number}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-mono">
                              {player.ranking}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {player.gender}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredPlayers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          No players found matching your search
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-2 p-2">
                {filteredPlayers.map((player) => {
                  const isSelected = selectedPlayers.includes(player.id);
                  return (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-200 shadow-sm' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => handlePlayerSelection(player.id, !isSelected)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {isSelected && (
                              <div className="w-3 h-3 bg-blue-600 rounded-full flex-shrink-0"></div>
                            )}
                            <h3 className={`font-semibold text-base ${
                              isSelected ? 'text-blue-700' : 'text-gray-900'
                            }`}>
                              {formatPlayerName(player.first_name, player.last_name)}
                            </h3>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">License:</span>
                              <span className="text-sm font-mono text-gray-800">
                                {player.license_number}
                              </span>
                            </div>
                            
                            {player.club && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Club:</span>
                                <span className="text-sm text-gray-800 truncate max-w-32">
                                  {player.club}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Ranking:</span>
                              <Badge variant="outline" className="font-mono text-xs">
                                {player.ranking}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Gender:</span>
                              <Badge variant="outline" className="text-xs">
                                {player.gender}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="ml-3 flex-shrink-0">
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {filteredPlayers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No players found matching your search</p>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Players Preview */}
            {selectedPlayers.length > 0 && (
              <div className="mt-4 p-3 bg-white rounded-lg border">
                <h4 className="font-medium mb-2">Selected Players:</h4>
                <div className="space-y-1">
                  {selectedPlayers.map((playerId, index) => {
                    const player = players.find(p => p.id === playerId);
                    return player ? (
                      <div key={playerId} className="flex items-center justify-between text-sm">
                        <span>{index + 1}. {formatPlayerName(player.first_name, player.last_name)} (R: {player.ranking})</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlayerSelection(playerId, false)}
                          className="text-red-600 hover:text-red-700 h-6 px-2"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
            <Button 
              disabled={tournament.teams_locked} 
              onClick={() => setShowPlayerSelection(true)}
            >
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
            {/* Desktop Table View */}
            <div className="hidden lg:block">
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
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {sortedTeams.map((team, index) => (
                <Card key={team.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Badge variant="secondary" className="font-mono">
                          TS{index + 1}
                        </Badge>
                        <div>
                          <h3 className="font-medium text-lg">{team.name}</h3>
                          <Badge variant="outline" className="font-mono text-sm mt-1">
                            Weight: {team.weight}
                          </Badge>
                        </div>
                      </div>
                      {!tournament.teams_locked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTeam(team.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {/* Player 1 */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm text-gray-700">Player 1</h4>
                          <Badge variant="outline" className="text-xs">
                            R: {team.players[0]?.ranking}
                          </Badge>
                        </div>
                        <p className="font-semibold text-base">
                          {team.players[0]?.first_name} {team.players[0]?.last_name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          License: {team.players[0]?.license_number}
                        </p>
                      </div>

                      {/* Player 2 */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm text-gray-700">Player 2</h4>
                          <Badge variant="outline" className="text-xs">
                            R: {team.players[1]?.ranking}
                          </Badge>
                        </div>
                        <p className="font-semibold text-base">
                          {team.players[1]?.first_name} {team.players[1]?.last_name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          License: {team.players[1]?.license_number}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}