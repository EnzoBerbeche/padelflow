'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Trophy, MapPin, Calendar, Users, Target, Award, Flag, Building } from 'lucide-react';
import Link from 'next/link';
import { playerStatisticsAPI, PlayerStatistics } from '@/lib/supabase';
import { ProtectedRoute } from '@/components/protected-route';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

// Custom Chart Components
interface ChartData {
  month: string;
  ranking: number;
  points: number;
  tournaments: number;
  date: string;
}

const RankingChart = ({ data, comparisonData }: { data: ChartData[]; comparisonData?: ChartData[] }) => {
  if (data.length === 0) return <div className="text-gray-500 text-center py-8">No data available</div>;
  
  const allRankings = [...data.map(d => d.ranking), ...(comparisonData?.map(d => d.ranking) || [])];
  const maxRanking = Math.max(...allRankings);
  const minRanking = Math.min(...allRankings);
  const range = maxRanking - minRanking || 1;
  
  const width = 800;
  const height = 200;
  const padding = 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;
  
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + ((maxRanking - d.ranking) / range) * chartHeight;
    return { x, y, ...d };
  });

  const comparisonPoints = comparisonData?.map((d, i) => {
    const x = padding + (i / (comparisonData.length - 1)) * chartWidth;
    const y = padding + ((maxRanking - d.ranking) / range) * chartHeight;
    return { x, y, ...d };
  }) || [];
  
  const pathData = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  const comparisonPathData = comparisonPoints.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');
  
  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="w-full h-full">
        {/* Grid lines */}
        {Array.from({ length: 5 }, (_, i) => {
          const y = padding + (i / 4) * chartHeight;
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
          );
        })}
        
        {/* Y-axis labels */}
        {Array.from({ length: 5 }, (_, i) => {
          const y = padding + (i / 4) * chartHeight;
          const ranking = maxRanking - (i / 4) * range;
          return (
            <text
              key={i}
              x={padding - 10}
              y={y + 4}
              textAnchor="end"
              className="text-xs fill-gray-600"
            >
              P{Math.round(ranking)}
            </text>
          );
        })}
        
        {/* X-axis labels */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - padding + 20}
            textAnchor="middle"
            className="text-xs fill-gray-600"
            transform={`rotate(-45 ${p.x} ${height - padding + 20})`}
          >
            {p.month}
          </text>
        ))}
        
        {/* Comparison chart line (dashed) */}
        {comparisonData && comparisonData.length > 0 && (
          <path
            d={comparisonPathData}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5,5"
          />
        )}
        
        {/* Main chart line */}
        <path
          d={pathData}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={3}
        />
        
        {/* Comparison data points */}
        {comparisonPoints.map((p, i) => (
          <circle
            key={`comp-${i}`}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="#f59e0b"
            stroke="white"
            strokeWidth={1}
          />
        ))}
        
        {/* Main data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="#3b82f6"
            stroke="white"
            strokeWidth={2}
          />
        ))}
      </svg>
    </div>
  );
};

const PointsChart = ({ data, comparisonData }: { data: ChartData[]; comparisonData?: ChartData[] }) => {
  if (data.length === 0) return <div className="text-gray-500 text-center py-8">No data available</div>;
  
  const allPoints = [...data.map(d => d.points), ...(comparisonData?.map(d => d.points) || [])];
  const maxPoints = Math.max(...allPoints);
  const minPoints = Math.min(...allPoints);
  const range = maxPoints - minPoints || 1;
  
  const width = 800;
  const height = 200;
  const padding = 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;
  
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + ((maxPoints - d.points) / range) * chartHeight;
    return { x, y, ...d };
  });

  const comparisonPoints = comparisonData?.map((d, i) => {
    const x = padding + (i / (comparisonData.length - 1)) * chartWidth;
    const y = padding + ((maxPoints - d.points) / range) * chartHeight;
    return { x, y, ...d };
  }) || [];
  
  const pathData = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  const comparisonPathData = comparisonPoints.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');
  
  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="w-full h-full">
        {/* Grid lines */}
        {Array.from({ length: 5 }, (_, i) => {
          const y = padding + (i / 4) * chartHeight;
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
          );
        })}
        
        {/* Y-axis labels */}
        {Array.from({ length: 5 }, (_, i) => {
          const y = padding + (i / 4) * chartHeight;
          const points = maxPoints - (i / 4) * range;
          return (
            <text
              key={i}
              x={padding - 10}
              y={y + 4}
              textAnchor="end"
              className="text-xs fill-gray-600"
            >
              {Math.round(points)}
            </text>
              );
        })}
        
        {/* X-axis labels */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - padding + 20}
            textAnchor="middle"
            className="text-xs fill-gray-600"
            transform={`rotate(-45 ${p.x} ${height - padding + 20})`}
          >
            {p.month}
          </text>
        ))}
        
        {/* Comparison chart line (dashed) */}
        {comparisonData && comparisonData.length > 0 && (
          <path
            d={comparisonPathData}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5,5"
          />
        )}
        
        {/* Main chart line */}
        <path
          d={pathData}
          fill="none"
          stroke="#10b981"
          strokeWidth={3}
        />
        
        {/* Comparison data points */}
        {comparisonPoints.map((p, i) => (
          <circle
            key={`comp-${i}`}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="#f59e0b"
            stroke="white"
            strokeWidth={1}
          />
        ))}
        
        {/* Main data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="#10b981"
            stroke="white"
            strokeWidth={2}
          />
        ))}
      </svg>
    </div>
  );
};

const TournamentsChart = ({ data, comparisonData }: { data: ChartData[]; comparisonData?: ChartData[] }) => {
  if (data.length === 0) return <div className="text-gray-500 text-center py-8">No data available</div>;
  
  const allTournaments = [...data.map(d => d.tournaments), ...(comparisonData?.map(d => d.tournaments) || [])];
  const maxTournaments = Math.max(...allTournaments);
  const minTournaments = Math.min(...allTournaments);
  const range = maxTournaments - minTournaments || 1;
  
  const width = 800;
  const height = 200;
  const padding = 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;
  
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + ((maxTournaments - d.tournaments) / range) * chartHeight;
    return { x, y, ...d };
  });

  const comparisonPoints = comparisonData?.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + ((maxTournaments - d.tournaments) / range) * chartHeight;
    return { x, y, ...d };
  }) || [];
  
  const pathData = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  const comparisonPathData = comparisonPoints.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');
  
  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="w-full h-full">
        {/* Grid lines */}
        {Array.from({ length: 5 }, (_, i) => {
          const y = padding + (i / 4) * chartHeight;
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
          );
        })}
        
        {/* Y-axis labels */}
        {Array.from({ length: 5 }, (_, i) => {
          const y = padding + (i / 4) * chartHeight;
          const tournaments = maxTournaments - (i / 4) * range;
          return (
            <text
              key={i}
              x={padding - 10}
              y={y + 4}
              textAnchor="end"
              className="text-xs fill-gray-600"
            >
              {Math.round(tournaments)}
            </text>
          );
        })}
        
        {/* X-axis labels */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - padding + 20}
            textAnchor="middle"
            className="text-xs fill-gray-600"
            transform={`rotate(-45 ${p.x} ${height - padding + 20})`}
          >
            {p.month}
          </text>
        ))}
        
        {/* Comparison chart line (dashed) */}
        {comparisonData && comparisonData.length > 0 && (
          <path
            d={comparisonPathData}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5,5"
          />
        )}
        
        {/* Main chart line */}
        <path
          d={pathData}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth={3}
        />
        
        {/* Comparison data points */}
        {comparisonPoints.map((p, i) => (
          <circle
            key={`comp-${i}`}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="#f59e0b"
            stroke="white"
            strokeWidth={1}
          />
        ))}
        
        {/* Main data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="#8b5cf6"
            stroke="white"
            strokeWidth={2}
          />
        ))}
      </svg>
    </div>
  );
};


export default function PlayerStatisticsPage() {
  const params = useParams();
  const licence = params.licence as string;
  const [playerStats, setPlayerStats] = useState<PlayerStatistics | null>(null);
  const [comparisonPlayer, setComparisonPlayer] = useState<PlayerStatistics | null>(null);
  const [showComparisonPopup, setShowComparisonPopup] = useState(false);
  const [userPlayers, setUserPlayers] = useState<any[]>([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (licence) {
      fetchPlayerStatistics();
      fetchUserPlayers();
    }
  }, [licence]);

  const fetchPlayerStatistics = async () => {
    try {
      setLoading(true);
      const stats = await playerStatisticsAPI.getPlayerStatistics(licence);
      if (stats) {
        setPlayerStats(stats);
      } else {
        setError('Player not found');
      }
    } catch (err) {
      console.error('Error fetching player statistics:', err);
      setError('Failed to load player statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPlayers = async () => {
    try {
      const { playersAPI } = await import('@/lib/supabase');
      const players = await playersAPI.getMyPlayersEnriched();
      setUserPlayers(players);
    } catch (err) {
      console.error('Error fetching user players:', err);
    }
  };

  const handleComparisonSelect = async (playerLicence: string) => {
    try {
      const comparisonStats = await playerStatisticsAPI.getPlayerStatistics(playerLicence);
      setComparisonPlayer(comparisonStats);
      setShowComparisonPopup(false);
    } catch (err) {
      console.error('Error fetching comparison player:', err);
    }
  };

  const clearComparison = () => {
    setComparisonPlayer(null);
  };

  // Filter players based on search
  const filteredUserPlayers = userPlayers.filter(player => {
    const searchLower = playerSearch.toLowerCase();
    return (
      (player.nom && player.nom.toLowerCase().includes(searchLower)) ||
      (player.licence && player.licence.toLowerCase().includes(searchLower)) ||
      (player.club && player.club.toLowerCase().includes(searchLower))
    );
  });

  const getRankingColor = (ranking: number | null) => {
    if (!ranking) return 'bg-gray-100 text-gray-800';
    if (ranking <= 25) return 'bg-green-100 text-green-800';
    if (ranking <= 100) return 'bg-blue-100 text-blue-800';
    if (ranking <= 250) return 'bg-purple-100 text-purple-800';
    if (ranking <= 500) return 'bg-orange-100 text-orange-800';
    if (ranking <= 1000) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getEvolutionIcon = (evolution: number | null) => {
    if (!evolution) return <Minus className="h-4 w-4 text-gray-500" />;
    if (evolution > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (evolution < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getEvolutionText = (evolution: number | null) => {
    if (!evolution) return 'No change';
    if (evolution > 0) return `+${evolution}`;
    if (evolution < 0) return `${evolution}`;
    return 'No change';
  };

  const getEvolutionColor = (evolution: number | null) => {
    if (!evolution) return 'text-gray-600';
    if (evolution > 0) return 'text-green-600';
    if (evolution < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatMonthYear = (year: number, month: number) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Prepare chart data for the last 12 months
  const prepareChartData = (history: PlayerStatistics['ranking_history']) => {
    return history
      .slice(0, 12)
      .reverse() // Show oldest to newest for better chart progression
      .map((entry) => ({
        month: formatMonthYear(entry.year, entry.month),
        ranking: entry.ranking || 0,
        points: entry.points || 0,
        tournaments: entry.tournaments_count || 0,
        date: `${entry.year}-${entry.month.toString().padStart(2, '0')}`,
      }));
  };

  // Prepare comparison chart data
  const prepareComparisonChartData = (history: PlayerStatistics['ranking_history']) => {
    if (!comparisonPlayer) return undefined;
    return history
      .slice(0, 12)
      .reverse()
      .map((entry) => ({
        month: formatMonthYear(entry.year, entry.month),
        ranking: entry.ranking || 0,
        points: entry.points || 0,
        tournaments: entry.tournaments_count || 0,
        date: `${entry.year}-${entry.month.toString().padStart(2, '0')}`,
      }));
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

  if (error || !playerStats) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
            <div className="text-red-600 text-lg font-medium">{error || 'Player not found'}</div>
            <Link href="/dashboard/players">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Players
              </Button>
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
                                 {/* Header Section */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/dashboard/players">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {playerStats.nom || `Player ${playerStats.licence}`}
                  </h1>
                  <p className="text-gray-600 mt-1">Licence: {playerStats.licence}</p>
                </div>
              </div>

              {/* Player Comparison Button */}
              <div className="flex justify-end">
                {comparisonPlayer ? (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Comparing with:</span>
                      <Badge variant="outline" className="text-blue-600">
                        {comparisonPlayer.nom || `Player ${comparisonPlayer.licence}`}
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={clearComparison}>
                      Clear Comparison
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setShowComparisonPopup(true)}>
                    <Users className="h-4 w-4 mr-2" />
                    Compare with Another Player
                  </Button>
                )}
              </div>
            </div>

            {/* Personal Information - One Line */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  <div className="flex items-center space-x-2">
                    <Award className="h-4 w-4 text-gray-500" />
                    <div>
                      <label className="text-xs font-medium text-gray-500">Gender</label>
                      <p className="text-sm font-medium text-gray-900">
                        {playerStats.genre === 'Homme' ? 'Men' : 'Women'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <label className="text-xs font-medium text-gray-500">Birth Year</label>
                      <p className="text-sm font-medium text-gray-900">
                        {playerStats.birth_year || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Flag className="h-4 w-4 text-gray-500" />
                    <div>
                      <label className="text-xs font-medium text-gray-500">Nationality</label>
                      <p className="text-sm font-medium text-gray-900">
                        {playerStats.nationality || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <div>
                      <label className="text-xs font-medium text-gray-500">Club</label>
                      <p className="text-sm font-medium text-gray-900">
                        {playerStats.club || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <div>
                      <label className="text-xs font-medium text-gray-500">League</label>
                      <p className="text-sm font-medium text-gray-900">
                        {playerStats.ligue || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Current Ranking */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Current Ranking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Badge className={getRankingColor(playerStats.current_ranking)}>
                      P{playerStats.current_ranking || 'N/A'}
                    </Badge>
                    {getEvolutionIcon(playerStats.ranking_evolution)}
                    <span className={`text-sm ${getEvolutionColor(playerStats.ranking_evolution)}`}>
                      {getEvolutionText(playerStats.ranking_evolution)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Best Ranking */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Best Ranking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <Badge className={getRankingColor(playerStats.best_ranking)}>
                      P{playerStats.best_ranking || 'N/A'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Current Points */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Current Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    <span className="text-2xl font-bold">{playerStats.current_points || 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Tournaments Count */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Tournaments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    <span className="text-2xl font-bold">{playerStats.current_tournaments_count || 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

                     {/* Ranking Evolution Chart */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center space-x-2">
                 <TrendingUp className="h-5 w-5" />
                 <span>Ranking Evolution</span>
               </CardTitle>
               <CardDescription>Last 12 months ranking progression</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Chart */}
                 <div className="lg:col-span-2">
                   <div className="h-64 w-full">
                     <RankingChart 
                       data={prepareChartData(playerStats.ranking_history)} 
                       comparisonData={comparisonPlayer ? prepareComparisonChartData(comparisonPlayer.ranking_history) : undefined}
                     />
                   </div>
                   
                   {/* Chart Legend */}
                   {comparisonPlayer && (
                     <div className="flex items-center justify-center space-x-6 text-sm mt-4">
                       <div className="flex items-center space-x-2">
                         <div className="w-4 h-0.5 bg-blue-500"></div>
                         <span className="text-gray-700 font-medium">{playerStats.nom || `Player ${playerStats.licence}`}</span>
                       </div>
                       <div className="flex items-center space-x-2">
                         <div className="w-4 h-0.5 bg-orange-500 border-dashed border-orange-500"></div>
                         <span className="text-gray-700 font-medium">{comparisonPlayer.nom || `Player ${comparisonPlayer.licence}`}</span>
                       </div>
                     </div>
                   )}
                 </div>
                 
                 {/* Monthly Details */}
                 <div className="lg:col-span-1">
                   <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly Details</h4>
                   <div className="space-y-2 max-h-64 overflow-y-auto">
                     {playerStats.ranking_history.slice(0, 12).map((entry, index) => (
                       <div key={index} className="flex items-center justify-between">
                         <span className="text-sm text-gray-600">
                           {formatMonthYear(entry.year, entry.month)}
                         </span>
                         <div className="flex items-center space-x-2">
                           <Badge className={getRankingColor(entry.ranking)}>
                             P{entry.ranking || 'N/A'}
                           </Badge>
                           {entry.points && (
                             <span className="text-xs text-gray-500">({entry.points} pts)</span>
                           )}
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
             </CardContent>
           </Card>

           {/* Points Evolution Chart */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center space-x-2">
                 <Target className="h-5 w-5" />
                 <span>Points Evolution</span>
               </CardTitle>
               <CardDescription>Points progression over time</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Chart */}
                 <div className="lg:col-span-2">
                   <div className="h-64 w-full">
                     <PointsChart 
                       data={prepareChartData(playerStats.ranking_history)} 
                       comparisonData={comparisonPlayer ? prepareComparisonChartData(comparisonPlayer.ranking_history) : undefined}
                     />
                   </div>
                   
                   {/* Chart Legend */}
                   {comparisonPlayer && (
                     <div className="flex items-center justify-center space-x-6 text-sm mt-4">
                       <div className="flex items-center space-x-2">
                         <div className="w-4 h-0.5 bg-green-500"></div>
                         <span className="text-gray-700 font-medium">{playerStats.nom || `Player ${playerStats.licence}`}</span>
                       </div>
                       <div className="flex items-center space-x-2">
                         <div className="w-4 h-0.5 bg-orange-500 border-dashed border-orange-500"></div>
                         <span className="text-gray-700 font-medium">{comparisonPlayer.nom || `Player ${comparisonPlayer.licence}`}</span>
                       </div>
                     </div>
                   )}
                 </div>
                 
                 {/* Monthly Details */}
                 <div className="lg:col-span-1">
                   <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly Details</h4>
                   <div className="space-y-2 max-h-64 overflow-y-auto">
                     {playerStats.ranking_history.slice(0, 12).map((entry, index) => (
                       <div key={index} className="flex items-center justify-between">
                         <span className="text-sm text-gray-600">
                           {formatMonthYear(entry.year, entry.month)}
                         </span>
                         <div className="flex items-center space-x-2">
                           <span className="text-sm font-medium">{entry.points || 'N/A'}</span>
                           <span className="text-xs text-gray-500">points</span>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
             </CardContent>
           </Card>

           {/* Tournaments Count Evolution */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center space-x-2">
                 <Users className="h-5 w-5" />
                 <span>Tournaments Count Evolution</span>
               </CardTitle>
               <CardDescription>Number of tournaments over time</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Chart */}
                 <div className="lg:col-span-2">
                   <div className="h-64 w-full">
                     <TournamentsChart 
                       data={prepareChartData(playerStats.ranking_history)} 
                       comparisonData={comparisonPlayer ? prepareComparisonChartData(comparisonPlayer.ranking_history) : undefined}
                     />
                   </div>
                   
                   {/* Chart Legend */}
                   {comparisonPlayer && (
                     <div className="flex items-center justify-center space-x-6 text-sm mt-4">
                       <div className="flex items-center space-x-2">
                         <div className="w-4 h-0.5 bg-purple-500"></div>
                         <span className="text-gray-700 font-medium">{playerStats.nom || `Player ${playerStats.licence}`}</span>
                       </div>
                       <div className="flex items-center space-x-2">
                         <div className="w-4 h-0.5 bg-orange-500 border-dashed border-orange-500"></div>
                         <span className="text-gray-700 font-medium">{comparisonPlayer.nom || `Player ${comparisonPlayer.licence}`}</span>
                       </div>
                     </div>
                   )}
                 </div>
                 
                 {/* Monthly Details */}
                 <div className="lg:col-span-1">
                   <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly Details</h4>
                   <div className="space-y-2 max-h-64 overflow-y-auto">
                     {playerStats.ranking_history.slice(0, 12).map((entry, index) => (
                       <div key={index} className="flex items-center justify-between">
                         <span className="text-sm text-gray-600">
                           {formatMonthYear(entry.year, entry.month)}
                         </span>
                         <div className="flex items-center space-x-2">
                           <span className="text-sm font-medium">{entry.tournaments_count || 'N/A'}</span>
                           <span className="text-xs text-gray-500">tournaments</span>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
             </CardContent>
           </Card>
         </div>

         {/* Player Comparison Popup */}
         <Dialog open={showComparisonPopup} onOpenChange={setShowComparisonPopup}>
           <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
             <DialogHeader>
               <DialogTitle>Select Player to Compare</DialogTitle>
             </DialogHeader>
             
             <div className="space-y-4">
               {/* Search Bar */}
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                 <Input
                   placeholder="Search players by name, license, or club..."
                   value={playerSearch}
                   onChange={(e) => setPlayerSearch(e.target.value)}
                   className="pl-10"
                 />
               </div>

               {/* Players Table */}
               <div className="max-h-96 overflow-y-auto border rounded-lg">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Name</TableHead>
                       <TableHead>License</TableHead>
                       <TableHead>Club</TableHead>
                       <TableHead className="text-center">Ranking</TableHead>
                       <TableHead className="text-center">Gender</TableHead>
                       <TableHead className="text-center">Action</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {filteredUserPlayers
                       .filter(player => player.licence !== licence)
                       .map((player) => (
                         <TableRow key={player.player_id} className="hover:bg-gray-50">
                           <TableCell className="font-medium">
                             {player.nom || `Player ${player.licence}`}
                           </TableCell>
                           <TableCell className="font-mono text-sm">
                             {player.licence}
                           </TableCell>
                           <TableCell>
                             {player.club || 'N/A'}
                           </TableCell>
                           <TableCell className="text-center">
                             <Badge variant="outline" className="font-mono">
                               {player.rang || 'N/A'}
                             </Badge>
                           </TableCell>
                           <TableCell className="text-center">
                             <Badge variant="outline" className="text-xs">
                               {player.genre === 'Homme' ? 'Men' : 'Women'}
                             </Badge>
                           </TableCell>
                           <TableCell className="text-center">
                             <Button 
                               size="sm" 
                               onClick={() => handleComparisonSelect(player.licence)}
                               disabled={player.licence === licence}
                             >
                               Compare
                             </Button>
                           </TableCell>
                         </TableRow>
                       ))}
                     {filteredUserPlayers.filter(player => player.licence !== licence).length === 0 && (
                       <TableRow>
                         <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                           No players found matching your search
                         </TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </div>
             </div>
           </DialogContent>
         </Dialog>
       </DashboardLayout>
     </ProtectedRoute>
   );
 }
