# Migration Guide: localStorage to Supabase

This guide documents the migration process from localStorage-based data storage to Supabase database storage.

## Overview

The migration process moves the following data from localStorage to Supabase:
- ✅ **Tournament Formats** - Completed
- 🔄 **Tournaments** - In Progress
- 🔄 **Players** - In Progress
- 🔄 **Teams** - In Progress
- 🔄 **Matches** - In Progress

## Completed Migrations

### 1. Tournament Formats ✅

**Status**: Complete
**Location**: `/dashboard/migrate-formats`
**Access**: Admin users only

**What was migrated:**
- 5 tournament format JSON files
- Format metadata (name, description, player count)
- Complete bracket structures
- Feature lists for UI display

**Migration process:**
1. Created `tournament_formats` table in Supabase
2. Built migration tool with admin interface
3. Imported all existing format JSON files
4. Updated components to use Supabase API

**Files updated:**
- `lib/supabase.ts` - Added tournamentFormatsAPI
- `components/tournament-formats.tsx` - Updated to use Supabase
- `app/dashboard/migrate-formats/page.tsx` - Migration interface
- `lib/migrate-formats.ts` - Migration scripts

## Pending Migrations

### 2. Tournaments 🔄

**Status**: Partially Complete
**Current**: Using Supabase API for CRUD operations
**Remaining**: Remove localStorage fallbacks

**What needs to be done:**
- Update all tournament-related components
- Remove localStorage dependencies
- Ensure data consistency

### 3. Players 🔄

**Status**: Partially Complete
**Current**: Using Supabase API for user-owned licenses
**Remaining**: Migrate legacy player data

**What needs to be done:**
- Migrate existing player data from localStorage
- Update player management components
- Ensure data integrity

### 4. Teams & Matches 🔄

**Status**: Partially Complete
**Current**: Using Supabase API for tournament teams/matches
**Remaining**: Remove localStorage dependencies

**What needs to be done:**
- Update team management components
- Update match management components
- Remove localStorage fallbacks

## Migration Tools

### Admin Migration Interface

**Location**: `/dashboard/migrate-formats`
**Access**: Admin users only
**Features**:
- Check existing data in database
- Import data from JSON files
- Clear all data (danger zone)
- Migration status tracking

### Migration Scripts

**Location**: `lib/migrate-formats.ts`
**Functions**:
- `migrateTournamentFormats()` - Import tournament formats
- `checkExistingFormats()` - Verify database state
- `clearAllFormats()` - Reset database (admin only)

## Data Structure Changes

### Before (localStorage)
```typescript
// Data stored in browser localStorage
const tournaments = localStorage.getItem('padelflow_tournaments');
const players = localStorage.getItem('padelflow_players');
const formats = localStorage.getItem('padelflow_tournament_formats');
```

### After (Supabase)
```typescript
// Data stored in Supabase database
const tournaments = await tournamentsAPI.listMy();
const players = await playersAPI.getMyPlayersEnriched();
const formats = await tournamentFormatsAPI.getAll();
```

## Component Updates Required

### Completed ✅
- `components/tournament-formats.tsx` - Uses Supabase API

### Pending 🔄
- `components/tournament-teams.tsx` - Remove localStorage
- `components/tournament-matches.tsx` - Remove localStorage
- `app/dashboard/tournaments/page.tsx` - Remove localStorage
- `app/dashboard/players/page.tsx` - Remove localStorage
- `app/dashboard/settings/page.tsx` - Update export/import

## Testing Migration

### Pre-Migration Checklist
- [ ] Backup localStorage data
- [ ] Verify Supabase connection
- [ ] Test admin access
- [ ] Verify migration tool access

### Post-Migration Checklist
- [ ] Verify data integrity
- [ ] Test all user flows
- [ ] Check performance
- [ ] Validate RLS policies

### Rollback Plan
If migration fails:
1. Restore localStorage data from backup
2. Revert component changes
3. Investigate and fix issues
4. Retry migration

## Performance Considerations

### Supabase Benefits
- **Real-time updates**: Live data synchronization
- **Scalability**: Handles large datasets efficiently
- **Security**: Row-level security policies
- **Backup**: Automatic database backups

### Migration Impact
- **Initial load**: Slightly slower due to network requests
- **Subsequent loads**: Faster due to caching
- **Real-time**: Immediate updates across all clients
- **Offline**: Graceful degradation with localStorage fallback

## Security Considerations

### RLS Policies
- **Tournament formats**: Read access for all, write for authenticated
- **Tournaments**: Owner-only access
- **Players**: User-scoped access
- **Teams/Matches**: Tournament-scoped access

### Admin Access
- **Role-based**: Admin users have full access
- **Audit trail**: All changes logged in Supabase
- **Data isolation**: Users can only access their own data

## Troubleshooting

### Common Issues

**Migration fails:**
- Check Supabase connection
- Verify admin role assignment
- Check console for errors
- Ensure table exists

**Data not appearing:**
- Check RLS policies
- Verify user authentication
- Check component API calls
- Review console logs

**Performance issues:**
- Check network requests
- Verify database indexes
- Monitor query performance
- Check caching implementation

### Debug Commands

```sql
-- Check user roles
SELECT id, email, raw_user_meta_data->>'role' as role 
FROM auth.users;

-- Check tournament formats
SELECT * FROM tournament_formats;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'tournament_formats';
```

## Future Enhancements

### Planned Features
- **Bulk import/export**: CSV and JSON support
- **Data validation**: Schema validation tools
- **Migration automation**: Scheduled migrations
- **Rollback tools**: Automated rollback procedures

### Monitoring
- **Migration logs**: Track all migration activities
- **Performance metrics**: Monitor database performance
- **Error tracking**: Log and alert on migration failures
- **Data integrity**: Regular validation checks

## Support

For migration issues:
1. Check this documentation
2. Review console logs
3. Verify Supabase configuration
4. Contact system administrator

---

**Last Updated**: [Current Date]
**Version**: 1.0
**Status**: In Progress
