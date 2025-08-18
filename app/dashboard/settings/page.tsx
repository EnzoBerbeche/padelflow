'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Settings, User, Shield, Database, Trash2, Download, Upload, Bell, Palette, Globe, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseUser } from '@/hooks/use-current-user';
import { storage } from '@/lib/storage';

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useSupabaseUser();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [language, setLanguage] = useState('en');

  const exportData = () => {
    try {
      // Check if localStorage is available
      if (typeof window === 'undefined') {
        toast({
          title: "Error",
          description: "Export not available in this environment",
          variant: "destructive",
        });
        return;
      }

      // Get all data from localStorage
      const tournaments = localStorage.getItem('padelflow_tournaments') || '[]';
      const players = localStorage.getItem('padelflow_players') || '[]';
      const teams = localStorage.getItem('padelflow_teams') || '[]';
      const matches = localStorage.getItem('padelflow_matches') || '[]';
      const tournamentTeams = localStorage.getItem('padelflow_tournament_teams') || '[]';
      const teamPlayers = localStorage.getItem('padelflow_team_players') || '[]';

      const exportData = {
        tournaments: JSON.parse(tournaments),
        players: JSON.parse(players),
        teams: JSON.parse(teams),
        matches: JSON.parse(matches),
        tournamentTeams: JSON.parse(tournamentTeams),
        teamPlayers: JSON.parse(teamPlayers),
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `padelflow-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Data exported successfully!",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if localStorage is available
    if (typeof window === 'undefined') {
      toast({
        title: "Error",
        description: "Import not available in this environment",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // Validate the import data structure
        if (!data.tournaments || !data.players || !data.teams) {
          throw new Error('Invalid export file format');
        }

        // Import the data
        localStorage.setItem('padelflow_tournaments', JSON.stringify(data.tournaments));
        localStorage.setItem('padelflow_players', JSON.stringify(data.players));
        localStorage.setItem('padelflow_teams', JSON.stringify(data.teams));
        localStorage.setItem('padelflow_matches', JSON.stringify(data.matches || []));
        localStorage.setItem('padelflow_tournament_teams', JSON.stringify(data.tournamentTeams || []));
        localStorage.setItem('padelflow_team_players', JSON.stringify(data.teamPlayers || []));

        toast({
          title: "Success",
          description: "Data imported successfully! Please refresh the page.",
        });

        // Refresh the page to show imported data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error('Error importing data:', error);
        toast({
          title: "Error",
          description: "Failed to import data. Please check the file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    try {
      // Check if localStorage is available
      if (typeof window === 'undefined') {
        toast({
          title: "Error",
          description: "Data clearing not available in this environment",
          variant: "destructive",
        });
        return;
      }

      // Clear all PadelFlow data
      localStorage.removeItem('padelflow_tournaments');
      localStorage.removeItem('padelflow_players');
      localStorage.removeItem('padelflow_teams');
      localStorage.removeItem('padelflow_matches');
      localStorage.removeItem('padelflow_tournament_teams');
      localStorage.removeItem('padelflow_team_players');
      localStorage.removeItem('padelflow_formats');

      toast({
        title: "Success",
        description: "All data cleared successfully!",
      });

      // Refresh the page
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: "Error",
        description: "Failed to clear data",
        variant: "destructive",
      });
    }
  };

  const getDataStats = () => {
    try {
      // Check if localStorage is available
      if (typeof window === 'undefined') {
        return { tournaments: 0, players: 0, teams: 0, matches: 0 };
      }

      const tournaments = JSON.parse(localStorage.getItem('padelflow_tournaments') || '[]');
      const players = JSON.parse(localStorage.getItem('padelflow_players') || '[]');
      const teams = JSON.parse(localStorage.getItem('padelflow_teams') || '[]');
      const matches = JSON.parse(localStorage.getItem('padelflow_matches') || '[]');

      return {
        tournaments: tournaments.length,
        players: players.length,
        teams: teams.length,
        matches: matches.length,
      };
    } catch (error) {
      console.error('Error getting data stats:', error);
      return { tournaments: 0, players: 0, teams: 0, matches: 0 };
    }
  };

  const stats = getDataStats();

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Manage your account and application preferences</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Account</span>
                </CardTitle>
                <CardDescription>
                  Manage your account information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-gray-600">{user?.email || 'Not available'}</p>
                  </div>
                  <Badge variant="outline">Verified</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">User ID</p>
                    <p className="text-sm text-gray-600 font-mono">{user?.id || 'Not available'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Member Since</p>
                    <p className="text-sm text-gray-600">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Not available'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Notifications</span>
                </CardTitle>
                <CardDescription>
                  Configure your notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-600">Receive updates about your tournaments</p>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Dark Mode</p>
                    <p className="text-sm text-gray-600">Switch to dark theme</p>
                  </div>
                  <Switch
                    checked={darkModeEnabled}
                    onCheckedChange={setDarkModeEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Language</p>
                    <p className="text-sm text-gray-600">Choose your preferred language</p>
                  </div>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="es">Español</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Data Management</span>
                </CardTitle>
                <CardDescription>
                  Export, import, or clear your tournament data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="font-medium text-gray-900">{stats.tournaments}</p>
                    <p className="text-gray-600">Tournaments</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="font-medium text-gray-900">{stats.players}</p>
                    <p className="text-gray-600">Players</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="font-medium text-gray-900">{stats.teams}</p>
                    <p className="text-gray-600">Teams</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="font-medium text-gray-900">{stats.matches}</p>
                    <p className="text-gray-600">Matches</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Button onClick={exportData} variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                  
                  <div className="relative">
                    <input
                      type="file"
                      accept=".json"
                      onChange={importData}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      id="import-data"
                    />
                    <Button variant="outline" className="w-full" asChild>
                      <label htmlFor="import-data">
                        <Upload className="h-4 w-4 mr-2" />
                        Import Data
                      </label>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Privacy & Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Privacy & Security</span>
                </CardTitle>
                <CardDescription>
                  Manage your data privacy and security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Data Encryption</p>
                    <p className="text-sm text-gray-600">Your data is stored locally</p>
                  </div>
                  <Badge variant="outline">Local Storage</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Public Sharing</p>
                    <p className="text-sm text-gray-600">Tournaments can be shared publicly</p>
                  </div>
                  <Badge variant="outline">Enabled</Badge>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear All Data</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all your tournaments, players, teams, and matches. 
                        This action cannot be undone. Make sure to export your data first if you want to keep it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={clearAllData}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Clear All Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="h-5 w-5" />
                  <span>About PadelFlow</span>
                </CardTitle>
                <CardDescription>
                  Information about the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Version</span>
                    <span className="text-sm font-medium">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Framework</span>
                    <span className="text-sm font-medium">Next.js 15</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Authentication</span>
                    <span className="text-sm font-medium">Supabase</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Storage</span>
                    <span className="text-sm font-medium">Local Storage</span>
                  </div>
                </div>

                <Separator />

                <div className="text-sm text-gray-600">
                  <p className="mb-2">
                    PadelFlow is a professional tournament management platform for the padel community.
                  </p>
                  <p>
                    Built with modern web technologies to provide a seamless tournament organization experience.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
} 