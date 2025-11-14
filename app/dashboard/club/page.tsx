'use client';

import { useState, useEffect, useCallback } from 'react';
import { clubsAPI, clubCourtsAPI, type AppClub, type AppClubCourt } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { useCurrentUserId } from '@/hooks/use-current-user';
import { useUserRole } from '@/hooks/use-user-role';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Mail, Phone, Globe, Instagram, Facebook, User, Plus, Edit, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ClubManagementPage() {
  const { toast } = useToast();
  const currentUserId = useCurrentUserId();
  const { isClub, isAdmin } = useUserRole();
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

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    website: '',
    instagram: '',
    facebook: '',
    manager: '',
    contact_email: '',
    contact_phone: '',
  });

  useEffect(() => {
    fetchClubs();
  }, [currentUserId]);

  const fetchClubs = async () => {
    try {
      if (!currentUserId) {
        setLoading(false);
        return;
      }
      const data = await clubsAPI.listMy();
      setClubs(data);
    } catch (error) {
      console.error('Error fetching clubs:', error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address || !formData.contact_email || !formData.contact_phone) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingClub) {
        const updated = await clubsAPI.update(editingClub.id, formData);
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
        const created = await clubsAPI.create(formData);
        if (created) {
          toast({
            title: "Succès",
            description: "Club créé avec succès !",
          });
          fetchClubs();
          setIsDialogOpen(false);
          resetForm();
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
  if (!isClub && !isAdmin) {
    return (
      <ProtectedRoute allowedRoles={['juge_arbitre', 'admin']}>
        <DashboardLayout>
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès restreint</h1>
            <p className="text-gray-600 mb-6">
              Seuls les profils Juge Arbitre et Admin peuvent accéder à la gestion des clubs.
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

  return (
    <ProtectedRoute allowedRoles={['juge_arbitre', 'admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mes Clubs</h1>
              <p className="text-gray-600 mt-1">Gérez vos clubs et leurs terrains</p>
            </div>
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
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Adresse *</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        required
                      />
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
                        placeholder="https://..."
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
                    <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                      Annuler
                    </Button>
                    <Button type="submit">{editingClub ? 'Modifier' : 'Créer'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clubs.map((club) => (
                  <Card key={club.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">{club.name}</CardTitle>
                          <CardDescription className="space-y-1">
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {club.address}
                            </div>
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-1" />
                              {club.contact_email}
                            </div>
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-1" />
                              {club.contact_phone}
                            </div>
                            {club.manager && (
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-1" />
                                {club.manager}
                              </div>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedClubId(club.id);
                              fetchCourts(club.id);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deletingClubId === club.id}
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
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {club.website && (
                          <a href={club.website} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-blue-600 hover:underline">
                            <Globe className="h-4 w-4 mr-1" />
                            Site web
                          </a>
                        )}
                        {club.instagram && (
                          <a href={`https://instagram.com/${club.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-pink-600 hover:underline">
                            <Instagram className="h-4 w-4 mr-1" />
                            Instagram
                          </a>
                        )}
                        {club.facebook && (
                          <a href={club.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-blue-700 hover:underline">
                            <Facebook className="h-4 w-4 mr-1" />
                            Facebook
                          </a>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={async () => {
                            setSelectedClubId(club.id);
                            await fetchCourts(club.id);
                          }}
                        >
                          Gérer les Terrains
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(club)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
                      {courts.map((court) => (
                        <Card key={court.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium">Terrain {court.court_number}</div>
                                {court.court_name && (
                                  <div className="text-sm text-gray-600">{court.court_name}</div>
                                )}
                                <Badge className="mt-1">
                                  {court.court_type === 'inside' ? 'Intérieur' : court.court_type === 'outside' ? 'Extérieur' : 'Couvert'}
                                </Badge>
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
                      ))}
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
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

