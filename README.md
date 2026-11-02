# Catalogue bymood.

Catalogue d'inspirations hors site, montré en rendez-vous ou envoyé par lien à un prospect. Page statique (HTML, CSS, JS sans dépendance), non indexée, non reliée à bymood.fr. Adresse prévue : `catalogue.bymood.fr`.

## Ajouter des photos

1. Déposer les photos dans `photos/<catégorie>/` (voir `categories.json` : `cuisine`, `salle-de-bain`, `mur-tv`, `cheminee`, `escalier`, `salon`). JPEG, PNG, HEIC ou WebP.
2. Nommer chaque fichier `NN-legende.jpg` : le numéro fixe l'ordre, le reste devient la légende (`03-cheminée-en-pierre.jpg` → « Cheminée en pierre »).
3. Pour choisir l'image du bandeau d'accueil, nommer un fichier `couverture.jpg` (il n'apparaît pas dans les variantes). Sinon, la première photo horizontale sert de bandeau.
4. Lancer `npm run images` : les images web sont générées dans `images/` et `data.js` est mis à jour. Retirer une photo de `photos/` la retire aussi du catalogue.

Prérequis : macOS et `cwebp` (`brew install webp`).

## Ajouter ou renommer une catégorie

Modifier `categories.json` (identifiant `slug` = nom du dossier, titre, accroche), puis `npm run images`.

## Prévisualiser

`npm run dev`, puis ouvrir http://127.0.0.1:4321/. Ouvrir `index.html` directement fonctionne aussi.

## Confidentialité

`robots.txt` et la balise `noindex` empêchent l'indexation ; l'adresse n'est liée nulle part. Ce n'est pas un contrôle d'accès : toute personne qui a le lien peut consulter la page.
