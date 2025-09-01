'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BarChart3, Undo2, Share2, Download, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PadelScoreManager, type GameConfig } from '@/lib/padel-score-logic';
import { GameStats } from '@/components/game-stats';

// Types pour le suivi du match
interface PointAction {
  id: string;
  team: 'team1' | 'team2';
  player?: 'player1' | 'player2'; // Seulement pour team1
  action: string;
  timestamp: Date;
}

interface GameScore {
  sets: number[];
  current_set: number;
  current_game: number[];
  tie_break: boolean;
  tie_break_score?: number[];
}

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
  current_score: GameScore;
}

const POINT_ACTIONS = [
  { id: 'fault', label: 'Faute directe', icon: '❌', description: 'Filet, dehors, vitre ratée' },
  { id: 'winner', label: 'Point gagnant', icon: '🎯', description: 'Winner sans retour possible' },
  { id: 'smash', label: 'Smash gagnant', icon: '💥', description: 'Par3/Par4 gagnant' },
  { id: 'bandeja', label: 'Bandeja/Víborá', icon: '🏓', description: 'Bandeja ou Víborá gagnante' },
  { id: 'amorti', label: 'Amorti/Chiquita', icon: '🎾', description: 'Amorti ou Chiquita gagnante' },
  { id: 'lob', label: 'Lob gagnant', icon: '🌙', description: 'Lob qui finit le point' },
  { id: 'ace', label: 'Ace', icon: '🎯', description: 'Service gagnant direct' },
  { id: 'double_fault', label: 'Double faute', icon: '⚠️', description: 'Service raté deux fois' },
];

