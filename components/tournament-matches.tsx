'use client';

import { useState, useEffect } from 'react';
import { storage, Tournament, TeamWithPlayers, MatchWithTeams } from '@/lib/storage';
import { BracketFromJsonTemplate } from './bracket-from-json-template';
import { RandomAssignments, MatchResult, resolveTeamSource } from '@/lib/team-source-resolver';
import { tournamentMatchesAPI } from '@/lib/supabase';
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

  // Helper: compute indexed random key for a match within a template
  function computeIndexedRandomKey(source: string, match: any, templateData: any): string {
    if (!source || !source.startsWith('random_')) return source;
    let count = 0;
    for (const rotation of templateData?.rotations || []) {
      for (const phase of rotation.phases || []) {
        for (const m of phase.matches || []) {
          if (m.source_team_1 === source || m.source_team_2 === source) {
            count++;
            if (m === match || m.id === match.id) {
              return `${source}_${count}`;
            }
          }
        }
      }
    }
    return source;
  }

  useEffect(() => {
    // Use tournament props (Supabase-backed) instead of local storage
    setTemplate((tournament as any)?.format_json || null);
    setRandomAssignments((tournament as any)?.random_assignments || {});
    // Derive matches from template if available
    const tpl = (tournament as any)?.format_json;
    setMatches(tpl?.rotations?.flatMap((r: any) => r.phases.flatMap((p: any) => p.matches)) || []);
    // Overlay DB winners/scores into template so refresh reflects persisted results
    (async () => {
      try {
        const rows = await tournamentMatchesAPI.listByTournament(tournament.id);
        if ((!tpl || Object.keys(tpl || {}).length === 0) && rows && rows.length > 0) {
          // Build a minimal template from DB rows so the tab can render even if format_json is missing
          const rotationsMap = new Map<string, any>();
          const byRotation = (rows as any[]).reduce((acc, r) => {
            const rot = r.rotation_group || 'Rotation';
            if (!acc.has(rot)) acc.set(rot, [] as any[]);
            acc.get(rot)!.push(r);
            return acc;
          }, new Map<string, any[]>());
          const rotations: any[] = [];
          (Array.from(byRotation.entries()) as Array<[string, any[]]>).forEach(([rotName, rotRows]) => {
            // Group by stage/phase name
            const phasesMap = new Map<string, any[]>();
            for (const rr of rotRows) {
              const phaseName = rr.stage || rr.round || 'Match';
              if (!phasesMap.has(phaseName)) phasesMap.set(phaseName, []);
              phasesMap.get(phaseName)!.push(rr);
            }
            const phases: any[] = [];
            (Array.from(phasesMap.entries()) as Array<[string, any[]]>).forEach(([phaseName, phaseRows]) => {
              const matches = phaseRows
                .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
                .map((r: any) => ({
                  id: r.json_match_id ?? r.id,
                  ordre_match: r.order_index,
                  stage: r.stage || r.round || 'Match',
                  source_team_1: r.team1_source || '',
                  source_team_2: r.team2_source || '',
                }));
              phases.push({ name: phaseName, matches });
            });
            rotations.push({ name: rotName, phases });
          });
          const reconstructed = { rotations };
          setTemplate(reconstructed);
          setMatches(rotations.flatMap((r: any) => r.phases.flatMap((p: any) => p.matches)) || []);
          return; // skip overlay on first pass; next render will overlay using reconstructed tpl
        }
        if (!tpl || !rows || rows.length === 0) return;
        const byJson = new Map<number, typeof rows[number]>();
        rows.forEach(r => { if (typeof r.json_match_id === 'number') byJson.set(r.json_match_id, r as any); });

        const newTpl = JSON.parse(JSON.stringify(tpl));
        // Build results progressively to resolve W_X/L_X sources
        const allMatches = newTpl.rotations?.flatMap((r: any) => r.phases.flatMap((p: any) => p.matches)) || [];
        allMatches.sort((a: any, b: any) => (a.ordre_match || 0) - (b.ordre_match || 0));
        const results: MatchResult[] = [];
        for (const m of allMatches) {
          const row = byJson.get(m.id);
          if (row) {
            const src1 = computeIndexedRandomKey(String(m.source_team_1 || ''), m, newTpl);
            const src2 = computeIndexedRandomKey(String(m.source_team_2 || ''), m, newTpl);
            const team1 = resolveTeamSource(src1, teams, results, (tournament as any)?.random_assignments || {});
            const team2 = resolveTeamSource(src2, teams, results, (tournament as any)?.random_assignments || {});
            if (row.winner_team_id && team1?.id && row.winner_team_id === team1.id) {
              m.winner = '1'; m.looser = '2';
            } else if (row.winner_team_id && team2?.id && row.winner_team_id === team2.id) {
              m.winner = '2'; m.looser = '1';
            }
            if (typeof row.terrain_number === 'number') {
              m.terrain_number = row.terrain_number;
            }
            if (row.score && typeof row.score === 'string' && row.score.includes('-')) {
              const [s1, s2] = row.score.split('-').map((x: string) => Number(x.trim()));
              if (!Number.isNaN(s1)) m.score_team_1 = s1; else m.score_team_1 = null;
              if (!Number.isNaN(s2)) m.score_team_2 = s2; else m.score_team_2 = null;
            }
          }
          // push computed winner to feed downstream W_X/L_X resolutions
          let winner_team_id: string | undefined;
          let looser_team_id: string | undefined;
          const s1x = computeIndexedRandomKey(String(m.source_team_1 || ''), m, newTpl);
          const s2x = computeIndexedRandomKey(String(m.source_team_2 || ''), m, newTpl);
          const t1x = resolveTeamSource(s1x, teams, results, (tournament as any)?.random_assignments || {});
          const t2x = resolveTeamSource(s2x, teams, results, (tournament as any)?.random_assignments || {});
          if (m.winner === '1') {
            winner_team_id = t1x?.id;
            looser_team_id = t2x?.id;
          } else if (m.winner === '2') {
            winner_team_id = t2x?.id;
            looser_team_id = t1x?.id;
          }
          results.push({ id: m.id, winner_team_id, looser_team_id });
        }

        // Backfill team_1_id/team_2_id for dependents using DB winners (W_X/L_X)
        const winnerByJson = new Map<number, string>();
        rows.forEach(r => {
          if (r.winner_team_id && typeof r.json_match_id === 'number') {
            winnerByJson.set(r.json_match_id as number, r.winner_team_id as string);
          }
        });

        const matchById = new Map<number, any>();
        allMatches.forEach((m: any) => matchById.set(m.id, m));

        const resolveTeamIdFromSource = (src: string | undefined, srcMatch: any): string | undefined => {
          if (!src) return undefined;
          const indexed = computeIndexedRandomKey(String(src), srcMatch, newTpl);
          const team = resolveTeamSource(indexed, teams, results, (tournament as any)?.random_assignments || {});
          return team?.id;
        };
        const resolveLoserId = (srcMatchId: number): string | null => {
          const src = matchById.get(srcMatchId);
          if (!src) return null;
          const t1 = resolveTeamIdFromSource(src.source_team_1, src);
          const t2 = resolveTeamIdFromSource(src.source_team_2, src);
          const w = winnerByJson.get(srcMatchId);
          if (!w) return null;
          if (t1 && t1 !== w) return t1;
          if (t2 && t2 !== w) return t2;
          return null;
        };

        for (const dep of allMatches) {
          const dbRow = byJson.get(dep.id);
          const patch: any = {};
          const w1 = /^(winner_|W_)(\d+)$/.exec(dep.source_team_1 || '');
          const w2 = /^(winner_|W_)(\d+)$/.exec(dep.source_team_2 || '');
          const l1 = /^(loser_|L_)(\d+)$/.exec(dep.source_team_1 || '');
          const l2 = /^(loser_|L_)(\d+)$/.exec(dep.source_team_2 || '');
          if (w1) {
            const mid = Number(w1[2]);
            const id = winnerByJson.get(mid);
            if (id) patch.team_1_id = id;
          }
          if (w2) {
            const mid = Number(w2[2]);
            const id = winnerByJson.get(mid);
            if (id) patch.team_2_id = id;
          }
          if (l1) {
            const mid = Number(l1[2]);
            const id = resolveLoserId(mid);
            if (id) patch.team_1_id = id;
          }
          if (l2) {
            const mid = Number(l2[2]);
            const id = resolveLoserId(mid);
            if (id) patch.team_2_id = id;
          }
          if (Object.keys(patch).length > 0) {
            // only write if missing in DB
            if (!dbRow || (patch.team_1_id && !dbRow.team_1_id) || (patch.team_2_id && !dbRow.team_2_id)) {
              await tournamentMatchesAPI.updateByJsonMatch(tournament.id, dep.id, patch);
            }
          }
        }
        setTemplate(newTpl);
        setMatches(newTpl.rotations?.flatMap((r: any) => r.phases.flatMap((p: any) => p.matches)) || []);
      } catch {
        // noop
      }
    })();
  }, [tournament]);

  // Nouvelle fonction pour mettre à jour le template du tournoi (bracket)
  const handleUpdateTemplate = (newTemplate: any) => {
    // Update in memory; the page is responsible for persisting
    let templateToUpdate = newTemplate;
    // Libération automatique des terrains pour les matchs terminés
    let changed = false;
    const allMatches = templateToUpdate?.rotations?.flatMap((r: any) => r.phases.flatMap((p: any) => p.matches)) || [];
    allMatches.forEach((m: any) => {
      if ((m.winner === '1' || m.winner === '2') && m.terrain_number) {
        m.terrain_number = undefined;
        changed = true;
      }
    });
    setTemplate(templateToUpdate || null);
    setMatches(templateToUpdate?.rotations?.flatMap((r: any) => r.phases.flatMap((p: any) => p.matches)) || []);
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
        tournamentId={tournament.id}
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
        tournamentId={tournament.id}
        template={template}
        teams={teams}
        randomAssignments={randomAssignments}
        onUpdateTemplate={handleUpdateTemplate}
        totalCourts={totalCourts}
      />
    </div>
  );
}