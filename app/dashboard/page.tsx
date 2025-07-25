'use client';

import { useEffect, useState } from 'react';
import { storage, Tournament } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trophy, Calendar, MapPin, Users, Settings, Clock, Target, MoreVertical, Copy, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

// Demo user ID for testing
const DEMO_USER_ID = 'demo-user-123';

export default function Dashboard() {
  const { toast } = useToast();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = () => {
    try {
      const data = storage.tournaments.getAll(DEMO_USER_ID);
      setTournaments(data);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const duplicateTournament = (tournament: Tournament) => {
    try {
      const duplicatedTournament = storage.tournaments.create({
        name: `${tournament.name} (Copy)`,
        date: tournament.date,
        location: tournament.location,
        organizer_id: DEMO_USER_ID,
        teams_locked: false, // Always unlock teams for duplicated tournament
        level: tournament.level,
        start_time: tournament.start_time,
        number_of_courts: tournament.number_of_courts,
        conditions: tournament.conditions,
        type: tournament.type,
      });

      fetchTournaments();
      toast({
        title: "Success",
        description: "Tournament duplicated successfully!",
      });

      // Navigate to the duplicated tournament
      router.push(`/dashboard/tournaments/${duplicatedTournament.id}`);
    } catch (error) {
      console.error('Error duplicating tournament:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate tournament",
        variant: "destructive",
      });
    }
  };

  const deleteTournament = (tournamentId: string) => {
    try {
      // Delete all related data
      storage.matches.deleteByTournament(tournamentId);
      
      // Get tournament teams and delete them
      const tournamentTeams = storage.tournamentTeams.getByTournament(tournamentId);
      tournamentTeams.forEach(tt => {
        storage.teams.delete(tt.team_id);
      });

      // Delete the tournament itself
      const tournaments = JSON.parse(localStorage.getItem('padelflow_tournaments') || '[]');
      const updatedTournaments = tournaments.filter((t: Tournament) => t.id !== tournamentId);
      localStorage.setItem('padelflow_tournaments', JSON.stringify(updatedTournaments));

      fetchTournaments();
      toast({
        title: "Success",
        description: "Tournament deleted successfully!",
      });
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast({
        title: "Error",
        description: "Failed to delete tournament",
        variant: "destructive",
      });
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
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tournament Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your padel tournaments - Demo Mode</p>
          </div>
          <Link href="/dashboard/tournaments/new">
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>New Tournament</span>
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tournaments</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tournaments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tournaments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tournaments.filter(t => new Date(t.date) >= new Date()).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tournaments.filter(t => new Date(t.date) < new Date()).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tournaments List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Tournaments</h2>
          {tournaments.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tournaments yet</h3>
                <p className="text-gray-500 mb-6">
                  Create your first tournament to get started with PadelFlow
                </p>
                <Link href="/dashboard/tournaments/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tournament
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((tournament) => (
                <Card key={tournament.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{tournament.name}</CardTitle>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge className={getLevelColor(tournament.level)}>
                            {tournament.level}
                          </Badge>
                          <Badge className={getTypeColor(tournament.type)}>
                            {tournament.type}
                          </Badge>
                        </div>
                        <CardDescription className="space-y-1">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {format(new Date(tournament.date), 'MMM dd, yyyy')}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {tournament.start_time}
                          </div>
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          new Date(tournament.date) >= new Date()
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {new Date(tournament.date) >= new Date() ? 'Active' : 'Completed'}
                        </div>
                        
                        {/* Tournament Actions Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => duplicateTournament(tournament)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            {!tournament.teams_locked && (
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/tournaments/new?edit=${tournament.id}`}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Details
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  className="text-red-600 focus:text-red-600"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Tournament</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{tournament.name}"? This action cannot be undone and will delete all teams, matches, and tournament data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteTournament(tournament.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete Tournament
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        {tournament.location}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Target className="h-4 w-4 mr-2" />
                        {tournament.number_of_courts} courts • {tournament.conditions}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        Teams: {tournament.teams_locked ? 'Locked' : 'Open'}
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Link href={`/dashboard/tournaments/${tournament.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Settings className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </Link>
                      <Link href={`/public/${tournament.public_id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          View Public
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}