// Re-export everything from the API modules for backward compatibility

// Client utilities
export { supabase, isConfigured, sanitizeForLike, isValidEmail } from './api';

// Type exports
export type {
  // National players
  SupabaseNationalPlayer,
  // Players
  SupabasePlayerRow,
  SupabasePlayersEnrichedRow,
  // Player statistics
  PlayerStatistics,
  // Tournaments
  SupabaseTournamentRow,
  AppTournament,
  // Tournament players
  SupabaseTournamentPlayerRow,
  UITournamentPlayer,
  // Tournament teams
  SupabaseTournamentTeamRow,
  SupabaseTeamPlayerRow,
  UITeam,
  UITeamWithPlayers,
  // Tournament matches
  SupabaseTournamentMatchRow,
  // Tournament formats
  SupabaseTournamentFormat,
  // Tournament registrations
  TournamentRegistrationRow,
  AppTournamentRegistration,
  // User profile
  UserPlayerLink,
  UserPlayerLinkWithRanking,
  // Clubs
  SupabaseClubRow,
  SupabaseClubCourtRow,
  AppClub,
  AppClubCourt,
  ClubManagerRow,
  ClubJugeArbitreRow,
  // Partners
  PartnerRow,
  AppPartner,
} from './api';

// Value exports
export {
  // National players
  nationalPlayersAPI,
  mapTenupRowToNationalPlayer,
  mapRankingRowToNationalPlayer,
  // Players
  playersAPI,
  // Player statistics
  playerStatisticsAPI,
  // Tournaments
  mapTournamentRow,
  tournamentsAPI,
  // Tournament players
  mapTournamentPlayerRow,
  tournamentPlayersAPI,
  // Tournament teams
  mapTournamentTeamRow,
  tournamentTeamsAPI,
  // Tournament matches
  tournamentMatchesAPI,
  // Tournament formats
  tournamentFormatsAPI,
  // Tournament registrations
  tournamentRegistrationsAPI,
  // User profile
  userPlayerLinkAPI,
  userProfileAPI,
  // Clubs
  mapClubRow,
  mapClubCourtRow,
  clubsAPI,
  clubCourtsAPI,
  clubManagersAPI,
  clubJugeArbitresAPI,
  // Partners
  mapPartnerRow,
  partnersAPI,
} from './api';
