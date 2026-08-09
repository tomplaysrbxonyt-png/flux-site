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

## Chatbot IA + espace admin (100% gratuit, sans compte visiteur)

Le chat ne demande **rien** au visiteur pour discuter — il est identifié par un
identifiant anonyme stocké dans son navigateur. Son email n'est demandé **que**
si l'IA doit transmettre la question à un humain. L'espace admin est protégé
par un **code secret** que tu choisis toi-même (pas de compte à créer).

**Services utilisés, tous gratuits pour un petit site :**
- [Supabase](https://supabase.com) — base de données + exécution du code serveur (fonctions)
- [Groq](https://console.groq.com) — l'IA qui répond aux visiteurs (modèle Llama, gratuit, rapide)
- [Resend](https://resend.com) — l'envoi de l'email à `devt23773@gmail.com` quand l'IA ne sait pas répondre

### 1. Créer le projet Supabase

1. Va sur https://supabase.com → crée un compte → **New project**
2. Une fois créé : **SQL Editor** → colle tout le contenu de `supabase/schema.sql` → **Run**
3. Va dans **Project Settings → API**, note ton **Project URL** (ex: `https://abcdefgh.supabase.co`) — c'est tout ce dont tu as besoin de cette page, plus besoin d'aucune clé ici.

### 2. Créer la clé Groq (l'IA, gratuite)

https://console.groq.com → compte → **API Keys → Create API Key** → copie la clé.

### 3. Créer la clé Resend (l'envoi d'email, gratuit)

https://resend.com → compte → **API Keys → Create API Key** → copie la clé.
Pas besoin de connecter de domaine pour commencer (`onboarding@resend.dev` fonctionne directement).

### 4. Choisir ton code admin

Choisis toi-même un code secret pour accéder à `/admin.html` — une phrase ou une suite
de caractères que tu es seul à connaître (pas besoin d'email, pas de compte).

### 5. Installer l'outil Supabase et déployer les 2 fonctions

```bash
npm install -g supabase
supabase login
cd flux-site
supabase link --project-ref TON_PROJECT_REF
```
(`TON_PROJECT_REF` = la partie avant `.supabase.co` dans ton Project URL)

Renseigne tes secrets :

```bash
supabase secrets set GROQ_API_KEY=ta_cle_groq
supabase secrets set RESEND_API_KEY=ta_cle_resend
supabase secrets set ADMIN_CODE=ton_code_secret_admin
```

Déploie les deux fonctions — **le `--no-verify-jwt` est important**, il évite tout
système d'authentification technique inutile ici :

```bash
supabase functions deploy chat --no-verify-jwt
supabase functions deploy admin --no-verify-jwt
```

### 6. Brancher le site

Ouvre `assets/js/chat-widget.js`, remplace la ligne du haut par ton URL de fonction :
```js
const CHAT_ENDPOINT = 'https://abcdefgh.supabase.co/functions/v1/chat';
```

Ouvre `assets/js/admin.js`, fais pareil :
```js
const ADMIN_ENDPOINT = 'https://abcdefgh.supabase.co/functions/v1/admin';
```

Envoie sur GitHub :
```bash
git add .
git commit -m "config chat v2"
git push
```

### 7. Tester

- Bulle de chat en bas à droite → poser directement une question, sans rien remplir.
- Poser une question hors-sujet ou écrire "je veux parler à quelqu'un" → le bot demande
  un email → le donner → un email arrive sur `devt23773@gmail.com` avec la question.
- Aller sur `https://TON-SITE/admin.html` → entrer ton code admin → la conversation
  apparaît (mise à jour toutes les quelques secondes) → répondre → la réponse apparaît
  dans le chat du visiteur en quelques secondes, sans qu'il ait besoin de recharger la page.

### Limites du plan gratuit

- Supabase : fonctions serveur incluses, largement suffisant pour un site qui démarre
- Groq : limite de requêtes par minute généreuse pour un faible trafic
- Resend : 100 emails/jour, 3 000/mois

---

## Notifications push gratuites sur ton téléphone (ntfy.sh)

Pas de compte, pas de carte bancaire, pas de limite gênante. Voici comment l'activer :

### 1. Installer l'application

- **Android** : [ntfy sur le Play Store](https://play.google.com/store/apps/details?id=io.heckel.ntfy)
- **iPhone** : [ntfy sur l'App Store](https://apps.apple.com/us/app/ntfy/id1625396347)

### 2. Choisir un nom de "canal" secret

C'est comme une adresse privée pour tes notifications — n'importe qui connaissant ce nom
exact pourrait voir tes alertes, donc choisis quelque chose long et impossible à deviner.
Exemple : `flux-alertes-8f2x91qz`

### 3. S'abonner dans l'app

Ouvre l'app ntfy → **+** (Subscribe to topic) → colle exactement le même nom que tu as choisi
→ Subscribe. C'est tout, aucun compte à créer.

### 4. Brancher ce nom sur le site

Dans le terminal :
```bash
supabase secrets set NTFY_TOPIC=flux-alertes-8f2x91qz
supabase functions deploy chat --no-verify-jwt
```

Désormais, à chaque fois qu'une conversation a besoin d'un humain, tu reçois à la fois
un email **et** une notification sur ton téléphone, en quelques secondes.

### Et le SMS classique, si tu préfères ?

C'est possible via [Twilio](https://www.twilio.com), mais sois prévenu : ce n'est jamais
gratuit indéfiniment. Twilio offre un crédit d'essai (environ 15$), après quoi chaque SMS
coûte environ 0,07€ et la location du numéro d'envoi environ 1€/mois — il faut renseigner
une carte bancaire, et **ça débite** une fois le crédit d'essai épuisé (les montants restent
faibles pour un petit volume, mais ce n'est pas gratuit à vie comme ntfy). Dis-moi si tu veux
que je l'ajoute en plus malgré tout.

---

## Nouveautés de cette version

- **Correction** : un message envoyé n'apparaît plus en double dans le chat.
- **IA verrouillée après intervention humaine** : dès qu'un admin répond à une conversation,
  l'IA ne reprend plus jamais la main automatiquement — il faut cliquer "Repasser à l'IA".
- **Boutons admin** : "Repasser à l'IA", "Marquer terminé", "Rouvrir" selon le statut de
  la conversation.
- **Dossiers** : dans l'espace admin, crée des dossiers ("+ Dossier") et déplace chaque
  conversation dedans via le petit menu déroulant à droite de chaque conversation dans
  la liste. Filtre la liste en cliquant sur un dossier en haut de la barre latérale.
- **Notifications push gratuites** (ntfy.sh) en plus de l'email — voir ci-dessus.

N'oublie pas de redéployer les 2 fonctions après avoir remplacé les fichiers :
```bash
supabase functions deploy chat --no-verify-jwt
supabase functions deploy admin --no-verify-jwt
```
Et de relancer `supabase/schema.sql` dans le SQL Editor (ajoute la colonne "dossier",
sans danger à relancer).

---

## Version 3 — saisie en direct, notation, nouvelle conversation après clôture

### Ce qui a changé

- **"..." animé en direct** : quand le visiteur tape, l'admin voit un indicateur dans le
  fil ; quand l'admin tape, le visiteur voit le même indicateur dans le chat. Actualisé
  toutes les 2-3 secondes (le site n'ayant pas de connexion permanente, ce n'est pas
  instantané à la milliseconde près, mais l'effet est fluide en pratique).
- **Notation après "Terminé"** : quand tu cliques "Marquer terminé", le visiteur voit
  apparaître 5 étoiles dans son chat pour noter l'échange. La note est enregistrée
  (visible dans la base `conversations.rating`, pas encore affichée dans l'espace admin —
  dis-moi si tu veux que je l'ajoute à la liste).
- **Nouvelle conversation après clôture** : si ce même visiteur revient plus tard et rouvre
  le chat, il ne retrouve pas l'ancienne conversation clôturée — une toute nouvelle
  conversation vierge démarre automatiquement, avec un nouveau message de bienvenue.

### Pour tout mettre à jour

1. Remplace tous les fichiers du zip dans ton dossier local
2. Relance `supabase/schema.sql` dans le SQL Editor (ajoute les nouvelles colonnes,
   sans danger à relancer)
3. Redéploie les deux fonctions :
   ```bash
   supabase functions deploy chat --no-verify-jwt
   supabase functions deploy admin --no-verify-jwt
   ```
4. `git add . && git commit -m "v3 : saisie en direct, notation, reset conversation" && git push`

### Si les notifications push ne t'arrivent toujours pas

Vérifie dans l'ordre :
1. `supabase secrets list` → le nom `NTFY_TOPIC` doit apparaître (la valeur reste cachée, c'est normal)
2. As-tu bien redéployé la fonction `chat` **après** avoir fait `supabase secrets set NTFY_TOPIC=...` ?
   (`secrets set` seul ne suffit pas — il faut redéployer pour qu'elle prenne effet)
3. Dans l'app ntfy sur ton téléphone, vérifie que tu es bien abonné au nom **exactement identique**,
   caractère pour caractère (majuscules/minuscules comprises), à celui mis dans `NTFY_TOPIC`
4. Vérifie que les notifications sont autorisées pour l'app ntfy dans les réglages de ton téléphone
5. Test manuel pour isoler le problème — colle ceci dans un terminal (remplace le nom du topic) :
   ```bash
   curl -d "Test manuel" https://ntfy.sh/flux-alertes-8f2x91qz
   ```
   Si tu reçois ce test mais pas les vraies alertes → le souci vient de la fonction `chat`
   (regarde l'onglet **Logs** de la fonction sur le dashboard Supabase pour voir l'erreur).
   Si tu ne reçois même pas ce test → le souci vient de l'app/l'abonnement sur ton téléphone.
