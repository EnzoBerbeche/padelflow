'use client';

import { useState, useEffect } from 'react';
import { storage, Tournament, TeamWithPlayers, MatchWithTeams } from '@/lib/storage';
import { BracketFromJsonTemplate } from './bracket-from-json-template';
import { RandomAssignments, MatchResult } from '@/lib/team-source-resolver';

interface TournamentMatchesProps {
  tournament: Tournament;
  teams: TeamWithPlayers[];
}

export function TournamentMatches({ tournament, teams }: TournamentMatchesProps) {
  const [randomAssignments, setRandomAssignments] = useState<RandomAssignments>({});
  const [template, setTemplate] = useState<any>(null);

  useEffect(() => {
    // Charger la copie du format stockée dans le tournoi
    const tournamentData = storage.tournaments.getById(tournament.id);
    setTemplate(tournamentData?.format_json || null);
    setRandomAssignments(tournamentData?.random_assignments || {});
  }, [tournament.id]);

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BracketFromJsonTemplate
        template={template}
        teams={teams}
        matchResults={[]}
        randomAssignments={randomAssignments}
      />
    </div>
  );
}