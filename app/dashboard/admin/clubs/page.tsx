'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUserRole } from '@/hooks/use-user-role';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Building2, Loader2, Plus, X, Users, Home, Trash2, Edit } from 'lucide-react';
import { clubsAPI, clubManagersAPI, clubCourtsAPI, clubJugeArbitresAPI, type AppClub, type AppClubCourt } from '@/lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface User {
  id: string;
  email: string;
  role: 'player' | 'juge_arbitre' | 'admin' | 'club';
}

export default function AdminClubsPage() {
  const router = useRouter();
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [clubs, setClubs] = useState<AppClub[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [courts, setCourts] = useState<AppClubCourt[]>([]);
  const [isCourtDialogOpen, setIsCourtDialogOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<AppClubCourt | null>(null);
  const [courtFormData, setCourtFormData] = useState({
    court_number: '',
    court_name: '',
    court_type: 'inside' as 'inside' | 'outside' | 'covered',
  });
  const [jugeArbitres, setJugeArbitres] = useState<Array<{ user_id: string | null; email: string; validated_at: string }>>([]);
  const [loadingJugeArbitres, setLoadingJugeArbitres] = useState(false);
  const [jugeArbitreEmail, setJugeArbitreEmail] = useState('');
  const [validating, setValidating] = useState(false);
  const [isJugeArbitreDialogOpen, setIsJugeArbitreDialogOpen] = useState(false);
  const [selectedClubForJugeArbitres, setSelectedClubForJugeArbitres] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_email: '',
    contact_phone: '',
  });
  const [editingClub, setEditingClub] = useState<AppClub | null>(null);
  const [deletingClubId, setDeletingClubId] = useState<string | null>(null);

  // Redirect non-admin users
  useEffect(() => {
    if (!roleLoading && role !== 'admin') {
      router.push('/dashboard');
    }
  }, [role, roleLoading, router]);

  useEffect(() => {
    if (role === 'admin') {
      loadData();
    }
  }, [role]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clubsData, usersData] = await Promise.all([
        clubsAPI.listAll(),
        fetch('/api/admin/users').then(res => res.json()).then(data => data.users || []),
      ]);
      setClubs(clubsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitClub = async () => {
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
        const updated = await clubsAPI.update(editingClub.id, {
          name: formData.name,
          address: formData.address,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
        });

        if (updated) {
          toast({
            title: "Succès",
            description: "Club mis à jour avec succès",
          });
        } else {
          throw new Error('Failed to update club');
        }
      } else {
        const newClub = await clubsAPI.create({
          name: formData.name,
          address: formData.address,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          latitude: undefined,
          longitude: undefined,
          city: undefined,
          postal_code: undefined,
          country: undefined,
          country_code: undefined,
          website: undefined,
          instagram: undefined,
          facebook: undefined,
          manager: undefined,
        });

        if (newClub) {
          toast({
            title: "Succès",
            description: "Club créé avec succès",
          });
        } else {
          throw new Error('Failed to create club');
        }
      }

      setIsCreateDialogOpen(false);
      setEditingClub(null);
      setFormData({ name: '', address: '', contact_email: '', contact_phone: '' });
      await loadData();
    } catch (error: any) {
      console.error('Error saving club:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer le club",
        variant: "destructive",
      });
    }
  };

  const handleOpenEditClub = (club: AppClub) => {
    setEditingClub(club);
    setFormData({
      name: club.name,
      address: club.address,
      contact_email: club.contact_email,
      contact_phone: club.contact_phone,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDeleteClub = async (clubId: string) => {
    if (deletingClubId) return;
    setDeletingClubId(clubId);
    try {
      const result = await clubsAPI.delete(clubId);
      if (result.ok) {
        toast({
          title: 'Succès',
          description: 'Club supprimé avec succès',
        });
        await loadData();
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Impossible de supprimer le club',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error deleting club:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Échec de la suppression du club',
        variant: 'destructive',
      });
    } finally {
      setDeletingClubId(null);
    }
  };

  const handleAssignClub = async () => {
    if (!selectedClubId || !selectedUserId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un club et un utilisateur",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await clubManagersAPI.assign(selectedClubId, selectedUserId);
      if (result.ok) {
        toast({
          title: "Succès",
          description: "Club assigné avec succès",
        });
        setIsAssignDialogOpen(false);
        setSelectedClubId(null);
        setSelectedUserId(null);
        loadData();
      } else {
        throw new Error(result.error || 'Failed to assign club');
      }
    } catch (error: any) {
      console.error('Error assigning club:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'assigner le club",
        variant: "destructive",
      });
    }
  };

  const handleUnassignClub = async (clubId: string, userId: string) => {
    try {
      const result = await clubManagersAPI.unassign(clubId, userId);
      if (result.ok) {
        toast({
          title: "Succès",
          description: "Club retiré avec succès",
        });
        loadData();
      } else {
        throw new Error(result.error || 'Failed to unassign club');
      }
    } catch (error: any) {
      console.error('Error unassigning club:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de retirer le club",
        variant: "destructive",
      });
    }
  };

  const fetchCourts = async (clubId: string) => {
    try {
      const data = await clubCourtsAPI.listByClub(clubId);
      setCourts(data);
    } catch (error) {
      console.error('Error fetching courts:', error);
      toast({
        title: 'Erreur',
        description: "Impossible de charger les terrains du club",
        variant: 'destructive',
      });
    }
  };

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
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
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
            title: 'Succès',
            description: 'Terrain mis à jour avec succès !',
          });
          await fetchCourts(selectedClubId);
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
            title: 'Succès',
            description: 'Terrain créé avec succès !',
          });
          await fetchCourts(selectedClubId);
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
        title: 'Erreur',
        description: "Échec de l'enregistrement du terrain",
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCourt = async (courtId: string, clubId: string) => {
    try {
      const result = await clubCourtsAPI.delete(courtId);
      if (result.ok) {
        toast({
          title: 'Succès',
          description: 'Terrain supprimé avec succès !',
        });
        await fetchCourts(clubId);
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Impossible de supprimer le terrain',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting court:', error);
      toast({
        title: 'Erreur',
        description: 'Échec de la suppression du terrain',
        variant: 'destructive',
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
      toast({
        title: 'Erreur',
        description: "Impossible de charger les juges arbitres du club",
        variant: 'destructive',
      });
    } finally {
      setLoadingJugeArbitres(false);
    }
  };

  const handleOpenJugeArbitreDialog = async (clubId: string) => {
    setSelectedClubForJugeArbitres(clubId);
    setJugeArbitreEmail('');
    await loadJugeArbitres(clubId);
    setIsJugeArbitreDialogOpen(true);
  };

  const handleValidateJugeArbitre = async () => {
    if (!selectedClubForJugeArbitres || !jugeArbitreEmail.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez saisir un email',
        variant: 'destructive',
      });
      return;
    }

    setValidating(true);
    try {
      const result = await clubJugeArbitresAPI.validate(selectedClubForJugeArbitres, jugeArbitreEmail.trim());
      if (result.ok) {
        toast({
          title: 'Succès',
          description: 'Juge arbitre validé avec succès',
        });
        setJugeArbitreEmail('');
        await loadJugeArbitres(selectedClubForJugeArbitres);
      } else {
        throw new Error(result.error || 'Failed to validate juge arbitre');
      }
    } catch (error: any) {
      console.error('Error validating juge arbitre:', error);
      toast({
        title: 'Erreur',
        description: error.message || "Impossible de valider le juge arbitre",
        variant: 'destructive',
      });
    } finally {
      setValidating(false);
    }
  };

  const handleUnvalidateJugeArbitre = async (clubId: string, userId: string | null) => {
    if (!userId) return;
    try {
      const result = await clubJugeArbitresAPI.unvalidate(clubId, userId);
      if (result.ok) {
        toast({
          title: 'Succès',
          description: 'Juge arbitre retiré avec succès',
        });
        await loadJugeArbitres(clubId);
      } else {
        throw new Error(result.error || 'Failed to unvalidate juge arbitre');
      }
    } catch (error: any) {
      console.error('Error unvalidating juge arbitre:', error);
      toast({
        title: 'Erreur',
        description: error.message || "Impossible de retirer le juge arbitre",
        variant: 'destructive',
      });
    }
  };

  const getClubManagers = async (clubId: string) => {
    try {
      const managers = await clubManagersAPI.listUsersForClub(clubId);
      return managers;
    } catch (error) {
      console.error('Error loading club managers:', error);
      return [];
    }
  };

  const clubUsers = users.filter(u => u.role === 'club');

  if (roleLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (role !== 'admin') {
    return null; // Will redirect
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Building2 className="h-8 w-8" />
              Gestion des Clubs
            </h1>
            <p className="text-muted-foreground mt-2">
              Créez et gérez les clubs, assignez-les aux users "club"
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                setEditingClub(null);
                setFormData({ name: '', address: '', contact_email: '', contact_phone: '' });
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un club
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingClub ? 'Modifier le club' : 'Créer un nouveau club'}</DialogTitle>
                  <DialogDescription>
                    Tous les admins partagent une base unique de clubs
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Nom du club *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nom du club"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Adresse *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Adresse complète"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_email">Email de contact *</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      placeholder="contact@club.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_phone">Téléphone de contact *</Label>
                    <Input
                      id="contact_phone"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      placeholder="+33 1 23 45 67 89"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSubmitClub}>
                    {editingClub ? 'Modifier' : 'Créer'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
                  <Users className="h-4 w-4 mr-2" />
                  Assigner un club à un user "club"
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assigner un club à un user "club"</DialogTitle>
                  <DialogDescription>
                    Sélectionnez un club et un utilisateur avec le rôle "club"
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="club-select">Club *</Label>
                    <Select value={selectedClubId || ''} onValueChange={setSelectedClubId}>
                      <SelectTrigger id="club-select">
                        <SelectValue placeholder="Sélectionner un club" />
                      </SelectTrigger>
                      <SelectContent>
                        {clubs.map((club) => (
                          <SelectItem key={club.id} value={club.id}>
                            {club.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="user-select">User "club" *</Label>
                    <Select value={selectedUserId || ''} onValueChange={setSelectedUserId}>
                      <SelectTrigger id="user-select">
                        <SelectValue placeholder="Sélectionner un utilisateur" />
                      </SelectTrigger>
                      <SelectContent>
                        {clubUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {clubUsers.length === 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Aucun utilisateur avec le rôle "club". Assignez d'abord ce rôle à un utilisateur.
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAssignClub} disabled={!selectedClubId || !selectedUserId || clubUsers.length === 0}>
                    Assigner
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des Clubs ({clubs.length})</CardTitle>
            <CardDescription>
              Tous les clubs partagés par tous les admins
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {clubs.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun club trouvé</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Users "club" assignés</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clubs.map((club) => (
                    <ClubRow 
                      key={club.id} 
                      club={club} 
                      users={users}
                      clubUsers={clubUsers}
                      onUnassign={handleUnassignClub}
                      onRefresh={loadData}
                      onManageCourts={async () => {
                        setSelectedClubId(club.id);
                        await fetchCourts(club.id);
                        setIsCourtDialogOpen(true);
                      }}
                      onManageJugeArbitres={(clubId: string) => {
                        handleOpenJugeArbitreDialog(clubId);
                      }}
                      onEdit={() => handleOpenEditClub(club)}
                      onDelete={() => handleDeleteClub(club.id)}
                      deletingClubId={deletingClubId}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Courts Management Dialog */}
        {selectedClubId && (
          <Dialog open={isCourtDialogOpen} onOpenChange={(open) => {
            if (!open) {
              setIsCourtDialogOpen(false);
              setSelectedClubId(null);
              setCourts([]);
              setEditingCourt(null);
              setCourtFormData({
                court_number: '',
                court_name: '',
                court_type: 'inside',
              });
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
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <div className="font-medium">{court.court_name || `Terrain ${court.court_number}`}</div>
                            {court.court_name && (
                              <div className="text-xs text-gray-500">Terrain {court.court_number}</div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              Type : {court.court_type === 'inside' ? 'Intérieur' : court.court_type === 'outside' ? 'Extérieur' : 'Couvert'}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCourtDialog(selectedClubId, court)}
                            >
                              <Home className="h-4 w-4 mr-1" />
                              Modifier
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCourt(court.id, selectedClubId)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Supprimer
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-6 border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">
                  {editingCourt ? 'Modifier le Terrain' : 'Nouveau Terrain'}
                </h3>
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
                    <Select
                      value={courtFormData.court_type}
                      onValueChange={(value: 'inside' | 'outside' | 'covered') =>
                        setCourtFormData({ ...courtFormData, court_type: value })
                      }
                    >
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCourtDialogOpen(false);
                        setEditingCourt(null);
                        setCourtFormData({
                          court_number: '',
                          court_name: '',
                          court_type: 'inside',
                        });
                      }}
                    >
                      Annuler
                    </Button>
                    <Button type="submit">{editingCourt ? 'Modifier' : 'Créer'}</Button>
                  </DialogFooter>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Juge Arbitres Management Dialog */}
        {selectedClubForJugeArbitres && (
          <Dialog
            open={isJugeArbitreDialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                setIsJugeArbitreDialogOpen(false);
                setSelectedClubForJugeArbitres(null);
                setJugeArbitres([]);
                setJugeArbitreEmail('');
              }
            }}
          >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Gestion des Juges Arbitres</DialogTitle>
                <DialogDescription>
                  Validez les juges arbitres pour le club{' '}
                  {clubs.find((c) => c.id === selectedClubForJugeArbitres)?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
                      Entrez l&apos;email du juge arbitre sur NeyoPadel. Si l&apos;email n&apos;existe
                      pas encore, il sera lié quand le compte sera créé.
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
                        <Card key={ja.user_id || ja.email} className="p-4">
                          <CardContent className="flex items-center justify-between p-0">
                            <div>
                              <div className="font-medium">{ja.email}</div>
                              <div className="text-xs text-muted-foreground">
                                Validé le {format(new Date(ja.validated_at), 'PPP', { locale: fr })}
                              </div>
                            </div>
                            {ja.user_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleUnvalidateJugeArbitre(
                                    selectedClubForJugeArbitres,
                                    ja.user_id
                                  )
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </CardContent>
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
  );
}

function ClubRow({ 
  club, 
  users, 
  clubUsers,
  onUnassign,
  onRefresh,
  onManageCourts,
  onManageJugeArbitres,
  onEdit,
  onDelete,
  deletingClubId,
}: { 
  club: AppClub; 
  users: User[];
  clubUsers: User[];
  onUnassign: (clubId: string, userId: string) => void;
  onRefresh: () => void;
  onManageCourts: () => void;
  onManageJugeArbitres: (clubId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  deletingClubId: string | null;
}) {
  const [managers, setManagers] = useState<Array<{ user_id: string; email: string | null }>>([]);
  const [loadingManagers, setLoadingManagers] = useState(true);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadManagers = useCallback(async () => {
    setLoadingManagers(true);
    try {
      const data = await clubManagersAPI.listUsersForClub(club.id);
      // Matcher les user_id avec la liste des users pour obtenir les emails
      const managersWithEmails = data.map(manager => {
        const user = users.find(u => u.id === manager.user_id);
        return {
          user_id: manager.user_id,
          email: user?.email || null,
        };
      });
      setManagers(managersWithEmails);
    } catch (error) {
      console.error('Error loading managers:', error);
    } finally {
      setLoadingManagers(false);
    }
  }, [club.id, users]);

  useEffect(() => {
    loadManagers();
  }, [loadManagers]);

  const handleAssign = async () => {
    if (!selectedUserId) return;

    try {
      const result = await clubManagersAPI.assign(club.id, selectedUserId);
      if (result.ok) {
        toast({
          title: "Succès",
          description: "Club assigné avec succès",
        });
        setIsAssignDialogOpen(false);
        setSelectedUserId(null);
        loadManagers();
        onRefresh();
      } else {
        throw new Error(result.error || 'Failed to assign club');
      }
    } catch (error: any) {
      console.error('Error assigning club:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'assigner le club",
        variant: "destructive",
      });
    }
  };

  const availableUsers = clubUsers.filter(u => !managers.some(m => m.user_id === u.id));

  return (
    <TableRow>
      <TableCell className="font-medium">{club.name}</TableCell>
      <TableCell>{club.address}</TableCell>
      <TableCell>{club.contact_email}</TableCell>
      <TableCell>{club.contact_phone}</TableCell>
      <TableCell>
        {loadingManagers ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : managers.length === 0 ? (
          <span className="text-muted-foreground">Aucun</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {managers.map((manager) => (
              <Badge key={manager.user_id} variant="secondary" className="flex items-center gap-1">
                {manager.email || manager.user_id}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() => onUnassign(club.id, manager.user_id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            title="Modifier le club"
          >
            <Edit className="h-4 w-4 mr-1" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={deletingClubId === club.id}
                title="Supprimer le club"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer le club</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer "{club.name}" ? Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deletingClubId === club.id}>
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deletingClubId === club.id}
                >
                  {deletingClubId === club.id ? 'Suppression...' : 'Supprimer'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onManageJugeArbitres(club.id)}
            title="Gérer les juges arbitres"
          >
            <Users className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onManageCourts}
            title="Gérer les terrains"
          >
            <Home className="h-4 w-4" />
          </Button>
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-blue-600">
                <Users className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assigner ce club à un user "club"</DialogTitle>
              <DialogDescription>
                Sélectionnez un utilisateur avec le rôle "club"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="user-select">User "club" *</Label>
                <Select value={selectedUserId || ''} onValueChange={setSelectedUserId}>
                  <SelectTrigger id="user-select">
                    <SelectValue placeholder="Sélectionner un utilisateur" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Tous les users "club" sont déjà assignés à ce club, ou aucun user "club" n'existe.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleAssign} disabled={!selectedUserId || availableUsers.length === 0}>
                Assigner
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

