import React, { useState } from 'react';
import { resolveTeamSource, RandomAssignments, MatchResult } from '@/lib/team-source-resolver';
import { TeamWithPlayers } from '@/lib/storage';
import { storage } from '@/lib/storage';

interface MatchJson {
  id: number;
  ordre_match: number;
  source_team_1: string;
  team_1: string;
  score_team_1: number | null;
  source_team_2: string;
  team_2: string;
  score_team_2: number | null;
  terrain: string;
  winner: string;
  looser: string;
}

interface PhaseJson {
  name: string;
  ordre_phase: number;
  matches: MatchJson[];
}

interface RotationJson {
  name: string;
  phases: PhaseJson[];
}

interface BracketJsonTemplate {
  rotations: RotationJson[];
}

interface BracketFromJsonTemplateProps {
  template: BracketJsonTemplate;
  teams: TeamWithPlayers[];
  matchResults: MatchResult[];
  randomAssignments: RandomAssignments;
}

// Helper pour afficher le nom d'équipe formaté
function getTeamDisplay(team?: TeamWithPlayers) {
  if (!team) return 'TBD';
  const players = team.players?.map(p => p.last_name).join(' - ');
  const ts = team.seed_number ? ` (TS${team.seed_number})` : '';
  return `${players || team.name}${ts}`;
}

