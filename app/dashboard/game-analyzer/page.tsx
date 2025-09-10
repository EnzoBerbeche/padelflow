'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, BarChart3, XCircle, Eye, Trash2, Edit } from 'lucide-react';
import { useAnalyses } from '@/hooks/use-analysis';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EditAnalysisModal } from '@/components/edit-analysis-modal';

export default function GameAnalyzerPage() {
  const { analyses, loading, error, refreshAnalyses } = useAnalyses();
  const { toast } = useToast();

  const handleDeleteAnalysis = async (analysisId: string, analysisName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'analyse "${analysisName}" ?`)) {
      return;
    }

    try {
      // Import dynamique pour éviter les problèmes de SSR
      const { analysisService } = await import('@/lib/services/supabase-analysis-service');
      await analysisService.deleteAnalysis(analysisId);
      
      toast({
        title: "Analyse supprimée",
        description: "L'analyse a été supprimée avec succès",
      });
      
      // Recharger la liste des analyses
      await refreshAnalyses();
    } catch (error) {
      console.error('Error deleting analysis:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'analyse",
        variant: "destructive",
      });
    }
  };

  const handleUpdateAnalysis = (updatedAnalysis: any) => {
    // Recharger la liste des analyses pour refléter les changements
    refreshAnalyses();
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
            <XCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-medium mb-2">Erreur de chargement</h3>
            <p className="text-gray-500">{error}</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Game Analyzer</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2">
                Suivez vos matchs de padel point par point et analysez vos performances
              </p>
            </div>
            <div className="flex justify-center sm:justify-start">
              <Button asChild className="w-full sm:w-auto">
                <Link href="/dashboard/game-analyzer/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle analyse
                </Link>
              </Button>
            </div>
          </div>


          {/* Liste des analyses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Vos analyses ({analyses.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyses.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Aucune analyse créée</h3>
                  <p className="mb-6">Commencez par créer votre première analyse pour suivre vos performances</p>
                  <Button asChild>
                    <Link href="/dashboard/game-analyzer/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Créer une analyse
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {analyses.map((analysis) => (
                    <div
                      key={analysis.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 text-lg">
                            {analysis.analysis_name}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {analysis.player_right} & {analysis.player_left}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            {format(new Date(analysis.created_at), 'dd/MM/yyyy \'à\' HH:mm', { locale: fr })}
                          </div>
                          <div className="text-xs text-gray-400">
                            {format(new Date(analysis.updated_at), '\'Modifié le\' dd/MM', { locale: fr })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center space-x-2">
                        <Button asChild size="sm" className="flex-1">
                          <Link href={`/dashboard/game-analyzer/${analysis.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ouvrir
                          </Link>
                        </Button>
                        <EditAnalysisModal 
                          analysis={analysis} 
                          onUpdate={handleUpdateAnalysis}
                        >
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </EditAnalysisModal>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteAnalysis(analysis.id, analysis.analysis_name)}
                          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}