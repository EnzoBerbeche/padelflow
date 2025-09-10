'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Undo2, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAnalysis } from '@/hooks/use-analysis';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PointActionButtons from '@/components/point-action-buttons';
import { analysisService } from '@/lib/services/supabase-analysis-service';

export default function GameTrackingPage() {
  console.log('🔍 GameTrackingPage - Component started');
  
  const { toast } = useToast();
  const params = useParams();
  const gameId = params.id as string;

  console.log('🔍 GameTrackingPage - gameId:', gameId);

  const { 
    analysis, 
    points, 
    stats: analysisStats, 
    loading, 
    error, 
    addPoint, 
    undoLastPoint,
    loadAnalysis
  } = useAnalysis(gameId);

  // État local pour les points et stats (pour éviter le rechargement)
  const [localPoints, setLocalPoints] = useState<any[]>([]);
  const [localStats, setLocalStats] = useState<any>(null);

  // Synchroniser l'état local avec le hook
  useEffect(() => {
    if (points) {
      setLocalPoints(points);
    }
  }, [points]);

  useEffect(() => {
    if (analysisStats) {
      setLocalStats(analysisStats);
    }
  }, [analysisStats]);

  // Fonction pour calculer les stats localement
  const calculateStats = (pointsData: any[]) => {
    const total_points = pointsData.length;
    const points_gagnes = pointsData.filter(p => p.action?.category_1 === 'gagne').length;
    const points_perdus = pointsData.filter(p => p.action?.category_1 === 'perdu').length;
    const coups_gagnants = pointsData.filter(p => p.action?.category_2 === 'winner').length;
    const fautes_totales = pointsData.filter(p => 
      p.action?.category_2 === 'unforced_error' || 
      p.action?.category_2 === 'forced_error' ||
      p.action?.category_2 === 'faute_directe_adverse'
    ).length;
    
    return {
      total_points,
      points_gagnes,
      points_perdus,
      coups_gagnants,
      fautes_totales,
      ratio_cf: coups_gagnants > 0 ? (fautes_totales / coups_gagnants) : null
    };
  };

  // Fonction pour gérer les actions de points depuis le composant PointActionButtons
  const handlePointAction = async (actionId: string, subTagId?: string, playerPosition?: 'right' | 'left') => {
    console.log('🔍 Point action:', { actionId, subTagId, playerPosition });
    
    if (!analysis) {
      toast({
        title: "Erreur",
        description: "Analyse non chargée",
        variant: "destructive",
      });
      return;
    }
    
    // Convertir playerPosition en format attendu par le service
    const position = playerPosition === 'left' ? 'player2' : 'player1';
    
    try {
      // Appeler directement le service avec l'ID de l'action
      const newPoint = await analysisService.addPoint(analysis.id, parseInt(actionId), position);
      
      // Mettre à jour l'état local immédiatement
      const updatedPoints = [...localPoints, newPoint];
      const updatedStats = calculateStats(updatedPoints);
      
      setLocalPoints(updatedPoints);
      setLocalStats(updatedStats);
      
      toast({
        title: "Point ajouté",
        description: "Le point a été enregistré avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du point:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le point",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-12">
            <h2 className="text-xl font-medium text-gray-900 mb-2">Erreur de chargement</h2>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button asChild>
              <Link href="/dashboard/game-analyzer">
                Retour à la liste
              </Link>
            </Button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!analysis) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-12">
            <h2 className="text-xl font-medium text-gray-900 mb-2">Analyse non trouvée</h2>
            <p className="text-gray-500 mb-4">Cette analyse n'existe pas ou a été supprimée</p>
            <Button asChild>
              <Link href="/dashboard/game-analyzer">
                Retour à la liste
              </Link>
            </Button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 py-2 space-y-2">
            {/* Boutons d'action en haut */}
            <div className="flex items-center justify-between">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/game-analyzer">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Retour
                </Link>
              </Button>
              <div className="flex items-center space-x-1">
                <Button asChild size="sm">
                  <Link href={`/dashboard/game-analyzer/${analysis.id}/stats`}>
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Stats
                  </Link>
                </Button>
                <Button
                  onClick={async () => {
                    if (localPoints.length > 0) {
                      await undoLastPoint();
                      // Recharger les données après suppression
                      await loadAnalysis(gameId);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  disabled={!localPoints || localPoints.length === 0}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Titre */}
            <div className="text-center">
              <h1 className="text-lg font-bold text-gray-900">{analysis.analysis_name}</h1>
            </div>

            {/* Joueurs */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {analysis.player_left} - {analysis.player_right}
              </p>
            </div>
          </div>

          {/* Interface de jeu */}
          <div className="flex-1 flex flex-col h-full">
            {/* Boutons principaux - prennent tout l'espace */}
            <div className="flex-1 flex flex-col p-4 h-full">
              <PointActionButtons 
                onPointAction={handlePointAction}
                playerLeft={analysis.player_left}
                playerRight={analysis.player_right}
              />
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}