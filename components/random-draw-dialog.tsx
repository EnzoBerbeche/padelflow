import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { TeamWithPlayers } from '../lib/storage';
import { resolveTeamSource } from '../lib/team-source-resolver';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Trophy } from 'lucide-react';

interface RandomDrawDialogProps {
  open: boolean;
  onClose: () => void;
  teams: TeamWithPlayers[];
  randomOccurrences: {key: string, base: string, index: number}[];
  onComplete: (assignments: Record<string, string>) => void;
  formatTemplate?: any;
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const RandomDrawDialog: React.FC<RandomDrawDialogProps> = ({ 
  open, 
  onClose, 
  teams, 
  randomOccurrences, 
  onComplete,
  formatTemplate 
}) => {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);

  // Helper function to generate the correct random key with index
  const generateRandomKey = (source: string, match: any, template: any) => {
    if (!source || !source.startsWith('random_')) return source;
    
    // Count how many times this random source appears before this match
    let count = 0;
    for (const rotation of template.rotations) {
      for (const phase of rotation.phases) {
        for (const m of phase.matches) {
          if (m.source_team_1 === source || m.source_team_2 === source) {
            count++;
            // If this is the current match, return the key with this count
            if (m.ordre_match === match.ordre_match && m === match) {
              return `${source}_${count}`;
            }
          }
        }
      }
    }
    return source;
  };

  // Generate match previews based on assignments
  const matchPreviews = useMemo(() => {
    if (!formatTemplate || !revealed || Object.keys(assignments).length === 0) {
      return [];
    }

    const previews: Array<{
      phase: string;
      matchNumber: number;
      team1: TeamWithPlayers | null;
      team2: TeamWithPlayers | null;
      source1: string;
      source2: string;
    }> = [];

    // Process each rotation and phase to find matches with random assignments
    formatTemplate.rotations?.forEach((rotation: any) => {
      rotation.phases?.forEach((phase: any) => {
        phase.matches?.forEach((match: any) => {
          // Check if this match uses random assignments
          const hasRandom1 = match.source_team_1 && match.source_team_1.startsWith('random_');
          const hasRandom2 = match.source_team_2 && match.source_team_2.startsWith('random_');
          
          if (hasRandom1 || hasRandom2) {
            // Generate the correct random key with index for this specific match
            const team1Key = hasRandom1 ? generateRandomKey(match.source_team_1, match, formatTemplate) : match.source_team_1;
            const team2Key = hasRandom2 ? generateRandomKey(match.source_team_2, match, formatTemplate) : match.source_team_2;
            
            // Resolve teams using the current assignments
            const team1 = resolveTeamSource(team1Key, teams, [], assignments);
            const team2 = resolveTeamSource(team2Key, teams, [], assignments);
            
            previews.push({
              phase: phase.name,
              matchNumber: match.ordre_match,
              team1,
              team2,
              source1: match.source_team_1,
              source2: match.source_team_2
            });
          }
        });
      });
    });

    return previews.sort((a, b) => a.matchNumber - b.matchNumber);
  }, [assignments, revealed, formatTemplate, teams]);

  const doDraw = () => {
    setLoading(true);
    setRevealed(false);
    setAnimationStep(0);
    
    // Start animation
    const animationInterval = setInterval(() => {
      setAnimationStep(prev => prev + 1);
    }, 100);

    setTimeout(() => {
      const newAssignments: Record<string, string> = {};
      // Grouper les occurrences par base
      const grouped: Record<string, {key: string, base: string, index: number}[]> = {};
      for (const occ of randomOccurrences) {
        if (!grouped[occ.base]) grouped[occ.base] = [];
        grouped[occ.base].push(occ);
      }
      // Pour chaque base, tirer les équipes sans doublon
      for (const base in grouped) {
        const [, min, max] = base.match(/^random_(\d+)_(\d+)$/) || [];
        if (min && max) {
          const minSeed = parseInt(min, 10);
          const maxSeed = parseInt(max, 10);
          const candidates = teams.filter(t => t.seed_number && t.seed_number >= minSeed && t.seed_number <= maxSeed);
          const shuffled = shuffle(candidates);
          grouped[base].forEach((occ, idx) => {
            if (shuffled[idx]) {
              newAssignments[occ.key] = shuffled[idx].id;
            }
          });
        }
      }
      setAssignments(newAssignments);
      setLoading(false);
      clearInterval(animationInterval);
      setTimeout(() => setRevealed(true), 500);
    }, 2000); // Longer animation time
  };

  React.useEffect(() => {
    if (open) doDraw();
    // eslint-disable-next-line
  }, [open]);

  const handleValidate = () => {
    onComplete(assignments);
    onClose();
  };

  const handleReroll = () => {
    doDraw();
  };

  const getTeamDisplay = (team: TeamWithPlayers | null, fallbackSource: string) => {
    if (!team) return fallbackSource;
    const players = team.players?.map(p => p.last_name).join(' - ');
    const ts = team.seed_number ? ` (TS${team.seed_number})` : '';
    return `${players || team.name}${ts}`;
  };

  // Animation effect for team names
  const getAnimatedTeamDisplay = (team: TeamWithPlayers | null, fallbackSource: string, isAnimating: boolean) => {
    if (isAnimating) {
      // Show random team names during animation
      const randomTeams = teams.filter(t => t.seed_number && t.seed_number >= 3 && t.seed_number <= 8);
      const randomTeam = randomTeams[Math.floor(Math.random() * randomTeams.length)];
      if (randomTeam) {
        const players = randomTeam.players?.map(p => p.last_name).join(' - ');
        const ts = randomTeam.seed_number ? ` (TS${randomTeam.seed_number})` : '';
        return `${players || randomTeam.name}${ts}`;
      }
    }
    return getTeamDisplay(team, fallbackSource);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Tirage aléatoire
        </DialogTitle>
        
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">Tirage en cours...</p>
            <p className="text-sm text-gray-600 mt-2">Préparation des matchs</p>
          </div>
        )}
        
        {!loading && revealed && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Aperçu des matchs générés
            </h3>
            <div className="space-y-3">
              {matchPreviews.map((preview, index) => (
                <Card key={index} className="border-blue-200 bg-blue-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>{preview.phase}</span>
                      <Badge variant="outline" className="font-mono">
                        Match #{preview.matchNumber}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-center gap-4">
                      <div className="flex-1 text-center">
                        <div className="font-medium text-sm">
                          {getAnimatedTeamDisplay(preview.team1, preview.source1, loading)}
                        </div>
                        {preview.team1 && !loading && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            TS{preview.team1.seed_number}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-lg font-bold text-gray-400 px-4">VS</div>
                      
                      <div className="flex-1 text-center">
                        <div className="font-medium text-sm">
                          {getAnimatedTeamDisplay(preview.team2, preview.source2, loading)}
                        </div>
                        {preview.team2 && !loading && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            TS{preview.team2.seed_number}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button onClick={handleReroll} disabled={loading} variant="outline">
            Relancer le tirage
          </Button>
          <Button onClick={handleValidate} disabled={loading || !revealed} variant="default">
            Valider et générer les matchs
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};