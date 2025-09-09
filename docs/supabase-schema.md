### Supabase schema

#### Overview
- Core auth and rankings:
  - `auth.users` (managed by Supabase Auth; RLS enabled)
  - `public.tenup` (TenUp ranking data; RLS disabled)
  - `public.tenup_latest` (view: latest TenUp ranking per player)
- User-scoped list and read models:
  - `public.players` (user-owned licences; RLS enabled)
  - `public.user_player_links` (user-to-player associations; RLS enabled)
- Tournament system:
  - `public.tournaments` (tournament metadata; RLS enabled)
  - `public.tournament_players` (player snapshots per tournament; RLS enabled)
  - `public.tournament_teams` (teams per tournament; RLS enabled)
  - `public.team_players` (team composition; RLS enabled)
  - `public.tournament_matches` (match data and results; RLS enabled)
  - `public.tournament_formats` (tournament format definitions; RLS enabled)
- Game analysis system:
  - `public.padel_analyses` (padel game analyses; RLS enabled)
  - `public.match_points` (individual points within analyses; RLS enabled)
  - `public.point_actions` (point action definitions; RLS disabled)

---

### auth.users
- Purpose: canonical user store managed by Supabase Auth. Avoid direct writes except via Supabase Auth APIs.
- RLS: enabled (managed by Supabase)
- User Roles: stored in `raw_user_meta_data.role`
  - `player`: Regular user (default)
  - `club`: Club manager with additional permissions
  - `admin`: System administrator with full access
- Primary/unique constraints:
  - PRIMARY KEY (id)
  - UNIQUE (phone)
  - Partial unique on email: UNIQUE (email) WHERE (is_sso_user = false)
  - Token uniques (conditional, to prevent collisions): confirmation_token_idx, email_change_token_current_idx, email_change_token_new_idx, reauthentication_token_idx, recovery_token_idx
- Indexes:
  - users_pkey (PRIMARY KEY on id)
  - users_phone_key (UNIQUE on phone)
  - users_email_partial_key (UNIQUE on email WHERE is_sso_user = false)
  - confirmation_token_idx (UNIQUE on confirmation_token with filter)
  - email_change_token_current_idx (UNIQUE on email_change_token_current with filter)
  - email_change_token_new_idx (UNIQUE on email_change_token_new with filter)
  - reauthentication_token_idx (UNIQUE on reauthentication_token with filter)
  - recovery_token_idx (UNIQUE on recovery_token with filter)
  - users_instance_id_email_idx (INDEX on (instance_id, lower(email)))
  - users_instance_id_idx (INDEX on instance_id)
  - users_is_anonymous_idx (INDEX on is_anonymous)

- Columns (name, type, nullability, default):
  - instance_id uuid NULL
  - id uuid NOT NULL
  - aud varchar(255) NULL
  - role varchar(255) NULL
  - email varchar(255) NULL
  - encrypted_password varchar(255) NULL
  - email_confirmed_at timestamptz NULL
  - invited_at timestamptz NULL
  - confirmation_token varchar(255) NULL
  - confirmation_sent_at timestamptz NULL
  - recovery_token varchar(255) NULL
  - recovery_sent_at timestamptz NULL
  - email_change_token_new varchar(255) NULL
  - email_change varchar(255) NULL
  - email_change_sent_at timestamptz NULL
  - last_sign_in_at timestamptz NULL
  - raw_app_meta_data jsonb NULL
  - raw_user_meta_data jsonb NULL
  - is_super_admin boolean NULL
  - created_at timestamptz NULL
  - updated_at timestamptz NULL
  - phone text NULL DEFAULT NULL::varchar
  - phone_confirmed_at timestamptz NULL
  - phone_change text NULL DEFAULT ''::varchar
  - phone_change_token varchar(255) NULL DEFAULT ''::varchar
  - phone_change_sent_at timestamptz NULL
  - confirmed_at timestamptz NULL
  - email_change_token_current varchar(255) NULL DEFAULT ''::varchar
  - email_change_confirm_status smallint NULL DEFAULT 0
  - banned_until timestamptz NULL
  - reauthentication_token varchar(255) NULL DEFAULT ''::varchar
  - reauthentication_sent_at timestamptz NULL
  - is_sso_user boolean NOT NULL DEFAULT false
  - deleted_at timestamptz NULL
  - is_anonymous boolean NOT NULL DEFAULT false

---

