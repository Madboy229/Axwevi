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

  /* ---------------------------------------------------------------- Nav --- */

  var nav = $("#nav");
  var burger = $("#navBurger");
  var navLinks = $("#navLinks");

  if (nav) {
    var setNavState = function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 40);
    };
    setNavState();
    window.addEventListener("scroll", setNavState, { passive: true });
  }

  var scrim = $("#navScrim");
  var scrollLockY = 0;

  /* Figer le corps suffit à bloquer la page, mais lui fait perdre sa position :
     on la mémorise pour la rendre telle quelle à la fermeture. */
  var lockScroll = function () {
    scrollLockY = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = (-scrollLockY) + "px";
    document.body.classList.add("is-locked");
  };

  var unlockScroll = function () {
    if (!document.body.classList.contains("is-locked")) return;
    document.body.classList.remove("is-locked");
    document.body.style.top = "";

    // Retour sans animation, sinon la page « remonte » sous les yeux
    var root = document.documentElement;
    var behavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, scrollLockY);
    root.style.scrollBehavior = behavior;
  };

  var isMenuOpen = function () {
    return Boolean(burger) && burger.getAttribute("aria-expanded") === "true";
  };

  var closeMenu = function (returnFocus) {
    if (!burger || !isMenuOpen()) return;
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Ouvrir le menu");
    navLinks.classList.remove("is-open");
    if (scrim) scrim.classList.remove("is-visible");
    unlockScroll();
    if (returnFocus) burger.focus();
  };

  var openMenu = function () {
    if (!burger || isMenuOpen()) return;
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Fermer le menu");
    navLinks.classList.add("is-open");
    if (scrim) scrim.classList.add("is-visible");
    lockScroll();
  };

  if (burger && navLinks) {
    burger.addEventListener("click", function () {
      if (isMenuOpen()) closeMenu();
      else openMenu();
    });

    // Trois sorties possibles : la croix, le voile, la touche Échap
    if (scrim) scrim.addEventListener("click", function () { closeMenu(); });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu(true);
    });

    // Refermer dès qu'on navigue
    navLinks.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });

    // Repasser en écran large ne doit pas laisser le corps figé
    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) closeMenu();
    });
  }

  /* ------------------------------------------- Lien actif au défilement --- */

  var sections = $$("main section[id], header[id]");
  var navAnchors = $$("#navLinks a");

  if (sections.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navAnchors.forEach(function (a) {
          var match = a.getAttribute("href") === "#" + entry.target.id;
          if (match) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* -------------------------------------------- Révélation au scroll ----- */

  var revealables = $$(".reveal");
  if (revealables.length && "IntersectionObserver" in window) {
    var revealer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -60px 0px", threshold: 0.1 });
    revealables.forEach(function (el) { revealer.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* --------------------------------------------- Onglets de la carte ----- */

  var tabs = $$(".tab");

  var selectTab = function (tab, focus) {
    tabs.forEach(function (t) {
      var selected = t === tab;
      t.setAttribute("aria-selected", String(selected));
      t.tabIndex = selected ? 0 : -1;
      var panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !selected;
    });
    if (focus) tab.focus();
  };

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { selectTab(tab, false); });

    // Flèches, Début et Fin — comportement attendu d'un vrai jeu d'onglets
    tab.addEventListener("keydown", function (e) {
      var next = null;
      if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") next = tabs[0];
      else if (e.key === "End") next = tabs[tabs.length - 1];
      if (next) {
        e.preventDefault();
        selectTab(next, true);
      }
    });
  });

  /* ------------------------------- Sélecteur de plats bâti sur la carte --- */
  /* La carte du menu est la seule source de vérité : les cases à cocher du
     formulaire en sont dérivées, donc elles ne peuvent pas se désynchroniser. */

  var picker = $("#dishPicker");
  var pickerSummary = null;
  var MAX_PER_DISH = 20;

  /** Liste des plats choisis, sous la forme « 2 × Agneau Royal ». */
  var chosenDishes = function () {
    if (!picker) return [];
    return $$(".qty__input", picker).reduce(function (acc, input) {
      var n = parseInt(input.value, 10) || 0;
      if (n > 0) acc.push(n + " × " + input.dataset.dish);
      return acc;
    }, []);
  };

  var updatePickerSummary = function () {
    if (!pickerSummary) return;
    var chosen = chosenDishes();
    var total = chosen.reduce(function (sum, line) {
      return sum + parseInt(line, 10);
    }, 0);

    pickerSummary.textContent = total
      ? total + " plat" + (total > 1 ? "s" : "") + " sélectionné" + (total > 1 ? "s" : "") +
        " : " + chosen.join(", ")
      : "Aucun plat sélectionné pour l'instant.";
    pickerSummary.classList.toggle("is-filled", total > 0);
  };

  if (picker) {
    var dishIndex = 0;

    $$(".menu-panel").forEach(function (panel) {
      var dishes = $$(".dish:not([data-no-pick])", panel);
      if (!dishes.length) return;

      var group = document.createElement("div");
      group.className = "dish-picker__group";

      var cat = document.createElement("span");
      cat.className = "dish-picker__cat";
      cat.textContent = panel.dataset.category || "";
      group.appendChild(cat);

      dishes.forEach(function (dish) {
        var nameEl = $(".dish__name", dish);
        if (!nameEl) return;

        var dishName = nameEl.textContent.trim();
        var labelId = "dishname-" + (dishIndex += 1);

        var row = document.createElement("div");
        row.className = "dish-picker__item";

        var name = document.createElement("span");
        name.className = "dish-picker__name";
        name.id = labelId;
        name.textContent = dishName;
        row.appendChild(name);

        var qty = document.createElement("div");
        qty.className = "qty";

        var minus = document.createElement("button");
        minus.type = "button";
        minus.className = "qty__btn";
        minus.textContent = "−";
        minus.setAttribute("aria-label", "Retirer une part de " + dishName);

        var input = document.createElement("input");
        input.type = "number";
        input.className = "qty__input";
        input.value = "0";
        input.min = "0";
        input.max = String(MAX_PER_DISH);
        input.step = "1";
        input.inputMode = "numeric";
        input.dataset.dish = dishName;
        input.setAttribute("aria-labelledby", labelId);

        var plus = document.createElement("button");
        plus.type = "button";
        plus.className = "qty__btn";
        plus.textContent = "+";
        plus.setAttribute("aria-label", "Ajouter une part de " + dishName);

        var apply = function (delta) {
          var current = parseInt(input.value, 10) || 0;
          var next = Math.min(MAX_PER_DISH, Math.max(0, current + delta));
          input.value = String(next);
          row.classList.toggle("is-chosen", next > 0);
          minus.disabled = next === 0;
          updatePickerSummary();
        };

        minus.disabled = true;
        minus.addEventListener("click", function () { apply(-1); });
        plus.addEventListener("click", function () { apply(1); });

        // Saisie directe au clavier : on borne et on resynchronise l'affichage
        input.addEventListener("input", function () {
          var n = parseInt(input.value, 10);
          if (isNaN(n) || n < 0) n = 0;
          if (n > MAX_PER_DISH) n = MAX_PER_DISH;
          input.value = String(n);
          row.classList.toggle("is-chosen", n > 0);
          minus.disabled = n === 0;
          updatePickerSummary();
        });

        qty.appendChild(minus);
        qty.appendChild(input);
        qty.appendChild(plus);
        row.appendChild(qty);
        group.appendChild(row);
      });

      picker.appendChild(group);
    });

    pickerSummary = document.createElement("p");
    pickerSummary.className = "dish-picker__summary";
    pickerSummary.setAttribute("aria-live", "polite");
    picker.insertAdjacentElement("afterend", pickerSummary);
    updatePickerSummary();
  }

  /** Remet tous les compteurs à zéro après un envoi réussi. */
  var resetDishPicker = function () {
    if (!picker) return;
    $$(".qty__input", picker).forEach(function (input) {
      input.value = "0";
      var row = input.closest(".dish-picker__item");
      if (row) {
        row.classList.remove("is-chosen");
        var minus = $(".qty__btn", row);
        if (minus) minus.disabled = true;
      }
    });
    updatePickerSummary();
  };

  /* ------------------------------------------------- Formulaire ---------- */

  var form = $("#reserveForm");
  var confirmBox = $("#confirmBox");
  var submitBtn = $("#submitBtn");
  var dateInput = $("#fdate");

  var pad = function (n) { return String(n).padStart(2, "0"); };
  var toISO = function (d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  };

  // Empêcher les dates passées et borner l'horizon de réservation
  if (dateInput) {
    var today = new Date();
    dateInput.min = toISO(today);
    var horizon = new Date(today.getTime());
    horizon.setDate(horizon.getDate() + (CFG.MAX_DAYS_AHEAD || 120));
    dateInput.max = toISO(horizon);
  }

  /* ------------------------------------------- Indicatif téléphonique ---- */

  var dialSelect = $("#fdial");
  var phoneInput = $("#fphone");
  var DIALS = CFG.DIAL_CODES || [];

  var selectedDial = function () {
    if (!dialSelect) return DIALS[0] || { code: "+229" };
    var i = dialSelect.selectedIndex;
    return DIALS[i] || DIALS[0] || { code: "+229" };
  };

  if (dialSelect && DIALS.length) {
    DIALS.forEach(function (entry) {
      var option = document.createElement("option");
      option.value = entry.code;
      option.textContent = entry.code + " " + entry.pays;
      dialSelect.appendChild(option);
    });
    dialSelect.selectedIndex = 0;              // Bénin par défaut

    // L'exemple affiché suit le pays choisi
    dialSelect.addEventListener("change", function () {
      var entry = selectedDial();
      if (phoneInput) phoneInput.placeholder = entry.exemple || "";
      setError("fphone", "");
    });
  }

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

    // La partie locale seule : l'indicatif vient du menu déroulant.
    // Les espaces, points et tirets sont acceptés, seuls les chiffres comptent.
    var entry = selectedDial();
    var digits = (data.fphone || "").replace(/[^0-9]/g, "");

    if (!digits) {
      fail("fphone", "Merci d'indiquer votre numéro, il nous sert à confirmer.");
    } else if (entry.digits && digits.length !== entry.digits) {
      fail("fphone", "Un numéro " + (entry.pays || "") + " compte " + entry.digits +
        " chiffres — par exemple " + (entry.exemple || "") + ".");
    } else if (!entry.digits && (digits.length < 6 || digits.length > 15)) {
      fail("fphone", "Ce numéro ne semble pas complet.");
    }

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

      // Numéro complet pour l'équipe : indicatif choisi + partie locale
      data.fphone = selectedDial().code + " " + data.fphone;
      delete data.fdial;

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

  /* ------------------------------------------------------- Pied de page -- */

  var year = $("#year");
  if (year) year.textContent = new Date().getFullYear();
})();
