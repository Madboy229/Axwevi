/* ==========================================================================
   AXWEVI — Comportements de la page publique
   Dépend de config.js (chargé avant).
   ========================================================================== */

(function () {
  "use strict";

  var CFG = window.AXWEVI_CONFIG || {};
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /* ---------------------------------------------------- Téléphone -------- */

  var tel = window.AXWEVI_PHONE
    ? window.AXWEVI_PHONE.attach({
        dial: "#fdial",
        input: "#fphone",
        onClear: function () { setError("fphone", ""); }
      })
    : null;

  /* --------------------------------------------- Créneaux de service ----- */

  var timeSelect = $("#ftime");

  var toMinutes = function (hhmm) {
    var parts = String(hhmm || "").split(":");
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  };
  var fromMinutes = function (total) {
    return pad(Math.floor(total / 60)) + ":" + pad(total % 60);
  };

  /**
   * Ne propose que les créneaux du service : en dehors de 12h–22h, il n'y a
   * rien à choisir. Pour une réservation le jour même, les créneaux déjà
   * passés sont retirés de la liste.
   */
  var buildTimeSlots = function () {
    if (!timeSelect) return;

    var open = toMinutes(CFG.OPEN_TIME || "12:00");
    var close = toMinutes(CFG.CLOSE_TIME || "22:00");
    var step = CFG.SLOT_MINUTES || 30;
    var previous = timeSelect.value;

    var now = new Date();
    var isToday = dateInput && dateInput.value === toISO(now);
    var cutoff = now.getHours() * 60 + now.getMinutes();

    timeSelect.innerHTML = "";

    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choisir";
    timeSelect.appendChild(placeholder);

    var available = 0;
    for (var m = open; m <= close; m += step) {
      if (isToday && m <= cutoff) continue;
      var option = document.createElement("option");
      option.value = fromMinutes(m);
      option.textContent = fromMinutes(m).replace(":", "h");
      timeSelect.appendChild(option);
      available += 1;
    }

    if (!available) {
      placeholder.textContent = "Plus de créneau ce jour — choisissez une autre date";
    }

    // Garder le choix précédent tant qu'il reste proposé
    var stillOffered = previous !== "" && Array.prototype.some.call(
      timeSelect.options, function (o) { return o.value === previous; }
    );
    timeSelect.value = stillOffered ? previous : "";
  };

  buildTimeSlots();
  if (dateInput) dateInput.addEventListener("change", buildTimeSlots);

  var setError = function (id, message) {
    var field = document.getElementById(id);
    var slot = document.getElementById("err-" + id);
    if (field) field.setAttribute("aria-invalid", message ? "true" : "false");
    if (slot) {
      slot.textContent = message || "";
      slot.classList.toggle("is-visible", Boolean(message));
    }
  };

  var clearErrors = function () {
    ["fname", "fphone", "fdate", "ftime", "fguests", "femail"].forEach(function (id) {
      setError(id, "");
    });
  };

  var showMessage = function (text, isError) {
    if (!confirmBox) return;
    confirmBox.textContent = text;
    confirmBox.classList.toggle("is-error", Boolean(isError));
    confirmBox.classList.add("is-visible");
  };

  /**
   * Google Sheets lit toute valeur commençant par = + - @ comme une formule,
   * et écrit #ERROR! quand elle n'en est pas une valide.
   *
   * L'apostrophe qui protège une saisie au clavier n'est pas interprétée quand
   * la valeur arrive par script : elle serait stockée telle quelle. Une espace
   * initiale, elle, suffit toujours à empêcher l'évaluation, et ne se voit pas.
   */
  var sheetSafe = function (value) {
    var text = String(value == null ? "" : value);
    return /^[=+\-@]/.test(text) ? " " + text : text;
  };

  var formatDate = function (iso) {
    if (!iso) return "";
    var d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
  };

  // Renvoie le premier champ en faute, ou null si tout est bon
  var validate = function (data) {
    clearErrors();
    var firstBad = null;
    var fail = function (id, msg) {
      setError(id, msg);
      if (!firstBad) firstBad = id;
    };

    if (!data.fname || data.fname.trim().length < 2) {
      fail("fname", "Merci d'indiquer votre nom.");
    }

    var telErr = tel ? tel.validate() : null;
    if (telErr) fail("fphone", telErr);

    if (!data.fdate) {
      fail("fdate", "Choisissez une date.");
    } else {
      var picked = new Date(data.fdate + "T00:00:00");
      var midnight = new Date();
      midnight.setHours(0, 0, 0, 0);

      if (isNaN(picked.getTime())) {
        fail("fdate", "Date invalide.");
      } else if (picked < midnight) {
        fail("fdate", "Cette date est déjà passée.");
      } else if ((CFG.CLOSED_DAYS || []).indexOf(picked.getDay()) !== -1) {
        fail("fdate", "Nous sommes fermés le dimanche. Choisissez un autre jour.");
      }
    }

    if (!data.ftime) {
      fail("ftime", "Choisissez une heure.");
    } else if (data.ftime < (CFG.OPEN_TIME || "12:00") || data.ftime > (CFG.CLOSE_TIME || "22:00")) {
      fail("ftime", "Le service est de " + (CFG.OPEN_TIME || "12:00") +
                    " à " + (CFG.CLOSE_TIME || "22:00") + ".");
    }

    if (!data.fguests) {
      fail("fguests", "Indiquez le nombre de personnes.");
    }

    if (data.femail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.femail)) {
      fail("femail", "Cette adresse email semble incorrecte.");
    }

    return firstBad;
  };

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var formData = new FormData(form);
      var data = {};
      formData.forEach(function (value, key) {
        data[key] = typeof value === "string" ? value.trim() : value;
      });
      data.fdishes = chosenDishes().join(", ");

      var bad = validate(data);
      if (bad) {
        showMessage("Quelques informations manquent ou sont à corriger — voir les champs signalés.", true);
        var el = document.getElementById(bad);
        if (el) el.focus();
        return;
      }

      // Numéro complet, en notation 00 : voir phone.js
      data.fphone = tel ? tel.compose() : "";
      delete data.fdial;

      // Même protection pour les champs libres, où le client peut commencer
      // son texte par un tiret ou une arobase
      ["fname", "femail", "fmessage", "fdishes"].forEach(function (key) {
        data[key] = sheetSafe(data[key]);
      });

      if (!CFG.SCRIPT_URL || CFG.SCRIPT_URL.indexOf("COLLE_ICI") !== -1) {
        showMessage("Le site n'est pas encore relié au tableau de bord. Appelez-nous au " +
                    CFG.PHONE_DISPLAY + " pour réserver.", true);
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Envoi en cours…";
      confirmBox.classList.remove("is-visible");

      // text/plain évite le pré-vol CORS, qu'Apps Script ne gère pas
      fetch(CFG.SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(data)
      })
        .then(function (res) { return res.json(); })
        .then(function (result) {
          // On ne confirme que si le serveur a vraiment enregistré la demande
          if (!result || result.ok !== true) {
            throw new Error((result && result.error) || "refus du serveur");
          }
          var dishes = data.fdishes ? " Plats souhaités : " + data.fdishes + "." : "";
          var vip = data.fvip === "VIP"
            ? " Votre souhait d'espace VIP est noté, nous confirmerons sa disponibilité."
            : "";
          showMessage(
            "Merci " + data.fname.split(" ")[0] + ", votre demande pour le " +
            formatDate(data.fdate) + " à " + data.ftime + " (" + data.fguests +
            " personne(s)) a bien été transmise à l'équipe Axwevi." + dishes + vip +
            " Vous recevrez une confirmation sous 24h.",
            false
          );
          form.reset();
          clearErrors();
          resetDishPicker();
        })
        .catch(function () {
          showMessage(
            "Votre demande n'a pas pu être envoyée. Merci de réessayer, ou de nous appeler au " +
            CFG.PHONE_DISPLAY + " — nous prenons la réservation directement.",
            true
          );
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "Envoyer la demande";
        });
    });

    // Effacer l'erreur d'un champ dès qu'on le corrige
    form.addEventListener("input", function (e) {
      if (e.target.id) setError(e.target.id, "");
    });
  }

})();
