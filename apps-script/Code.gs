/**
 * AXWEVI — API des réservations (Google Apps Script)
 * ---------------------------------------------------------------------------
 * À coller dans Extensions > Apps Script depuis le Google Sheet, puis à
 * déployer en Application Web (voir docs/INSTALLATION.md).
 *
 * AVANT DE DÉPLOYER : remplacer CHANGE_MOI_CLE_SECRETE par une vraie clé.
 * Cette clé ne doit jamais être recopiée dans un fichier du dépôt GitHub.
 */

// --- Réglages ---------------------------------------------------------------

var SHEET_NAME = 'Reservations';

// Clé qui protège la lecture et la modification des réservations.
var ADMIN_KEY = 'CHANGE_MOI_CLE_SECRETE';

// Email prévenu à chaque nouvelle demande. Laisser '' pour désactiver.
var NOTIFY_EMAIL = '';

// « VIP » est ajouté en dernier, et non à sa place logique, pour que les
// réservations déjà enregistrées gardent leurs colonnes intactes.
var HEADERS = ['ID', 'Horodatage', 'Nom', 'Telephone', 'Email', 'Date',
               'Heure', 'Personnes', 'Plats', 'Message', 'Statut', 'VIP'];

var STATUS_COLUMN = 11;                       // colonne « Statut »
var ALLOWED_STATUS = ['En attente', 'Confirmée', 'Refusée'];
var MAX_LEN = 700;                            // garde-fou sur les champs libres

// --- Utilitaires ------------------------------------------------------------

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    return sheet;
  }

  // Feuille créée par une version antérieure : on complète la ligne d'en-tête
  // sans toucher aux réservations déjà enregistrées.
  if (sheet.getLastColumn() < HEADERS.length) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Nettoie une valeur reçue du formulaire avant de l'écrire dans la feuille.
 * Un texte commençant par = + - @ serait interprété comme une formule par
 * Google Sheets : on le préfixe d'une apostrophe pour le neutraliser.
 */
function clean_(value) {
  var text = String(value == null ? '' : value).slice(0, MAX_LEN).trim();
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return text;
}

function checkKey_(key) {
  return typeof key === 'string' && key === ADMIN_KEY;
}

// --- Écriture : nouvelle réservation ----------------------------------------

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut_({ ok: false, error: 'Requête vide' });
    }

    var data = JSON.parse(e.postData.contents);

    // Refus des demandes inexploitables : sans nom ni téléphone, on ne peut
    // ni rappeler le client ni confirmer la table.
    if (!data.fname || !data.fphone) {
      return jsonOut_({ ok: false, error: 'Nom et téléphone obligatoires' });
    }

    var sheet = getSheet_();
    var id = Utilities.getUuid();

    sheet.appendRow([
      id,
      new Date(),
      clean_(data.fname),
      clean_(data.fphone),
      clean_(data.femail),
      clean_(data.fdate),
      clean_(data.ftime),
      clean_(data.fguests),
      clean_(data.fdishes),
      clean_(data.fmessage),
      'En attente',
      data.fvip === 'VIP' ? 'VIP' : 'Salle'
    ]);

    notify_(data);
    return jsonOut_({ ok: true, id: id });

  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message || err) });
  }
}

/** Alerte email — une panne d'envoi ne doit jamais faire échouer la réservation. */
function notify_(data) {
  if (!NOTIFY_EMAIL) return;
  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: 'Axwevi — nouvelle réservation : ' + data.fname,
      body: [
        'Nouvelle demande de réservation.',
        '',
        'Nom       : ' + (data.fname || ''),
        'Téléphone : ' + (data.fphone || ''),
        'Email     : ' + (data.femail || '—'),
        'Date      : ' + (data.fdate || '') + ' à ' + (data.ftime || ''),
        'Personnes : ' + (data.fguests || ''),
        'Table     : ' + (data.fvip === 'VIP' ? 'ESPACE VIP demandé' : 'Salle'),
        'Plats     : ' + (data.fdishes || '—'),
        'Message   : ' + (data.fmessage || '—'),
        '',
        'Ouvrez le tableau de bord pour confirmer ou refuser.'
      ].join('\n')
    });
  } catch (err) {
    // On avale volontairement l'erreur : la réservation est déjà enregistrée.
  }
}

// --- Lecture et mise à jour --------------------------------------------------

function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    var action = params.action;

    if (!checkKey_(params.key)) {
      return jsonOut_({ ok: false, error: 'Clé invalide' });
    }

    if (action === 'list') return list_();
    if (action === 'update') return update_(params.id, params.status);

    return jsonOut_({ ok: false, error: 'Action inconnue' });

  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message || err) });
  }
}

function list_() {
  var sheet = getSheet_();
  var rows = sheet.getDataRange().getValues();

  if (rows.length < 2) return jsonOut_({ ok: true, items: [] });

  // Fuseau de la feuille, et non UTC : sans cela, une réservation du 25 à
  // midi peut repartir datée du 24 et fausser le calcul des salons VIP.
  var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();

  var headers = rows.shift();
  var items = rows.map(function (row) {
    var obj = {};
    headers.forEach(function (header, i) {
      var value = row[i];

      if (!(value instanceof Date)) {
        obj[header] = value;
        return;
      }

      // Une heure seule devient chez Sheets une date au 30/12/1899 : renvoyée
      // telle quelle, elle s'afficherait « 1899- » côté tableau de bord.
      if (header === 'Heure') obj[header] = Utilities.formatDate(value, tz, 'HH:mm');
      else if (header === 'Date') obj[header] = Utilities.formatDate(value, tz, 'yyyy-MM-dd');
      else obj[header] = Utilities.formatDate(value, tz, "yyyy-MM-dd'T'HH:mm:ss");
    });
    return obj;
  }).reverse();                                // la plus récente en premier

  return jsonOut_({ ok: true, items: items });
}

function update_(id, status) {
  if (!id) return jsonOut_({ ok: false, error: 'Identifiant manquant' });
  if (ALLOWED_STATUS.indexOf(status) === -1) {
    return jsonOut_({ ok: false, error: 'Statut non autorisé' });
  }

  var sheet = getSheet_();
  var ids = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();

  for (var i = 1; i < ids.length; i++) {
    if (ids[i][0] === id) {
      sheet.getRange(i + 1, STATUS_COLUMN).setValue(status);
      return jsonOut_({ ok: true });
    }
  }

  return jsonOut_({ ok: false, error: 'Réservation introuvable' });
}
