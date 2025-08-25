'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Settings, User, Trash2, Bell, Info, LogOut, Link, Unlink, Search, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseUser } from '@/hooks/use-current-user';
import { supabase, userPlayerLinkAPI, UserPlayerLinkWithRanking } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useSupabaseUser();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [language, setLanguage] = useState('en');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Player linking state
  const [playerLink, setPlayerLink] = useState<UserPlayerLinkWithRanking | null>(null);
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [licenceInput, setLicenceInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Load current player link on component mount
  useEffect(() => {
    loadPlayerLink();
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (!licenceInput.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchPlayers();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [licenceInput]);

  const loadPlayerLink = async () => {
    setIsLoadingLink(true);
    try {
      const link = await userPlayerLinkAPI.getMyPlayerLink();
      setPlayerLink(link);
    } catch (error) {
      console.error('Error loading player link:', error);
    } finally {
      setIsLoadingLink(false);
    }
  };

  const handleLinkToPlayer = async () => {
    if (!licenceInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a licence number",
        variant: "destructive",
      });
      return;
    }

    setIsLinking(true);
    try {
      const result = await userPlayerLinkAPI.linkToPlayer(licenceInput.trim());
      
      if (result.ok) {
        toast({
          title: "Success",
          description: "Successfully linked to player",
        });
        setLicenceInput('');
        await loadPlayerLink(); // Reload the link
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to link to player",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error linking to player:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkPlayer = async () => {
    try {
      const result = await userPlayerLinkAPI.unlinkPlayer();
      
      if (result.ok) {
        toast({
          title: "Success",
          description: "Successfully unlinked from player",
        });
        setPlayerLink(null);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to unlink from player",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error unlinking from player:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const searchPlayers = async () => {
    if (!licenceInput.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('rankings_latest')
        .select('licence, nom, genre, rang, club')
        .or(`nom.ilike.%${licenceInput.trim()}%,licence.ilike.%${licenceInput.trim()}%`)
        .limit(10);

      if (error) {
        console.error('Error searching players:', error);
        return;
      }

      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching players:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlayerSelect = async (player: any) => {
    setLicenceInput(player.licence);
    setSearchResults([]);
    
    // Automatically link to the selected player
    setIsLinking(true);
    try {
      const result = await userPlayerLinkAPI.linkToPlayer(player.licence);
      
      if (result.ok) {
        toast({
          title: "Success",
          description: `Successfully linked to ${player.nom || `Player ${player.licence}`}`,
        });
        setLicenceInput('');
        await loadPlayerLink(); // Reload the link
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to link to player",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error linking to player:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      // Delete user account from Supabase
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (error) {
        throw error;
      }

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });

      // Redirect to home page
      router.push('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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

                <Separator />

                <Button onClick={handleSignOut} variant="outline" className="w-full">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>

            {/* Player Linking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserCheck className="h-5 w-5" />
                  <span>Player Profile</span>
                </CardTitle>
                <CardDescription>
                  Link your account to a player in the rankings database
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingLink ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600">Loading...</p>
                  </div>
                ) : playerLink ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <UserCheck className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Linked to Player</span>
                        </div>
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          {playerLink.genre === 'Homme' ? 'Men' : 'Women'}
                        </Badge>
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-green-700">
                        <div><span className="font-medium">Name:</span> {playerLink.nom || `Player ${playerLink.licence}`}</div>
                        <div><span className="font-medium">Licence:</span> {playerLink.licence}</div>
                        <div><span className="font-medium">Ranking:</span> P{playerLink.rang || 'N/A'}</div>
                        <div><span className="font-medium">Club:</span> {playerLink.club || 'N/A'}</div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        onClick={() => setLicenceInput('')} 
                        variant="outline" 
                        className="flex-1"
                      >
                        <Link className="h-4 w-4 mr-2" />
                        Change Player
                      </Button>
                      <Button 
                        onClick={handleUnlinkPlayer} 
                        variant="outline" 
                        className="flex-1"
                      >
                        <Unlink className="h-4 w-4 mr-2" />
                        Unlink
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      Link your account to a player in the rankings database to personalize your experience.
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="licence">Search for a Player</Label>
                      <Input
                        id="licence"
                        placeholder="Search by name or licence number..."
                        value={licenceInput}
                        onChange={(e) => setLicenceInput(e.target.value)}
                      />
                      <p className="text-xs text-gray-500">
                        Start typing to search for players. Results appear automatically.
                      </p>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Search Results:</Label>
                        <div className="space-y-1">
                          {searchResults.map((player) => (
                            <div 
                              key={player.licence}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handlePlayerSelect(player)}
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">{player.nom || `Player ${player.licence}`}</span>
                                <Badge variant="outline" className="text-xs">
                                  {player.genre === 'Homme' ? 'Men' : 'Women'}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-600">
                                P{player.rang || 'N/A'} • {player.club || 'N/A'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isSearching && (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-gray-500">Searching...</p>
                      </div>
                    )}

                    {searchResults.length === 0 && licenceInput.trim() && !isSearching && (
                      <div className="text-center py-4 text-sm text-gray-500">
                        No players found. Try a different search term.
                      </div>
                    )}
                  </div>
                )}
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

            {/* Delete Account */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-600">
                  <Trash2 className="h-5 w-5" />
                  <span>Delete Account</span>
                </CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Trash2 className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Warning: This action cannot be undone
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>
                          Deleting your account will permanently remove:
                        </p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>All your tournaments and tournament data</li>
                          <li>All your players and teams</li>
                          <li>All your matches and results</li>
                          <li>Your account settings and preferences</li>
                        </ul>
                        <p className="mt-2 font-medium">
                          This data will be permanently lost and cannot be recovered.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? 'Deleting Account...' : 'Delete My Account'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Account</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you absolutely sure you want to delete your account? 
                        This action cannot be undone and will permanently remove all your data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteAccount}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {/* About */}
            <Card className="lg:col-span-2">
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
                    <span className="text-sm font-medium">Supabase</span>
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