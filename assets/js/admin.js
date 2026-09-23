/* ==========================================================================
   AXWEVI — Tableau de bord des réservations
   Dépend de config.js (chargé avant).

   La clé d'accès n'est jamais écrite dans le code : elle est saisie à la
   connexion et gardée en sessionStorage, donc effacée à la fermeture de
   l'onglet.

   Toutes les valeurs affichées viennent de formulaires remplis par le public :
   elles sont insérées via textContent, jamais via innerHTML, pour qu'un texte
   malveillant saisi dans une réservation ne puisse pas s'exécuter ici.
   ========================================================================== */

(function () {
  "use strict";

  var CFG = window.AXWEVI_CONFIG || {};
  var KEY_STORE = "axwevi_admin_key";

  var $ = function (sel) { return document.querySelector(sel); };

  var gate = $("#gate");
  var gateForm = $("#gateForm");
  var keyInput = $("#keyInput");
  var gateError = $("#gateError");
  var unlockBtn = $("#unlockBtn");

  var dash = $("#dash");
  var listArea = $("#listArea");
  var countLabel = $("#countLabel");
  var searchInput = $("#searchInput");
  var refreshBtn = $("#refreshBtn");
  var logoutBtn = $("#logoutBtn");

  var STATUSES = ["En attente", "Confirmée", "Refusée"];

  var state = {
    key: "",
    items: [],
    filter: "all",
    search: "",
    period: "today",   // vue de travail par défaut : le service du jour
    month: ""          // « AAAA-MM » quand on consulte un mois précis
  };

  /* ------------------------------------------------------------ Réseau --- */

  var call = function (params) {
    var url = new URL(CFG.SCRIPT_URL);
    url.searchParams.set("key", state.key);
    Object.keys(params).forEach(function (k) {
      url.searchParams.set(k, params[k]);
    });
    return fetch(url.toString(), { method: "GET" }).then(function (res) {
      return res.json();
    });
  };

  /* ------------------------------------------------------- Connexion ----- */

  var showGateError = function (message) {
    gateError.textContent = message;
    gateError.classList.add("is-visible");
  };

  var openDash = function () {
    gate.hidden = true;
    dash.hidden = false;
    load();
  };

  var tryKey = function (key) {
    state.key = key;
    unlockBtn.disabled = true;
    unlockBtn.textContent = "Vérification…";
    gateError.classList.remove("is-visible");

    return call({ action: "list" })
      .then(function (res) {
        if (!res || res.ok !== true) {
          throw new Error((res && res.error) || "Clé refusée");
        }
        state.items = res.items || [];
        try { sessionStorage.setItem(KEY_STORE, key); } catch (e) { /* onglet privé */ }
        openDash();
      })
      .catch(function (err) {
        state.key = "";
        showGateError(
          err && /clé/i.test(err.message)
            ? "Clé incorrecte."
            : "Connexion impossible. Vérifiez la clé et que le script est bien déployé."
        );
      })
      .finally(function () {
        unlockBtn.disabled = false;
        unlockBtn.textContent = "Accéder au tableau de bord";
      });
  };

  if (gateForm) {
    gateForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var key = keyInput.value.trim();
      if (!key) {
        showGateError("Entrez la clé d'accès.");
        return;
      }
      tryKey(key);
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      try { sessionStorage.removeItem(KEY_STORE); } catch (e) { /* ignore */ }
      state.key = "";
      state.items = [];
      dash.hidden = true;
      gate.hidden = false;
      keyInput.value = "";
      keyInput.focus();
    });
  }

  /* ---------------------------------------------------------- Chargement - */

  var setStateMessage = function (text, isError) {
    listArea.innerHTML = "";
    var box = document.createElement("div");
    box.className = "state" + (isError ? " state--error" : "");
    box.textContent = text;
    listArea.appendChild(box);
  };

  var setLoading = function () {
    listArea.innerHTML = "";
    var box = document.createElement("div");
    box.className = "state";
    var spin = document.createElement("div");
    spin.className = "spinner";
    box.appendChild(spin);
    box.appendChild(document.createTextNode("Chargement des réservations…"));
    listArea.appendChild(box);
  };

  function load() {
    setLoading();
    call({ action: "list" })
      .then(function (res) {
        if (!res || res.ok !== true) {
          throw new Error((res && res.error) || "Réponse inattendue");
        }
        state.items = res.items || [];
        render();
      })
      .catch(function () {
        setStateMessage("Impossible de charger les réservations. Réessayez dans un instant.", true);
      });
  }

  if (refreshBtn) refreshBtn.addEventListener("click", load);

  /* ------------------------------------------------------------ Période -- */

  var periodLabel = $("#periodLabel");
  var monthInput = $("#monthInput");

  var isoOf = function (d) {
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  };

  /** La réservation tombe-t-elle dans la période consultée ? */
  var inPeriod = function (item) {
    var key = dateKey(item.Date);

    // Une ligne sans date exploitable ne doit pas disparaître silencieusement :
    // elle reste visible dans l'historique complet.
    if (!key) return !state.month && state.period === "all";

    if (state.month) return key.slice(0, 7) === state.month;

    var now = new Date();
    var today = isoOf(now);

    if (state.period === "today") return key === today;

    if (state.period === "tomorrow") {
      var t = new Date(now.getTime());
      t.setDate(t.getDate() + 1);
      return key === isoOf(t);
    }

    if (state.period === "week") {
      var end = new Date(now.getTime());
      end.setDate(end.getDate() + 6);
      return key >= today && key <= isoOf(end);
    }

    if (state.period === "month") return key.slice(0, 7) === today.slice(0, 7);

    return true;                                   // tout l'historique
  };

  var describePeriod = function () {
    if (state.month) {
      var m = new Date(state.month + "-01T00:00:00");
      var name = m.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    if (state.period === "today") {
      return "Aujourd'hui, " + new Date().toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long"
      });
    }
    if (state.period === "tomorrow") return "Demain";
    if (state.period === "week") return "Les 7 prochains jours";
    if (state.period === "month") return "Ce mois-ci";
    return "Tout l'historique";
  };

  var clearPeriodChips = function () {
    document.querySelectorAll(".chip[data-period]").forEach(function (c) {
      c.setAttribute("aria-pressed", "false");
    });
  };

  document.querySelectorAll(".chip[data-period]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      state.month = "";
      if (monthInput) monthInput.value = "";
      clearPeriodChips();
      chip.setAttribute("aria-pressed", "true");
      state.period = chip.dataset.period;
      render();
    });
  });

  if (monthInput) {
    monthInput.addEventListener("change", function () {
      state.month = monthInput.value;
      if (state.month) clearPeriodChips();
      render();
    });
  }

  /* ------------------------------------------------------------ Filtres -- */

  document.querySelectorAll(".chip[data-filter]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      document.querySelectorAll(".chip[data-filter]").forEach(function (c) {
        c.setAttribute("aria-pressed", String(c === chip));
      });
      state.filter = chip.dataset.filter;
      render();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      state.search = searchInput.value.trim().toLowerCase();
      render();
    });
  }

  /* ------------------------------------------------------------- Rendu --- */

  var statusClass = function (status) {
    if (status === "Confirmée") return "badge--confirmee";
    if (status === "Refusée") return "badge--refusee";
    return "badge--attente";
  };

  /** « 19:30 » devient « 19h30 ». */
  var formatHour = function (value) {
    var text = String(value || "").slice(0, 5);
    return /^\d{2}:\d{2}$/.test(text) ? text.replace(":", "h") : (text || "—");
  };

  var formatDate = function (value) {
    if (!value) return "—";
    var d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" });
  };

  /* ----------------------------------------------- Disponibilité VIP ----- */

  var ROOMS = CFG.VIP_ROOMS || ["Salon VIP 1", "Salon VIP 2"];
  var SERVICES = CFG.SERVICES || [];

  /** Ramène une date, texte brut ou ISO, à une clé « AAAA-MM-JJ ». */
  var dateKey = function (value) {
    if (!value) return "";
    var text = String(value);
    var direct = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if (direct) return direct[1];
    var d = new Date(text);
    if (isNaN(d.getTime())) return "";
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  };

  /** À quel service appartient une heure « HH:MM ». */
  var serviceOf = function (time) {
    var t = String(time || "").slice(0, 5);
    for (var i = 0; i < SERVICES.length; i++) {
      if (t >= SERVICES[i].from && t <= SERVICES[i].to) return SERVICES[i];
    }
    return null;
  };

  /** Réservations VIP d'une date, réparties par service. */
  var vipByService = function (key) {
    var buckets = {};
    SERVICES.forEach(function (s) { buckets[s.id] = { confirmed: [], pending: [] }; });

    state.items.forEach(function (it) {
      if (it.VIP !== "VIP") return;
      if (dateKey(it.Date) !== key) return;

      var status = it.Statut || "En attente";
      if (status === "Refusée") return;             // une demande refusée ne bloque rien

      var service = serviceOf(it.Heure);
      if (!service || !buckets[service.id]) return;

      buckets[service.id][status === "Confirmée" ? "confirmed" : "pending"].push(it);
    });

    return buckets;
  };

  /** Nombre de salons déjà confirmés pour la date et l'heure d'une demande. */
  var confirmedVipCount = function (item) {
    var service = serviceOf(item.Heure);
    if (!service) return 0;
    var buckets = vipByService(dateKey(item.Date));
    return buckets[service.id] ? buckets[service.id].confirmed.length : 0;
  };

  var renderVipBoard = function () {
    var board = $("#vipBoard");
    var dateField = $("#vipDate");
    if (!board || !dateField) return;

    var key = dateField.value;
    board.innerHTML = "";

    if (!key) {
      var empty = document.createElement("p");
      empty.className = "state";
      empty.textContent = "Choisissez une date pour voir l'état des salons.";
      board.appendChild(empty);
      return;
    }

    var buckets = vipByService(key);

    SERVICES.forEach(function (service) {
      var bucket = buckets[service.id];

      var block = document.createElement("div");
      block.className = "vip-service";

      var head = document.createElement("div");
      head.className = "vip-service__head";

      var title = document.createElement("span");
      title.className = "vip-service__title";
      title.textContent = service.label;

      var tally = document.createElement("span");
      tally.className = "vip-service__tally";
      var taken = bucket.confirmed.length;
      tally.textContent = taken + " / " + ROOMS.length + " occupé" + (taken > 1 ? "s" : "");
      if (taken >= ROOMS.length) tally.classList.add("is-full");

      head.appendChild(title);
      head.appendChild(tally);
      block.appendChild(head);

      // Un encadré par salon, rempli dans l'ordre des confirmations
      var rooms = document.createElement("div");
      rooms.className = "vip-rooms";

      ROOMS.forEach(function (roomName, i) {
        var booking = bucket.confirmed[i];

        var room = document.createElement("div");
        room.className = "vip-room " + (booking ? "is-taken" : "is-free");

        var label = document.createElement("div");
        label.className = "vip-room__name";
        label.textContent = roomName;
        room.appendChild(label);

        var value = document.createElement("div");
        value.className = "vip-room__state";
        if (booking) {
          value.textContent = (booking.Nom || "Réservé") + " · " +
            formatHour(booking.Heure) + " · " + (booking.Personnes || "?") + " pers.";
        } else {
          value.textContent = "Libre";
        }
        room.appendChild(value);

        rooms.appendChild(room);
      });

      block.appendChild(rooms);

      // Surréservation : plus de confirmations que de salons
      if (bucket.confirmed.length > ROOMS.length) {
        var over = document.createElement("p");
        over.className = "vip-alert vip-alert--over";
        over.textContent = "Attention : " + bucket.confirmed.length +
          " réservations VIP confirmées pour " + ROOMS.length + " salons.";
        block.appendChild(over);
      }

      if (bucket.pending.length) {
        var wait = document.createElement("p");
        wait.className = "vip-alert";
        wait.textContent = bucket.pending.length + " demande" +
          (bucket.pending.length > 1 ? "s" : "") + " VIP en attente : " +
          bucket.pending.map(function (it) {
            return (it.Nom || "?") + " (" + formatHour(it.Heure) + ")";
          }).join(", ");
        block.appendChild(wait);
      }

      board.appendChild(block);
    });
  };

  var vipDateField = $("#vipDate");
  if (vipDateField) {
    var now = new Date();
    vipDateField.value = now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0");
    vipDateField.addEventListener("change", renderVipBoard);
  }

  /* ------------------------------------------------------------- Fiches -- */

  var defItem = function (label, value, link) {
    var wrap = document.createElement("div");
    wrap.className = "card__item";

    var dt = document.createElement("dt");
    dt.textContent = label;

    var dd = document.createElement("dd");
    if (link) {
      var a = document.createElement("a");
      a.href = link;
      a.textContent = value;
      dd.appendChild(a);
    } else {
      dd.textContent = value;
    }

    wrap.appendChild(dt);
    wrap.appendChild(dd);
    return wrap;
  };

  var buildCard = function (item) {
    var status = item.Statut || "En attente";

    var card = document.createElement("article");
    card.className = "card";
    card.dataset.status = status;

    // En-tête : nom + statut
    var isVip = item.VIP === "VIP";
    if (isVip) card.dataset.vip = "true";

    var top = document.createElement("div");
    top.className = "card__top";

    var name = document.createElement("span");
    name.className = "card__name";
    name.textContent = item.Nom || "Sans nom";

    var badges = document.createElement("span");
    badges.className = "card__badges";

    if (isVip) {
      var vipBadge = document.createElement("span");
      vipBadge.className = "badge badge--vip";
      vipBadge.textContent = "VIP";
      badges.appendChild(vipBadge);
    }

    var badge = document.createElement("span");
    badge.className = "badge " + statusClass(status);
    badge.textContent = status;
    badges.appendChild(badge);

    top.appendChild(name);
    top.appendChild(badges);
    card.appendChild(top);

    // Détails
    var grid = document.createElement("dl");
    grid.className = "card__grid";
    grid.appendChild(defItem("Date", formatDate(item.Date)));
    grid.appendChild(defItem("Heure d'arrivée", formatHour(item.Heure)));
    grid.appendChild(defItem("Personnes", item.Personnes || "—"));
    grid.appendChild(defItem("Table", isVip ? "Espace VIP" : "Salle"));

    if (item.Telephone) {
      grid.appendChild(defItem("Téléphone", item.Telephone,
        "tel:" + String(item.Telephone).replace(/[^0-9+]/g, "")));
    }
    if (item.Email) {
      grid.appendChild(defItem("Email", item.Email, "mailto:" + item.Email));
    }
    if (item.Plats) {
      grid.appendChild(defItem("Plats souhaités", item.Plats));
    }
    // L'horodatage d'envoi reste dans le Google Sheet, mais n'encombre pas la
    // fiche : seule l'heure d'arrivée sert à préparer le service.
    card.appendChild(grid);

    // Message libre du client
    if (item.Message) {
      var note = document.createElement("div");
      note.className = "card__note";
      note.textContent = "« " + item.Message + " »";
      card.appendChild(note);
    }

    // Actions
    var actions = document.createElement("div");
    actions.className = "card__actions";

    if (status !== "Confirmée") {
      actions.appendChild(actionButton("Confirmer", "btn-sm btn-confirm", item.ID, "Confirmée"));
    }
    if (status !== "Refusée") {
      actions.appendChild(actionButton("Refuser", "btn-sm btn-refuse", item.ID, "Refusée"));
    }
    if (item.Telephone) {
      var callLink = document.createElement("a");
      callLink.className = "btn-sm btn-call";
      callLink.href = "tel:" + String(item.Telephone).replace(/[^0-9+]/g, "");
      callLink.textContent = "Appeler";
      actions.appendChild(callLink);
    }

    card.appendChild(actions);
    return card;
  };

  function actionButton(label, className, id, newStatus) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.textContent = label;
    btn.addEventListener("click", function () {
      updateStatus(btn, id, newStatus);
    });
    return btn;
  }

  function updateStatus(btn, id, status) {
    var item = null;
    state.items.forEach(function (it) { if (it.ID === id) item = it; });

    // Confirmer une table VIP alors que les deux salons sont déjà pris pour
    // ce service : on prévient, mais la décision reste à l'équipe.
    if (item && item.VIP === "VIP" && status === "Confirmée") {
      var taken = confirmedVipCount(item);
      if (taken >= ROOMS.length) {
        var service = serviceOf(item.Heure);
        var ok = window.confirm(
          "Les " + ROOMS.length + " salons VIP sont déjà confirmés pour " +
          (service ? service.label.toLowerCase() : "ce service") +
          " le " + dateKey(item.Date) + ".\n\nConfirmer quand même ?"
        );
        if (!ok) return;
      }
    }

    var siblings = btn.parentElement.querySelectorAll("button");
    siblings.forEach(function (b) { b.disabled = true; });
    btn.textContent = "…";

    call({ action: "update", id: id, status: status })
      .then(function (res) {
        if (!res || res.ok !== true) {
          throw new Error((res && res.error) || "Mise à jour refusée");
        }
        // Mise à jour locale : pas besoin de tout recharger
        state.items.forEach(function (it) {
          if (it.ID === id) it.Statut = status;
        });
        render();
      })
      .catch(function () {
        siblings.forEach(function (b) { b.disabled = false; });
        btn.textContent = status === "Confirmée" ? "Confirmer" : "Refuser";
        setStateMessage("La mise à jour n'a pas pu être enregistrée. Réessayez.", true);
      });
  }

  /** Les compteurs portent sur la période consultée, pas sur tout l'historique. */
  var renderStats = function (scope) {
    var counts = { total: scope.length, vip: 0 };
    STATUSES.forEach(function (s) { counts[s] = 0; });
    scope.forEach(function (it) {
      var s = it.Statut || "En attente";
      if (counts[s] !== undefined) counts[s] += 1;
      if (it.VIP === "VIP") counts.vip += 1;
    });

    $("#statTotal").textContent = counts.total;
    $("#statAttente").textContent = counts["En attente"];
    $("#statConfirmee").textContent = counts["Confirmée"];
    $("#statVip").textContent = counts.vip;
  };

  /** Ordre de service : par date, puis par heure. */
  var byDateTime = function (a, b) {
    var ka = dateKey(a.Date) + " " + String(a.Heure || "");
    var kb = dateKey(b.Date) + " " + String(b.Heure || "");
    return ka < kb ? -1 : (ka > kb ? 1 : 0);
  };

  function render() {
    var inScope = state.items.filter(inPeriod);

    renderStats(inScope);
    renderVipBoard();

    if (periodLabel) periodLabel.textContent = describePeriod();

    var visible = inScope.filter(function (it) {
      var status = it.Statut || "En attente";

      if (state.filter === "VIP") {
        if (it.VIP !== "VIP") return false;
      } else if (state.filter !== "all" && status !== state.filter) {
        return false;
      }

      if (!state.search) return true;
      var haystack = [it.Nom, it.Telephone, it.Email, it.Date, it.Plats, it.Message, it.VIP]
        .join(" ").toLowerCase();
      return haystack.indexOf(state.search) !== -1;
    }).sort(byDateTime);

    countLabel.textContent = visible.length + " réservation" +
      (visible.length > 1 ? "s" : "") + " affichée" + (visible.length > 1 ? "s" : "");

    listArea.innerHTML = "";

    if (!visible.length) {
      var reason;
      if (!state.items.length) {
        reason = "Aucune réservation pour le moment.";
      } else if (!inScope.length) {
        reason = "Aucune réservation sur cette période. Essayez « Tout l'historique » " +
          "ou choisissez un autre mois.";
      } else {
        reason = "Aucune réservation ne correspond à ce filtre sur cette période.";
      }
      setStateMessage(reason);
      return;
    }

    var fragment = document.createDocumentFragment();
    visible.forEach(function (item) { fragment.appendChild(buildCard(item)); });
    listArea.appendChild(fragment);
  }

  /* ------------------------------------------------- Reprise de session -- */

  var saved = null;
  try { saved = sessionStorage.getItem(KEY_STORE); } catch (e) { /* onglet privé */ }

  if (saved) {
    tryKey(saved);
  } else if (keyInput) {
    keyInput.focus();
  }
})();
