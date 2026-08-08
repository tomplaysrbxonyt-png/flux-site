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