### public.tournament_formats
- Purpose: stores tournament format definitions with JSON bracket structures
- RLS: enabled
- Access: read access for all users, write access for authenticated users
- Primary/unique constraints:
  - PRIMARY KEY (id)
  - UNIQUE (name)
- Indexes:
  - tournament_formats_pkey (PRIMARY KEY on id)
  - unique_format_name (UNIQUE on name)
  - idx_tournament_formats_json (GIN index on format_json for fast JSON queries)

- Columns (name, type, nullability, default):
  - id UUID NOT NULL DEFAULT gen_random_uuid()
  - name TEXT NOT NULL
  - description TEXT NULL
  - min_players INTEGER NOT NULL
  - max_players INTEGER NOT NULL
  - features TEXT[] NULL
  - format_json JSONB NOT NULL
  - is_default BOOLEAN NOT NULL DEFAULT false
  - created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

- RLS Policies:
  - "Allow read access to tournament formats": SELECT access for all users
  - "Allow authenticated users to manage tournament formats": ALL access for authenticated users

---

### public.tenup
- Purpose: TenUp ranking data snapshots with comprehensive player information
- RLS: disabled (external data source)
- Primary/unique constraints:
  - PRIMARY KEY (id)
  - UNIQUE (idcrm, date_classement)
- Indexes:
  - tenup_pkey (PRIMARY KEY on id)
  - unique_idcrm_date (UNIQUE on (idcrm, date_classement))

- Columns (name, type, nullability, default):
  - id bigint NOT NULL DEFAULT nextval('tenup_id_seq'::regclass)
  - idcrm bigint NOT NULL
  - nom varchar(255) NULL
  - prenom varchar(255) NULL
  - nom_complet varchar(500) NULL
  - classement integer NULL
  - points integer NULL
  - evolution integer NULL
  - meilleur_classement integer NULL
  - nombre_tournois integer NULL
  - age_sportif integer NULL
  - nationalite varchar(10) NULL
  - categorie_age integer NULL
  - ligue varchar(255) NULL
  - assimilation boolean NULL
  - date_classement date NOT NULL
  - pratique varchar(50) NULL DEFAULT 'PADEL'::varchar
  - sexe varchar(10) NULL
  - created_at timestamptz NULL DEFAULT now()
  - updated_at timestamptz NULL DEFAULT now()

- App mapping (see `lib/supabase.ts`):
  - Name mapping: `nom`/`prenom` → `first_name`/`last_name`
  - Gender mapping: 'Homme' → 'men', 'Femme' → 'women'
  - Latest data accessed via `tenup_latest` view

---

### public.players
- Purpose: user-scoped list of licences the user follows. No duplication of rankings; joins are via views.
- RLS: enabled (owner-only policies)
- Constraints/Indexes:
  - PRIMARY KEY (id)
  - UNIQUE (user_id, licence)
  - Foreign key: `user_id` → `auth.users(id)` ON DELETE CASCADE
  - Index: `players_licence_idx` on `(licence)`
- Columns (name, type, nullability, default):
  - id uuid NOT NULL DEFAULT `gen_random_uuid()`
  - user_id uuid NOT NULL REFERENCES `auth.users(id)`
  - licence text NOT NULL
  - created_at timestamptz NOT NULL DEFAULT now()
  - display_name text NULL              (optional user fallback)
  - gender text NULL                    (optional user fallback; 'Homme' | 'Femme')
  - club text NULL                      (optional user fallback)
  - birth_year integer NULL             (optional user fallback)
  - local_ranking integer NULL          (optional user fallback)
- RLS policies (all restricted to `auth.uid()`):
  - Select: user can read only their rows
  - Insert: user can insert rows for themselves
  - Update: user can update only their rows
  - Delete: user can delete only their rows

Example: add/remove current user licence
```sql
-- Add
insert into public.players (user_id, licence) values (auth.uid(), '1234567');

-- Remove
delete from public.players where user_id = auth.uid() and licence = '1234567';
```

---

### public.tenup_latest (view)
- Purpose: latest TenUp ranking data per player (idcrm)
- Definition: Latest ranking row per `idcrm` from `public.tenup`
- RLS: disabled (inherits from base table)
- Columns: Same as `public.tenup` plus additional computed fields
- Usage: Primary data source for player rankings in the application

---

### public.tournaments
- Purpose: owner-scoped tournaments. Only the creating user can read/update/delete.
- RLS: enabled (owner-only policies via `owner_id = auth.uid()`).
- Primary/unique constraints:
  - PRIMARY KEY (id)
  - UNIQUE (public_id)
