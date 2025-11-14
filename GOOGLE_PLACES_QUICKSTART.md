# Configuration rapide Google Places API

## Étapes rapides

### 1. Obtenir une clé API Google

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un projet ou sélectionnez un existant
3. Activez les APIs :
   - **Places API**
   - **Geocoding API**
4. Créez une clé API : "APIs & Services" > "Credentials" > "Create Credentials" > "API Key"

### 2. Configurer les restrictions (recommandé)

Dans les paramètres de la clé API :
- **Restrictions d'application** : Restreignez par domaine HTTP (votre domaine de production)
- **Restrictions d'API** : Limitez aux APIs "Places API" et "Geocoding API"

### 3. Ajouter la clé dans `.env.local`

```env
GOOGLE_PLACES_API_KEY=your_api_key_here
```

### 4. Redémarrer le serveur de développement

```bash
npm run dev
```

## Test

1. Allez sur la page "Mes Clubs" (`/dashboard/club`)
2. Cliquez sur "Nouveau Club"
3. Commencez à taper une adresse dans le champ "Adresse"
4. Vous devriez voir des suggestions d'adresses apparaître
5. Sélectionnez une adresse
6. Les coordonnées (latitude/longitude) s'affichent automatiquement

## Dépannage

- **Pas de suggestions** : Vérifiez que la clé API est bien dans `.env.local` et que le serveur a été redémarré
- **Erreur 403** : Vérifiez que les APIs Places et Geocoding sont activées dans Google Cloud Console
- **Erreur 400** : Vérifiez les restrictions de la clé API

## Coûts

- Gratuit jusqu'à 200 $/mois (environ 28 000 requêtes d'autocomplétion)
- Au-delà : 2,83 $ pour 1000 requêtes d'autocomplétion

Pour plus de détails, voir `docs/google-places-setup.md`

