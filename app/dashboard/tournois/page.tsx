'use client';

import { useState, useEffect } from 'react';
import { tournamentsAPI, type AppTournament, type AppTournamentRegistration } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trophy, Calendar, MapPin, Search, ExternalLink, Clock, Users, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type TournamentWithRegistration = AppTournament & { registration: AppTournamentRegistration; club_name?: string };

type SortField = 'name' | 'date' | 'location' | 'status' | 'level';
type SortDirection = 'asc' | 'desc' | null;

export default function TournoisPage() {
  const [myRegistrations, setMyRegistrations] = useState<TournamentWithRegistration[]>([]);
  const [allTournaments, setAllTournaments] = useState<(AppTournament & { club_name?: string })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    loadMyRegistrations();
    loadAllTournaments();
  }, []);

  const loadMyRegistrations = async () => {
    try {
      const data = await tournamentsAPI.listMyRegistrations();
      setMyRegistrations(data);
    } catch (error) {
      console.error('Error loading registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllTournaments = async () => {
    setLoadingSearch(true);
    try {
      const data = await tournamentsAPI.listAll();
      setAllTournaments(data);
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoadingSearch(false);
    }
  };

  // Get tournaments where user is NOT registered
  const getAvailableTournaments = () => {
    const registeredIds = new Set(myRegistrations.map(r => r.id));
    return allTournaments.filter(t => !registeredIds.has(t.id));
  };

  // Filter tournaments by search query
  const getFilteredTournaments = () => {
    const available = getAvailableTournaments();
    if (!searchQuery.trim()) return available;

    const query = searchQuery.toLowerCase();
    return available.filter(t => 
      t.name.toLowerCase().includes(query) ||
      t.location?.toLowerCase().includes(query) ||
      format(new Date(t.date), 'dd MMMM yyyy', { locale: fr }).toLowerCase().includes(query)
    );
  };

  // Sort registrations
  const getSortedRegistrations = () => {
    const sorted = [...myRegistrations];
    if (!sortDirection) return sorted;

    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'location':
          aValue = (a.location || '').toLowerCase();
          bValue = (b.location || '').toLowerCase();
          break;
        case 'status':
          aValue = a.registration.status;
          bValue = b.registration.status;
          break;
        case 'level':
          aValue = a.level || '';
          bValue = b.level || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  // Sort tournaments
  const getSortedTournaments = () => {
    const filtered = getFilteredTournaments();
    if (!sortDirection) return filtered;

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'location':
          aValue = (a.location || '').toLowerCase();
          bValue = (b.location || '').toLowerCase();
          break;
        case 'level':
          aValue = a.level || '';
          bValue = b.level || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4 ml-1" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="h-4 w-4 ml-1" />;
    }
    return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'pending': { label: 'En attente', variant: 'secondary' as const },
      'confirmed': { label: 'Confirmé', variant: 'default' as const },
      'waitlist': { label: 'Liste d\'attente', variant: 'outline' as const },
      'cancelled': { label: 'Annulé', variant: 'destructive' as const },
    };
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getLevelColor = (level: string) => {
    const colors = {
      'P25': 'bg-green-100 text-green-800',
      'P100': 'bg-blue-100 text-blue-800',
      'P250': 'bg-purple-100 text-purple-800',
      'P500': 'bg-orange-100 text-orange-800',
      'P1000': 'bg-red-100 text-red-800',
      'P1500': 'bg-pink-100 text-pink-800',
      'P2000': 'bg-gray-100 text-gray-800',
    };
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tournois</h1>
          <p className="text-muted-foreground">
            Consultez vos inscriptions et recherchez de nouveaux tournois
          </p>
        </div>

        <Tabs defaultValue="my-registrations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="my-registrations">Mes Inscriptions</TabsTrigger>
            <TabsTrigger value="search">Rechercher des Tournois</TabsTrigger>
          </TabsList>

          <TabsContent value="my-registrations" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center min-h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : myRegistrations.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucune inscription</h3>
                    <p className="text-muted-foreground mb-4">
                      Vous n'êtes inscrit à aucun tournoi pour le moment.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Utilisez l'onglet "Rechercher des Tournois" pour trouver et vous inscrire à des tournois.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('name')}>
                          <div className="flex items-center">
                            Nom du tournoi
                            {getSortIcon('name')}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('date')}>
                          <div className="flex items-center">
                            Date
                            {getSortIcon('date')}
                          </div>
                        </TableHead>
                        <TableHead>Club</TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('level')}>
                          <div className="flex items-center">
                            Niveau
                            {getSortIcon('level')}
                          </div>
                        </TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('status')}>
                          <div className="flex items-center">
                            Statut
                            {getSortIcon('status')}
                          </div>
                        </TableHead>
                        <TableHead>Équipe</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getSortedRegistrations().map((tournament) => (
                        <TableRow key={tournament.id}>
                          <TableCell className="font-medium">{tournament.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(new Date(tournament.date), 'dd MMM yyyy', { locale: fr })}
                            </div>
                          </TableCell>
                          <TableCell>
                            {tournament.club_name ? (
                              <span className="font-medium">{tournament.club_name}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {tournament.level ? (
                              <Badge className={getLevelColor(tournament.level)}>
                                {tournament.level}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {tournament.type ? (
                              <Badge variant="outline">{tournament.type}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(tournament.registration.status)}</TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {tournament.registration.player1_first_name} {tournament.registration.player1_last_name}
                              {' & '}
                              {tournament.registration.player2_first_name} {tournament.registration.player2_last_name}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {tournament.registration_id ? (
                              <Link href={`/public/tournament/${tournament.registration_id}/registrations`}>
                                <Button variant="outline" size="sm">
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Voir
                                </Button>
                              </Link>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, lieu ou date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {loadingSearch ? (
              <div className="flex items-center justify-center min-h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : getFilteredTournaments().length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchQuery ? 'Aucun résultat' : 'Aucun tournoi disponible'}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchQuery 
                        ? 'Essayez avec d\'autres mots-clés'
                        : 'Il n\'y a pas de nouveaux tournois disponibles pour le moment.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('name')}>
                          <div className="flex items-center">
                            Nom du tournoi
                            {getSortIcon('name')}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('date')}>
                          <div className="flex items-center">
                            Date
                            {getSortIcon('date')}
                          </div>
                        </TableHead>
                        <TableHead>Club</TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('level')}>
                          <div className="flex items-center">
                            Niveau
                            {getSortIcon('level')}
                          </div>
                        </TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Équipes</TableHead>
                        <TableHead>Heure</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getSortedTournaments().map((tournament) => (
                        <TableRow key={tournament.id}>
                          <TableCell className="font-medium">{tournament.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(new Date(tournament.date), 'dd MMM yyyy', { locale: fr })}
                            </div>
                          </TableCell>
                          <TableCell>
                            {tournament.club_name ? (
                              <span className="font-medium">{tournament.club_name}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {tournament.level ? (
                              <Badge className={getLevelColor(tournament.level)}>
                                {tournament.level}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {tournament.type ? (
                              <Badge variant="outline">{tournament.type}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {tournament.number_of_teams ? (
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                {tournament.number_of_teams}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {tournament.start_time ? (
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                {tournament.start_time}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {tournament.registration_enabled && tournament.registration_id ? (
                              <Link href={`/register/${tournament.registration_id}`}>
                                <Button size="sm">
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  S'inscrire
                                </Button>
                              </Link>
                            ) : (
                              <Button variant="outline" size="sm" disabled>
                                Fermé
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

