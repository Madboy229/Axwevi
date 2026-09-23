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
