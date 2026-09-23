/* ==========================================================================
   AXWEVI — Configuration partagée (site public + tableau de bord)
   --------------------------------------------------------------------------
   SCRIPT_URL est l'adresse du Google Apps Script qui enregistre les
   réservations dans le Google Sheet. Elle est forcément visible dans le
   navigateur : c'est normal, elle n'ouvre l'accès à rien sans la clé.

   /!\ Ne jamais écrire la clé du tableau de bord (ADMIN_KEY) dans ce fichier
       ni dans aucun fichier du dépôt. Elle se tape à la main à la connexion.
   ========================================================================== */

window.AXWEVI_CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycby5oYg4xkYdJLs9B1HAzrvhHxOHPokrTwCV3WCC5aXczg6JSSJjLTyMAcFgGKeoytkxpw/exec",

  // Coordonnées reprises dans les messages d'erreur du formulaire
  PHONE_DISPLAY: "+229 01 61 54 41 99",
  PHONE_LINK: "+2290161544199",

  // Jours de fermeture (0 = dimanche … 6 = samedi)
  CLOSED_DAYS: [0],

  // Indicatifs proposés dans le formulaire. Le premier est sélectionné par
  // défaut : le Bénin, puis la sous-région, puis la diaspora.
  // `digits` impose un nombre exact de chiffres ; sans lui, 6 à 15 sont admis.
  DIAL_CODES: [
    { code: "+229", pays: "Bénin", digits: 10, exemple: "01 61 54 41 99" },
    { code: "+228", pays: "Togo", exemple: "90 12 34 56" },
    { code: "+225", pays: "Côte d'Ivoire", exemple: "01 23 45 67 89" },
    { code: "+226", pays: "Burkina Faso", exemple: "70 12 34 56" },
    { code: "+227", pays: "Niger", exemple: "90 12 34 56" },
    { code: "+234", pays: "Nigeria", exemple: "802 123 4567" },
    { code: "+233", pays: "Ghana", exemple: "24 123 4567" },
    { code: "+221", pays: "Sénégal", exemple: "77 123 45 67" },
    { code: "+223", pays: "Mali", exemple: "70 12 34 56" },
    { code: "+237", pays: "Cameroun", exemple: "6 71 23 45 67" },
    { code: "+241", pays: "Gabon", exemple: "06 12 34 56" },
    { code: "+33", pays: "France", exemple: "6 12 34 56 78" },
    { code: "+32", pays: "Belgique", exemple: "470 12 34 56" },
    { code: "+41", pays: "Suisse", exemple: "78 123 45 67" },
    { code: "+1", pays: "Canada / États-Unis", exemple: "514 123 4567" },
    { code: "+44", pays: "Royaume-Uni", exemple: "7400 123456" },
    { code: "+49", pays: "Allemagne", exemple: "151 12345678" },
    { code: "+212", pays: "Maroc", exemple: "6 12 34 56 78" },
    { code: "+971", pays: "Émirats arabes unis", exemple: "50 123 4567" }
  ],

  // Amplitude de service
  OPEN_TIME: "12:00",
  CLOSE_TIME: "22:00",

  // Pas entre deux créneaux proposés, en minutes
  SLOT_MINUTES: 30,

  // Combien de jours à l'avance on peut réserver
  MAX_DAYS_AHEAD: 120,

  // Le restaurant dispose de deux salons privatifs.
  VIP_ROOMS: ["Salon VIP 1", "Salon VIP 2"],

  // Un salon peut servir deux fois dans la journée : une table le midi
  // n'empêche pas une table le soir. La disponibilité se compte par service.
  SERVICES: [
    { id: "midi", label: "Déjeuner", from: "12:00", to: "16:59" },
    { id: "soir", label: "Dîner", from: "17:00", to: "22:00" }
  ]
};
