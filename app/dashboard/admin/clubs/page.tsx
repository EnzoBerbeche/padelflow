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
import { useToast } from '@/hooks/use-toast';
import { Building2, Loader2, Plus, X, Users } from 'lucide-react';
import { clubsAPI, clubManagersAPI, type AppClub } from '@/lib/supabase';
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
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_email: '',
    contact_phone: '',
  });

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

  const handleCreateClub = async () => {
    if (!formData.name || !formData.address || !formData.contact_email || !formData.contact_phone) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    try {
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
        setIsCreateDialogOpen(false);
        setFormData({ name: '', address: '', contact_email: '', contact_phone: '' });
        loadData();
      } else {
        throw new Error('Failed to create club');
      }
    } catch (error: any) {
      console.error('Error creating club:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le club",
        variant: "destructive",
      });
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
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un club
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouveau club</DialogTitle>
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
                  <Button onClick={handleCreateClub}>
                    Créer
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
                    <TableHead>Date de création</TableHead>
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
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function ClubRow({ 
  club, 
  users, 
  clubUsers,
  onUnassign,
  onRefresh 
}: { 
  club: AppClub; 
  users: User[];
  clubUsers: User[];
  onUnassign: (clubId: string, userId: string) => void;
  onRefresh: () => void;
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
      <TableCell>
        {format(new Date(club.created_at), 'PPP', { locale: fr })}
      </TableCell>
      <TableCell className="text-right">
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Users className="h-4 w-4 mr-1" />
              Assigner
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
      </TableCell>
    </TableRow>
  );
}