- Columns (name, type, nullability, default):
  - id uuid not null default gen_random_uuid()
  - owner_id uuid not null default auth.uid() references `auth.users(id)` on delete cascade
  - name text not null
  - date date not null
  - location text not null
  - organizer_id text null
  - public_id text not null unique
  - teams_locked boolean not null default false
  - format_id text null
  - level enum('P25','P100','P250','P500','P1000','P1500','P2000') not null
  - start_time time not null
  - number_of_courts integer not null check (number_of_courts >= 1)
  - number_of_teams integer not null check (number_of_teams >= 1)
  - conditions enum('inside','outside','both') not null
  - type enum('All','Men','Women','Mixed') not null
  - bracket jsonb null
  - format_json jsonb null
  - random_assignments jsonb null

  - created_at timestamptz not null default now()
  - updated_at timestamptz not null default now()

- RLS policies (all restricted to `auth.uid()`):
  - Select/Insert/Update/Delete restricted to rows where `owner_id = auth.uid()`

---

### public.tournament_players
- Purpose: snapshot of players per tournament. This decouples tournament rosters from global player changes.
- RLS: enabled (owner-only via `owner_id`).
- Primary/unique constraints:
  - PRIMARY KEY (id)
  - UNIQUE (tournament_id, license_number)
- Columns:
  - id uuid not null default gen_random_uuid()
  - tournament_id uuid not null references `public.tournaments(id)` on delete cascade
  - owner_id uuid not null default auth.uid() references `auth.users(id)` on delete cascade
  - license_number text not null
  - first_name text not null
  - last_name text not null
  - ranking integer not null
  - club text null
  - gender text not null -- 'Mr' | 'Mme'
  - birth_year integer null
  - created_at timestamptz not null default now()
  - updated_at timestamptz not null default now()

- RLS policies (owner-only): Select/Insert/Update/Delete where `owner_id = auth.uid()`

---

### public.tournament_teams
- Purpose: teams scoped to a tournament (no global teams). Each team is linked to players via `team_players`.
- RLS: enabled (owner-only via `owner_id`).
- Primary/unique constraints:
  - PRIMARY KEY (id)
- Columns:
  - id uuid not null default gen_random_uuid()
  - tournament_id uuid not null references `public.tournaments(id)` on delete cascade
  - owner_id uuid not null default auth.uid() references `auth.users(id)` on delete cascade
  - name text not null
  - weight integer not null
  - seed_number integer null
  - is_wo boolean not null default false
  - created_at timestamptz not null default now()
  - updated_at timestamptz not null default now()

- RLS policies (owner-only): Select/Insert/Update/Delete where `owner_id = auth.uid()`

---

### public.team_players
- Purpose: join table linking each team to two `tournament_players` (enforces composition, not identity).
- RLS: enabled; access is allowed if the team belongs to the current user.
- Primary/unique constraints:
  - PRIMARY KEY (id)
  - UNIQUE (team_id, player_id)
- Columns:
  - id uuid not null default gen_random_uuid()
  - team_id uuid not null references `public.tournament_teams(id)` on delete cascade
  - player_id uuid not null references `public.tournament_players(id)` on delete cascade
  - created_at timestamptz not null default now()

- RLS policies:
  - Select/Delete allowed if the associated team has `owner_id = auth.uid()`
  - Insert allowed only if team and player belong to same tournament and both have `owner_id = auth.uid()`

---

### public.tournament_matches
- Purpose: stores all match data for tournaments including brackets, scores, winners, and team assignments.
- RLS: enabled (owner-only via `owner_id`).
- Primary/unique constraints:
  - PRIMARY KEY (id)
  - UNIQUE (tournament_id, json_match_id)
- Columns:
  - id uuid not null default gen_random_uuid()
  - tournament_id uuid not null references `public.tournaments(id)` on delete cascade
  - owner_id uuid not null default auth.uid() references `auth.users(id)` on delete cascade
  - json_match_id integer not null -- corresponds to match ID in format template
  - round text not null -- e.g., "1/4 de finale", "1/2 finale", "Finale"
  - team_1_id uuid null references `public.tournament_teams(id)` -- resolved team ID
  - team_2_id uuid null references `public.tournament_teams(id)` -- resolved team ID
  - winner_team_id uuid null references `public.tournament_teams(id)` -- winner after match completion
  - score text null -- e.g., "21-19"
  - order_index integer not null -- display order in bracket
  - terrain_number integer null -- court assignment
  - match_type text not null -- 'main' | 'classification'
  - bracket_type text not null -- 'main' | 'ranking'
  - rotation_group text null -- e.g., "Rotation 1", "Rotation 2"
  - stage text not null -- e.g., "1/4 de finale", "Classement 5-8"
  - bracket_location text not null -- location in bracket structure
  - ranking_game boolean not null default false -- true for classification matches
  - ranking_label text null -- e.g., "Classement 5-6"
  - team1_source text null -- source reference (e.g., "2", "W_1", "L_3", "random_5_8_1")
  - team2_source text null -- source reference (e.g., "8", "W_2", "L_4", "random_3_4_2")
  - created_at timestamptz not null default now()
  - updated_at timestamptz not null default now()

