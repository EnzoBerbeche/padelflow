'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Share2, Download, FileText, TrendingUp, TrendingDown, Target, Award, Clock, Users, BarChart3, Zap, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface PointAction {
  id: string;
  team: 'team1' | 'team2';
  player?: 'player1' | 'player2' | undefined;
  action: string;
  timestamp: Date;
}

interface GameStatsProps {
  stats: any;
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
  pointHistory?: PointAction[];
}

// Configuration des actions avec labels et couleurs
const ACTION_CONFIG = {
  // Points gagnés
  gagne: {
    label: 'Points Gagnés',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle
  },
  passing: {
    label: 'Passing',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Target
  },
  volley: {
    label: 'Volley',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: Zap
  },
  smash: {
    label: 'Smash',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: Award
  },
  lob: {
    label: 'Lob',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    icon: TrendingUp
  },
  vibora_bandeja: {
    label: 'Vibora/Bandeja',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    icon: Target
  },
  bajada: {
    label: 'Bajada',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    icon: Zap
  },
  faute_direct_adverse: {
    label: 'Faute Directe Adverse',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: XCircle
  },
  
  // Points perdus
  perdu: {
    label: 'Points Perdus',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle
  },
  forced_error: {
    label: 'Forced Error',
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: AlertTriangle
  },
  winner_on_error: {
    label: 'Winner on Error',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: Award
  },
  unforced_error: {
    label: 'Unforced Error',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    icon: AlertTriangle
  },
  
  // Directions
  droite: { label: 'Droite', color: 'text-blue-600' },
  gauche: { label: 'Gauche', color: 'text-green-600' },
  milieu: { label: 'Milieu', color: 'text-purple-600' },
  
  // Types de smash
  par_3: { label: 'Par 3', color: 'text-orange-600' },
  par_4: { label: 'Par 4', color: 'text-orange-700' },
  ar: { label: 'A/R', color: 'text-orange-800' },
  
  // Types de winner on error
  contre_smash: { label: 'Contre-smash', color: 'text-yellow-600' },
  lob_court: { label: 'Lob court', color: 'text-yellow-700' },
  erreur_zone: { label: 'Erreur de zone', color: 'text-yellow-800' },
  
  // Lieux de faute
  filet: { label: 'Filet', color: 'text-red-500' },
  vitre: { label: 'Vitre', color: 'text-red-600' },
  grille: { label: 'Grille', color: 'text-red-700' }
};

// Parser pour analyser les clés d'actions hiérarchiques
const parseActionKey = (actionKey: string) => {
  const parts = actionKey.split('_');
  return {
    category1: parts[0] || '',
    category2: parts[1] || '',
    category3: parts[2] || '',
    category4: parts[3] || ''
  };
};

// Fonction pour obtenir le label d'une action
const getActionLabel = (actionKey: string) => {
  const parsed = parseActionKey(actionKey);
  const labels = [];
  
  if (parsed.category1) labels.push(ACTION_CONFIG[parsed.category1 as keyof typeof ACTION_CONFIG]?.label || parsed.category1);
  if (parsed.category2) labels.push(ACTION_CONFIG[parsed.category2 as keyof typeof ACTION_CONFIG]?.label || parsed.category2);
  if (parsed.category3) labels.push(ACTION_CONFIG[parsed.category3 as keyof typeof ACTION_CONFIG]?.label || parsed.category3);
  if (parsed.category4) labels.push(ACTION_CONFIG[parsed.category4 as keyof typeof ACTION_CONFIG]?.label || parsed.category4);
  
  return labels.join(' → ');
};

