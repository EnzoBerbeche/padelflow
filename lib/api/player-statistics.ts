import { supabase } from './client';

// Player Statistics API
export interface PlayerStatistics {
  licence: string;
  nom: string | null;
  genre: 'Homme' | 'Femme';
  current_ranking: number | null;
  ranking_evolution: number | null;
  best_ranking: number | null;
  nationality: string | null;
  birth_year: number | null;
  current_points: number | null;
  current_tournaments_count: number | null;
  ligue: string | null;
  date_classement: string | null;
  ranking_month: number | null;
  ranking_year: number | null;
  ranking_history: {
    year: number;
    month: number;
    ranking: number | null;
    points: number | null;
    tournaments_count: number | null;
  }[];
  // New performance metrics
  average_progression: number | null;
  participation_rate: number | null;
  most_active_month: { year: number; month: number; tournaments: number } | null;
  league_position: number | null;
}

export const playerStatisticsAPI = {
  // Get detailed statistics for a specific player by licence
  getPlayerStatistics: async (licence: string): Promise<PlayerStatistics | null> => {
    // Get all ranking data for this player
    const { data, error } = await supabase
      .from('tenup')
      .select('*')
      .eq('idcrm', parseInt(licence))
      .order('date_classement', { ascending: false });

    if (error) {
      console.error('Error fetching player statistics:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Get the latest ranking (first row due to ordering)
    const latest = data[0];

    // Build ranking history
    const rankingHistory = data.map(row => ({
      year: new Date(row.date_classement).getFullYear(),
      month: new Date(row.date_classement).getMonth() + 1,
      ranking: row.classement,
      points: row.points,
      tournaments_count: row.nombre_tournois,
    }));

    // Calculate ranking evolution (current month vs previous month)
    let rankingEvolution = null;
    if (rankingHistory.length > 1) {
      const currentRanking = rankingHistory[0].ranking;
      const previousRanking = rankingHistory[1].ranking;
      if (currentRanking !== null && previousRanking !== null) {
        // In padel: higher number = worse ranking
        // So positive evolution = worse ranking, negative evolution = better ranking
        rankingEvolution = currentRanking - previousRanking;
      }
    }

    // Calculate new performance metrics
    const last12Months = rankingHistory.slice(0, 12);

    // Average progression (average variation in ranking over last 12 months)
    let averageProgression = null;
    if (last12Months.length > 1) {
      const progressions = [];
      for (let i = 1; i < last12Months.length; i++) {
        const current = last12Months[i - 1].ranking;
        const previous = last12Months[i].ranking;
        if (current !== null && previous !== null) {
          progressions.push(previous - current); // Positive = improvement
        }
      }
      if (progressions.length > 0) {
        averageProgression = progressions.reduce((sum, val) => sum + val, 0) / progressions.length;
      }
    }

    // Participation rate (% of months with at least 1 tournament)
    let participationRate = null;
    if (last12Months.length > 0) {
      const monthsWithTournaments = last12Months.filter(month =>
        month.tournaments_count !== null && month.tournaments_count > 0
      ).length;
      participationRate = (monthsWithTournaments / last12Months.length) * 100;
    }

    // Most active month (calculate monthly tournament difference)
    let mostActiveMonth = null;
    if (last12Months.length > 1) {
      let maxMonthlyTournaments = 0;
      let maxMonth = null;

      for (let i = 0; i < last12Months.length - 1; i++) {
        const current = last12Months[i].tournaments_count;
        const next = last12Months[i + 1].tournaments_count;

        if (current !== null && next !== null) {
          const monthlyTournaments = current - next;
          if (monthlyTournaments > maxMonthlyTournaments) {
            maxMonthlyTournaments = monthlyTournaments;
            maxMonth = {
              year: last12Months[i].year,
              month: last12Months[i].month,
              tournaments: monthlyTournaments
            };
          }
        }
      }

      if (maxMonth && maxMonthlyTournaments > 0) {
        mostActiveMonth = maxMonth;
      }
    }

    // Calculate league position
    let leaguePosition = null;
    if (latest.ligue && latest.classement) {
      try {
        // Count how many players in the same league have a better ranking (lower number)
        const { count, error: countError } = await supabase
          .from('tenup_latest')
          .select('*', { count: 'exact', head: true })
          .eq('ligue', latest.ligue)
          .lt('classement', latest.classement); // Better ranking = lower number

        if (!countError && count !== null) {
          leaguePosition = count + 1; // Position is count + 1 (1st place = 0 players better + 1)
        }
      } catch (err) {
        console.error('Error calculating league position:', err);
      }
    }

    return {
      licence: latest.idcrm.toString(),
      nom: latest.nom_complet || latest.nom,
      genre: latest.sexe === 'H' ? 'Homme' : 'Femme',
      current_ranking: latest.classement,
      ranking_evolution: rankingEvolution,
      best_ranking: latest.meilleur_classement,
      nationality: latest.nationalite,
      birth_year: latest.age_sportif,
      current_points: latest.points,
      current_tournaments_count: latest.nombre_tournois,
      ligue: latest.ligue,
      date_classement: latest.date_classement,
      ranking_month: latest.ranking_month,
      ranking_year: latest.ranking_year,
      ranking_history: rankingHistory,
      average_progression: averageProgression,
      participation_rate: participationRate,
      most_active_month: mostActiveMonth,
      league_position: leaguePosition,
    };
  },

  // Get all players with basic info (for search/listing)
  getAllPlayersBasic: async (): Promise<{
    licence: string;
    nom: string | null;
    genre: 'Homme' | 'Femme';
    current_ranking: number | null;
    ligue: string | null;
  }[]> => {
    const { data, error } = await supabase
      .from('tenup_latest')
      .select('idcrm, nom_complet, sexe, classement, ligue')
      .order('classement', { ascending: true });

    if (error) {
      console.error('Error fetching all players basic info:', error);
      return [];
    }

    return (data || []).map(row => ({
      licence: row.idcrm.toString(),
      nom: row.nom_complet,
      genre: row.sexe === 'H' ? 'Homme' : 'Femme',
      current_ranking: row.classement,
      ligue: row.ligue,
    }));
  },
};
