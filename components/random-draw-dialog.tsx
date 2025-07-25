import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { TeamWithPlayers } from '../lib/storage';

interface RandomDrawDialogProps {
  open: boolean;
  onClose: () => void;
  teams: TeamWithPlayers[];
  randomOccurrences: {key: string, base: string, index: number}[];
  onComplete: (assignments: Record<string, string>) => void;
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const RandomDrawDialog: React.FC<RandomDrawDialogProps> = ({ open, onClose, teams, randomOccurrences, onComplete }) => {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const doDraw = () => {
    setLoading(true);
    setRevealed(false);
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
      setTimeout(() => setRevealed(true), 500);
    }, 1000);
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Tirage aléatoire</DialogTitle>
        {loading && <div style={{textAlign:'center',padding:24}}>Tirage en cours...</div>}
        {!loading && revealed && (
          <div style={{margin:'16px 0'}}>
            {randomOccurrences.map((occ, idx) => {
              const teamId = assignments[occ.key];
              const team = teams.find(t => t.id === teamId);
              return (
                <div key={occ.key} style={{marginBottom:8}}>
                  <b>{occ.key.replace(/_/g, ' ').toUpperCase()}</b> : {team ? `${team.players?.map((p: any)=>p.last_name).join(' - ')} (TS${team.seed_number})` : teamId}
                </div>
              );
            })}
          </div>
        )}
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <Button onClick={handleReroll} disabled={loading} variant="outline">Relancer le tirage</Button>
          <Button onClick={handleValidate} disabled={loading || !revealed} variant="default">Valider</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};