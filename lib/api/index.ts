// Re-export client utilities
export { supabase, isConfigured, sanitizeForLike, isValidEmail } from './client';

// Re-export national players API
export type { SupabaseNationalPlayer } from './national-players';
export {
  nationalPlayersAPI,
  mapTenupRowToNationalPlayer,
  mapRankingRowToNationalPlayer,
} from './national-players';

// Re-export players API
export type { SupabasePlayerRow, SupabasePlayersEnrichedRow } from './players';
export { playersAPI } from './players';

// Re-export player statistics API
export type { PlayerStatistics } from './player-statistics';
export { playerStatisticsAPI } from './player-statistics';

// Re-export tournaments API
export type { SupabaseTournamentRow, AppTournament } from './tournaments';
export { mapTournamentRow, tournamentsAPI } from './tournaments';

// Re-export tournament players API
export type { SupabaseTournamentPlayerRow, UITournamentPlayer } from './tournament-players';
export { mapTournamentPlayerRow, tournamentPlayersAPI } from './tournament-players';

// Re-export tournament teams API
export type {
  SupabaseTournamentTeamRow,
  SupabaseTeamPlayerRow,
  UITeam,
  UITeamWithPlayers,
} from './tournament-teams';
export { mapTournamentTeamRow, tournamentTeamsAPI } from './tournament-teams';

// Re-export tournament matches API
export type { SupabaseTournamentMatchRow } from './tournament-matches';
export { tournamentMatchesAPI } from './tournament-matches';

// Re-export tournament formats API
export type { SupabaseTournamentFormat } from './tournament-formats';
export { tournamentFormatsAPI } from './tournament-formats';

// Re-export tournament registrations API
export type { TournamentRegistrationRow, AppTournamentRegistration } from './tournament-registrations';
export { tournamentRegistrationsAPI } from './tournament-registrations';

// Re-export user profile API
export type { UserPlayerLink, UserPlayerLinkWithRanking } from './user-profile';
export { userPlayerLinkAPI, userProfileAPI } from './user-profile';

// Re-export clubs API
export type {
  SupabaseClubRow,
  SupabaseClubCourtRow,
  AppClub,
  AppClubCourt,
  ClubManagerRow,
  ClubJugeArbitreRow,
} from './clubs';
export {
  mapClubRow,
  mapClubCourtRow,
  clubsAPI,
  clubCourtsAPI,
  clubManagersAPI,
  clubJugeArbitresAPI,
} from './clubs';

// Re-export partners API
export type { PartnerRow, AppPartner } from './partners';
export { mapPartnerRow, partnersAPI } from './partners';
