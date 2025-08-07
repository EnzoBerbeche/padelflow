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
  onUpdateTemplate?: (newTemplate: any) => void;
}

export function CourtStatusHeader({ totalCourts, matches, teams, template, randomAssignments, onCourtClick, onUpdateTemplate }: CourtStatusHeaderProps) {
  const [courtStatuses, setCourtStatuses] = useState<CourtStatus[]>([]);
  const [scoreDialog, setScoreDialog] = useState<{ open: boolean; match: any | null }>({ open: false, match: null });
  const [scoreInputs, setScoreInputs] = useState<{ score1: string; score2: string }>({ score1: '', score2: '' });

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

  // Update match function
  const updateMatch = (matchId: number, updates: any) => {
    if (!onUpdateTemplate) return;
    
    const newTemplate = JSON.parse(JSON.stringify(template));
    for (const rotation of newTemplate.rotations) {
      for (const phase of rotation.phases) {
        for (const match of phase.matches) {
          if (match.id === matchId) {
            Object.assign(match, updates);
            // If we have a winner, store the winning/losing team objects
            if (updates.winner) {
              let winner_team = null;
              let looser_team = null;
              if (updates.winner === '1') {
                winner_team = resolveTeamSource(match.source_team_1, teams, buildMatchResults(), randomAssignments);
                looser_team = resolveTeamSource(match.source_team_2, teams, buildMatchResults(), randomAssignments);
              } else if (updates.winner === '2') {
                winner_team = resolveTeamSource(match.source_team_2, teams, buildMatchResults(), randomAssignments);
                looser_team = resolveTeamSource(match.source_team_1, teams, buildMatchResults(), randomAssignments);
              }
              match.winner_team = winner_team;
              match.looser_team = looser_team;
            }
          }
        }
      }
    }
    onUpdateTemplate(newTemplate);
  };

  // Open score dialog
  const openScoreDialog = (match: any) => {
    setScoreInputs({
      score1: match.score_team_1 !== null ? String(match.score_team_1) : '',
      score2: match.score_team_2 !== null ? String(match.score_team_2) : ''
    });
    setScoreDialog({ open: true, match });
  };

  // Handle score submission
  const handleScoreSubmit = () => {
    if (!scoreDialog.match) return;
    const score1 = scoreInputs.score1 !== '' ? Number(scoreInputs.score1) : null;
    const score2 = scoreInputs.score2 !== '' ? Number(scoreInputs.score2) : null;
    let winner = '';
    let looser = '';
    if (score1 !== null && score2 !== null) {
      if (score1 > score2) {
        winner = '1'; looser = '2';
      } else if (score2 > score1) {
        winner = '2'; looser = '1';
      }
    }
    updateMatch(scoreDialog.match.id, { score_team_1: score1, score_team_2: score2, winner, looser });
    setScoreDialog({ open: false, match: null });
  };

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

  // Helper to get phase name from template
  const getPhaseName = (match: any) => {
    for (const rotation of template.rotations) {
      for (const phase of rotation.phases) {
        for (const phaseMatch of phase.matches) {
          if (phaseMatch.id === match.id) {
            return phase.name;
          }
        }
      }
    }
    return '';
  };

  // Helper for team display
  const getTeamDisplay = (team: any, fallbackSource?: string) => {
    if (!team) return fallbackSource || '';
    const players = team.players?.map((p: any) => p.last_name).join(' - ');
    const ts = team.seed_number ? ` (TS${team.seed_number})` : '';
    if ((!team.players || team.players.length === 0) && !team.seed_number) {
      return team.name;
    }
    return `${players || team.name}${ts}`;
  };

  const getTeamNames = (match: any) => {
    const matchResults = buildMatchResults();
    const team1 = resolveTeamSource(match.source_team_1, teams, matchResults, randomAssignments);
    const team2 = resolveTeamSource(match.source_team_2, teams, matchResults, randomAssignments);
    const team1Name = team1 ? (team1.players?.map((p: any) => p.last_name).join(' - ') + (team1.seed_number ? ` (TS${team1.seed_number})` : '')) : match.source_team_1;
    const team2Name = team2 ? (team2.players?.map((p: any) => p.last_name).join(' - ') + (team2.seed_number ? ` (TS${team2.seed_number})` : '')) : match.source_team_2;
    return { team1: team1Name, team2: team2Name };
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
        
        <div className={`grid gap-4 ${
          totalCourts === 1 ? 'grid-cols-1' :
          totalCourts === 2 ? 'grid-cols-1 sm:grid-cols-2' :
          totalCourts === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
          totalCourts === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
          totalCourts === 5 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : // 5 courts: 4 on top, 1 below
          totalCourts === 6 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' :
          'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
        }`}>
          {courtStatuses.map((court, index) => (
            <div
              key={court.courtNumber}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                court.isOccupied 
                  ? 'border-red-200 bg-red-50' 
                  : 'border-green-200 bg-green-50'
              } ${totalCourts === 5 && index === 4 ? 'lg:col-start-1 lg:col-span-1' : ''}`}
              onClick={() => handleCourtClick(court.courtNumber)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">
                  Court {court.courtNumber}
                </h4>
                {court.isOccupied && court.match && (
                  <span className="text-xs text-gray-600 font-medium">
                    {getPhaseName(court.match)}
                  </span>
                )}
                {court.isOccupied ? (
                  <XCircle 
                    className="h-5 w-5 text-red-600 cursor-pointer hover:text-red-700 transition-colors" 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (court.match) {
                        updateMatch((court.match as any).id, { terrain_number: undefined });
                      }
                    }}
                  />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>
              
              {court.isOccupied && court.match ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300">
                      {getMatchDisplayName(court.match)}
                    </Badge>
                    
                    {/* Score Section - Right aligned */}
                    <div className="flex items-center gap-2">
                      {(court.match as any).score_team_1 !== null && (court.match as any).score_team_2 !== null ? (
                        <>
                          <span className="text-sm font-semibold text-gray-700">
                            {(court.match as any).score_team_1} - {(court.match as any).score_team_2}
                          </span>
                          <button
                            className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 border border-gray-200 text-xs flex items-center justify-center transition-colors"
                            title="Reset match"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateMatch((court.match as any).id, { score_team_1: null, score_team_2: null, winner: '', looser: '' });
                            }}
                            type="button"
                          >
                            ↺
                          </button>
                        </>
                      ) : (
                        <button
                          className="px-2 py-1 rounded text-xs font-medium border bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            openScoreDialog(court.match);
                          }}
                          title="Enter score"
                        >
                          Score
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Teams Section */}
                  <div className="flex items-center justify-center gap-2">
                    <div className="flex-1 text-center">
                      <div
                        className={`text-xs font-medium cursor-pointer transition-colors ${
                          (court.match as any).winner === '1' ? "text-green-600 font-bold" : 
                          (court.match as any).looser === '1' ? "text-gray-400" : 
                          "text-gray-700 hover:text-gray-900"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateMatch((court.match as any).id, { winner: '1', looser: '2' });
                        }}
                        title="Click to select as winner"
                      >
                        {getTeamNames(court.match).team1}
                      </div>
                    </div>
                    
                    <div className="text-sm font-bold text-gray-400 select-none px-1">VS</div>
                    
                    <div className="flex-1 text-center">
                      <div
                        className={`text-xs font-medium cursor-pointer transition-colors ${
                          (court.match as any).winner === '2' ? "text-green-600 font-bold" : 
                          (court.match as any).looser === '2' ? "text-gray-400" : 
                          "text-gray-700 hover:text-gray-900"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateMatch((court.match as any).id, { winner: '2', looser: '1' });
                        }}
                        title="Click to select as winner"
                      >
                        {getTeamNames(court.match).team2}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-green-700 font-medium">
                  Available
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
      
      {/* Score Dialog */}
      {scoreDialog.open && scoreDialog.match && (
        <div style={{
          position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: '#0008', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 32, minWidth: 320, boxShadow: '0 0 24px #0002' }}>
            <h3 style={{ textAlign: 'center', marginBottom: 16 }}>Enter Score</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                  {getTeamNames(scoreDialog.match).team1}
                </div>
                <input
                  type="number"
                  value={scoreInputs.score1}
                  onChange={e => setScoreInputs({ ...scoreInputs, score1: e.target.value })}
                  style={{ width: 60, fontSize: 16, textAlign: 'center', background: '#f3f4f6', border: '1px solid #ddd', borderRadius: 4 }}
                  min={0}
                />
              </div>
              <div style={{ alignSelf: 'center', fontWeight: 'bold', fontSize: 18 }}>-</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                  {getTeamNames(scoreDialog.match).team2}
                </div>
                <input
                  type="number"
                  value={scoreInputs.score2}
                  onChange={e => setScoreInputs({ ...scoreInputs, score2: e.target.value })}
                  style={{ width: 60, fontSize: 16, textAlign: 'center', background: '#f3f4f6', border: '1px solid #ddd', borderRadius: 4 }}
                  min={0}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <button
                style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}
                onClick={handleScoreSubmit}
              >
                Submit
              </button>
              <button
                style={{ background: '#f3f4f6', color: '#333', border: '1px solid #ddd', borderRadius: 4, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}
                onClick={() => setScoreDialog({ open: false, match: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
} 