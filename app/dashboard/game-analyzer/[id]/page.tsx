'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Undo2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAnalysis } from '@/hooks/use-analysis';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';



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

  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<'player1' | 'player2' | null>(null);
  const [showSubTagDialog, setShowSubTagDialog] = useState(false);
  const [showSubSubTagDialog, setShowSubSubTagDialog] = useState(false);
  const [showDirectionDialog, setShowDirectionDialog] = useState(false);
  const [showPlayerDialog, setShowPlayerDialog] = useState(false);
  const [showFaultLocationDialog, setShowFaultLocationDialog] = useState(false);
  const [selectedSubTag, setSelectedSubTag] = useState<any>(null);
  const [selectedSubSubTag, setSelectedSubSubTag] = useState<any>(null);
  const [selectedDirection, setSelectedDirection] = useState<any>(null);
  const [selectedFaultLocation, setSelectedFaultLocation] = useState<any>(null);


  const handlePointAction = async (actionKey: string, playerPosition?: 'player1' | 'player2') => {
    try {
      await addPoint(actionKey, playerPosition);
      toast({
        title: "Point enregistré",
        description: "Le point a été ajouté avec succès",
      });
    } catch (error) {
      console.error('Error adding point:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le point",
        variant: "destructive",
      });
    }
  };

  const handleSimplePointAction = (actionType: 'gagne' | 'perdu') => {
    if (!analysis) {
      toast({
        title: "Erreur",
        description: "Analyse non chargée",
        variant: "destructive",
      });
      return;
    }

    // Déclencher le système de sous-catégories
    setSelectedAction(actionType);
    setShowSubTagDialog(true);
  };

  const handleSubTagClick = async (subTag: any) => {
    setShowSubTagDialog(false);
    setSelectedSubTag(subTag);

    // Actions avec directions (Droite, Gauche, Milieu) - Points gagnés
    const actionsWithDirection = ['passing', 'volley', 'lob', 'vibora_bandeja', 'bajada'];
    
    // Actions avec types spécifiques (Par 3, Par 4, A/R) - Points gagnés
    const actionsWithTypes = ['smash'];
    
    // Actions sans sous-catégorie et sans joueur - Points gagnés
    const actionsWithoutPlayer = ['faute_direct_adverse'];
    
    // Actions sans sous-catégorie et sans joueur - Points perdus
    const actionsWithoutPlayerPerdu = ['forced_error'];
    
    // Actions sans sous-catégorie mais avec joueur
    const actionsWithoutSubCategory = [];
    
    // Actions avec sous-catégories spécifiques - Points perdus
    const actionsWithSpecificSubCategories = ['winner_on_error'];

    if (subTag.id === 'unforced_error') {
      setShowSubSubTagDialog(true);
    } else if (actionsWithDirection.includes(subTag.id)) {
      setShowDirectionDialog(true);
    } else if (actionsWithTypes.includes(subTag.id)) {
      setShowSubSubTagDialog(true);
    } else if (actionsWithoutPlayer.includes(subTag.id) || actionsWithoutPlayerPerdu.includes(subTag.id)) {
      // Actions qui n'ont pas besoin de joueur - enregistrer directement
      const actionKey = `${selectedAction}_${subTag.id}`;
      
      // Enregistrer le point via Supabase
      try {
        await handlePointAction(actionKey, undefined);
        resetState();
      } catch (error) {
        console.error('Error recording point:', error);
      }
    } else if (actionsWithSpecificSubCategories.includes(subTag.id)) {
      setShowSubSubTagDialog(true);
    } else {
      setShowPlayerDialog(true);
    }
  };

  const handleSubSubTagClick = (subSubTag: any) => {
    setShowSubSubTagDialog(false);
    setSelectedSubSubTag(subSubTag);
    
    // Pour Unforced Error, on va au 4ème niveau (lieu de la faute)
    if (selectedSubTag?.id === 'unforced_error') {
      setShowFaultLocationDialog(true);
    } else {
      setShowPlayerDialog(true);
    }
  };

  const handleDirectionClick = (direction: any) => {
    setShowDirectionDialog(false);
    setSelectedDirection(direction);
    setShowPlayerDialog(true);
  };

  const handleFaultLocationClick = (faultLocation: any) => {
    setShowFaultLocationDialog(false);
    setSelectedFaultLocation(faultLocation);
    setShowPlayerDialog(true);
  };

  const handlePlayerSelection = async (player: 'player1' | 'player2') => {
    setShowPlayerDialog(false);
    setSelectedPlayer(player);
    
    // Enregistrer le point avec toutes les informations
    let actionKey = selectedAction || 'unknown';
    
    if (selectedSubTag) {
      actionKey += `_${selectedSubTag.id}`;
    }
    
    if (selectedDirection) {
      actionKey += `_${selectedDirection.id}`;
    }
    
    if (selectedSubSubTag) {
      actionKey += `_${selectedSubSubTag.id}`;
    }
    
    if (selectedFaultLocation) {
      actionKey += `_${selectedFaultLocation.id}`;
    }

    // Enregistrer le point via Supabase
    try {
      await handlePointAction(actionKey, player);
      resetState();
    } catch (error) {
      console.error('Error recording point:', error);
    }
  };

  const resetState = () => {
    setSelectedAction(null);
    setSelectedPlayer(null);
    setSelectedSubTag(null);
    setSelectedSubSubTag(null);
    setSelectedDirection(null);
    setSelectedFaultLocation(null);
    setShowSubTagDialog(false);
    setShowSubSubTagDialog(false);
    setShowDirectionDialog(false);
    setShowPlayerDialog(false);
    setShowFaultLocationDialog(false);
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
        <div className="h-screen flex flex-col overflow-hidden">
          {/* Header minimaliste */}
          <div className="flex items-center justify-between p-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/game-analyzer">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={undoLastPoint} disabled={points.length === 0}>
                <Undo2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Boutons principaux - prennent tout l'espace */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 grid grid-cols-2 gap-2 p-4">
              {/* Bouton Gagné */}
              <button
                onClick={() => handleSimplePointAction('gagne')}
                className="bg-green-500 hover:bg-green-600 text-white font-bold text-4xl rounded-lg flex flex-col items-center justify-center h-full transition-colors"
              >
                <div>Gagné</div>
                <div className="text-6xl mt-2">✅</div>
              </button>

              {/* Bouton Perdu */}
              <button
                onClick={() => handleSimplePointAction('perdu')}
                className="bg-red-500 hover:bg-red-600 text-white font-bold text-4xl rounded-lg flex flex-col items-center justify-center h-full transition-colors"
              >
                <div>Perdu</div>
                <div className="text-6xl mt-2">❌</div>
              </button>
            </div>
          </div>


          {/* Dialog pour les sous-catégories */}
          <Dialog open={showSubTagDialog} onOpenChange={setShowSubTagDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {selectedAction === 'gagne' ? 'Points gagnés' : 'Points perdus'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {selectedAction === 'gagne' ? (
                  <>
                    <button
                      onClick={() => handleSubTagClick({ id: 'passing', label: 'Passing' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      🏃 Passing
                    </button>
                    <button
                      onClick={() => handleSubTagClick({ id: 'volley', label: 'Volley' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      ✋ Volley
                    </button>
                    <button
                      onClick={() => handleSubTagClick({ id: 'smash', label: 'Smash' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      💥 Smash
                    </button>
                    <button
                      onClick={() => handleSubTagClick({ id: 'lob', label: 'Lob' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      🏸 Lob
                    </button>
                    <button
                      onClick={() => handleSubTagClick({ id: 'vibora_bandeja', label: 'Vibora/Bandeja' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      🎯 Vibora/Bandeja
                    </button>
                    <button
                      onClick={() => handleSubTagClick({ id: 'bajada', label: 'Bajada' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      ⬇️ Bajada
                    </button>
                    <button
                      onClick={() => handleSubTagClick({ id: 'faute_direct_adverse', label: 'Faute direct Adverse' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      ❌ Faute direct Adverse
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleSubTagClick({ id: 'forced_error', label: 'Forced Error' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      ⚡ Forced Error
                    </button>
                    <button
                      onClick={() => handleSubTagClick({ id: 'winner_on_error', label: 'Winner on error' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      🎯 Winner on error
                    </button>
                    <button
                      onClick={() => handleSubTagClick({ id: 'unforced_error', label: 'Unforced Error' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      🚫 Unforced Error
                    </button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog pour la sélection de direction */}
          <Dialog open={showDirectionDialog} onOpenChange={setShowDirectionDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Direction</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <button
                  onClick={() => handleDirectionClick({ id: 'gauche', label: 'Gauche' })}
                  className="p-3 text-center border rounded-lg hover:bg-gray-50"
                >
                  ⬅️ Gauche
                </button>
                <button
                  onClick={() => handleDirectionClick({ id: 'milieu', label: 'Milieu' })}
                  className="p-3 text-center border rounded-lg hover:bg-gray-50"
                >
                  ⬆️ Milieu
                </button>
                <button
                  onClick={() => handleDirectionClick({ id: 'droite', label: 'Droite' })}
                  className="p-3 text-center border rounded-lg hover:bg-gray-50"
                >
                  ➡️ Droite
                </button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog pour les sous-sous-catégories (Smash types, Winner on error, ou Unforced Error) */}
          <Dialog open={showSubSubTagDialog} onOpenChange={setShowSubSubTagDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {selectedSubTag?.id === 'smash' ? 'Type de Smash' : 
                   selectedSubTag?.id === 'winner_on_error' ? 'Type d\'erreur' :
                   'Type de coup'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {selectedSubTag?.id === 'smash' ? (
                  <>
                    <button
                      onClick={() => handleSubSubTagClick({ id: 'par_3', label: 'Par 3' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      💥 Par 3
                    </button>
                    <button
                      onClick={() => handleSubSubTagClick({ id: 'par_4', label: 'Par 4' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      💥 Par 4
                    </button>
                    <button
                      onClick={() => handleSubSubTagClick({ id: 'ar', label: 'A/R' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      💥 A/R
                    </button>
                  </>
                ) : selectedSubTag?.id === 'winner_on_error' ? (
                  <>
                    <button
                      onClick={() => handleSubSubTagClick({ id: 'contre_smash', label: 'Contre-smash' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      💥 Contre-smash
                    </button>
                    <button
                      onClick={() => handleSubSubTagClick({ id: 'lob_court', label: 'Lob court' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      🏸 Lob court
                    </button>
                    <button
                      onClick={() => handleSubSubTagClick({ id: 'erreur_zone', label: 'Erreur de zone' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      🎯 Erreur de zone
                    </button>
                  </>
                ) : (
                  // Unforced Error - Types de coups (Category_3)
                  <>
                    <button
                      onClick={() => handleSubSubTagClick({ id: 'passing', label: 'Passing' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      🏃 Passing
                    </button>
                    <button
                      onClick={() => handleSubSubTagClick({ id: 'volley', label: 'Volley' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      ✋ Volley
                    </button>
                    <button
                      onClick={() => handleSubSubTagClick({ id: 'smash', label: 'Smash' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      💥 Smash
                    </button>
                    <button
                      onClick={() => handleSubSubTagClick({ id: 'lob', label: 'Lob' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      🏸 Lob
                    </button>
                    <button
                      onClick={() => handleSubSubTagClick({ id: 'vibora_bandeja', label: 'Vibora/Bandeja' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      🎯 Vibora/Bandeja
                    </button>
                    <button
                      onClick={() => handleSubSubTagClick({ id: 'bajada', label: 'Bajada' })}
                      className="p-3 text-left border rounded-lg hover:bg-gray-50"
                    >
                      ⬇️ Bajada
                    </button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog pour le lieu de la faute (4ème niveau - Unforced Error) */}
          <Dialog open={showFaultLocationDialog} onOpenChange={setShowFaultLocationDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Lieu de la faute</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <button
                  onClick={() => handleFaultLocationClick({ id: 'filet', label: 'Filet' })}
                  className="p-3 text-center border rounded-lg hover:bg-gray-50"
                >
                  🚫 Filet
                </button>
                <button
                  onClick={() => handleFaultLocationClick({ id: 'vitre', label: 'Vitre' })}
                  className="p-3 text-center border rounded-lg hover:bg-gray-50"
                >
                  🚫 Vitre
                </button>
                <button
                  onClick={() => handleFaultLocationClick({ id: 'grille', label: 'Grille' })}
                  className="p-3 text-center border rounded-lg hover:bg-gray-50"
                >
                  🚫 Grille
                </button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog pour la sélection du joueur */}
          <Dialog open={showPlayerDialog} onOpenChange={setShowPlayerDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Qui a fait l'action ?</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <button
                  onClick={() => handlePlayerSelection('player2')}
                  className="p-4 text-center border rounded-lg hover:bg-gray-50"
                >
                  <div className="text-lg font-medium">{analysis?.player_left}</div>
                  <div className="text-sm text-gray-500">Joueur Gauche</div>
                </button>
                <button
                  onClick={() => handlePlayerSelection('player1')}
                  className="p-4 text-center border rounded-lg hover:bg-gray-50"
                >
                  <div className="text-lg font-medium">{analysis?.player_right}</div>
                  <div className="text-sm text-gray-500">Joueur Droite</div>
                </button>
              </div>
            </DialogContent>
          </Dialog>


        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
