import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types pour les données Supabase
export interface PadelAnalysis {
  id: string;
  user_id: string;
  analysis_name: string;
  player_right: string;
  player_left: string;
  opponent_right: string;
  opponent_left: string;
  status: 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface PointAction {
  id: number;
  category_1: string;
  id_1: number;
  category_2: string;
  id_2: number;
  category_3: string | null;
  id_3: number | null;
  category_4: string | null;
  id_4: number | null;
  requires_player: boolean;
}

export interface MatchPoint {
  id: string;
  analysis_id: string;
  action_id: number;
  player_position: 'player1' | 'player2' | null;
  timestamp: string;
  created_at: string;
  point_actions: PointAction;
}

export interface AnalysisStats {
  total_points: number;
  points_gagnes: number;
  points_perdus: number;
  coups_gagnants: number;
  fautes_totales: number;
  ratio_cf: number | null;
}

class SupabaseAnalysisService {
  // =============================================
  // ANALYSES
  // =============================================

  async createAnalysis(data: {
    analysis_name: string;
    player_right: string;
    player_left: string;
    opponent_right?: string;
    opponent_left?: string;
  }): Promise<PadelAnalysis> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    const { data: analysis, error } = await supabase
      .from('padel_analyses')
      .insert({
        user_id: user.id,
        analysis_name: data.analysis_name,
        player_right: data.player_right,
        player_left: data.player_left,
        opponent_right: data.opponent_right || 'Adversaire 1',
        opponent_left: data.opponent_left || 'Adversaire 2',
        status: 'in_progress'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur lors de la création de l'analyse: ${error.message}`);
    }

    return analysis;
  }

  async getAnalyses(): Promise<PadelAnalysis[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    const { data: analyses, error } = await supabase
      .from('padel_analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erreur lors de la récupération des analyses: ${error.message}`);
    }

    return analyses || [];
  }