export default function GameTrackingPage() {
  const { toast } = useToast();
  const params = useParams();
  const gameId = params.id as string;
  
  const [game, setGame] = useState<PadelGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [pointHistory, setPointHistory] = useState<PointAction[]>([]);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<'player1' | 'player2' | null>(null);
  const [scoreManager, setScoreManager] = useState<PadelScoreManager | null>(null);

  useEffect(() => {
    if (gameId) {
      loadGame();
    }
  }, [gameId]);

  const loadGame = async () => {
    try {
      setLoading(true);
      // TODO: Implémenter l'API pour récupérer la partie
      // Pour l'instant, on utilise des données mockées
      const mockGame: PadelGame = {
        id: gameId,
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
      };
      
      setGame(mockGame);
      
      // Initialiser le gestionnaire de score
      const config: GameConfig = {
        sets_to_win: mockGame.sets_to_win,
        games_per_set: mockGame.games_per_set,
        no_advantage: mockGame.no_advantage,
        tie_break_enabled: true,
      };
      const manager = new PadelScoreManager(config);
      
      // Initialiser avec le score existant
      if (mockGame.current_score.sets.length > 0) {
        // Restaurer le score existant
        manager.restoreScore(mockGame.current_score);
      }
      
      setScoreManager(manager);
      
      // Charger l'historique des points
      const mockHistory: PointAction[] = [
        { id: '1', team: 'team1', player: 'player1', action: 'winner', timestamp: new Date() },
        { id: '2', team: 'team2', action: 'fault', timestamp: new Date() },
        { id: '3', team: 'team1', player: 'player2', action: 'smash', timestamp: new Date() },
      ];
      setPointHistory(mockHistory);
      
    } catch (error) {
      console.error('Error loading game:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la partie",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePointAction = (action: string) => {
    setSelectedAction(action);
    setSelectedPlayer(null);
  };

  const handlePlayerSelection = (player: 'player1' | 'player2') => {
    setSelectedPlayer(player);
    
    // Déterminer si c'est un point gagné ou perdu
    const isPointWon = ['winner', 'smash', 'bandeja', 'amorti', 'lob', 'ace'].includes(selectedAction!);
    
    if (isPointWon) {
      // Point gagné par notre équipe
      const newPoint: PointAction = {
        id: Date.now().toString(),
        team: 'team1',
        player,
        action: selectedAction!,
        timestamp: new Date(),
      };
      
      setPointHistory(prev => [newPoint, ...prev]);
      updateScore('team1');
      
      toast({
        title: "Point gagné !",
        description: `Point gagné par ${player === 'player1' ? game?.team1_player1 : game?.team1_player2}`,
      });
    } else {
      // Point perdu par notre équipe
      const newPoint: PointAction = {
        id: Date.now().toString(),
        team: 'team1',
        player,
        action: selectedAction!,
        timestamp: new Date(),
      };
      
      setPointHistory(prev => [newPoint, ...prev]);
      updateScore('team2'); // L'adversaire gagne le point
      
      toast({
        title: "Point perdu",
        description: `Faute commise par ${player === 'player1' ? game?.team1_player1 : game?.team1_player2}`,
        variant: "destructive",
      });
    }
    
    // Réinitialiser la sélection
    setSelectedAction(null);
    setSelectedPlayer(null);
  };

  const handleOpponentPoint = (action: string) => {
    const newPoint: PointAction = {
      id: Date.now().toString(),
      team: 'team2',
      action,
      timestamp: new Date(),
    };
    
    setPointHistory(prev => [newPoint, ...prev]);
    updateScore('team2');
    
    toast({
      title: "Point adverse",
      description: "Point gagné par l'équipe adverse",
      variant: "destructive",
    });
  };

  const updateScore = (team: 'team1' | 'team2') => {
    if (!game || !scoreManager) return;
    
    const result = scoreManager.addPoint(team);
    const newScore = scoreManager.getScore();
    
    setGame(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        current_score: newScore,
      };
    });
    
    // Vérifier si le match est terminé
    if (result.matchWon) {
      toast({
        title: "Match terminé !",
        description: `L'équipe ${team === 'team1' ? 'votre équipe' : 'adverse'} a gagné le match !`,
      });
      
      // Mettre à jour le statut
      setGame(prev => {
        if (!prev) return prev;
        return { ...prev, status: 'completed' as const };
      });
    }
  };

  const undoLastAction = () => {
    if (pointHistory.length === 0) return;
    
    setPointHistory(prev => prev.slice(1));
    // TODO: Mettre à jour le score en conséquence
    
    toast({
      title: "Action annulée",
      description: "Dernière action supprimée",
    });
  };

  const getActionStats = () => {
    const stats = {
      team1: { total: 0, actions: {} as Record<string, number> },
      team2: { total: 0, actions: {} as Record<string, number> },
      player1: { total: 0, actions: {} as Record<string, number> },
      player2: { total: 0, actions: {} as Record<string, number> },
    };

    pointHistory.forEach(point => {
      if (point.team === 'team1') {
        stats.team1.total++;
        stats.team1.actions[point.action] = (stats.team1.actions[point.action] || 0) + 1;
        
        if (point.player) {
          const playerKey = point.player as 'player1' | 'player2';
          stats[playerKey].total++;
          stats[playerKey].actions[point.action] = (stats[playerKey].actions[point.action] || 0) + 1;
        }
      } else {
        stats.team2.total++;
        stats.team2.actions[point.action] = (stats.team2.actions[point.action] || 0) + 1;
      }
    });

    return stats;
  };

  const formatScore = (score: GameScore) => {
    if (!scoreManager) return '0-0';
    return scoreManager.getFormattedScore();
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

  if (!game) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-12">
            <h2 className="text-xl font-medium text-gray-900 mb-2">Partie non trouvée</h2>
            <Button asChild>
              <Link href="/dashboard/game-analyzer">
                Retour à la liste
              </Link>
            </Button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const stats = getActionStats();

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/game-analyzer">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Suivi du match</h1>
                <p className="text-gray-600 mt-2">
                  {game.team1_player1} & {game.team1_player2} vs {game.team2_player1} & {game.team2_player2}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={undoLastAction} disabled={pointHistory.length === 0}>
                <Undo2 className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button variant="outline" onClick={() => setShowStats(!showStats)}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Stats
              </Button>
            </div>
          </div>

          {/* Score en temps réel - Format tennis standard */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl">Score du match</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Tableau de score principal */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="w-32"></th>
                        {scoreManager && scoreManager.getScore().sets.map((_, index) => (
                          <th key={index} className="px-3 py-2 text-center font-medium text-gray-700">
                            Set {index + 1}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-center font-medium text-gray-700">
                          Jeu
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-gray-700">
                          Points
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Équipe suivie */}
                      <tr className="border-b">
                        <td className="py-3 px-2">
                          <div className="bg-primary text-white px-3 py-2 rounded font-medium text-center">
                            {game.team1_player1} & {game.team1_player2}
                          </div>
                        </td>
                        {scoreManager && scoreManager.getScore().sets.map((setScore, index) => (
                          <td key={index} className="px-3 py-3 text-center">
                            <span className="text-xl font-bold">
                              {setScore}
                              {scoreManager.getScore().tie_break && index === scoreManager.getScore().current_set && (
                                <sup className="text-sm text-gray-600 ml-1">
                                  {scoreManager.getScore().tie_break_score?.[0] || 0}
                                </sup>
                              )}
                            </span>
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center">
                          <span className="text-lg font-medium">
                            {scoreManager ? scoreManager.getScore().current_game[0] : 0}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="text-lg font-medium text-gray-900 border-2 border-gray-300 px-3 py-1 rounded bg-gray-50">
                            {scoreManager ? scoreManager.getCurrentGameScore().split(' - ')[0] : '0'}
                          </div>
                        </td>
                      </tr>
                      {/* Équipe adverse */}
                      <tr>
                        <td className="py-3 px-2">
                          <div className="bg-gray-600 text-white px-3 py-2 rounded font-medium text-center">
                            {game.team2_player1} & {game.team2_player2}
                          </div>
                        </td>
                        {scoreManager && scoreManager.getScore().sets.map((setScore, index) => (
                          <td key={index} className="px-3 py-3 text-center">
                            <span className="text-xl font-bold">
                              {setScore}
                              {scoreManager.getScore().tie_break && index === scoreManager.getScore().current_set && (
                                <sup className="text-sm text-gray-600 ml-1">
                                  {scoreManager.getScore().tie_break_score?.[1] || 0}
                                </sup>
                              )}
                            </span>
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center">
                          <span className="text-lg font-medium">
                            {scoreManager ? scoreManager.getScore().current_game[1] : 0}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="text-lg font-medium text-gray-900 border-2 border-gray-300 px-3 py-1 rounded bg-gray-50">
                            {scoreManager ? scoreManager.getCurrentGameScore().split(' - ')[1] : '0'}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Informations du match */}
                <div className="text-center text-sm text-gray-600 space-y-1">
                  <div>
                    {game.sets_to_win === 1 ? '1 set' : `${game.sets_to_win} sets`} • {game.games_per_set} jeux
                    {game.no_advantage ? ' • No Ad' : ' • Avantage'}
                    {game.games_per_set === 9 && ' • Tie-break à 8-8'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions de points - Bloc principal unique */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="text-primary text-center">Mon équipe</CardTitle>
              <CardDescription className="text-center">
                Cliquez sur une raison pour enregistrer le point
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <h3 className="text-xl font-medium text-gray-900">
                  {game.team1_player1} & {game.team1_player2}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Colonne Points gagnés */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-2xl">✅</span>
                    <h4 className="text-lg font-semibold text-green-700">Points gagnés</h4>
                  </div>
                  
                  {selectedAction && ['winner', 'smash', 'bandeja', 'amorti', 'lob', 'ace'].includes(selectedAction) ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 text-center">
                        Sélectionnez le joueur responsable
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => handlePlayerSelection('player1')}
                          className="h-16 bg-green-50 hover:bg-green-100 border-green-200"
                        >
                          {game.team1_player1}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => handlePlayerSelection('player2')}
                          className="h-16 bg-green-50 hover:bg-green-100 border-green-200"
                        >
                          {game.team1_player2}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {POINT_ACTIONS.filter(action => 
                        ['winner', 'smash', 'bandeja', 'amorti', 'lob', 'ace'].includes(action.id)
                      ).map((action) => (
                        <Button
                          key={action.id}
                          variant="outline"
                          onClick={() => handlePointAction(action.id)}
                          className="h-20 flex flex-col items-center justify-center p-2 bg-green-50 hover:bg-green-100 border-green-200"
                        >
                          <div className="text-2xl mb-1">{action.icon}</div>
                          <div className="text-xs text-center font-medium">{action.label}</div>
                          {action.id === 'smash' && (
                            <div className="text-xs text-gray-500">Par3/Par4</div>
                          )}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Colonne Points perdus */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-2xl">❌</span>
                    <h4 className="text-lg font-semibold text-red-700">Points perdus</h4>
                  </div>
                  
                  {selectedAction && ['fault', 'double_fault'].includes(selectedAction) ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 text-center">
                        Sélectionnez qui a commis la faute
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => handlePlayerSelection('player1')}
                          className="h-16 bg-red-50 hover:bg-red-100 border-red-200"
                        >
                          {game.team1_player1}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => handlePlayerSelection('player2')}
                          className="h-16 bg-red-50 hover:bg-red-100 border-red-200"
                        >
                          {game.team1_player2}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {POINT_ACTIONS.filter(action => 
                        ['fault', 'double_fault'].includes(action.id)
                      ).map((action) => (
                        <Button
                          key={action.id}
                          variant="outline"
                          onClick={() => handlePointAction(action.id)}
                          className="h-20 flex flex-col items-center justify-center p-2 bg-red-50 hover:bg-red-100 border-red-200"
                        >
                          <div className="text-2xl mb-1">{action.icon}</div>
                          <div className="text-xs text-center font-medium">{action.label}</div>
                          {action.id === 'fault' && (
                            <div className="text-xs text-gray-500">Filet, dehors, vitre</div>
                          )}
                        </Button>
                      ))}
                      
                      {/* Actions adverses qui causent des points perdus */}
                      <Button
                        variant="outline"
                        onClick={() => handleOpponentPoint('smash')}
                        className="h-20 flex flex-col items-center justify-center p-2 bg-red-50 hover:bg-red-100 border-red-200"
                      >
                        <div className="text-2xl mb-1">💥</div>
                        <div className="text-xs text-center font-medium">Smash adverse</div>
                        <div className="text-xs text-gray-500">Par3/Par4</div>
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => handleOpponentPoint('winner')}
                        className="h-20 flex flex-col items-center justify-center p-2 bg-red-50 hover:bg-red-100 border-red-200"
                      >
                        <div className="text-2xl mb-1">🎯</div>
                        <div className="text-xs text-center font-medium">Retour raté</div>
                        <div className="text-xs text-gray-500">Winner adverse</div>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistiques */}
          {showStats && (
            <GameStats
              stats={stats}
              game={{
                team1_player1: game.team1_player1,
                team1_player2: game.team1_player2,
                team2_player1: game.team2_player1,
                team2_player2: game.team2_player2,
                status: game.status,
                created_at: game.created_at,
              }}
              onExport={() => {
                // TODO: Implémenter l'export CSV
                toast({
                  title: "Export",
                  description: "Fonctionnalité d'export à venir",
                });
              }}
              onShare={() => {
                // TODO: Implémenter le partage
                const shareText = `Match de padel : ${game.team1_player1} & ${game.team1_player2} vs ${game.team2_player1} & ${game.team2_player2}\nScore : ${formatScore(game.current_score)}\nStatistiques disponibles sur PadelFlow`;
                
                if (navigator.share) {
                  navigator.share({
                    title: 'Statistiques du match',
                    text: shareText,
                  });
                } else {
                  navigator.clipboard.writeText(shareText);
                  toast({
                    title: "Partagé !",
                    description: "Résumé copié dans le presse-papiers",
                  });
                }
              }}
            />
          )}

          {/* Historique des points */}
          <Card>
            <CardHeader>
              <CardTitle>Historique des points</CardTitle>
              <CardDescription>
                Derniers points enregistrés
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pointHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Aucun point enregistré pour le moment</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {pointHistory.map((point) => (
                    <div
                      key={point.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Badge variant={point.team === 'team1' ? 'default' : 'secondary'}>
                          {point.team === 'team1' ? 'Votre équipe' : 'Adversaires'}
                        </Badge>
                        {point.player && (
                          <span className="text-sm text-gray-600">
                            {point.player === 'player1' ? game.team1_player1 : game.team1_player2}
                          </span>
                        )}
                        <span className="text-sm text-gray-500">
                          {POINT_ACTIONS.find(a => a.id === point.action)?.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {point.timestamp.toLocaleTimeString()}
                      </span>
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
