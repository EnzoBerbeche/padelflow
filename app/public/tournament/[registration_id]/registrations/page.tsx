'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { tournamentRegistrationsAPI, tournamentsAPI, type AppTournament, type AppTournamentRegistration } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Loader2, UserCog, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { use } from 'react';
import { useCurrentUserId } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/dashboard-layout';
import Link from 'next/link';

interface PublicRegistrationsPageProps {
  params: Promise<{ registration_id: string }>;
}

export default function PublicRegistrationsPage({ params }: PublicRegistrationsPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const currentUserId = useCurrentUserId();
  const { registration_id } = use(params);
  const [tournament, setTournament] = useState<AppTournament | null>(null);
  const [registrations, setRegistrations] = useState<AppTournamentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRegistration, setMyRegistration] = useState<AppTournamentRegistration | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, [registration_id, currentUserId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get tournament by registration_id
      const tournamentData = await tournamentRegistrationsAPI.getTournamentByRegistrationId(registration_id);
      if (!tournamentData) {
        console.error('Tournament not found');
        return;
      }

      setTournament(tournamentData);

      // Get all registrations for this tournament (public access)
      const regs = await tournamentRegistrationsAPI.listByRegistrationId(registration_id);
      setRegistrations(regs);

      // Load user's registration if authenticated
      if (currentUserId) {
        const myReg = await tournamentRegistrationsAPI.getMyRegistration(tournamentData.id);
        setMyRegistration(myReg);
      } else {
        setMyRegistration(null);
      }
    } catch (error) {
      console.error('Error loading data:', error);
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

  const isOrderMode = tournament?.registration_selection_mode === 'order';
  const maxTeams = tournament?.number_of_teams || 0;
  const waitlistSize = tournament?.registration_waitlist_size || Math.floor(maxTeams / 2);

  // Get main list and waitlist based on mode
  const getMainListAndWaitlist = () => {
    if (!tournament) return { mainList: [], waitlist: [] };

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

  const handleDelete = async () => {
    console.log('handleDelete called, myRegistration:', myRegistration);
    if (!myRegistration) {
      console.error('No registration to delete');
      return;
    }
    
    setDeleting(true);
    setOpenDeleteDialog(false);

    try {
      console.log('Attempting to delete registration:', myRegistration.id);
      const result = await tournamentRegistrationsAPI.delete(myRegistration.id);
      console.log('Delete result:', result);
      
      if (result.ok) {
        toast({
          title: "Succès",
          description: "Votre inscription a été supprimée",
        });
        // Redirect to player's tournament list after a short delay and refresh
        setTimeout(() => {
          router.push('/dashboard/tournois');
          router.refresh(); // Force refresh to reload data
        }, 1000);
      } else {
        console.error('Delete failed:', result.error);
        toast({
          title: "Erreur",
          description: result.error || "Impossible de supprimer l'inscription",
          variant: "destructive",
        });
        setDeleting(false);
      }
    } catch (error) {
      console.error('Error deleting registration:', error);
      toast({
        title: "Erreur",
        description: `Échec de la suppression: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        variant: "destructive",
      });
      setDeleting(false);
    }
  };

  const canModify = tournament?.registration_allow_partner_change && 
                    tournament?.registration_modification_deadline && 
                    new Date() <= new Date(tournament.registration_modification_deadline);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement des inscriptions...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!tournament) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Tournoi introuvable</h1>
            <p className="text-muted-foreground">Le lien d'inscription est invalide ou le tournoi n'existe plus.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{tournament.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <span className="font-medium">Date :</span>
                  <span className="ml-2">{format(new Date(tournament.date), 'PPP', { locale: fr })}</span>
                </div>
                {tournament.start_time && (
                  <div className="flex items-center">
                    <span className="font-medium">Heure :</span>
                    <span className="ml-2">{tournament.start_time}</span>
                  </div>
                )}
                {tournament.location && (
                  <div className="flex items-center">
                    <span className="font-medium">Lieu :</span>
                    <span className="ml-2">{tournament.location}</span>
                  </div>
                )}
              </div>
            </div>
            {myRegistration && (
              <div className="flex gap-2">
                {canModify && (
                  <Link href={`/register/${registration_id}`}>
                    <Button variant="outline" size="sm">
                      <UserCog className="h-4 w-4 mr-2" />
                      Changer de partenaire
                    </Button>
                  </Link>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-red-600 hover:text-red-700"
                  onClick={() => {
                    console.log('Delete button clicked, myRegistration:', myRegistration);
                    setOpenDeleteDialog(true);
                  }}
                  disabled={deleting || !myRegistration}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Se désinscrire
                </Button>
                <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Se désinscrire</AlertDialogTitle>
                      <AlertDialogDescription>
                        Êtes-vous sûr de vouloir vous désinscrire de ce tournoi ? Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={deleting}
                      >
                        {deleting ? 'Suppression...' : 'Se désinscrire'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>

        {/* Main registrations table */}
        <Card className="mb-6">
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

