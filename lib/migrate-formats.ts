import { tournamentFormatsAPI } from './supabase';
import format8TeamsFlat from './formats/format_8_teams_flat.json';
import format8TeamsNorandom from './formats/format_8_teams_norandom.json';
import format8TeamsTest from './formats/format_8_teams_test.json';
import format16 from './formats/format_16.json';
import format16Random from './formats/format_16_random.json';

// Migration function to import existing formats
export async function migrateTournamentFormats() {
  console.log('🚀 Starting tournament formats migration...');

  const formatsToImport = [
    {
      name: 'Tournoi 8 équipes - A plat',
      description: 'Format pour 8 équipes avec tableau à plat',
      min_players: 8,
      max_players: 8,
      features: ['Tableau à plat', 'Random ts 3 & 4', 'Random ts 5 & 8'],
      format_json: format8TeamsFlat,
      is_default: true
    },
    {
      name: 'Tournoi 8 équipes - Sans random',
      description: 'Format pour 8 équipes sans tirage au sort',
      min_players: 8,
      max_players: 8,
      features: ['Tableau à plat', 'Sans random'],
      format_json: format8TeamsNorandom,
      is_default: false
    },
    {
      name: 'Tournoi 8 équipes - Test',
      description: 'Format de test pour 8 équipes',
      min_players: 8,
      max_players: 8,
      features: ['Format de test'],
      format_json: format8TeamsTest,
      is_default: false
    },
    {
      name: 'Tournoi 16 équipes',
      description: 'Format pour 16 équipes',
      min_players: 16,
      max_players: 16,
      features: ['Tableau d\'élimination'],
      format_json: format16,
      is_default: false
    },
    {
      name: 'Tournoi 16 équipes - Random',
      description: 'Format pour 16 équipes avec tirage au sort',
      min_players: 16,
      max_players: 16,
      features: ['Tableau d\'élimination', 'Random'],
      format_json: format16Random,
      is_default: false
    }
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const format of formatsToImport) {
    try {
      console.log(`📝 Importing format: ${format.name}`);
      
      const result = await tournamentFormatsAPI.create(format);
      
      if (result) {
        console.log(`✅ Successfully imported: ${format.name} (ID: ${result.id})`);
        successCount++;
      } else {
        console.error(`❌ Failed to import: ${format.name}`);
        errorCount++;
      }
    } catch (error) {
      console.error(`❌ Error importing ${format.name}:`, error);
      errorCount++;
    }
  }

  console.log(`\n🎉 Migration completed!`);
  console.log(`✅ Successfully imported: ${successCount} formats`);
  console.log(`❌ Failed to import: ${errorCount} formats`);

  if (errorCount === 0) {
    console.log('🎯 All formats migrated successfully!');
  } else {
    console.log('⚠️  Some formats failed to migrate. Check the logs above.');
  }

  return { successCount, errorCount };
}

// Function to check if formats already exist
export async function checkExistingFormats() {
  try {
    const existingFormats = await tournamentFormatsAPI.getAll();
    console.log(`📊 Found ${existingFormats.length} existing formats in database`);
    
    if (existingFormats.length > 0) {
      console.log('Existing formats:');
      existingFormats.forEach(format => {
        console.log(`  - ${format.name} (${format.min_players}-${format.max_players} players)`);
      });
    }
    
    return existingFormats;
  } catch (error) {
    console.error('Error checking existing formats:', error);
    return [];
  }
}

// Function to clear all formats (use with caution!)
export async function clearAllFormats() {
  try {
    const existingFormats = await tournamentFormatsAPI.getAll();
    
    if (existingFormats.length === 0) {
      console.log('No formats to clear');
      return;
    }

    console.log(`🗑️  Clearing ${existingFormats.length} formats...`);
    
    for (const format of existingFormats) {
      const result = await tournamentFormatsAPI.delete(format.id);
      if (result.ok) {
        console.log(`✅ Deleted: ${format.name}`);
      } else {
        console.error(`❌ Failed to delete: ${format.name} - ${result.error}`);
      }
    }
    
    console.log('🎯 All formats cleared');
  } catch (error) {
    console.error('Error clearing formats:', error);
  }
}
