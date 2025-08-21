'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Trophy, MapPin, Calendar, Users, Target, Award, Flag, Building, BarChart3, Activity, Zap } from 'lucide-react';
import Link from 'next/link';
import { clubsAPI, ClubStatistics } from '@/lib/supabase';
import { ProtectedRoute } from '@/components/protected-route';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

// Custom Chart Components
interface ChartData {
  month: string;
  value: number;
  date: string;
}

const ClubChart = ({ 
  data, 
  comparisonData, 
  title, 
  color = "#3b82f6",
  comparisonColor = "#f59e0b" 
}: { 
  data: ChartData[]; 
  comparisonData?: ChartData[]; 
  title: string;
  color?: string;
  comparisonColor?: string;
}) => {
  if (data.length === 0) return <div className="text-gray-500 text-center py-8">No data available</div>;
  
  const allValues = [...data.map(d => d.value), ...(comparisonData?.map(d => d.value) || [])];
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const range = maxValue - minValue || 1;
  
  // Make chart responsive
  const width = 800;
  const height = 200;
  const padding = 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;
  
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + ((maxValue - d.value) / range) * chartHeight;
    return { x, y, ...d };
  });

  const comparisonPoints = comparisonData?.map((d, i) => {
    const x = padding + (i / (comparisonData.length - 1)) * chartWidth;
    const y = padding + ((maxValue - d.value) / range) * chartHeight;
    return { x, y, ...d };
  }) || [];
  
  const pathData = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  const comparisonPathData = comparisonPoints.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');
  
  return (
    <div className="w-full">
      <h4 className="text-sm font-medium text-gray-700 mb-3">{title}</h4>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full">
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
          const value = maxValue - (i / 4) * range;
          return (
            <text
              key={i}
              x={padding - 10}
              y={y + 4}
              textAnchor="end"
              className="text-xs fill-gray-600"
            >
              {Math.round(value)}
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
            stroke={comparisonColor}
            strokeWidth={2}
            strokeDasharray="5,5"
          />
        )}
        
        {/* Main chart line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={3}
        />
        
        {/* Comparison data points */}
        {comparisonPoints.map((p, i) => (
          <circle
            key={`comp-${i}`}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={comparisonColor}
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
            fill={color}
            stroke="white"
            strokeWidth={2}
          />
        ))}
      </svg>
    </div>
  );
};

