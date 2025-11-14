# Scripts de gestion des rôles utilisateur

Ce dossier contient des scripts utilitaires pour gérer les rôles des utilisateurs dans l'application.

## Prérequis

1. **Configurer les variables d'environnement :**
   
   Créez un fichier `.env.local` à la racine du projet avec :
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
   ```
   
   **Pour obtenir ces clés :**
   1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
   2. Sélectionnez votre projet
   3. Allez dans **Settings > API**
   4. Copiez l'URL du projet et les clés API
   5. Remplacez les valeurs dans `.env.local`

2. **Installer les dépendances :**
   ```bash
   npm install
   ```

## Scripts disponibles

### 1. Lister tous les utilisateurs

```bash
node scripts/list-users.js
```

Affiche la liste de tous les utilisateurs avec leurs informations :
- Email
- ID
- Nom d'affichage
- Rôle actuel
- Dernière connexion
- Statut de confirmation email

### 2. Attribuer le rôle "juge_arbitre"

```bash
node scripts/assign-club-role.js user@example.com
```

Attribue le rôle "juge_arbitre" à un utilisateur spécifique.

**Exemple :**
```bash
node scripts/assign-club-role.js enzoberbeche@gmail.com
```

## Rôles disponibles

- `player` : Utilisateur standard (par défaut)
- `juge_arbitre` : Juge Arbitre (accès aux tournois)
- `admin` : Administrateur système (accès complet)

## Permissions par rôle

### Player (Joueur)
- Accès au tableau de bord de base
- Accès à Ten'Up (classements)
- Accès à Game Analyzer
- Accès aux paramètres
- **PAS d'accès aux tournois**

### Juge Arbitre (juge_arbitre)
- Toutes les permissions du joueur
- **Accès à la gestion des tournois**
- Création et gestion des tournois

### Admin (Administrateur)
- Toutes les permissions du juge arbitre
- Accès à l'administration système
- Gestion des formats de tournois
- Accès complet à toutes les fonctionnalités

## Utilisation

1. **Pour créer un nouveau profil juge arbitre :**
   ```bash
   # 1. Lister les utilisateurs pour trouver l'email
   node scripts/list-users.js
   
   # 2. Attribuer le rôle juge_arbitre
   node scripts/assign-club-role.js email@example.com
   ```

2. **Pour vérifier les rôles :**
   ```bash
   node scripts/list-users.js
   ```

## Notes importantes

- Les scripts utilisent la clé de service Supabase pour contourner les politiques RLS
- Assurez-vous que la clé de service a les permissions nécessaires
- Les changements de rôles sont immédiatement effectifs
- Les utilisateurs devront se reconnecter pour voir les changements de navigation
