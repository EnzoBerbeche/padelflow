'use client';

import { useState, useEffect } from 'react';
import { tournamentRegistrationsAPI, type AppTournament, type AppTournamentRegistration } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUserId } from '@/hooks/use-current-user';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface TournamentRegistrationsListProps {
  tournament: AppTournament;
  onUpdate?: () => void;
}

export function TournamentRegistrationsList({ tournament, onUpdate }: TournamentRegistrationsListProps) {
  const { toast } = useToast();
  const currentUserId = useCurrentUserId();
  const [registrations, setRegistrations] = useState<AppTournamentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<string | null>(null);
  const [myRegistrationId, setMyRegistrationId] = useState<string | null>(null);

  // Check if current user is tournament owner
  const isOwner = currentUserId === tournament.owner_id;

  useEffect(() => {
    loadRegistrations();
    loadMyRegistration();
  }, [tournament.id, currentUserId]);

  const loadMyRegistration = async () => {
    if (!currentUserId) {
      setMyRegistrationId(null);
      return;
    }
    try {
      const myReg = await tournamentRegistrationsAPI.getMyRegistration(tournament.id);
      setMyRegistrationId(myReg?.id || null);
    } catch (error) {
      console.error('Error loading my registration:', error);
      setMyRegistrationId(null);
    }
  };

  const loadRegistrations = async () => {
    setLoading(true);
    try {
      const data = await tournamentRegistrationsAPI.listByTournament(tournament.id);
      setRegistrations(data);
    } catch (error) {
      console.error('Error loading registrations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les inscriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTeamWeight = (reg: AppTournamentRegistration): number => {
    const rank1 = reg.player1_ranking || 9999;
    const rank2 = reg.player2_ranking || 9999;
    return rank1 + rank2;
  };

  // Sort registrations by team weight (ascending)
  const sortedByWeight = [...registrations].sort((a, b) => {
    const weightA = calculateTeamWeight(a);
    const weightB = calculateTeamWeight(b);
    return weightA - weightB;
  });

  // Sort registrations by creation date (ascending - first registered first)
  const sortedByDate = [...registrations].sort((a, b) => {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const isOrderMode = tournament.registration_selection_mode === 'order';
  const maxTeams = tournament.number_of_teams || 0;
  const waitlistSize = tournament.registration_waitlist_size || Math.floor(maxTeams / 2);

  // Get main list and waitlist based on mode
  const getMainListAndWaitlist = () => {
    if (isOrderMode) {
      // Mode "Ordre d'inscription"
      // Main list: first X teams by registration order, then sorted by weight for display
      const mainListByOrder = sortedByDate.slice(0, maxTeams);
      const mainList = mainListByOrder.sort((a, b) => {
        const weightA = calculateTeamWeight(a);
        const weightB = calculateTeamWeight(b);
        return weightA - weightB;
      });
      // Waitlist: next 8 teams by registration order (keep original order)
      const waitlist = sortedByDate.slice(maxTeams, maxTeams + waitlistSize);
      return { mainList, waitlist };
    } else {
      // Mode "Ranking" - all by weight
      const mainList = sortedByWeight.slice(0, maxTeams);
      const remaining = sortedByWeight.slice(maxTeams);
      const waitlist = remaining.slice(0, waitlistSize);
      return { mainList, waitlist };
    }
  };

  const { mainList, waitlist } = getMainListAndWaitlist();

  const handleDelete = async (registrationId: string) => {
    setDeletingId(registrationId);
    setOpenDeleteDialog(null);

    try {
      const result = await tournamentRegistrationsAPI.delete(registrationId);
      if (result.ok) {
        toast({
          title: "Succès",
          description: "Inscription supprimée avec succès",
        });
        await loadRegistrations();
        if (onUpdate) {
          onUpdate();
        }
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Impossible de supprimer l'inscription",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting registration:', error);
      toast({
        title: "Erreur",
        description: "Échec de la suppression",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center min-h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main registrations table */}
      <Card>
        <CardHeader>
          <CardTitle>Inscrits ({mainList.length} / {maxTeams})</CardTitle>
          <CardDescription>
            {isOrderMode 
              ? 'Équipes classées par poids d\'équipe (du plus bas au plus élevé)'
              : 'Équipes classées par ranking (du plus bas au plus élevé)'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {mainList.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune inscription pour le moment</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>J1 - Nom</TableHead>
                  <TableHead>J1 - Prénom</TableHead>
                  <TableHead>J1 - Classement</TableHead>
                  <TableHead>J2 - Nom</TableHead>
                  <TableHead>J2 - Prénom</TableHead>
                  <TableHead>J2 - Classement</TableHead>
                  <TableHead>Poids d'équipe</TableHead>
                  {(isOwner || myRegistrationId) && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mainList.map((reg) => {
                  const weight = calculateTeamWeight(reg);
                  return (
                    <TableRow key={reg.id}>
                      <TableCell className="font-medium">{reg.player1_last_name}</TableCell>
                      <TableCell>{reg.player1_first_name}</TableCell>
                      <TableCell>{reg.player1_ranking || '-'}</TableCell>
                      <TableCell className="font-medium">{reg.player2_last_name}</TableCell>
                      <TableCell>{reg.player2_first_name}</TableCell>
                      <TableCell>{reg.player2_ranking || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{weight}</Badge>
                      </TableCell>
                      {(isOwner || reg.id === myRegistrationId) && (
                        <TableCell className="text-right">
                          <AlertDialog open={openDeleteDialog === reg.id} onOpenChange={(open) => setOpenDeleteDialog(open ? reg.id : null)}>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deletingId === reg.id}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer l'inscription</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {isOwner 
                                    ? `Êtes-vous sûr de vouloir supprimer l'inscription de ${reg.player1_first_name} ${reg.player1_last_name} & ${reg.player2_first_name} ${reg.player2_last_name} ?`
                                    : 'Êtes-vous sûr de vouloir supprimer votre inscription ?'}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setOpenDeleteDialog(null)}>
                                  Annuler
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(reg.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={deletingId === reg.id}
                                >
                                  {deletingId === reg.id ? 'Suppression...' : 'Supprimer'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Waitlist */}
      {waitlist.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Liste d'attente ({waitlist.length})</CardTitle>
            <CardDescription>
              {isOrderMode 
                ? `Les ${waitlistSize} équipes suivantes, classées par ordre d'inscription`
                : `Les ${waitlistSize} équipes suivantes, classées par poids d'équipe`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>J1 - Nom</TableHead>
                  <TableHead>J1 - Prénom</TableHead>
                  <TableHead>J1 - Classement</TableHead>
                  <TableHead>J2 - Nom</TableHead>
                  <TableHead>J2 - Prénom</TableHead>
                  <TableHead>J2 - Classement</TableHead>
                  <TableHead>Poids d'équipe</TableHead>
                  {(isOwner || myRegistrationId) && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlist.map((reg) => {
                  const weight = calculateTeamWeight(reg);
                  return (
                    <TableRow key={reg.id}>
                      <TableCell className="font-medium">{reg.player1_last_name}</TableCell>
                      <TableCell>{reg.player1_first_name}</TableCell>
                      <TableCell>{reg.player1_ranking || '-'}</TableCell>
                      <TableCell className="font-medium">{reg.player2_last_name}</TableCell>
                      <TableCell>{reg.player2_first_name}</TableCell>
                      <TableCell>{reg.player2_ranking || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{weight}</Badge>
                      </TableCell>
                      {(isOwner || reg.id === myRegistrationId) && (
                        <TableCell className="text-right">
                          <AlertDialog open={openDeleteDialog === reg.id} onOpenChange={(open) => setOpenDeleteDialog(open ? reg.id : null)}>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deletingId === reg.id}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer l'inscription</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {isOwner 
                                    ? `Êtes-vous sûr de vouloir supprimer l'inscription de ${reg.player1_first_name} ${reg.player1_last_name} & ${reg.player2_first_name} ${reg.player2_last_name} ?`
                                    : 'Êtes-vous sûr de vouloir supprimer votre inscription ?'}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setOpenDeleteDialog(null)}>
                                  Annuler
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(reg.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={deletingId === reg.id}
                                >
                                  {deletingId === reg.id ? 'Suppression...' : 'Supprimer'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

