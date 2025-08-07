# Configuration Email avec Resend

## Étape 1 : Créer un compte Resend

1. Allez sur [resend.com](https://resend.com)
2. Créez un compte gratuit
3. Vérifiez votre domaine `neyopadel.com`

## Étape 2 : Configurer votre domaine

### Option A : Utiliser Resend pour l'envoi (Recommandé)

1. Dans votre dashboard Resend, allez dans "Domains"
2. Ajoutez votre domaine `neyopadel.com`
3. Suivez les instructions pour configurer les DNS records :
   - Ajoutez les records MX, SPF, DKIM, et DMARC
   - Cela peut prendre jusqu'à 24h pour la propagation

### Option B : Utiliser un sous-domaine

Si vous préférez utiliser un sous-domaine :
1. Ajoutez `mail.neyopadel.com` dans Resend
2. Configurez les DNS records pour ce sous-domaine

## Étape 3 : Obtenir votre clé API

1. Dans votre dashboard Resend, allez dans "API Keys"
2. Créez une nouvelle clé API
3. Copiez la clé (commence par `re_`)

## Étape 4 : Configurer l'environnement

Créez ou modifiez votre fichier `.env.local` :

```env
# Resend API Key
RESEND_API_KEY=re_votre_cle_api_ici

# Autres variables existantes...
```

## Étape 5 : Tester l'envoi d'emails

1. Redémarrez votre serveur de développement
2. Testez l'inscription à un tournoi
3. Vérifiez que l'email de confirmation est envoyé

## Configuration DNS pour neyopadel.com

Voici les records DNS à ajouter dans votre gestionnaire de domaine :

### Records MX
```
Type: MX
Name: @
Value: mx.resend.com
Priority: 10
```

### Record SPF
```
Type: TXT
Name: @
Value: v=spf1 include:spf.resend.com ~all
```

### Records DKIM (générés par Resend)
```
Type: TXT
Name: resend._domainkey
Value: [valeur générée par Resend]
```

### Record DMARC
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@neyopadel.com
```

## Alternative : Utiliser un service d'email existant

Si vous avez déjà un service d'email configuré, vous pouvez :

1. **Gmail SMTP** : Utiliser l'API Gmail
2. **SendGrid** : Alternative populaire à Resend
3. **Mailgun** : Service d'email transactionnel

## Dépannage

### Email non reçu
1. Vérifiez les spams
2. Vérifiez la configuration DNS
3. Vérifiez les logs Resend

### Erreur d'authentification
1. Vérifiez que la clé API est correcte
2. Vérifiez que le domaine est bien configuré

### Emails dans les spams
1. Améliorez la réputation du domaine
2. Configurez correctement SPF, DKIM, DMARC
3. Utilisez un domaine dédié pour les emails

## Coûts

- **Resend** : 1000 emails/mois gratuits, puis $0.80/1000 emails
- **SendGrid** : 100 emails/jour gratuits
- **Mailgun** : 5000 emails/mois gratuits

## Sécurité

- Ne commitez jamais votre clé API dans Git
- Utilisez des variables d'environnement
- Limitez les permissions de votre clé API
- Surveillez l'utilisation de votre compte 