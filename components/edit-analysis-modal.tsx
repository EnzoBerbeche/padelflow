'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Analysis {
  id: string;
  analysis_name: string;
  player_right: string;
  player_left: string;
  opponent_right: string;
  opponent_left: string;
}

interface EditAnalysisModalProps {
  analysis: Analysis;
  onUpdate: (updatedAnalysis: Analysis) => void;
  children: React.ReactNode;
}

export function EditAnalysisModal({ analysis, onUpdate, children }: EditAnalysisModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    analysis_name: analysis.analysis_name,
    player_right: analysis.player_right,
    player_left: analysis.player_left,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.analysis_name.trim() || !formData.player_right.trim() || !formData.player_left.trim()) {
      toast({
        title: "Erreur",
        description: "Tous les champs sont obligatoires",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Import dynamique pour éviter les problèmes de SSR
      const { analysisService } = await import('@/lib/services/supabase-analysis-service');
      
      await analysisService.updateAnalysis(analysis.id, {
        analysis_name: formData.analysis_name.trim(),
        player_right: formData.player_right.trim(),
        player_left: formData.player_left.trim(),
      });

      // Mettre à jour l'analyse dans le parent
      onUpdate({
        ...analysis,
        analysis_name: formData.analysis_name.trim(),
        player_right: formData.player_right.trim(),
        player_left: formData.player_left.trim(),
      });

      toast({
        title: "Analyse mise à jour",
        description: "Les modifications ont été sauvegardées avec succès",
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Error updating analysis:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'analyse",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Réinitialiser les données
    setFormData({
      analysis_name: analysis.analysis_name,
      player_right: analysis.player_right,
      player_left: analysis.player_left,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="h-5 w-5 text-blue-600" />
            <span>Éditer l'analyse</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="analysis_name">Nom de l'analyse</Label>
            <Input
              id="analysis_name"
              value={formData.analysis_name}
              onChange={(e) => handleInputChange('analysis_name', e.target.value)}
              placeholder="Nom de l'analyse"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="player_right">Joueur de droite</Label>
              <Input
                id="player_right"
                value={formData.player_right}
                onChange={(e) => handleInputChange('player_right', e.target.value)}
                placeholder="Nom du joueur"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="player_left">Joueur de gauche</Label>
              <Input
                id="player_left"
                value={formData.player_left}
                onChange={(e) => handleInputChange('player_left', e.target.value)}
                placeholder="Nom du joueur"
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
