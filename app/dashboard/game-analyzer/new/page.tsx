'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Users, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewGamePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    team1_player1: '',
    team1_player2: '',
    team2_player1: 'Adversaire 1',
    team2_player2: 'Adversaire 2',
    sets_to_win: 2,
    games_per_set: 6,
    no_advantage: true,
    tie_break_enabled: true,
    player_right_source: "manual",
    player_left_source: "manual",
    opponent_right_source: "manual",
    opponent_left_source: "manual",
  });

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.team1_player1 || !formData.team1_player2) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir les noms des joueurs de votre équipe",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // TODO: Implémenter l'API pour créer la partie
      // Pour l'instant, on simule la création
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newGameId = 'new-game-' + Date.now();
      
      toast({
        title: "Succès",
        description: "Partie créée avec succès !",
      });
      
      // Redirection vers la page de suivi du match
      router.push(`/dashboard/game-analyzer/${newGameId}`);
      
    } catch (error) {
      console.error('Error creating game:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la partie",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/game-analyzer">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Nouvelle partie</h1>
              <p className="text-gray-600 mt-2">
                Configurez votre match de padel
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Configuration des équipes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Configuration des équipes</span>
                </CardTitle>
                <CardDescription>
                  Définissez les joueurs et le format du match
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  {/* Votre équipe */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Votre équipe</Label>
                      <p className="text-sm text-gray-600 mt-1">
                        Sélectionnez vos joueurs ou saisissez leurs noms
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Joueur Droite */}
                      <div className="space-y-2">
                        <Label htmlFor="player_right">Joueur Droite</Label>
                        <div className="space-y-2">
                          <Select 
                            value={formData.player_right_source || "manual"} 
                            onValueChange={(value) => setFormData(prev => ({ ...prev, player_right_source: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">Saisie manuelle</SelectItem>
                              <SelectItem value="myplayers">My Players</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {formData.player_right_source === "manual" ? (
                            <Input
                              id="player_right"
                              placeholder="Nom du joueur"
                              value={formData.team1_player1}
                              onChange={(e) => handleInputChange('team1_player1', e.target.value)}
                              required
                            />
                          ) : (
                            <div className="space-y-2">
                              <Select
                                value={formData.team1_player1}
                                onValueChange={(value) => handleInputChange('team1_player1', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un joueur" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Jean Dupont">Jean Dupont</SelectItem>
                                  <SelectItem value="Marie Martin">Marie Martin</SelectItem>
                                  <SelectItem value="Pierre Durand">Pierre Durand</SelectItem>
                                  <SelectItem value="Sophie Bernard">Sophie Bernard</SelectItem>
                                  <SelectItem value="Lucas Moreau">Lucas Moreau</SelectItem>
                                  <SelectItem value="Emma Dubois">Emma Dubois</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Joueur Gauche */}
                      <div className="space-y-2">
                        <Label htmlFor="player_left">Joueur Gauche</Label>
                        <div className="space-y-2">
                          <Select 
                            value={formData.player_left_source || "manual"} 
                            onValueChange={(value) => setFormData(prev => ({ ...prev, player_left_source: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">Saisie manuelle</SelectItem>
                              <SelectItem value="myplayers">My Players</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {formData.player_left_source === "manual" ? (
                            <Input
                              id="player_left"
                              placeholder="Nom du joueur"
                              value={formData.team1_player2}
                              onChange={(e) => handleInputChange('team1_player2', e.target.value)}
                              required
                            />
                          ) : (
                            <div className="space-y-2">
                              <Select
                                value={formData.team1_player2}
                                onValueChange={(value) => handleInputChange('team1_player2', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un joueur" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Jean Dupont">Jean Dupont</SelectItem>
                                  <SelectItem value="Marie Martin">Marie Martin</SelectItem>
                                  <SelectItem value="Pierre Durand">Pierre Durand</SelectItem>
                                  <SelectItem value="Sophie Bernard">Sophie Bernard</SelectItem>
                                  <SelectItem value="Lucas Moreau">Lucas Moreau</SelectItem>
                                  <SelectItem value="Emma Dubois">Emma Dubois</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Équipe adverse */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Équipe adverse</Label>
                      <p className="text-sm text-gray-600 mt-1">
                        Sélectionnez les adversaires ou saisissez leurs noms
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Adversaire Droite */}
                      <div className="space-y-2">
                        <Label htmlFor="opponent_right">Adversaire Droite</Label>
                        <div className="space-y-2">
                          <Select 
                            value={formData.opponent_right_source || "manual"} 
                            onValueChange={(value) => setFormData(prev => ({ ...prev, opponent_right_source: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">Saisie manuelle</SelectItem>
                              <SelectItem value="myplayers">My Players</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {formData.opponent_right_source === "manual" ? (
                            <Input
                              id="opponent_right"
                              placeholder="Nom de l'adversaire"
                              value={formData.team2_player1}
                              onChange={(e) => handleInputChange('team2_player1', e.target.value)}
                            />
                          ) : (
                            <div className="space-y-2">
                              <Select
                                value={formData.team2_player1}
                                onValueChange={(value) => handleInputChange('team2_player1', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un joueur" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Jean Dupont">Jean Dupont</SelectItem>
                                  <SelectItem value="Marie Martin">Marie Martin</SelectItem>
                                  <SelectItem value="Pierre Durand">Pierre Durand</SelectItem>
                                  <SelectItem value="Sophie Bernard">Sophie Bernard</SelectItem>
                                  <SelectItem value="Lucas Moreau">Lucas Moreau</SelectItem>
                                  <SelectItem value="Emma Dubois">Emma Dubois</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Adversaire Gauche */}
                      <div className="space-y-2">
                        <Label htmlFor="opponent_left">Adversaire Gauche</Label>
                        <div className="space-y-2">
                          <Select
                            value={formData.opponent_left_source || "manual"} 
                            onValueChange={(value) => setFormData(prev => ({ ...prev, opponent_left_source: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">Saisie manuelle</SelectItem>
                              <SelectItem value="myplayers">My Players</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {formData.opponent_left_source === "manual" ? (
                            <Input
                              id="opponent_left"
                              placeholder="Nom de l'adversaire"
                              value={formData.team2_player2}
                              onChange={(e) => handleInputChange('team2_player2', e.target.value)}
                            />
                          ) : (
                            <div className="space-y-2">
                              <Select
                                value={formData.team2_player2}
                                onValueChange={(value) => handleInputChange('team2_player2', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un joueur" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Jean Dupont">Jean Dupont</SelectItem>
                                  <SelectItem value="Marie Martin">Marie Martin</SelectItem>
                                  <SelectItem value="Pierre Durand">Pierre Durand</SelectItem>
                                  <SelectItem value="Sophie Bernard">Sophie Bernard</SelectItem>
                                  <SelectItem value="Lucas Moreau">Lucas Moreau</SelectItem>
                                  <SelectItem value="Emma Dubois">Emma Dubois</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
              </CardContent>
            </Card>

            {/* Configuration du match */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Configuration du match</span>
                </CardTitle>
                <CardDescription>
                  Définissez les règles et le format du match
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="sets_to_win">Nombre de sets</Label>
                    <Select 
                      value={formData.sets_to_win.toString()} 
                      onValueChange={(value) => handleInputChange('sets_to_win', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 set</SelectItem>
                        <SelectItem value="2">2 sets</SelectItem>
                        <SelectItem value="3">3 sets</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="games_per_set">Jeux par set</Label>
                    <Select 
                      value={formData.games_per_set.toString()} 
                      onValueChange={(value) => handleInputChange('games_per_set', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4 jeux</SelectItem>
                        <SelectItem value="6">6 jeux</SelectItem>
                        <SelectItem value="8">8 jeux</SelectItem>
                        <SelectItem value="9">9 jeux (tie-break à 8-8)</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.games_per_set === 9 && (
                      <p className="text-xs text-gray-500">
                        Format populaire : tie-break automatique à 8-8
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tie_break">Tie-break</Label>
                    <div className="flex items-center space-x-2 pt-2">
                      <Switch
                        id="tie_break"
                        checked={formData.tie_break_enabled}
                        onCheckedChange={(checked) => handleInputChange('tie_break_enabled', checked)}
                      />
                      <Label htmlFor="tie_break" className="text-sm">
                        {formData.tie_break_enabled ? 'Activé' : 'Désactivé'}
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="no_advantage">Règle de score</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      id="no_advantage"
                      checked={formData.no_advantage}
                      onCheckedChange={(checked) => handleInputChange('no_advantage', checked)}
                    />
                    <Label htmlFor="no_advantage" className="text-sm">
                      {formData.no_advantage ? 'No Ad (pas d\'avantage)' : 'Avantage classique'}
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formData.no_advantage 
                      ? 'À 40-40, le prochain point gagne le jeu' 
                      : 'À 40-40, il faut gagner 2 points d\'écart pour remporter le jeu'
                    }
                  </p>
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
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Création...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer la partie
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