export default function ClubDetailsPage() {
  const params = useParams();
  const clubName = decodeURIComponent(params.clubName as string);
  const [clubStats, setClubStats] = useState<ClubStatistics | null>(null);
  const [comparisonClub, setComparisonClub] = useState<ClubStatistics | null>(null);
  const [showComparisonPopup, setShowComparisonPopup] = useState(false);
  const [availableClubs, setAvailableClubs] = useState<string[]>([]);
  const [clubSearch, setClubSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof ClubStatistics['players'][0] | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (clubName) {
      fetchClubStatistics();
      fetchAvailableClubs();
    }
  }, [clubName]);

  const fetchClubStatistics = async () => {
    try {
      setLoading(true);
      const stats = await clubsAPI.getClubStatistics(clubName);
      if (stats) {
        setClubStats(stats);
      } else {
        setError('Club not found');
      }
    } catch (err) {
      console.error('Error fetching club statistics:', err);
      setError('Failed to load club statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableClubs = async () => {
    try {
      const clubs = await clubsAPI.getAllClubs();
      setAvailableClubs(clubs);
    } catch (err) {
      console.error('Error fetching available clubs:', err);
    }
  };

  const handleComparisonSelect = async (selectedClubName: string) => {
    try {
      const comparisonStats = await clubsAPI.getClubStatistics(selectedClubName);
      setComparisonClub(comparisonStats);
      setShowComparisonPopup(false);
    } catch (err) {
      console.error('Error fetching comparison club:', err);
    }
  };

  const clearComparison = () => {
    setComparisonClub(null);
  };

  const handleSort = (field: keyof ClubStatistics['players'][0]) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedPlayers = () => {
    if (!clubStats || !sortField) return clubStats?.players || [];
    
    return [...clubStats.players].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Filter clubs based on search
  const filteredClubs = availableClubs.filter(club => {
    const searchLower = clubSearch.toLowerCase();
    return club.toLowerCase().includes(searchLower);
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
  const prepareChartData = (monthlyData: ClubStatistics['monthly_evolution'], key: keyof ClubStatistics['monthly_evolution'][0]) => {
    return monthlyData
      .map((entry) => ({
        month: formatMonthYear(entry.year, entry.month),
        value: entry[key] as number,
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

  if (error || !clubStats) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
            <div className="text-red-600 text-lg font-medium">{error || 'Club not found'}</div>
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
                  {clubStats.club_name}
                </h1>
                <p className="text-gray-600 mt-1">Club Statistics & Analysis</p>
              </div>
            </div>

            {/* Club Comparison Button */}
            <div className="flex justify-end">
              {comparisonClub ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Comparing with:</span>
                    <Badge variant="outline" className="text-blue-600">
                      {comparisonClub.club_name}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={clearComparison}>
                    Clear Comparison
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setShowComparisonPopup(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  Compare with Another Club
                </Button>
              )}
            </div>
          </div>

          {/* General Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>General Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <div>
                    <label className="text-xs font-medium text-gray-500">Total Players</label>
                    <p className="text-sm font-medium text-gray-900">
                      {clubStats.total_players}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Award className="h-4 w-4 text-gray-500" />
                  <div>
                    <label className="text-xs font-medium text-gray-500">Male Players</label>
                    <p className="text-sm font-medium text-gray-900">
                      {clubStats.male_players}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Award className="h-4 w-4 text-gray-500" />
                  <div>
                    <label className="text-xs font-medium text-gray-500">Female Players</label>
                    <p className="text-sm font-medium text-gray-900">
                      {clubStats.female_players}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <label className="text-xs font-medium text-gray-500">Average Age</label>
                    <p className="text-sm font-medium text-gray-900">
                      {clubStats.average_age} years
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Flag className="h-4 w-4 text-gray-500" />
                  <div>
                    <label className="text-xs font-medium text-gray-500">Top Nationality</label>
                    <p className="text-sm font-medium text-gray-900">
                      {clubStats.top_nationalities[0]?.nationality || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Average Ranking */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Average Ranking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Badge className={getRankingColor(clubStats.average_ranking)}>
                    P{clubStats.average_ranking}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Top 10 Count */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Top 10 Players</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-bold">{clubStats.top_10_count}</span>
                </div>
              </CardContent>
            </Card>

            {/* Top 50 Count */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Top 50 Players</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold">{clubStats.top_50_count}</span>
                </div>
              </CardContent>
            </Card>

            {/* Top 100 Count */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Top 100 Players</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                  <span className="text-2xl font-bold">{clubStats.top_100_count}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Players Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 10 Male Players */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>Top 10 Male Players</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {clubStats.top_10_male.map((player, index) => (
                    <div key={player.licence} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <div>
                          <p className="text-sm font-medium">{player.nom || `Player ${player.licence}`}</p>
                          <p className="text-xs text-gray-500">{player.points || 0} pts • {clubStats.players.find(p => p.licence === player.licence)?.nb_tournois || 0} tournaments</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getRankingColor(player.rang)}>
                          P{player.rang || 'N/A'}
                        </Badge>
                        {getEvolutionIcon(player.evolution)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top 10 Female Players */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>Top 10 Female Players</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {clubStats.top_10_female.map((player, index) => (
                    <div key={player.licence} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <div>
                          <p className="text-sm font-medium">{player.nom || `Player ${player.licence}`}</p>
                          <p className="text-xs text-gray-500">{player.points || 0} pts • {clubStats.players.find(p => p.licence === player.licence)?.nb_tournois || 0} tournaments</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getRankingColor(player.rang)}>
                          P{player.rang || 'N/A'}
                        </Badge>
                        {getEvolutionIcon(player.evolution)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Special Players */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Active Male Player */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Most Active Male Player</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-lg font-medium">{clubStats.most_active_male_player.nom || `Player ${clubStats.most_active_male_player.licence}`}</p>
                  <p className="text-sm text-gray-500">{clubStats.players.find(p => p.licence === clubStats.most_active_male_player.licence)?.points || 0} pts • {clubStats.most_active_male_player.nb_tournois || 0} tournaments</p>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-lg">
                      {clubStats.most_active_male_player.nb_tournois || 0} tournaments
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Most Active Female Player */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Most Active Female Player</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-lg font-medium">{clubStats.most_active_female_player.nom || `Player ${clubStats.most_active_female_player.licence}`}</p>
                  <p className="text-sm text-gray-500">{clubStats.players.find(p => p.licence === clubStats.most_active_female_player.licence)?.points || 0} pts • {clubStats.most_active_female_player.nb_tournois || 0} tournaments</p>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-lg">
                      {clubStats.most_active_female_player.nb_tournois || 0} tournaments
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Most Efficient Male Player */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Most Efficient Male Player</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-lg font-medium">{clubStats.most_efficient_male_player.nom || `Player ${clubStats.most_efficient_male_player.licence}`}</p>
                  <p className="text-sm text-gray-500">{clubStats.players.find(p => p.licence === clubStats.most_efficient_male_player.licence)?.points || 0} pts • {clubStats.players.find(p => p.licence === clubStats.most_efficient_male_player.licence)?.nb_tournois || 0} tournaments</p>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-lg">
                      {clubStats.most_efficient_male_player.points_per_tournament} pts/tournament
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Most Efficient Female Player */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Most Efficient Female Player</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-lg font-medium">{clubStats.most_efficient_female_player.nom || `Player ${clubStats.most_efficient_female_player.licence}`}</p>
                  <p className="text-sm text-gray-500">{clubStats.players.find(p => p.licence === clubStats.most_efficient_female_player.licence)?.points || 0} pts • {clubStats.players.find(p => p.licence === clubStats.most_efficient_female_player.licence)?.nb_tournois || 0} tournaments</p>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-lg">
                      {clubStats.most_efficient_female_player.points_per_tournament} pts/tournament
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Evolution Charts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Monthly Evolution (Last 12 Months)</span>
              </CardTitle>
              <CardDescription>Club performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Total Points Chart */}
                <ClubChart 
                  data={prepareChartData(clubStats.monthly_evolution, 'total_points')}
                  comparisonData={comparisonClub ? prepareChartData(comparisonClub.monthly_evolution, 'total_points') : undefined}
                  title="Total Points"
                  color="#10b981"
                  comparisonColor="#f59e0b"
                />

                {/* Total Tournaments Chart */}
                <ClubChart 
                  data={prepareChartData(clubStats.monthly_evolution, 'total_tournaments')}
                  comparisonData={comparisonClub ? prepareChartData(comparisonClub.monthly_evolution, 'total_tournaments') : undefined}
                  title="Total Tournaments"
                  color="#8b5cf6"
                  comparisonColor="#f59e0b"
                />

                {/* Active Players Chart */}
                <ClubChart 
                  data={prepareChartData(clubStats.monthly_evolution, 'active_players')}
                  comparisonData={comparisonClub ? prepareChartData(comparisonClub.monthly_evolution, 'active_players') : undefined}
                  title="Active Players"
                  color="#3b82f6"
                  comparisonColor="#f59e0b"
                />

                {/* Points by Gender Chart */}
                <ClubChart 
                  data={prepareChartData(clubStats.monthly_evolution, 'male_points')}
                  comparisonData={comparisonClub ? prepareChartData(comparisonClub.monthly_evolution, 'male_points') : undefined}
                  title="Male Points"
                  color="#ef4444"
                  comparisonColor="#f59e0b"
                />
              </div>

              {/* Chart Legend */}
              {comparisonClub && (
                <div className="flex items-center justify-center space-x-6 text-sm mt-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-0.5 bg-blue-500"></div>
                    <span className="text-gray-700 font-medium">{clubStats.club_name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-0.5 bg-orange-500 border-dashed border-orange-500"></div>
                    <span className="text-gray-700 font-medium">{comparisonClub.club_name}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Club Comparison Section */}
          {comparisonClub && (
            <div className="space-y-6">
              {/* Comparison KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Players Comparison */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Players</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">{clubStats.club_name}</span>
                        <span className="text-lg font-bold">{clubStats.total_players}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">{comparisonClub.club_name}</span>
                        <span className="text-lg font-bold">{comparisonClub.total_players}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Average Ranking Comparison */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Average Ranking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">{clubStats.club_name}</span>
                        <Badge className={getRankingColor(clubStats.average_ranking)}>
                          P{clubStats.average_ranking}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">{comparisonClub.club_name}</span>
                        <Badge className={getRankingColor(comparisonClub.average_ranking)}>
                          P{comparisonClub.average_ranking}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top 10 Count Comparison */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Top 10 Players</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">{clubStats.club_name}</span>
                        <span className="text-lg font-bold">{clubStats.top_10_count}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">{comparisonClub.club_name}</span>
                        <span className="text-lg font-bold">{comparisonClub.top_10_count}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top 100 Count Comparison */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Top 100 Players</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">{clubStats.club_name}</span>
                        <span className="text-lg font-bold">{clubStats.top_100_count}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">{comparisonClub.club_name}</span>
                        <span className="text-lg font-bold">{comparisonClub.top_100_count}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top 10 Players Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top 10 Male Players Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Award className="h-5 w-5" />
                      <span>Top 10 Male Players Comparison</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {clubStats.top_10_male.slice(0, 5).map((player, index) => {
                        const comparisonPlayer = comparisonClub.top_10_male[index];
                        return (
                          <div key={player.licence} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                              <div>
                                <p className="text-sm font-medium">{player.nom || `Player ${player.licence}`}</p>
                                <p className="text-xs text-gray-500">{player.points || 0} pts • {clubStats.players.find(p => p.licence === player.licence)?.nb_tournois || 0} tournaments</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getRankingColor(player.rang)}>
                                P{player.rang || 'N/A'}
                              </Badge>
                              {getEvolutionIcon(player.evolution)}
                            </div>
                          </div>
                        );
                      })}
                      <Separator />
                      <div className="text-sm text-gray-500 text-center">vs</div>
                      <Separator />
                      {comparisonClub.top_10_male.slice(0, 5).map((player, index) => (
                        <div key={player.licence} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                            <div>
                              <p className="text-sm font-medium">{player.nom || `Player ${player.licence}`}</p>
                              <p className="text-xs text-gray-500">{player.points || 0} pts • {comparisonClub.players.find(p => p.licence === player.licence)?.nb_tournois || 0} tournaments</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getRankingColor(player.rang)}>
                              P{player.rang || 'N/A'}
                            </Badge>
                            {getEvolutionIcon(player.evolution)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top 10 Female Players Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Award className="h-5 w-5" />
                      <span>Top 10 Female Players Comparison</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {clubStats.top_10_female.slice(0, 5).map((player, index) => (
                        <div key={player.licence} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                            <div>
                              <p className="text-sm font-medium">{player.nom || `Player ${player.licence}`}</p>
                              <p className="text-xs text-gray-500">{player.points || 0} pts • {clubStats.players.find(p => p.licence === player.licence)?.nb_tournois || 0} tournaments</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getRankingColor(player.rang)}>
                              P{player.rang || 'N/A'}
                            </Badge>
                            {getEvolutionIcon(player.evolution)}
                          </div>
                        </div>
                      ))}
                      <Separator />
                      <div className="text-sm text-gray-500 text-center">vs</div>
                      <Separator />
                      {comparisonClub.top_10_female.slice(0, 5).map((player, index) => (
                        <div key={player.licence} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                          <div className="flex items-center space-x-3">
                            <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                            <div>
                              <p className="text-sm font-medium">{player.nom || `Player ${player.licence}`}</p>
                              <p className="text-xs text-gray-500">{player.points || 0} pts • {comparisonClub.players.find(p => p.licence === player.licence)?.nb_tournois || 0} tournaments</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getRankingColor(player.rang)}>
                              P{player.rang || 'N/A'}
                            </Badge>
                            {getEvolutionIcon(player.evolution)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* All Players Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>All Club Players</span>
              </CardTitle>
              <CardDescription>Complete list of players in the club</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('nom')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Name</span>
                          {sortField === 'nom' && (
                            <span className="text-xs">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('licence')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Licence</span>
                          {sortField === 'licence' && (
                            <span className="text-xs">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('genre')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Gender</span>
                          {sortField === 'genre' && (
                            <span className="text-xs">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('rang')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Ranking</span>
                          {sortField === 'rang' && (
                            <span className="text-xs">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('points')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Points</span>
                          {sortField === 'points' && (
                            <span className="text-xs">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('meilleur_classement')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Best Ranking</span>
                          {sortField === 'meilleur_classement' && (
                            <span className="text-xs">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('nationalite')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Nationality</span>
                          {sortField === 'nationalite' && (
                            <span className="text-xs">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('annee_naissance')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Age</span>
                          {sortField === 'annee_naissance' && (
                            <span className="text-xs">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('nb_tournois')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Tournaments</span>
                          {sortField === 'nb_tournois' && (
                            <span className="text-xs">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getSortedPlayers().map((player) => (
                      <TableRow key={player.licence}>
                        <TableCell className="font-medium">
                          {player.nom || `Player ${player.licence}`}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {player.licence}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {player.genre === 'Homme' ? 'Men' : 'Women'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRankingColor(player.rang)}>
                            P{player.rang || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>{player.points || 'N/A'}</TableCell>
                        <TableCell>
                          {player.meilleur_classement ? (
                            <Badge variant="outline" className={getRankingColor(player.meilleur_classement)}>
                              P{player.meilleur_classement}
                            </Badge>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell>{player.nationalite || 'N/A'}</TableCell>
                        <TableCell>
                          {player.annee_naissance 
                            ? new Date().getFullYear() - player.annee_naissance 
                            : 'N/A'
                          }
                        </TableCell>
                        <TableCell>{player.nb_tournois || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Club Comparison Popup */}
        <Dialog open={showComparisonPopup} onOpenChange={setShowComparisonPopup}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Select Club to Compare</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search clubs..."
                  value={clubSearch}
                  onChange={(e) => setClubSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Clubs Table */}
              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Club Name</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClubs
                      .filter(club => club !== clubName)
                      .map((club) => (
                        <TableRow key={club} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            {club}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              size="sm" 
                              onClick={() => handleComparisonSelect(club)}
                              disabled={club === clubName}
                            >
                              Compare
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    {filteredClubs.filter(club => club !== clubName).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                          No clubs found matching your search
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
