'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAnalysis } from '@/hooks/use-analysis';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, LineChart, Line } from 'recharts';

// Cast Recharts components to fix TypeScript compatibility issues
const ResponsiveContainerFixed = ResponsiveContainer as any;
const PieChartFixed = PieChart as any;
const PieFixed = Pie as any;
const CellFixed = Cell as any;
const LegendFixed = Legend as any;

const BarChartFixed = BarChart as any;
const BarFixed = Bar as any;
const XAxisFixed = XAxis as any;
const YAxisFixed = YAxis as any;
const CartesianGridFixed = CartesianGrid as any;
const TooltipFixed = Tooltip as any;

interface MatchStats {
  totalPoints: number;
  pointsWon: number;
  pointsLost: number;
  winPercentage: number;
  pointsWonByCategory: { [key: string]: number };
  pointsLostByCategory: { [key: string]: number };
  pointsWonByPlayer: {
    left: number;
    right: number;
  };
  pointsLostByPlayer: {
    left: number;
    right: number;
  };
  pointsWonByCategory3: { [key: string]: { left: number; right: number; total: number } };
  pointsWonByCategory3Grouped: { [key: string]: { [key: string]: { left: number; right: number; total: number } } };
  pointsLostByCategory2: { [key: string]: { left: number; right: number; total: number } };
  pointsLostByCategory3: { [key: string]: { [key: string]: { left: number; right: number; total: number } } };
  pointsLostByCategory3Direct: { [key: string]: { left: number; right: number; total: number } };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function GameStatsPage() {
  const { toast } = useToast();
  const params = useParams();
  const gameId = params.id as string;

  const { 
    analysis, 
    points, 
    loading, 
    error
  } = useAnalysis(gameId);

  const [stats, setStats] = useState<MatchStats>({
    totalPoints: 0,
    pointsWon: 0,
    pointsLost: 0,
    winPercentage: 0,
    pointsWonByCategory: {},
    pointsLostByCategory: {},
    pointsWonByPlayer: { left: 0, right: 0 },
    pointsLostByPlayer: { left: 0, right: 0 },
    pointsWonByCategory3: {},
    pointsWonByCategory3Grouped: {},
    pointsLostByCategory2: {},
    pointsLostByCategory3: {},
    pointsLostByCategory3Direct: {}
  });

  // État pour le filtre de joueur
  const [selectedPlayer, setSelectedPlayer] = useState<'both' | 'left' | 'right'>('both');

  useEffect(() => {
    if (points && points.length > 0) {
      calculateStats();
    }
  }, [points]);

  const calculateStats = () => {
    if (!points) return;

    console.log('🔍 Calculating stats for points:', points);

    let totalPoints = points.length;
    let pointsWon = 0;
    let pointsLost = 0;
    const pointsWonByCategory: { [key: string]: number } = {};
    const pointsLostByCategory: { [key: string]: number } = {};
    const pointsWonByPlayer = { left: 0, right: 0 };
    const pointsLostByPlayer = { left: 0, right: 0 };
    const pointsWonByCategory3: { [key: string]: { left: number; right: number; total: number } } = {};
    const pointsWonByCategory3Grouped: { [key: string]: { [key: string]: { left: number; right: number; total: number } } } = {};
    const pointsLostByCategory2: { [key: string]: { left: number; right: number; total: number } } = {};
    const pointsLostByCategory3: { [key: string]: { [key: string]: { left: number; right: number; total: number } } } = {};
    const pointsLostByCategory3Direct: { [key: string]: { left: number; right: number; total: number } } = {};

    points.forEach((point: any) => {
      const action = point.point_actions;
      if (!action) {
        console.log('🔍 Point without action:', point);
        return;
      }

      console.log('🔍 Point action:', action);

      // Déterminer si c'est un point gagné ou perdu basé sur category_1
      // Les valeurs possibles sont "gagne" et "perdu"
      const isWon = action.category_1 === 'gagne';
      const category2 = action.category_2;
      const category3 = action.category_3;

      console.log('🔍 Category 1:', action.category_1, 'Category 2:', category2, 'Category 3:', category3, 'Is won:', isWon);

      if (isWon) {
        pointsWon++;
        pointsWonByCategory[category3] = (pointsWonByCategory[category3] || 0) + 1;
        
        // Compter par Category_3 avec répartition par joueur
        if (!pointsWonByCategory3[category3]) {
          pointsWonByCategory3[category3] = { left: 0, right: 0, total: 0 };
        }
        pointsWonByCategory3[category3].total++;
        
        // Compter par joueur pour Category_3
        if (point.player_position === 'player1') {
          pointsWonByCategory3[category3].right++;
        } else if (point.player_position === 'player2') {
          pointsWonByCategory3[category3].left++;
        }
        
        
        // Compter par joueur
        if (point.player_position === 'player1') {
          pointsWonByPlayer.right++;
        } else if (point.player_position === 'player2') {
          pointsWonByPlayer.left++;
        }
      } else {
        pointsLost++;
        pointsLostByCategory[category2] = (pointsLostByCategory[category2] || 0) + 1;
        
        // Compter par Category_2 avec répartition par joueur
        if (!pointsLostByCategory2[category2]) {
          pointsLostByCategory2[category2] = { left: 0, right: 0, total: 0 };
        }
        pointsLostByCategory2[category2].total++;
        
        // Compter par joueur pour Category_2
        if (point.player_position === 'player1') {
          pointsLostByCategory2[category2].right++;
        } else if (point.player_position === 'player2') {
          pointsLostByCategory2[category2].left++;
        }
        
        // Compter par Category_3 si elle existe, groupée par Category_2
        if (category3) {
          if (!pointsLostByCategory3[category2]) {
            pointsLostByCategory3[category2] = {};
          }
          if (!pointsLostByCategory3[category2][category3]) {
            pointsLostByCategory3[category2][category3] = { left: 0, right: 0, total: 0 };
          }
          pointsLostByCategory3[category2][category3].total++;
          
          // Compter par joueur pour Category_3
          if (point.player_position === 'player1') {
            pointsLostByCategory3[category2][category3].right++;
          } else if (point.player_position === 'player2') {
            pointsLostByCategory3[category2][category3].left++;
          }
        }
        
        // Compter par Category_3 directement pour le graphique
        if (category3) {
          if (!pointsLostByCategory3Direct[category3]) {
            pointsLostByCategory3Direct[category3] = { left: 0, right: 0, total: 0 };
          }
          pointsLostByCategory3Direct[category3].total++;
          
          // Compter par joueur pour Category_3 direct
          if (point.player_position === 'player1') {
            pointsLostByCategory3Direct[category3].right++;
          } else if (point.player_position === 'player2') {
            pointsLostByCategory3Direct[category3].left++;
          }
        }
        
        // Compter par joueur
        if (point.player_position === 'player1') {
          pointsLostByPlayer.right++;
        } else if (point.player_position === 'player2') {
          pointsLostByPlayer.left++;
        }
      }
    });

    const winPercentage = totalPoints > 0 ? Math.round((pointsWon / totalPoints) * 100) : 0;

    console.log('🔍 Calculated stats:', {
      totalPoints,
      pointsWon,
      pointsLost,
      winPercentage,
      pointsWonByCategory,
      pointsLostByCategory
    });

    setStats({
      totalPoints,
      pointsWon,
      pointsLost,
      winPercentage,
      pointsWonByCategory,
      pointsLostByCategory,
      pointsWonByPlayer,
      pointsLostByPlayer,
      pointsWonByCategory3,
      pointsWonByCategory3Grouped,
      pointsLostByCategory2,
      pointsLostByCategory3,
      pointsLostByCategory3Direct
    });
  };

  const formatCategoryName = (name: string): string => {
    return name
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getCategoryColor = (category: string, index: number): string => {
    // Utiliser les mêmes couleurs que le camembert
    return COLORS[index % COLORS.length];
  };

  const calculatePercentage = (value: number, total: number): string => {
    if (total === 0) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  };

  const prepareChartData = (data: { [key: string]: number }, type: 'won' | 'lost') => {
    return Object.entries(data)
      .filter(([_, value]) => value > 0) // Filtrer les catégories vides
      .map(([name, value], index) => ({
        name: formatCategoryName(name),
        value,
        fill: COLORS[index % COLORS.length]
      }));
  };

  const prepareComparisonData = () => {
    console.log('🔍 Preparing comparison data...');
    console.log('🔍 Selected player:', selectedPlayer);
    console.log('🔍 stats.pointsWonByCategory3:', stats.pointsWonByCategory3);
    console.log('🔍 stats.pointsLostByCategory3Direct:', stats.pointsLostByCategory3Direct);
    
    // Récupérer tous les types de coups uniques (category_3) des points gagnés et perdus
    const allCategory3Types = new Set([
      ...Object.keys(stats.pointsWonByCategory3),
      ...Object.keys(stats.pointsLostByCategory3Direct)
    ]);

    console.log('🔍 All category3 types:', Array.from(allCategory3Types));

    const data = Array.from(allCategory3Types)
      .filter(category3 => {
        let wonCount = 0;
        let lostCount = 0;
        
        if (selectedPlayer === 'both') {
          wonCount = stats.pointsWonByCategory3[category3]?.total || 0;
          lostCount = stats.pointsLostByCategory3Direct[category3]?.total || 0;
        } else {
          wonCount = stats.pointsWonByCategory3[category3]?.[selectedPlayer] || 0;
          lostCount = stats.pointsLostByCategory3Direct[category3]?.[selectedPlayer] || 0;
        }
        
        console.log(`🔍 ${category3} (${selectedPlayer}): won=${wonCount}, lost=${lostCount}`);
        return wonCount > 0 || lostCount > 0;
      })
      .map(category3 => {
        let wonCount = 0;
        let lostCount = 0;
        
        if (selectedPlayer === 'both') {
          wonCount = stats.pointsWonByCategory3[category3]?.total || 0;
          lostCount = stats.pointsLostByCategory3Direct[category3]?.total || 0;
        } else {
          wonCount = stats.pointsWonByCategory3[category3]?.[selectedPlayer] || 0;
          lostCount = stats.pointsLostByCategory3Direct[category3]?.[selectedPlayer] || 0;
        }
        
        const total = wonCount + lostCount;
        
        return {
          name: formatCategoryName(category3),
          gagnés: wonCount,
          perdus: lostCount,
          total: total,
          // Pour le graphique empilé, on calcule les pourcentages
          gagnésPercent: total > 0 ? (wonCount / total) * 100 : 0,
          perdusPercent: total > 0 ? (lostCount / total) * 100 : 0
        };
      })
      .sort((a, b) => b.total - a.total); // Trier par total décroissant

    console.log('🔍 Final comparison data:', data);
    return data;
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

  if (error) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-12">
            <h2 className="text-xl font-medium text-gray-900 mb-2">Erreur de chargement</h2>
            <p className="text-gray-500 mb-4">{error}</p>
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

  if (!analysis) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-12">
            <h2 className="text-xl font-medium text-gray-900 mb-2">Analyse non trouvée</h2>
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

  const wonChartData = prepareChartData(stats.pointsWonByCategory, 'won');
  const lostChartData = prepareChartData(stats.pointsLostByCategory, 'lost');
  const lostChartDataByCategory3 = prepareChartData(
    Object.fromEntries(
      Object.entries(stats.pointsLostByCategory3Direct).map(([key, data]) => [key, data.total])
    ), 
    'lost'
  );

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/game-analyzer/${gameId}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{analysis.analysis_name || 'Analyse'}</h1>
                <p className="text-gray-600 mt-1">
                  {analysis.player_left} (G) - {analysis.player_right} (D)
                </p>
              </div>
            </div>
          </div>

          {/* Stats générales */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Points joués</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPoints}</div>
                <p className="text-xs text-muted-foreground">
                  Total des points du match
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Points gagnés</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.pointsWon} ({stats.winPercentage}%)</div>
                <p className="text-xs text-muted-foreground">
                  Points remportés
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Points perdus</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.pointsLost} ({Math.round((stats.pointsLost / stats.totalPoints) * 100)}%)</div>
                <p className="text-xs text-muted-foreground">
                  Points concédés
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pourcentage de victoire</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.winPercentage}%</div>
                <p className="text-xs text-muted-foreground">
                  Taux de réussite
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 gap-6">
            {/* Répartition des points perdus par type d'erreur */}
            <Card>
              <CardHeader>
                <CardTitle>Points perdus par type d'erreur</CardTitle>
                <CardDescription>
                  Distribution des points perdus par catégorie d'erreur
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {lostChartData.length > 0 ? (
                    <ResponsiveContainerFixed width="100%" height="100%">
                      <PieChartFixed>
                        <PieFixed
                          data={lostChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {lostChartData.map((entry, index) => (
                            <CellFixed key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </PieFixed>
                        <Tooltip />
                        <LegendFixed />
                      </PieChartFixed>
                    </ResponsiveContainerFixed>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Aucun point perdu enregistré
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Graphique comparatif points gagnés vs perdus par type de coup */}
            <Card>
              <CardHeader>
                <CardTitle>Efficacité par type de coup</CardTitle>
                <CardDescription>
                  Comparaison des points gagnés et perdus pour chaque type de coup
                </CardDescription>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button
                    variant={selectedPlayer === 'both' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPlayer('both')}
                    className="text-xs"
                  >
                    Les deux
                  </Button>
                  <Button
                    variant={selectedPlayer === 'left' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPlayer('left')}
                    className="text-xs"
                  >
                    {analysis.player_left} (G)
                  </Button>
                  <Button
                    variant={selectedPlayer === 'right' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPlayer('right')}
                    className="text-xs"
                  >
                    {analysis.player_right} (D)
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    const comparisonData = prepareComparisonData();
                    console.log('🔍 Comparison data:', comparisonData);
                    
                    return comparisonData.length > 0 ? (
                      comparisonData.map((entry, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-sm">{entry.name}</span>
                            <span className="text-sm text-gray-600">
                              {entry.gagnés}/{entry.total} gagnés
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-6 relative">
                            <div 
                              className="bg-green-500 h-6 rounded-l-full flex items-center justify-end pr-2"
                              style={{ width: `${(entry.gagnés / entry.total) * 100}%` }}
                            >
                              <span className="text-white text-xs font-medium">
                                {entry.gagnés}
                              </span>
                            </div>
                            <div 
                              className="bg-red-500 h-6 rounded-r-full absolute top-0 flex items-center justify-start pl-2"
                              style={{ 
                                width: `${(entry.perdus / entry.total) * 100}%`,
                                left: `${(entry.gagnés / entry.total) * 100}%`
                              }}
                            >
                              <span className="text-white text-xs font-medium">
                                {entry.perdus}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-32 text-gray-500">
                        <div className="text-center">
                          <div className="text-lg font-medium mb-2">Aucun point enregistré</div>
                          <div className="text-sm">Commencez à jouer pour voir les statistiques</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Détail des points */}
          <Card>
            <CardHeader>
              <CardTitle>Détail des points</CardTitle>
              <CardDescription>
                Répartition des points gagnés et perdus par joueur
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-0 border border-gray-200 rounded-lg overflow-hidden">
                {/* En-tête de ligne (vide) */}
                <div className="bg-gray-50 p-4 border-r border-gray-200"></div>
                
                {/* En-tête colonne - Joueur de gauche */}
                <div className="bg-gray-50 p-4 text-center border-r border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {analysis.player_left} (G)
                  </h3>
                </div>

                {/* En-tête colonne - Total équipe */}
                <div className="bg-gray-50 p-4 text-center border-r border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Total équipe
                  </h3>
                </div>

                {/* En-tête colonne - Joueur de droite */}
                <div className="bg-gray-50 p-4 text-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {analysis.player_right} (D)
                  </h3>
                </div>

                {/* Titre de ligne - Points gagnés */}
                <div className="p-4 text-left border-r border-gray-200 border-t border-gray-200 bg-green-50">
                  <h3 className="text-lg font-semibold text-green-900">
                    Points gagnés
                  </h3>
                </div>

                {/* Valeur - Joueur de gauche */}
                <div className="p-4 text-center border-r border-gray-200 border-t border-gray-200 bg-green-50">
                  <div className="text-3xl font-bold text-green-600">
                    {stats.pointsWonByPlayer.left}
                  </div>
                  <div className="text-sm text-gray-500">
                    ({calculatePercentage(stats.pointsWonByPlayer.left, stats.pointsWon)})
                  </div>
                </div>

                {/* Valeur - Total équipe */}
                <div className="p-4 text-center border-r border-gray-200 border-t border-gray-200 bg-green-50">
                  <div className="text-4xl font-bold text-green-600">
                    {stats.pointsWon}
                  </div>
                  <div className="text-sm text-gray-500">
                    ({calculatePercentage(stats.pointsWon, stats.pointsWon)})
                  </div>
                </div>

                {/* Valeur - Joueur de droite */}
                <div className="p-4 text-center border-t border-gray-200 bg-green-50">
                  <div className="text-3xl font-bold text-green-600">
                    {stats.pointsWonByPlayer.right}
                  </div>
                  <div className="text-sm text-gray-500">
                    ({calculatePercentage(stats.pointsWonByPlayer.right, stats.pointsWon)})
                  </div>
                </div>

                {/* Lignes pour chaque Category_3 */}
                {Object.entries(stats.pointsWonByCategory3)
                  .filter(([_, data]) => data.total > 0)
                  .map(([category3, data], index) => {
                    const categoryColor = getCategoryColor(category3, index);
                    return (
                    <React.Fragment key={category3}>
                      {/* Ligne Category_3 */}
                      <div className="p-3 text-left border-r border-gray-200 border-t border-gray-200 bg-gray-50">
                        <h4 className="text-sm font-medium text-gray-700 ml-4 flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: categoryColor }}
                          ></div>
                          {formatCategoryName(category3)}
                        </h4>
                      </div>

                      {/* Category_3 - Joueur de gauche */}
                      <div className="p-3 text-center border-r border-gray-200 border-t border-gray-200 bg-gray-50">
                        <div className="text-sm font-medium text-gray-700">
                          {data.left}
                        </div>
                        <div className="text-xs text-gray-500">
                          ({calculatePercentage(data.left, stats.pointsWonByPlayer.left)})
                        </div>
                      </div>

                      {/* Category_3 - Total équipe */}
                      <div className="p-3 text-center border-r border-gray-200 border-t border-gray-200 bg-gray-50">
                        <div className="text-sm font-medium text-gray-700">
                          {data.total}
                        </div>
                        <div className="text-xs text-gray-500">
                          ({calculatePercentage(data.total, stats.pointsWon)})
                        </div>
                      </div>

                      {/* Category_3 - Joueur de droite */}
                      <div className="p-3 text-center border-t border-gray-200 bg-gray-50">
                        <div className="text-sm font-medium text-gray-700">
                          {data.right}
                        </div>
                        <div className="text-xs text-gray-500">
                          ({calculatePercentage(data.right, stats.pointsWonByPlayer.right)})
                        </div>
                      </div>
                    </React.Fragment>
                    );
                  })}

                {/* Ligne Points perdus */}
                <div className="p-4 text-left border-r border-gray-200 border-t border-gray-200 bg-red-50">
                  <h3 className="text-lg font-semibold text-red-900">
                    Points perdus
                  </h3>
                </div>

                {/* Points perdus - Joueur de gauche */}
                <div className="p-4 text-center border-r border-gray-200 border-t border-gray-200 bg-red-50">
                  <div className="text-3xl font-bold text-red-600">
                    {stats.pointsLostByPlayer.left}
                  </div>
                  <div className="text-sm text-gray-500">
                    ({calculatePercentage(stats.pointsLostByPlayer.left, stats.pointsLost)})
                  </div>
                </div>

                {/* Points perdus - Total équipe */}
                <div className="p-4 text-center border-r border-gray-200 border-t border-gray-200 bg-red-50">
                  <div className="text-3xl font-bold text-red-600">
                    {stats.pointsLost}
                  </div>
                  <div className="text-sm text-gray-500">
                    ({calculatePercentage(stats.pointsLost, stats.pointsLost)})
                  </div>
                </div>

                {/* Points perdus - Joueur de droite */}
                <div className="p-4 text-center border-t border-gray-200 bg-red-50">
                  <div className="text-3xl font-bold text-red-600">
                    {stats.pointsLostByPlayer.right}
                  </div>
                  <div className="text-sm text-gray-500">
                    ({calculatePercentage(stats.pointsLostByPlayer.right, stats.pointsLost)})
                  </div>
                </div>

                {/* Lignes pour chaque Category_2 des points perdus */}
                {Object.entries(stats.pointsLostByCategory2)
                  .filter(([_, data]) => data.total > 0)
                  .map(([category2, data], index) => {
                    const categoryColor = getCategoryColor(category2, index);
                    return (
                      <React.Fragment key={category2}>
                        {/* Ligne Category_2 */}
                        <div className="p-3 text-left border-r border-gray-200 border-t border-gray-200 bg-gray-50">
                          <h4 className="text-sm font-medium text-gray-700 ml-4 flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: categoryColor }}
                            ></div>
                            {formatCategoryName(category2)}
                          </h4>
                        </div>

                        {/* Category_2 - Joueur de gauche */}
                        <div className="p-3 text-center border-r border-gray-200 border-t border-gray-200 bg-gray-50">
                          <div className="text-sm font-medium text-gray-700">
                            {data.left}
                          </div>
                          <div className="text-xs text-gray-500">
                            ({calculatePercentage(data.left, stats.pointsLostByPlayer.left)})
                          </div>
                        </div>

                        {/* Category_2 - Total équipe */}
                        <div className="p-3 text-center border-r border-gray-200 border-t border-gray-200 bg-gray-50">
                          <div className="text-sm font-medium text-gray-700">
                            {data.total}
                          </div>
                          <div className="text-xs text-gray-500">
                            ({calculatePercentage(data.total, stats.pointsLost)})
                          </div>
                        </div>

                        {/* Category_2 - Joueur de droite */}
                        <div className="p-3 text-center border-t border-gray-200 bg-gray-50">
                          <div className="text-sm font-medium text-gray-700">
                            {data.right}
                          </div>
                          <div className="text-xs text-gray-500">
                            ({calculatePercentage(data.right, stats.pointsLostByPlayer.right)})
                          </div>
                        </div>

                        {/* Sous-lignes pour chaque Category_3 de cette Category_2 */}
                        {stats.pointsLostByCategory3[category2] && Object.entries(stats.pointsLostByCategory3[category2])
                          .filter(([_, data]) => data.total > 0)
                          .map(([category3, data], subIndex) => {
                            const subCategoryColor = categoryColor + '40'; // Add transparency
                            return (
                              <React.Fragment key={`${category2}-${category3}`}>
                                {/* Ligne Category_3 */}
                                <div className="p-2 text-left border-r border-gray-200 border-t border-gray-200">
                                  <h5 className="text-xs text-gray-600 ml-8 flex items-center">
                                    <div
                                      className="w-2 h-2 rounded-full mr-2"
                                      style={{ backgroundColor: subCategoryColor }}
                                    ></div>
                                    {formatCategoryName(category3)}
                                  </h5>
                                </div>

                                {/* Category_3 - Joueur de gauche */}
                                <div className="p-2 text-center border-r border-gray-200 border-t border-gray-200">
                                  <div className="text-xs text-gray-600">
                                    {data.left}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    ({calculatePercentage(data.left, stats.pointsLostByCategory2[category2].left)})
                                  </div>
                                </div>

                                {/* Category_3 - Total équipe */}
                                <div className="p-2 text-center border-r border-gray-200 border-t border-gray-200">
                                  <div className="text-xs text-gray-600">
                                    {data.total}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    ({calculatePercentage(data.total, stats.pointsLostByCategory2[category2].total)})
                                  </div>
                                </div>

                                {/* Category_3 - Joueur de droite */}
                                <div className="p-2 text-center border-t border-gray-200">
                                  <div className="text-xs text-gray-600">
                                    {data.right}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    ({calculatePercentage(data.right, stats.pointsLostByCategory2[category2].right)})
                                  </div>
                                </div>
                              </React.Fragment>
                            );
                          })}
                      </React.Fragment>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
