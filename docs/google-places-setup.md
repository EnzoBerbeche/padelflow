# Configuration Google Places API

## Vue d'ensemble

L'application utilise Google Places API pour :
- L'autocomplétion d'adresses lors de la création/édition de clubs
- La géocodage (conversion d'adresses en coordonnées latitude/longitude)
- La recherche de clubs/tournois à proximité (fonctionnalité future)

## Configuration

### 1. Obtenir une clé API Google

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez les APIs suivantes :
   - **Places API** (pour l'autocomplétion et les détails)
   - **Geocoding API** (pour la conversion d'adresses en coordonnées)
4. Créez une clé API :
   - Allez dans "APIs & Services" > "Credentials"
   - Cliquez sur "Create Credentials" > "API Key"
   - Copiez la clé API générée

### 2. Configurer les restrictions (recommandé)

Pour la sécurité, configurez des restrictions sur votre clé API :

1. **Restrictions d'application** :
   - Restreignez par domaine HTTP (votre domaine de production)
   - Ou par adresse IP (pour le développement)

2. **Restrictions d'API** :
   - Limitez aux APIs suivantes :
     - Places API
     - Geocoding API

### 3. Ajouter la clé à l'environnement

Ajoutez la clé API dans votre fichier `.env.local` :

```env
GOOGLE_PLACES_API_KEY=your_api_key_here
```

⚠️ **Important** : La clé est stockée côté serveur (sans `NEXT_PUBLIC_`) pour plus de sécurité. Les requêtes passent par des routes API Next.js qui proxy les appels à Google Places API.

## Utilisation

### Composant AddressAutocomplete

Le composant `AddressAutocomplete` est déjà intégré dans la page de gestion des clubs. Il :
- Affiche des suggestions d'adresses pendant la saisie
- Récupère automatiquement les coordonnées (lat/lng) lors de la sélection
- Stocke l'adresse formatée et les coordonnées

### Fonction de recherche à proximité

Une fonction utilitaire `calculateDistance` est disponible dans `lib/google-places.ts` pour calculer la distance entre deux points géographiques.

Exemple d'utilisation future pour rechercher des clubs à proximité :

```typescript
import { calculateDistance } from '@/lib/google-places';

// Coordonnées de l'utilisateur (à partir de la géolocalisation du navigateur)
const userLat = 48.8566;
const userLng = 2.3522;

// Filtrer les clubs dans un rayon de 50 km
const nearbyClubs = clubs.filter(club => {
  if (!club.latitude || !club.longitude) return false;
  const distance = calculateDistance(
    userLat,
    userLng,
    club.latitude,
    club.longitude
  );
  return distance <= 50; // 50 km
});
```

## Coûts

### Google Places API

- **Autocomplete** : Gratuit jusqu'à 200 $/mois (environ 28 000 requêtes)
- **Place Details** : Gratuit jusqu'à 200 $/mois (environ 17 000 requêtes)
- **Geocoding** : Gratuit jusqu'à 200 $/mois (environ 40 000 requêtes)

Au-delà, les prix sont :
- Autocomplete : 2,83 $ pour 1000 requêtes
- Place Details : 17 $ pour 1000 requêtes
- Geocoding : 5 $ pour 1000 requêtes

### Alternatives gratuites

Si vous préférez une solution gratuite, vous pouvez utiliser :
- **OpenStreetMap Nominatim** (gratuit, mais limité à 1 requête/seconde)
- **Mapbox Geocoding API** (100 000 requêtes/mois gratuites)

## Migration des données existantes

Si vous avez déjà des clubs avec des adresses mais sans coordonnées, vous pouvez utiliser la fonction `geocodeAddress` pour les géocoder :

```typescript
import { geocodeAddress } from '@/lib/google-places';

// Pour chaque club sans coordonnées
const coordinates = await geocodeAddress(club.address);
if (coordinates) {
  await clubsAPI.update(club.id, {
    latitude: coordinates.lat,
    longitude: coordinates.lng,
  });
}
```