// Fonction pour analyser les actions et générer les statistiques
const analyzeActions = (pointHistory: PointAction[]) => {
  const stats = {
    totalPoints: pointHistory.length,
    pointsGagnes: 0,
    pointsPerdus: 0,
    coupsGagnants: {} as Record<string, number>,
    forcedErrors: 0,
    winnerOnErrors: {} as Record<string, number>,
    unforcedErrors: {} as Record<string, number>,
    unforcedErrorsByType: {} as Record<string, number>,
    directions: { droite: 0, gauche: 0, milieu: 0 },
    lieuxFautes: { filet: 0, vitre: 0, grille: 0 },
    parJoueur: { player1: 0, player2: 0 }
  };

  console.log('🔍 Analyzing point history:', pointHistory);

  pointHistory.forEach(point => {
    const parsed = parseActionKey(point.action);
    console.log('🔍 Parsed action:', point.action, '→', parsed);
    
    if (parsed.category1 === 'gagne') {
      stats.pointsGagnes++;
      stats.coupsGagnants[parsed.category2] = (stats.coupsGagnants[parsed.category2] || 0) + 1;
      
      // Compter les directions
      if (parsed.category3 === 'droite') stats.directions.droite++;
      else if (parsed.category3 === 'gauche') stats.directions.gauche++;
      else if (parsed.category3 === 'milieu') stats.directions.milieu++;
      
      // Compter par joueur
      if (point.player === 'player1') stats.parJoueur.player1++;
      else if (point.player === 'player2') stats.parJoueur.player2++;
      
    } else if (parsed.category1 === 'perdu') {
      stats.pointsPerdus++;
      
      if (parsed.category2 === 'unforced_error') {
        // Unforced Error - structure: perdu_unforced_error_[type]_[lieu]
        const typeKey = parsed.category3 || 'unknown';
        const locationKey = parsed.category4 || 'unknown';
        const fullKey = `${typeKey}_${locationKey}`;
        
        stats.unforcedErrors[fullKey] = (stats.unforcedErrors[fullKey] || 0) + 1;
        stats.unforcedErrorsByType[typeKey] = (stats.unforcedErrorsByType[typeKey] || 0) + 1;
        
        console.log('🔍 Unforced error detected:', fullKey, 'type:', typeKey, 'location:', locationKey);
        
        // Compter les lieux de fautes
        if (locationKey === 'filet') stats.lieuxFautes.filet++;
        else if (locationKey === 'vitre') stats.lieuxFautes.vitre++;
        else if (locationKey === 'grille') stats.lieuxFautes.grille++;
        
      } else if (parsed.category2 === 'winner_on_error') {
        // Winner on Error - structure: perdu_winner_on_error_[type]
        const typeKey = parsed.category3 || 'unknown';
        stats.winnerOnErrors[typeKey] = (stats.winnerOnErrors[typeKey] || 0) + 1;
        
        console.log('🔍 Winner on error detected:', typeKey);
        
      } else if (parsed.category2 === 'forced_error') {
        // Forced Error - structure: perdu_forced_error
        stats.forcedErrors++;
        console.log('🔍 Forced error detected, total:', stats.forcedErrors);
      }
    }
  });

  console.log('🔍 Final stats:', stats);
  return stats;
};