- Indexes:
  - PRIMARY KEY (id)
  - UNIQUE (tournament_id, json_match_id)
  - INDEX on (tournament_id) for efficient tournament queries
  - INDEX on (owner_id) for RLS enforcement

- RLS policies (owner-only): Select/Insert/Update/Delete where `owner_id = auth.uid()`

- Source resolution patterns:
  - Seeded teams: "1", "2", "3", "4" (direct team numbers)
  - Winner references: "W_1", "W_2" (winner of match 1, 2)
  - Loser references: "L_1", "L_2" (loser of match 1, 2)
  - Random assignments: "random_5_8_1", "random_3_4_2" (indexed random keys)

---

### public.user_player_links
- Purpose: allows users to link their account to a specific player in the rankings database for personalized experience
- RLS: enabled (owner-only policies)
- Primary/unique constraints:
  - PRIMARY KEY (id) - `user_player_links_pkey`
  - UNIQUE (user_id) - `user_player_links_user_id_key` (one link per user)
  - FOREIGN KEY (user_id) → `auth.users(id)` - `user_player_links_user_id_fkey`
- Columns (name, type, nullability, default):
  - id uuid NOT NULL DEFAULT gen_random_uuid()
  - user_id uuid NOT NULL REFERENCES `auth.users(id)` ON DELETE CASCADE
  - licence text NOT NULL -- player licence number from rankings
  - created_at timestamptz NOT NULL DEFAULT now()
  - updated_at timestamptz NOT NULL DEFAULT now()
- RLS policies (all restricted to `auth.uid()`):
  - "Users can view their own player link": SELECT where `auth.uid() = user_id`
  - "Users can insert their own player link": INSERT (no restriction, user_id auto-filled)
  - "Users can update their own player link": UPDATE where `auth.uid() = user_id`
  - "Users can delete their own player link": DELETE where `auth.uid() = user_id`
- Usage: Users can link to players via the Settings page to see personalized ranking information

---

### public.padel_analyses
- Purpose: stores padel game analyses created by users for detailed match tracking
- RLS: enabled (owner-only policies)
- Primary/unique constraints:
  - PRIMARY KEY (id)
  - Foreign key: `user_id` → `auth.users(id)` ON DELETE CASCADE
- Columns (name, type, nullability, default):
  - id uuid NOT NULL DEFAULT gen_random_uuid()
  - user_id uuid NULL REFERENCES `auth.users(id)` ON DELETE CASCADE
  - analysis_name text NOT NULL
  - player_right text NOT NULL
  - player_left text NOT NULL
  - opponent_right text NULL DEFAULT 'Adversaire 1'::text
  - opponent_left text NULL DEFAULT 'Adversaire 2'::text
  - status text NULL DEFAULT 'in_progress'::text
  - created_at timestamptz NULL DEFAULT now()
  - updated_at timestamptz NULL DEFAULT now()

- RLS policies (all restricted to `auth.uid()`):
  - "Users can view their own analyses": SELECT where `auth.uid() = user_id`
  - "Users can insert their own analyses": INSERT with `user_id = auth.uid()`
  - "Users can update their own analyses": UPDATE where `auth.uid() = user_id`
  - "Users can delete their own analyses": DELETE where `auth.uid() = user_id`

---

### public.match_points
- Purpose: individual points within padel game analyses for detailed match tracking
- RLS: enabled (owner-only via analysis ownership)
- Primary/unique constraints:
  - PRIMARY KEY (id)
  - Foreign key: `analysis_id` → `public.padel_analyses(id)` ON DELETE CASCADE
  - Foreign key: `action_id` → `public.point_actions(id)`
- Columns (name, type, nullability, default):
  - id uuid NOT NULL DEFAULT gen_random_uuid()
  - analysis_id uuid NULL REFERENCES `public.padel_analyses(id)` ON DELETE CASCADE
  - action_id integer NULL REFERENCES `public.point_actions(id)`
  - player_position text NULL -- 'right' | 'left' position
  - timestamp timestamptz NULL DEFAULT now()
  - created_at timestamptz NULL DEFAULT now()

