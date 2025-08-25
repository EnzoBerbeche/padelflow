# PadelFlow - Tournament Management Platform

A professional padel tournament organization and management platform built with Next.js, TypeScript, and Supabase backend.

## Features

- **User Authentication**: Secure sign-in/sign-up with Supabase Auth
- **Role-Based Access Control**: Player, Club Manager, and Admin roles
- **Tournament Management**: Create, edit, and manage tournaments with persistent data
- **Team Management**: Create teams from available players with automatic player snapshotting
- **Match Generation**: Automatic bracket generation from tournament formats
- **Real-time Scoring**: Enter scores and select winners with automatic propagation to dependent matches
- **Player Management**: Add, edit, and organize players with detailed information
- **Advanced Filtering**: Excel-style column filters and search functionality
- **Responsive Design**: Modern UI with Tailwind CSS
- **Admin Tools**: Tournament format management and system administration
- **Migration Tools**: Automated data migration from localStorage to Supabase

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd padelflow
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Setting up Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Get your project URL and API keys from the dashboard
4. Replace the placeholder values in `.env.local` with your actual keys
5. Run the SQL schema from `docs/supabase-schema.md` in your Supabase SQL editor

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── dashboard/         # Protected dashboard routes
│   │   ├── tournaments/   # Tournament management
│   │   ├── players/       # Player management
│   │   ├── admin/         # Admin dashboard (admin only)
│   │   ├── migrate-formats/ # Format migration tool (admin only)
│   │   └── settings/      # User settings
│   ├── sign-in/          # Authentication pages
│   ├── sign-up/          # Authentication pages
│   └── layout.tsx        # Root layout
├── components/            # Reusable components
│   ├── tournament-*.tsx  # Tournament-specific components
│   ├── dashboard-layout.tsx
│   ├── protected-route.tsx
│   └── ui/               # UI components
├── lib/                  # Utilities and API services
│   ├── supabase.ts       # Supabase client and API services
│   ├── migrate-formats.ts # Migration scripts
│   ├── storage.ts        # Legacy local storage (deprecated)
│   └── formats/          # Tournament format definitions
├── hooks/                # Custom React hooks
│   ├── use-current-user.ts # User authentication
│   ├── use-user-role.ts  # Role-based access control
│   └── use-toast.ts      # Toast notifications
├── docs/                 # Documentation
│   ├── supabase-schema.md # Database schema documentation
│   └── MIGRATION_GUIDE.md # Migration process documentation
└── .env.local           # Environment variables
```

## Architecture

### Backend (Supabase)
- **Authentication**: Supabase Auth with Row-Level Security (RLS)
- **Database**: PostgreSQL with real-time capabilities
- **Storage**: File storage for tournament assets
- **API**: Auto-generated REST and GraphQL APIs

### Frontend (Next.js)
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React hooks with Supabase real-time subscriptions

### Data Models

#### Core Tables
- **Tournaments**: Tournament metadata and configuration
- **Tournament Players**: Snapshot copies of players per tournament (prevents external changes)
- **Tournament Teams**: Teams composed of tournament players
- **Tournament Matches**: Match data, results, and bracket progression

#### User Management
- **Players**: User-scoped list of licenses the user follows (NOT global - each user has their own list)
- **Team Players**: Join table linking tournament teams to tournament players (enforces team composition)

#### Ranking System  
- **Rankings**: Global ranking snapshots from external source (feeds the ten'up page with national rankings)
- **Rankings Latest** (View): Latest ranking per license from the rankings table

## Features in Detail

### Tournament Management
- Create tournaments with detailed information (date, location, level, format)
- Manage tournament formats and automatic bracket generation
- Track tournament progress with real-time updates
- Public tournament pages

### Team Management
- Create teams from available players
- Automatic player snapshotting to prevent external changes
- Team seeding and locking mechanisms
- Support for various tournament formats (elimination, round-robin)

### Match System
- Automatic match generation from tournament formats
- Real-time score entry and winner selection
- Automatic propagation of results to dependent matches
- Court assignment and management
- Support for both main bracket and classification matches

### Player Management
- Add players with comprehensive information (name, license, ranking, club, etc.)
- Advanced filtering and search capabilities
- Visual gender indicators and ranking badges
- Integration with external ranking data

## Database Schema

The complete database schema is documented in `docs/supabase-schema.md`, including:
- Table structures and relationships
- Row-Level Security policies
- Indexes and constraints
- Data flow patterns

### Complete Table/View List

| Name | Type | Purpose |
|------|------|---------|
| `auth.users` | Table | Supabase Auth user accounts |
| `public.rankings` | Table | Global ranking snapshots (external source) |
| `public.players` | Table | User-scoped list of licenses to follow |
| `public.rankings_latest` | View | Latest ranking per license |
| `public.tournaments` | Table | Tournament metadata and configuration |
| `public.tournament_players` | Table | Player snapshots per tournament |
| `public.tournament_teams` | Table | Teams per tournament |
| `public.team_players` | Table | Team composition (teams ↔ tournament players) |
| `public.tournament_matches` | Table | Match data, results, and bracket progression |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License. 