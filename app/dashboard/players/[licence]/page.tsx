'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Trophy, MapPin, Calendar, Users, Target, Award, Flag, Building } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  year: number;
  monthNumber: number;
}

const RankingChart = ({ data, comparisonData }: { data: ChartData[]; comparisonData?: ChartData[] }) => {
  if (data.length === 0) return <div className="text-gray-500 text-center py-8">No data available</div>;
  
  // Prepare data for Recharts
  const chartData = data.map((item, index) => ({
    month: new Date(item.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    ranking: item.ranking,
    comparisonRanking: comparisonData?.[index]?.ranking || null
  }));

  return (
    <div className="w-full h-full">
      {/* @ts-ignore */}
      <ResponsiveContainer width="100%" height="100%">
        {/* @ts-ignore */}
        <LineChart data={chartData} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
          {/* @ts-ignore */}
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          {/* @ts-ignore */}
          <XAxis 
            dataKey="month" 
            angle={-75}
            textAnchor="end"
            height={60}
            tick={{ fontSize: 10, fill: '#6b7280' }}
          />
          {/* @ts-ignore */}
          <YAxis 
            domain={['dataMin - 100', 'dataMax + 100']}
            tick={{ fontSize: 10, fill: '#6b7280' }}
          />
          {/* @ts-ignore */}
          <Tooltip 
            formatter={(value: any, name: string) => [
              name === 'ranking' ? value : value,
              name === 'ranking' ? 'Ranking' : 'Comparison'
            ]}
            labelFormatter={(label) => `Month: ${label}`}
          />
          {/* @ts-ignore */}
          <Line 
            type="monotone" 
            dataKey="ranking" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5 }}
          />
          {comparisonData && comparisonData.length > 0 && (
            /* @ts-ignore */
            <Line 
              type="monotone" 
              dataKey="comparisonRanking" 
              stroke="#f59e0b" 
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={{ fill: '#f59e0b', strokeWidth: 1, r: 2.5 }}
            activeDot={{ r: 4 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const PointsChart = ({ data, comparisonData }: { data: ChartData[]; comparisonData?: ChartData[] }) => {
  if (data.length === 0) return <div className="text-gray-500 text-center py-8">No data available</div>;
  
  // Prepare data for Recharts
  const chartData = data.map((entry, index) => ({
    month: entry.month,
    points: entry.points,
    comparisonPoints: comparisonData?.[index]?.points
  }));

  return (
    <div className="w-full h-full">
      {/* @ts-ignore */}
      <ResponsiveContainer width="100%" height="100%">
        {/* @ts-ignore */}
        <LineChart data={chartData} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
          {/* @ts-ignore */}
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          {/* @ts-ignore */}
          <XAxis 
            dataKey="month" 
            angle={-75}
            textAnchor="end"
            height={60}
            tick={{ fontSize: 10, fill: '#6b7280' }}
          />
          {/* @ts-ignore */}
          <YAxis 
            domain={['dataMin - 50', 'dataMax + 50']}
            tick={{ fontSize: 10, fill: '#6b7280' }}
          />
          {/* @ts-ignore */}
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px'
            }}
            formatter={(value: any, name: string) => [value, name === 'points' ? 'Points' : 'Comparison Points']}
            labelFormatter={(label) => `Month: ${label}`}
          />
          {/* @ts-ignore */}
          <Line 
            type="monotone" 
            dataKey="points" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ fill: '#10b981', stroke: 'white', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5 }}
          />
          {comparisonData && comparisonData.length > 0 && (
            /* @ts-ignore */
            <Line 
              type="monotone" 
              dataKey="comparisonPoints" 
              stroke="#f59e0b" 
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={{ fill: '#f59e0b', stroke: 'white', strokeWidth: 1, r: 2.5 }}
            activeDot={{ r: 4 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const TournamentsChart = ({ data, comparisonData }: { data: ChartData[]; comparisonData?: ChartData[] }) => {
  if (data.length === 0) return <div className="text-gray-500 text-center py-8">No data available</div>;
  
  // Prepare data for Recharts
  const chartData = data.map((entry, index) => ({
    month: entry.month,
    tournaments: entry.tournaments,
    comparisonTournaments: comparisonData?.[index]?.tournaments
  }));

  return (
    <div className="w-full h-full">
      {/* @ts-ignore */}
      <ResponsiveContainer width="100%" height="100%">
        {/* @ts-ignore */}
        <LineChart data={chartData} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
          {/* @ts-ignore */}
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          {/* @ts-ignore */}
          <XAxis 
            dataKey="month" 
            angle={-75}
            textAnchor="end"
            height={60}
            tick={{ fontSize: 10, fill: '#6b7280' }}
          />
          {/* @ts-ignore */}
          <YAxis 
            domain={['dataMin - 1', 'dataMax + 1']}
            tick={{ fontSize: 10, fill: '#6b7280' }}
          />
          {/* @ts-ignore */}
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px'
            }}
            formatter={(value: any, name: string) => [value, name === 'tournaments' ? 'Tournaments' : 'Comparison Tournaments']}
            labelFormatter={(label) => `Month: ${label}`}
          />
          {/* @ts-ignore */}
          <Line 
            type="monotone" 
            dataKey="tournaments" 
            stroke="#8b5cf6" 
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', stroke: 'white', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5 }}
          />
          {comparisonData && comparisonData.length > 0 && (
            /* @ts-ignore */
            <Line 
              type="monotone" 
              dataKey="comparisonTournaments" 
              stroke="#f59e0b" 
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={{ fill: '#f59e0b', stroke: 'white', strokeWidth: 1, r: 2.5 }}
            activeDot={{ r: 4 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};


export default function PlayerStatisticsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const licence = params.licence as string;
  const from = searchParams.get('from');
  const [playerStats, setPlayerStats] = useState<PlayerStatistics | null>(null);
  const [comparisonPlayer, setComparisonPlayer] = useState<PlayerStatistics | null>(null);
  const [showComparisonPopup, setShowComparisonPopup] = useState(false);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (licence) {
      fetchPlayerStatistics();
      fetchAllPlayers();
    }
  }, [licence]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (playerSearch.trim()) {
        searchPlayers(playerSearch);
      } else {
        setSearchResults([]);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [playerSearch]);

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

  const fetchAllPlayers = async () => {
    try {
      // Only fetch a small initial set for display
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('tenup_latest')
        .select('id, idcrm, nom, prenom, nom_complet, sexe, ligue, classement, points, evolution, meilleur_classement, nationalite, age_sportif, nombre_tournois, date_classement, ranking_year, ranking_month')
        .order('nom_complet')
        .limit(100); // Limit initial load for performance
      
      if (error) {
        console.error('Error fetching initial players:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return;
      }
      
      setAllPlayers(data || []);
    } catch (err) {
      console.error('Error fetching initial players:', err);
    }
  };

  const searchPlayers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      
      const trimmed = searchTerm.trim();
      const tokens = trimmed.split(/\s+/).filter(t => t.length > 0);
      
      // First, get the user's followed players
      const { data: followedPlayers, error: followedError } = await supabase
        .from('players')
        .select('licence')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
      
      if (followedError) {
        console.error('Error fetching followed players:', followedError);
        setSearchResults([]);
        return;
      }
      
      if (!followedPlayers || followedPlayers.length === 0) {
        setSearchResults([]);
        return;
      }
      
      const followedLicences = followedPlayers.map(p => p.licence);
      
      let query = supabase
        .from('tenup_latest')
        .select('id, idcrm, nom, prenom, nom_complet, sexe, ligue, classement, points, evolution, meilleur_classement, nationalite, age_sportif, nombre_tournois, date_classement, ranking_year, ranking_month')
        .in('idcrm', followedLicences)
        .order('nom_complet')
        .limit(200);
      
      if (trimmed) {
        const orConditions = [];
        for (const t of tokens) {
          const isNumber = !isNaN(Number(t));
          if (isNumber) {
            orConditions.push(`nom_complet.ilike.*${t}*`);
            orConditions.push(`idcrm.eq.${t}`);
          } else {
            orConditions.push(`nom_complet.ilike.*${t}*`);
            orConditions.push(`ligue.ilike.*${t}*`);
          }
        }
        if (orConditions.length > 0) {
          query = query.or(orConditions.join(','));
        }
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error searching players:', error);
        return;
      }
      
      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching players:', err);
    } finally {
      setIsSearching(false);
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

  // Use search results when available, otherwise show initial players
  const displayPlayers = playerSearch.trim() ? searchResults : allPlayers;

  const getRankingColor = (ranking: number | null) => {
    if (!ranking) return 'bg-gray-100 text-gray-800';
    if (ranking <= 25) return 'bg-green-100 text-green-800';
    if (ranking <= 100) return 'bg-blue-100 text-blue-800';
    if (ranking <= 250) return 'bg-purple-100 text-purple-800';
    if (ranking <= 500) return 'bg-orange-100 text-orange-800';
    if (ranking <= 1000) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getRankingTextColor = (ranking: number | null) => {
    if (!ranking) return 'text-gray-600';
    if (ranking <= 25) return 'text-green-600';
    if (ranking <= 100) return 'text-blue-600';
    if (ranking <= 250) return 'text-purple-600';
    if (ranking <= 500) return 'text-orange-600';
    if (ranking <= 1000) return 'text-red-600';
    return 'text-gray-600';
  };

  const getEvolutionIcon = (evolution: number | null) => {
    if (!evolution) return <Minus className="h-4 w-4 text-gray-500" />;
    // In padel: positive evolution = ranking got worse (should be red and down)
    // negative evolution = ranking improved (should be green and up)
    if (evolution > 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    if (evolution < 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
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
    // In padel: positive evolution = ranking got worse (should be red)
    // negative evolution = ranking improved (should be green)
    if (evolution > 0) return 'text-red-600';
    if (evolution < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  // Separate function for Average Progression (opposite logic)
  const getAverageProgressionColor = (progression: number | null) => {
    if (!progression) return 'text-gray-600';
    // For Average Progression: negative = ranking got worse (should be red)
    // positive = ranking improved (should be green)
    if (progression < 0) return 'text-red-600';
    if (progression > 0) return 'text-green-600';
    return 'text-gray-600';
  };

  // Separate function for Average Progression icon (opposite logic)
  const getAverageProgressionIcon = (progression: number | null) => {
    if (!progression) return <Minus className="h-4 w-4 text-gray-500" />;
    // For Average Progression: negative = ranking got worse (should be red down arrow)
    // positive = ranking improved (should be green up arrow)
    if (progression < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    if (progression > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
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
        year: entry.year,
        monthNumber: entry.month
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
        year: entry.year,
        monthNumber: entry.month
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
                         <Link href={from === 'ten-up' ? '/dashboard/ten-up' : '/dashboard'}>
               <Button variant="outline">
                 <ArrowLeft className="h-4 w-4 mr-2" />
                                      Back to {from === 'ten-up' ? "Ten'Up" : 'Dashboard'}
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
             <div className="flex flex-col space-y-4 sm:flex-row sm:items-start sm:justify-between">
               <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-x-4">
                 <Link href={from === 'ten-up' ? '/dashboard/ten-up' : '/dashboard'}>
                   <Button variant="outline" size="sm" className="w-full sm:w-auto">
                     <ArrowLeft className="h-4 w-4 mr-2" />
                     Back to {from === 'ten-up' ? "Ten'Up" : 'Dashboard'}
                   </Button>
                 </Link>
                 <div className="text-center sm:text-left">
                   <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                     {playerStats.nom || `Player ${playerStats.licence}`}
                   </h1>
                 </div>
               </div>
 
               {/* Player Comparison Button */}
               <div className="flex justify-center sm:justify-end">
                 {comparisonPlayer ? (
                   <div className="flex flex-col items-center space-y-2 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
                     <div className="flex flex-col items-center space-y-1 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
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
                   <Button onClick={() => setShowComparisonPopup(true)} className="w-full sm:w-auto">
                     <Users className="h-4 w-4 mr-2" />
                     Compare with Another Player
                   </Button>
                 )}
               </div>
             </div>

                         {/* Personal Information - One Line */}
             <Card>
               <CardContent className="pt-6">
                 <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                  <div className="flex items-center space-x-2">
                    <Award className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                    <div>
                      <label className="text-xs font-medium text-gray-500">Gender</label>
                      <p className="text-xs sm:text-sm font-medium text-gray-900">
                        {playerStats.genre === 'Homme' ? 'Men' : 'Women'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                    <div>
                      <label className="text-xs font-medium text-gray-500">Age</label>
                      <p className="text-xs sm:text-sm font-medium text-gray-900">
                        {playerStats.birth_year || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Flag className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                    <div>
                      <label className="text-xs font-medium text-gray-500">Nationality</label>
                      <p className="text-xs sm:text-sm font-medium text-gray-900">
                        {playerStats.nationality || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <label className="text-xs font-medium text-gray-500">League</label>
                      <p className="text-xs sm:text-sm font-medium text-gray-900 break-words leading-tight">
                        {playerStats.ligue || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

                         {/* KPI Stats Grid */}
             <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                             {/* Current Ranking */}
               <Card>
                 <CardHeader className="pb-2 sm:pb-3">
                   <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Current Ranking</CardTitle>
                 </CardHeader>
                 <CardContent className="py-3 sm:py-4">
                   <div className="space-y-1 sm:space-y-2">
                     <div className="flex items-center space-x-2">
                       <Badge className={getRankingColor(playerStats.current_ranking)}>
                         P{playerStats.current_ranking || 'N/A'}
                       </Badge>
                       {/* Show evolution only if there's actual change */}
                       {playerStats.ranking_evolution !== 0 && (
                         <>
                           {getEvolutionIcon(playerStats.ranking_evolution)}
                           <span className={`text-sm ${getEvolutionColor(playerStats.ranking_evolution)}`}>
                             {getEvolutionText(playerStats.ranking_evolution)}
                           </span>
                         </>
                       )}
                       {/* Show "No change" if ranking stayed the same */}
                       {playerStats.ranking_evolution === 0 && (
                         <span className="text-sm text-gray-500">No change</span>
                       )}
                     </div>
                     {/* Add explanation for ranking evolution */}
                     <p className="text-xs text-gray-400 mt-1">
                       {playerStats.date_classement 
                         ? new Date(playerStats.date_classement).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
                         : playerStats.ranking_month && playerStats.ranking_year
                           ? `${playerStats.ranking_month}/${playerStats.ranking_year}`
                           : 'Date unavailable'
                       }
                     </p>
                     {comparisonPlayer && (
                       <div className="flex items-center space-x-2 pt-1 border-t border-gray-100">
                         <Badge className={getRankingColor(comparisonPlayer.current_ranking)} variant="outline">
                           P{comparisonPlayer.current_ranking || 'N/A'}
                         </Badge>
                         {comparisonPlayer.ranking_evolution !== 0 ? (
                           <>
                             {getEvolutionIcon(comparisonPlayer.ranking_evolution)}
                             <span className={`text-sm ${getEvolutionColor(comparisonPlayer.ranking_evolution)}`}>
                               {getEvolutionText(comparisonPlayer.ranking_evolution)}
                             </span>
                           </>
                         ) : (
                           <span className="text-sm text-gray-500">No change</span>
                         )}
                       </div>
                     )}
                   </div>
                 </CardContent>
               </Card>

              {/* Best Ranking */}
              <Card>
                 <CardHeader className="pb-2 sm:pb-3">
                   <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Best Ranking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <Badge className={getRankingColor(playerStats.best_ranking)}>
                        P{playerStats.best_ranking || 'N/A'}
                      </Badge>
                    </div>
                    {comparisonPlayer && (
                      <div className="flex items-center space-x-2 pt-1 border-t border-gray-100">
                        <Trophy className="h-4 w-4 text-yellow-400" />
                        <Badge className={getRankingColor(comparisonPlayer.best_ranking)} variant="outline">
                          P{comparisonPlayer.best_ranking || 'N/A'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Current Points */}
              <Card>
                 <CardHeader className="pb-2 sm:pb-3">
                   <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Current Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-blue-500" />
                      <span className="text-2xl font-bold">{playerStats.current_points || 'N/A'}</span>
                    </div>
                    {comparisonPlayer && (
                      <div className="flex items-center space-x-2 pt-1 border-t border-gray-100">
                        <Target className="h-4 w-4 text-blue-400" />
                        <span className="text-lg font-bold text-blue-600">{comparisonPlayer.current_points || 'N/A'}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tournaments Count */}
              <Card>
                 <CardHeader className="pb-2 sm:pb-3">
                   <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Tournaments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-purple-500" />
                      <span className="text-2xl font-bold">{playerStats.current_tournaments_count || 'N/A'}</span>
                    </div>
                    <p className="text-xs text-gray-500">On 12 months</p>
                    {comparisonPlayer && (
                      <div className="flex items-center space-x-2 pt-1 border-t border-gray-100">
                        <Users className="h-4 w-4 text-purple-400" />
                        <span className="text-lg font-bold text-purple-600">{comparisonPlayer.current_tournaments_count || 'N/A'}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

                         {/* New Performance & Activity Metrics */}
             <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {/* Average Progression */}
              <Card>
                 <CardHeader className="pb-2 sm:pb-3">
                   <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Average Progression</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      {getAverageProgressionIcon(playerStats.average_progression)}
                      <span className={`text-lg font-bold ${getAverageProgressionColor(playerStats.average_progression)}`}>
                        {playerStats.average_progression !== null ? 
                          (playerStats.average_progression > 0 ? `+${Math.round(playerStats.average_progression)}` : Math.round(playerStats.average_progression)) : 
                          'N/A'
                        }
                      </span>
                    </div>
                    {comparisonPlayer && (
                      <div className="flex items-center space-x-2 pt-1 border-t border-gray-100">
                        {getAverageProgressionIcon(comparisonPlayer.average_progression)}
                        <span className={`text-sm font-bold ${getAverageProgressionColor(comparisonPlayer.average_progression)}`}>
                          {comparisonPlayer.average_progression !== null ? 
                            (comparisonPlayer.average_progression > 0 ? `+${Math.round(comparisonPlayer.average_progression)}` : Math.round(comparisonPlayer.average_progression)) : 
                            'N/A'
                          }
                        </span>
                      </div>
                    )}
                  </div>
                   <p className="text-xs text-gray-500 mt-1">Average over last 12 months</p>
                </CardContent>
              </Card>

              {/* Average Points */}
              <Card>
                 <CardHeader className="pb-2 sm:pb-3">
                   <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Average Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-indigo-500" />
                      <span className="text-lg font-bold text-gray-900">
                        {playerStats.current_points 
                          ? Math.round(playerStats.current_points / 12) 
                          : 'N/A'}
                      </span>
                    </div>
                    {comparisonPlayer && (
                      <div className="flex items-center space-x-2 pt-1 border-t border-gray-100">
                        <Target className="h-4 w-4 text-indigo-400" />
                        <span className="text-sm font-bold text-indigo-600">
                          {comparisonPlayer.current_points 
                            ? Math.round(comparisonPlayer.current_points / 12) 
                            : 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">On 12 tournaments</p>
                </CardContent>
              </Card>

              {/* Most Active Month */}
              <Card>
                 <CardHeader className="pb-2 sm:pb-3">
                   <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Most Active Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-orange-500" />
                      <div>
                        <span className="text-lg font-bold text-gray-900">
                          {playerStats.most_active_month ? playerStats.most_active_month.tournaments : 'N/A'}
                        </span>
                        {playerStats.most_active_month && (
                          <p className="text-xs text-gray-500">
                            {new Date(playerStats.most_active_month.year, playerStats.most_active_month.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                    {comparisonPlayer && (
                      <div className="flex items-center space-x-2 pt-1 border-t border-gray-100">
                        <Users className="h-4 w-4 text-orange-400" />
                        <div>
                          <span className="text-sm font-bold text-orange-600">
                            {comparisonPlayer.most_active_month ? comparisonPlayer.most_active_month.tournaments : 'N/A'}
                          </span>
                          {comparisonPlayer.most_active_month && (
                            <p className="text-xs text-gray-500">
                              {new Date(comparisonPlayer.most_active_month.year, comparisonPlayer.most_active_month.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* League Position */}
              <Card>
                 <CardHeader className="pb-2 sm:pb-3">
                   <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">League Position</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Building className="h-5 w-5 text-indigo-500" />
                      <div>
                        <span className="text-lg font-bold text-gray-900">
                          {playerStats.league_position ? `#${playerStats.league_position}` : 'N/A'}
                        </span>
                      </div>
                    </div>
                    {comparisonPlayer && (
                      <div className="flex items-center space-x-2 pt-1 border-t border-gray-100">
                        <Building className="h-4 w-4 text-indigo-400" />
                        <div>
                          <span className="text-sm font-bold text-indigo-600">
                            {comparisonPlayer.league_position ? `#${comparisonPlayer.league_position}` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Position in league</p>
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
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                 {/* Chart */}
                 <div className="lg:col-span-2">
                   <div className="h-80 sm:h-96 w-full">
                     <RankingChart 
                       data={prepareChartData(playerStats.ranking_history)} 
                       comparisonData={comparisonPlayer ? prepareComparisonChartData(comparisonPlayer.ranking_history) : undefined}
                     />
                   </div>
                   
                   {/* Chart Legend */}
                   {comparisonPlayer && (
                     <div className="flex items-center justify-center space-x-6 text-sm mt-6">
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
                 <div className="lg:col-span-1 mt-4 lg:mt-0">
                   <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly Details</h4>
                   <div className="space-y-1">
                     {/* Header */}
                     <div className={`grid ${comparisonPlayer ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-xs font-medium text-gray-500 border-b border-gray-200 pb-1`}>
                       <span>Month</span>
                       <span className="text-center">{playerStats.nom || 'Player'}</span>
                       {comparisonPlayer && (
                         <span className="text-center">{comparisonPlayer.nom || 'Comparison'}</span>
                       )}
                     </div>
                     
                     {/* Data Rows */}
                     {playerStats.ranking_history.slice(0, 12).map((entry, index) => {
                       const comparisonEntry = comparisonPlayer?.ranking_history[index];
                       return (
                         <div key={index} className={`grid ${comparisonPlayer ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-sm py-1 border-b border-gray-100 last:border-b-0`}>
                           <span className="text-gray-600">
                             {formatMonthYear(entry.year, entry.month)}
                           </span>
                           <div className="flex items-center justify-center">
                             <span className={`text-sm font-medium ${getRankingTextColor(entry.ranking)}`}>
                               {entry.ranking || 'N/A'}
                             </span>
                           </div>
                           {comparisonPlayer && comparisonEntry && (
                             <div className="flex items-center justify-center">
                               <span className={`text-sm font-medium ${getRankingTextColor(comparisonEntry.ranking)}`}>
                                 {comparisonEntry.ranking || 'N/A'}
                               </span>
                             </div>
                           )}
                         </div>
                       );
                     })}
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
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                 {/* Chart */}
                 <div className="lg:col-span-2">
                   <div className="h-80 sm:h-96 w-full">
                     <PointsChart 
                       data={prepareChartData(playerStats.ranking_history)} 
                       comparisonData={comparisonPlayer ? prepareComparisonChartData(comparisonPlayer.ranking_history) : undefined}
                     />
                   </div>
                   
                   {/* Chart Legend */}
                   {comparisonPlayer && (
                     <div className="flex items-center justify-center space-x-6 text-sm mt-6">
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
                 <div className="lg:col-span-1 mt-4 lg:mt-0">
                   <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly Details</h4>
                   <div className="space-y-1">
                     {/* Header */}
                     <div className={`grid ${comparisonPlayer ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-xs font-medium text-gray-500 border-b border-gray-200 pb-1`}>
                       <span>Month</span>
                       <span className="text-center">{playerStats.nom || 'Player'}</span>
                       {comparisonPlayer && (
                         <span className="text-center">{comparisonPlayer.nom || 'Comparison'}</span>
                       )}
                     </div>
                     
                     {/* Data Rows */}
                     {playerStats.ranking_history.slice(0, 12).map((entry, index) => {
                       const comparisonEntry = comparisonPlayer?.ranking_history[index];
                       return (
                         <div key={index} className={`grid ${comparisonPlayer ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-sm py-1 border-b border-gray-100 last:border-b-0`}>
                           <span className="text-gray-600">
                             {formatMonthYear(entry.year, entry.month)}
                           </span>
                           <div className="flex items-center justify-center">
                             <span className="font-medium">{entry.points || 'N/A'}</span>
                           </div>
                           {comparisonPlayer && comparisonEntry && (
                             <div className="flex items-center justify-center">
                               <span className="text-gray-600">{comparisonEntry.points || 'N/A'}</span>
                             </div>
                           )}
                         </div>
                       );
                     })}
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
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                 {/* Chart */}
                 <div className="lg:col-span-2">
                   <div className="h-80 sm:h-96 w-full">
                     <TournamentsChart 
                       data={prepareChartData(playerStats.ranking_history)} 
                       comparisonData={comparisonPlayer ? prepareComparisonChartData(comparisonPlayer.ranking_history) : undefined}
                     />
                   </div>
                   
                   {/* Chart Legend */}
                   {comparisonPlayer && (
                     <div className="flex items-center justify-center space-x-6 text-sm mt-6">
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
                 <div className="lg:col-span-1 mt-4 lg:mt-0">
                   <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly Details</h4>
                   <div className="space-y-1">
                     {/* Header */}
                     <div className={`grid ${comparisonPlayer ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-xs font-medium text-gray-500 border-b border-gray-200 pb-1`}>
                       <span>Month</span>
                       <span className="text-center">{playerStats.nom || 'Player'}</span>
                       {comparisonPlayer && (
                         <span className="text-center">{comparisonPlayer.nom || 'Comparison'}</span>
                       )}
                     </div>
                     
                     {/* Data Rows */}
                     {playerStats.ranking_history.slice(0, 12).map((entry, index) => {
                       const comparisonEntry = comparisonPlayer?.ranking_history[index];
                       return (
                         <div key={index} className={`grid ${comparisonPlayer ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-sm py-1 border-b border-gray-100 last:border-b-0`}>
                           <span className="text-gray-600">
                             {formatMonthYear(entry.year, entry.month)}
                           </span>
                           <div className="flex items-center justify-center">
                             <span className="font-medium">{entry.tournaments_count || 'N/A'}</span>
                           </div>
                           {comparisonPlayer && comparisonEntry && (
                             <div className="flex items-center justify-center">
                               <span className="text-gray-600">{comparisonEntry.tournaments_count || 'N/A'}</span>
                             </div>
                           )}
                         </div>
                       );
                     })}
                   </div>
                 </div>
               </div>
             </CardContent>
           </Card>
         </div>

                   {/* Player Comparison Popup */}
          <Dialog open={showComparisonPopup} onOpenChange={setShowComparisonPopup}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden w-[95vw] sm:w-auto">
             <DialogHeader>
               <DialogTitle>Select Player to Compare</DialogTitle>
             </DialogHeader>
             
                           <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search followed players by name, license, or league..."
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    className="pl-10"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
                
                {/* Search Status */}
                {playerSearch.trim() && (
                  <div className="text-sm text-gray-600">
                    {isSearching ? 'Searching...' : `Found ${searchResults.length} players`}
                  </div>
                )}

                                {/* Players Table */}
                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  {/* Show initial state when no search */}
                  {!playerSearch.trim() && (
                    <div className="text-center py-16 text-gray-500">
                      <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">Search followed players to compare</p>
                      <p className="text-sm">Enter a name, license number, or league to find players you follow</p>
                    </div>
                  )}

                  {/* Show search results when searching */}
                  {playerSearch.trim() && (
                    <>
                      {/* Mobile Cards View */}
                      <div className="block sm:hidden space-y-2 p-2">
                        {displayPlayers
                          .filter(player => player.idcrm.toString() !== licence)
                          .map((player) => (
                            <Card key={player.idcrm} className="p-3">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm">
                                    {player.nom_complet || 'Player'}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {player.sexe === 'H' ? 'Men' : 'Women'}
                                  </Badge>
                                </div>
                                <div className="text-xs text-gray-600 space-y-1">
                                  <div>League: {player.ligue || 'N/A'}</div>
                                  <div>Ranking: {player.classement || 'N/A'}</div>
                                </div>
                                                                  <Button 
                                    size="sm" 
                                    onClick={() => handleComparisonSelect(player.idcrm.toString())}
                                    disabled={player.idcrm.toString() === licence}
                                    className="w-full text-xs"
                                  >
                                    Compare
                                  </Button>
                              </div>
                            </Card>
                          ))}
                        {displayPlayers.filter(player => player.idcrm.toString() !== licence).length === 0 && (
                          <div className="text-center py-8 text-gray-500 text-sm">
                            No players found matching your search
                          </div>
                        )}
                      </div>
                      
                                             {/* Desktop Table View */}
                       <div className="hidden sm:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>League</TableHead>
                              <TableHead className="text-center">Ranking</TableHead>
                              <TableHead className="text-center">Gender</TableHead>
                              <TableHead className="text-center">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {displayPlayers
                              .filter(player => player.idcrm.toString() !== licence)
                              .map((player) => (
                                <TableRow key={player.idcrm} className="hover:bg-gray-50">
                                  <TableCell className="font-medium">
                                    {player.nom_complet || 'Player'}
                                  </TableCell>
                                  <TableCell>
                                    {player.ligue || 'N/A'}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline" className="font-mono">
                                      {player.classement || 'N/A'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline" className="text-xs">
                                      {player.sexe === 'H' ? 'Men' : 'Women'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                                                      <Button 
                                    size="sm" 
                                    onClick={() => handleComparisonSelect(player.idcrm.toString())}
                                    disabled={player.idcrm.toString() === licence}
                                  >
                                    Compare
                                  </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            {displayPlayers.filter(player => player.idcrm.toString() !== licence).length === 0 && (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                  No players found matching your search
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </div>
             </div>
           </DialogContent>
         </Dialog>
       </DashboardLayout>
     </ProtectedRoute>
   );
 }
