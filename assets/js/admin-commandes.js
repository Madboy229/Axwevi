/* ==========================================================================
   AXWEVI — Volet « Commandes » du tableau de bord
   Dépend de config.js et admin.js (chargés avant).

   admin.js expose window.AXWEVI_ADMIN une fois la clé acceptée : on s'y
   raccroche plutôt que de redemander la clé ou de refaire un appel réseau.
   ========================================================================== */

(function () {
  "use strict";

  var CFG = window.AXWEVI_CONFIG || {};
  var PRODUITS = CFG.PRODUITS || [];
  var TAUX = CFG.EUR_PAR_FCFA || 655.957;

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  };

  var viewResas = $("#viewResas");
  var viewCommandes = $("#viewCommandes");
  var tabResas = $("#tabResas");
  var tabCommandes = $("#tabCommandes");
  var orderArea = $("#orderArea");
  var orderSearch = $("#orderSearch");

  if (!viewCommandes || !tabCommandes) return;

  var state = { items: [], filter: "all", search: "", charge: false };

  /* ---------------------------------------------------------- Formats --- */

  var fcfa = function (n) {
    return Number(n || 0).toLocaleString("fr-FR") + " F";
  };
  var euros = function (n) {
    return "env. " + Math.round(Number(n || 0) / TAUX) + " €";
  };

  var prettyPhone = function (value) {
    return String(value == null ? "" : value).trim().replace(/^00/, "+");
  };
  var telHref = function (value) {
    var digits = String(value == null ? "" : value).replace(/[^0-9]/g, "");
    return "tel:+" + digits.replace(/^00/, "");
  };
  var usablePhone = function (value) {
    return String(value == null ? "" : value).replace(/[^0-9]/g, "").length >= 6;
  };

  var formatMoment = function (value) {
    if (!value) return "—";
    var d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" }) +
      " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
  };

  /** Nombre de bouteilles d'une commande, toutes références confondues. */
  var bouteilles = function (item) {
    return PRODUITS.reduce(function (sum, p) {
      var n = parseInt(item[p.cle], 10);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  };

  /* ------------------------------------------------------------ Bascule -- */

  var show = function (quoi) {
    var commandes = quoi === "commandes";
    viewResas.hidden = commandes;
    viewCommandes.hidden = !commandes;
    tabResas.setAttribute("aria-selected", String(!commandes));
    tabCommandes.setAttribute("aria-selected", String(commandes));
    if (commandes && !state.charge) load();
  };

  tabResas.addEventListener("click", function () { show("reservations"); });
  tabCommandes.addEventListener("click", function () { show("commandes"); });

  /* ---------------------------------------------------------- Chargement - */

  var message = function (text, isError) {
    orderArea.innerHTML = "";
    var box = document.createElement("div");
    box.className = "state" + (isError ? " state--error" : "");
    box.textContent = text;
    orderArea.appendChild(box);
  };

  var loading = function () {
    orderArea.innerHTML = "";
    var box = document.createElement("div");
    box.className = "state";
    var spin = document.createElement("div");
    spin.className = "spinner";
    box.appendChild(spin);
    box.appendChild(document.createTextNode("Chargement des commandes…"));
    orderArea.appendChild(box);
  };

  function load() {
    var api = window.AXWEVI_ADMIN;
    if (!api || !api.call || !api.estConnecte()) {
      message("Saisissez d'abord la clé d'accès sur l'onglet Réservations.", true);
      return;
    }

    loading();
    api.call({ action: "orders" })
      .then(function (res) {
        if (!res || res.ok !== true) {
          throw new Error((res && res.error) || "Réponse inattendue");
        }
        state.items = (res.items || []).map(function (it) {
          var out = {};
          Object.keys(it).forEach(function (k) {
            out[k] = (typeof it[k] === "string") ? it[k].replace(/^'/, "").trim() : it[k];
          });
          return out;
        });
        state.charge = true;
        render();
      })
      .catch(function () {
        message("Impossible de charger les commandes. Le script doit être redéployé pour les accepter.", true);
      });
  }

  /* ------------------------------------------------------------ Filtres -- */

  $$(".chip[data-order-filter]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      $$(".chip[data-order-filter]").forEach(function (c) {
        c.setAttribute("aria-pressed", String(c === chip));
      });
      state.filter = chip.dataset.orderFilter;
      render();
    });
  });

  if (orderSearch) {
    orderSearch.addEventListener("input", function () {
      state.search = orderSearch.value.trim().toLowerCase();
      render();
    });
  }

  /* ------------------------------------------------------------- Fiches -- */

  var statusClass = function (statut) {
    if (statut === "Confirmée") return "badge--confirmee";
    if (statut === "Livrée") return "badge--livree";
    if (statut === "Annulée") return "badge--refusee";
    return "badge--attente";
  };

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

  function actionButton(label, className, id, statut) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.textContent = label;
    btn.addEventListener("click", function () { updateStatus(btn, id, statut); });
    return btn;
  }

  function updateStatus(btn, id, statut) {
    var api = window.AXWEVI_ADMIN;
    if (!api || !api.call) return;

    var siblings = btn.parentElement.querySelectorAll("button");
    siblings.forEach(function (b) { b.disabled = true; });
    var avant = btn.textContent;
    btn.textContent = "…";

    api.call({ action: "updateOrder", id: id, status: statut })
      .then(function (res) {
        if (!res || res.ok !== true) {
          throw new Error((res && res.error) || "Mise à jour refusée");
        }
        state.items.forEach(function (it) {
          if (it.ID === id) it.Statut = statut;
        });
        render();
      })
      .catch(function () {
        siblings.forEach(function (b) { b.disabled = false; });
        btn.textContent = avant;
        message("La mise à jour n'a pas pu être enregistrée. Réessayez.", true);
      });
  }

  var buildCard = function (item) {
    var statut = item.Statut || "En attente";

    var card = document.createElement("article");
    card.className = "card";
    card.dataset.status = statut;

    var top = document.createElement("div");
    top.className = "card__top";

    var name = document.createElement("span");
    name.className = "card__name";
    name.textContent = item.Nom || "Sans nom";

    var badges = document.createElement("span");
    badges.className = "card__badges";

    var badge = document.createElement("span");
    badge.className = "badge " + statusClass(statut);
    badge.textContent = statut;
    badges.appendChild(badge);

    top.appendChild(name);
    top.appendChild(badges);
    card.appendChild(top);

    // Contact
    var callable = usablePhone(item.Telephone);
    if (item.Telephone || item.Email) {
      var contact = document.createElement("div");
      contact.className = "card__contact";

      if (callable) {
        var phone = document.createElement("a");
        phone.className = "card__phone";
        phone.href = telHref(item.Telephone);
        phone.textContent = prettyPhone(item.Telephone);
        contact.appendChild(phone);
      }
      if (item.Email) {
        var mail = document.createElement("a");
        mail.className = "card__email";
        mail.href = "mailto:" + item.Email;
        mail.textContent = item.Email;
        contact.appendChild(mail);
      }
      card.appendChild(contact);
    }

    // Les bouteilles, en évidence : c'est l'objet de la commande
    var lot = document.createElement("div");
    lot.className = "card__lot";

    PRODUITS.forEach(function (p) {
      var n = parseInt(item[p.cle], 10);
      if (isNaN(n) || n <= 0) return;
      var pill = document.createElement("span");
      pill.className = "lot__pill";
      pill.textContent = n + " × " + p.nom;
      lot.appendChild(pill);
    });

    if (!lot.children.length) {
      var vide = document.createElement("span");
      vide.className = "lot__pill lot__pill--empty";
      vide.textContent = item.Produits || "Aucune bouteille";
      lot.appendChild(vide);
    }

    var montant = document.createElement("span");
    montant.className = "lot__total";
    montant.textContent = fcfa(item.Total) + " · " + euros(item.Total);
    lot.appendChild(montant);

    card.appendChild(lot);

    // Détails
    var grid = document.createElement("dl");
    grid.className = "card__grid";
    grid.appendChild(defItem("Remise", item.Remise || "—"));
    grid.appendChild(defItem("Bouteilles", String(bouteilles(item))));
    grid.appendChild(defItem("Reçue le", formatMoment(item.Horodatage)));
    if (item.Adresse) grid.appendChild(defItem("Adresse", item.Adresse));
    if (!callable) grid.appendChild(defItem("Téléphone", "Non renseigné"));
    card.appendChild(grid);

    if (item.Message) {
      var note = document.createElement("div");
      note.className = "card__note";
      note.textContent = "« " + item.Message + " »";
      card.appendChild(note);
    }

    // Actions
    var actions = document.createElement("div");
    actions.className = "card__actions";

    if (statut === "En attente") {
      actions.appendChild(actionButton("Confirmer", "btn-sm btn-confirm", item.ID, "Confirmée"));
    }
    if (statut === "Confirmée") {
      actions.appendChild(actionButton("Marquer livrée", "btn-sm btn-confirm", item.ID, "Livrée"));
    }
    if (statut !== "Annulée" && statut !== "Livrée") {
      actions.appendChild(actionButton("Annuler", "btn-sm btn-refuse", item.ID, "Annulée"));
    }
    if (callable) {
      var call = document.createElement("a");
      call.className = "btn-sm btn-call";
      call.href = telHref(item.Telephone);
      call.textContent = "Appeler";
      actions.appendChild(call);
    }

    card.appendChild(actions);
    return card;
  };

  /* ------------------------------------------------------------- Rendu --- */

  function render() {
    var visibles = state.items.filter(function (it) {
      var statut = it.Statut || "En attente";
      if (state.filter !== "all" && statut !== state.filter) return false;
      if (!state.search) return true;
      var foin = [it.Nom, it.Telephone, it.Email, it.Remise, it.Adresse, it.Produits, it.Message]
        .join(" ").toLowerCase();
      return foin.indexOf(state.search) !== -1;
    });

    // Les compteurs portent sur l'ensemble, hors commandes annulées
    var vivantes = state.items.filter(function (it) { return it.Statut !== "Annulée"; });

    $("#cmdTotal").textContent = state.items.length;
    $("#cmdAttente").textContent = state.items.filter(function (it) {
      return (it.Statut || "En attente") === "En attente";
    }).length;
    $("#cmdBouteilles").textContent = vivantes.reduce(function (s, it) {
      return s + bouteilles(it);
    }, 0);
    $("#cmdMontant").textContent = vivantes.reduce(function (s, it) {
      var n = parseInt(it.Total, 10);
      return s + (isNaN(n) ? 0 : n);
    }, 0).toLocaleString("fr-FR");

    orderArea.innerHTML = "";

    if (!visibles.length) {
      message(state.items.length
        ? "Aucune commande ne correspond à ce filtre."
        : "Aucune commande pour le moment.");
      return;
    }

    var fragment = document.createDocumentFragment();
    visibles.forEach(function (item) { fragment.appendChild(buildCard(item)); });
    orderArea.appendChild(fragment);
  }

  // Si l'équipe était déjà connectée, le volet se remplit à la demande
  window.AXWEVI_COMMANDES = { reload: load };
})();
