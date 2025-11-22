# NeyoPadel - Code Improvement Diagnostic

Generated: 2025-11-21

**Total Findings: 58**
- Critical: 16
- High: 25
- Medium: 17

---

## IMMEDIATE ACTION REQUIRED

### 1. REVOKE EXPOSED API KEY (CRITICAL)
**File:** `app/api/send-email/route.ts` line 5

Hardcoded Resend API key is publicly exposed in source code and git history.

**Action:**
1. Immediately revoke this key in Resend dashboard
2. Create new key and add to `.env.local`:
   ```
   RESEND_API_KEY=re_your_new_key
   ```
3. Update code to use environment variable:
   ```typescript
   const resend = new Resend(process.env.RESEND_API_KEY)
   ```

---

## PERFORMANCE ISSUES

### Critical

- [ ] **P1. N+1 Query in `playersAPI.getMyPlayersEnriched()`**
  - File: `lib/supabase.ts` lines 277-324
  - Issue: Fetches user's licenses in one query, then fetches tenup_latest data in separate query
  - Fix: Combine queries using a single JOIN or database view

- [ ] **P2. N+1 in `playerStatisticsAPI.getPlayerStatistics()`**
  - File: `lib/supabase.ts` lines 528-544
  - Issue: Additional SELECT COUNT query for league position after ranking data
  - Fix: Use window functions: `RANK() OVER (PARTITION BY ligue ORDER BY classement)`

- [ ] **P3. Massive Component - Player Details Page**
  - File: `app/dashboard/players/[licence]/page.tsx` (1,258 lines)
  - Issue: Single component with multiple chart rendering functions causes excessive re-renders
  - Fix: Split into RankingChart, PointsChart, TournamentsChart, ComparisonSection with React.memo

- [ ] **P4. Monolithic Club Page Component**
  - File: `app/dashboard/club/page.tsx` (1,158 lines)
  - Issue: Managing clubs, courts, juge arbitres in one component
  - Fix: Extract ClubsList, CourtManagement, JugeArbitreValidation into separate components

### High

- [ ] **P5. No Pagination in `tournamentsAPI.listAll()`**
  - File: `lib/supabase.ts` lines 894-923
  - Issue: Fetches ALL tournaments at once
  - Fix: Implement `.range(offset, offset + limit)` with separate count query

- [ ] **P6. Sequential Queries in Team Loading**
  - File: `lib/supabase.ts` lines 1287-1333
  - Issue: `tournamentTeamsAPI.listWithPlayers()` executes 3+ queries sequentially
  - Fix: Use Promise.all() or Supabase joins

- [ ] **P7. Unoptimized useEffect in Tournament Creation**
  - File: `app/dashboard/tournaments/new/page.tsx` lines 40-73
  - Issue: `fetchClubs()` not wrapped in useCallback
  - Fix: `const fetchClubs = useCallback(async () => {...}, [deps])`

- [ ] **P8. Players Fetch Not Memoized**
  - File: `components/tournament-teams.tsx` lines 46-90
  - Issue: Re-fetches on every component mount
  - Fix: Add useMemo for mapped players, cache previous userId

- [ ] **P9. Circular Dependency Risk in useUserRole**
  - File: `hooks/use-user-role.ts`
  - Issue: Hook sets state that affects its own dependencies
  - Fix: Refactor with useReducer or remove from dependency array

- [ ] **P10. Inefficient Tournament Query Fallback**
  - File: `lib/supabase.ts` lines 2457-2507
  - Issue: Makes RPC call, then falls back to direct query
  - Fix: Consolidate to single query method

### Medium

- [ ] **P11. Client-Side Filtering After DB Query**
  - File: `lib/supabase.ts` lines 113-178
  - Issue: `nationalPlayersAPI.search()` filters on client side
  - Fix: Move all filtering to database side

- [ ] **P12. Multiple Async Operations Without Aggregation**
  - File: `app/dashboard/club/page.tsx` lines 72-126
  - Issue: 3 API calls not parallelized
  - Fix: Use `Promise.all([fetch1, fetch2, fetch3])`

- [ ] **P13. Debug Logging in Production**
  - File: `app/dashboard/tournaments/new/page.tsx` lines 40-42
  - Fix: Remove console.log or wrap in `if (process.env.NODE_ENV === 'development')`

- [ ] **P14. Excessive Debug Logging in useUserRole**
  - File: `hooks/use-user-role.ts` lines 18-87
  - Issue: 12+ console.log statements
  - Fix: Remove all or use conditional logging