export function GameStats({ stats, game, pointHistory = [], onExport, onShare }: GameStatsProps) {
  const analysisStats = analyzeActions(pointHistory);
  
  // Vérification de sécurité pour éviter les erreurs undefined
  if (!analysisStats) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Chargement des statistiques...</p>
      </div>
    );
  }
  
  const winPercentage = analysisStats.totalPoints > 0 ? Math.round((analysisStats.pointsGagnes / analysisStats.totalPoints) * 100) : 0;
  const ratioCoupsFautes = analysisStats.pointsPerdus > 0 ? (analysisStats.pointsGagnes / analysisStats.pointsPerdus).toFixed(2) : '∞';

  // Top 3 des coups gagnants
  const topCoupsGagnants = Object.entries(analysisStats.coupsGagnants || {})
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  // Top 3 des fautes (forced + winner on error + unforced)
  const allFautes = {
    ...(analysisStats.forcedErrors > 0 && { 'forced_error': analysisStats.forcedErrors }),
    ...(analysisStats.winnerOnErrors || {}),
    ...(analysisStats.unforcedErrorsByType || {})
  };
  const topFautes = Object.entries(allFautes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="text-center border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {game.team1_player1} & {game.team1_player2}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {new Date(game.created_at).toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>

      {/* Stats clés */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-xl">
            <BarChart3 className="h-6 w-6 mr-2 text-blue-600" />
            Stats Clés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{analysisStats.pointsGagnes}</div>
              <div className="text-sm text-gray-600">Points Gagnés</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{analysisStats.pointsPerdus}</div>
              <div className="text-sm text-gray-600">Points Perdus</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{ratioCoupsFautes}</div>
              <div className="text-sm text-gray-600">Ratio G/P</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{winPercentage}%</div>
              <div className="text-sm text-gray-600">% de Réussite</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coups Gagnants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-2" />
              Coups Gagnants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Top 3 */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Top 3</h4>
                <div className="space-y-2">
                  {topCoupsGagnants.map(([action, count], index) => (
                    <div key={action} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2">
                          #{index + 1}
                        </Badge>
                        <span className="font-medium">
                          {ACTION_CONFIG[action as keyof typeof ACTION_CONFIG]?.label || action}
                        </span>
                      </div>
                      <span className="font-bold text-green-600">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Répartition */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Répartition</h4>
                <div className="space-y-2">
                  {Object.entries(analysisStats.coupsGagnants || {}).map(([action, count]) => {
                    const percentage = analysisStats.pointsGagnes > 0 ? (count / analysisStats.pointsGagnes) * 100 : 0;
                    const config = ACTION_CONFIG[action as keyof typeof ACTION_CONFIG];
                    return (
                      <div key={action} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className={config?.color}>{config?.label || action}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${(config as any)?.bgColor || 'bg-gray-400'}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fautes & Erreurs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <XCircle className="h-5 w-5 mr-2" />
              Fautes & Erreurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Forced Errors */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Forced Errors</h4>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <span className="text-red-700 font-medium">Forced Error</span>
                  <span className="font-bold text-red-600 text-lg">{analysisStats.forcedErrors}</span>
                </div>
              </div>

              {/* Winner on Errors */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Winner on Error</h4>
                {Object.keys(analysisStats.winnerOnErrors).length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                    <p>Aucun winner on error enregistré</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(analysisStats.winnerOnErrors || {}).map(([type, count]) => {
                      const typeConfig = ACTION_CONFIG[type as keyof typeof ACTION_CONFIG];
                      return (
                        <div key={type} className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                          <span className="text-yellow-700">{typeConfig?.label || type}</span>
                          <span className="font-bold text-yellow-600">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Unforced Errors par type */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Unforced Errors par Type</h4>
                {Object.keys(analysisStats.unforcedErrorsByType).length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                    <p>Aucun unforced error enregistré</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(analysisStats.unforcedErrorsByType || {}).map(([type, count]) => {
                      const typeConfig = ACTION_CONFIG[type as keyof typeof ACTION_CONFIG];
                      return (
                        <div key={type} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-200">
                          <span className="text-orange-700">{typeConfig?.label || type}</span>
                          <span className="font-bold text-orange-600">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Détail des Unforced Errors par lieu */}
              {Object.keys(analysisStats.unforcedErrors || {}).length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">Détail par Lieu de Faute</h4>
                  <div className="space-y-2">
                    {Object.entries(analysisStats.unforcedErrors || {}).map(([action, count]) => {
                      const [type, lieu] = action.split('_');
                      const typeConfig = ACTION_CONFIG[type as keyof typeof ACTION_CONFIG];
                      const lieuConfig = ACTION_CONFIG[lieu as keyof typeof ACTION_CONFIG];
                      
                      return (
                        <div key={action} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-700">{typeConfig?.label || type}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-gray-600">{lieuConfig?.label || lieu}</span>
                          </div>
                          <span className="font-bold text-gray-600">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zones & Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-purple-600">
            <Target className="h-5 w-5 mr-2" />
            Zones & Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Zones de réussite */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Zones de Réussite</h4>
              <div className="space-y-3">
                {Object.entries(analysisStats.directions || {}).map(([direction, count]) => {
                  const config = ACTION_CONFIG[direction as keyof typeof ACTION_CONFIG];
                  const percentage = analysisStats.pointsGagnes > 0 ? (count / analysisStats.pointsGagnes) * 100 : 0;
                  return (
                    <div key={direction} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={config?.color}>{config?.label || direction}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${(config as any)?.bgColor || 'bg-gray-400'}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Zones d'erreur */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Zones d'Erreur</h4>
              <div className="space-y-3">
                {Object.entries(analysisStats.lieuxFautes || {}).map(([lieu, count]) => {
                  const config = ACTION_CONFIG[lieu as keyof typeof ACTION_CONFIG];
                  const totalErrors = Object.values(analysisStats.lieuxFautes || {}).reduce((a, b) => a + b, 0);
                  const percentage = totalErrors > 0 ? (count / totalErrors) * 100 : 0;
                  return (
                    <div key={lieu} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={config?.color}>{config?.label || lieu}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-red-400"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-center space-x-4 pt-4 border-t">
        <Button onClick={onExport} variant="outline" className="flex items-center">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button onClick={onShare} className="flex items-center">
          <Share2 className="h-4 w-4 mr-2" />
          Partager
        </Button>
      </div>
    </div>
  );
}