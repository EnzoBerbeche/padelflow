# Installation de NeyoPadel comme Application Mobile

Votre application NeyoPadel est maintenant configurée comme une **Progressive Web App (PWA)** ! 🎉

## Comment installer l'application sur votre téléphone

### 📱 **Sur Android (Chrome/Samsung Internet)**

1. Ouvrez votre navigateur mobile (Chrome, Samsung Internet, etc.)
2. Allez sur l'URL de votre application
3. Vous verrez apparaître une bannière "Ajouter à l'écran d'accueil" ou "Installer l'application"
4. Appuyez sur "Installer" ou "Ajouter"
5. L'icône NeyoPadel apparaîtra sur votre écran d'accueil !

### 🍎 **Sur iOS (Safari)**

1. Ouvrez Safari sur votre iPhone/iPad
2. Allez sur l'URL de votre application
3. Appuyez sur le bouton "Partager" (carré avec flèche vers le haut)
4. Sélectionnez "Sur l'écran d'accueil"
5. Personnalisez le nom si souhaité et appuyez sur "Ajouter"

### 🔧 **Installation manuelle (si la bannière n'apparaît pas)**

1. Dans le navigateur, allez dans le menu (3 points)
2. Recherchez "Installer l'application" ou "Ajouter à l'écran d'accueil"
3. Suivez les instructions

## Fonctionnalités de l'application installée

✅ **Icône personnalisée** sur l'écran d'accueil  
✅ **Lancement en plein écran** (sans barre d'adresse)  
✅ **Fonctionnement hors ligne** (avec cache)  
✅ **Interface native** optimisée pour mobile  
✅ **Notifications push** (si configurées)  
✅ **Mise à jour automatique** en arrière-plan  

## Configuration technique

- **Manifest**: `/public/manifest.json`
- **Service Worker**: Généré automatiquement par next-pwa
- **Icônes**: `/public/icons/` (toutes tailles)
- **Cache**: Configuration optimisée pour les performances

## Dépannage

Si l'installation ne fonctionne pas :

1. **Vérifiez que vous êtes en HTTPS** (requis pour les PWA)
2. **Videz le cache** du navigateur
3. **Redémarrez** l'application
4. **Vérifiez** que le service worker est actif dans les outils de développement

## Mise à jour

L'application se mettra à jour automatiquement. Vous pouvez forcer une mise à jour en :
1. Fermant complètement l'application
2. La rouvrant depuis l'écran d'accueil

---

**Note**: Pour une expérience optimale, utilisez un navigateur récent (Chrome 80+, Safari 14+, Firefox 80+)

