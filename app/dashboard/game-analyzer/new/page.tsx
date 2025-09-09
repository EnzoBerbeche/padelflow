'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAnalysis } from '@/hooks/use-analysis';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewGamePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { createAnalysis, loading } = useAnalysis();
  
  const getDefaultAnalysisName = () => {
    const now = new Date();
    const date = now.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    const time = now.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    return `Analyse ${date} ${time}`;
  };

  const [formData, setFormData] = useState({
    analysis_name: getDefaultAnalysisName(),
    player_right: 'Joueur de Droite',
    player_left: 'Joueur de Gauche',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInputFocus = (field: string) => {
    if (field === 'player_right' && formData.player_right === 'Joueur de Droite') {
      setFormData(prev => ({ ...prev, player_right: '' }));
    } else if (field === 'player_left' && formData.player_left === 'Joueur de Gauche') {
      setFormData(prev => ({ ...prev, player_left: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.player_right || !formData.player_left) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir les noms des joueurs",
        variant: "destructive",
      });
      return;
    }

    try {
      const newAnalysis = await createAnalysis({
        analysis_name: formData.analysis_name || getDefaultAnalysisName(),
        player_right: formData.player_right,
        player_left: formData.player_left,
        opponent_right: 'Adversaire 1',
        opponent_left: 'Adversaire 2'
      });

      toast({
        title: "Succès",
        description: "Analyse créée avec succès !",
      });

      router.push(`/dashboard/game-analyzer/${newAnalysis.id}`);

    } catch (error) {
      console.error('Error creating analysis:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'analyse",
        variant: "destructive",
      });
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/game-analyzer">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Nouvelle Analyse</h1>
                <p className="text-gray-600">Créez une nouvelle analyse de match</p>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Analyse */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Analyse</span>
                </CardTitle>
                <CardDescription>
                  Nommez votre analyse et définissez les joueurs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Nom de l'analyse */}
                <div className="space-y-2">
                  <Label htmlFor="analysis_name">Nom de l'analyse</Label>
                  <Input
                    id="analysis_name"
                    placeholder={getDefaultAnalysisName()}
                    value={formData.analysis_name}
                    onChange={(e) => handleInputChange('analysis_name', e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Par défaut : {getDefaultAnalysisName()}
                  </p>
                </div>

                {/* Joueurs */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-primary">Joueurs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="player_right">Joueur de Droite</Label>
                      <Input
                        id="player_right"
                        value={formData.player_right}
                        onChange={(e) => handleInputChange('player_right', e.target.value)}
                        onFocus={() => handleInputFocus('player_right')}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player_left">Joueur de Gauche</Label>
                      <Input
                        id="player_left"
                        value={formData.player_left}
                        onChange={(e) => handleInputChange('player_left', e.target.value)}
                        onFocus={() => handleInputFocus('player_left')}
                        required
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <Button variant="outline" asChild>
                <Link href="/dashboard/game-analyzer">
                  Annuler
                </Link>
              </Button>
              <Button type="submit" disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                {loading ? 'Création...' : 'Créer l\'analyse'}
              </Button>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}