'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Share2, Download, FileText, TrendingUp, TrendingDown, Target, Award, Clock, Users } from 'lucide-react';

interface PointAction {
  id: string;
  team: 'team1' | 'team2';
  player?: 'player1' | 'player2';
  action: string;
  timestamp: Date;
}

interface GameStats {
  team1: { total: number; actions: Record<string, number> };
  team2: { total: number; actions: Record<string, number> };
  player1: { total: number; actions: Record<string, number> };
  player2: { total: number; actions: Record<string, number> };
}

interface GameStatsProps {
  stats: GameStats;
  game: {
    team1_player1: string;
    team1_player2: string;
    team2_player1: string;
    team2_player2: string;
    status: 'in_progress' | 'completed';
    created_at: string;
  };
  onExport: () => void;
  onShare: () => void;
}

const POINT_ACTIONS = [
  { id: 'fault', label: 'Faute directe', icon: '❌', color: 'bg-red-100 text-red-800' },
  { id: 'winner', label: 'Point gagnant', icon: '🎯', color: 'bg-green-100 text-green-800' },
  { id: 'smash', label: 'Smash gagnant', icon: '💥', color: 'bg-blue-100 text-blue-800' },
  { id: 'bandeja', label: 'Bandeja/Víborá', icon: '🏓', color: 'bg-purple-100 text-purple-800' },
  { id: 'amorti', label: 'Amorti/Chiquita', icon: '🎾', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'lob', label: 'Lob gagnant', icon: '🌙', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'ace', label: 'Ace', icon: '🎯', color: 'bg-emerald-100 text-emerald-800' },
  { id: 'double_fault', label: 'Double faute', icon: '⚠️', color: 'bg-orange-100 text-orange-800' },
];

export function GameStats({ stats, game, onExport, onShare }: GameStatsProps) {
  const totalPoints = stats.team1.total + stats.team2.total;
  const team1Percentage = totalPoints > 0 ? Math.round((stats.team1.total / totalPoints) * 100) : 0;
  const team2Percentage = totalPoints > 0 ? Math.round((stats.team2.total / totalPoints) * 100) : 0;

  const getActionPercentage = (actionId: string, team: 'team1' | 'team2') => {
    const teamTotal = stats[team].total;
    if (teamTotal === 0) return 0;
    const actionCount = stats[team].actions[actionId] || 0;
    return Math.round((actionCount / teamTotal) * 100);
  };

  const getPlayerEfficiency = (player: 'player1' | 'player2') => {
    const playerStats = stats[player];
    if (playerStats.total === 0) return 0;
    
    // Calculer l'efficacité basée sur les actions positives
    const positiveActions = (playerStats.actions['winner'] || 0) + 
                          (playerStats.actions['smash'] || 0) + 
                          (playerStats.actions['bandeja'] || 0) + 
                          (playerStats.actions['amorti'] || 0) + 
                          (playerStats.actions['lob'] || 0) + 
                          (playerStats.actions['ace'] || 0);
    
    return Math.round((positiveActions / playerStats.total) * 100);
  };

  return (
    <div className="space-y-6">
      {/* En-tête des statistiques */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Statistiques du match</h2>
          <p className="text-gray-600">Analyse détaillée des performances</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={onShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Partager
          </Button>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistiques générales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points totaux</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPoints}</div>
            <p className="text-xs text-muted-foreground">
              Total des points joués
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Votre équipe</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.team1.total}</div>
            <p className="text-xs text-muted-foreground">
              {team1Percentage}% des points
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adversaires</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.team2.total}</div>
            <p className="text-xs text-muted-foreground">
              {team2Percentage}% des points
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Statut</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={game.status === 'completed' ? 'default' : 'secondary'}>
                {game.status === 'completed' ? 'Terminé' : 'En cours'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(game.created_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance par joueur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Performance par joueur</span>
          </CardTitle>
          <CardDescription>
            Analyse individuelle des performances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Joueur 1 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{game.team1_player1}</h3>
                <Badge className="bg-blue-100 text-blue-800">
                  {stats.player1.total} points
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Efficacité</span>
                  <span className="font-medium text-green-600">
                    {getPlayerEfficiency('player1')}%
                  </span>
                </div>
                
                <div className="space-y-2">
                  {POINT_ACTIONS.map((action) => {
                    const count = stats.player1.actions[action.id] || 0;
                    if (count === 0) return null;
                    
                    return (
                      <div key={action.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{action.icon}</span>
                          <span className="text-sm text-gray-600">{action.label}</span>
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Joueur 2 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{game.team1_player2}</h3>
                <Badge className="bg-blue-100 text-blue-800">
                  {stats.player2.total} points
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Efficacité</span>
                  <span className="font-medium text-green-600">
                    {getPlayerEfficiency('player2')}%
                  </span>
                </div>
                
                <div className="space-y-2">
                  {POINT_ACTIONS.map((action) => {
                    const count = stats.player2.actions[action.id] || 0;
                    if (count === 0) return null;
                    
                    return (
                      <div key={action.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{action.icon}</span>
                          <span className="text-sm text-gray-600">{action.label}</span>
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Répartition des actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>Répartition des actions</span>
          </CardTitle>
          <CardDescription>
            Comparaison des types d'actions par équipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {POINT_ACTIONS.map((action) => {
              const team1Count = stats.team1.actions[action.id] || 0;
              const team2Count = stats.team2.actions[action.id] || 0;
              const total = team1Count + team2Count;
              
              if (total === 0) return null;
              
              return (
                <div key={action.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{action.icon}</span>
                      <span className="font-medium">{action.label}</span>
                    </div>
                    <span className="text-sm text-gray-500">{total} total</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getActionPercentage(action.id, 'team1')}%` }}
                      />
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getActionPercentage(action.id, 'team2')}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 font-medium">
                      {team1Count} ({getActionPercentage(action.id, 'team1')}%)
                    </span>
                    <span className="text-red-600 font-medium">
                      {team2Count} ({getActionPercentage(action.id, 'team2')}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Métriques avancées */}
      <Card>
        <CardHeader>
          <CardTitle>Métriques avancées</CardTitle>
          <CardDescription>
            Statistiques détaillées et insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Service</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Aces</span>
                  <span className="font-medium">
                    {(stats.team1.actions['ace'] || 0) + (stats.team2.actions['ace'] || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Double fautes</span>
                  <span className="font-medium">
                    {(stats.team1.actions['double_fault'] || 0) + (stats.team2.actions['double_fault'] || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Attaque</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Smashs gagnants</span>
                  <span className="font-medium">
                    {(stats.team1.actions['smash'] || 0) + (stats.team2.actions['smash'] || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Winners</span>
                  <span className="font-medium">
                    {(stats.team1.actions['winner'] || 0) + (stats.team2.actions['winner'] || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Défense</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Fautes directes</span>
                  <span className="font-medium">
                    {(stats.team1.actions['fault'] || 0) + (stats.team2.actions['fault'] || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Lobs gagnants</span>
                  <span className="font-medium">
                    {(stats.team1.actions['lob'] || 0) + (stats.team2.actions['lob'] || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
