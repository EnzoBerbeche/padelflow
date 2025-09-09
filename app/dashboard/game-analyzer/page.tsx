'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, BarChart3, Clock, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import { useAnalyses } from '@/hooks/use-analysis';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Game Analyzer</h1>
              <p className="text-gray-600 mt-2">
                Suivez vos matchs de padel point par point et analysez vos performances
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/game-analyzer/new">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle analyse
              </Link>
            </Button>
          </div>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Analyses totales</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyses.length}</div>
                <p className="text-xs text-muted-foreground">
                  Toutes vos analyses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Points enregistrés</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyses.reduce((total, analysis) => total + (analysis as any).points_count || 0, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total des points
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Analyses récentes</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyses.filter(a => {
                    const analysisDate = new Date(a.created_at);
                    const today = new Date();
                    const diffTime = Math.abs(today.getTime() - analysisDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays <= 7;
                  }).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cette semaine
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dernière analyse</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyses.length > 0 ? format(new Date(analyses[0].created_at), 'dd/MM', { locale: fr }) : '--'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Date de création
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Liste des analyses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Vos analyses ({analyses.length})</span>
              </CardTitle>
              <CardDescription>
                Gérez et suivez vos analyses de match de padel
              </CardDescription>
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
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">
                              {analysis.analysis_name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {analysis.player_right} & {analysis.player_left} vs {analysis.opponent_right} & {analysis.opponent_left}
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
                      </div>
                      
                      <div className="flex items-center space-x-3 ml-6">
                        <Button asChild size="sm">
                          <Link href={`/dashboard/game-analyzer/${analysis.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ouvrir
                          </Link>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteAnalysis(analysis.id, analysis.analysis_name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
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