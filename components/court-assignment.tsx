'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, X } from 'lucide-react';
import { MatchWithTeams } from '@/lib/storage';

interface CourtAssignmentProps {
  match: MatchWithTeams;
  totalCourts: number;
  allMatches: MatchWithTeams[];
  onCourtAssign: (matchId: string, courtNumber: number | undefined) => void;
}

export function CourtAssignment({ match, totalCourts, allMatches, onCourtAssign }: CourtAssignmentProps) {
  const [selectedCourt, setSelectedCourt] = useState<number | undefined>(match.terrain_number || undefined);
  const [showDropdown, setShowDropdown] = useState(false);

  // Update local state when match terrain_number changes
  useEffect(() => {
    setSelectedCourt(match.terrain_number || undefined);
  }, [match.terrain_number]);

  // Get available courts (not assigned to any match)
  const getAvailableCourts = () => {
    const occupiedCourts = allMatches
      .filter(m => m.terrain_number && m.id !== match.id)
      .map(m => m.terrain_number!);
    
    const availableCourts = [];
    for (let i = 1; i <= totalCourts; i++) {
      if (!occupiedCourts.includes(i)) {
        availableCourts.push(i);
      }
    }
    
    return availableCourts;
  };

  const handleCourtChange = (courtNumber: string) => {
    const court = parseInt(courtNumber);
    setSelectedCourt(court);
    setShowDropdown(false);
    onCourtAssign(match.id, court);
  };

  const handleClearCourt = () => {
    setSelectedCourt(undefined);
    setShowDropdown(false);
    onCourtAssign(match.id, undefined);
  };

  const handleAssignCourt = () => {
    const availableCourts = getAvailableCourts();
    if (availableCourts.length > 0) {
      setSelectedCourt(availableCourts[0]);
      onCourtAssign(match.id, availableCourts[0]);
    }
  };

  const availableCourts = getAvailableCourts();
  const isCurrentlyAssigned = match.terrain_number !== undefined;

  return (
    <div className="flex items-center space-x-2">
      <MapPin className="h-4 w-4 text-gray-500" />
      
      {selectedCourt ? (
        <>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            Court {selectedCourt}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearCourt}
            className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
          >
            <X className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDropdown(v => !v)}
            className="h-8 px-2 text-xs"
          >
            Change court
          </Button>
          {showDropdown && (
            <Select
              value={selectedCourt.toString()}
              onValueChange={handleCourtChange}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Select court" />
              </SelectTrigger>
              <SelectContent>
                {availableCourts.length > 0 ? (
                  availableCourts.map(court => (
                    <SelectItem key={court} value={court.toString()}>
                      Court {court}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-courts" disabled>
                    No courts available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleAssignCourt}
          disabled={availableCourts.length === 0}
          className="h-8 px-2 text-xs"
        >
          Assign court
        </Button>
      )}
    </div>
  );
} 