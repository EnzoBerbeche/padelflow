'use client';

import { useState } from 'react';
import { CSVParser } from '@/lib/csv-parser';
import { nationalPlayersAPI, SupabaseNationalPlayer } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, Search, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function TestCSVPage() {
  const { toast } = useToast();
  const [csvContent, setCsvContent] = useState('');
  const [gender, setGender] = useState<'men' | 'women'>('men');
  const [searchQuery, setSearchQuery] = useState('');
  const [players, setPlayers] = useState<SupabaseNationalPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const content = await file.text();
      setCsvContent(content);
      toast({
        title: "File loaded",
        description: `Loaded ${file.name} (${file.size} bytes)`,
      });
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "Error",
        description: "Failed to read file",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!csvContent) {
      toast({
        title: "No data",
        description: "Please upload a CSV file first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Test connection first
      const isConnected = await nationalPlayersAPI.testConnection();
      if (!isConnected) {
        toast({
          title: "Connection failed",
          description: "Cannot connect to Supabase. Check environment variables and table existence.",
          variant: "destructive",
        });
        return;
      }

      // Parse CSV
      const parsedPlayers = CSVParser.parseNationalPlayersCSV(csvContent, gender, {
        delimiter: ',',
        skipEmptyLines: true
      });

      console.log('Parsed players sample:', parsedPlayers.slice(0, 2));

      // Convert to Supabase format
      const supabasePlayers: SupabaseNationalPlayer[] = parsedPlayers.map(player => ({
        id: player.id,
        first_name: player.first_name,
        last_name: player.last_name,
        license_number: player.license_number,
        ranking: player.ranking,
        best_ranking: player.best_ranking,
        points: player.points,
        club: player.club,
        league: player.league,
        birth_year: player.birth_year,
        nationality: player.nationality,
        gender: player.gender,
        tournaments_count: player.tournaments_count,
        last_updated: player.last_updated,
      }));

      // Import to Supabase
      const success = await nationalPlayersAPI.importFromCSV(supabasePlayers, gender);
      
      if (success) {
        toast({
          title: "Import successful",
          description: `Imported ${gender} players to Supabase database`,
        });
        
        // Refresh the players list
        const allPlayers = await nationalPlayersAPI.getAll();
        setPlayers(allPlayers);
      } else {
        toast({
          title: "Import failed",
          description: "Error importing to Supabase. Check console for details.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: "Error importing CSV data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const results = await nationalPlayersAPI.search(searchQuery, { gender });
      setPlayers(results);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: "Error searching database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    setIsLoading(true);
    try {
      const success = await nationalPlayersAPI.clear();
      if (success) {
        setPlayers([]);
        toast({
          title: "Database cleared",
          description: "All national players removed from Supabase",
        });
      } else {
        toast({
          title: "Clear failed",
          description: "Error clearing database",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Clear error:', error);
      toast({
        title: "Clear failed",
        description: "Error clearing database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRankingColor = (ranking: number) => {
    if (ranking <= 25) return 'bg-green-100 text-green-800';
    if (ranking <= 100) return 'bg-blue-100 text-blue-800';
    if (ranking <= 250) return 'bg-purple-100 text-purple-800';
    if (ranking <= 500) return 'bg-orange-100 text-orange-800';
    if (ranking <= 1000) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CSV Parser Test</h1>
          <p className="text-gray-600 mt-2">Test the national players CSV import functionality</p>
        </div>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Upload CSV File</span>
            </CardTitle>
            <CardDescription>
              Upload a CSV file to test the parser
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as 'men' | 'women')}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full"
              >
                <option value="men">Men</option>
                <option value="women">Women</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="file">CSV File</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isLoading}
              />
            </div>

            <div className="flex space-x-2">
              <Button onClick={handleImport} disabled={!csvContent || isLoading}>
                Import to Database
              </Button>
              <Button onClick={handleClear} variant="outline">
                Clear Database
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Search Players</span>
            </CardTitle>
            <CardDescription>
              Search imported players
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Search by name, license, or club..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button onClick={handleSearch}>
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Players ({players.length})</span>
            </CardTitle>
            <CardDescription>
              Found players in the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            {players.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No players found. Try importing some data first.
              </div>
            ) : (
              <div className="space-y-4">
                {players.slice(0, 20).map((player) => (
                  <div key={player.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">
                          {player.first_name} {player.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          License: {player.license_number} • Club: {player.club}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={getRankingColor(player.ranking)}>
                          #{player.ranking}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          Best: #{player.best_ranking}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Points: {player.points}</span>
                      <span>League: {player.league}</span>
                      <span>Tournaments: {player.tournaments_count}</span>
                      <span>Birth: {player.birth_year}</span>
                    </div>
                  </div>
                ))}
                {players.length > 20 && (
                  <div className="text-center py-4 text-gray-500">
                    Showing first 20 results of {players.length} total
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 