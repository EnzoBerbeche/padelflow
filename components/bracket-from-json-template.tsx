import React, { useState, useRef, useEffect } from 'react';
import { resolveTeamSource, RandomAssignments, MatchResult } from '@/lib/team-source-resolver';
import { TeamWithPlayers } from '@/lib/storage';
import { storage } from '@/lib/storage';
import { CourtAssignment } from './court-assignment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

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
  winner_team?: TeamWithPlayers | null;
  looser_team?: TeamWithPlayers | null;
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
  randomAssignments: RandomAssignments;
  onUpdateTemplate: (newTemplate: BracketJsonTemplate) => void;
}

// Helper pour afficher le nom d'équipe formaté
function getTeamDisplay(team?: TeamWithPlayers, fallbackSource?: string) {
  if (!team) return fallbackSource || '';
  const players = team.players?.map(p => p.last_name).join(' - ');
  const ts = team.seed_number ? ` (TS${team.seed_number})` : '';
  // Si c'est une équipe factice (pas de joueurs, pas de seed), on affiche le nom brut
  if ((!team.players || team.players.length === 0) && !team.seed_number) {
    return team.name;
  }
  return `${players || team.name}${ts}`;
}

export const BracketFromJsonTemplate: React.FC<BracketFromJsonTemplateProps> = ({
  template,
  teams,
  randomAssignments,
  onUpdateTemplate
}) => {
  // plus de state local pour le template
  const [editing, setEditing] = useState<{ matchId: number; field: 'score1' | 'score2' | null }>({ matchId: -1, field: null });
  const [scoreDialog, setScoreDialog] = useState<{ open: boolean; match: MatchJson | null }>({ open: false, match: null });
  const [scoreInputs, setScoreInputs] = useState<{ score1: string; score2: string }>({ score1: '', score2: '' });
  // Ajout d'un dummy state pour forcer le re-render
  const [, forceUpdate] = useState(0);

  // Forcer le re-render à chaque modification du template local
  useEffect(() => {
    forceUpdate(n => n + 1);
  }, [template]);

  // Synchroniser localTemplate avec le prop template à chaque changement de template
  useEffect(() => {
    // setLocalTemplate(JSON.parse(JSON.stringify(template))); // This line is removed
  }, [template]);

  // Met à jour le score ou le winner dans le template via le parent
  const updateMatch = (matchId: number, updates: Partial<MatchJson>) => {
    const newTemplate = JSON.parse(JSON.stringify(template));
    for (const rotation of newTemplate.rotations) {
      for (const phase of rotation.phases) {
        for (const match of phase.matches) {
          if (match.id === matchId) {
            Object.assign(match, updates);
            // Si on a un winner, stocker l'objet équipe gagnante/perdante
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

  // Génère dynamiquement la liste des résultats de match à partir du template local, dans l'ordre global
  function buildMatchResults(): MatchResult[] {
    // Rassembler tous les matches dans un seul tableau, trié par ordre_match
    const allMatches: MatchJson[] = [];
    for (const rotation of template.rotations) {
      for (const phase of rotation.phases) {
        for (const match of phase.matches) {
          allMatches.push(match);
        }
      }
    }
    allMatches.sort((a, b) => a.ordre_match - b.ordre_match);
    const results: MatchResult[] = [];
    for (const match of allMatches) {
      let winner_team_id = '';
      let looser_team_id = '';
      // On tente de retrouver l'id d'équipe gagnante/perdante si possible
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
      });
    }
    return results;
  }

  // Avant le mapping des rotations, construire matchResults une seule fois
  const matchResults = buildMatchResults();

  // Calculer dynamiquement la largeur maximale nécessaire pour les colonnes
  function getMaxColumnWidthPx() {
    // On prend la longueur max des noms d'équipes, du bouton, etc.
    let maxLen = 0;
    for (const rotation of template.rotations) {
      for (const phase of rotation.phases) {
        for (const match of phase.matches) {
          const t1 = getTeamDisplay(resolveTeamSource(match.source_team_1, teams, matchResults, randomAssignments) ?? undefined, match.source_team_1);
          const t2 = getTeamDisplay(resolveTeamSource(match.source_team_2, teams, matchResults, randomAssignments) ?? undefined, match.source_team_2);
          maxLen = Math.max(maxLen, (t1?.length || 0), (t2?.length || 0));
        }
      }
    }
    // Largeur min pour le bouton et le layout
    const px = Math.max(300, Math.min(520, 16 * maxLen + 120));
    return px;
  }
  const maxColWidth = getMaxColumnWidthPx();

  // Fonction réutilisable pour rendre une carte de match
  function renderMatchCard(match: MatchJson, rotIdx: number, phaseIdx: number, matchIdx: number) {
    // Déterminer l'index d'occurrence pour chaque random_X_Y
    function getRandomKeyWithIndex(source: string) {
      if (!source || !/^random_\d+_\d+$/.test(source)) return source;
      // Compter le nombre d'occurrences précédentes de ce random dans tous les matches déjà parcourus
      let count = 0;
      for (let i = 0; i < rotIdx; i++) {
        const r = template.rotations[i];
        for (const p of r.phases) {
          for (const m of p.matches) {
            if (m.source_team_1 === source || m.source_team_2 === source) count++;
          }
        }
      }
      for (let j = 0; j < phaseIdx; j++) {
        const p = template.rotations[rotIdx].phases[j];
        for (const m of p.matches) {
          if (m.source_team_1 === source || m.source_team_2 === source) count++;
        }
      }
      for (let k = 0; k < matchIdx; k++) {
        const m = template.rotations[rotIdx].phases[phaseIdx].matches[k];
        if (m.source_team_1 === source || m.source_team_2 === source) count++;
      }
      return `${source}_${count+1}`;
    }
    const team1Source = getRandomKeyWithIndex(match.source_team_1);
    const team2Source = getRandomKeyWithIndex(match.source_team_2);
    const team1 = resolveTeamSource(team1Source, teams, matchResults, randomAssignments);
    const team2 = resolveTeamSource(team2Source, teams, matchResults, randomAssignments);
    const isWinner1 = match.winner === '1';
    const isWinner2 = match.winner === '2';
    const isLooser1 = match.looser === '1';
    const isLooser2 = match.looser === '2';
    // Correction linter : préparer l'affichage des noms d'équipe
    const team1Display = getTeamDisplay(team1 === null ? undefined : team1, match.source_team_1);
    const team2Display = getTeamDisplay(team2 === null ? undefined : team2, match.source_team_2);
    // Bloc match redesign
    const isFinished = match.winner === '1' || match.winner === '2';
    const hasScore = match.score_team_1 !== null && match.score_team_1 !== undefined && 
                     match.score_team_2 !== null && match.score_team_2 !== undefined;
    
    // Get phase name for the header
    const phaseName = template.rotations[rotIdx]?.phases[phaseIdx]?.name || '';
    
    return (
      <div key={match.id} className="relative mb-6 bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex flex-col gap-2">
        {/* Compact Header with Phase + Match #, Score, and Court Assignment */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs text-gray-500 font-mono bg-gray-100 rounded px-2 py-1">
            {phaseName} - {match.ordre_match}
          </span>
          
          {/* Score Section - Center */}
          <div className="flex items-center gap-2">
            {hasScore ? (
              <>
                <span className="text-sm font-semibold text-gray-700">
                  {match.score_team_1} - {match.score_team_2}
                </span>
                <button
                  className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 border border-gray-200 text-sm flex items-center justify-center transition-colors"
                  title="Réinitialiser le match"
                  onClick={() => updateMatch(match.id, { score_team_1: null, score_team_2: null, winner: '', looser: '' })}
                  type="button"
                >
                  ↺
                </button>
              </>
            ) : (
              <button
                className="px-3 py-1 rounded text-xs font-medium border bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                onClick={() => openScoreDialog(match)}
                title="Enter score"
              >
                Score
              </button>
            )}
          </div>
          
          {/* Court Assignment */}
          <div className="flex items-center gap-2">
            {(match as any).terrain_number ? (
              <>
                <select
                  className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-1 font-mono cursor-pointer"
                  value={(match as any).terrain_number}
                  onChange={(e) => {
                    const newCourt = e.target.value === 'none' ? undefined : Number(e.target.value);
                    
                    // If assigning a new court, check for conflicts
                    if (newCourt !== undefined) {
                      const allMatches = template.rotations.flatMap((r: any) => r.phases.flatMap((p: any) => p.matches));
                      const conflicts = allMatches.filter((m: any) => 
                        m.id !== match.id && m.terrain_number === newCourt
                      );
                      
                      if (conflicts.length > 0) {
                        alert(`Court ${newCourt} is already assigned to another match. Please choose a different court.`);
                        return;
                      }
                    }
                    
                    const newTemplate = JSON.parse(JSON.stringify(template));
                    for (const rotation of newTemplate.rotations) {
                      for (const phase of rotation.phases) {
                        for (const m of phase.matches) {
                          if (m.id === match.id) {
                            m.terrain_number = newCourt;
                          }
                        }
                      }
                    }
                    onUpdateTemplate(newTemplate);
                  }}
                  title="Change court assignment"
                >
                  <option value="none">Unassign</option>
                  {[1, 2, 3, 4].map(court => {
                    const allMatches = template.rotations.flatMap((r: any) => r.phases.flatMap((p: any) => p.matches));
                    const isOccupied = allMatches.some((m: any) => 
                      m.id !== match.id && m.terrain_number === court
                    );
                    return (
                      <option key={court} value={court} disabled={isOccupied}>
                        Court {court}{isOccupied ? ' (Occupied)' : ''}
                      </option>
                    );
                  })}
                </select>
              </>
            ) : (
              <button
                className="px-2 py-1 rounded text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                onClick={() => {
                  const courts = [1,2,3,4];
                  const allMatches = template.rotations.flatMap((r: any) => r.phases.flatMap((p: any) => p.matches));
                  const occupied = allMatches.filter((m: any) => m.terrain_number).map((m: any) => m.terrain_number);
                  const free = courts.find(c => !occupied.includes(c));
                  if (free) {
                    const newTemplate = JSON.parse(JSON.stringify(template));
                    for (const rotation of newTemplate.rotations) {
                      for (const phase of rotation.phases) {
                        for (const m of phase.matches) {
                          if (m.id === match.id) {
                            m.terrain_number = free;
                          }
                        }
                      }
                    }
                    onUpdateTemplate(newTemplate);
                  } else {
                    alert('No courts available. All courts are currently assigned.');
                  }
                }}
                title="Assigner un terrain"
              >
                Assigner
              </button>
            )}
          </div>
        </div>

        {/* Teams and VS - Centered */}
        <div className="flex items-center justify-center gap-4">
          <div className="flex-1 text-center">
            <div
              className={`text-sm font-medium cursor-pointer transition-colors ${
                isWinner1 ? "text-green-600 font-bold" : 
                isLooser1 ? "text-gray-400" : 
                "text-gray-700 hover:text-gray-900"
              }`}
              onClick={() => updateMatch(match.id, { winner: '1', looser: '2' })}
              title="Cliquez pour sélectionner comme vainqueur"
            >
              {team1Display}
            </div>
          </div>
          
          <div className="text-lg font-bold text-gray-400 select-none px-2">VS</div>
          
          <div className="flex-1 text-center">
            <div
              className={`text-sm font-medium cursor-pointer transition-colors ${
                isWinner2 ? "text-green-600 font-bold" : 
                isLooser2 ? "text-gray-400" : 
                "text-gray-700 hover:text-gray-900"
              }`}
              onClick={() => updateMatch(match.id, { winner: '2', looser: '1' })}
              title="Cliquez pour sélectionner comme vainqueur"
            >
              {team2Display}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fonction pour obtenir les prochains matches
  function getNextMatches() {
    const allMatches: MatchJson[] = [];
    for (const rotation of template.rotations) {
      for (const phase of rotation.phases) {
        for (const match of phase.matches) {
          allMatches.push(match);
        }
      }
    }
    
    // Trier par ordre_match et filtrer les matches non terminés et sans terrain assigné
    return allMatches
      .sort((a, b) => a.ordre_match - b.ordre_match)
      .filter(match => 
        // Pas de vainqueur (match non terminé)
        (!match.winner || match.winner === '') &&
        // Pas de terrain assigné (match pas encore commencé)
        (!(match as any).terrain_number || (match as any).terrain_number === undefined)
      )
      .slice(0, 4); // Prendre les 4 premiers matches à venir
  }

  const nextMatches = getNextMatches();

  return (
    <div>
      {/* Next Matches Bar */}
      {nextMatches.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold flex items-center">
              <Clock className="mr-2 text-gray-500" />
              Next Matches
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="overflow-x-auto">
              <div className="flex justify-between gap-4 pb-2">
                {nextMatches.map((match) => {
                  // Trouver les indices pour renderMatchCard
                  let rotIdx = 0, phaseIdx = 0, matchIdx = 0;
                  for (let r = 0; r < template.rotations.length; r++) {
                    for (let p = 0; p < template.rotations[r].phases.length; p++) {
                      for (let m = 0; m < template.rotations[r].phases[p].matches.length; m++) {
                        if (template.rotations[r].phases[p].matches[m].id === match.id) {
                          rotIdx = r;
                          phaseIdx = p;
                          matchIdx = m;
                          break;
                        }
                      }
                    }
                  }
                  return (
                    <div key={match.id} className="flex-1 min-w-0">
                      {renderMatchCard(match, rotIdx, phaseIdx, matchIdx)}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bracket View */}
      <div style={{ display: 'flex', gap: 32 }}>
        {template.rotations.map((rotation, rotIdx) => (
          <div key={rotIdx} style={{ width: maxColWidth, minWidth: maxColWidth, maxWidth: maxColWidth }}>
            <h2 style={{ textAlign: 'center', marginBottom: 16 }}>{rotation.name}</h2>
            {rotation.phases
              .sort((a, b) => a.ordre_phase - b.ordre_phase)
              .map((phase, phaseIdx) => (
                <div key={phaseIdx} className="mb-8 bg-gray-50 rounded-xl p-4 shadow-sm border border-gray-200">
                  <h3 className="text-center text-base font-semibold text-gray-700 mb-4 tracking-wide uppercase">{phase.name}</h3>
                  {phase.matches
                    .sort((a, b) => a.ordre_match - b.ordre_match)
                    .map((match, matchIdx) => renderMatchCard(match, rotIdx, phaseIdx, matchIdx))}
                </div>
              ))}
          </div>
        ))}
      </div>
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
                  {(() => { const t = resolveTeamSource(scoreDialog.match.source_team_1, teams, matchResults, randomAssignments); return getTeamDisplay(t === null ? undefined : t, scoreDialog.match.source_team_1); })()}
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
                  {(() => { const t = resolveTeamSource(scoreDialog.match.source_team_2, teams, matchResults, randomAssignments); return getTeamDisplay(t === null ? undefined : t, scoreDialog.match.source_team_2); })()}
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