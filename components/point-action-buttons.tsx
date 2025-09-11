'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { analysisService, PointAction } from '@/lib/services/supabase-analysis-service';

interface PointActionButtonsProps {
  onPointAction: (actionId: string, subTagId?: string, playerPosition?: 'right' | 'left') => void;
  playerLeft?: string;
  playerRight?: string;
}

export default function PointActionButtons({ onPointAction, playerLeft, playerRight }: PointActionButtonsProps) {
  const [selectedType, setSelectedType] = useState<'gagné' | 'perdu' | null>(null);
  const [selectedAction, setSelectedAction] = useState<PointAction | null>(null);
  const [selectedSubTag, setSelectedSubTag] = useState<string>('');
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showSubTagDialog, setShowSubTagDialog] = useState(false);
  const [showPlayerDialog, setShowPlayerDialog] = useState(false);
  const [pointActions, setPointActions] = useState<PointAction[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les actions depuis la base de données
  useEffect(() => {
    const loadActions = async () => {
      try {
        const actions = await analysisService.getPointActions();
        console.log('🔍 Actions chargées depuis la DB:', actions);
        console.log('🔍 Structure des actions:', actions.map(a => ({
          id: a.id,
          category_1: a.category_1,
          category_2: a.category_2,
          category_3: a.category_3
        })));
        setPointActions(actions);
      } catch (error) {
        console.error('Erreur lors du chargement des actions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActions();
  }, []);

  // Grouper les actions par category_3 pour les points gagnés (category_2 est null)
  const getGagnéActions = (actions: PointAction[]) => {
    const uniqueActions = new Map();
    const gagneActions = actions.filter(action => action.category_1 === 'gagne' && action.category_2 === null);
    console.log('🔍 Actions gagnées filtrées:', gagneActions);
    
    gagneActions.forEach(action => {
      console.log('🔍 Action gagnée:', action.category_3, action);
      if (!uniqueActions.has(action.category_3)) {
        uniqueActions.set(action.category_3, action);
      }
    });
    
    const result = Array.from(uniqueActions.values());
    console.log('🔍 Actions gagnées groupées:', result);
    return result;
  };

  // Grouper les actions par category_2 pour les points perdus
  const getPerduActions = (actions: PointAction[]) => {
    const uniqueActions = new Map();
    const perduActions = actions.filter(action => action.category_1 === 'perdu' && action.category_2 !== null);
    console.log('🔍 Actions perdues filtrées:', perduActions);
    
    perduActions.forEach(action => {
      console.log('🔍 Action perdue:', action.category_2, action);
      if (!uniqueActions.has(action.category_2)) {
        uniqueActions.set(action.category_2, action);
      }
    });
    
    const result = Array.from(uniqueActions.values());
    console.log('🔍 Actions perdues groupées:', result);
    return result;
  };

  const gagnéActions = getGagnéActions(pointActions);
  const perduActions = getPerduActions(pointActions);

  // Récupérer les sous-tags (category_3) pour une action donnée des points perdus
  const getSubTags = (category2: string) => {
    const uniqueSubTags = new Map();
    pointActions
      .filter(action => action.category_2 === category2 && action.category_3)
      .forEach(action => {
        if (!uniqueSubTags.has(action.category_3)) {
          uniqueSubTags.set(action.category_3, {
            id: action.category_3,
            label: action.category_3
          });
        }
      });
    return Array.from(uniqueSubTags.values());
  };

  // Fonction de formatage intelligente pour les noms d'actions
  const formatActionName = (name: string): string => {
    // Cas spéciaux pour les noms composés
    const specialCases: { [key: string]: string } = {
      'Balle Haute': 'Balle Haute',
      'Volée': 'Volée',
      'Balle Basse': 'Balle Basse',
      'Service': 'Service',
      'Faute Directe Adverse': 'Faute Directe Adverse',
      'Balle facile': 'Balle facile',
      'Balle difficile': 'Balle difficile',
      'Coup gagnant adverse': 'Coup gagnant adverse'
    };

    if (specialCases[name]) {
      return specialCases[name];
    }

    // Formatage générique
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  // Fonction pour obtenir l'emoji approprié selon l'action
  const getActionEmoji = (name: string): string => {
    const emojiMap: { [key: string]: string } = {
      'Balle Haute': '⬆️',
      'Volée': '🏓',
      'Balle Basse': '⬇️',
      'Service': '🎯',
      'Faute Directe Adverse': '❌',
      'Balle facile': '😅',
      'Balle difficile': '😰',
      'Coup gagnant adverse': '💥'
    };

    return emojiMap[name] || '🎾';
  };

  const handleTypeClick = (type: 'gagné' | 'perdu') => {
    setSelectedType(type);
    setShowActionDialog(true);
  };

  const handleActionClick = (action: PointAction) => {
    setSelectedAction(action);
    setShowActionDialog(false);
    
    // Si requires_player est false, enregistrer directement le point
    if (!action.requires_player) {
      onPointAction(action.id.toString(), '', undefined);
      // Reset
      setSelectedType(null);
      setSelectedAction(null);
      setSelectedSubTag('');
      return;
    }
    
    if (action.category_1 === 'gagne') {
      // Pour les points gagnés : Action → Joueur (pas de sous-tags)
      setShowPlayerDialog(true);
    } else if (action.category_1 === 'perdu' && action.category_3) {
      // Pour les points perdus avec category_3 : Action → Sous-tag → Joueur
      setShowSubTagDialog(true);
    } else {
      // Pour les points perdus sans category_3 : Action → Joueur
      setShowPlayerDialog(true);
    }
  };

  const handleSubTagClick = (subTag: { id: string; label: string }) => {
    setSelectedSubTag(subTag.id);
    setShowSubTagDialog(false);
    
    // Trouver l'action spécifique pour cette combinaison
    const specificAction = pointActions.find(action => 
      action.category_2 === selectedAction!.category_2 && 
      action.category_3 === subTag.id
    );
    
    // Si requires_player est false, enregistrer directement le point
    if (specificAction && !specificAction.requires_player) {
      onPointAction(specificAction.id.toString(), subTag.id, undefined);
      // Reset
      setSelectedType(null);
      setSelectedAction(null);
      setSelectedSubTag('');
      return;
    }
    
    setShowPlayerDialog(true);
  };

  const handlePlayerSelect = (playerPosition: 'right' | 'left') => {
    setShowPlayerDialog(false);
    
    // Trouver l'ID spécifique pour la combinaison
    let specificActionId = selectedAction!.id;
    
    if (selectedAction!.category_1 === 'perdu' && selectedSubTag) {
      // Si on a une category_3 pour les points perdus
      const specificAction = pointActions.find(action => 
        action.category_2 === selectedAction!.category_2 && 
        action.category_3 === selectedSubTag
      );
      
      if (specificAction) {
        specificActionId = specificAction.id;
      }
    }
    
    onPointAction(specificActionId.toString(), selectedSubTag, playerPosition);
    
    // Reset
    setSelectedType(null);
    setSelectedAction(null);
    setSelectedSubTag('');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-6 text-center">
            <div className="text-gray-500">Chargement des actions...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Première étape : Gagné ou Perdu */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-2 gap-4 h-full">
          <Button
            onClick={() => handleTypeClick('gagné')}
            className="h-full min-h-[200px] text-xl bg-green-600 hover:bg-green-700 text-white"
          >
            <span className="mr-2">✅</span>
            Gagné
          </Button>
          <Button
            onClick={() => handleTypeClick('perdu')}
            className="h-full min-h-[200px] text-xl bg-red-600 hover:bg-red-700 text-white"
          >
            <span className="mr-2">❌</span>
            Perdu
          </Button>
        </div>
      </div>

      {/* Dialog Actions */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg text-center">
              {selectedType === 'gagné' ? '✅ Points gagnés' : '❌ Points perdus'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            {(selectedType === 'gagné' ? gagnéActions : perduActions).map((action) => {
              // Pour les points gagnés : afficher category_3
              // Pour les points perdus : afficher category_2
              const displayName = selectedType === 'gagné' 
                ? (action.category_3 || '') 
                : (action.category_2 || '');
              
              console.log('🔍 Rendu bouton:', {
                selectedType,
                actionId: action.id,
                category_2: action.category_2,
                category_3: action.category_3,
                displayName
              });
              return (
                <Button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className="w-full h-16 text-base font-medium"
                  variant="outline"
                >
                  <span className="mr-3 text-2xl">{getActionEmoji(displayName)}</span>
                  {formatActionName(displayName)}
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Sous-tags (pour les points perdus avec category_3) */}
      <Dialog open={showSubTagDialog} onOpenChange={setShowSubTagDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg text-center">
              {selectedAction && formatActionName(selectedAction.category_2 || '')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            {selectedAction && getSubTags(selectedAction.category_2 || '').map((subTag) => (
              <Button
                key={subTag.id}
                onClick={() => handleSubTagClick(subTag)}
                className="w-full h-16 text-base font-medium"
                variant="outline"
              >
                <span className="mr-3 text-2xl">{getActionEmoji(subTag.label)}</span>
                {formatActionName(subTag.label)}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Joueur */}
      <Dialog open={showPlayerDialog} onOpenChange={setShowPlayerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-center">
              Qui a fait cette action ?
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-6">
            <Button
              onClick={() => handlePlayerSelect('right')}
              className="w-full h-20 text-lg font-medium"
              variant="outline"
            >
              <span className="mr-3 text-3xl">👤</span>
              {playerRight || 'Joueur Droite'} (D)
            </Button>
            <Button
              onClick={() => handlePlayerSelect('left')}
              className="w-full h-20 text-lg font-medium"
              variant="outline"
            >
              <span className="mr-3 text-3xl">👤</span>
              {playerLeft || 'Joueur Gauche'} (G)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}