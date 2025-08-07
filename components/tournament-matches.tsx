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
  const totalCourts = tournament.number_of_courts || 4; // Use tournament's court count
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
        onUpdateTemplate={handleUpdateTemplate}
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
        totalCourts={totalCourts}
      />
    </div>
  );
}