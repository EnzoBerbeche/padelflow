import { useState, useEffect, useCallback } from 'react';
import { analysisService, PadelAnalysis, MatchPoint, PointAction, AnalysisStats } from '@/lib/services/supabase-analysis-service';

export function useAnalysis(analysisId?: string) {
  console.log('🔍 useAnalysis hook initialized with analysisId:', analysisId);
  
  const [analysis, setAnalysis] = useState<PadelAnalysis | null>(null);
  const [points, setPoints] = useState<MatchPoint[]>([]);
  const [actions, setActions] = useState<PointAction[]>([]);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger une analyse spécifique
  const loadAnalysis = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const analysisData = await analysisService.getAnalysis(id);
      const pointsData = await analysisService.getPoints(id);
      setAnalysis(analysisData);
      setPoints(pointsData);
      
      // Charger les stats
      const analysisStats = await analysisService.getAnalysisStats(id);
      setStats(analysisStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger toutes les analyses
  const loadAnalyses = async (): Promise<PadelAnalysis[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const analyses = await analysisService.getAnalyses();
      return analyses;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Créer une nouvelle analyse
  const createAnalysis = async (data: {
    analysis_name: string;
    player_right: string;
    player_left: string;
    opponent_right?: string;
    opponent_left?: string;
  }): Promise<PadelAnalysis> => {
    setLoading(true);
    setError(null);
    
    try {
      const newAnalysis = await analysisService.createAnalysis(data);
      return newAnalysis;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Ajouter un point
  const addPoint = async (actionKey: string, playerPosition?: 'player1' | 'player2') => {
    if (!analysis) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Convertir la clé d'action en ID
      const actionId = await analysisService.getActionIdFromKey(actionKey);
      if (!actionId) {
        console.error(`Action key not found: ${actionKey}`);
        throw new Error(`Action non trouvée: ${actionKey}`);
      }

      // Ajouter le point
      const newPoint = await analysisService.addPoint(analysis.id, actionId, playerPosition);
      
      // Mettre à jour l'état local
      setPoints(prev => [...prev, newPoint]);
      
      // Recharger les stats
      const analysisStats = await analysisService.getAnalysisStats(analysis.id);
      setStats(analysisStats);
      
      return newPoint;
    } catch (err) {
      console.error('Error adding point:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Supprimer le dernier point
  const undoLastPoint = async () => {
    if (!analysis || points.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await analysisService.deleteLastPoint(analysis.id);
      
      // Recharger les points depuis Supabase pour s'assurer de la cohérence
      const updatedPoints = await analysisService.getPoints(analysis.id);
      setPoints(updatedPoints);
      
      // Recharger les stats
      const analysisStats = await analysisService.getAnalysisStats(analysis.id);
      setStats(analysisStats);
    } catch (err) {
      console.error('Error undoing point:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Charger automatiquement l'analyse quand l'ID change
  useEffect(() => {
    console.log('🔍 useAnalysis useEffect triggered, analysisId:', analysisId);
    console.log('🔍 useEffect dependencies - analysisId:', analysisId, 'loadAnalysis:', typeof loadAnalysis);
    if (analysisId) {
      console.log('🔍 Loading analysis with ID:', analysisId);
      loadAnalysis(analysisId);
    } else {
      console.log('🔍 No analysisId provided, skipping loadAnalysis');
    }
  }, [analysisId, loadAnalysis]);

  // Mettre à jour l'analyse
  const updateAnalysis = async (updates: Partial<PadelAnalysis>) => {
    if (!analysis) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const updatedAnalysis = await analysisService.updateAnalysis(analysis.id, updates);
      setAnalysis(updatedAnalysis);
      return updatedAnalysis;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Supprimer l'analyse
  const deleteAnalysis = async () => {
    if (!analysis) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await analysisService.deleteAnalysis(analysis.id);
      setAnalysis(null);
      setPoints([]);
      setStats(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    analysis,
    points,
    actions,
    stats,
    loading,
    error,
    loadAnalysis,
    loadAnalyses,
    createAnalysis,
    addPoint,
    undoLastPoint,
    updateAnalysis,
    deleteAnalysis
  };
}

// Hook pour les analyses (liste)
export function useAnalyses() {
  const [analyses, setAnalyses] = useState<PadelAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalyses = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await analysisService.getAnalyses();
      setAnalyses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const refreshAnalyses = async () => {
    await loadAnalyses();
  };

  // Charger automatiquement les analyses au montage du composant
  useEffect(() => {
    loadAnalyses();
  }, []);

  return {
    analyses,
    loading,
    error,
    loadAnalyses,
    refreshAnalyses
  };
}
