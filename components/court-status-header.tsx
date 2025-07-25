'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, CheckCircle, XCircle, Clock } from 'lucide-react';
import { MatchWithTeams } from '@/lib/storage';
import { resolveTeamSource } from '@/lib/team-source-resolver';

interface CourtStatus {
  courtNumber: number;
  isOccupied: boolean;
  match?: MatchWithTeams;
}

interface CourtStatusHeaderProps {
  totalCourts: number;
  matches: any[];
  teams: any[];
  template: any;
  randomAssignments: any;
  onCourtClick?: (courtNumber: number) => void;
}

export function CourtStatusHeader({ totalCourts, matches, teams, template, randomAssignments, onCourtClick }: CourtStatusHeaderProps) {
  const [courtStatuses, setCourtStatuses] = useState<CourtStatus[]>([]);

  // Helper pour reconstruire les résultats de match (pour W_X/L_X)
  function buildMatchResults(): any[] {
    const allMatches: any[] = [];
    for (const rotation of template.rotations) {
      for (const phase of rotation.phases) {
        for (const match of phase.matches) {
          allMatches.push(match);
        }
      }
    }
    allMatches.sort((a, b) => a.ordre_match - b.ordre_match);
    const results: any[] = [];
    for (const match of allMatches) {
      let winner_team_id = '';
      let looser_team_id = '';
      if (match.winner === '1') {
        const team1 = resolveTeamSource(match.source_team_1, teams, results, randomAssignments);
        winner_team_id = team1?.id || '';
        const team2 = resolveTeamSource(match.source_team_2, teams, results, randomAssignments);
        looser_team_id = team2?.id || '';
      } else if (match.winner === '2') {
        const team2 = resolveTeamSource(match.source_team_2, teams, results, randomAssignments);
        winner_team_id = team2?.id || '';
        const team1 = resolveTeamSource(match.source_team_1, teams, results, randomAssignments);
        looser_team_id = team1?.id || '';
      }
      results.push({
        id: match.id,
        winner_team_id: winner_team_id || undefined,
        looser_team_id: looser_team_id || undefined,
        winner_team: match.winner_team,
        looser_team: match.looser_team,
      });
    }
    return results;
  }

  // Update court statuses when matches change
  useEffect(() => {
    const statuses: CourtStatus[] = [];
    
    for (let i = 1; i <= totalCourts; i++) {
      const match = matches.find(m => m.terrain_number === i);
      statuses.push({
        courtNumber: i,
        isOccupied: !!match,
        match
      });
    }
    
    setCourtStatuses(statuses);
  }, [matches, totalCourts]);

  const getMatchDisplayName = (match: any) => {
    if (match.stage) return match.stage;
    if (match.round) return match.round;
    const m = match as any;
    return `Match #${m.ordre_match || m.json_match_id || m.order_index || m.id}`;
  };

  const getTeamNames = (match: any) => {
    const matchResults = buildMatchResults();
    const team1 = resolveTeamSource(match.source_team_1, teams, matchResults, randomAssignments);
    const team2 = resolveTeamSource(match.source_team_2, teams, matchResults, randomAssignments);
    const team1Name = team1 ? (team1.players?.map((p: any) => p.last_name).join(' - ') + (team1.seed_number ? ` (TS${team1.seed_number})` : '')) : match.source_team_1;
    const team2Name = team2 ? (team2.players?.map((p: any) => p.last_name).join(' - ') + (team2.seed_number ? ` (TS${team2.seed_number})` : '')) : match.source_team_2;
    return `${team1Name} vs ${team2Name}`;
  };

  const handleCourtClick = (courtNumber: number) => {
    if (onCourtClick) {
      onCourtClick(courtNumber);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-blue-600" />
            Court Status
          </h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
              Available
            </div>
            <div className="flex items-center">
              <XCircle className="h-4 w-4 mr-1 text-red-600" />
              Occupied
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {courtStatuses.map((court) => (
            <div
              key={court.courtNumber}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                court.isOccupied 
                  ? 'border-red-200 bg-red-50' 
                  : 'border-green-200 bg-green-50'
              }`}
              onClick={() => handleCourtClick(court.courtNumber)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">
                  Court {court.courtNumber}
                </h4>
                {court.isOccupied ? (
                  <XCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>
              
              {court.isOccupied && court.match ? (
                <div className="space-y-2">
                  <Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300">
                    {getMatchDisplayName(court.match)}
                  </Badge>
                  <div className="text-xs text-gray-700">
                    {getTeamNames(court.match)}
                  </div>
                  {court.match.score && (
                    <div className="text-xs font-medium text-gray-900">
                      Score: {court.match.score}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-green-700 font-medium">
                  Available
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              {courtStatuses.filter(c => !c.isOccupied).length} of {totalCourts} courts available
            </span>
            <span>
              {courtStatuses.filter(c => c.isOccupied).length} courts in use
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 