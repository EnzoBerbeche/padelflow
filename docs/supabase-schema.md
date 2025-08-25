### Supabase schema

#### Overview
- Core auth and rankings:
  - `auth.users` (managed by Supabase Auth; RLS enabled)
  - `public.rankings` (rankings snapshots; RLS disabled)
- User-scoped list and read models:
  - `public.players` (user-owned licences; RLS enabled)
  - `public.rankings_latest` (view: latest ranking per licence)
- Tournament system:
  - `public.tournaments` (tournament metadata; RLS enabled)
  - `public.tournament_players` (player snapshots per tournament; RLS enabled)
  - `public.tournament_teams` (teams per tournament; RLS enabled)
  - `public.team_players` (team composition; RLS enabled)
  - `public.tournament_matches` (match data and results; RLS enabled)
  - `public.tournament_formats` (tournament format definitions; RLS enabled)

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

### public.rankings
- Purpose: periodic player ranking snapshots; the app typically keeps only the latest row per `licence` (by year/month).
- RLS: disabled
- Primary/unique constraints:
  - PRIMARY KEY (id_unique)
  - UNIQUE (licence, ranking_year, ranking_month, genre)
- Indexes:
  - rankings_pkey (PRIMARY KEY on id_unique)
  - rankings_unique_per_month (UNIQUE on (licence, ranking_year, ranking_month, genre))

- Columns (name, type, nullability):
  - id_unique text NOT NULL
  - licence text NOT NULL
  - nom text NULL
  - genre text NOT NULL                -- 'Homme' | 'Femme'
  - rang integer NULL
  - evolution integer NULL
  - meilleur_classement integer NULL
  - nationalite text NULL
  - annee_naissance integer NULL
  - points integer NULL
  - nb_tournois integer NULL
  - ligue text NULL
  - club text NULL
  - ranking_year integer NOT NULL
  - ranking_month integer NOT NULL

- App mapping (see `lib/supabase.ts`):
  - Name parsing: `nom` → `first_name`/`last_name` by splitting tokens.
  - Gender mapping: 'Homme' → 'men', 'Femme' → 'women'.
  - Latest row per licence selected by max `(ranking_year, ranking_month)`.

- Example: latest row per licence for a month range
```sql
with ranked as (
  select *,
         row_number() over (partition by licence order by ranking_year desc, ranking_month desc) as rn
  from public.rankings
)
select *
from ranked
where rn = 1;
```

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

### public.rankings_latest (view)
- Purpose: latest ranking row per `licence` from `public.rankings`.
- Definition (conceptual):
```sql
create or replace view public.rankings_latest as
select distinct on (licence) r.*
from public.rankings r
order by r.licence, r.ranking_year desc, r.ranking_month desc;
```
- Grants: allow `SELECT` to `anon, authenticated`.

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

### Notes
- `auth.users` is system-managed. Use Supabase Auth APIs for mutations; do not write tokens/confirmation columns directly.
- No `public.profiles` table exists; any code referencing it should be treated as unused until created.

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