  async getAnalysis(id: string): Promise<PadelAnalysis | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    const { data: analysis, error } = await supabase
      .from('padel_analyses')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Analyse non trouvée
      }
      throw new Error(`Erreur lors de la récupération de l'analyse: ${error.message}`);
    }

    return analysis;
  }

  async updateAnalysis(id: string, updates: Partial<PadelAnalysis>): Promise<PadelAnalysis> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    const { data: analysis, error } = await supabase
      .from('padel_analyses')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur lors de la mise à jour de l'analyse: ${error.message}`);
    }

    return analysis;
  }

  async deleteAnalysis(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    const { error } = await supabase
      .from('padel_analyses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Erreur lors de la suppression de l'analyse: ${error.message}`);
    }
  }

  // =============================================
  // POINTS
  // =============================================

  async addPoint(analysisId: string, actionId: number, playerPosition?: 'player1' | 'player2'): Promise<MatchPoint> {
    const { data: point, error } = await supabase
      .from('match_points')
      .insert({
        analysis_id: analysisId,
        action_id: actionId,
        player_position: playerPosition || null,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur lors de l'ajout du point: ${error.message}`);
    }

    return point;
  }

  async getPoints(analysisId: string): Promise<MatchPoint[]> {
    console.log('Fetching points for analysis:', analysisId);
    
    // Récupérer les points
    const { data: points, error: pointsError } = await supabase
      .from('match_points')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('timestamp', { ascending: true });

    if (pointsError) {
      console.error('Error fetching points:', pointsError);
      throw new Error(`Erreur lors de la récupération des points: ${pointsError.message}`);
    }

    if (!points || points.length === 0) {
      return [];
    }

    // Récupérer les actions correspondantes
    const actionIds = Array.from(new Set(points.map(p => p.action_id)));
    console.log('🔍 Action IDs to fetch:', actionIds);
    
    const { data: actions, error: actionsError } = await supabase
      .from('point_actions')
      .select('*')
      .in('id', actionIds);

    if (actionsError) {
      console.error('Error fetching actions:', actionsError);
      throw new Error(`Erreur lors de la récupération des actions: ${actionsError.message}`);
    }

    console.log('🔍 Fetched actions:', actions);

    // Créer un map des actions par ID
    const actionsMap = new Map(actions?.map(action => [action.id, action]) || []);

    // Enrichir les points avec les actions
    const enrichedPoints = points.map(point => ({
      ...point,
      point_actions: actionsMap.get(point.action_id)
    }));

    console.log('Fetched points with actions:', enrichedPoints);
    return enrichedPoints;
  }

  async deleteLastPoint(analysisId: string): Promise<void> {
    try {
      // Récupérer le dernier point
      const { data: lastPoint, error: fetchError } = await supabase
        .from('match_points')
        .select('id')
        .eq('analysis_id', analysisId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // Aucun point trouvé
          console.warn('No points found to delete');
          return;
        }
        throw new Error(`Erreur lors de la récupération du dernier point: ${fetchError.message}`);
      }

      if (!lastPoint) {
        console.warn('No points found to delete');
        return;
      }

      // Supprimer le dernier point
      const { error: deleteError } = await supabase
        .from('match_points')
        .delete()
        .eq('id', lastPoint.id);

      if (deleteError) {
        throw new Error(`Erreur lors de la suppression du point: ${deleteError.message}`);
      }

      console.log(`Point ${lastPoint.id} deleted successfully`);
    } catch (error) {
      console.error('Error in deleteLastPoint:', error);
      throw error;
    }
  }

  // =============================================
  // ACTIONS DE RÉFÉRENCE
  // =============================================

  async getPointActions(): Promise<PointAction[]> {
    const { data: actions, error } = await supabase
      .from('point_actions')
      .select('*')
      .order('id');

    if (error) {
      throw new Error(`Erreur lors de la récupération des actions: ${error.message}`);
    }

    return actions || [];
  }

  async getPointActionById(id: number): Promise<PointAction | null> {
    const { data: action, error } = await supabase
      .from('point_actions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erreur lors de la récupération de l'action: ${error.message}`);
    }

    return action;
  }

  // =============================================
  // STATISTIQUES
  // =============================================

  async getAnalysisStats(analysisId: string): Promise<AnalysisStats> {
    const { data: stats, error } = await supabase
      .rpc('get_analysis_stats', { analysis_uuid: analysisId });

    if (error) {
      throw new Error(`Erreur lors du calcul des statistiques: ${error.message}`);
    }

    return stats[0] || {
      total_points: 0,
      points_gagnes: 0,
      points_perdus: 0,
      coups_gagnants: 0,
      fautes_totales: 0,
      ratio_cf: null
    };
  }

  // =============================================
  // MÉTHODES UTILITAIRES
  // =============================================

  async getAnalysisWithPoints(analysisId: string): Promise<{
    analysis: PadelAnalysis;
    points: MatchPoint[];
    actions: PointAction[];
  }> {
    const [analysis, points, actions] = await Promise.all([
      this.getAnalysis(analysisId),
      this.getPoints(analysisId),
      this.getPointActions()
    ]);

    if (!analysis) {
      throw new Error('Analyse non trouvée');
    }

    return { analysis, points, actions };
  }

  // Mapping des clés d'action vers les IDs de point_actions
  private actionKeyToIdMap: Record<string, number> = {
    // Points gagnés
    'gagne_passing_droite': 1,
    'gagne_passing_gauche': 2,
    'gagne_passing_milieu': 3,
    'gagne_volley_droite': 4,
    'gagne_volley_gauche': 5,
    'gagne_volley_milieu': 6,
    'gagne_smash_par_3': 7,
    'gagne_smash_par_4': 8,
    'gagne_smash_ar': 9,
    'gagne_lob_droite': 10,
    'gagne_lob_gauche': 11,
    'gagne_lob_milieu': 12,
    'gagne_vibora_bandeja_droite': 13,
    'gagne_vibora_bandeja_gauche': 14,
    'gagne_vibora_bandeja_milieu': 15,
    'gagne_bajada_droite': 16,
    'gagne_bajada_gauche': 17,
    'gagne_bajada_milieu': 18,
    'gagne_faute_direct_adverse': 19,
    
    // Points perdus
    'perdu_forced_error': 20,
    'perdu_winner_on_error_contre_smash': 21,
    'perdu_winner_on_error_lob_court': 22,
    'perdu_winner_on_error_erreur_zone': 23,
    'perdu_unforced_error_passing_filet': 24,
    'perdu_unforced_error_passing_vitre': 25,
    'perdu_unforced_error_passing_grille': 26,
    'perdu_unforced_error_volley_filet': 27,
    'perdu_unforced_error_volley_vitre': 28,
    'perdu_unforced_error_volley_grille': 29,
    'perdu_unforced_error_smash_filet': 30,
    'perdu_unforced_error_smash_vitre': 31,
    'perdu_unforced_error_smash_grille': 32,
    'perdu_unforced_error_lob_filet': 33,
    'perdu_unforced_error_lob_vitre': 34,
    'perdu_unforced_error_lob_grille': 35,
    'perdu_unforced_error_vibora_bandeja_filet': 36,
    'perdu_unforced_error_vibora_bandeja_vitre': 37,
    'perdu_unforced_error_vibora_bandeja_grille': 38,
    'perdu_unforced_error_bajada_filet': 39,
    'perdu_unforced_error_bajada_vitre': 40,
    'perdu_unforced_error_bajada_grille': 41,
  };

  // Convertir une clé d'action en ID de point_actions
  async getActionIdFromKey(actionKey: string): Promise<number | null> {
    const actionId = this.actionKeyToIdMap[actionKey];
    if (actionId) {
      return actionId;
    }

    // Fallback: essayer de trouver par correspondance partielle
    console.warn(`Action key not found in mapping: ${actionKey}`);
    return null;
  }
}

export const analysisService = new SupabaseAnalysisService();
