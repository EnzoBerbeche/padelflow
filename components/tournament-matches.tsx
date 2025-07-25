'use client';

import { useState, useEffect } from 'react';
import { storage, Tournament, TeamWithPlayers, MatchWithTeams } from '@/lib/storage';
import { BracketFromJsonTemplate } from './bracket-from-json-template';
import { RandomAssignments, MatchResult, resolveTeamSource } from '@/lib/team-source-resolver';
import { useCourtManagement } from '@/hooks/use-court-management';
import { CourtStatusHeader } from './court-status-header';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface TournamentMatchesProps {
  tournament: Tournament;
  teams: TeamWithPlayers[];
}

export function TournamentMatches({ tournament, teams }: TournamentMatchesProps) {
  const [randomAssignments, setRandomAssignments] = useState<RandomAssignments>({});
  const [template, setTemplate] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);

  useEffect(() => {
    // Charger la copie du format stockée dans le tournoi
    const tournamentData = storage.tournaments.getById(tournament.id);
    setTemplate(tournamentData?.format_json || null);
    setRandomAssignments(tournamentData?.random_assignments || {});
    // Charger les matchs du tournoi (avec terrain_number)
    setMatches(tournamentData?.format_json?.rotations?.flatMap((r: any) => r.phases.flatMap((p: any) => p.matches)) || []);
  }, [tournament.id]);

  // Nouvelle fonction pour mettre à jour le template du tournoi (bracket)
  const handleUpdateTemplate = (newTemplate: any) => {
    storage.tournaments.update(tournament.id, { format_json: newTemplate });
    // Relire la version à jour depuis le localStorage
    let updated = storage.tournaments.getById(tournament.id);
    let templateToUpdate = updated?.format_json;
    // Libération automatique des terrains pour les matchs terminés
    let changed = false;
    const allMatches = templateToUpdate?.rotations?.flatMap((r: any) => r.phases.flatMap((p: any) => p.matches)) || [];
    allMatches.forEach((m: any) => {
      if ((m.winner === '1' || m.winner === '2') && m.terrain_number) {
        m.terrain_number = undefined;
        changed = true;
      }
    });
    if (changed) {
      storage.tournaments.update(tournament.id, { format_json: templateToUpdate });
      updated = storage.tournaments.getById(tournament.id);
    }
    setTemplate(updated?.format_json || null);
    setMatches(updated?.format_json?.rotations?.flatMap((r: any) => r.phases.flatMap((p: any) => p.matches)) || []);
  };

  // Gestion des terrains
  const totalCourts = 4; // À adapter dynamiquement si besoin
  const courtManagement = useCourtManagement({
    matches,
    totalCourts,
    onMatchUpdate: (matchId, updates) => {
      // Mettre à jour le match dans le state et le storage
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, ...updates } : m));
      // (optionnel) mettre à jour le template si besoin
    }
  });

  // Callback pour ouvrir le modal d'assignation
  const handleCourtClick = (courtNumber: number) => {
    const status = courtManagement.getCourtStatus(courtNumber);
    if (!status.isOccupied) {
      setSelectedCourt(courtNumber);
      setShowAssignModal(true);
    }
  };

  // Callback pour assigner un match à un terrain (sera passé au modal)
  const handleAssignMatchToCourt = (matchId: string) => {
    if (selectedCourt) {
      courtManagement.assignCourt(matchId, selectedCourt);
      setShowAssignModal(false);
      setSelectedCourt(null);
    }
  };

  // Composant modal d'assignation de match à un terrain
  function AssignMatchToCourtModal({ open, onClose, courtNumber, matches, onAssign, teams, template, randomAssignments }: {
    open: boolean;
    onClose: () => void;
    courtNumber: number | null;
    matches: any[];
    onAssign: (matchId: string) => void;
    teams: any[];
    template: any;
    randomAssignments: any;
  }) {
    const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
    // Réinitialiser la sélection à chaque changement de la liste des matchs
    useEffect(() => {
      setSelectedMatch(null);
    }, [matches]);
    // Fonction utilitaire pour afficher le nom d'équipe comme dans le bracket
    function getTeamDisplay(match: any, which: 'team_1' | 'team_2') {
      const source = which === 'team_1' ? match.source_team_1 : match.source_team_2;
      // On peut utiliser resolveTeamSource avec buildMatchResults si besoin
      // Ici, on ne gère pas les dépendances de W_X/L_X, donc on passe [] pour matchResults
      const team = resolveTeamSource(source, teams, [], randomAssignments);
      return team ? (team.players?.map((p: any) => p.last_name).join(' - ') + (team.seed_number ? ` (TS${team.seed_number})` : '')) : source;
    }
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogTitle>Assigner un match au terrain {courtNumber}</DialogTitle>
          <div className="my-4">
            <Select value={selectedMatch || ''} onValueChange={setSelectedMatch}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir un match" />
              </SelectTrigger>
              <SelectContent>
                {matches.filter(m => !m.winner).length > 0 ? matches.filter(m => !m.winner).map((match) => (
                  <SelectItem key={match.id} value={match.id}>
                    Match #{match.ordre_match} : {getTeamDisplay(match, 'team_1')} vs {getTeamDisplay(match, 'team_2')}
                  </SelectItem>
                )) : (
                  <SelectItem value="none" disabled>Aucun match disponible</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
              onClick={onClose}
              type="button"
            >Annuler</button>
            <button
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
              onClick={() => selectedMatch && onAssign(selectedMatch)}
              disabled={!selectedMatch}
              type="button"
            >Assigner</button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Composant MatchCarousel compact horizontal
  function MatchCarousel({ matches, teams, template, randomAssignments, onUpdateTemplate, courtManagement }: any) {
    // Utilitaire pour getTeamDisplay et resolveTeamSource
    function getTeamDisplay(team?: any, fallbackSource?: string) {
      if (!team) return fallbackSource || '';
      const players = team.players?.map((p: any) => p.last_name).join(' - ');
      const ts = team.seed_number ? ` (TS${team.seed_number})` : '';
      if ((!team.players || team.players.length === 0) && !team.seed_number) {
        return team.name;
      }
      return `${players || team.name}${ts}`;
    }
    // Pour la résolution dynamique
    function buildMatchResults() {
      const allMatches = [...matches].sort((a, b) => a.ordre_match - b.ordre_match);
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
    const matchResults = buildMatchResults();
    return (
      <div className="w-full max-w-screen-xl mx-auto overflow-x-auto py-2">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 min-h-[140px] w-full">
          {matches.sort((a: any, b: any) => a.ordre_match - b.ordre_match).map((match: any) => {
            const team1 = resolveTeamSource(match.source_team_1, teams, matchResults, randomAssignments);
            const team2 = resolveTeamSource(match.source_team_2, teams, matchResults, randomAssignments);
            const team1Display = getTeamDisplay(team1 ?? undefined, match.source_team_1);
            const team2Display = getTeamDisplay(team2 ?? undefined, match.source_team_2);
            const isWinner1 = match.winner === '1';
            const isWinner2 = match.winner === '2';
            const isLooser1 = match.looser === '1';
            const isLooser2 = match.looser === '2';
            const isFinished = match.winner === '1' || match.winner === '2';
            return (
              <div key={match.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-2 flex flex-col gap-0.5 min-w-[200px] max-w-[200px] w-[200px] text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500 font-mono bg-gray-100 rounded px-2 py-0.5">Match #{match.ordre_match}</span>
                  {(match as any).terrain_number && (
                    <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5 font-mono">Court {(match as any).terrain_number}</span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div
                    className={isWinner1 ? "font-bold text-blue-700 cursor-pointer" : isLooser1 ? "text-gray-400 cursor-pointer" : "font-medium text-gray-700 cursor-pointer"}
                    onClick={() => {
                      if ((match.score_team_1 === null || match.score_team_1 === undefined) && (match.score_team_2 === null || match.score_team_2 === undefined)) {
                        onUpdateTemplate({ ...template, rotations: template.rotations.map((r: any) => ({ ...r, phases: r.phases.map((p: any) => ({ ...p, matches: p.matches.map((m: any) => m.id === match.id ? { ...m, winner: '1', looser: '2' } : m) })) })) });
                      }
                    }}
                    title="Cliquez pour sélectionner comme vainqueur (si pas de score)"
                  >
                    {team1Display}
                  </div>
                  <div className="mx-2 text-base font-bold text-gray-400 select-none" style={{ minWidth: 18, textAlign: 'center' }}>VS</div>
                  <div
                    className={isWinner2 ? "font-bold text-blue-700 cursor-pointer" : isLooser2 ? "text-gray-400 cursor-pointer" : "font-medium text-gray-700 cursor-pointer"}
                    onClick={() => {
                      if ((match.score_team_1 === null || match.score_team_1 === undefined) && (match.score_team_2 === null || match.score_team_2 === undefined)) {
                        onUpdateTemplate({ ...template, rotations: template.rotations.map((r: any) => ({ ...r, phases: r.phases.map((p: any) => ({ ...p, matches: p.matches.map((m: any) => m.id === match.id ? { ...m, winner: '2', looser: '1' } : m) })) })) });
                      }
                    }}
                    title="Cliquez pour sélectionner comme vainqueur (si pas de score)"
                  >
                    {team2Display}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <input
                    type="number"
                    min={0}
                    value={match.score_team_1 !== null && match.score_team_1 !== undefined ? match.score_team_1 : ''}
                    onChange={e => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      const score1 = val;
                      const score2 = match.score_team_2 !== null && match.score_team_2 !== undefined ? match.score_team_2 : null;
                      let winner = match.winner;
                      let looser = match.looser;
                      if (score1 !== null && score2 !== null) {
                        if (score1 > score2) { winner = '1'; looser = '2'; }
                        else if (score2 > score1) { winner = '2'; looser = '1'; }
                        else { winner = ''; looser = ''; }
                      } else {
                        winner = match.winner;
                        looser = match.looser;
                      }
                      onUpdateTemplate({ ...template, rotations: template.rotations.map((r: any) => ({ ...r, phases: r.phases.map((p: any) => ({ ...p, matches: p.matches.map((m: any) => m.id === match.id ? { ...m, score_team_1: val, winner, looser } : m) })) })) });
                    }}
                    className="w-8 px-1 py-0.5 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="S1"
                  />
                  <span className="text-gray-500 font-bold">-</span>
                  <input
                    type="number"
                    min={0}
                    value={match.score_team_2 !== null && match.score_team_2 !== undefined ? match.score_team_2 : ''}
                    onChange={e => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      const score1 = match.score_team_1 !== null && match.score_team_1 !== undefined ? match.score_team_1 : null;
                      const score2 = val;
                      let winner = match.winner;
                      let looser = match.looser;
                      if (score1 !== null && score2 !== null) {
                        if (score1 > score2) { winner = '1'; looser = '2'; }
                        else if (score2 > score1) { winner = '2'; looser = '1'; }
                        else { winner = ''; looser = ''; }
                      } else {
                        winner = match.winner;
                        looser = match.looser;
                      }
                      onUpdateTemplate({ ...template, rotations: template.rotations.map((r: any) => ({ ...r, phases: r.phases.map((p: any) => ({ ...p, matches: p.matches.map((m: any) => m.id === match.id ? { ...m, score_team_2: val, winner, looser } : m) })) })) });
                    }}
                    className="w-8 px-1 py-0.5 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="S2"
                  />
                  <button
                    className="ml-1 px-1 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 border border-gray-200 text-base flex items-center justify-center"
                    title="Réinitialiser le match"
                    onClick={() => onUpdateTemplate({ ...template, rotations: template.rotations.map((r: any) => ({ ...r, phases: r.phases.map((p: any) => ({ ...p, matches: p.matches.map((m: any) => m.id === match.id ? { ...m, score_team_1: null, score_team_2: null, winner: '', looser: '' } : m) })) })) })}
                    type="button"
                  >↺</button>
                </div>
                {/* Bouton assign court */}
                <div className="flex justify-center mt-1">
                  <button
                    className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold"
                    onClick={() => {
                      // Trouver le premier terrain libre
                      const courts = [1,2,3,4];
                      const occupied = matches.filter((m: any) => m.terrain_number).map((m: any) => m.terrain_number);
                      const free = courts.find(c => !occupied.includes(c));
                      if (free) {
                        onUpdateTemplate({ ...template, rotations: template.rotations.map((r: any) => ({ ...r, phases: r.phases.map((p: any) => ({ ...p, matches: p.matches.map((m: any) => m.id === match.id ? { ...m, terrain_number: free } : m) })) })) });
                      }
                    }}
                    disabled={!!match.terrain_number}
                    title={match.terrain_number ? "Déjà assigné" : "Assigner un terrain"}
                  >
                    {match.terrain_number ? "Court assigné" : "Assigner court"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CourtStatusHeader
        totalCourts={totalCourts}
        matches={matches}
        teams={teams}
        template={template}
        randomAssignments={randomAssignments}
      />
      <AssignMatchToCourtModal
        open={showAssignModal}
        onClose={() => { setShowAssignModal(false); setSelectedCourt(null); }}
        courtNumber={selectedCourt}
        matches={matches.filter(m => !m.terrain_number)}
        onAssign={handleAssignMatchToCourt}
        teams={teams}
        template={template}
        randomAssignments={randomAssignments}
      />
      <BracketFromJsonTemplate
        template={template}
        teams={teams}
        randomAssignments={randomAssignments}
        onUpdateTemplate={handleUpdateTemplate}
      />
    </div>
  );
}