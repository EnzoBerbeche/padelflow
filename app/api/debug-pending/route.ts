import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG PENDING REGISTRATIONS ===');
    
    // Get all tournaments
    const allTournaments = storage.tournaments.getAll('');
    console.log('All tournaments:', allTournaments);
    
    // Get all pending registrations for each tournament
    const allPendingRegistrations: any[] = [];
    
    for (const tournament of allTournaments) {
      const tournamentPendingRegistrations = storage.pendingRegistrations.getByTournament(tournament.id);
      console.log(`Tournament ${tournament.id} (${tournament.name}) pending registrations:`, tournamentPendingRegistrations);
      
      if (tournamentPendingRegistrations.length > 0) {
        allPendingRegistrations.push(...tournamentPendingRegistrations);
      }
    }
    
    console.log('All pending registrations:', allPendingRegistrations);
    console.log('Total pending registrations:', allPendingRegistrations.length);
    
    return NextResponse.json({
      success: true,
      tournaments: allTournaments.map(t => ({ id: t.id, name: t.name })),
      pendingRegistrations: allPendingRegistrations.map(pr => ({
        id: pr.id,
        tournament_id: pr.tournament_id,
        email: pr.email,
        confirmation_token: pr.confirmation_token,
        expires_at: pr.expires_at,
        players: pr.players.map((p: any) => `${p.first_name} ${p.last_name}`)
      })),
      total: allPendingRegistrations.length
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error,
      message: 'Error debugging pending registrations'
    });
  }
} 