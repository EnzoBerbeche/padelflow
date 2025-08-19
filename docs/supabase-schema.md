### Supabase schema

#### Overview
- Core auth and rankings:
  - `auth.users` (managed by Supabase Auth; RLS enabled)
  - `public.rankings` (rankings snapshots; RLS disabled)
- User-scoped list and read models:
  - `public.players` (user-owned licences; RLS enabled)
  - `public.rankings_latest` (view: latest ranking per licence)
  - `public.players_enriched` (view: `players` joined to `rankings_latest`)

---

### auth.users
- Purpose: canonical user store managed by Supabase Auth. Avoid direct writes except via Supabase Auth APIs.
- RLS: enabled (managed by Supabase)
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

### public.players_enriched (view)
- Purpose: denormalized read model for the app. Joins `public.players` with `public.rankings_latest` and coalesces to user-provided fields when a licence has no rankings row yet.
- Columns (selected):
  - player_id, user_id, licence, created_at
  - id_unique, nom, genre, rang, evolution, nationalite, annee_naissance, points, nb_tournois, ligue, club, ranking_year, ranking_month
- Definition (conceptual):
```sql
create view public.players_enriched as
select
  p.id as player_id,
  p.user_id,
  p.licence,
  p.created_at,
  rl.id_unique,
  coalesce(rl.nom, p.display_name)               as nom,
  coalesce(rl.genre, p.gender)                   as genre,
  coalesce(rl.rang, p.local_ranking)             as rang,
  rl.evolution,
  coalesce(rl.nationalite, null)                 as nationalite,
  coalesce(rl.annee_naissance, p.birth_year)     as annee_naissance,
  coalesce(rl.points, null)                      as points,
  coalesce(rl.nb_tournois, null)                 as nb_tournois,
  coalesce(rl.ligue, null)                       as ligue,
  coalesce(rl.club, p.club)                      as club,
  rl.ranking_year,
  rl.ranking_month
from public.players p
left join public.rankings_latest rl on rl.licence = p.licence;
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
  - registration_enabled boolean not null default false
  - registration_link_id text null
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

### Notes
- `auth.users` is system-managed. Use Supabase Auth APIs for mutations; do not write tokens/confirmation columns directly.
- No `public.profiles` table exists; any code referencing it should be treated as unused until created.