- [ ] **P15. ESLint Disabled During Build**
  - File: `next.config.js` lines 22-24
  - Fix: Remove `ignoreDuringBuilds: true`

- [ ] **P16. Images Not Optimized**
  - File: `next.config.js` line 25
  - Issue: `unoptimized: true` disables Next.js optimization
  - Fix: Remove flag, use `<Image>` with proper dimensions

---

## CODE CLARITY & MAINTAINABILITY

### Critical

- [ ] **C1. Monolithic API Layer**
  - File: `lib/supabase.ts` (3,002 lines)
  - Issue: 17+ API objects in single file
  - Fix: Split into `/lib/api/players.ts`, `/lib/api/tournaments.ts`, etc.

- [ ] **C2. Excessive `as any` Casts**
  - File: `lib/supabase.ts` (26+ occurrences)
  - Issue: Defeats TypeScript safety
  - Fix: Use proper generics and type definitions

- [ ] **C3. Multiple `@ts-ignore` Directives**
  - File: `app/dashboard/players/[licence]/page.tsx` (24 instances)
  - Issue: Suppressed TypeScript errors in Recharts
  - Fix: Update types or use proper component typing

### High

- [ ] **C4. Duplicate Mapping Functions**
  - File: `lib/supabase.ts` lines 597-695
  - Issue: `mapRankingRowToNationalPlayer()` and `mapTenupRowToNationalPlayer()` nearly identical
  - Fix: Consolidate into single function

- [ ] **C5. Inconsistent Error Handling**
  - File: `lib/supabase.ts` (throughout)
  - Issue: Mix of console.error, returning null, empty arrays
  - Fix: Create `handleError(error, fallback)` utility

- [ ] **C6. Magic String Assignments**
  - File: `lib/supabase.ts` line 1084
  - Fix: Directly assign values in payload

- [ ] **C7. Too Many State Variables**
  - File: `app/dashboard/club/page.tsx` lines 29-49
  - Issue: 17 useState hooks in single component
  - Fix: Group related state or extract to custom hook

- [ ] **C8. Tournament Teams Component Too Large**
  - File: `components/tournament-teams.tsx` (874 lines)
  - Fix: Extract PlayerSelection, TeamsList, SortingControls

### Medium

- [ ] **C9. Unsafe Type Assertion in useCurrentUser**
  - File: `hooks/use-current-user.ts` line 33
  - Fix: Create proper `UserMetadata` interface

- [ ] **C10. Unclear RLS Policy Comments**
  - File: `lib/supabase.ts` lines 919, 964
  - Fix: Document WHY RLS is needed

- [ ] **C11. Cryptic Array Flattening Logic**
  - File: `lib/supabase.ts` lines 2069-2074
  - Fix: Add explanatory comment

- [ ] **C12. Silent Merge of Partial Data**
  - File: `lib/supabase.ts` lines 312-321
  - Fix: Add validation warning for missing ranking data

---

## SECURITY ISSUES

### Critical

- [ ] **S1. EXPOSED API KEY** (See Immediate Action Above)
  - File: `app/api/send-email/route.ts` line 5

- [ ] **S2. SQL Injection Risk**
  - File: `lib/supabase.ts` lines 127-128
  - Issue: User input in `.ilike.*${t}*`
  - Fix: Sanitize: `const sanitized = t.replace(/[%_\\]/g, '\\$&')`

- [ ] **S3. Insufficient Input Validation**
  - File: `lib/supabase.ts` line 2150
  - Issue: Only `email.toLowerCase()` validation before INSERT
  - Fix: Add regex validation: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

- [ ] **S4. No Rate Limiting on Admin Users Endpoint**
  - File: `app/api/admin/users/route.ts` line 22
  - Fix: Max 10 requests/minute/IP, pagination max 50

- [ ] **S5. Missing Authorization Check**
  - File: `app/api/admin/users/[userId]/route.ts` lines 4-70
  - Issue: PATCH never verifies caller is admin
  - Fix: Add auth check before processing request

- [ ] **S6. Inconsistent RLS Policy Enforcement**
  - File: `lib/supabase.ts` lines 2456-2507
  - Issue: RPC and direct query may have different policies
  - Fix: Standardize on single method, document policies

### High

- [ ] **S7. Missing RLS Policy Documentation**
  - File: `lib/supabase.ts` (throughout)
  - Fix: Add inline comments like `// RLS Policy: user.id = owner_id`

