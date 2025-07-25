import { useState, useCallback } from 'react';
import { MatchWithTeams } from '@/lib/storage';

interface UseCourtManagementProps {
  matches: MatchWithTeams[];
  totalCourts: number;
  onMatchUpdate: (matchId: string, updates: Partial<MatchWithTeams>) => void;
}

export function useCourtManagement({ matches, totalCourts, onMatchUpdate }: UseCourtManagementProps) {
  const [courtAssignments, setCourtAssignments] = useState<Map<string, number>>(new Map());

  // Initialize court assignments from matches
  const initializeCourtAssignments = useCallback(() => {
    const assignments = new Map<string, number>();
    matches.forEach(match => {
      if (match.terrain_number) {
        assignments.set(match.id, match.terrain_number);
      }
    });
    setCourtAssignments(assignments);
  }, [matches]);

  // Assign a court to a match
  const assignCourt = useCallback((matchId: string, courtNumber: number | undefined) => {
    if (courtNumber === undefined) {
      // Remove court assignment
      setCourtAssignments(prev => {
        const newAssignments = new Map(prev);
        newAssignments.delete(matchId);
        return newAssignments;
      });
      
      // Update match in storage
      onMatchUpdate(matchId, { terrain_number: undefined });
    } else {
      // Assign court
      setCourtAssignments(prev => {
        const newAssignments = new Map(prev);
        newAssignments.set(matchId, courtNumber);
        return newAssignments;
      });
      
      // Update match in storage
      onMatchUpdate(matchId, { terrain_number: courtNumber });
    }
  }, [onMatchUpdate]);

  // Free a court when a match ends
  const freeCourt = useCallback((matchId: string) => {
    setCourtAssignments(prev => {
      const newAssignments = new Map(prev);
      newAssignments.delete(matchId);
      return newAssignments;
    });
    
    // Update match in storage
    onMatchUpdate(matchId, { terrain_number: undefined });
  }, [onMatchUpdate]);

  // Get available courts
  const getAvailableCourts = useCallback(() => {
    const occupiedCourts = Array.from(courtAssignments.values());
    const availableCourts = [];
    
    for (let i = 1; i <= totalCourts; i++) {
      if (!occupiedCourts.includes(i)) {
        availableCourts.push(i);
      }
    }
    
    return availableCourts;
  }, [courtAssignments, totalCourts]);

  // Get court status for a specific court
  const getCourtStatus = useCallback((courtNumber: number) => {
    const matchId = Array.from(courtAssignments.entries())
      .find(([_, court]) => court === courtNumber)?.[0];
    
    if (matchId) {
      return {
        isOccupied: true,
        matchId,
        match: matches.find(m => m.id === matchId)
      };
    }
    
    return {
      isOccupied: false,
      matchId: null,
      match: null
    };
  }, [courtAssignments, matches]);

  // Get all court statuses
  const getAllCourtStatuses = useCallback(() => {
    const statuses = [];
    
    for (let i = 1; i <= totalCourts; i++) {
      statuses.push({
        courtNumber: i,
        ...getCourtStatus(i)
      });
    }
    
    return statuses;
  }, [totalCourts, getCourtStatus]);

  // Check if a court is available
  const isCourtAvailable = useCallback((courtNumber: number) => {
    return !Array.from(courtAssignments.values()).includes(courtNumber);
  }, [courtAssignments]);

  // Get match by court number
  const getMatchByCourt = useCallback((courtNumber: number) => {
    const matchId = Array.from(courtAssignments.entries())
      .find(([_, court]) => court === courtNumber)?.[0];
    
    return matchId ? matches.find(m => m.id === matchId) : null;
  }, [courtAssignments, matches]);

  return {
    courtAssignments,
    assignCourt,
    freeCourt,
    getAvailableCourts,
    getCourtStatus,
    getAllCourtStatuses,
    isCourtAvailable,
    getMatchByCourt,
    initializeCourtAssignments
  };
} 