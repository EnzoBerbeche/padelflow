'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Smartphone, Download, Share, Plus, Chrome } from 'lucide-react';

interface InstallGuideModalProps {
  children: React.ReactNode;
}

export function InstallGuideModal({ children }: InstallGuideModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            <span>Installer l'application</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Installez NeyoPadel sur votre téléphone pour un accès rapide et une meilleure expérience !
          </p>

          {/* Android */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center">
                <Chrome className="h-4 w-4 mr-2 text-blue-600" />
                Sur Android (Chrome)
              </h3>
              <ol className="text-xs space-y-2 text-gray-600">
                <li className="flex items-start space-x-2">
                  <span className="bg-green-100 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">1</span>
                  <span>Ouvrez Chrome sur votre téléphone</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-green-100 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">2</span>
                  <span>Allez sur cette page</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-green-100 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">3</span>
                  <span>Appuyez sur le menu (3 points) en haut à droite</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-green-100 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">4</span>
                  <span>Sélectionnez "Installer l'application" ou "Ajouter à l'écran d'accueil"</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-green-100 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">5</span>
                  <span>Confirmez l'installation</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* iOS */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center">
                <Smartphone className="h-4 w-4 mr-2 text-gray-600" />
                Sur iPhone (Safari)
              </h3>
              <ol className="text-xs space-y-2 text-gray-600">
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">1</span>
                  <span>Ouvrez Safari sur votre iPhone</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">2</span>
                  <span>Allez sur cette page</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">3</span>
                  <span>Appuyez sur le bouton Partager (carré avec flèche)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">4</span>
                  <span>Sélectionnez "Sur l'écran d'accueil"</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">5</span>
                  <span>Appuyez sur "Ajouter"</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-800">
              <strong>💡 Astuce :</strong> Une fois installée, l'application fonctionnera comme une app native avec des notifications et un accès hors ligne !
            </p>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
