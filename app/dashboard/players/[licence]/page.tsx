'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
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
  
  // Use container-based responsive dimensions
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 200 });
  
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const isMobile = containerWidth < 640;
        setDimensions({
          width: isMobile ? containerWidth : Math.min(containerWidth, 800),
          height: isMobile ? 200 : 250
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  const { width, height } = dimensions;
  const padding = width < 640 ? 20 : 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;
  
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    // Reversed Y-axis: lower ranking (better) at top, higher ranking (worse) at bottom
    const y = padding + ((d.ranking - minRanking) / range) * chartHeight;
    return { x, y, ...d };
  });

  const comparisonPoints = comparisonData?.map((d, i) => {
    const x = padding + (i / (comparisonData.length - 1)) * chartWidth;
    // Reversed Y-axis: lower ranking (better) at top, higher ranking (worse) at bottom
    const y = padding + ((d.ranking - minRanking) / range) * chartHeight;
    return { x, y, ...d };
  }) || [];
  
  const pathData = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  const comparisonPathData = comparisonPoints.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');
  
  return (
    <div ref={containerRef} className="w-full">
      <svg width={width} height={height} className="w-full h-auto" viewBox={`0 0 ${width} ${height}`}>
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
          // Labels go from minRanking (better) at top to maxRanking (worse) at bottom
          const ranking = minRanking + (i / 4) * range;
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
        
        {/* Additional Y-axis label for the bottom to prevent cutoff */}
        <text
          x={padding - 10}
          y={height - padding + 4}
          textAnchor="end"
          className="text-xs fill-gray-600"
        >
          P{Math.round(maxRanking)}
        </text>
        
        {/* X-axis labels removed for cleaner look */}
        
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
  
  // Use container-based responsive dimensions
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 200 });
  
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const isMobile = containerWidth < 640;
        setDimensions({
          width: isMobile ? containerWidth : Math.min(containerWidth, 800),
          height: isMobile ? 200 : 250
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  const { width, height } = dimensions;
  const padding = width < 640 ? 20 : 40;
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
    <div ref={containerRef} className="w-full">
      <svg width={width} height={height} className="w-full h-auto" viewBox={`0 0 ${width} ${height}`}>
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
              className="text-xs fill-gray-500"
            >
              {Math.round(points)}
            </text>
          );
        })}
        
        {/* Additional Y-axis label for the bottom to prevent cutoff */}
        <text
          x={padding - 10}
          y={height - padding + 4}
          textAnchor="end"
          className="text-xs fill-gray-500"
        >
          {Math.round(minPoints)}
        </text>
        
        {/* X-axis labels removed for cleaner look */}
        
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
  
  // Use container-based responsive dimensions
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 200 });
  
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const isMobile = containerWidth < 640;
        setDimensions({
          width: isMobile ? containerWidth : Math.min(containerWidth, 800),
          height: isMobile ? 200 : 250
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  const { width, height } = dimensions;
  const padding = width < 640 ? 20 : 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;
  
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + ((maxTournaments - d.tournaments) / range) * chartHeight;
    return { x, y, ...d };
  });

  const comparisonPoints = comparisonData?.map((d, i) => {
    const x = padding + (i / (comparisonData.length - 1)) * chartWidth;
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
    <div ref={containerRef} className="w-full">
      <svg width={width} height={height} className="w-full h-auto" viewBox={`0 0 ${width} ${height}`}>
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
        
        {/* Additional Y-axis label for the bottom to prevent cutoff */}
        <text
          x={padding - 10}
          y={height - padding + 4}
          textAnchor="end"
          className="text-xs fill-gray-600"
        >
          {Math.round(minTournaments)}
        </text>
        
        {/* X-axis labels removed for cleaner look */}
        
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
        .select('idcrm, nom_complet, sexe, ligue, classement, points')
        .order('nom_complet')
        .limit(100); // Limit initial load for performance
      
      if (error) {
        console.error('Error fetching initial players:', error);
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
      
      // Use ILIKE for case-insensitive search across multiple fields
      const { data, error } = await supabase
        .from('tenup_latest')
        .select('idcrm, nom_complet, sexe, ligue, classement, points')
        .or(`nom_complet.ilike.%${searchTerm}%,idcrm.ilike.%${searchTerm}%,ligue.ilike.%${searchTerm}%`)
        .order('nom_complet')
        .limit(200); // Limit search results for performance
      
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
                   <p className="text-gray-600 mt-1">Licence: {playerStats.licence}</p>
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
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
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
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                             {/* Current Ranking */}
               <Card>
                 <CardHeader className="pb-3">
                   <CardTitle className="text-sm font-medium text-gray-600">Current Ranking</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-2">
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
                       {playerStats.ranking_evolution !== null && playerStats.ranking_evolution !== 0
                         ? playerStats.ranking_evolution > 0 
                           ? 'Positive = ranking got worse (higher number)' 
                           : 'Negative = ranking improved (lower number)'
                         : 'No change from last month'
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
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Best Ranking</CardTitle>
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
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Current Points</CardTitle>
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
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Tournaments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-purple-500" />
                      <span className="text-2xl font-bold">{playerStats.current_tournaments_count || 'N/A'}</span>
                    </div>
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
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Average Progression */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Average Progression</CardTitle>
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
                                     <p className="text-xs text-gray-500 mt-1">Average ranking change</p>
                   <p className="text-xs text-gray-400 mt-1">Last 12 months</p>
                   <p className="text-xs text-gray-400 mt-1">
                     {playerStats.average_progression && playerStats.average_progression < 0 
                       ? 'Negative = ranking improved (better)' 
                       : playerStats.average_progression && playerStats.average_progression > 0 
                         ? 'Positive = ranking got worse' 
                         : 'No change'
                     }
                   </p>
                </CardContent>
              </Card>

              {/* Participation Rate */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Participation Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-indigo-500" />
                      <span className="text-lg font-bold text-gray-900">
                        {playerStats.participation_rate !== null ? `${Math.round(playerStats.participation_rate)}%` : 'N/A'}
                      </span>
                    </div>
                    {comparisonPlayer && (
                      <div className="flex items-center space-x-2 pt-1 border-t border-gray-100">
                        <Calendar className="h-4 w-4 text-indigo-400" />
                        <span className="text-sm font-bold text-indigo-600">
                          {comparisonPlayer.participation_rate !== null ? `${Math.round(comparisonPlayer.participation_rate)}%` : 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">% of months with tournaments</p>
                  <p className="text-xs text-gray-400 mt-1">Last 12 months</p>
                </CardContent>
              </Card>

              {/* Most Active Month */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Most Active Month</CardTitle>
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
                  <p className="text-xs text-gray-400 mt-1">Tournaments in that month</p>
                </CardContent>
              </Card>

                             {/* Club Position */}
               <Card>
                 <CardHeader className="pb-3">
                   <CardTitle className="text-sm font-medium text-gray-600">Club Position</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-2">
                     <p className="text-xs text-gray-400 mt-1">Club position information has been removed</p>
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
               <CardDescription>Last 12 months ranking progression (lower = better)</CardDescription>
             </CardHeader>
             <CardContent>
                               <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* Chart */}
                  <div className="lg:col-span-2">
                    <div className="h-48 sm:h-64 w-full">
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
                    <div>
                      {/* Header */}
                      <div className={`grid ${comparisonPlayer ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mb-2 text-xs font-medium text-gray-500 border-b border-gray-200 pb-1`}>
                        <span>Month</span>
                        <span className="text-center">{playerStats.nom || 'Player'}</span>
                        {comparisonPlayer && (
                          <span className="text-center">{comparisonPlayer.nom || 'Comparison'}</span>
                        )}
                      </div>
                      
                      {/* Data Rows */}
                      <div className="space-y-1">
                        {playerStats.ranking_history.slice(0, 12).map((entry, index) => {
                          const comparisonEntry = comparisonPlayer?.ranking_history[index];
                          return (
                            <div key={index} className={`grid ${comparisonPlayer ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-sm`}>
                              <span className="text-gray-600">
                                {formatMonthYear(entry.year, entry.month)}
                              </span>
                              <div className="flex items-center justify-center space-x-1">
                                <Badge className={getRankingColor(entry.ranking)}>
                                  P{entry.ranking || 'N/A'}
                                </Badge>
                                {entry.points && (
                                  <span className="text-xs text-gray-500">({entry.points})</span>
                                )}
                              </div>
                              {comparisonPlayer && comparisonEntry && (
                                <div className="flex items-center justify-center space-x-1">
                                  <Badge className={`${getRankingColor(comparisonEntry.ranking)} text-xs`} variant="outline">
                                    P{comparisonEntry.ranking || 'N/A'}
                                  </Badge>
                                  {comparisonEntry.points && (
                                    <span className="text-xs text-gray-400">({comparisonEntry.points})</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
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
                               <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* Chart */}
                  <div className="lg:col-span-2">
                    <div className="h-48 sm:h-64 w-full">
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
                    <div>
                      {/* Header */}
                      <div className={`grid ${comparisonPlayer ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mb-2 text-xs font-medium text-gray-500 border-b border-gray-200 pb-1`}>
                        <span>Month</span>
                        <span className="text-center">{playerStats.nom || 'Player'}</span>
                        {comparisonPlayer && (
                          <span className="text-center">{comparisonPlayer.nom || 'Comparison'}</span>
                        )}
                      </div>
                      
                      {/* Data Rows */}
                      <div className="space-y-1">
                        {playerStats.ranking_history.slice(0, 12).map((entry, index) => {
                          const comparisonEntry = comparisonPlayer?.ranking_history[index];
                          return (
                            <div key={index} className={`grid ${comparisonPlayer ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-sm`}>
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
                               <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* Chart */}
                  <div className="lg:col-span-2">
                    <div className="h-48 sm:h-64 w-full">
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
                    <div>
                      {/* Header */}
                      <div className={`grid ${comparisonPlayer ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mb-2 text-xs font-medium text-gray-500 border-b border-gray-200 pb-1`}>
                        <span>Month</span>
                        <span className="text-center">{playerStats.nom || 'Player'}</span>
                        {comparisonPlayer && (
                          <span className="text-center">{comparisonPlayer.nom || 'Comparison'}</span>
                        )}
                      </div>
                      
                      {/* Data Rows */}
                      <div className="space-y-1">
                        {playerStats.ranking_history.slice(0, 12).map((entry, index) => {
                          const comparisonEntry = comparisonPlayer?.ranking_history[index];
                          return (
                            <div key={index} className={`grid ${comparisonPlayer ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-sm`}>
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
                    placeholder="Search players by name, license, or league..."
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
                      <p className="text-lg font-medium mb-2">Search for players to compare</p>
                      <p className="text-sm">Enter a name, license number, or league to find players</p>
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
                                    {player.nom_complet || `Player ${player.idcrm}`}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {player.sexe === 'H' ? 'Men' : 'Women'}
                                  </Badge>
                                </div>
                                <div className="text-xs text-gray-600 space-y-1">
                                  <div>License: {player.idcrm}</div>
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
                              <TableHead>License</TableHead>
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
                                    {player.nom_complet || `Player ${player.idcrm}`}
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {player.idcrm}
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
