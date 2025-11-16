'use client';

import { useState, useEffect, useCallback } from 'react';
import { clubsAPI, clubCourtsAPI, clubJugeArbitresAPI, type AppClub, type AppClubCourt } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { useCurrentUserId } from '@/hooks/use-current-user';
import { useUserRole } from '@/hooks/use-user-role';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Mail, Phone, Globe, Instagram, Facebook, User, Plus, Edit, Trash2, X, Home, Sun, Umbrella, Users, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { getPlaceDetails, parseAddressComponents } from '@/lib/google-places';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ClubManagementPage() {
  const { toast } = useToast();
  const currentUserId = useCurrentUserId();
  const { isClub, isAdmin, isJugeArbitre, role } = useUserRole();
  const [clubs, setClubs] = useState<AppClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingClubId, setDeletingClubId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<AppClub | null>(null);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [courts, setCourts] = useState<AppClubCourt[]>([]);
  const [isCourtDialogOpen, setIsCourtDialogOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<AppClubCourt | null>(null);
  const [courtFormData, setCourtFormData] = useState({
    court_number: '',
    court_name: '',
    court_type: 'inside' as 'inside' | 'outside' | 'covered',
  });
  const [selectedClubForValidation, setSelectedClubForValidation] = useState<string | null>(null);
  const [jugeArbitreEmail, setJugeArbitreEmail] = useState('');
  const [validating, setValidating] = useState(false);
  const [jugeArbitres, setJugeArbitres] = useState<Array<{ user_id: string; email: string; validated_at: string }>>([]);
  const [loadingJugeArbitres, setLoadingJugeArbitres] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    city: undefined as string | undefined,
    postal_code: undefined as string | undefined,
    country: undefined as string | undefined,
    country_code: undefined as string | undefined,
    website: '',
    instagram: '',
    facebook: '',
    manager: '',
    contact_email: '',
    contact_phone: '',
  });

  useEffect(() => {
    fetchClubs();
  }, [currentUserId, isAdmin, isJugeArbitre, isClub]);

  const fetchClubs = async () => {
    try {
      if (!currentUserId) {
        setLoading(false);
        return;
      }
      // Admins voient tous les clubs, juges arbitres voient leurs clubs créés
      // Users "club" voient les clubs qu'ils gèrent
      let data: AppClub[] = [];
      if (isAdmin) {
        try {
          data = await clubsAPI.listAll();
        } catch (err: any) {
          console.error('Error in clubsAPI.listAll():', err);
          console.error('Error details:', JSON.stringify(err, null, 2));
          data = [];
        }
      } else if (isJugeArbitre) {
        try {
          data = await clubsAPI.listMy();
        } catch (err: any) {
          console.error('Error in clubsAPI.listMy():', err);
          console.error('Error details:', JSON.stringify(err, null, 2));
          data = [];
        }
      } else if (isClub) {
        try {
          data = await clubsAPI.listManagedByMe();
        } catch (err: any) {
          console.error('Error in clubsAPI.listManagedByMe():', err);
          console.error('Error details:', JSON.stringify(err, null, 2));
          data = [];
        }
      }
      setClubs(data);
    } catch (error: any) {
      console.error('Error fetching clubs:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      setClubs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourts = async (clubId: string) => {
    try {
      const data = await clubCourtsAPI.listByClub(clubId);
      setCourts(data);
    } catch (error) {
      console.error('Error fetching courts:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      latitude: undefined,
      longitude: undefined,
      city: undefined,
      postal_code: undefined,
      country: undefined,
      country_code: undefined,
      website: '',
      instagram: '',
      facebook: '',
      manager: '',
      contact_email: '',
      contact_phone: '',
    });
    setEditingClub(null);
  };

  const handleOpenDialog = (club?: AppClub) => {
    if (club) {
      setEditingClub(club);
      setFormData({
        name: club.name,
        address: club.address,
        latitude: club.latitude,
        longitude: club.longitude,
        city: club.city,
        postal_code: club.postal_code,
        country: club.country,
        country_code: club.country_code,
        website: club.website || '',
        instagram: club.instagram || '',
        facebook: club.facebook || '',
        manager: club.manager || '',
        contact_email: club.contact_email,
        contact_phone: club.contact_phone,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleAddressChange = (address: string, coordinates?: { lat: number; lng: number }, parsedAddress?: { city?: string; postal_code?: string; country?: string; country_code?: string }) => {
    setFormData({
      ...formData,
      address,
      latitude: coordinates?.lat,
      longitude: coordinates?.lng,
      city: parsedAddress?.city,
      postal_code: parsedAddress?.postal_code,
      country: parsedAddress?.country,
      country_code: parsedAddress?.country_code,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des champs obligatoires
    // Pour les users "club" en mode édition, name et address ne sont pas obligatoires car ils ne peuvent pas les modifier
    const isClubUserEditing = isClub && !isAdmin && !isJugeArbitre && editingClub !== null;
    const requiredFields = isClubUserEditing 
      ? ['contact_email', 'contact_phone']
      : ['name', 'address', 'contact_email', 'contact_phone'];
    
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    if (missingFields.length > 0) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    // Validate that address was selected from API (has coordinates)
    // Pas nécessaire pour les users "club" en mode édition
    if (!isClubUserEditing && (!formData.latitude || !formData.longitude)) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une adresse depuis les suggestions",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingClub) {
        // Users "club" ne peuvent pas modifier le nom et l'adresse
        const updateData: any = {
          latitude: formData.latitude,
          longitude: formData.longitude,
          city: formData.city,
          postal_code: formData.postal_code,
          country: formData.country,
          country_code: formData.country_code,
          website: formData.website || undefined,
          instagram: formData.instagram || undefined,
          facebook: formData.facebook || undefined,
          manager: formData.manager || undefined,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
        };
        
        // Seuls les admins et juges arbitres peuvent modifier le nom et l'adresse
        if (isAdmin || isJugeArbitre) {
          updateData.name = formData.name;
          updateData.address = formData.address;
        }
        
        const updated = await clubsAPI.update(editingClub.id, updateData);
        if (updated) {
          toast({
            title: "Succès",
            description: "Club mis à jour avec succès !",
          });
          fetchClubs();
          setIsDialogOpen(false);
          resetForm();
        }
      } else {
        const created = await clubsAPI.create({
          name: formData.name,
          address: formData.address,
          latitude: formData.latitude,
          longitude: formData.longitude,
          city: formData.city,
          postal_code: formData.postal_code,
          country: formData.country,
          country_code: formData.country_code,
          website: formData.website || undefined,
          instagram: formData.instagram || undefined,
          facebook: formData.facebook || undefined,
          manager: formData.manager || undefined,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
        });
        if (created) {
          toast({
            title: "Succès",
            description: "Club créé avec succès !",
          });
          fetchClubs();
          setIsDialogOpen(false);
          resetForm();
        } else {
          toast({
            title: "Erreur",
            description: "Impossible de créer le club. La table 'clubs' n'existe peut-être pas encore dans Supabase. Veuillez exécuter le script SQL de création des tables.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error saving club:', error);
      toast({
        title: "Erreur",
        description: "Échec de l'enregistrement du club",
        variant: "destructive",
      });
    }
  };

  const deleteClub = useCallback(async (clubId: string) => {
    if (deletingClubId) return;
    setDeletingClubId(clubId);
    try {
      const result = await clubsAPI.delete(clubId);
      if (result.ok) {
        toast({
          title: "Succès",
          description: "Club supprimé avec succès !",
        });
        setClubs(prev => prev.filter(c => c.id !== clubId));
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Impossible de supprimer le club",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting club:', error);
      toast({
        title: "Erreur",
        description: "Échec de la suppression du club",
        variant: "destructive",
      });
    } finally {
      setDeletingClubId(null);
    }
  }, [deletingClubId, toast]);

  const handleOpenCourtDialog = (clubId: string, court?: AppClubCourt) => {
    setSelectedClubId(clubId);
    if (court) {
      setEditingCourt(court);
      setCourtFormData({
        court_number: court.court_number.toString(),
        court_name: court.court_name || '',
        court_type: court.court_type,
      });
    } else {
      setEditingCourt(null);
      setCourtFormData({
        court_number: '',
        court_name: '',
        court_type: 'inside',
      });
    }
    setIsCourtDialogOpen(true);
  };

  const handleCourtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClubId) return;

    const courtNumber = parseInt(courtFormData.court_number);
    const courtType = courtFormData.court_type;

    if (!courtNumber || !courtType) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingCourt) {
        const updated = await clubCourtsAPI.update(editingCourt.id, {
          court_number: courtNumber,
          court_name: courtFormData.court_name || undefined,
          court_type: courtType,
        });
        if (updated) {
          toast({
            title: "Succès",
            description: "Terrain mis à jour avec succès !",
          });
          fetchCourts(selectedClubId);
          setIsCourtDialogOpen(false);
          setEditingCourt(null);
          setCourtFormData({
            court_number: '',
            court_name: '',
            court_type: 'inside',
          });
        }
      } else {
        const created = await clubCourtsAPI.create({
          club_id: selectedClubId,
          court_number: courtNumber,
          court_name: courtFormData.court_name || undefined,
          court_type: courtType,
        });
        if (created) {
          toast({
            title: "Succès",
            description: "Terrain créé avec succès !",
          });
          fetchCourts(selectedClubId);
          setIsCourtDialogOpen(false);
          setCourtFormData({
            court_number: '',
            court_name: '',
            court_type: 'inside',
          });
        }
      }
    } catch (error) {
      console.error('Error saving court:', error);
      toast({
        title: "Erreur",
        description: "Échec de l'enregistrement du terrain",
        variant: "destructive",
      });
    }
  };

  const deleteCourt = async (courtId: string, clubId: string) => {
    try {
      const result = await clubCourtsAPI.delete(courtId);
      if (result.ok) {
        toast({
          title: "Succès",
          description: "Terrain supprimé avec succès !",
        });
        fetchCourts(clubId);
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Impossible de supprimer le terrain",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting court:', error);
      toast({
        title: "Erreur",
        description: "Échec de la suppression du terrain",
        variant: "destructive",
      });
    }
  };

  // Check if user has permission
  if (!isClub && !isAdmin && !isJugeArbitre) {
    return (
      <ProtectedRoute allowedRoles={['juge_arbitre', 'admin', 'club']}>
        <DashboardLayout>
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès restreint</h1>
            <p className="text-gray-600 mb-6">
              Seuls les profils Club, Juge Arbitre et Admin peuvent accéder à la gestion des clubs.
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

  const handleValidateJugeArbitre = async () => {
    if (!selectedClubForValidation || !jugeArbitreEmail.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un club et saisir un email",
        variant: "destructive",
      });
      return;
    }

    setValidating(true);
    try {
      const result = await clubJugeArbitresAPI.validate(selectedClubForValidation, jugeArbitreEmail.trim());
      if (result.ok) {
        toast({
          title: "Succès",
          description: "Juge arbitre validé avec succès",
        });
        setJugeArbitreEmail('');
        loadJugeArbitres(selectedClubForValidation);
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

  const handleOpenJugeArbitreDialog = (clubId: string) => {
    setSelectedClubForValidation(clubId);
    loadJugeArbitres(clubId);
  };

  return (
    <ProtectedRoute allowedRoles={['juge_arbitre', 'admin', 'club']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Liste des clubs</h1>
              <p className="text-gray-600 mt-1">Gérez les clubs et leurs terrains</p>
            </div>
            {(isAdmin || isJugeArbitre) && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()} className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Nouveau Club</span>
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingClub ? 'Modifier le Club' : 'Nouveau Club'}</DialogTitle>
                  <DialogDescription>
                    {editingClub ? 'Modifiez les informations du club' : 'Créez un nouveau club avec ses informations'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom du Club *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required={isAdmin || isJugeArbitre || !editingClub}
                        disabled={isClub && !isAdmin && !isJugeArbitre && editingClub !== null}
                        title={isClub && !isAdmin && !isJugeArbitre && editingClub !== null ? "Le nom du club ne peut être modifié que par un admin" : undefined}
                      />
                      {isClub && !isAdmin && !isJugeArbitre && editingClub !== null && (
                        <p className="text-xs text-muted-foreground">
                          Le nom du club ne peut être modifié que par un admin
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Adresse *</Label>
                      <div className={isClub && !isAdmin && !isJugeArbitre && editingClub !== null ? "pointer-events-none opacity-50" : ""}>
                        <AddressAutocomplete
                          value={formData.address}
                          onChange={handleAddressChange}
                          placeholder="Rechercher une adresse..."
                          required={isAdmin || isJugeArbitre || !editingClub}
                          forceApiSelection={true}
                        />
                      </div>
                      {isClub && !isAdmin && !isJugeArbitre && editingClub !== null && (
                        <p className="text-sm text-muted-foreground mt-1">L'adresse du club ne peut être modifiée que par un admin</p>
                      )}
                      {formData.latitude && formData.longitude && (
                        <p className="text-xs text-gray-500">
                          Coordonnées: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                        </p>
                      )}
                      {isClub && !isAdmin && !isJugeArbitre && editingClub !== null && (
                        <p className="text-xs text-muted-foreground">
                          L'adresse du club ne peut être modifiée que par un admin
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Email de contact *</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Téléphone *</Label>
                      <Input
                        id="contact_phone"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manager">Responsable</Label>
                      <Input
                        id="manager"
                        value={formData.manager}
                        onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Site web</Label>
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="www..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram</Label>
                      <Input
                        id="instagram"
                        value={formData.instagram}
                        onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                        placeholder="@username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="facebook">Facebook</Label>
                      <Input
                        id="facebook"
                        value={formData.facebook}
                        onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                        placeholder="URL ou nom de page"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit">{editingClub ? 'Modifier' : 'Créer'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </div>

          {/* Clubs List */}
          <div>
            {clubs.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun club pour le moment</h3>
                  <p className="text-gray-500 mb-6">
                    Créez votre premier club pour commencer
                  </p>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un Club
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Adresse</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Téléphone</TableHead>
                        <TableHead>Responsable</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clubs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Aucun club trouvé
                          </TableCell>
                        </TableRow>
                      ) : (
                        clubs.map((club) => (
                          <TableRow key={club.id}>
                            <TableCell className="font-medium">{club.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                                <span className="max-w-xs truncate">{club.address}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Mail className="h-4 w-4 mr-1 text-muted-foreground" />
                                {club.contact_email}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Phone className="h-4 w-4 mr-1 text-muted-foreground" />
                                {club.contact_phone}
                              </div>
                            </TableCell>
                            <TableCell>
                              {club.manager ? (
                                <div className="flex items-center">
                                  <User className="h-4 w-4 mr-1 text-muted-foreground" />
                                  {club.manager}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    setSelectedClubId(club.id);
                                    await fetchCourts(club.id);
                                  }}
                                  title="Gérer les terrains"
                                >
                                  <Home className="h-4 w-4" />
                                </Button>
                                {(isClub || isAdmin) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenJugeArbitreDialog(club.id)}
                                    title="Gérer les juges arbitres"
                                  >
                                    <Users className="h-4 w-4" />
                                  </Button>
                                )}
                                {(isAdmin || isJugeArbitre) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenDialog(club)}
                                    title="Modifier"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                {(isAdmin || isJugeArbitre) && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={deletingClubId === club.id}
                                        title="Supprimer"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Supprimer le Club</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Êtes-vous sûr de vouloir supprimer "{club.name}" ? Cette action est irréversible et supprimera tous les terrains associés.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel disabled={deletingClubId === club.id}>Annuler</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteClub(club.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                          disabled={deletingClubId === club.id}
                                        >
                                          {deletingClubId === club.id ? 'Suppression...' : 'Supprimer'}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Courts Management Dialog */}
          {selectedClubId && (
            <Dialog open={selectedClubId !== null} onOpenChange={(open) => {
              if (!open) {
                setSelectedClubId(null);
                setCourts([]);
              }
            }}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Gestion des Terrains</DialogTitle>
                  <DialogDescription>
                    Gérez les terrains du club {clubs.find(c => c.id === selectedClubId)?.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Terrains</h3>
                    <Button onClick={() => handleOpenCourtDialog(selectedClubId)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un Terrain
                    </Button>
                  </div>
                  {courts.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Aucun terrain pour ce club</p>
                  ) : (
                    <div className="space-y-2">
                      {courts.map((court) => {
                        const getCourtTypeInfo = (type: string) => {
                          switch (type) {
                            case 'inside':
                              return {
                                label: 'Intérieur',
                                icon: Home,
                                bgColor: 'bg-blue-50',
                                borderColor: 'border-blue-200',
                                textColor: 'text-blue-700',
                                iconColor: 'text-blue-600',
                                badgeColor: 'bg-blue-100 text-blue-800 border-blue-300'
                              };
                            case 'outside':
                              return {
                                label: 'Extérieur',
                                icon: Sun,
                                bgColor: 'bg-green-50',
                                borderColor: 'border-green-200',
                                textColor: 'text-green-700',
                                iconColor: 'text-green-600',
                                badgeColor: 'bg-green-100 text-green-800 border-green-300'
                              };
                            case 'covered':
                              return {
                                label: 'Couvert',
                                icon: Umbrella,
                                bgColor: 'bg-purple-50',
                                borderColor: 'border-purple-200',
                                textColor: 'text-purple-700',
                                iconColor: 'text-purple-600',
                                badgeColor: 'bg-purple-100 text-purple-800 border-purple-300'
                              };
                            default:
                              return {
                                label: 'Intérieur',
                                icon: Home,
                                bgColor: 'bg-gray-50',
                                borderColor: 'border-gray-200',
                                textColor: 'text-gray-700',
                                iconColor: 'text-gray-600',
                                badgeColor: 'bg-gray-100 text-gray-800 border-gray-300'
                              };
                          }
                        };

                        const typeInfo = getCourtTypeInfo(court.court_type);
                        const Icon = typeInfo.icon;

                        return (
                          <Card key={court.id} className={`${typeInfo.bgColor} ${typeInfo.borderColor} border-2`}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${typeInfo.bgColor} ${typeInfo.iconColor}`}>
                                    <Icon className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{court.court_name || `Terrain ${court.court_number}`}</div>
                                    {court.court_name && (
                                      <div className="text-xs text-gray-500">Terrain {court.court_number}</div>
                                    )}
                                    <Badge className={`mt-1 ${typeInfo.badgeColor} border`}>
                                      <Icon className="h-3 w-3 mr-1" />
                                      {typeInfo.label}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenCourtDialog(selectedClubId, court)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteCourt(court.id, selectedClubId)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Court Form Dialog */}
          <Dialog open={isCourtDialogOpen} onOpenChange={setIsCourtDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCourt ? 'Modifier le Terrain' : 'Nouveau Terrain'}</DialogTitle>
                <DialogDescription>
                  {editingCourt ? 'Modifiez les informations du terrain' : 'Ajoutez un nouveau terrain au club'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCourtSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="court_number">Numéro du Terrain *</Label>
                  <Input
                    id="court_number"
                    type="number"
                    min="1"
                    value={courtFormData.court_number}
                    onChange={(e) => setCourtFormData({ ...courtFormData, court_number: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="court_name">Nom du Terrain</Label>
                  <Input
                    id="court_name"
                    value={courtFormData.court_name}
                    onChange={(e) => setCourtFormData({ ...courtFormData, court_name: e.target.value })}
                    placeholder="Ex: Terrain Central"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="court_type">Type *</Label>
                  <Select value={courtFormData.court_type} onValueChange={(value: 'inside' | 'outside' | 'covered') => setCourtFormData({ ...courtFormData, court_type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inside">Intérieur</SelectItem>
                      <SelectItem value="outside">Extérieur</SelectItem>
                      <SelectItem value="covered">Couvert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setIsCourtDialogOpen(false); setEditingCourt(null); setCourtFormData({ court_number: '', court_name: '', court_type: 'inside' }); }}>
                    Annuler
                  </Button>
                  <Button type="submit">{editingCourt ? 'Modifier' : 'Créer'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Juge Arbitres Validation Dialog */}
          {selectedClubForValidation && (
            <Dialog open={selectedClubForValidation !== null} onOpenChange={(open) => {
              if (!open) {
                setSelectedClubForValidation(null);
                setJugeArbitres([]);
                setJugeArbitreEmail('');
              }
            }}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Gestion des Juges Arbitres</DialogTitle>
                  <DialogDescription>
                    Validez les juges arbitres pour le club {clubs.find(c => c.id === selectedClubForValidation)?.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Formulaire de validation */}
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-semibold">Valider un Juge Arbitre</h3>
                    <div className="space-y-2">
                      <Label htmlFor="juge_arbitre_email">Email NeyoPadel *</Label>
                      <Input
                        id="juge_arbitre_email"
                        type="email"
                        value={jugeArbitreEmail}
                        onChange={(e) => setJugeArbitreEmail(e.target.value)}
                        placeholder="email@neypadel.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        Entrez l'email du juge arbitre sur NeyoPadel. Si l'email n'existe pas encore, il sera lié quand le compte sera créé.
                      </p>
                    </div>
                    <Button 
                      onClick={handleValidateJugeArbitre} 
                      disabled={!jugeArbitreEmail.trim() || validating}
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
                  </div>

                  {/* Liste des juges arbitres validés */}
                  <div className="space-y-2">
                    <h3 className="font-semibold">Juges Arbitres Validés</h3>
                    {loadingJugeArbitres ? (
                      <div className="text-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                      </div>
                    ) : jugeArbitres.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun juge arbitre validé pour ce club
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {jugeArbitres.map((ja) => (
                          <Card key={ja.user_id} className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{ja.email}</div>
                                <div className="text-xs text-muted-foreground">
                                  Validé le {format(new Date(ja.validated_at), 'PPP', { locale: fr })}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnvalidateJugeArbitre(selectedClubForValidation, ja.user_id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

