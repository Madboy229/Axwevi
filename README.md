# Axwevi — site du restaurant

Site vitrine et système de réservation d'**Axwevi**, restaurant de cuisine
béninoise revisitée à Saint Michel, Cotonou.

> L'art culinaire africain

## Ce que contient le projet

| Élément | Rôle |
|---|---|
| Page publique | Présentation, histoire, carte complète, infos pratiques, formulaire de réservation |
| Espace équipe | Tableau de bord privé pour consulter, confirmer ou refuser les demandes |
| Script Google | Enregistre les réservations dans un Google Sheet et les relit pour l'équipe |

Aucun framework, aucune étape de compilation, aucune dépendance à installer :
du HTML, du CSS et du JavaScript servis tels quels.

## Structure

```
.
├── index.html              Page publique
├── espace-*.html           Tableau de bord (adresse volontairement non devinable)
├── assets/
│   ├── css/
│   │   ├── tokens.css      Couleurs, typographie, espacements — partagés
│   │   ├── site.css        Styles de la page publique
│   │   └── admin.css       Styles du tableau de bord
│   └── js/
│       ├── config.js       URL du script, horaires, jours de fermeture
│       ├── site.js         Navigation, onglets de la carte, formulaire
│       └── admin.js        Connexion, liste, filtres, changement de statut
├── apps-script/
│   └── Code.gs             Code à coller dans Google Apps Script
└── docs/
    └── INSTALLATION.md     Mise en place pas à pas du tableau de bord
```

## Travailler sur le site

Ouvrir `index.html` dans un navigateur suffit pour voir les changements.

Pour que le formulaire fonctionne à l'identique du site en ligne, servir le
dossier plutôt que d'ouvrir le fichier directement :

```bash
python -m http.server 8000
```

Puis se rendre sur `http://localhost:8000`.

## Modifier la carte

Toute la carte vit dans `index.html`, section `<section class="menu">`, sous
forme de blocs `<article class="dish">`. Pour ajouter un plat, dupliquer un
bloc existant et changer le nom, le prix et les descriptions.

Le sélecteur « Plats souhaités » du formulaire est **construit automatiquement**
à partir de la carte : rien à tenir à jour en double. Chaque plat y porte un
compteur, pour qu'une tablée puisse en commander plusieurs parts. Pour qu'un
élément n'y apparaisse pas (les accompagnements, les boissons), lui ajouter
l'attribut `data-no-pick` :

```html
<article class="dish" data-no-pick>
```

## Modifier les horaires, le téléphone, les jours de fermeture

- Ce qui est **affiché** : dans `index.html`, sections « Infos pratiques » et
  pied de page, plus le bloc `application/ld+json` en haut du fichier (la fiche
  lue par Google).
- Ce qui est **contrôlé à la saisie** : dans `assets/js/config.js`
  (`OPEN_TIME`, `CLOSE_TIME`, `SLOT_MINUTES`, `CLOSED_DAYS`, `MAX_DAYS_AHEAD`).

La liste des heures proposées est construite depuis ces réglages : élargir le
service ou passer les créneaux au quart d'heure ne demande que de changer
`CLOSE_TIME` ou `SLOT_MINUTES`.

Penser à modifier les deux, sinon le formulaire et la page se contredisent.

## Réservations

Le formulaire exige le nom, le téléphone, la date, l'heure, le nombre de
personnes et le type de table (**Salle** ou **Espace VIP**, Salle par défaut).
Le choix des plats et le message restent facultatifs. Sont refusées côté
navigateur : les dates passées et les dimanches (fermeture).

L'heure se choisit dans une liste de créneaux de 30 minutes allant de 12h00 à
22h00 : rien en dehors du service n'est proposé. Pour une réservation le jour
même, les créneaux déjà passés disparaissent de la liste.

Les plats se choisissent en quantité, jusqu'à 20 parts par plat, et arrivent
dans le tableau de bord sous la forme `2 × Agneau Royal, 1 × Monyo`.

Une demande VIP est signalée dans le tableau de bord par un badge doré, un
liseré sur la fiche, un compteur dédié et un filtre.

La demande n'est déclarée transmise que si le serveur confirme l'avoir
enregistrée. En cas d'échec, le visiteur reçoit le numéro de téléphone du
restaurant.

Mise en place complète du tableau de bord : [`docs/INSTALLATION.md`](docs/INSTALLATION.md).

## Sécurité

- La clé du tableau de bord **n'est dans aucun fichier** de ce dépôt. Elle est
  saisie à la connexion et conservée le temps de l'onglet.
- L'URL du script Google est publique par nécessité : sans la clé, elle ne
  donne accès à aucune réservation.
- L'espace équipe n'est ni indexé par les moteurs, ni lié depuis le site.
- Les textes saisis par les visiteurs sont insérés dans le tableau de bord
  comme du texte, jamais comme du HTML, et neutralisés avant écriture dans le
  Google Sheet pour qu'ils ne puissent pas y devenir des formules.

## Mise en ligne

Le site est publié avec GitHub Pages depuis la branche `main`. Chaque `git push`
met la version en ligne à jour, en une minute environ.

Pour garder le code source privé tout en gardant un hébergement gratuit,
Netlify, Vercel ou Cloudflare Pages savent déployer depuis un dépôt privé.
