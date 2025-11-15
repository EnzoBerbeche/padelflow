'use client';

import { useState, useEffect } from 'react';
import { type AppTournament } from '@/lib/supabase';
import { tournamentsAPI } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Link2, Copy, CheckCircle2, XCircle, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

interface TournamentRegistrationProps {
  tournament: AppTournament;
  onUpdate: () => void;
}

export function TournamentRegistration({ tournament, onUpdate }: TournamentRegistrationProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(tournament.registration_enabled || false);
  const [registrationId, setRegistrationId] = useState(tournament.registration_id || '');
  const [selectionMode, setSelectionMode] = useState<'order' | 'ranking'>(tournament.registration_selection_mode || 'order');
  const [waitlistSize, setWaitlistSize] = useState<string>((tournament.registration_waitlist_size || Math.floor(tournament.number_of_teams / 2)).toString());
  const [allowPartnerChange, setAllowPartnerChange] = useState(tournament.registration_allow_partner_change ?? true);
  const [registrationDeadline, setRegistrationDeadline] = useState<Date | undefined>(
    tournament.registration_deadline ? new Date(tournament.registration_deadline) : undefined
  );
  const [modificationDeadline, setModificationDeadline] = useState<Date | undefined>(
    tournament.registration_modification_deadline ? new Date(tournament.registration_modification_deadline) : undefined
  );
  const [paymentEnabled, setPaymentEnabled] = useState(tournament.registration_payment_enabled || false);
  const [autoConfirm, setAutoConfirm] = useState(tournament.registration_auto_confirm ?? true);

  // Generate registration_id if it doesn't exist when enabling registration
  useEffect(() => {
    if (registrationEnabled && !registrationId) {
      // Generate a unique ID (similar to public_id)
      const newRegistrationId = uuidv4().replace(/-/g, '').substring(0, 16);
      setRegistrationId(newRegistrationId);
    }
  }, [registrationEnabled, registrationId]);

  // Adjust modification deadline if it becomes invalid when registration deadline changes
  useEffect(() => {
    if (registrationDeadline && modificationDeadline) {
      const deadlineDate = new Date(registrationDeadline);
      deadlineDate.setHours(0, 0, 0, 0);
      const modificationDate = new Date(modificationDeadline);
      modificationDate.setHours(0, 0, 0, 0);
      
      // If modification deadline is after registration deadline, reset it
      if (modificationDate > deadlineDate) {
        setModificationDeadline(undefined);
      }
    }
  }, [registrationDeadline, modificationDeadline]);

  const handleAutoSave = async (enabled: boolean) => {
    try {
      // If enabling registration and no registration_id exists, generate one
      let finalRegistrationId = registrationId;
      if (enabled && !finalRegistrationId) {
        finalRegistrationId = uuidv4().replace(/-/g, '').substring(0, 16);
        setRegistrationId(finalRegistrationId);
      }

      await tournamentsAPI.update(tournament.id, {
        registration_enabled: enabled,
        registration_id: enabled ? finalRegistrationId : undefined,
        // Keep existing settings when just toggling
        registration_selection_mode: enabled ? selectionMode : undefined,
        registration_waitlist_size: enabled ? parseInt(waitlistSize) || Math.floor(tournament.number_of_teams / 2) : undefined,
        registration_allow_partner_change: enabled ? allowPartnerChange : undefined,
        registration_deadline: enabled && registrationDeadline ? registrationDeadline.toISOString().split('T')[0] : undefined,
        registration_modification_deadline: enabled && modificationDeadline ? modificationDeadline.toISOString().split('T')[0] : undefined,
        registration_payment_enabled: enabled ? paymentEnabled : undefined,
        registration_auto_confirm: enabled ? autoConfirm : undefined,
      });

      toast({
        title: enabled ? "Inscription activée" : "Inscription désactivée",
        description: enabled 
          ? "Le lien d'inscription est maintenant actif" 
          : "Le lien d'inscription a été désactivé",
      });

      onUpdate();
    } catch (error) {
      console.error('Error auto-saving registration status:', error);
      toast({
        title: "Erreur",
        description: "Échec de la mise à jour",
        variant: "destructive",
      });
      // Revert the switch if save failed
      setRegistrationEnabled(!enabled);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Validate dates
      const tournamentDate = new Date(tournament.date);
      tournamentDate.setHours(0, 0, 0, 0);

      if (registrationEnabled && registrationDeadline) {
        const deadlineDate = new Date(registrationDeadline);
        deadlineDate.setHours(0, 0, 0, 0);
        
        if (deadlineDate > tournamentDate) {
          toast({
            title: "Erreur de validation",
            description: "La date limite d'inscription ne peut pas être supérieure à la date du tournoi",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      if (registrationEnabled && modificationDeadline) {
        const modificationDate = new Date(modificationDeadline);
        modificationDate.setHours(0, 0, 0, 0);
        
        // Check against registration deadline if it exists, otherwise against tournament date
        const maxDate = registrationDeadline ? new Date(registrationDeadline) : tournamentDate;
        maxDate.setHours(0, 0, 0, 0);
        
        if (modificationDate > maxDate) {
          toast({
            title: "Erreur de validation",
            description: "La date limite de modification ne peut pas être supérieure à la date limite d'inscription",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // If enabling registration and no registration_id exists, generate one
      let finalRegistrationId = registrationId;
      if (registrationEnabled && !finalRegistrationId) {
        finalRegistrationId = uuidv4().replace(/-/g, '').substring(0, 16);
      }

      await tournamentsAPI.update(tournament.id, {
        registration_enabled: registrationEnabled,
        registration_id: registrationEnabled ? finalRegistrationId : undefined,
        registration_selection_mode: registrationEnabled ? selectionMode : undefined,
        registration_waitlist_size: registrationEnabled ? parseInt(waitlistSize) || Math.floor(tournament.number_of_teams / 2) : undefined,
        registration_allow_partner_change: registrationEnabled ? allowPartnerChange : undefined,
        registration_deadline: registrationEnabled && registrationDeadline ? registrationDeadline.toISOString().split('T')[0] : undefined,
        registration_modification_deadline: registrationEnabled && modificationDeadline ? modificationDeadline.toISOString().split('T')[0] : undefined,
        registration_payment_enabled: registrationEnabled ? paymentEnabled : undefined,
        registration_auto_confirm: registrationEnabled ? autoConfirm : undefined,
      });

      toast({
        title: "Succès",
        description: "Paramètres d'inscription mis à jour avec succès !",
      });

      onUpdate();
    } catch (error) {
      console.error('Error updating registration settings:', error);
      toast({
        title: "Erreur",
        description: "Échec de la mise à jour des paramètres d'inscription",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyRegistrationLink = () => {
    if (!registrationId) return;
    const link = `${window.location.origin}/register/${registrationId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Lien copié",
      description: "Le lien d'inscription a été copié dans le presse-papiers",
    });
  };

  const registrationLink = registrationId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/register/${registrationId}` : '';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Link2 className="h-5 w-5 mr-2 text-primary" />
            Lien d'Inscription
          </CardTitle>
          <CardDescription>
            Configurez le lien d'inscription pour permettre aux joueurs de s'inscrire au tournoi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Registration */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="registration-enabled" className="text-base font-medium">
                Activer le lien d'inscription
              </Label>
              <p className="text-sm text-gray-500">
                {registrationEnabled ? 'Le lien d\'inscription est actif' : 'Le lien d\'inscription est désactivé'}
              </p>
            </div>
            <Switch
              id="registration-enabled"
              checked={registrationEnabled}
              onCheckedChange={async (checked) => {
                setRegistrationEnabled(checked);
                // Auto-save when toggling registration enabled/disabled
                await handleAutoSave(checked);
              }}
            />
          </div>

          {/* Registration Link */}
          {registrationEnabled && registrationId && (
            <div className="space-y-2">
              <Label>Lien d'inscription</Label>
              <div className="flex space-x-2">
                <Input
                  value={registrationLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button variant="outline" onClick={copyRegistrationLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copier
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Ce lien reste le même même si vous désactivez/réactivez l'inscription
              </p>
            </div>
          )}

          {/* Registration Settings */}
          {registrationEnabled && (
            <div className="space-y-6 pt-4 border-t">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Paramètres d'inscription</h3>

                {/* Selection Mode */}
                <div className="space-y-2">
                  <Label>Mode de sélection des inscrits *</Label>
                  <Select value={selectionMode} onValueChange={(value: 'order' | 'ranking') => setSelectionMode(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="order">Ordre d'inscription (premier arrivé, premier servi)</SelectItem>
                      <SelectItem value="ranking">Ranking (les équipes les mieux classées sont sélectionnées)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Waitlist Size */}
                <div className="space-y-2">
                  <Label htmlFor="waitlist-size">Longueur de la liste d'attente *</Label>
                  <Input
                    id="waitlist-size"
                    type="number"
                    min="0"
                    value={waitlistSize}
                    onChange={(e) => setWaitlistSize(e.target.value)}
                    placeholder={`Par défaut: ${Math.floor(tournament.number_of_teams / 2)}`}
                  />
                  <p className="text-xs text-gray-500">
                    Nombre maximum d'équipes en liste d'attente (par défaut: la moitié du nombre de participants prévu)
                  </p>
                </div>

                {/* Allow Partner Change */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="partner-change" className="text-base font-medium">
                      Autoriser le changement de partenaire
                    </Label>
                    <p className="text-sm text-gray-500">
                      Permettre aux équipes inscrites de modifier leur partenaire
                    </p>
                  </div>
                  <Switch
                    id="partner-change"
                    checked={allowPartnerChange}
                    onCheckedChange={setAllowPartnerChange}
                  />
                </div>

                {/* Registration Deadline */}
                <div className="space-y-2">
                  <Label>Date limite d'inscription</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !registrationDeadline && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {registrationDeadline ? format(registrationDeadline, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={registrationDeadline}
                        onSelect={setRegistrationDeadline}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const tournamentDate = new Date(tournament.date);
                          tournamentDate.setHours(0, 0, 0, 0);
                          const dateToCheck = new Date(date);
                          dateToCheck.setHours(0, 0, 0, 0);
                          // Disable dates before today or after tournament date
                          return dateToCheck < today || dateToCheck > tournamentDate;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-gray-500">
                    Ne peut pas être supérieure à la date du tournoi ({format(new Date(tournament.date), 'PPP', { locale: fr })})
                  </p>
                </div>

                {/* Modification Deadline */}
                <div className="space-y-2">
                  <Label>Date limite de modification d'inscription</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !modificationDeadline && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {modificationDeadline ? format(modificationDeadline, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={modificationDeadline}
                        onSelect={setModificationDeadline}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const dateToCheck = new Date(date);
                          dateToCheck.setHours(0, 0, 0, 0);
                          
                          // Max date is registration deadline if it exists, otherwise tournament date
                          const maxDate = registrationDeadline 
                            ? new Date(registrationDeadline)
                            : new Date(tournament.date);
                          maxDate.setHours(0, 0, 0, 0);
                          
                          // Disable dates before today or after max date
                          return dateToCheck < today || dateToCheck > maxDate;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-gray-500">
                    {registrationDeadline 
                      ? `Ne peut pas être supérieure à la date limite d'inscription (${format(registrationDeadline, 'PPP', { locale: fr })})`
                      : `Ne peut pas être supérieure à la date du tournoi (${format(new Date(tournament.date), 'PPP', { locale: fr })})`
                    }
                  </p>
                </div>

                {/* Payment Enabled */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="payment-enabled" className="text-base font-medium">
                      Activer le paiement
                    </Label>
                    <p className="text-sm text-gray-500">
                      Exiger un paiement pour valider l'inscription
                    </p>
                  </div>
                  <Switch
                    id="payment-enabled"
                    checked={paymentEnabled}
                    onCheckedChange={setPaymentEnabled}
                  />
                </div>

                {/* Auto Confirm */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-confirm" className="text-base font-medium">
                      Confirmation automatique
                    </Label>
                    <p className="text-sm text-gray-500">
                      {autoConfirm ? 'Les inscriptions sont confirmées automatiquement' : 'Les inscriptions nécessitent une validation manuelle'}
                    </p>
                  </div>
                  <Switch
                    id="auto-confirm"
                    checked={autoConfirm}
                    onCheckedChange={setAutoConfirm}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enregistrement...
                </div>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Enregistrer les paramètres
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

