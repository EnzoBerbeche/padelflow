### Supabase schema

#### Overview
- Only two tables are used:
  - `auth.users` (managed by Supabase Auth; RLS enabled)
  - `public.rankings` (rankings snapshots; RLS disabled)

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

### Notes
- `auth.users` is system-managed. Use Supabase Auth APIs for mutations; do not write tokens/confirmation columns directly.
- No `public.profiles` table exists; any code referencing it should be treated as unused until created.


