'use client';

import { useState, useEffect } from 'react';
import { storage, Tournament, TeamWithPlayers, MatchWithTeams } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Crown } from 'lucide-react';

interface TournamentRankingProps {
  tournament: Tournament;
  teams: TeamWithPlayers[];
}

interface TeamRanking {
  team: TeamWithPlayers;
  position: number;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  determined_by?: string;
}

export function TournamentRanking({ tournament, teams }: TournamentRankingProps) {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [rankings, setRankings] = useState<TeamRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, [tournament.id]);

  useEffect(() => {
    if (matches.length > 0) {
      calculateRankings();
    }
  }, [matches, teams]);

  const fetchMatches = () => {
    try {
      const data = storage.getMatchesWithTeams(tournament.id);
      setMatches(data);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRankings = () => {
    const teamStats: Record<string, { matches_played: number; matches_won: number; matches_lost: number }> = {};
    const rankingPositions: Record<string, { position: number; determined_by: string }> = {};

    // Initialize team stats
    teams.forEach(team => {
      teamStats[team.id] = { matches_played: 0, matches_won: 0, matches_lost: 0 };
    });

    // Calculate match statistics
    matches.forEach(match => {
      if (match.team_1 && match.team_2 && match.winner_team_id) {
        // Update matches played
        teamStats[match.team_1.id].matches_played++;
        teamStats[match.team_2.id].matches_played++;

        // Update wins/losses
        if (match.winner_team_id === match.team_1.id) {
          teamStats[match.team_1.id].matches_won++;
          teamStats[match.team_2.id].matches_lost++;
        } else {
          teamStats[match.team_2.id].matches_won++;
          teamStats[match.team_1.id].matches_lost++;
        }
      }
    });

    // Determine positions from ranking matches
    const rankingMatches = matches.filter(match => match.ranking_game && match.ranking_label && match.winner_team_id);
    
    rankingMatches.forEach(match => {
      if (match.ranking_label && match.team_1 && match.team_2 && match.winner_team_id) {
        // Parse ranking label like "1st vs 2nd (Final)" or "3rd vs 4th"
        const positionMatch = match.ranking_label.match(/(\d+)(?:st|nd|rd|th)\s+vs\s+(\d+)(?:st|nd|rd|th)/);
        
        if (positionMatch) {
          const pos1 = parseInt(positionMatch[1]);
          const pos2 = parseInt(positionMatch[2]);
          
          // Winner gets the better position
          const winnerPos = Math.min(pos1, pos2);
          const loserPos = Math.max(pos1, pos2);
          
          const winnerId = match.winner_team_id;
          const loserId = winnerId === match.team_1.id ? match.team_2.id : match.team_1.id;
          
          rankingPositions[winnerId] = { position: winnerPos, determined_by: match.ranking_label };
          rankingPositions[loserId] = { position: loserPos, determined_by: match.ranking_label };
        }
      }
    });

    // Create rankings array
    const teamRankings: TeamRanking[] = teams.map(team => {
      const stats = teamStats[team.id];
      const ranking = rankingPositions[team.id];
      
      return {
        team,
        position: ranking?.position || 999, // Unranked teams get high number
        matches_played: stats.matches_played,
        matches_won: stats.matches_won,
        matches_lost: stats.matches_lost,
        determined_by: ranking?.determined_by,
      };
    });

    // Sort by position, then by matches won, then by matches played
    teamRankings.sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      if (a.matches_won !== b.matches_won) return b.matches_won - a.matches_won;
      return b.matches_played - a.matches_played;
    });

    setRankings(teamRankings);
  };

  const getRankingIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <Trophy className="h-5 w-5 text-gray-400" />;
    }
  };

  const getRankingBadgeColor = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 2:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 3:
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getPositionSuffix = (position: number) => {
    if (position === 999) return '';
    const lastDigit = position % 10;
    const lastTwoDigits = position % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return 'th';
    
    switch (lastDigit) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  // Helper function to get team rank display
  const getTeamRankDisplay = (team: TeamWithPlayers) => {
    if (team.is_wo) return 'WO';
    return team.seed_number ? `TS${team.seed_number}` : 'TS?';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const completedRankingMatches = matches.filter(match => match.ranking_game && match.winner_team_id).length;
  const totalRankingMatches = matches.filter(match => match.ranking_game).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold flex items-center">
          <Trophy className="h-6 w-6 mr-2 text-yellow-600" />
          Tournament Rankings
        </h2>
        <p className="text-gray-600">
          Final standings based on completed ranking matches ({completedRankingMatches}/{totalRankingMatches} completed)
        </p>
      </div>

      {/* Rankings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Final Standings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rankings.map((ranking, index) => (
              <div 
                key={ranking.team.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                  ranking.position <= 3 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-4">
                  {/* Position */}
                  <div className="flex items-center space-x-2">
                    {getRankingIcon(ranking.position)}
                    <Badge className={`${getRankingBadgeColor(ranking.position)} border font-mono text-lg px-3 py-1`}>
                      {ranking.position === 999 ? 'TBD' : `${ranking.position}${getPositionSuffix(ranking.position)}`}
                    </Badge>
                  </div>

                  {/* Team Info */}
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant="outline" className="text-xs font-mono">
                        {getTeamRankDisplay(ranking.team)}
                      </Badge>
                      <h3 className="font-semibold text-lg">{ranking.team.name}</h3>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Weight: {ranking.team.weight}</span>
                      {ranking.team.is_wo && (
                        <Badge variant="outline" className="text-xs">Walkover</Badge>
                      )}
                    </div>
                    {ranking.determined_by && (
                      <p className="text-xs text-blue-600 mt-1">
                        Determined by: {ranking.determined_by}
                      </p>
                    )}
                  </div>
                </div>

                {/* Match Statistics */}
                <div className="text-right">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="text-center">
                      <p className="font-semibold">{ranking.matches_played}</p>
                      <p className="text-gray-500">Played</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-green-600">{ranking.matches_won}</p>
                      <p className="text-gray-500">Won</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-red-600">{ranking.matches_lost}</p>
                      <p className="text-gray-500">Lost</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">
                        {ranking.matches_played > 0 ? Math.round((ranking.matches_won / ranking.matches_played) * 100) : 0}%
                      </p>
                      <p className="text-gray-500">Win Rate</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Podium for Top 3 */}
      {rankings.filter(r => r.position <= 3 && r.position !== 999).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Podium</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-end space-x-8">
              {/* 2nd Place */}
              {rankings.find(r => r.position === 2) && (
                <div className="text-center">
                  <div className="bg-gray-200 h-24 w-24 rounded-lg flex items-center justify-center mb-2">
                    <Medal className="h-8 w-8 text-gray-600" />
                  </div>
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <Badge variant="outline" className="text-xs font-mono">
                      {getTeamRankDisplay(rankings.find(r => r.position === 2)!.team)}
                    </Badge>
                  </div>
                  <h3 className="font-semibold">{rankings.find(r => r.position === 2)?.team.name}</h3>
                  <Badge className="bg-gray-100 text-gray-800">2nd Place</Badge>
                </div>
              )}

              {/* 1st Place */}
              {rankings.find(r => r.position === 1) && (
                <div className="text-center">
                  <div className="bg-yellow-200 h-32 w-24 rounded-lg flex items-center justify-center mb-2">
                    <Crown className="h-10 w-10 text-yellow-600" />
                  </div>
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <Badge variant="outline" className="text-xs font-mono">
                      {getTeamRankDisplay(rankings.find(r => r.position === 1)!.team)}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-lg">{rankings.find(r => r.position === 1)?.team.name}</h3>
                  <Badge className="bg-yellow-100 text-yellow-800">Champion</Badge>
                </div>
              )}

              {/* 3rd Place */}
              {rankings.find(r => r.position === 3) && (
                <div className="text-center">
                  <div className="bg-amber-200 h-20 w-24 rounded-lg flex items-center justify-center mb-2">
                    <Award className="h-7 w-7 text-amber-600" />
                  </div>
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <Badge variant="outline" className="text-xs font-mono">
                      {getTeamRankDisplay(rankings.find(r => r.position === 3)!.team)}
                    </Badge>
                  </div>
                  <h3 className="font-semibold">{rankings.find(r => r.position === 3)?.team.name}</h3>
                  <Badge className="bg-amber-100 text-amber-800">3rd Place</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}