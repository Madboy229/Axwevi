/* ==========================================================================
   AXWEVI — Champ téléphone international
   Commun au formulaire de réservation et au bon de commande.

   Usage :
     var tel = window.AXWEVI_PHONE.attach({
       dial: "#fdial", input: "#fphone", onClear: function () {}
     });
     tel.validate();   // → null si correct, sinon un message
     tel.compose();    // → « 00229 0142095946 », prêt pour le tableur
   ========================================================================== */

(function () {
  "use strict";

  var CFG = window.AXWEVI_CONFIG || {};
  var DIALS = CFG.DIAL_CODES || [];

  function attach(options) {
    var dialSelect = document.querySelector(options.dial);
    var input = document.querySelector(options.input);
    var onClear = options.onClear || function () {};

    if (!dialSelect || !input) return null;

    var selected = function () {
      return DIALS[dialSelect.selectedIndex] || DIALS[0] || { code: "+229" };
    };

    /**
     * Ne garde que les chiffres, et retire le 0 de composition locale quand le
     * pays en utilise un : beaucoup tapent « 06 12 34 56 78 » pour la France,
     * alors qu'à l'international le numéro commence à 6. Le 0 n'est retiré que
     * s'il fait dépasser la longueur attendue, jamais au Bénin ni en Côte
     * d'Ivoire, où il appartient au numéro.
     */
    var localDigits = function () {
      var entry = selected();
      var digits = String(input.value || "").replace(/[^0-9]/g, "");
      if (entry.trunk && digits.charAt(0) === "0" && digits.length > (entry.max || 15)) {
        digits = digits.slice(1);
      }
      return digits;
    };

    /** « 10 chiffres », « 9 ou 10 chiffres », « entre 10 et 11 chiffres ». */
    var expected = function (entry) {
      var min = entry.min || 6;
      var max = entry.max || 15;
      if (min === max) return min + " chiffres";
      if (max - min === 1) return min + " ou " + max + " chiffres";
      return "entre " + min + " et " + max + " chiffres";
    };

    /**
     * Borne la saisie en direct : lettres et symboles écartés, et pas un
     * chiffre de plus que ce que le pays autorise. Un pays à 0 de composition
     * locale tolère un chiffre de plus, le temps que ce 0 soit retiré à l'envoi.
     */
    var cap = function () {
      var entry = selected();
      var allowed = (entry.max || 15) + (entry.trunk ? 1 : 0);
      var raw = input.value;
      var caret = input.selectionStart;

      var out = "";
      var count = 0;
      var dropped = false;
      for (var i = 0; i < raw.length; i++) {
        var ch = raw.charAt(i);
        if (ch >= "0" && ch <= "9") {
          if (count >= allowed) { dropped = true; continue; }
          count += 1;
          out += ch;
        } else if (ch === " " || ch === "." || ch === "-") {
          out += ch;
        }
      }

      if (dropped) out = out.replace(/[\s.-]+$/, "");
      if (out === raw) return;

      input.value = out;
      var moved = Math.max(0, caret - (raw.length - out.length));
      try { input.setSelectionRange(moved, moved); } catch (e) { /* ignore */ }
    };

    // Construction de la liste, Bénin en premier
    DIALS.forEach(function (entry) {
      var option = document.createElement("option");
      option.value = entry.code;
      option.textContent = entry.code + " " + entry.pays;
      dialSelect.appendChild(option);
    });
    dialSelect.selectedIndex = 0;

    dialSelect.addEventListener("change", function () {
      input.placeholder = selected().exemple || "";
      cap();
      onClear();
    });

    input.addEventListener("input", cap);

    return {
      /** null si le numéro convient, sinon le message à afficher. */
      validate: function () {
        var entry = selected();
        var digits = localDigits();
        if (!digits) return "Merci d'indiquer votre numéro, il nous sert à vous joindre.";

        var min = entry.min || 6;
        var max = entry.max || 15;
        if (digits.length < min || digits.length > max) {
          return (entry.pays || "Ce pays") + " : le numéro compte " +
            expected(entry) + " — par exemple " + (entry.exemple || "") + ".";
        }
        return null;
      },

      /**
       * Numéro complet pour l'équipe, en notation 00 : une valeur qui commence
       * par un chiffre ne peut jamais être prise pour une formule par Google
       * Sheets, contrairement à une qui commence par +.
       */
      compose: function () {
        var entry = selected();
        var typed = String(input.value || "").trim();
        var digits = typed.replace(/[^0-9]/g, "");
        if (entry.trunk && digits.charAt(0) === "0" && digits.length > (entry.max || 15)) {
          typed = typed.replace("0", "").trim();
        }
        return entry.code.replace("+", "00") + " " + typed.replace(/\s+/g, " ");
      }
    };
  }

  window.AXWEVI_PHONE = { attach: attach };
})();
