# Flux — site d'information énergie

Site statique (HTML/CSS/JS pur, aucune installation nécessaire) avec 3 pages :
- `voitures-electriques.html`
- `panneaux-solaires.html`
- `economies-energie.html`
- `index.html` (accueil, relie les 3 sujets)

Chaque page a sa propre animation canvas en thème (route/pulsations électriques,
pluie de lumière solaire, courbe de facture qui descend).

## Voir le site en local

Ouvrez simplement `index.html` dans un navigateur, ou lancez un petit serveur local :

```bash
cd flux-site
python3 -m http.server 8000
```

Puis allez sur `http://localhost:8000`.

## Héberger gratuitement sur GitHub Pages

1. **Créer un compte GitHub** si vous n'en avez pas déjà un : https://github.com

2. **Créer un nouveau dépôt (repository)**
   - Cliquez sur le "+" en haut à droite → "New repository"
   - Nom du dépôt, par exemple : `flux-site`
   - Laissez-le en **Public**
   - Ne cochez rien d'autre (pas de README, pas de .gitignore)
   - Cliquez sur "Create repository"

3. **Envoyer les fichiers du site**

   Option A — en ligne de commande (si `git` est installé) :
   ```bash
   cd flux-site
   git init
   git add .
   git commit -m "Premier envoi du site Flux"
   git branch -M main
   git remote add origin https://github.com/VOTRE-PSEUDO/flux-site.git
   git push -u origin main
   ```

   Option B — sans ligne de commande :
   - Sur la page du dépôt GitHub, cliquez sur "Add file" → "Upload files"
   - Glissez-déposez tout le contenu du dossier `flux-site` (y compris le dossier `assets`)
   - Cliquez sur "Commit changes"

4. **Activer GitHub Pages**
   - Dans le dépôt, allez dans **Settings** → **Pages** (menu de gauche)
   - Sous "Build and deployment" → "Source", choisissez **Deploy from a branch**
   - Branche : **main**, dossier : **/ (root)**
   - Cliquez sur **Save**

5. **Attendre 1 à 2 minutes**, puis votre site sera en ligne à l'adresse :
   ```
   https://VOTRE-PSEUDO.github.io/flux-site/
   ```
   (l'URL exacte s'affiche aussi dans Settings → Pages une fois le déploiement terminé)

## Modifier le contenu ensuite

- Textes et chiffres : directement dans les fichiers `.html`, en clair.
- Couleurs par page : variables `--accent` en haut de `assets/css/cars.css`,
  `solar.css` et `savings.css` (`.theme-cars`, `.theme-solar`, `.theme-save`).
- Animations : `assets/js/cars.js`, `solar.js`, `savings.js`, `home.js`.

Chaque modification poussée sur la branche `main` met le site à jour
automatiquement sur GitHub Pages en 1 à 2 minutes.

## Nom de domaine personnalisé (optionnel)

Dans **Settings → Pages → Custom domain**, vous pouvez brancher un nom de
domaine que vous possédez (ex. `flux-energie.fr`) en ajoutant l'enregistrement
DNS indiqué par GitHub chez votre registrar.

---

## Chatbot IA + espace admin (100% gratuit)

Un site sur GitHub Pages ne fait qu'afficher des fichiers — il ne peut pas
exécuter de code serveur, envoyer d'email ou vérifier un mot de passe.
Le chatbot utilise donc **Supabase**, une plateforme gratuite qui fournit
en un seul endroit : la base de données, les comptes visiteurs (connexion
par code email, sans mot de passe), le "temps réel" pour le chat en direct,
et l'exécution de code serveur (pour appeler l'IA et envoyer les emails).

