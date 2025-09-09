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
  const [selectedSubSubTag, setSelectedSubSubTag] = useState<string>('');
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showSubTagDialog, setShowSubTagDialog] = useState(false);
  const [showSubSubTagDialog, setShowSubSubTagDialog] = useState(false);
  const [showPlayerDialog, setShowPlayerDialog] = useState(false);
  const [pointActions, setPointActions] = useState<PointAction[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les actions depuis la base de données
  useEffect(() => {
    const loadActions = async () => {
      try {
        const actions = await analysisService.getPointActions();
        console.log('🔍 Actions chargées depuis la DB:', actions);
        setPointActions(actions);
      } catch (error) {
        console.error('Erreur lors du chargement des actions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActions();
  }, []);

  // Grouper les actions par category_2 pour éviter les doublons
  const getUniqueActions = (actions: PointAction[]) => {
    const uniqueActions = new Map();
    actions.forEach(action => {
      if (!uniqueActions.has(action.category_2)) {
        uniqueActions.set(action.category_2, action);
      }
    });
    return Array.from(uniqueActions.values());
  };

  const gagnéActions = getUniqueActions(pointActions.filter(action => action.category_1 === 'gagne'));
  const perduActions = getUniqueActions(pointActions.filter(action => action.category_1 === 'perdu'));

  // Récupérer les sous-tags (category_3) pour une action donnée
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

  // Récupérer les sub-sub-tags (category_4) pour une action donnée
  const getSubSubTags = (category2: string, category3: string) => {
    const uniqueSubSubTags = new Map();
    pointActions
      .filter(action => action.category_2 === category2 && action.category_3 === category3 && action.category_4)
      .forEach(action => {
        if (!uniqueSubSubTags.has(action.category_4)) {
          uniqueSubSubTags.set(action.category_4, {
            id: action.category_4,
            label: action.category_4
          });
        }
      });
    return Array.from(uniqueSubSubTags.values());
  };

  // Fonction de formatage intelligente pour les noms d'actions
  const formatActionName = (category2: string): string => {
    // Cas spéciaux pour les noms composés
    const specialCases: { [key: string]: string } = {
      'faute_directe_adverse': 'Faute directe adverse',
      'vibora_bandeja': 'Vibora/Bandeja',
      'winner_on_error': 'Winner on error',
      'unforced_error': 'Unforced error',
      'forced_error': 'Forced error'
    };

    if (specialCases[category2]) {
      return specialCases[category2];
    }

    // Formatage générique
    return category2
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  const handleTypeClick = (type: 'gagné' | 'perdu') => {
    setSelectedType(type);
    setShowActionDialog(true);
  };

  const handleActionClick = (action: PointAction) => {
    setSelectedAction(action);
    setShowActionDialog(false);
    
    if (!action.category_3) {
      // 2 clics : Action → Joueur
      setShowPlayerDialog(true);
    } else {
      // 3+ clics : Action → Sous-tag → ...
      setShowSubTagDialog(true);
    }
  };

  const handleSubTagClick = (subTag: { id: string; label: string }) => {
    setSelectedSubTag(subTag.id);
    setShowSubTagDialog(false);
    
    if (selectedAction?.category_2 === 'unforced_error') {
      // 4 clics pour Unforced Error : Action → Type de coup → Lieu → Joueur
      setShowSubSubTagDialog(true);
    } else {
      // 3 clics : Action → Sous-tag → Joueur
      setShowPlayerDialog(true);
    }
  };

  const handleSubSubTagClick = (subSubTag: { id: string; label: string }) => {
    setSelectedSubSubTag(subSubTag.id);
    setShowSubSubTagDialog(false);
    setShowPlayerDialog(true);
  };

  const handlePlayerSelect = (playerPosition: 'right' | 'left') => {
    setShowPlayerDialog(false);
    
    // Trouver l'ID spécifique pour la combinaison category_2 + category_3 + category_4
    let specificActionId = selectedAction!.id;
    
    if (selectedSubTag) {
      // Si on a une category_3 (comme "gauche", "droite", "milieu")
      const specificAction = pointActions.find(action => 
        action.category_2 === selectedAction!.category_2 && 
        action.category_3 === selectedSubTag &&
        action.category_4 === selectedSubSubTag
      );
      
      if (specificAction) {
        specificActionId = specificAction.id;
      } else if (!selectedSubSubTag) {
        // Si pas de category_4, chercher seulement avec category_2 + category_3
        const specificAction = pointActions.find(action => 
          action.category_2 === selectedAction!.category_2 && 
          action.category_3 === selectedSubTag
        );
        
        if (specificAction) {
          specificActionId = specificAction.id;
        }
      }
    }
    
    onPointAction(specificActionId.toString(), selectedSubTag, playerPosition);
    
    // Reset
    setSelectedType(null);
    setSelectedAction(null);
    setSelectedSubTag('');
    setSelectedSubSubTag('');
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
    <div className="space-y-4">
      {/* Première étape : Gagné ou Perdu */}
      <Card className="border-gray-200 bg-gray-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-800">🎾 Type de point</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => handleTypeClick('gagné')}
              className="h-16 text-lg bg-green-600 hover:bg-green-700 text-white"
            >
              <span className="mr-2">✅</span>
              Gagné
            </Button>
            <Button
              onClick={() => handleTypeClick('perdu')}
              className="h-16 text-lg bg-red-600 hover:bg-red-700 text-white"
            >
              <span className="mr-2">❌</span>
              Perdu
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Actions */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {selectedType === 'gagné' ? 'Points gagnés' : 'Points perdus'} - Choisir l'action
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(selectedType === 'gagné' ? gagnéActions : perduActions).map((action) => (
              <Button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className="w-full h-10 text-sm"
                variant="outline"
              >
                <span className="mr-2">🎾</span>
                {formatActionName(action.category_2)}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Sous-tags */}
      <Dialog open={showSubTagDialog} onOpenChange={setShowSubTagDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {selectedAction && formatActionName(selectedAction.category_2)} - Choisir le type
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedAction && getSubTags(selectedAction.category_2).map((subTag) => (
              <Button
                key={subTag.id}
                onClick={() => handleSubTagClick(subTag)}
                className="w-full h-10 text-sm"
                variant="outline"
              >
                <span className="mr-2">🎾</span>
                {formatActionName(subTag.label)}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Sub-sub-tags (pour Unforced Error) */}
      <Dialog open={showSubSubTagDialog} onOpenChange={setShowSubSubTagDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {selectedAction && formatActionName(selectedAction.category_2)} - Lieu de la faute
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedAction && selectedSubTag && getSubSubTags(selectedAction.category_2, selectedSubTag).map((subSubTag) => (
              <Button
                key={subSubTag.id}
                onClick={() => handleSubSubTagClick(subSubTag)}
                className="w-full h-10 text-sm"
                variant="outline"
              >
                <span className="mr-2">🎾</span>
                {formatActionName(subSubTag.label)}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Joueur */}
      <Dialog open={showPlayerDialog} onOpenChange={setShowPlayerDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Qui a fait cette action ?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Button
              onClick={() => handlePlayerSelect('right')}
              className="w-full h-10 text-sm"
              variant="outline"
            >
              {playerRight || 'Joueur Droite'}
            </Button>
            <Button
              onClick={() => handlePlayerSelect('left')}
              className="w-full h-10 text-sm"
              variant="outline"
            >
              {playerLeft || 'Joueur Gauche'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}