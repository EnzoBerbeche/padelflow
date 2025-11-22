'use client';

import { useState, useEffect } from 'react';
import { clubsAPI, clubJugeArbitresAPI, type AppClub } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { useCurrentUserId } from '@/hooks/use-current-user';
import { useUserRole } from '@/hooks/use-user-role';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Plus, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ClubJugeArbitresPage() {
  const { toast } = useToast();
  const currentUserId = useCurrentUserId();
  const { isClub, isAdmin } = useUserRole();
  const [clubs, setClubs] = useState<AppClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [jugeArbitres, setJugeArbitres] = useState<Array<{ user_id: string; email: string; validated_at: string }>>([]);
  const [loadingJugeArbitres, setLoadingJugeArbitres] = useState(false);
  const [availableJugeArbitres, setAvailableJugeArbitres] = useState<Array<{ id: string; email: string; display_name: string | null }>>([]);
  const [loadingAvailableJugeArbitres, setLoadingAvailableJugeArbitres] = useState(false);
  const [selectedJugeArbitreId, setSelectedJugeArbitreId] = useState<string>('');
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    fetchClubs();
  }, [currentUserId, isAdmin, isClub]);

  const fetchClubs = async () => {
    try {
      if (!currentUserId) {
        setLoading(false);
        return;
      }
      let data: AppClub[] = [];
      if (isAdmin) {
        data = await clubsAPI.listAll();
      } else if (isClub) {
        data = await clubsAPI.listManagedByMe();
      }
      setClubs(data);
      
      // Auto-select first club if available
      if (data.length > 0 && !selectedClubId) {
        setSelectedClubId(data[0].id);
        loadJugeArbitres(data[0].id);
        loadAvailableJugeArbitres();
      }
    } catch (error: any) {
      console.error('Error fetching clubs:', error);
      setClubs([]);
    } finally {
      setLoading(false);
    }
  };

  const loadJugeArbitres = async (clubId: string) => {
    setLoadingJugeArbitres(true);
    try {
      const data = await clubJugeArbitresAPI.listJugeArbitresForClub(clubId);
      setJugeArbitres(data);
    } catch (error) {
      console.error('Error loading juge arbitres:', error);
    } finally {
      setLoadingJugeArbitres(false);
    }
  };

  const loadAvailableJugeArbitres = async () => {
    setLoadingAvailableJugeArbitres(true);
    try {
      const response = await fetch('/api/admin/users/juge-arbitres');
      if (!response.ok) {
        throw new Error('Failed to load juge arbitres');
      }
      const data = await response.json();
      setAvailableJugeArbitres(data.jugeArbitres || []);
    } catch (error) {
      console.error('Error loading available juge arbitres:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des juges arbitres",
        variant: "destructive",
      });
    } finally {
      setLoadingAvailableJugeArbitres(false);
    }
  };

  const handleClubChange = (clubId: string) => {
    setSelectedClubId(clubId);
    setSelectedJugeArbitreId('');
    loadJugeArbitres(clubId);
  };

  const handleValidateJugeArbitre = async () => {
    if (!selectedClubId || !selectedJugeArbitreId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un club et un juge arbitre",
        variant: "destructive",
      });
      return;
    }

    const selectedJugeArbitre = availableJugeArbitres.find(ja => ja.id === selectedJugeArbitreId);
    if (!selectedJugeArbitre) {
      toast({
        title: "Erreur",
        description: "Juge arbitre introuvable",
        variant: "destructive",
      });
      return;
    }

    setValidating(true);
    try {
      const result = await clubJugeArbitresAPI.validate(selectedClubId, selectedJugeArbitre.id, selectedJugeArbitre.email);
      if (result.ok) {
        toast({
          title: "Succès",
          description: "Juge arbitre validé avec succès",
        });
        setSelectedJugeArbitreId('');
        loadJugeArbitres(selectedClubId);
      } else {
        throw new Error(result.error || 'Failed to validate juge arbitre');
      }
    } catch (error: any) {
      console.error('Error validating juge arbitre:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de valider le juge arbitre",
        variant: "destructive",
      });
    } finally {
      setValidating(false);
    }
  };

  const handleUnvalidateJugeArbitre = async (clubId: string, userId: string) => {
    try {
      const result = await clubJugeArbitresAPI.unvalidate(clubId, userId);
      if (result.ok) {
        toast({
          title: "Succès",
          description: "Juge arbitre retiré avec succès",
        });
        loadJugeArbitres(clubId);
      } else {
        throw new Error(result.error || 'Failed to unvalidate juge arbitre');
      }
    } catch (error: any) {
      console.error('Error unvalidating juge arbitre:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de retirer le juge arbitre",
        variant: "destructive",
      });
    }
  };

  // Check if user has permission
  if (!isClub && !isAdmin) {
    return (
      <ProtectedRoute allowedRoles={['club', 'admin']}>
        <DashboardLayout>
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès restreint</h1>
            <p className="text-gray-600 mb-6">
              Seuls les profils Club et Admin peuvent accéder à cette page.
            </p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (clubs.length === 0) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Aucun club</h1>
          <p className="text-gray-600 mb-6">
            Vous n'avez pas encore de club assigné. Contactez un administrateur.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const selectedClub = clubs.find(c => c.id === selectedClubId);

  return (
    <ProtectedRoute allowedRoles={['club', 'admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mes Juges Arbitres</h1>
            <p className="text-gray-600 mt-1">
              Gérez les juges arbitres validés pour vos clubs
            </p>
          </div>

          {/* Club Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Sélectionner un Club</CardTitle>
              <CardDescription>
                Choisissez le club pour lequel vous souhaitez gérer les juges arbitres
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="club_select">Club *</Label>
                <Select value={selectedClubId || ''} onValueChange={handleClubChange}>
                  <SelectTrigger id="club_select">
                    <SelectValue placeholder="Choisir un club..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clubs.map((club) => (
                      <SelectItem key={club.id} value={club.id}>
                        {club.name} - {club.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {selectedClubId && selectedClub && (
            <>
              {/* Add Juge Arbitre */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Plus className="h-5 w-5 mr-2" />
                    Valider un Juge Arbitre
                  </CardTitle>
                  <CardDescription>
                    Ajoutez un juge arbitre au club {selectedClub.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="juge_arbitre_select">Sélectionner un Juge Arbitre *</Label>
                    {loadingAvailableJugeArbitres ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    ) : (
                      <Select value={selectedJugeArbitreId} onValueChange={setSelectedJugeArbitreId}>
                        <SelectTrigger id="juge_arbitre_select">
                          <SelectValue placeholder="Choisir un juge arbitre..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableJugeArbitres
                            .filter(ja => !jugeArbitres.some(validated => validated.user_id === ja.id))
                            .map((ja) => (
                              <SelectItem key={ja.id} value={ja.id}>
                                {ja.display_name ? `${ja.display_name} (${ja.email})` : ja.email}
                              </SelectItem>
                            ))}
                          {availableJugeArbitres.filter(ja => !jugeArbitres.some(validated => validated.user_id === ja.id)).length === 0 && (
                            <SelectItem value="__no_available__" disabled>
                              Tous les juges arbitres sont déjà validés
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Sélectionnez un juge arbitre depuis la liste pour l'ajouter à ce club.
                    </p>
                  </div>
                  <Button 
                    onClick={handleValidateJugeArbitre} 
                    disabled={!selectedJugeArbitreId || validating || loadingAvailableJugeArbitres}
                    className="w-full"
                  >
                    {validating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Validation en cours...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Valider le Juge Arbitre
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Liste des juges arbitres validés */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Juges Arbitres Validés
                  </CardTitle>
                  <CardDescription>
                    Liste des juges arbitres validés pour le club {selectedClub.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingJugeArbitres ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </div>
                  ) : jugeArbitres.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Aucun juge arbitre validé pour ce club
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jugeArbitres.map((ja) => (
                        <Card key={ja.user_id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{ja.email}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Validé le {format(new Date(ja.validated_at), 'PPP', { locale: fr })}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnvalidateJugeArbitre(selectedClubId, ja.user_id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Retirer
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