- [ ] **S8. No Input Length Validation**
  - File: `app/api/google-places/autocomplete/route.ts` lines 3-14
  - Fix: `if (input.length > 256) return error`

- [ ] **S9. API Key in URL Parameters**
  - File: `app/api/google-places/geocode/route.ts`
  - Issue: Google API key in URL can be logged
  - Fix: Use POST with JSON body

- [ ] **S10. Client-Side Role Not Verified**
  - File: `components/protected-route.tsx` lines 24-50
  - Fix: Document that RLS must still be configured

- [ ] **S11. Untrusted Client-Side Role**
  - File: `hooks/use-user-role.ts` lines 26, 60
  - Issue: Role from user.user_metadata can be modified
  - Fix: Verify role on every API call via RLS

### Medium

- [ ] **S12. No Rate Limiting on Player Addition**
  - File: `lib/supabase.ts` lines 345-368
  - Fix: Max 5 additions per minute per user

- [ ] **S13. Registration Creation Not Validated**
  - File: `lib/supabase.ts` lines 2574-2607
  - Fix: Verify license exists, validate email format

- [ ] **S14. Sensitive Data in Admin Response**
  - File: `app/api/admin/users/route.ts` lines 29-37
  - Fix: Remove `last_sign_in_at`, `email_confirmed_at`

---

## BEST PRACTICES

### Critical

- [ ] **B1. No Environment Variable Validation**
  - File: `lib/supabase.ts` line 16
  - Issue: Creates client with empty strings if env vars undefined
  - Fix: `if (!supabaseUrl) throw new Error('Missing Supabase env vars')`

- [ ] **B2. No Error Boundary Components**
  - Issue: Component crashes crash entire app
  - Fix: Create `/components/error-boundary.tsx` and wrap pages

- [ ] **B3. Nested Try-Catch Without Cleanup**
  - File: `app/dashboard/club/page.tsx` lines 82-100
  - Fix: Consolidate error handling, manage loading state

### High

- [ ] **B4. Form State Not Reset After Success**
  - File: `app/dashboard/tournaments/new/page.tsx` lines 75-86
  - Fix: Reset form data after successful creation

- [ ] **B5. Insufficient Error Details Returned**
  - File: `lib/supabase.ts` lines 814-819
  - Fix: Return `{ data: [], error: error.message }`

- [ ] **B6. Development Fallback Too Permissive**
  - File: `app/api/send-email/route.ts` lines 18-32
  - Fix: Validate email format even in dev mode

- [ ] **B7. Missing Loading States**
  - File: `components/dashboard-layout.tsx`
  - Fix: Add `isLoading` state to all async buttons

- [ ] **B8. Duplicated Error Handling Pattern**
  - File: `lib/supabase.ts` line 361-362
  - Fix: Create `handleUniqueConstraintError()` utility

### Medium

- [ ] **B9. No Comprehensive Logging Strategy**
  - Fix: Create `/lib/logger.ts` with unified interface

- [ ] **B10. Missing SEO Metadata**
  - File: `app/dashboard/page.tsx`
  - Fix: Add unique metadata per page

- [ ] **B11. PWA Cache Strategy May Cache Errors**
  - File: `next.config.js` lines 6-17
  - Fix: Only cache successful responses (200-399)

---

## Recommended Priority Order

### Week 1: Critical Security & Performance
1. S1 - Revoke exposed API key
2. S5 - Add admin authorization checks
3. S2-S4 - Input validation and rate limiting
4. P1-P2 - Fix N+1 queries
5. B1 - Environment variable validation

### Week 2: Code Organization
1. C1 - Split lib/supabase.ts into modules
2. C2-C3 - Remove `as any` and `@ts-ignore`
3. P3-P4 - Split large components
4. C4-C5 - Consolidate duplicated code

### Week 3: Error Handling & UX
1. B2 - Add error boundaries
2. B4-B7 - Loading states and form resets
3. C8 - Split tournament-teams component
4. P5-P6 - Pagination and parallel queries

### Week 4: Polish & Optimization
1. P13-P14 - Remove debug logging
2. P15-P16 - Enable ESLint and image optimization
3. S7-S11 - Documentation and validation
4. B9-B11 - Logging and SEO

---

## Notes

- Check each item when completed
- Run `npm run build` after each major change
- Run `npm run type-check` after TypeScript changes
- Test affected features after each fix
