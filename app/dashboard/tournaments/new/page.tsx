'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowLeft, Clock, MapPin, Trophy, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { storage, Tournament } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { useCurrentUserId } from '@/hooks/use-current-user';

// Demo user ID for testing (fallback)
const DEMO_USER_ID = 'demo-user-123';

function TournamentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const currentUserId = useCurrentUserId();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  
  // Debug current user and check available tournaments
  useEffect(() => {
    console.log('🔍 Current user ID changed:', currentUserId);
    
    // Check available tournaments for debugging
    if (typeof window !== 'undefined') {
      try {
        const tournamentsData = localStorage.getItem('padelflow_tournaments');
        if (tournamentsData) {
          const tournaments = JSON.parse(tournamentsData);
          console.log('🔍 Available tournaments:', tournaments);
        }
      } catch (error) {
        console.error('🔍 Error reading tournaments:', error);
      }
    }
  }, [currentUserId]);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    date: undefined as Date | undefined,
    level: '' as 'P25' | 'P100' | 'P250' | 'P500' | 'P1000' | 'P1500' | 'P2000' | '',
    start_time: '',
    number_of_courts: '',
    number_of_teams: '',
    conditions: '' as 'inside' | 'outside' | 'both' | '',
    type: '' as 'All' | 'Men' | 'Women' | 'Mixed' | '',
  });

  // Debug form data changes
  useEffect(() => {
    console.log('🔍 Form data changed:', formData);
  }, [formData]);

  // Fallback effect to ensure form data is set when editing
  useEffect(() => {
    if (isEditing && editingTournament && !formData.name) {
      console.log('🔍 Fallback: Setting form data from editing tournament');
      setFormData({
        name: editingTournament.name,
        location: editingTournament.location,
        date: new Date(editingTournament.date),
        level: editingTournament.level,
        start_time: editingTournament.start_time,
        number_of_courts: editingTournament.number_of_courts.toString(),
        number_of_teams: editingTournament.number_of_teams.toString(),
        conditions: editingTournament.conditions,
        type: editingTournament.type,
      });
    }
  }, [isEditing, editingTournament, formData.name]);

  const processedEditId = useRef<string | null>(null);



  useEffect(() => {
    const editId = searchParams.get('edit');
    console.log('🔍 useEffect triggered');
    console.log('🔍 editId:', editId);
    console.log('🔍 processedEditId.current:', processedEditId.current);
    console.log('🔍 currentUserId:', currentUserId);
    
    // Reset processedEditId if we're not editing
    if (!editId) {
      processedEditId.current = null;
      console.log('🔍 Reset processedEditId to null');
      return;
    }
    
    // Wait for user to be loaded before processing edit
    if (currentUserId === null && editId) {
      console.log('🔍 Waiting for user to be loaded...');
      return;
    }
    
    if (editId && editId !== processedEditId.current) {
      console.log('🔍 Processing edit request...');
      processedEditId.current = editId;
      
      // Ensure storage is initialized
      if (typeof window === 'undefined') {
        console.log('🔍 Window not available, skipping edit processing');
        return;
      }
      
      const tournament = storage.tournaments.getById(editId);
      console.log('🔍 Found tournament:', tournament);
      
      if (tournament) {
        // Check if user can edit this tournament
        // Allow editing if:
        // 1. User is the organizer
        // 2. Tournament belongs to demo user
        // 3. User is the owner
        // 4. No current user (fallback for demo)
        const canEdit = tournament.organizer_id === currentUserId || 
                       tournament.organizer_id === DEMO_USER_ID ||
                       tournament.owner_id === currentUserId ||
                       tournament.owner_id === DEMO_USER_ID ||
                       !currentUserId; // Allow editing if no current user (fallback)
        
        console.log('🔍 Can edit:', canEdit);
        console.log('🔍 tournament.organizer_id:', tournament.organizer_id);
        console.log('🔍 DEMO_USER_ID:', DEMO_USER_ID);
        
        if (canEdit) {
          console.log('🔍 Setting form data...');
          setIsEditing(true);
          setEditingTournament(tournament);
          
          setFormData({
            name: tournament.name,
            location: tournament.location,
            date: new Date(tournament.date),
            level: tournament.level,
            start_time: tournament.start_time,
            number_of_courts: tournament.number_of_courts.toString(),
            number_of_teams: tournament.number_of_teams.toString(),
            conditions: tournament.conditions,
            type: tournament.type,
          });
          console.log('🔍 Form data set:', {
            name: tournament.name,
            location: tournament.location,
            date: tournament.date,
            level: tournament.level,
            start_time: tournament.start_time,
            number_of_courts: tournament.number_of_courts.toString(),
            number_of_teams: tournament.number_of_teams.toString(),
            conditions: tournament.conditions,
            type: tournament.type,
          });
        } else {
          console.log('🔍 User cannot edit this tournament');
        }
      } else {
        console.log('🔍 Tournament not found');
      }
    } else {
      console.log('🔍 Not processing edit - conditions not met');
    }
  }, [searchParams, currentUserId]); // Removed isEditing from dependencies

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.location || !formData.date || !formData.level || 
        !formData.start_time || !formData.number_of_courts || !formData.number_of_teams || !formData.conditions || !formData.type) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (isEditing && editingTournament) {
        // Update existing tournament
        storage.tournaments.update(editingTournament.id, {
          name: formData.name,
          location: formData.location,
          date: formData.date.toISOString().split('T')[0],
          level: formData.level,
          start_time: formData.start_time,
          number_of_courts: parseInt(formData.number_of_courts),
          number_of_teams: parseInt(formData.number_of_teams),
          conditions: formData.conditions,
          type: formData.type,
        });

        toast({
          title: "Success",
          description: "Tournament updated successfully!",
        });

        router.push(`/dashboard/tournaments/${editingTournament.id}`);
      } else {
        // Create new tournament
        const tournament = storage.tournaments.create({
          name: formData.name,
          location: formData.location,
          date: formData.date.toISOString().split('T')[0],
          organizer_id: currentUserId || DEMO_USER_ID,
          owner_id: currentUserId || DEMO_USER_ID, // Link to current user
          teams_locked: false,
          level: formData.level,
          start_time: formData.start_time,
          number_of_courts: parseInt(formData.number_of_courts),
          number_of_teams: parseInt(formData.number_of_teams),
          conditions: formData.conditions,
          type: formData.type,
          registration_enabled: false, // Default to disabled
        });

        toast({
          title: "Success",
          description: "Tournament created successfully!",
        });

        router.push(`/dashboard/tournaments/${tournament.id}`);
      }
    } catch (error) {
      console.error('Error saving tournament:', error);
      toast({
        title: "Error",
        description: isEditing ? "Failed to update tournament" : "Failed to create tournament",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Edit Tournament' : 'Create New Tournament'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing ? 'Update your tournament details' : 'Set up your padel tournament with all the details'}
          </p>
        </div>
      </div>

      {/* Warning for editing locked tournaments */}
      {isEditing && editingTournament?.teams_locked && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-yellow-800">
              <Trophy className="h-5 w-5" />
              <div>
                <p className="font-medium">Tournament teams are locked</p>
                <p className="text-sm">You can only edit basic tournament information. To modify teams or format, unlock the teams first.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-primary" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Essential tournament details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tournament Name *</Label>
                                 <Input
                   id="name"
                   placeholder="e.g., Spring Championship 2024"
                   value={formData.name}
                   onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                   required
                 />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="e.g., City Sports Center, Madrid"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Tournament Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? format(formData.date, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => setFormData({ ...formData, date })}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tournament Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-primary" />
              Tournament Configuration
            </CardTitle>
            <CardDescription>
              Tournament level, type, and participation details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tournament Level *</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value: 'P25' | 'P100' | 'P250' | 'P500' | 'P1000' | 'P1500' | 'P2000') => 
                    setFormData({ ...formData, level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tournament level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P25">P25 - Beginner</SelectItem>
                    <SelectItem value="P100">P100 - Recreational</SelectItem>
                    <SelectItem value="P250">P250 - Intermediate</SelectItem>
                    <SelectItem value="P500">P500 - Advanced</SelectItem>
                    <SelectItem value="P1000">P1000 - Expert</SelectItem>
                    <SelectItem value="P1500">P1500 - Professional</SelectItem>
                    <SelectItem value="P2000">P2000 - Elite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tournament Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'All' | 'Men' | 'Women' | 'Mixed') => 
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tournament type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    <SelectItem value="Men">Men Only</SelectItem>
                    <SelectItem value="Women">Women Only</SelectItem>
                    <SelectItem value="Mixed">Mixed Doubles</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="number_of_teams">Number of Teams *</Label>
                <Input
                  id="number_of_teams"
                  type="number"
                  min="1"
                  max="50"
                  placeholder="e.g., 8"
                  value={formData.number_of_teams}
                  onChange={(e) => setFormData({ ...formData, number_of_teams: e.target.value })}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Venue Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-primary" />
              Venue Information
            </CardTitle>
            <CardDescription>
              Court details and playing conditions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="number_of_courts">Number of Courts *</Label>
                <Input
                  id="number_of_courts"
                  type="number"
                  min="1"
                  max="20"
                  placeholder="e.g., 4"
                  value={formData.number_of_courts}
                  onChange={(e) => setFormData({ ...formData, number_of_courts: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Playing Conditions *</Label>
                <Select
                  value={formData.conditions}
                  onValueChange={(value: 'inside' | 'outside' | 'both') => 
                    setFormData({ ...formData, conditions: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select playing conditions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inside">Indoor Courts</SelectItem>
                    <SelectItem value="outside">Outdoor Courts</SelectItem>
                    <SelectItem value="both">Indoor & Outdoor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4 pt-6">
          <Link href="/dashboard">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading} className="min-w-32">
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEditing ? 'Updating...' : 'Creating...'}
              </div>
            ) : (
              <>
                <Trophy className="h-4 w-4 mr-2" />
                {isEditing ? 'Update Tournament' : 'Create Tournament'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
        <div>
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-96 bg-gray-200 rounded animate-pulse mt-2"></div>
        </div>
      </div>
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-64 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
    </div>
  );
}

export default function NewTournament() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Suspense fallback={<LoadingFallback />}>
          <TournamentForm />
        </Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  );
}