# Schéma de la table Clubs - Détail des colonnes

> **Note**: La documentation principale du schéma de la base de données, incluant la table `clubs` complète, se trouve dans [`supabase-schema.md`](./supabase-schema.md). Ce fichier contient des détails spécifiques sur l'intégration avec Google Places API.

## Données disponibles depuis Google Places API

L'API Google Places retourne les informations suivantes via `address_components` :

### Structure `address_components`
Chaque composant contient :
- `long_name` : Nom complet (ex: "Paris", "75001", "France")
- `short_name` : Nom court (ex: "Paris", "75001", "FR")
- `types` : Types du composant (ex: `["locality", "political"]`, `["postal_code"]`, `["country", "political"]`)

### Types disponibles dans `address_components` :
- `street_number` : Numéro de rue
- `route` : Nom de la rue
- `locality` : Ville
- `postal_code` : Code postal
- `administrative_area_level_1` : Région/Département (ex: "Île-de-France")
- `administrative_area_level_2` : Sous-région
- `country` : Pays
- `plus_code` : Code Plus (coordonnées simplifiées)

### Données actuellement récupérées :
✅ **Coordonnées GPS** : `latitude` et `longitude` (via `geometry.location`)
✅ **Adresse complète** : `formatted_address` (ex: "123 Rue de la Paix, 75001 Paris, France")
❌ **Ville** : Disponible mais non stockée
❌ **Code postal** : Disponible mais non stockée
❌ **Pays** : Disponible mais non stockée

---

## Colonnes actuelles de la table `clubs`

| Colonne | Type | Nullable | Description |
|---------|------|----------|-------------|
| `id` | `uuid` | NOT NULL | Identifiant unique (généré automatiquement) |
| `owner_id` | `uuid` | NOT NULL | ID du propriétaire (référence à `auth.users`) |
| `name` | `text` | NOT NULL | Nom du club |
| `address` | `text` | NOT NULL | Adresse complète formatée |
| `latitude` | `numeric(10, 8)` | NULL | Latitude GPS |
| `longitude` | `numeric(11, 8)` | NULL | Longitude GPS |
| `website` | `text` | NULL | Site web du club |
| `instagram` | `text` | NULL | Compte Instagram |
| `facebook` | `text` | NULL | Page Facebook |
| `manager` | `text` | NULL | Nom du responsable |
| `contact_email` | `text` | NOT NULL | Email de contact |
| `contact_phone` | `text` | NOT NULL | Numéro de téléphone |
| `created_at` | `timestamptz` | NOT NULL | Date de création |
| `updated_at` | `timestamptz` | NOT NULL | Date de mise à jour |

---

## Proposition : Ajouter des colonnes pour ville, code postal, pays

### Colonnes à ajouter :

| Colonne | Type | Nullable | Description |
|---------|------|----------|-------------|
| `city` | `text` | NULL | Ville (extrait de `address_components` avec type `locality`) |
| `postal_code` | `text` | NULL | Code postal (extrait de `address_components` avec type `postal_code`) |
| `country` | `text` | NULL | Pays (extrait de `address_components` avec type `country`, `short_name`) |
| `country_code` | `text` | NULL | Code pays ISO (ex: "FR", "ES") - `short_name` du country |

### Avantages :
- ✅ Recherche/filtrage par ville ou pays
- ✅ Affichage simplifié (ville, code postal)
- ✅ Statistiques par région/pays
- ✅ Validation de la localisation

### Inconvénients :
- ⚠️ Données redondantes (déjà dans `address`)
- ⚠️ Nécessite d'extraire les données de `address_components`

---

## Recommandation

**Je recommande d'ajouter ces colonnes** car :
1. Elles facilitent la recherche de clubs par localisation
2. Elles permettent des statistiques par région
3. Elles améliorent l'UX (affichage simplifié)
4. Les données sont déjà disponibles via Google Places API

Souhaitez-vous que j'ajoute ces colonnes au schéma SQL ?

