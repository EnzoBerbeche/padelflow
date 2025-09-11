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
import { supabase, userPlayerLinkAPI, userProfileAPI, UserPlayerLinkWithRanking } from '@/lib/supabase';
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
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // User profile state
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    licence_number: ''
  });

  // Load current player link and user profile on component mount
  useEffect(() => {
    loadPlayerLink();
    loadUserProfile();
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchPlayers();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

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

  const loadUserProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const profile = await userProfileAPI.getMyProfile();
      setUserProfile(profile);
      // Initialize edit form data
      setEditFormData({
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        phone: profile?.phone || '',
        licence_number: profile?.licence_number || ''
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleEditProfile = () => {
    setIsEditingProfile(true);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    // Reset form data to current profile values
    setEditFormData({
      first_name: userProfile?.first_name || '',
      last_name: userProfile?.last_name || '',
      phone: userProfile?.phone || '',
      licence_number: userProfile?.licence_number || ''
    });
  };

  const handleSaveProfile = async () => {
    setIsLoadingProfile(true);
    try {
      // Update licence number
      if (editFormData.licence_number !== userProfile?.licence_number) {
        const result = await userProfileAPI.updateLicenceNumber(editFormData.licence_number);
        if (!result.ok) {
          toast({
            title: "Error",
            description: result.error || "Failed to update licence number",
            variant: "destructive",
          });
          return;
        }
      }

      // Update other profile fields
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: editFormData.first_name,
          last_name: editFormData.last_name,
          phone: editFormData.phone,
          licence_number: editFormData.licence_number,
          display_name: `${editFormData.first_name || ''} ${editFormData.last_name || ''}`.trim(),
        }
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update profile",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      setIsEditingProfile(false);
      await loadUserProfile(); // Reload profile data
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleLinkToPlayer = async () => {
    if (!searchInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a licence number",
        variant: "destructive",
      });
      return;
    }

    setIsLinking(true);
    try {
      const result = await userPlayerLinkAPI.linkToPlayer(searchInput.trim());
      
      if (result.ok) {
        toast({
          title: "Success",
          description: "Successfully linked to player",
        });
        setSearchInput('');
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
    if (!searchInput.trim()) return;
    
    setIsSearching(true);
    try {
      // Check if input is a number for idcrm search, otherwise search in name only
      const trimmedInput = searchInput.trim();
      const isNumber = !isNaN(Number(trimmedInput));
      
      let query = supabase
        .from('tenup_latest')
        .select('idcrm, nom_complet, sexe, classement, age_sportif, ligue');
      
      if (isNumber) {
        // For numeric input, search in both name and exact idcrm match
        query = query.or(`nom_complet.ilike.%${trimmedInput}%,idcrm.eq.${trimmedInput}`);
      } else {
        // For text input, search only in name
        query = query.ilike('nom_complet', `%${trimmedInput}%`);
      }
      
      const { data, error } = await query.limit(10);

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
    setSearchInput(player.idcrm.toString());
    setSearchResults([]);
    
    // Automatically link to the selected player
    setIsLinking(true);
    try {
      const result = await userPlayerLinkAPI.linkToPlayer(player.idcrm.toString());
      
      if (result.ok) {
        toast({
          title: "Success",
          description: `Successfully linked to ${player.nom_complet || `Player ${player.idcrm}`}`,
        });
        setSearchInput('');
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

          {/* Player Profile Section - Priority */}
          <Card className="border-2 border-green-200 bg-green-50/30">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-green-800">
                <UserCheck className="h-6 w-6" />
                <span>Profil Joueur</span>
              </CardTitle>
              <CardDescription className="text-green-700">
                Connectez votre compte à votre profil FFT pour accéder à vos statistiques personnalisées
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingLink ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Chargement...</p>
                </div>
              ) : playerLink ? (
                <div className="space-y-4">
                  <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-semibold text-green-800">✅ Profil lié avec succès</span>
                      </div>
                      <Badge variant="outline" className="text-green-700 border-green-400 bg-green-50">
                        {playerLink.sexe === 'H' ? 'Homme' : 'Femme'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="bg-white rounded p-3">
                        <div className="font-medium text-gray-700">Nom complet</div>
                        <div className="text-green-800 font-semibold">{playerLink.nom_complet || `Joueur ${playerLink.licence}`}</div>
                      </div>
                      <div className="bg-white rounded p-3">
                        <div className="font-medium text-gray-700">Numéro de licence</div>
                        <div className="text-green-800 font-semibold">{playerLink.licence}</div>
                      </div>
                      <div className="bg-white rounded p-3">
                        <div className="font-medium text-gray-700">Classement actuel</div>
                        <div className="text-green-800 font-semibold">P{playerLink.classement || 'N/A'}</div>
                      </div>
                      <div className="bg-white rounded p-3">
                        <div className="font-medium text-gray-700">Évolution</div>
                        <div className={`font-semibold ${playerLink.evolution && playerLink.evolution > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {playerLink.evolution ? (playerLink.evolution > 0 ? `+${playerLink.evolution}` : playerLink.evolution) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      onClick={() => setSearchInput('')} 
                      variant="outline" 
                      className="flex-1 border-green-600 text-green-600 hover:bg-green-50"
                    >
                      <Link className="h-4 w-4 mr-2" />
                      Changer de joueur
                    </Button>
                    <Button 
                      onClick={handleUnlinkPlayer} 
                      variant="outline" 
                      className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                    >
                      <Unlink className="h-4 w-4 mr-2" />
                      Délier le profil
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800 mb-1">Pourquoi lier votre profil ?</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• Accédez à vos statistiques personnalisées</li>
                          <li>• Suivez votre évolution de classement</li>
                          <li>• Profitez de toutes les fonctionnalités de NeyoPadel</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="licence" className="text-sm font-semibold text-gray-700">Rechercher votre profil FFT</Label>
                      <Input
                        id="licence"
                        placeholder="Tapez votre nom ou numéro de licence FFT..."
                        value={searchInput}
                        onChange={(e) => {
                          setSearchInput(e.target.value);
                          // Clear previous timeout
                          if (searchTimeout) {
                            clearTimeout(searchTimeout);
                          }
                          // Only search if user has typed at least 3 characters
                          if (e.target.value.trim().length >= 3) {
                            // Search automatically after user stops typing for 800ms
                            const timeoutId = setTimeout(() => {
                              searchPlayers();
                            }, 800);
                            setSearchTimeout(timeoutId);
                          } else {
                            // Clear results if less than 3 characters
                            setSearchResults([]);
                          }
                        }}
                        className="mt-1 border-green-300 focus:border-green-500 focus:ring-green-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Tapez au moins 3 caractères pour lancer la recherche automatiquement
                      </p>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Résultats de recherche :</Label>
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                          {searchResults.map((player) => (
                            <div 
                              key={player.idcrm}
                              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-green-50 hover:border-green-300 transition-colors"
                              onClick={() => handlePlayerSelect(player)}
                            >
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{player.nom_complet || `Joueur ${player.idcrm}`}</div>
                                <div className="text-sm text-gray-500">
                                  <div className="flex flex-wrap gap-3">
                                    <span>Âge: {player.age_sportif || 'N/A'} ans</span>
                                    <span>Ligue: {player.ligue || 'N/A'}</span>
                                    <span>Classement: P{player.classement || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                disabled={isLinking}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                {isLinking ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  'Lier'
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
                 
                 {isEditingProfile ? (
                   <div className="space-y-3">
                     <div>
                       <Label htmlFor="edit-first-name" className="text-sm font-medium">First Name</Label>
                       <Input
                         id="edit-first-name"
                         value={editFormData.first_name}
                         onChange={(e) => setEditFormData(prev => ({ ...prev, first_name: e.target.value }))}
                         className="mt-1"
                       />
                     </div>
                     <div>
                       <Label htmlFor="edit-last-name" className="text-sm font-medium">Last Name</Label>
                       <Input
                         id="edit-last-name"
                         value={editFormData.last_name}
                         onChange={(e) => setEditFormData(prev => ({ ...prev, last_name: e.target.value }))}
                         className="mt-1"
                       />
                     </div>
                     <div>
                       <Label htmlFor="edit-phone" className="text-sm font-medium">Phone</Label>
                       <Input
                         id="edit-phone"
                         value={editFormData.phone}
                         onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                         className="mt-1"
                       />
                     </div>
                     <div>
                       <Label htmlFor="edit-licence" className="text-sm font-medium">Licence Number</Label>
                       <Input
                         id="edit-licence"
                         value={editFormData.licence_number}
                         onChange={(e) => setEditFormData(prev => ({ ...prev, licence_number: e.target.value }))}
                         className="mt-1"
                         placeholder="Your FFT licence number"
                       />
                     </div>
                     <div className="flex space-x-2 pt-2">
                       <Button onClick={handleSaveProfile} disabled={isLoadingProfile} className="flex-1">
                         {isLoadingProfile ? 'Saving...' : 'Save Changes'}
                       </Button>
                       <Button onClick={handleCancelEdit} variant="outline" className="flex-1">
                         Cancel
                       </Button>
                     </div>
                   </div>
                 ) : (
                   <>
                     <div className="flex items-center justify-between">
                       <div>
                         <p className="font-medium">Name</p>
                         <p className="text-sm text-gray-600">
                           {userProfile?.first_name && userProfile?.last_name 
                             ? `${userProfile.first_name} ${userProfile.last_name}`
                             : 'Not set'
                           }
                         </p>
                       </div>
                     </div>
                     
                     <div className="flex items-center justify-between">
                       <div>
                         <p className="font-medium">Phone</p>
                         <p className="text-sm text-gray-600">
                           {userProfile?.phone || 'Not set'}
                         </p>
                       </div>
                     </div>
                   </>
                 )}
                
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

                 {!isEditingProfile && (
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="font-medium">Licence Number</p>
                       <p className="text-sm text-gray-600">
                         {userProfile?.licence_number || 'Not set'}
                       </p>
                     </div>
                   </div>
                 )}

                <Separator />

                                 <Button 
                   onClick={handleEditProfile} 
                   variant="outline" 
                   className="w-full"
                   disabled={isEditingProfile}
                 >
                   <User className="h-4 w-4 mr-2" />
                   Edit Profile
                 </Button>
                 
                 <Button onClick={handleSignOut} variant="outline" className="w-full">
                   <LogOut className="h-4 w-4 mr-2" />
                   Sign Out
                 </Button>
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