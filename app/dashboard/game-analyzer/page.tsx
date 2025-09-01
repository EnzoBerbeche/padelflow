'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Play, BarChart3, Calendar, Users, Clock, Eye } from 'lucide-react';
import { useCurrentUserId } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Types pour les parties de padel
interface PadelGame {
  id: string;
  team1_player1: string;
  team1_player2: string;
  team2_player1: string;
  team2_player2: string;
  sets_to_win: number;
  games_per_set: number;
  no_advantage: boolean;
  status: 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  current_score: {
    sets: number[];
    current_set: number;
    current_game: number[];
    tie_break: boolean;
  };
}

export default function GameAnalyzerPage() {
  const { toast } = useToast();
  const currentUserId = useCurrentUserId();
  const [games, setGames] = useState<PadelGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUserId) {
      fetchGames();
    }
  }, [currentUserId]);

  const fetchGames = async () => {
    try {
      setLoading(true);
      // TODO: Implémenter l'API pour récupérer les parties
      // Pour l'instant, on utilise des données mockées
      const mockGames: PadelGame[] = [
        {
          id: '1',
          team1_player1: 'Jean Dupont',
          team1_player2: 'Marie Martin',
          team2_player1: 'Pierre Durand',
          team2_player2: 'Sophie Bernard',
          sets_to_win: 2,
          games_per_set: 6,
          no_advantage: true,
          status: 'in_progress',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          current_score: {
            sets: [6, 4],
            current_set: 2,
            current_game: [3, 2],
            tie_break: false,
          },
        },
        {
          id: '2',
          team1_player1: 'Alexandre Moreau',
          team1_player2: 'Camille Petit',
          team2_player1: 'Thomas Roux',
          team2_player2: 'Julie Leroy',
          sets_to_win: 2,
          games_per_set: 6,
          no_advantage: false,
          status: 'completed',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString(),
          current_score: {
            sets: [6, 4, 6],
            current_set: 3,
            current_game: [0, 0],
            tie_break: false,
          },
        },
      ];
      
      setGames(mockGames);
    } catch (error) {
      console.error('Error fetching games:', error);
      toast({
        title: "Error",
        description: "Failed to load games",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'in_progress') {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">En cours</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 border-green-200">Terminé</Badge>;
  };

  const formatScore = (game: PadelGame) => {
    const { sets, current_set, current_game } = game.current_score;
    const currentSetIndex = current_set - 1;
    
    let scoreDisplay = sets.map((set, index) => {
      if (index === currentSetIndex) {
        return `${set}-${current_game[0]}`;
      }
      return set.toString();
    }).join(' | ');
    
    if (game.current_score.tie_break) {
      scoreDisplay += ' (TB)';
    }
    
    return scoreDisplay;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Game Analyzer</h1>
              <p className="text-gray-600 mt-2">
                Suivez vos matchs de padel point par point et analysez vos performances
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/game-analyzer/new">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle partie
              </Link>
            </Button>
          </div>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Parties totales</CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{games.length}</div>
                <p className="text-xs text-muted-foreground">
                  Toutes vos parties
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En cours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {games.filter(g => g.status === 'in_progress').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Parties actives
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Terminées</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {games.filter(g => g.status === 'completed').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Parties finies
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Format préféré</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {games.filter(g => g.no_advantage).length > games.filter(g => !g.no_advantage).length ? 'No Ad' : 'Avantage'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Règle la plus utilisée
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Liste des parties */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="h-5 w-5" />
                <span>Vos parties ({games.length})</span>
              </CardTitle>
              <CardDescription>
                Gérez et suivez vos matchs de padel
              </CardDescription>
            </CardHeader>
            <CardContent>
              {games.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Play className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Aucune partie créée</h3>
                  <p className="mb-6">Commencez par créer votre première partie pour analyser vos performances</p>
                  <Button asChild>
                    <Link href="/dashboard/game-analyzer/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Créer une partie
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {games.map((game) => (
                    <div
                      key={game.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">
                              {game.team1_player1} & {game.team1_player2}
                            </h3>
                            <p className="text-sm text-gray-500">
                              vs {game.team2_player1} & {game.team2_player2}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900">
                              {formatScore(game)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {game.sets_to_win === 1 ? '1 set' : `${game.sets_to_win} sets`} • {game.games_per_set} jeux
                              {game.no_advantage ? ' • No Ad' : ' • Avantage'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 ml-6">
                        {getStatusBadge(game.status)}
                        <div className="text-sm text-gray-500">
                          {format(new Date(game.created_at), 'dd/MM/yyyy', { locale: fr })}
                        </div>
                        <Button asChild size="sm">
                          <Link href={`/dashboard/game-analyzer/${game.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            {game.status === 'in_progress' ? 'Continuer' : 'Voir'}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