**Services utilisés, tous gratuits pour un petit site :**
- [Supabase](https://supabase.com) — base de données + comptes + temps réel + fonctions serveur
- [Groq](https://console.groq.com) — l'IA qui répond aux visiteurs (modèle Llama, gratuit, très rapide)
- [Resend](https://resend.com) — l'envoi de l'email à `devt23773@gmail.com` quand l'IA ne sait pas répondre

### 1. Créer le projet Supabase

1. Va sur https://supabase.com → crée un compte → **New project**
2. Choisis un nom, un mot de passe de base de données (à garder de côté), une région proche de toi
3. Une fois le projet créé, va dans **SQL Editor** → colle tout le contenu du fichier
   `supabase/schema.sql` (fourni dans le zip) → **Run**. Ça crée les tables et les règles de sécurité.
4. Va dans **Project Settings → API** : note deux valeurs, tu en auras besoin partout ensuite :
   - **Project URL**
   - **anon public key**

### 2. Configurer la connexion par code email

1. Toujours dans Supabase : **Authentication → Providers → Email**
2. Vérifie que "Email" est activé et que **"Confirm email"** utilise bien le modèle **OTP** (code à 6 chiffres) —
   c'est le comportement par défaut de `signInWithOtp`, rien à changer normalement.
3. (Optionnel) **Authentication → Email Templates → Magic Link / OTP** pour personnaliser le texte de l'email reçu par les visiteurs.

### 3. Créer la clé Groq (l'IA, gratuite)

1. Va sur https://console.groq.com → crée un compte → **API Keys → Create API Key**
2. Copie la clé (elle ne sera plus affichée après)

### 4. Créer la clé Resend (l'envoi d'email, gratuit)

1. Va sur https://resend.com → crée un compte → **API Keys → Create API Key**
2. Copie la clé. Pas besoin de connecter un nom de domaine pour commencer :
   le champ `from` de la fonction utilise `onboarding@resend.dev`, qui fonctionne
   sans configuration (limité mais suffisant pour démarrer). Tu pourras brancher
   `flux-informations.com` plus tard dans Resend pour un email plus pro.

### 5. Déployer la fonction serveur (Edge Function)

Il faut l'outil en ligne de commande Supabase (une seule fois) :

```bash
npm install -g supabase
supabase login
cd flux-site
supabase link --project-ref TON_PROJECT_REF
```
(`TON_PROJECT_REF` est visible dans l'URL de ton projet Supabase : `https://supabase.com/dashboard/project/TON_PROJECT_REF`)

Puis renseigne les secrets (remplace par tes vraies clés) :

```bash
supabase secrets set GROQ_API_KEY=ta_cle_groq
supabase secrets set RESEND_API_KEY=ta_cle_resend
```

Et déploie la fonction :

```bash
supabase functions deploy chat
```

### 6. Brancher le site sur Supabase

Ouvre ces deux fichiers et remplace les deux lignes en haut par tes vraies valeurs
(Project URL et anon public key notées à l'étape 1) :
- `assets/js/chat-widget.js`
- `assets/js/admin.js`

```js
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

Envoie ensuite les changements sur GitHub (`git add . && git commit -m "config chat" && git push`) — le site se met à jour automatiquement.

### 7. Tester

- Sur le site public : la bulle de chat en bas à droite → entrer un email → coller le code
  reçu → poser une question sur les voitures électriques/le solaire/les économies. L'IA répond.
- Pose une question hors-sujet ou demande "je veux parler à quelqu'un" → l'IA bascule la conversation,
  un email arrive sur `devt23773@gmail.com` avec la question complète.
- Va sur `https://TON-SITE/admin.html`, connecte-toi avec **devt23773@gmail.com** (le seul compte
  autorisé à voir toutes les conversations — la sécurité est appliquée au niveau de la base de
  données, pas seulement dans le code, donc même en trichant côté navigateur personne d'autre
  ne peut y accéder), et réponds en direct : le visiteur voit la réponse apparaître instantanément
  dans son chat.

### Limites du plan gratuit (largement suffisant pour un site qui démarre)

- Supabase : 50 000 connexions/mois, 500 Mo de base de données, fonctions serveur incluses
- Groq : limite de requêtes par minute généreuse pour un site à faible trafic
- Resend : 100 emails/jour, 3 000/mois

Si le site grossit beaucoup, chacun de ces plans peut être payant à la carte —
mais pour démarrer, tout reste à 0 €.

