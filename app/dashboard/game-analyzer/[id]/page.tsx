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
      
      // Recharger les données pour synchroniser avec la DB
      await loadAnalysis(gameId);
      
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
          <div className="bg-white border-b border-gray-200 px-4 py-4">
            {/* Titre et joueurs */}
            <div className="text-center mb-4">
              <h1 className="text-xl font-bold text-gray-900 mb-1">{analysis.analysis_name}</h1>
              <p className="text-sm text-gray-600">
                {analysis.player_left} - {analysis.player_right}
              </p>
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-center gap-3">
              <Button asChild size="sm">
                <Link href={`/dashboard/game-analyzer/${analysis.id}/stats`}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Stats
                </Link>
              </Button>
              <Button
                onClick={async () => {
                  if (points.length > 0) {
                    await undoLastPoint();
                    // Recharger les données après suppression
                    await loadAnalysis(gameId);
                  }
                }}
                variant="outline"
                size="sm"
                disabled={!points || points.length === 0}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Undo2 className="h-4 w-4 mr-2" />
                Annuler dernière action
              </Button>
            </div>
          </div>

          {/* Interface de jeu */}
          <div className="flex-1 flex flex-col h-full">
            {/* Boutons principaux */}
            <div className="p-4">
              <PointActionButtons 
                onPointAction={handlePointAction}
                playerLeft={analysis.player_left}
                playerRight={analysis.player_right}
              />
            </div>

            {/* Historique des points */}
            <div className="px-4 pb-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Historique des points</h3>
                {points && points.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {points.slice().reverse().map((point, index) => {
                      const action = point.point_actions;
                      const isWon = action?.category_1 === 'gagne';
                      const playerName = point.player_position === 'player2' ? analysis.player_left : analysis.player_right;
                      
                      return (
                        <div key={point.id || index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${isWon ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-sm font-medium text-gray-900">
                              {isWon ? 'Gagné' : 'Perdu'}
                            </span>
                            <span className="text-sm text-gray-600">
                              - {playerName}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {action?.category_3 || action?.category_2 || 'Action'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">Aucun point enregistré</p>
                    <p className="text-xs mt-1">Commencez à jouer pour voir l'historique</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}