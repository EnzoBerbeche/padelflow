# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NeyoPadel (formerly PadelFlow) is a full-stack padel tournament management application built with Next.js 15, React 18, TypeScript, and Supabase. It features tournament bracket generation, real-time score tracking, game analysis, club management, and national player rankings integration.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npm run lint:unused  # Find unused TypeScript code (ts-prune)
npm run deps:unused  # Find unused dependencies (depcheck)
```

## Architecture

### API Layer Pattern

All Supabase API calls are centralized in `lib/supabase.ts` (~2,400 lines). This file contains 17+ API objects organized by domain:

- `nationalPlayersAPI` - TenUp national rankings
- `playersAPI` - User-scoped player lists
- `tournamentsAPI` - Tournament CRUD operations
- `tournamentTeamsAPI` - Team management
- `tournamentMatchesAPI` - Match generation and scoring
- `clubsAPI` - Club management
- `tournamentRegistrationsAPI` - Public registration system

When adding new database operations, add methods to the appropriate API object in this file.

### Role-Based Access System

User roles are stored in `auth.users.raw_user_meta_data.role`:

- `player` (default) - Can view rankings and create tournaments
- `juge_arbitre` - Tournament organizer, can manage clubs and validate judges
- `club` - Club manager with access to specific clubs
- `admin` - Full system access

Use `useUserRole()` hook for role checks. Protected routes use `<ProtectedRoute>` component.

### Tournament Data Flow

```
National Rankings (TenUp) → User's Player List → Tournament Players (Snapshot) → Team Players
```

Player data is **snapshot at tournament registration** to prevent external changes from affecting active tournaments.

### Tournament Format System

Tournament formats are stored as JSON in the database (not hardcoded). The bracket structure defines match progression automatically. See `lib/formats/` for templates and `lib/json-bracket-generator.ts` for generation logic.

### State Management

- Local state with `useState` for component-level data
- Server state through Supabase queries in `useEffect` hooks
- Real-time updates via Supabase subscriptions
- Custom hooks in `hooks/` for shared logic (`useCurrentUserId`, `useSupabaseUser`, `useUserRole`)

### Database Security

Row-Level Security (RLS) is enabled on almost all tables. Public tables (`tenup`, `tenup_latest`) have RLS disabled. Always consider RLS policies when adding new tables or modifying queries.

## Key Directories

- `app/api/` - Next.js API routes (admin, auth, clubs, email)
- `app/dashboard/` - Protected routes requiring authentication
- `app/public/` - Public tournament pages (no auth required)
- `components/ui/` - shadcn/ui components
- `hooks/` - Custom React hooks
- `lib/` - Business logic, API clients, utilities
- `docs/` - Database schemas and documentation

## Tech Stack

- **Framework**: Next.js 15.3.4 (App Router)
- **UI**: Tailwind CSS + shadcn/ui (Radix primitives)
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Forms**: react-hook-form
- **Icons**: lucide-react
- **Email**: Resend
- **Location**: Google Places API

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_PLACES_API_KEY`
- `RESEND_API_KEY`

## Important Patterns

### Path Aliases

Use `@/*` for imports (maps to project root):
```typescript
import { Button } from "@/components/ui/button"
import { tournamentsAPI } from "@/lib/supabase"
```

### Client Components

Use `'use client'` directive for components with hooks or browser APIs. Server components are default in App Router.

### French UI

Dashboard UI is in French. Use `date-fns` with French locale for date formatting.

### PWA Support

The app is a Progressive Web App with offline caching configured in `next.config.js`.

## Database Schema Reference

See `docs/supabase-schema.md` for complete database schema and `docs/game-analyzer-schema.md` for game analysis tables.