export const BracketFromJsonTemplate: React.FC<BracketFromJsonTemplateProps> = ({
  template,
  teams,
  matchResults,
  randomAssignments
}) => {
  const [localTemplate, setLocalTemplate] = useState<BracketJsonTemplate>(JSON.parse(JSON.stringify(template)));
  const [editing, setEditing] = useState<{ matchId: number; field: 'score1' | 'score2' | null }>({ matchId: -1, field: null });
  const [scoreDialog, setScoreDialog] = useState<{ open: boolean; match: MatchJson | null }>({ open: false, match: null });
  const [scoreInputs, setScoreInputs] = useState<{ score1: string; score2: string }>({ score1: '', score2: '' });

  // Met à jour le score ou le winner dans le template et dans le storage
  const updateMatch = (matchId: number, updates: Partial<MatchJson>) => {
    const newTemplate = { ...localTemplate };
    for (const rotation of newTemplate.rotations) {
      for (const phase of rotation.phases) {
        for (const match of phase.matches) {
          if (match.id === matchId) {
            Object.assign(match, updates);
          }
        }
      }
    }
    setLocalTemplate(newTemplate);
    const tournaments = storage.tournaments.getAll('demo-user-123');
    const current = tournaments.find(t => t.format_json && t.format_json.rotations && t.format_json.rotations[0]?.phases[0]?.matches.some((m: any) => m.id === matchId));
    if (current) {
      storage.tournaments.update(current.id, { format_json: newTemplate });
    }
  };

  // Ouvre le dialog de score
  const openScoreDialog = (match: MatchJson) => {
    setScoreInputs({
      score1: match.score_team_1 !== null ? String(match.score_team_1) : '',
      score2: match.score_team_2 !== null ? String(match.score_team_2) : ''
    });
    setScoreDialog({ open: true, match });
  };

  // Gère la validation du score
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

  return (
    <div style={{ display: 'flex', gap: 32 }}>
      {localTemplate.rotations.map((rotation, rotIdx) => (
        <div key={rotIdx} style={{ minWidth: 300 }}>
          <h2 style={{ textAlign: 'center', marginBottom: 16 }}>{rotation.name}</h2>
          {rotation.phases
            .sort((a, b) => a.ordre_phase - b.ordre_phase)
            .map((phase, phaseIdx) => (
              <div key={phaseIdx} style={{ marginBottom: 24, border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
                <h3 style={{ textAlign: 'center', marginBottom: 8 }}>{phase.name}</h3>
                {phase.matches
                  .sort((a, b) => a.ordre_match - b.ordre_match)
                  .map((match, matchIdx) => {
                    const team1 = resolveTeamSource(match.source_team_1, teams, matchResults, randomAssignments);
                    const team2 = resolveTeamSource(match.source_team_2, teams, matchResults, randomAssignments);
                    const isWinner1 = match.winner === '1';
                    const isWinner2 = match.winner === '2';
                    const isLooser1 = match.looser === '1';
                    const isLooser2 = match.looser === '2';
                    return (
                      <div key={match.id} style={{ marginBottom: 12, padding: 8, background: '#fafbfc', borderRadius: 6, border: isWinner1 || isWinner2 ? '2px solid #059669' : '1px solid #ddd', boxShadow: isWinner1 || isWinner2 ? '0 0 8px #05966933' : undefined }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {/* Team 1 */}
                          <span
                            style={{
                              fontWeight: isWinner1 ? 'bold' : undefined,
                              background: isWinner1 ? '#d1fae5' : isLooser1 ? '#fee2e2' : undefined,
                              color: isWinner1 ? '#059669' : isLooser1 ? '#b91c1c' : undefined,
                              borderRadius: 4,
                              padding: '2px 6px',
                              cursor: 'pointer',
                              position: 'relative',
                              minWidth: 120,
                              display: 'inline-block',
                              textAlign: 'center'
                            }}
                            onMouseEnter={() => setEditing({ matchId: match.id, field: 'score1' })}
                            onMouseLeave={() => setEditing({ matchId: -1, field: null })}
                            onClick={() => updateMatch(match.id, { winner: '1', looser: '2' })}
                            title="Cliquez pour sélectionner comme vainqueur"
                          >
                            <b>{editing.matchId === match.id && editing.field === 'score1' ? <span style={{ color: '#059669' }}>Winner</span> : getTeamDisplay(team1 || undefined)}</b>
                          </span>
                          <span style={{ fontWeight: 'bold', color: '#888' }}>VS</span>
                          {/* Team 2 */}
                          <span
                            style={{
                              fontWeight: isWinner2 ? 'bold' : undefined,
                              background: isWinner2 ? '#d1fae5' : isLooser2 ? '#fee2e2' : undefined,
                              color: isWinner2 ? '#059669' : isLooser2 ? '#b91c1c' : undefined,
                              borderRadius: 4,
                              padding: '2px 6px',
                              cursor: 'pointer',
                              position: 'relative',
                              minWidth: 120,
                              display: 'inline-block',
                              textAlign: 'center'
                            }}
                            onMouseEnter={() => setEditing({ matchId: match.id, field: 'score2' })}
                            onMouseLeave={() => setEditing({ matchId: -1, field: null })}
                            onClick={() => updateMatch(match.id, { winner: '2', looser: '1' })}
                            title="Cliquez pour sélectionner comme vainqueur"
                          >
                            <b>{editing.matchId === match.id && editing.field === 'score2' ? <span style={{ color: '#059669' }}>Winner</span> : getTeamDisplay(team2 || undefined)}</b>
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                          Match #{match.id} | Terrain: {match.terrain || '-'}
                        </div>
                        <div style={{ marginTop: 8, textAlign: 'center' }}>
                          <button
                            style={{
                              background: '#f3f4f6',
                              border: '1px solid #ddd',
                              borderRadius: 4,
                              padding: '2px 10px',
                              cursor: 'pointer',
                              fontSize: 13
                            }}
                            onClick={() => openScoreDialog(match)}
                          >
                            Saisir le score
                          </button>
                          {match.score_team_1 !== null && match.score_team_2 !== null && (
                            <span style={{ marginLeft: 12, color: '#059669', fontWeight: 'bold' }}>
                              {match.score_team_1} - {match.score_team_2}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}
        </div>
      ))}
      {/* Dialog de saisie du score */}
      {scoreDialog.open && scoreDialog.match && (
        <div style={{
          position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: '#0008', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 32, minWidth: 320, boxShadow: '0 0 24px #0002' }}>
            <h3 style={{ textAlign: 'center', marginBottom: 16 }}>Saisir le score</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                  {getTeamDisplay(resolveTeamSource(scoreDialog.match.source_team_1, teams, matchResults, randomAssignments) || undefined)}
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
                  {getTeamDisplay(resolveTeamSource(scoreDialog.match.source_team_2, teams, matchResults, randomAssignments) || undefined)}
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
                Valider
              </button>
              <button
                style={{ background: '#f3f4f6', color: '#333', border: '1px solid #ddd', borderRadius: 4, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}
                onClick={() => setScoreDialog({ open: false, match: null })}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 