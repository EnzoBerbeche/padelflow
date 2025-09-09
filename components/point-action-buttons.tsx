'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { POINT_ACTIONS, PointActionDefinition, PointActionSubTag } from '@/lib/config/point-actions';

interface PointActionButtonsProps {
  onPointAction: (actionId: string, subTagId?: string, playerPosition?: 'right' | 'left') => void;
}

export default function PointActionButtons({ onPointAction }: PointActionButtonsProps) {
  const [selectedType, setSelectedType] = useState<'gagné' | 'perdu' | null>(null);
  const [selectedAction, setSelectedAction] = useState<PointActionDefinition | null>(null);
  const [selectedSubTag, setSelectedSubTag] = useState<string>('');
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showSubTagDialog, setShowSubTagDialog] = useState(false);
  const [showSubSubTagDialog, setShowSubSubTagDialog] = useState(false);
  const [showPlayerDialog, setShowPlayerDialog] = useState(false);

  const gagnéActions = POINT_ACTIONS.filter(action => action.color === 'green');
  const perduActions = POINT_ACTIONS.filter(action => action.color === 'red');

  const handleTypeClick = (type: 'gagné' | 'perdu') => {
    setSelectedType(type);
    setShowActionDialog(true);
  };

  const handleActionClick = (action: PointActionDefinition) => {
    setSelectedAction(action);
    setShowActionDialog(false);
    
    if (action.subTags.length === 0) {
      // 2 clics : Action → Joueur
      setShowPlayerDialog(true);
    } else {
      // 3+ clics : Action → Sous-tag → ...
      setShowSubTagDialog(true);
    }
  };

  const handleSubTagClick = (subTag: PointActionSubTag) => {
    setSelectedSubTag(subTag.id);
    setShowSubTagDialog(false);
    
    if (selectedAction?.id === 'unforced_error') {
      // 4 clics pour Unforced Error : Action → Type de coup → Lieu → Joueur
      setShowSubSubTagDialog(true);
    } else {
      // 3 clics : Action → Sous-tag → Joueur
      setShowPlayerDialog(true);
    }
  };

  const handleSubSubTagClick = (subSubTag: PointActionSubTag) => {
    setShowSubSubTagDialog(false);
    setShowPlayerDialog(true);
  };

  const handlePlayerSelect = (playerPosition: 'right' | 'left') => {
    setShowPlayerDialog(false);
    
    // Construire l'ID final avec tous les niveaux
    let finalActionId = selectedAction!.id;
    if (selectedSubTag) {
      finalActionId += `_${selectedSubTag}`;
    }
    
    onPointAction(finalActionId, undefined, playerPosition);
    
    // Reset
    setSelectedType(null);
    setSelectedAction(null);
    setSelectedSubTag('');
  };

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
                <span className="mr-2">{action.icon}</span>
                {action.label}
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
              {selectedAction?.label} - Choisir le type
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedAction?.subTags.map((subTag) => (
              <Button
                key={subTag.id}
                onClick={() => handleSubTagClick(subTag)}
                className="w-full h-10 text-sm"
                variant="outline"
              >
                <span className="mr-2">{subTag.icon || ''}</span>
                {subTag.label}
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
              {selectedAction?.label} - Lieu de la faute
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedAction?.subSubTags?.map((subSubTag) => (
              <Button
                key={subSubTag.id}
                onClick={() => handleSubSubTagClick(subSubTag)}
                className="w-full h-10 text-sm"
                variant="outline"
              >
                <span className="mr-2">{subSubTag.icon || ''}</span>
                {subSubTag.label}
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
              Joueur Droite
            </Button>
            <Button
              onClick={() => handlePlayerSelect('left')}
              className="w-full h-10 text-sm"
              variant="outline"
            >
              Joueur Gauche
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}