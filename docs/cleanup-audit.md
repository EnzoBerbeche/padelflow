# PadelFlow Cleanup Audit Report

## Executive Summary
This audit identifies candidates for removal, refactoring, and dependency cleanup in the PadelFlow Next.js/TypeScript application. The analysis focuses on unused code, test/debug artifacts, and potential optimizations while maintaining functionality.

## Candidates for Removal

### High Confidence (5/5) - Safe to Remove

| Path | Why Unused | References | Confidence | Notes |
|------|-------------|------------|------------|-------|
| `app/api/debug-email/route.ts` | Debug API endpoint with hardcoded API key | 0 | 5 | Contains exposed Resend API key, debug-only functionality |
| `app/api/debug-pending/route.ts` | Debug API endpoint for pending registrations | 0 | 5 | Debug-only functionality, not referenced in UI |
| `app/api/test-resend/route.ts` | Test API endpoint with hardcoded API key | 0 | 5 | Contains exposed Resend API key, test-only functionality |
| `app/test-csv/page.tsx` | Test page for CSV import functionality | 0 | 5 | Development/testing page, not part of production flow |
| `app/auth-test/page.tsx` | Authentication test/debug page | 0 | 5 | Debug page for Clerk integration testing |
| `env-debug.txt` | Debug file with exposed environment variables | 0 | 5 | Contains exposed Supabase credentials, debug artifact |

### Medium Confidence (4/5) - Likely Safe to Remove

| Path | Why Unused | References | Confidence | Notes |
|------|-------------|------------|------------|-------|
| `middleware.ts` | Currently does nothing (returns NextResponse.next()) | 0 | 4 | Placeholder for future auth integration |
| `lib/csv-parser.ts` | Only used in test-csv page | 1 | 4 | Remove with test-csv page if not needed elsewhere |

### Low Confidence (3/5) - Investigate Further

| Path | Why Unused | References | Confidence | Notes |
|------|-------------|------------|------------|-------|
| `lib/team-source-resolver.ts` | Unclear usage pattern | 0 | 3 | May be used in future features |
| `lib/json-bracket-generator.ts` | Unclear usage pattern | 0 | 3 | May be used in future features |

## Candidates for Refactor/Merge

| Path | Current State | Proposed Action | Confidence | Notes |
|------|---------------|-----------------|------------|-------|
| `lib/storage.ts` | 988 lines, large file | Split into smaller modules | 4 | Consider splitting by domain (tournaments, players, etc.) |
| `components/tournament-teams.tsx` | 860 lines, large component | Split into smaller components | 4 | Break down into logical sub-components |

## Unused Dependencies Analysis

### Dependencies to Investigate
- `@next/swc-wasm-nodejs` - May be unnecessary for production
- `embla-carousel-react` - Not found in current components
- `react-resizable-panels` - Not found in current components
- `react-tournament-bracket` - Not found in current components
- `recharts` - Not found in current components
- `vaul` - Not found in current components

### Dev Dependencies to Add
- `ts-prune` - For finding unused exports
- `depcheck` - For finding unused dependencies
- `@typescript-eslint/eslint-plugin` - For better TypeScript linting
- `@typescript-eslint/parser` - For TypeScript ESLint parsing

## Environment Variables Analysis

### Referenced in Code
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Used in ClerkProvider
- `CLERK_SECRET_KEY` - Used in Clerk backend
- `NEXT_PUBLIC_SUPABASE_URL` - Used in Supabase client
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Used in Supabase client

### Found in env-debug.txt (EXPOSED)
- `NEXT_PUBLIC_SUPABASE_URL` - ✅ Matches code usage
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - ✅ Matches code usage

### Missing/Unclear
- Resend API key configuration (currently hardcoded in debug routes)

## Risks and Mitigations

### High Risk
1. **Exposed API Keys**: Multiple debug routes contain hardcoded Resend API keys
   - Mitigation: Remove debug routes immediately, rotate exposed keys
2. **Exposed Supabase Credentials**: env-debug.txt contains production credentials
   - Mitigation: Remove file, ensure .env.local is properly configured

### Medium Risk
1. **Large Component Files**: May impact maintainability
   - Mitigation: Split gradually, test each change
2. **Unused Dependencies**: May increase bundle size
   - Mitigation: Remove one at a time, test thoroughly

### Low Risk
1. **Debug/Test Pages**: No production impact
   - Mitigation: Remove in cleanup phase

## Proposed Cleanup Plan

### Step 1: Remove Exposed Credentials (Critical)
- Remove `env-debug.txt`
- Remove debug API routes with hardcoded keys
- Verify .env.local configuration

### Step 2: Remove Test/Debug Artifacts
- Remove test-csv page
- Remove auth-test page
- Clean up unused test utilities

### Step 3: Dependency Cleanup
- Add ts-prune and depcheck
- Run analysis and remove unused dependencies
- Update package.json scripts

### Step 4: Code Refactoring
- Split large components and utilities
- Optimize imports and exports
- Clean up unused code paths

### Step 5: Final Verification
- Run full test suite
- Verify build process
- Test core user flows

## Next Steps
1. **Immediate**: Remove exposed credentials and debug artifacts
2. **Short-term**: Add analysis tools and run dependency checks
3. **Medium-term**: Execute refactoring plan in small batches
4. **Long-term**: Establish cleanup practices and monitoring

## Notes
- All changes should be tested locally before committing
- Each step should maintain build and runtime functionality
- Consider creating feature flags for any uncertain removals
- Document any intentional technical debt for future cleanup
