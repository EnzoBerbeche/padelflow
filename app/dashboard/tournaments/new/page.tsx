'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowLeft, Clock, MapPin, Trophy, Users, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { tournamentsAPI, clubsAPI, type AppTournament, type AppClub } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { useCurrentUserId } from '@/hooks/use-current-user';
import { useUserRole } from '@/hooks/use-user-role';
import { Building2, Plus } from 'lucide-react';

// Supabase RLS enforces ownership

function TournamentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const currentUserId = useCurrentUserId();
  const { isClub, isAdmin, isJugeArbitre } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTournament, setEditingTournament] = useState<AppTournament | null>(null);
  const [clubs, setClubs] = useState<AppClub[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  
  // Load user's clubs
  // Admins et juges arbitres voient leurs clubs créés
  // Juges arbitres voient les clubs auxquels ils sont associés
  useEffect(() => {
    const fetchClubs = async () => {
      if (!currentUserId) {
        setLoadingClubs(false);
        return;
      }
      try {
        let userClubs: AppClub[] = [];
        if (isAdmin) {
          // Admins voient tous leurs clubs créés
          userClubs = await clubsAPI.listMy();
        } else if (isJugeArbitre) {
          // Juges arbitres voient uniquement les clubs auxquels ils sont associés
          userClubs = await clubsAPI.listAssociatedWithMe();
        } else {
          // Autres rôles ne peuvent pas créer de tournoi
          userClubs = [];
        }
        setClubs(userClubs);
      } catch (error) {
        console.error('Error fetching clubs:', error);
      } finally {
        setLoadingClubs(false);
      }
    };
    fetchClubs();
  }, [currentUserId, isAdmin, isJugeArbitre]);

  const [formData, setFormData] = useState({
    name: '',
    club_id: '',
    location: '',
    date: undefined as Date | undefined,
    level: '' as 'P25' | 'P100' | 'P250' | 'P500' | 'P1000' | 'P1500' | 'P2000' | '',
    start_time: '',
    number_of_courts: '',
    number_of_teams: '',
    conditions: '' as 'inside' | 'outside' | 'both' | '',
    type: '' as 'All' | 'Men' | 'Women' | 'Mixed' | '',
  });

  // Fallback effect to ensure form data is set when editing
  useEffect(() => {
    if (isEditing && editingTournament && !formData.name && clubs.length > 0) {
      // Find club by location (address) for editing
      const matchingClub = clubs.find(c => c.address === editingTournament.location);
      setFormData({
        name: editingTournament.name,
        club_id: matchingClub?.id || '',
        location: editingTournament.location,
        date: new Date(editingTournament.date),
        level: editingTournament.level,
        start_time: editingTournament.start_time,
        number_of_courts: editingTournament.number_of_courts.toString(),
        number_of_teams: editingTournament.number_of_teams.toString(),
        conditions: editingTournament.conditions,
        type: editingTournament.type,
      });
    }
  }, [isEditing, editingTournament, formData.name, clubs]);

  const processedEditId = useRef<string | null>(null);



  useEffect(() => {
    const editId = searchParams.get('edit');

    // Reset processedEditId if we're not editing
    if (!editId) {
      processedEditId.current = null;
      return;
    }

    // Wait for user to be loaded before processing edit
    if (currentUserId === null && editId) {
      return;
    }

    if (editId && editId !== processedEditId.current) {
      processedEditId.current = editId;
      (async () => {
        const tournament = await tournamentsAPI.getById(editId);
        if (tournament) {
          const canEdit = tournament.owner_id === currentUserId;
          if (canEdit) {
            setIsEditing(true);
            setEditingTournament(tournament);
            // Use club_id directly from tournament, or find by address as fallback
            let clubId = tournament.club_id || '';
            if (!clubId) {
              // Fallback: try to find club by address
              const matchingClub = clubs.find(c => c.address === tournament.location);
              clubId = matchingClub?.id || '';
            }
            setFormData({
              name: tournament.name,
              club_id: clubId,
              location: tournament.location,
              date: new Date(tournament.date),
              level: tournament.level,
              start_time: tournament.start_time,
              number_of_courts: tournament.number_of_courts.toString(),
              number_of_teams: tournament.number_of_teams.toString(),
              conditions: tournament.conditions,
              type: tournament.type,
            });
          }
        }
      })();
    }
  }, [searchParams, currentUserId, clubs]);

  const handleDuplicate = async () => {
    if (!editingTournament) return;

    setLoading(true);
    try {
      const tournament = await tournamentsAPI.create({
        name: `${editingTournament.name} (Copie)`,
        location: editingTournament.location,
        club_id: editingTournament.club_id,
        date: editingTournament.date,
        organizer_id: currentUserId || '',
        teams_locked: false,
        level: editingTournament.level,
        start_time: editingTournament.start_time,
        number_of_courts: editingTournament.number_of_courts,
        number_of_teams: editingTournament.number_of_teams,
        conditions: editingTournament.conditions,
        type: editingTournament.type,
        // Ne pas copier format_id, bracket, format_json, random_assignments
      });

      if (tournament) {
        toast({
          title: "Succès",
          description: "Tournoi dupliqué avec succès !",
        });
        router.push(`/dashboard/tournaments/${tournament.id}`);
      }
    } catch (error) {
      console.error('Error duplicating tournament:', error);
      toast({
        title: "Erreur",
        description: "Échec de la duplication du tournoi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.club_id || !formData.location || !formData.date || !formData.level || 
        !formData.start_time || !formData.number_of_courts || !formData.number_of_teams || !formData.conditions || !formData.type) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (isEditing && editingTournament) {
        // Update existing tournament in Supabase
        const updateData: any = {
          name: formData.name,
          location: formData.location,
          date: formData.date.toISOString().split('T')[0],
          level: formData.level,
          start_time: formData.start_time,
          number_of_courts: parseInt(formData.number_of_courts),
          number_of_teams: parseInt(formData.number_of_teams),
          conditions: formData.conditions,
          type: formData.type,
        };
        
        // Only include club_id if it's explicitly set (not empty string)
        if (formData.club_id) {
          updateData.club_id = formData.club_id;
        }
        
        await tournamentsAPI.update(editingTournament.id, updateData);

        toast({
          title: "Succès",
          description: "Tournoi mis à jour avec succès !",
        });

        router.push(`/dashboard/tournaments/${editingTournament.id}`);
      } else {
        // Create new tournament in Supabase
        const tournament = await tournamentsAPI.create({
          name: formData.name,
          location: formData.location,
          club_id: formData.club_id || undefined,
          date: formData.date.toISOString().split('T')[0],
          organizer_id: currentUserId || '',
          teams_locked: false,
          level: formData.level,
          start_time: formData.start_time,
          number_of_courts: parseInt(formData.number_of_courts),
          number_of_teams: parseInt(formData.number_of_teams),
          conditions: formData.conditions,
          type: formData.type,

        });

        toast({
          title: "Succès",
          description: "Tournoi créé avec succès !",
        });

        if (tournament) {
          router.push(`/dashboard/tournaments/${tournament.id}`);
        }
      }
    } catch (error) {
      console.error('Error saving tournament:', error);
      toast({
        title: "Erreur",
        description: isEditing ? "Échec de la mise à jour du tournoi" : "Échec de la création du tournoi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if user has permission to create tournaments
  if (!isJugeArbitre && !isAdmin) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-12">
          <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès restreint</h1>
          <p className="text-gray-600 mb-6">
            Seuls les profils Juge Arbitre et Admin peuvent créer des tournois.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au tableau de bord
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if juge arbitre has associated clubs
  if (isJugeArbitre && !isAdmin && !loadingClubs && clubs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-12">
          <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Aucun club associé</h1>
          <p className="text-gray-600 mb-6">
            Vous devez être validé par un club pour créer des tournois. Contactez un responsable de club pour qu'il vous valide.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au tableau de bord
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Modifier le Tournoi' : 'Créer un Nouveau Tournoi'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing ? 'Modifiez les détails de votre tournoi' : 'Configurez votre tournoi de padel avec tous les détails'}
          </p>
        </div>
      </div>

      {/* Warning for editing locked tournaments */}
      {isEditing && editingTournament?.teams_locked && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-yellow-800">
              <Trophy className="h-5 w-5" />
              <div>
                <p className="font-medium">Les équipes du tournoi sont verrouillées</p>
                <p className="text-sm">Vous ne pouvez modifier que les informations de base du tournoi. Pour modifier les équipes ou le format, déverrouillez d'abord les équipes.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-primary" />
              Informations de Base
            </CardTitle>
            <CardDescription>
              Détails essentiels du tournoi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du Tournoi *</Label>
                                 <Input
                   id="name"
                   placeholder="ex: Championnat de Printemps 2024"
                   value={formData.name}
                   onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                   required
                 />
              </div>

              <div className="space-y-2">
                <Label htmlFor="club_id">Club *</Label>
                {loadingClubs ? (
                  <div className="flex items-center justify-center h-10 border rounded-md">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                ) : clubs.length === 0 ? (
                  <div className="space-y-2">
                    <div className="p-4 border border-dashed border-gray-300 rounded-md text-center">
                      <Building2 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-3">
                        {isAdmin 
                          ? "Vous n'avez pas encore de club. Créez-en un pour continuer."
                          : "Vous n'avez pas encore de club associé. Un responsable de club doit vous valider pour que vous puissiez créer des tournois."}
                      </p>
                      {isAdmin && (
                        <Link href="/dashboard/club">
                          <Button type="button" variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Créer un club
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <Select
                    value={formData.club_id}
                    onValueChange={(value) => {
                      if (value === 'create_new') {
                        router.push('/dashboard/club');
                        return;
                      }
                      const selectedClub = clubs.find(c => c.id === value);
                      setFormData({
                        ...formData,
                        club_id: value,
                        location: selectedClub?.address || '',
                      });
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un club" />
                    </SelectTrigger>
                    <SelectContent>
                      {clubs.map((club) => (
                        <SelectItem key={club.id} value={club.id}>
                          {club.name} - {club.address}
                        </SelectItem>
                      ))}
                      <SelectItem value="create_new" className="text-primary font-medium border-t mt-1 pt-1">
                        <div className="flex items-center">
                          <Plus className="h-4 w-4 mr-2" />
                          Créer un nouveau club
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {formData.club_id && (
                  <p className="text-xs text-gray-500 mt-1">
                    Adresse: {formData.location}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Date du Tournoi *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? format(formData.date, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => setFormData({ ...formData, date })}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_time">Heure de Début *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tournament Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-primary" />
              Configuration du Tournoi
            </CardTitle>
            <CardDescription>
              Niveau, type et détails de participation du tournoi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Niveau du Tournoi *</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value: 'P25' | 'P100' | 'P250' | 'P500' | 'P1000' | 'P1500' | 'P2000') => 
                    setFormData({ ...formData, level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le niveau du tournoi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P25">P25</SelectItem>
                    <SelectItem value="P100">P100</SelectItem>
                    <SelectItem value="P250">P250</SelectItem>
                    <SelectItem value="P500">P500</SelectItem>
                    <SelectItem value="P1000">P1000</SelectItem>
                    <SelectItem value="P1500">P1500</SelectItem>
                    <SelectItem value="P2000">P2000</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type de Tournoi *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'All' | 'Men' | 'Women' | 'Mixed') => 
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le type de tournoi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">Toutes Catégories</SelectItem>
                    <SelectItem value="Men">Hommes Seulement</SelectItem>
                    <SelectItem value="Women">Femmes Seulement</SelectItem>
                    <SelectItem value="Mixed">Double Mixte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="number_of_teams">Nombre d'Équipes *</Label>
                <Input
                  id="number_of_teams"
                  type="number"
                  min="1"
                  max="50"
                  placeholder="ex: 8"
                  value={formData.number_of_teams}
                  onChange={(e) => setFormData({ ...formData, number_of_teams: e.target.value })}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Venue Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-primary" />
              Informations sur le Lieu
            </CardTitle>
            <CardDescription>
              Détails des terrains et conditions de jeu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="number_of_courts">Nombre de Terrains *</Label>
                <Input
                  id="number_of_courts"
                  type="number"
                  min="1"
                  max="20"
                  placeholder="ex: 4"
                  value={formData.number_of_courts}
                  onChange={(e) => setFormData({ ...formData, number_of_courts: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Conditions de Jeu *</Label>
                <Select
                  value={formData.conditions}
                  onValueChange={(value: 'inside' | 'outside' | 'both') => 
                    setFormData({ ...formData, conditions: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner les conditions de jeu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inside">Terrains Intérieurs</SelectItem>
                    <SelectItem value="outside">Terrains Extérieurs</SelectItem>
                    <SelectItem value="both">Intérieur & Extérieur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center pt-6">
          {isEditing && editingTournament && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDuplicate}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <Copy className="h-4 w-4" />
              <span>Dupliquer</span>
            </Button>
          )}
          <div className="flex space-x-4 ml-auto">
            <Link href="/dashboard">
              <Button variant="outline" type="button">
                Annuler
              </Button>
            </Link>
            <Button type="submit" disabled={loading} className="min-w-32">
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEditing ? 'Mise à jour...' : 'Création...'}
                </div>
              ) : (
                <>
                  <Trophy className="h-4 w-4 mr-2" />
                  {isEditing ? 'Modifier le Tournoi' : 'Créer le Tournoi'}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
        <div>
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-96 bg-gray-200 rounded animate-pulse mt-2"></div>
        </div>
      </div>
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-64 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
    </div>
  );
}

export default function NewTournament() {
  return (
      <ProtectedRoute allowedRoles={['juge_arbitre', 'admin']}>
      <DashboardLayout>
        <Suspense fallback={<LoadingFallback />}>
          <TournamentForm />
        </Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  );
}