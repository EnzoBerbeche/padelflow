'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, tournamentRegistrationsAPI, userProfileAPI, userPlayerLinkAPI, partnersAPI, type AppTournament, type AppTournamentRegistration, type AppPartner } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Trophy, User, Users, Calendar, MapPin, Loader2, AlertCircle, Save, BookOpen, Trash2, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface RegisterPageProps {
  params: Promise<{ registration_id: string }>;
}

export default function RegisterPage({ params }: RegisterPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { registration_id } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [tournament, setTournament] = useState<AppTournament | null>(null);
  const [existingRegistration, setExistingRegistration] = useState<AppTournamentRegistration | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [playerLink, setPlayerLink] = useState<any>(null);
  const [savedPartners, setSavedPartners] = useState<AppPartner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [savingPartner, setSavingPartner] = useState(false);
  const [partnerPopoverOpen, setPartnerPopoverOpen] = useState(false);
  
  // Form data
  const [player1, setPlayer1] = useState({
    first_name: '',
    last_name: '',
    license_number: '',
    ranking: undefined as number | undefined,
    phone: '',
    email: '',
  });
  
  const [player2, setPlayer2] = useState({
    first_name: '',
    last_name: '',
    license_number: '',
    ranking: undefined as number | undefined,
    phone: '',
    email: '',
  });

  // Check authentication and load data
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      try {
        // Load tournament first (public data)
        console.log('Loading tournament with registration_id:', registration_id);
        const tournamentData = await tournamentRegistrationsAPI.getTournamentByRegistrationId(registration_id);
        
        if (!tournamentData) {
          console.error('Tournament not found or registration disabled');
          toast({
            title: "Erreur",
            description: "Tournoi introuvable ou inscription désactivée. Vérifiez que l'inscription est activée et que le lien est correct.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        console.log('Tournament loaded successfully:', tournamentData.name);
        
        setTournament(tournamentData);
        
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // Show auth prompt instead of redirecting
          setShowAuthPrompt(true);
          setLoading(false);
          return;
        }
        
        setIsAuthenticated(true);
        
        // Load saved partners (always, whether registration exists or not)
        const partners = await partnersAPI.getMyPartners();
        setSavedPartners(partners);
        
        // Check if registration already exists
        const existing = await tournamentRegistrationsAPI.getMyRegistration(tournamentData.id);
        if (existing) {
          setExistingRegistration(existing);
          // Pre-fill form with existing data
          setPlayer1({
            first_name: existing.player1_first_name,
            last_name: existing.player1_last_name,
            license_number: existing.player1_license_number,
            ranking: existing.player1_ranking,
            phone: existing.player1_phone || '',
            email: existing.player1_email,
          });
          setPlayer2({
            first_name: existing.player2_first_name,
            last_name: existing.player2_last_name,
            license_number: existing.player2_license_number,
            ranking: existing.player2_ranking,
            phone: existing.player2_phone || '',
            email: existing.player2_email,
          });
        } else {
          // Load user profile
          const profile = await userProfileAPI.getMyProfile();
          
          // Load player link (always, to get license and ranking from TenUp)
          const link = await userPlayerLinkAPI.getMyPlayerLink();
          
          if (link) {
            setPlayerLink(link);
          }
          
          // Initialize player1 with profile data, then override with link data if available
          // Always use license and ranking from TenUp link if available
          const initialPlayer1 = {
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            license_number: link?.licence || profile?.licence_number || '',
            ranking: link?.classement || undefined, // Always pre-fill from TenUp if available
            phone: profile?.phone || '',
            email: profile?.email || '',
          };
          
          setPlayer1(initialPlayer1);
          
          if (profile) {
            setUserProfile(profile);
          }
        }
        
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors du chargement",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthAndLoad();
  }, [registration_id, router, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tournament) return;
    
    // Validation
    const isRankingMode = tournament.registration_selection_mode === 'ranking';
    
    if (!player1.first_name || !player1.last_name || !player1.license_number || !player1.email) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires du joueur 1",
        variant: "destructive",
      });
      return;
    }
    
    if (isRankingMode && !player1.ranking) {
      toast({
        title: "Erreur",
        description: "Le classement du joueur 1 est obligatoire en mode ranking",
        variant: "destructive",
      });
      return;
    }
    
    if (!player2.first_name || !player2.last_name || !player2.license_number || !player2.email) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires du joueur 2",
        variant: "destructive",
      });
      return;
    }
    
    if (isRankingMode && !player2.ranking) {
      toast({
        title: "Erreur",
        description: "Le classement du joueur 2 est obligatoire en mode ranking",
        variant: "destructive",
      });
      return;
    }
    
    // Check deadlines
    const now = new Date();
    if (tournament.registration_deadline) {
      const deadline = new Date(tournament.registration_deadline);
      if (now > deadline) {
        toast({
          title: "Erreur",
          description: "La date limite d'inscription est dépassée",
          variant: "destructive",
        });
        return;
      }
    }
    
    setSubmitting(true);
    
    try {
      if (existingRegistration) {
        // Update existing registration
        await tournamentRegistrationsAPI.update(existingRegistration.id, {
          player1_first_name: player1.first_name,
          player1_last_name: player1.last_name,
          player1_license_number: player1.license_number,
          player1_ranking: player1.ranking,
          player1_phone: player1.phone || undefined,
          player1_email: player1.email,
          player2_first_name: player2.first_name,
          player2_last_name: player2.last_name,
          player2_license_number: player2.license_number,
          player2_ranking: player2.ranking,
          player2_phone: player2.phone || undefined,
          player2_email: player2.email,
        });
        
        toast({
          title: "Succès",
          description: "Votre inscription a été mise à jour",
        });
      } else {
        // Create new registration
        await tournamentRegistrationsAPI.create({
          tournament_id: tournament.id,
          registration_id: tournament.registration_id || '',
          player1_first_name: player1.first_name,
          player1_last_name: player1.last_name,
          player1_license_number: player1.license_number,
          player1_ranking: player1.ranking,
          player1_phone: player1.phone || undefined,
          player1_email: player1.email,
          player2_first_name: player2.first_name,
          player2_last_name: player2.last_name,
          player2_license_number: player2.license_number,
          player2_ranking: player2.ranking,
          player2_phone: player2.phone || undefined,
          player2_email: player2.email,
        });
        
        toast({
          title: "Succès",
          description: tournament.registration_auto_confirm 
            ? "Votre inscription a été confirmée automatiquement" 
            : "Votre inscription a été enregistrée et est en attente de confirmation",
        });
      }
      
      // Redirect to dashboard or show success message
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting registration:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'inscription",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectPartner = (partnerId: string) => {
    if (partnerId === '__new__' || partnerId === '') {
      setSelectedPartnerId('');
      setPlayer2({
        first_name: '',
        last_name: '',
        license_number: '',
        ranking: undefined,
        phone: '',
        email: '',
      });
      setPartnerPopoverOpen(false);
      return;
    }
    
    const partner = savedPartners.find(p => p.id === partnerId);
    if (partner) {
      setSelectedPartnerId(partnerId);
      setPlayer2({
        first_name: partner.first_name,
        last_name: partner.last_name,
        license_number: partner.license_number,
        ranking: undefined, // Ranking not stored in partners
        phone: partner.phone || '',
        email: partner.email,
      });
      setPartnerPopoverOpen(false);
    }
  };

  const handleSavePartner = async () => {
    if (!player2.first_name || !player2.last_name || !player2.license_number || !player2.email) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir au moins le prénom, nom, numéro de licence et email du partenaire",
        variant: "destructive",
      });
      return;
    }

    setSavingPartner(true);
    try {
      const saved = await partnersAPI.create({
        first_name: player2.first_name,
        last_name: player2.last_name,
        license_number: player2.license_number,
        phone: player2.phone || undefined,
        email: player2.email,
      });

      if (saved) {
        // Reload partners list
        const partners = await partnersAPI.getMyPartners();
        setSavedPartners(partners);
        setSelectedPartnerId(saved.id);
        
        toast({
          title: "Succès",
          description: "Partenaire enregistré avec succès",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Échec de l'enregistrement du partenaire",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving partner:', error);
      const errorMessage = error instanceof Error ? error.message : 'Échec de l\'enregistrement du partenaire';
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSavingPartner(false);
    }
  };

  const handleDeletePartner = async (partnerId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the partner when clicking delete
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce partenaire ?')) {
      return;
    }

    try {
      const result = await partnersAPI.delete(partnerId);
      if (result.ok) {
        // Reload partners list
        const partners = await partnersAPI.getMyPartners();
        setSavedPartners(partners);
        
        // If the deleted partner was selected, clear the selection
        if (selectedPartnerId === partnerId) {
          setSelectedPartnerId('');
          setPlayer2({
            first_name: '',
            last_name: '',
            license_number: '',
            ranking: undefined,
            phone: '',
            email: '',
          });
        }
        
        toast({
          title: "Succès",
          description: "Partenaire supprimé avec succès",
        });
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Échec de la suppression du partenaire",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting partner:', error);
      toast({
        title: "Erreur",
        description: "Échec de la suppression du partenaire",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h2 className="text-xl font-semibold">Tournoi introuvable</h2>
              <p className="text-gray-600">Ce lien d'inscription n'est pas valide ou l'inscription est désactivée.</p>
              <Link href="/">
                <Button>Retour à l'accueil</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show authentication prompt if not authenticated
  if (showAuthPrompt && tournament) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-6 w-6 mr-2 text-primary" />
                {tournament.name}
              </CardTitle>
              <CardDescription>
                Inscription au tournoi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Connexion requise</h3>
                    <p className="text-sm text-blue-800">
                      Pour vous inscrire à ce tournoi, vous devez être connecté à votre compte.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {format(new Date(tournament.date), 'PPP', { locale: fr })}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {tournament.location}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Trophy className="h-4 w-4 mr-2" />
                    Niveau: {tournament.level}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    {tournament.number_of_teams} équipes
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href={`/sign-in?redirect=/register/${registration_id}`} className="flex-1">
                  <Button className="w-full" size="lg">
                    <User className="h-4 w-4 mr-2" />
                    Se connecter
                  </Button>
                </Link>
                <Link href={`/sign-up?redirect=/register/${registration_id}`} className="flex-1">
                  <Button variant="outline" className="w-full" size="lg">
                    <User className="h-4 w-4 mr-2" />
                    Créer un compte
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isRankingMode = tournament.registration_selection_mode === 'ranking';
  const needsPlayerLink = isRankingMode && !playerLink && !player1.ranking;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Tournament Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="h-6 w-6 mr-2 text-primary" />
              {tournament.name}
            </CardTitle>
            <CardDescription>
              Inscription au tournoi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                {format(new Date(tournament.date), 'PPP', { locale: fr })}
              </div>
              <div className="flex items-center text-gray-600">
                <MapPin className="h-4 w-4 mr-2" />
                {tournament.location}
              </div>
              <div className="flex items-center text-gray-600">
                <Trophy className="h-4 w-4 mr-2" />
                Niveau: {tournament.level}
              </div>
              <div className="flex items-center text-gray-600">
                <Users className="h-4 w-4 mr-2" />
                {tournament.number_of_teams} équipes
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Link Player Alert */}
        {needsPlayerLink && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Pour vous inscrire en mode ranking, vous devez d'abord lier votre profil TenUp.{' '}
              <Link href="/dashboard/settings" className="text-primary underline">
                Lier mon profil
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Player 1 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Joueur 1 (Vous)
              </CardTitle>
              <CardDescription>
                Vos informations personnelles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="player1_first_name">Prénom *</Label>
                  <Input
                    id="player1_first_name"
                    value={player1.first_name}
                    onChange={(e) => setPlayer1({ ...player1, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player1_last_name">Nom *</Label>
                  <Input
                    id="player1_last_name"
                    value={player1.last_name}
                    onChange={(e) => setPlayer1({ ...player1, last_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player1_license_number">Numéro de licence *</Label>
                  <Input
                    id="player1_license_number"
                    value={player1.license_number}
                    onChange={(e) => setPlayer1({ ...player1, license_number: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player1_ranking">
                    Classement {isRankingMode ? '*' : '(optionnel)'}
                  </Label>
                  <Input
                    id="player1_ranking"
                    type="number"
                    value={player1.ranking || ''}
                    onChange={(e) => setPlayer1({ ...player1, ranking: e.target.value ? parseInt(e.target.value) : undefined })}
                    required={isRankingMode}
                    disabled={isRankingMode && playerLink && playerLink.classement ? true : false}
                  />
                  {playerLink && playerLink.classement && (
                    <p className="text-xs text-gray-500">
                      Classement depuis TenUp: {playerLink.classement}
                      {isRankingMode && ' (obligatoire en mode ranking)'}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player1_phone">Téléphone</Label>
                  <Input
                    id="player1_phone"
                    type="tel"
                    value={player1.phone}
                    onChange={(e) => setPlayer1({ ...player1, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player1_email">Email *</Label>
                  <Input
                    id="player1_email"
                    type="email"
                    value={player1.email}
                    onChange={(e) => setPlayer1({ ...player1, email: e.target.value })}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Player 2 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Joueur 2 (Partenaire)
              </CardTitle>
              <CardDescription>
                Informations de votre partenaire
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Select saved partner */}
              {savedPartners.length > 0 && (
                <div className="space-y-2">
                  <Label>Partenaire sauvegardé</Label>
                  <Popover open={partnerPopoverOpen} onOpenChange={setPartnerPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {selectedPartnerId && selectedPartnerId !== '__new__'
                          ? (() => {
                              const selected = savedPartners.find(p => p.id === selectedPartnerId);
                              return selected 
                                ? `${selected.first_name} ${selected.last_name} (${selected.license_number})`
                                : 'Sélectionner un partenaire sauvegardé';
                            })()
                          : 'Sélectionner un partenaire sauvegardé'}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <div className="max-h-[300px] overflow-auto">
                        <div
                          className={cn(
                            "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent",
                            selectedPartnerId === '__new__' && "bg-accent"
                          )}
                          onClick={() => handleSelectPartner('__new__')}
                        >
                          <span>Nouveau partenaire</span>
                        </div>
                        {savedPartners.map((partner) => (
                          <div
                            key={partner.id}
                            className={cn(
                              "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent group",
                              selectedPartnerId === partner.id && "bg-accent"
                            )}
                            onClick={() => handleSelectPartner(partner.id)}
                          >
                            <span>
                              {partner.first_name} {partner.last_name} ({partner.license_number})
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => handleDeletePartner(partner.id, e)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="player2_first_name">Prénom *</Label>
                  <Input
                    id="player2_first_name"
                    value={player2.first_name}
                    onChange={(e) => setPlayer2({ ...player2, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player2_last_name">Nom *</Label>
                  <Input
                    id="player2_last_name"
                    value={player2.last_name}
                    onChange={(e) => setPlayer2({ ...player2, last_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player2_license_number">Numéro de licence *</Label>
                  <Input
                    id="player2_license_number"
                    value={player2.license_number}
                    onChange={(e) => setPlayer2({ ...player2, license_number: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player2_ranking">
                    Classement {isRankingMode ? '*' : '(optionnel)'}
                  </Label>
                  <Input
                    id="player2_ranking"
                    type="number"
                    value={player2.ranking || ''}
                    onChange={(e) => setPlayer2({ ...player2, ranking: e.target.value ? parseInt(e.target.value) : undefined })}
                    required={isRankingMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player2_phone">Téléphone</Label>
                  <Input
                    id="player2_phone"
                    type="tel"
                    value={player2.phone}
                    onChange={(e) => setPlayer2({ ...player2, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player2_email">Email *</Label>
                  <Input
                    id="player2_email"
                    type="email"
                    value={player2.email}
                    onChange={(e) => setPlayer2({ ...player2, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              {/* Save partner button */}
              <div className="flex justify-end pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSavePartner}
                  disabled={savingPartner || !player2.first_name || !player2.last_name || !player2.license_number || !player2.email}
                  className="flex items-center"
                >
                  {savingPartner ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Enregistrer ce partenaire
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link href="/dashboard">
              <Button type="button" variant="outline">Annuler</Button>
            </Link>
            <Button type="submit" disabled={submitting || needsPlayerLink}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : existingRegistration ? (
                'Mettre à jour l\'inscription'
              ) : (
                'S\'inscrire'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

