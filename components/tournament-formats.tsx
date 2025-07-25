'use client';

import { useState, useEffect } from 'react';
import { storage, Tournament, TeamWithPlayers } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Calendar, X, AlertTriangle, Shuffle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAvailableJsonFormats, getFormatByKey, TournamentFormatConfig } from '@/lib/tournament-formats-json';
import { JsonBracketGenerator, RandomAssignments, generate8TeamBracketTree } from '@/lib/json-bracket-generator';
import { resolveTeamSource } from '@/lib/team-source-resolver';
import { RandomDrawDialog } from './random-draw-dialog';

interface TournamentFormatsProps {
  tournament: Tournament;
  teams: TeamWithPlayers[];
  onFormatSelect: () => void;
}

export function TournamentFormats({ tournament, teams, onFormatSelect }: TournamentFormatsProps) {
  const { toast } = useToast();
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRandomDraw, setShowRandomDraw] = useState(false);
  const [pendingFormatKey, setPendingFormatKey] = useState<string | null>(null);
  const [pendingRandomSources, setPendingRandomSources] = useState<string[]>([]);
  const [pendingRandomOccurrences, setPendingRandomOccurrences] = useState<{key: string, base: string, index: number}[]>([]);
  const [availableFormats, setAvailableFormats] = useState<TournamentFormatConfig[]>([]);
  const [formatsLoading, setFormatsLoading] = useState(true);
  const [currentFormat, setCurrentFormat] = useState<TournamentFormatConfig | null>(null);

  useEffect(() => {
    // Check if tournament has a selected format
    if (tournament.format_id) {
      setSelectedFormat(tournament.format_id);
      // Load the current format
      const loadCurrentFormat = async () => {
        const format = await getFormatByKey(tournament.format_id!);
        setCurrentFormat(format);
      };
      loadCurrentFormat();
    } else {
      setSelectedFormat(null);
      setCurrentFormat(null);
    }
  }, [tournament.format_id]);

  useEffect(() => {
    // Load available formats
    const loadFormats = async () => {
      setFormatsLoading(true);
      try {
        const formats = await getAvailableJsonFormats(teams.length);
        setAvailableFormats(formats);
      } catch (error) {
        console.error('Error loading formats:', error);
        toast({
          title: "Error",
          description: "Failed to load tournament formats",
          variant: "destructive",
        });
      } finally {
        setFormatsLoading(false);
      }
    };

    loadFormats();
  }, [teams.length, toast]);

  const selectFormat = async (formatKey: string) => {
    const format = await getFormatByKey(formatKey);
    if (!format) return;

    // Détecter tous les groupes random_X_Y dans le format
    const formatJson = format.format_data;
    const rotations = (formatJson.rotations || []) as any[];
    const allMatches = rotations.flatMap((r: any) => r.phases.flatMap((p: any) => p.matches)) || [];
    // Générer la liste complète des occurrences random_X_Y (avec index)
    const occurrences: {key: string, base: string, index: number}[] = [];
    const randomCount: Record<string, number> = {};
    for (const match of allMatches) {
      for (const src of [match.source_team_1, match.source_team_2]) {
        if (src && /^random_\d+_\d+$/.test(src)) {
          randomCount[src] = (randomCount[src] || 0) + 1;
          occurrences.push({ key: `${src}_${randomCount[src]}`, base: src, index: randomCount[src] });
        }
      }
    }
    if (occurrences.length > 0) {
      setPendingFormatKey(formatKey);
      setPendingRandomOccurrences(occurrences);
      setShowRandomDraw(true);
      return;
    }
    // Pas de random, on procède normalement
    proceedWithFormatSelection(formatKey);
  };

  const proceedWithFormatSelection = async (formatKey: string, randomAssignments?: RandomAssignments) => {
    setLoading(true);
    try {
      const format = await getFormatByKey(formatKey);
      if (!format) throw new Error('Format not found');

      // Dupliquer le JSON du format et le stocker dans le tournoi
      const formatJsonCopy = JSON.parse(JSON.stringify(format.format_data));
      storage.tournaments.update(tournament.id, { format_id: formatKey, format_json: formatJsonCopy });

      // Stocker les random_assignments si besoin
      if (randomAssignments) {
        storage.tournaments.update(tournament.id, { random_assignments: randomAssignments });
      }

      // Générer les matchs comme avant
      if (format.format_data.bracket) {
        const bracketTree = generateBracketTreeFromFormat(format.format_data, teams, randomAssignments);
        storage.tournaments.update(tournament.id, { bracket: bracketTree });
        generateMatchesFromBracketTree(tournament.id, bracketTree, teams);
      } else if (format.format_data.matches) {
        const generator = new JsonBracketGenerator(
          tournament.id,
          teams,
          format.format_data,
          randomAssignments || {}
        );
        generator.generateMatches();
      }
      onFormatSelect();
      toast({
        title: "Success",
        description: "Tournament format selected!",
      });
    } catch (error) {
      console.error('Error selecting format:', error);
      toast({
        title: "Error",
        description: "Failed to select format",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to generate bracket tree from format with actual teams
  const generateBracketTreeFromFormat = (formatData: any, teams: TeamWithPlayers[], randomAssignments?: any) => {
    // For 8-team format, use the existing function
    if (formatData.format_name?.includes('8 équipes')) {
      return generate8TeamBracketTree(teams);
    }
    
    // For other formats, you can add more logic here
    return formatData.bracket;
  };

  // Helper function to generate matches from bracket tree for storage
  const generateMatchesFromBracketTree = (tournamentId: string, bracketTree: any, teams: TeamWithPlayers[]) => {
    // Clear existing matches
    storage.matches.deleteByTournament(tournamentId);
    
    // Extract matches from the bracket tree
    const matches: any[] = [];
    extractMatchesFromBracketTreeForStorage(bracketTree, matches, 1);
    
    // Create match records in storage
    matches.forEach((match, index) => {
      const homeTeam = teams.find(t => t.id === match.home_team_id);
      const visitorTeam = teams.find(t => t.id === match.visitor_team_id);
      
      storage.matches.create({
        tournament_id: tournamentId,
        round: match.name,
        team_1_id: match.home_team_id,
        team_2_id: match.visitor_team_id,
        order_index: index + 1,
        match_type: 'main',
        bracket_type: 'main',
        json_match_id: match.id,
        stage: match.name,
        bracket_location: 'Main bracket',
        ranking_game: false,
        team1_source: `team_${match.home_team_id}`,
        team2_source: `team_${match.visitor_team_id}`,
      });
    });
  };

  // Helper function to extract matches from bracket tree for storage
  const extractMatchesFromBracketTreeForStorage = (node: any, matches: any[] = [], orderIndex: number = 1): number => {
    if (!node || !node.sides) return orderIndex;
    
    // If both sides have teams, this is a match
    if (node.sides.home?.team?.id && node.sides.visitor?.team?.id) {
      matches.push({
        id: node.id,
        name: node.name,
        home_team_id: node.sides.home.team.id,
        visitor_team_id: node.sides.visitor.team.id,
        order_index: orderIndex,
      });
      orderIndex++;
    }
    
    // Recursively process children
    if (node.sides.home?.child) {
      orderIndex = extractMatchesFromBracketTreeForStorage(node.sides.home.child, matches, orderIndex);
    }
    if (node.sides.visitor?.child) {
      orderIndex = extractMatchesFromBracketTreeForStorage(node.sides.visitor.child, matches, orderIndex);
    }
    
    return orderIndex;
  };

  const handleRandomDrawComplete = (randomAssignments: RandomAssignments) => {
    if (pendingFormatKey) {
      // Stocker les random_assignments dans le tournoi
      storage.tournaments.update(tournament.id, { random_assignments: randomAssignments });
      // Mettre à jour le template JSON avec les équipes tirées
      const tournamentData = storage.tournaments.getById(tournament.id);
      const template = tournamentData?.format_json;
      if (template) {
        for (const rotation of template.rotations) {
          for (const phase of rotation.phases) {
            for (const match of phase.matches) {
              const team1 = resolveTeamSource(match.source_team_1, teams, [], randomAssignments as any);
              const team2 = resolveTeamSource(match.source_team_2, teams, [], randomAssignments as any);
              match.team_1 = team1 ? team1.name : '';
              match.team_2 = team2 ? team2.name : '';
            }
          }
        }
        storage.tournaments.update(tournament.id, { format_json: template });
      }
      proceedWithFormatSelection(pendingFormatKey, randomAssignments);
      setPendingFormatKey(null);
    }
  };

  const unselectFormat = () => {
    setLoading(true);
    try {
      // Remove format and format_json from tournament
      storage.tournaments.update(tournament.id, { format_id: undefined, format_json: undefined, random_assignments: undefined });
      // Delete all matches for this tournament
      storage.matches.deleteByTournament(tournament.id);
      onFormatSelect();
      toast({
        title: "Success",
        description: "Format unselected and matches deleted!",
      });
    } catch (error) {
      console.error('Error unselecting format:', error);
      toast({
        title: "Error",
        description: "Failed to unselect format",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || formatsLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold">Tournament Format</h2>
          <p className="text-gray-600">
            Select a format for your {teams.length}-team tournament
          </p>
        </div>

        {/* Current Format */}
        {currentFormat && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-green-800">{currentFormat.name}</CardTitle>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={unselectFormat}
                  disabled={loading}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Unselect Format
                </Button>
              </div>
              <CardDescription className="text-green-700">
                Format selected and matches generated with all random assignments completed. You can unselect this format to choose a different one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Unselecting this format will delete all generated matches and random assignments</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Formats */}
        {!selectedFormat && (
          <>
            {availableFormats.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No formats available</h3>
                  <p className="text-gray-500">
                    No tournament formats are available for {teams.length} teams. 
                    Contact support to add formats for this team count.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {availableFormats.map((format, index) => {
                  return (
                    <Card key={format.format_key} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-lg font-bold">{format.format_data.format_name || format.name}</span>
                            <div className="flex items-center space-x-2 mt-1">
                              <Shuffle className="h-4 w-4 text-purple-600" />
                              <span>{format.name}</span>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {format.min_teams}-{format.max_teams} teams
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {format.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="text-sm text-gray-600">
                            {Array.isArray(format.format_data.features)
                              ? format.format_data.features.map((feature, i) => (
                                  <p key={i}>✓ {feature}</p>
                                ))
                              : null}
                          </div>
                          <Button 
                            onClick={() => selectFormat(format.format_key)}
                            disabled={loading}
                            className="w-full"
                          >
                            {loading ? 'Génération en cours...' : 'Choisir ce format'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      <RandomDrawDialog
        open={showRandomDraw}
        onClose={() => setShowRandomDraw(false)}
        teams={teams}
        randomOccurrences={pendingRandomOccurrences}
        onComplete={(assignments) => {
          if (pendingFormatKey) {
            proceedWithFormatSelection(pendingFormatKey, assignments as any);
            setPendingFormatKey(null);
            setPendingRandomOccurrences([]);
          }
        }}
      />
    </>
  );
}

