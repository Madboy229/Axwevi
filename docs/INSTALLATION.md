# Installation du tableau de bord des réservations

Ce guide branche le site sur un vrai tableau de bord, en une dizaine de
minutes, gratuitement, avec un simple compte Google.

Le principe : le formulaire du site envoie la demande à un petit script Google,
qui l'enregistre dans un Google Sheet. L'équipe consulte et confirme les
réservations depuis la page « Espace équipe ».

---

## Étape 1 — Créer le Google Sheet

1. Aller sur [sheets.google.com](https://sheets.google.com) et créer une feuille vide.
2. La nommer par exemple **Réservations Axwevi**.
3. La laisser vide : le script crée les colonnes tout seul à la première demande.

## Étape 2 — Choisir une clé d'accès

La clé protège l'accès aux réservations. Quiconque la connaît peut lire les
noms, téléphones et emails des clients.

- **Au moins 16 caractères**, mélangeant lettres, chiffres et ponctuation.
- Un mot simple (prénom, nom du restaurant, date de naissance) ne convient pas.
- Elle ne doit **jamais** être écrite dans un fichier du dépôt GitHub.
- La conserver dans un gestionnaire de mots de passe et ne la transmettre
  qu'aux personnes qui gèrent les réservations.

## Étape 3 — Installer le script

1. Dans le Google Sheet : menu **Extensions > Apps Script**.
2. Supprimer le contenu par défaut (`function myFunction() {}`).
3. Copier tout le contenu du fichier [`apps-script/Code.gs`](../apps-script/Code.gs)
   de ce dépôt et le coller à la place.
4. Dans le code collé, remplacer :
   ```javascript
   var ADMIN_KEY = 'CHANGE_MOI_CLE_SECRETE';
   ```
   par la clé choisie à l'étape 2.
5. Facultatif — pour recevoir un email à chaque nouvelle demande, renseigner :
   ```javascript
   var NOTIFY_EMAIL = 'adresse@exemple.com';
   ```
6. Enregistrer (icône disquette), nommer le projet « Axwevi Reservations API ».

## Étape 4 — Déployer en application web

1. En haut à droite : **Déployer > Nouveau déploiement**.
2. Cliquer sur la roue crantée à côté de « Sélectionner le type », choisir
   **Application Web**.
3. Régler ainsi :
   - Description : `API réservations Axwevi`
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
4. **Déployer**, puis autoriser l'accès quand Google le demande (c'est votre
   propre script, sur vos propres données).
5. Copier **l'URL de l'application Web**, de la forme
   `https://script.google.com/macros/s/XXXXXXX/exec`.

> « Qui a accès : Tout le monde » signifie que l'adresse du script est
> publique — c'est nécessaire pour qu'un visiteur puisse envoyer une demande.
> Sans la clé, elle ne permet de lire aucune réservation.

## Étape 5 — Relier le site

Ouvrir [`assets/js/config.js`](../assets/js/config.js) et remplacer la valeur de
`SCRIPT_URL` par l'URL copiée à l'étape 4.5 :

```javascript
window.AXWEVI_CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/XXXXXXX/exec",
  ...
};
```

Un seul fichier à modifier : le site public et le tableau de bord le
partagent tous les deux.

Puis publier : `git add -A && git commit -m "Nouvelle URL du script" && git push`.

## Étape 6 — Utiliser le tableau de bord

1. Ouvrir la page « Espace équipe » (son adresse figure dans le README).
2. Saisir la clé choisie à l'étape 2.
3. Les réservations s'affichent, de la plus récente à la plus ancienne, avec
   les boutons **Confirmer**, **Refuser** et **Appeler**.
4. Le statut se met aussi à jour dans le Google Sheet, consultable à tout moment.

La clé est gardée le temps de l'onglet seulement : fermer l'onglet déconnecte.

---

## Mettre à jour le script plus tard

Après toute modification du code dans Apps Script :

1. **Déployer > Gérer les déploiements**
2. Cliquer sur le crayon (modifier)
3. Choisir **Nouvelle version** dans la liste déroulante
4. **Déployer**

L'URL ne change pas : rien à modifier dans les fichiers du site.

---

## Changer la clé

À faire immédiatement si la clé a pu être vue par quelqu'un d'autre.

1. Apps Script > modifier `ADMIN_KEY`
2. Redéployer en nouvelle version (voir ci-dessus)
3. Communiquer la nouvelle clé à l'équipe

Aucune modification du site n'est nécessaire : la clé n'y figure nulle part.

---

## Ce que ce dispositif protège, et ce qu'il ne protège pas

**Il protège** contre un visiteur de passage : sans la clé, l'adresse du script
ne renvoie aucune réservation, et l'adresse de l'espace équipe n'est ni
référencée par Google ni liée depuis le site.

**Il ne protège pas** contre quelqu'un à qui on a donné la clé, ni contre une
clé trop simple à deviner. C'est un dispositif adapté à un restaurant, pas à
des données bancaires. Les règles qui comptent vraiment : une clé longue,
transmise uniquement à l'équipe, changée dès qu'un doute apparaît.
