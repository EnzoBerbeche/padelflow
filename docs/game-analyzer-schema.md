# Schema Supabase pour Game Analyzer

## Tables

### 1. padel_analyses
Table principale pour stocker les analyses de match.

```sql
CREATE TABLE padel_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_name TEXT NOT NULL,
  player_right TEXT NOT NULL,
  player_left TEXT NOT NULL,
  opponent_right TEXT DEFAULT 'Adversaire 1',
  opponent_left TEXT DEFAULT 'Adversaire 2',
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. point_actions
Table de référence pour les actions de points avec structure hiérarchique.

```sql
CREATE TABLE point_actions (
  id INTEGER PRIMARY KEY,
  category_1 TEXT NOT NULL, -- 'gagne' ou 'perdu'
  id_1 INTEGER NOT NULL,
  category_2 TEXT NOT NULL, -- type d'action principal
  id_2 INTEGER NOT NULL,
  category_3 TEXT, -- direction/type
  id_3 INTEGER,
  category_4 TEXT, -- lieu de la faute
  id_4 INTEGER,
  requires_player BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Structure des données :**
- **Points gagnés (ID 1-19)** : `gagne_[type]_[direction]`
- **Points perdus (ID 20-41)** : `perdu_[type]_[sous_type]_[lieu]`

**Exemples :**
- ID 1: `gagne_passing_droite`
- ID 24: `perdu_unforced_error_passing_filet`
- ID 36: `perdu_unforced_error_vibora_bandeja_filet`

### 3. match_points
Table pour stocker les points enregistrés avec référence aux actions.

```sql
CREATE TABLE match_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID REFERENCES padel_analyses(id) ON DELETE CASCADE,
  action_id INTEGER REFERENCES point_actions(id),
  player_position TEXT CHECK (player_position IN ('player1', 'player2')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Données de référence

### Points gagnés (ID 1-19)
```sql
-- Passing
(1, 'gagne', 1, 'passing', 1, 'droite', 1, true),
(2, 'gagne', 1, 'passing', 1, 'gauche', 2, true),
(3, 'gagne', 1, 'passing', 1, 'milieu', 3, true),
-- Volley
(4, 'gagne', 1, 'volley', 2, 'droite', 1, true),
(5, 'gagne', 1, 'volley', 2, 'gauche', 2, true),
(6, 'gagne', 1, 'volley', 2, 'milieu', 3, true),
-- Smash
(7, 'gagne', 1, 'smash', 3, 'par_3', 4, true),
(8, 'gagne', 1, 'smash', 3, 'par_4', 5, true),
(9, 'gagne', 1, 'smash', 3, 'ar', 6, true),
-- Lob
(10, 'gagne', 1, 'lob', 4, 'droite', 1, true),
(11, 'gagne', 1, 'lob', 4, 'gauche', 2, true),
(12, 'gagne', 1, 'lob', 4, 'milieu', 3, true),
-- Vibora/Bandeja
(13, 'gagne', 1, 'vibora_bandeja', 5, 'droite', 1, true),
(14, 'gagne', 1, 'vibora_bandeja', 5, 'gauche', 2, true),
(15, 'gagne', 1, 'vibora_bandeja', 5, 'milieu', 3, true),
-- Bajada
(16, 'gagne', 1, 'bajada', 6, 'droite', 1, true),
(17, 'gagne', 1, 'bajada', 6, 'gauche', 2, true),
(18, 'gagne', 1, 'bajada', 6, 'milieu', 3, true),
-- Faute direct adverse
(19, 'gagne', 1, 'faute_direct_adverse', 7, NULL, NULL, false)
```

### Points perdus (ID 20-41)
```sql
-- Forced Error
(20, 'perdu', 2, 'forced_error', 8, NULL, NULL, false),
-- Winner on error
(21, 'perdu', 2, 'winner_on_error', 9, 'contre_smash', 7, true),
(22, 'perdu', 2, 'winner_on_error', 9, 'lob_court', 8, true),
(23, 'perdu', 2, 'winner_on_error', 9, 'erreur_zone', 9, true),
-- Unforced Error - Passing
(24, 'perdu', 2, 'unforced_error', 10, 'passing', 10, true),
(25, 'perdu', 2, 'unforced_error', 10, 'passing', 10, true),
(26, 'perdu', 2, 'unforced_error', 10, 'passing', 10, true),
-- Unforced Error - Volley
(27, 'perdu', 2, 'unforced_error', 10, 'volley', 11, true),
(28, 'perdu', 2, 'unforced_error', 10, 'volley', 11, true),
(29, 'perdu', 2, 'unforced_error', 10, 'volley', 11, true),
-- Unforced Error - Smash
(30, 'perdu', 2, 'unforced_error', 10, 'smash', 12, true),
(31, 'perdu', 2, 'unforced_error', 10, 'smash', 12, true),
(32, 'perdu', 2, 'unforced_error', 10, 'smash', 12, true),
-- Unforced Error - Lob
(33, 'perdu', 2, 'unforced_error', 10, 'lob', 13, true),
(34, 'perdu', 2, 'unforced_error', 10, 'lob', 13, true),
(35, 'perdu', 2, 'unforced_error', 10, 'lob', 13, true),
-- Unforced Error - Vibora/Bandeja
(36, 'perdu', 2, 'unforced_error', 10, 'vibora_bandeja', 14, true),
(37, 'perdu', 2, 'unforced_error', 10, 'vibora_bandeja', 14, true),
(38, 'perdu', 2, 'unforced_error', 10, 'vibora_bandeja', 14, true),
-- Unforced Error - Bajada
(39, 'perdu', 2, 'unforced_error', 10, 'bajada', 15, true),
(40, 'perdu', 2, 'unforced_error', 10, 'bajada', 15, true),
(41, 'perdu', 2, 'unforced_error', 10, 'bajada', 15, true)
```

### Mise à jour des Unforced Errors avec Category_4 (lieu de la faute)
```sql
UPDATE point_actions SET category_4 = 'filet', id_4 = 1 WHERE id IN (24, 27, 30, 33, 36, 39);
UPDATE point_actions SET category_4 = 'vitre', id_4 = 2 WHERE id IN (25, 28, 31, 34, 37, 40);
UPDATE point_actions SET category_4 = 'grille', id_4 = 3 WHERE id IN (26, 29, 32, 35, 38, 41);
```

## Politiques RLS

### padel_analyses
- Users can view their own analyses
- Users can insert their own analyses
- Users can update their own analyses
- Users can delete their own analyses

### match_points
- Users can view points from their analyses
- Users can insert points to their analyses
- Users can update points from their analyses
- Users can delete points from their analyses

## Indexes
- `idx_padel_analyses_user_id` ON padel_analyses(user_id)
- `idx_padel_analyses_status` ON padel_analyses(status)
- `idx_match_points_analysis_id` ON match_points(analysis_id)
- `idx_match_points_timestamp` ON match_points(timestamp)
- `idx_point_actions_category` ON point_actions(category_1, category_2)

## Fonctions
- `get_analysis_stats(analysis_uuid UUID)` : Retourne les statistiques d'une analyse
