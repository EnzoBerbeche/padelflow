export interface PointActionDefinition {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: 'green' | 'red';
  requiresPlayer: boolean;
  subTags: PointActionSubTag[];
  subSubTags?: PointActionSubTag[]; // Pour Unforced Error
}

export interface PointActionSubTag {
  id: string;
  label: string;
  icon?: string;
}

// Configuration complète basée sur l'architecture fournie
export const POINT_ACTIONS: PointActionDefinition[] = [
  // ===== POINTS GAGNÉS =====
  {
    id: 'passing_winner',
    label: 'Passing',
    description: 'Passing gagnant',
    icon: '🏃',
    color: 'green',
    requiresPlayer: true,
    subTags: [
      { id: 'droite', label: 'Droite' },
      { id: 'milieu', label: 'Milieu' },
      { id: 'gauche', label: 'Gauche' }
    ]
  },
  {
    id: 'volley_winner',
    label: 'Volée',
    description: 'Volée gagnante',
    icon: '✋',
    color: 'green',
    requiresPlayer: true,
    subTags: [
      { id: 'droite', label: 'Droite' },
      { id: 'milieu', label: 'Milieu' },
      { id: 'gauche', label: 'Gauche' }
    ]
  },
  {
    id: 'smash_winner',
    label: 'Smash',
    description: 'Smash gagnant',
    icon: '💥',
    color: 'green',
    requiresPlayer: true,
    subTags: [
      { id: 'par3', label: 'Par 3' },
      { id: 'par4', label: 'Par 4' },
      { id: 'ar', label: 'A/R' }
    ]
  },
  {
    id: 'lob_winner',
    label: 'Lob',
    description: 'Lob gagnant',
    icon: '🏸',
    color: 'green',
    requiresPlayer: true,
    subTags: [
      { id: 'droite', label: 'Droite' },
      { id: 'milieu', label: 'Milieu' },
      { id: 'gauche', label: 'Gauche' }
    ]
  },
  {
    id: 'vibora_bandeja_winner',
    label: 'Vibora/Bandeja',
    description: 'Vibora ou Bandeja gagnante',
    icon: '🎯',
    color: 'green',
    requiresPlayer: true,
    subTags: [
      { id: 'droite', label: 'Droite' },
      { id: 'milieu', label: 'Milieu' },
      { id: 'gauche', label: 'Gauche' }
    ]
  },
  {
    id: 'bajada_winner',
    label: 'Bajada',
    description: 'Bajada gagnante',
    icon: '⬇️',
    color: 'green',
    requiresPlayer: true,
    subTags: [
      { id: 'droite', label: 'Droite' },
      { id: 'milieu', label: 'Milieu' },
      { id: 'gauche', label: 'Gauche' }
    ]
  },
  {
    id: 'opponent_direct_fault',
    label: 'Faute directe adverse',
    description: 'Point gagné par erreur adverse',
    icon: '❌',
    color: 'green',
    requiresPlayer: true,
    subTags: []
  },

  // ===== POINTS PERDUS =====
  {
    id: 'forced_error',
    label: 'Forced Error',
    description: 'Erreur forcée par l\'adversaire',
    icon: '🔥',
    color: 'red',
    requiresPlayer: true,
    subTags: [
      { id: 'contre_smash', label: 'Contre-smash' },
      { id: 'lob_court', label: 'Lob court' },
      { id: 'erreur_zone', label: 'Erreur de zone' }
    ]
  },
  {
    id: 'winner_on_error',
    label: 'Winner on error',
    description: 'Winner adverse sur erreur',
    icon: '🎯',
    color: 'red',
    requiresPlayer: true,
    subTags: []
  },
  {
    id: 'unforced_error',
    label: 'Unforced Error',
    description: 'Faute directe non forcée',
    icon: '🚫',
    color: 'red',
    requiresPlayer: true,
    subTags: [
      { id: 'passing', label: 'Passing', icon: '🏃' },
      { id: 'volley', label: 'Volée', icon: '✋' },
      { id: 'smash', label: 'Smash', icon: '💥' },
      { id: 'lob', label: 'Lob', icon: '🏸' },
      { id: 'vibora_bandeja', label: 'Vibora/Bandeja', icon: '🎯' },
      { id: 'bajada', label: 'Bajada', icon: '⬇️' }
    ],
    subSubTags: [
      { id: 'filet', label: 'Filet', icon: '🚫' },
      { id: 'vitre', label: 'Vitre', icon: '🪟' },
      { id: 'grille', label: 'Grille', icon: '🔲' }
    ]
  }
];
