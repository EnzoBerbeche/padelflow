'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Settings, User, Trash2, Info, LogOut, Link, Unlink, Search, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseUser } from '@/hooks/use-current-user';
import { supabase, userPlayerLinkAPI, userProfileAPI, UserPlayerLinkWithRanking } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useSupabaseUser();
  const router = useRouter();
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
            title: "Erreur",
            description: result.error || "Impossible de mettre à jour le numéro de licence",
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
          title: "Erreur",
          description: "Impossible de mettre à jour le profil",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Succès",
        description: "Profil mis à jour avec succès",
      });

      setIsEditingProfile(false);
      await loadUserProfile(); // Reload profile data
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleLinkToPlayer = async () => {
    if (!searchInput.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un numéro de licence",
        variant: "destructive",
      });
      return;
    }

    setIsLinking(true);
    try {
      const result = await userPlayerLinkAPI.linkToPlayer(searchInput.trim());
      
      if (result.ok) {
        toast({
          title: "Succès",
          description: "Profil lié avec succès",
        });
        setSearchInput('');
        await loadPlayerLink(); // Reload the link
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Impossible de lier le profil",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error linking to player:', error);
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
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
          title: "Succès",
          description: "Profil délié avec succès",
        });
        setPlayerLink(null);
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Impossible de délier le profil",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error unlinking from player:', error);
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
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
          title: "Succès",
          description: `Profil lié avec succès à ${player.nom_complet || 'Joueur'}`,
        });
        setSearchInput('');
        await loadPlayerLink(); // Reload the link
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Impossible de lier le profil",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error linking to player:', error);
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
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
        title: "Erreur",
        description: "Impossible de supprimer le compte. Veuillez réessayer.",
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
            <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
            <p className="text-gray-600 mt-1">Gérez votre compte et vos préférences</p>
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
                    <div className="bg-white rounded p-3">
                      <div className="font-medium text-gray-700">Nom complet</div>
                      <div className="text-green-800 font-semibold">{playerLink.nom_complet || 'Joueur'}</div>
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
                                <div className="font-medium text-gray-900">{player.nom_complet || 'Joueur'}</div>
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
                  <span>Compte</span>
                </CardTitle>
                <CardDescription>
                  Gérez les informations de votre compte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                                 <div className="flex items-center justify-between">
                   <div>
                     <p className="font-medium">Email</p>
                     <p className="text-sm text-gray-600">{user?.email || 'Non disponible'}</p>
                   </div>
                   <Badge variant="outline">Vérifié</Badge>
                 </div>
                 
                 {isEditingProfile ? (
                   <div className="space-y-3">
                     <div>
                       <Label htmlFor="edit-first-name" className="text-sm font-medium">Prénom</Label>
                       <Input
                         id="edit-first-name"
                         value={editFormData.first_name}
                         onChange={(e) => setEditFormData(prev => ({ ...prev, first_name: e.target.value }))}
                         className="mt-1"
                       />
                     </div>
                     <div>
                       <Label htmlFor="edit-last-name" className="text-sm font-medium">Nom</Label>
                       <Input
                         id="edit-last-name"
                         value={editFormData.last_name}
                         onChange={(e) => setEditFormData(prev => ({ ...prev, last_name: e.target.value }))}
                         className="mt-1"
                       />
                     </div>
                     <div>
                       <Label htmlFor="edit-phone" className="text-sm font-medium">Téléphone</Label>
                       <Input
                         id="edit-phone"
                         value={editFormData.phone}
                         onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                         className="mt-1"
                       />
                     </div>
                     <div>
                       <Label htmlFor="edit-licence" className="text-sm font-medium">Numéro de licence</Label>
                       <Input
                         id="edit-licence"
                         value={editFormData.licence_number}
                         onChange={(e) => setEditFormData(prev => ({ ...prev, licence_number: e.target.value }))}
                         className="mt-1"
                         placeholder="Votre numéro de licence FFT"
                       />
                     </div>
                     <div className="flex space-x-2 pt-2">
                       <Button onClick={handleSaveProfile} disabled={isLoadingProfile} className="flex-1">
                         {isLoadingProfile ? 'Enregistrement...' : 'Enregistrer'}
                       </Button>
                       <Button onClick={handleCancelEdit} variant="outline" className="flex-1">
                         Annuler
                       </Button>
                     </div>
                   </div>
                 ) : (
                   <>
                     <div className="flex items-center justify-between">
                       <div>
                         <p className="font-medium">Nom</p>
                         <p className="text-sm text-gray-600">
                           {userProfile?.first_name && userProfile?.last_name 
                             ? `${userProfile.first_name} ${userProfile.last_name}`
                             : 'Non renseigné'
                           }
                         </p>
                       </div>
                     </div>
                     
                     <div className="flex items-center justify-between">
                       <div>
                         <p className="font-medium">Téléphone</p>
                         <p className="text-sm text-gray-600">
                           {userProfile?.phone || 'Non renseigné'}
                         </p>
                       </div>
                     </div>
                   </>
                 )}
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">ID Utilisateur</p>
                    <p className="text-sm text-gray-600 font-mono">{user?.id || 'Non disponible'}</p>
                  </div>
                </div>

                                 <div className="flex items-center justify-between">
                   <div>
                     <p className="font-medium">Membre depuis</p>
                     <p className="text-sm text-gray-600">
                       {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'Non disponible'}
                     </p>
                   </div>
                 </div>

                 {!isEditingProfile && (
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="font-medium">Numéro de licence</p>
                       <p className="text-sm text-gray-600">
                         {userProfile?.licence_number || 'Non renseigné'}
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
                   Modifier le profil
                 </Button>
                 
                 <Button onClick={handleSignOut} variant="outline" className="w-full">
                   <LogOut className="h-4 w-4 mr-2" />
                   Se déconnecter
                 </Button>
              </CardContent>
            </Card>

            {/* Delete Account */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-600">
                  <Trash2 className="h-5 w-5" />
                  <span>Supprimer le compte</span>
                </CardTitle>
                <CardDescription>
                  Supprimer définitivement votre compte et toutes les données associées
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
                        Avertissement : Cette action est irréversible
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>
                          La suppression de votre compte supprimera définitivement :
                        </p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Tous vos tournois et données de tournois</li>
                          <li>Tous vos joueurs et équipes</li>
                          <li>Tous vos matchs et résultats</li>
                          <li>Vos paramètres de compte et préférences</li>
                        </ul>
                        <p className="mt-2 font-medium">
                          Ces données seront définitivement perdues et ne pourront pas être récupérées.
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
                      {isDeleting ? 'Suppression...' : 'Supprimer mon compte'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer le compte</AlertDialogTitle>
                      <AlertDialogDescription>
                        Êtes-vous absolument sûr de vouloir supprimer votre compte ? 
                        Cette action est irréversible et supprimera définitivement toutes vos données.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteAccount}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Suppression...' : 'Oui, supprimer mon compte'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
} 