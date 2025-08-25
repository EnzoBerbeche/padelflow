'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { migrateTournamentFormats, checkExistingFormats, clearAllFormats } from '@/lib/migrate-formats';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MigrateFormatsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ successCount: number; errorCount: number } | null>(null);
  const [existingFormats, setExistingFormats] = useState<any[]>([]);
  const { toast } = useToast();
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();

  // Redirect non-admin users
  useEffect(() => {
    if (!roleLoading && role !== 'admin') {
      router.push('/dashboard');
    }
  }, [role, roleLoading, router]);

  if (roleLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (role !== 'admin') {
    return null; // Will redirect
  }

  const handleCheckExisting = async () => {
    setIsLoading(true);
    try {
      const formats = await checkExistingFormats();
      setExistingFormats(formats);
      toast({
        title: "Check Complete",
        description: `Found ${formats.length} existing formats`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check existing formats",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMigrate = async () => {
    setIsLoading(true);
    try {
      const result = await migrateTournamentFormats();
      setMigrationResult(result);
      
      if (result.errorCount === 0) {
        toast({
          title: "Migration Successful",
          description: `Successfully imported ${result.successCount} formats`,
        });
      } else {
        toast({
          title: "Migration Partially Successful",
          description: `Imported ${result.successCount} formats, ${result.errorCount} failed`,
          variant: "destructive",
        });
      }
      
      // Refresh existing formats
      await handleCheckExisting();
    } catch (error) {
      toast({
        title: "Migration Failed",
        description: "An error occurred during migration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear ALL tournament formats? This action cannot be undone.')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await clearAllFormats();
      setExistingFormats([]);
      setMigrationResult(null);
      toast({
        title: "Formats Cleared",
        description: "All tournament formats have been removed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear formats",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Tournament Formats Migration</h1>
        <p className="text-muted-foreground mt-2">
          Migrate your existing tournament formats from localStorage to Supabase
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Check Existing Formats */}
        <Card>
          <CardHeader>
            <CardTitle>Check Existing Formats</CardTitle>
            <CardDescription>
              See what formats are already in your Supabase database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleCheckExisting} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Checking...' : 'Check Existing Formats'}
            </Button>
            
            {existingFormats.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Found {existingFormats.length} formats:</h4>
                <div className="space-y-1">
                  {existingFormats.map((format, index) => (
                    <div key={format.id} className="text-sm text-muted-foreground">
                      {index + 1}. {format.name} ({format.min_players}-{format.max_players} players)
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Migrate Formats */}
        <Card>
          <CardHeader>
            <CardTitle>Migrate Formats</CardTitle>
            <CardDescription>
              Import your existing tournament formats into Supabase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleMigrate} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Migrating...' : 'Start Migration'}
            </Button>
            
            {migrationResult && (
              <Alert>
                <AlertDescription>
                  Migration completed with {migrationResult.successCount} successes and {migrationResult.errorCount} errors.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clear All Formats */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Clear all tournament formats from the database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleClearAll} 
            disabled={isLoading}
            variant="destructive"
            className="w-full"
          >
            {isLoading ? 'Clearing...' : 'Clear All Formats'}
          </Button>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Migration Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Step 1: Check Existing</h4>
            <p className="text-sm text-muted-foreground">
              First check if you already have formats in your database to avoid duplicates.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Step 2: Migrate Formats</h4>
            <p className="text-sm text-muted-foreground">
              Import your existing tournament formats from the JSON files into Supabase.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Step 3: Verify</h4>
            <p className="text-sm text-muted-foreground">
              Check that all formats were imported correctly before proceeding.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Step 4: Update Components</h4>
            <p className="text-sm text-muted-foreground">
              After successful migration, we'll update your components to use Supabase instead of localStorage.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