- RLS policies (owner-only via analysis):
  - "Users can view points from their analyses": SELECT where analysis belongs to user
  - "Users can insert points to their analyses": INSERT where analysis belongs to user
  - "Users can update points from their analyses": UPDATE where analysis belongs to user
  - "Users can delete points from their analyses": DELETE where analysis belongs to user

---

### public.point_actions
- Purpose: configuration table for point action definitions used in game analysis
- RLS: disabled (system configuration data)
- Primary/unique constraints:
  - PRIMARY KEY (id)
- Columns (name, type, nullability, default):
  - id integer NOT NULL
  - category_1 text NOT NULL
  - id_1 integer NOT NULL
  - category_2 text NOT NULL
  - id_2 integer NOT NULL
  - category_3 text NULL
  - id_3 integer NULL
  - category_4 text NULL
  - id_4 integer NULL
  - requires_player boolean NULL DEFAULT true
  - created_at timestamptz NULL DEFAULT now()

- Usage: Referenced by `match_points.action_id` for point categorization
- Configuration: Managed via `lib/config/point-actions.ts`

---

### Notes
- `auth.users` is system-managed. Use Supabase Auth APIs for mutations; do not write tokens/confirmation columns directly.
- Tables `rankings` and `rankings_latest` have been replaced by `tenup` and `tenup_latest` for TenUp integration.
- Game analysis system provides detailed match tracking with point-by-point analysis capabilities.

---

## User Role Management

### Role System Overview
The application uses a role-based access control (RBAC) system with three user roles:

- **Player** (`player`): Default role for regular users
  - Access to tournaments, players, and basic features
  - Can create and manage their own tournaments
  
- **Club Manager** (`club`): Enhanced role for club administrators
  - All player permissions
  - Additional club management features
  - Access to club-specific analytics
  
- **Admin** (`admin`): System administrator with full access
  - All club manager permissions
  - Access to system administration tools
  - Tournament format management
  - User role management
  - System settings and maintenance

### Setting User Roles
User roles are stored in the `auth.users.raw_user_meta_data.role` field. To change a user's role:

```sql
-- Make a user an admin
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb), 
  '{role}', 
  '"admin"'
)
WHERE id = 'user-uuid-here';

-- Make a user a club manager
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb), 
  '{role}', 
  '"club"'
)
WHERE id = 'user-uuid-here';

-- Make a user a regular player
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb), 
  '{role}', 
  '"player"'
)
WHERE id = 'user-uuid-here';
```

### Role Persistence
The system includes safeguards to prevent role loss during user metadata updates:
- Roles are preserved when updating display names or other metadata
- Role confirmation prevents overwriting during auth state changes
- Race condition protection ensures stable role assignment

---

## Tournament Formats Migration

### Migration Process
The system includes a migration tool to import tournament formats from JSON files to the database:

1. **Access Migration Tool**: Navigate to `/dashboard/migrate-formats` (admin only)
2. **Check Existing Formats**: Verify what's already in the database
3. **Run Migration**: Import formats from JSON files
4. **Verify Import**: Confirm all formats were imported successfully

### Supported Format Types
- **8 Teams - Flat Bracket**: Standard 8-team tournament format
- **8 Teams - No Random**: 8-team format without random assignments
- **8 Teams - Test**: Test format for development
- **16 Teams**: Standard 16-team elimination format
- **16 Teams - Random**: 16-team format with random assignments

### Adding New Formats
New tournament formats can be added by:

1. **Direct Database Insert**: Insert JSON directly into `tournament_formats` table
2. **Admin Interface**: Use the migration tool to import new JSON files
3. **Migration Scripts**: Create SQL migration files for bulk imports

### Format Structure
Each format includes:
- Basic metadata (name, description, player count)
- Feature list for UI display
- Complete JSON bracket structure
- Default flag for system defaults

---

## Database Maintenance

### Regular Tasks
- Monitor user role assignments
- Verify tournament format integrity
- Check RLS policy effectiveness
- Review authentication logs

### Backup Recommendations
- Regular backups of `tournament_formats` table
- User metadata backup for role preservation
- Tournament data backup for production systems

### Performance Considerations
- GIN index on `format_json` for fast JSON queries
- Unique constraint on format names prevents duplicates
- RLS policies ensure data security without performance impact


