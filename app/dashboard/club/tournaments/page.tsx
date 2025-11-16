'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { tournamentsAPI, type AppTournament } from '@/lib/supabase';
import { useUserRole } from '@/hooks/use-user-role';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CalendarDays, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

export default function ClubTournamentsPage() {
  const { isClub, isAdmin, isJugeArbitre } = useUserRole();
  const [tournaments, setTournaments] = useState<(AppTournament & { club_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await tournamentsAPI.listForManagedClubs();
        setTournaments(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // les users club ont accès, on autorise aussi admin / JA si jamais
  if (!isClub && !isAdmin && !isJugeArbitre) {
    return (
      <ProtectedRoute allowedRoles={['club', 'juge_arbitre', 'admin']}>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès restreint</h1>
              <p className="text-gray-600">Seuls les profils Club, Juge Arbitre et Admin peuvent accéder à cette page.</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['club', 'juge_arbitre', 'admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mes Tournois</h1>
            <p className="text-gray-600 mt-1">
              Liste des tournois organisés dans les clubs qui vous ont été assignés. Vous pouvez consulter les inscrits.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tournois ({tournaments.length})</CardTitle>
              <CardDescription>
                Vue en lecture seule : seuls les Juges Arbitres peuvent créer ou modifier les tournois.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {tournaments.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Aucun tournoi pour l&apos;instant dans vos clubs. Les tournois apparaîtront ici dès qu&apos;un juge arbitre en créera.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Club</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tournaments.map((tournament) => (
                      <TableRow key={tournament.id}>
                        <TableCell className="font-medium">{tournament.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                            <span className="truncate max-w-xs">
                              {tournament.club_name || tournament.location}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <CalendarDays className="h-4 w-4 mr-1 text-muted-foreground" />
                            {format(new Date(tournament.date), 'PPP', { locale: fr })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tournament.level}</Badge>
                        </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {tournament.type === 'Men'
                                ? 'Messieurs'
                                : tournament.type === 'Women'
                                ? 'Dames'
                                : tournament.type === 'Mixed'
                                ? 'Mixte'
                                : 'Tous'}
                            </Badge>
                          </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!tournament.registration_id}
                            onClick={() => {
                              if (!tournament.registration_id) return;
                              router.push(`/public/tournament/${tournament.registration_id}/registrations`);
                            }}
                            title={
                              tournament.registration_id
                                ? 'Voir les inscrits (page publique)'
                                : 'Ce tournoi n’a pas encore de page d’inscription publique'
                            }
                          >
                            <Users className="h-4 w-4 mr-1" />
                            Voir les inscrits
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}


