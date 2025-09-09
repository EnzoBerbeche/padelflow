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
    undoLastPoint 
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
      await analysisService.addPoint(analysis.id, parseInt(actionId), position);
      
      toast({
        title: "Point ajouté",
        description: "Le point a été enregistré avec succès",
      });
      
      // Recharger les données
      window.location.reload();
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
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <Button asChild variant="ghost" className="mr-4">
                <Link href="/dashboard/game-analyzer">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{analysis.analysis_name}</h1>
                <p className="text-gray-600 mt-1">
                  {analysis.player_left} (G) - {analysis.player_right} (D)
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button asChild size="sm">
                  <Link href={`/dashboard/game-analyzer/${analysis.id}/stats`}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Stats
                  </Link>
                </Button>
                <Button
                  onClick={undoLastPoint}
                  variant="outline"
                  size="sm"
                  disabled={!points || points.length === 0}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Stats rapides */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{points?.length || 0}</div>
                <div className="text-sm text-gray-500">Points joués</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{analysisStats?.points_gagnes || 0}</div>
                <div className="text-sm text-gray-500">Points gagnés</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{analysisStats?.points_perdus || 0}</div>
                <div className="text-sm text-gray-500">Points perdus</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analysisStats?.ratio_cf ? `${Math.round(analysisStats.ratio_cf * 100)}%` : '0%'}
                </div>
                <div className="text-sm text-gray-500">Taux de réussite</div>
              </div>
            </div>
          </div>

          {/* Interface de jeu */}
          <div className="flex-1 flex flex-col">
            {/* Boutons principaux - prennent tout l'espace */}
            <div className="flex-1 flex flex-col p-4">
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