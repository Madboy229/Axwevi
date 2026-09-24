/**
 * AXWEVI — Récupération des numéros affichés #ERROR!
 * ---------------------------------------------------------------------------
 * À n'exécuter qu'une fois, et seulement si la colonne Telephone du tableur
 * affiche #ERROR! sur certaines lignes.
 *
 * POURQUOI CES NUMÉROS SONT CASSÉS
 * Google Sheets lit toute valeur commençant par = + - @ comme une formule.
 * Un numéro écrit « +229 0142095946 » n'en est pas une valide : la cellule
 * affiche alors #ERROR!.
 *
 * POURQUOI ILS SONT RÉCUPÉRABLES
 * Une formule invalide s'affiche en erreur, mais la feuille conserve le texte
 * saisi. getFormula() le rend, là où getValue() ne rend que l'erreur.
 *
 * MARCHE À SUIVRE
 * 1. Dans le tableur : Extensions > Apps Script
 * 2. Coller cette fonction À LA SUITE du code existant, sans rien effacer
 * 3. Choisir « reparerTelephones » dans la liste déroulante du haut, puis Exécuter
 * 4. Autoriser l'accès si Google le demande
 * 5. Revenir au tableur : les numéros sont revenus
 *
 * La fonction ne touche qu'aux cellules cassées et peut être relancée sans
 * risque : une cellule déjà saine est laissée telle quelle.
 */
function reparerTelephones() {
  var SHEET_NAME = 'Reservations';
  var COLONNE_TELEPHONE = 4;                 // colonne D

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    Logger.log('Feuille « ' + SHEET_NAME + ' » introuvable.');
    return;
  }

  var dernier = sheet.getLastRow();
  if (dernier < 2) {
    Logger.log('Aucune réservation à traiter.');
    return;
  }

  var plage = sheet.getRange(2, COLONNE_TELEPHONE, dernier - 1, 1);
  var formules = plage.getFormulas();        // le texte d'origine survit ici
  var valeurs = plage.getValues();

  var repares = 0;
  var sortie = valeurs.map(function (ligne, i) {
    var formule = formules[i][0];

    // Cellule saine : rien à faire
    if (!formule) return [ligne[0]];

    // L'apostrophe force l'enregistrement en texte : la feuille ne tentera
    // plus de l'évaluer.
    repares += 1;
    return ["'" + String(formule).replace(/^=/, '')];
  });

  plage.setValues(sortie);
  Logger.log(repares + ' numéro(s) récupéré(s) sur ' + (dernier - 1) + ' ligne(s).');
}
