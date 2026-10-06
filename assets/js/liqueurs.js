/* ==========================================================================
   AXWEVI — Page des liqueurs : cuvées, panier et bon de commande
   Dépend de config.js, nav.js et phone.js (chargés avant).
   ========================================================================== */

(function () {
  "use strict";

  var CFG = window.AXWEVI_CONFIG || {};
  var PRODUITS = CFG.PRODUITS || [];
  var REMISES = CFG.REMISES || [];
  var MAX = CFG.MAX_PAR_PRODUIT || 24;
  var TAUX = CFG.EUR_PAR_FCFA || 655.957;

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /* ---------------------------------------------------------- Formats --- */

  var fcfa = function (n) {
    return Number(n).toLocaleString("fr-FR") + " F";
  };

  /** Le franc CFA est indexé sur l'euro : la conversion ne se périme pas. */
  var euros = function (n) {
    return "env. " + Math.round(Number(n) / TAUX) + " €";
  };

  /**
   * Google Sheets lit toute valeur commençant par = + - @ comme une formule et
   * écrit #ERROR! quand elle n'en est pas une. Une espace initiale l'en
   * empêche, et ne se voit pas dans la cellule.
   */
  var sheetSafe = function (value) {
    var text = String(value == null ? "" : value);
    return /^[=+\-@]/.test(text) ? " " + text : text;
  };

  /* -------------------------------------------------- Dessin de flacon --- */

  var vesselSVG = function () {
    return '<svg class="cuvee__vessel" viewBox="0 0 48 96" fill="none" ' +
      'stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
      '<path d="M20 4h8v18l9 13a14 14 0 0 1 2.4 7.8V86a6 6 0 0 1-6 6H14.6a6 6 0 0 1-6-6V42.8A14 14 0 0 1 11 35l9-13V4Z"/>' +
      '<path d="M8.6 56h30.8"/><path d="M18 4h12"/></svg>';
  };

  /* ------------------------------------------------------- Les cuvées ---- */

  var list = $("#cuveeList");

  if (list) {
    PRODUITS.forEach(function (p) {
      var card = document.createElement("article");
      card.className = "cuvee reveal";
      card.innerHTML = vesselSVG();

      var format = document.createElement("span");
      format.className = "cuvee__format";
      format.textContent = p.format;
      card.appendChild(format);

      var name = document.createElement("h3");
      name.className = "cuvee__name";
      name.textContent = p.nom;
      card.appendChild(name);

      var accroche = document.createElement("p");
      accroche.className = "cuvee__accroche";
      accroche.textContent = p.accroche;
      card.appendChild(accroche);

      var texte = document.createElement("p");
      texte.className = "cuvee__texte";
      texte.textContent = p.texte;
      card.appendChild(texte);

      var price = document.createElement("div");
      price.className = "cuvee__price";

      var f = document.createElement("span");
      f.className = "cuvee__fcfa";
      f.textContent = fcfa(p.prix);

      var e = document.createElement("span");
      e.className = "cuvee__eur";
      e.textContent = euros(p.prix);

      price.appendChild(f);
      price.appendChild(e);
      card.appendChild(price);

      list.appendChild(card);
    });
  }

  /* ---------------------------------------------------------- Panier ----- */

  var panier = $("#panier");
  var quantites = {};

  PRODUITS.forEach(function (p) { quantites[p.cle] = 0; });

  if (panier) {
    PRODUITS.forEach(function (p) {
      var row = document.createElement("div");
      row.className = "panier__row";

      var id = document.createElement("span");
      id.className = "panier__id";

      var nom = document.createElement("span");
      nom.className = "panier__name";
      nom.textContent = p.nom;
      nom.id = "panier-" + p.cle;

      var meta = document.createElement("span");
      meta.className = "panier__meta";
      meta.textContent = p.format + " · " + fcfa(p.prix);

      id.appendChild(nom);
      id.appendChild(meta);
      row.appendChild(id);

      var qty = document.createElement("div");
      qty.className = "qty";

      var minus = document.createElement("button");
      minus.type = "button";
      minus.className = "qty__btn";
      minus.textContent = "−";
      minus.disabled = true;
      minus.setAttribute("aria-label", "Retirer une bouteille de " + p.nom);

      var input = document.createElement("input");
      input.type = "number";
      input.className = "qty__input";
      input.value = "0";
      input.min = "0";
      input.max = String(MAX);
      input.step = "1";
      input.inputMode = "numeric";
      input.setAttribute("aria-labelledby", nom.id);

      var plus = document.createElement("button");
      plus.type = "button";
      plus.className = "qty__btn";
      plus.textContent = "+";
      plus.setAttribute("aria-label", "Ajouter une bouteille de " + p.nom);

      var sync = function (next) {
        var n = Math.min(MAX, Math.max(0, next));
        quantites[p.cle] = n;
        input.value = String(n);
        minus.disabled = n === 0;
        row.classList.toggle("is-chosen", n > 0);
        renderRecap();
        setError("panier", "");
      };

      minus.addEventListener("click", function () { sync(quantites[p.cle] - 1); });
      plus.addEventListener("click", function () { sync(quantites[p.cle] + 1); });
      input.addEventListener("input", function () {
        var n = parseInt(input.value, 10);
        sync(isNaN(n) ? 0 : n);
      });

      qty.appendChild(minus);
      qty.appendChild(input);
      qty.appendChild(plus);
      row.appendChild(qty);
      panier.appendChild(row);
    });
  }

  var choisis = function () {
    return PRODUITS.filter(function (p) { return quantites[p.cle] > 0; });
  };

  var totalFcfa = function () {
    return PRODUITS.reduce(function (sum, p) {
      return sum + quantites[p.cle] * p.prix;
    }, 0);
  };

  var resume = function () {
    return choisis().map(function (p) {
      return quantites[p.cle] + " × " + p.nom;
    }).join(", ");
  };

  /* ------------------------------------------------------ Récapitulatif -- */

  var recap = $("#orderRecap");

  function renderRecap() {
    if (!recap) return;
    recap.innerHTML = "";

    var retenus = choisis();

    var title = document.createElement("p");
    title.className = "order__recap-title";
    title.textContent = "Votre commande";
    recap.appendChild(title);

    if (!retenus.length) {
      var vide = document.createElement("p");
      vide.className = "order__empty";
      vide.textContent = "Aucune bouteille choisie pour l'instant. Utilisez les compteurs ci-contre.";
      recap.appendChild(vide);
      return;
    }

    retenus.forEach(function (p) {
      var line = document.createElement("div");
      line.className = "order__line";

      var left = document.createElement("span");
      left.textContent = quantites[p.cle] + " × " + p.nom;

      var right = document.createElement("span");
      right.textContent = fcfa(quantites[p.cle] * p.prix);

      line.appendChild(left);
      line.appendChild(right);
      recap.appendChild(line);
    });

    var total = totalFcfa();

    var totalRow = document.createElement("div");
    totalRow.className = "order__total";

    var label = document.createElement("span");
    label.className = "order__total-label";
    label.textContent = "Total";

    var value = document.createElement("span");
    value.className = "order__total-value";
    value.textContent = fcfa(total);

    var eur = document.createElement("span");
    eur.className = "order__total-eur";
    eur.textContent = euros(total);
    value.appendChild(eur);

    totalRow.appendChild(label);
    totalRow.appendChild(value);
    recap.appendChild(totalRow);
  }

  /* ------------------------------------------------- Mode de remise ------ */

  var remiseGroup = $("#remiseGroup");
  var adresseField = $("#adresseField");
  var adresseInput = $("#cadresse");

  var remiseChoisie = function () {
    var checked = remiseGroup && remiseGroup.querySelector("input:checked");
    if (!checked) return null;
    return REMISES.filter(function (r) { return r.cle === checked.value; })[0] || null;
  };

  if (remiseGroup) {
    REMISES.forEach(function (r) {
      var label = document.createElement("label");
      label.className = "choice__item";

      var input = document.createElement("input");
      input.type = "radio";
      input.name = "cremise";
      input.value = r.cle;

      var body = document.createElement("span");
      body.className = "choice__body";

      var titre = document.createElement("span");
      titre.className = "choice__title";
      titre.textContent = r.nom;

      var detail = document.createElement("span");
      detail.className = "choice__detail";
      detail.textContent = r.detail;

      body.appendChild(titre);
      body.appendChild(detail);
      label.appendChild(input);
      label.appendChild(body);

      input.addEventListener("change", function () {
        var besoin = Boolean(r.adresse);
        if (adresseField) adresseField.hidden = !besoin;
        if (adresseInput) adresseInput.required = besoin;
        setError("remise", "");
        setError("cadresse", "");
      });

      remiseGroup.appendChild(label);
    });
  }

  /* ---------------------------------------------------- Erreurs ---------- */

  var setError = function (id, message) {
    var field = document.getElementById(id);
    var slot = document.getElementById("err-" + id);
    if (field && field.setAttribute) {
      field.setAttribute("aria-invalid", message ? "true" : "false");
    }
    if (slot) {
      slot.textContent = message || "";
      slot.classList.toggle("is-visible", Boolean(message));
    }
  };

  var clearErrors = function () {
    ["panier", "cname", "cphone", "cemail", "remise", "cadresse", "cage"]
      .forEach(function (id) { setError(id, ""); });
  };

  /* ---------------------------------------------------- Téléphone -------- */

  var tel = window.AXWEVI_PHONE
    ? window.AXWEVI_PHONE.attach({
        dial: "#cdial",
        input: "#cphone",
        onClear: function () { setError("cphone", ""); }
      })
    : null;

  /* ------------------------------------------------------- Formulaire ---- */

  var form = $("#orderForm");
  var confirmBox = $("#orderConfirm");
  var submitBtn = $("#orderBtn");

  var showMessage = function (text, isError) {
    if (!confirmBox) return;
    confirmBox.textContent = text;
    confirmBox.classList.toggle("is-error", Boolean(isError));
    confirmBox.classList.add("is-visible");
  };

  var validate = function (data) {
    clearErrors();
    var firstBad = null;
    var fail = function (id, msg) {
      setError(id, msg);
      if (!firstBad) firstBad = id;
    };

    if (!choisis().length) {
      fail("panier", "Choisissez au moins une bouteille.");
    }

    if (!data.cname || data.cname.trim().length < 2) {
      fail("cname", "Merci d'indiquer votre nom.");
    }

    var telErr = tel ? tel.validate() : null;
    if (telErr) fail("cphone", telErr);

    if (data.cemail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.cemail)) {
      fail("cemail", "Cette adresse email semble incorrecte.");
    }

    var remise = remiseChoisie();
    if (!remise) {
      fail("remise", "Indiquez comment vous souhaitez la recevoir.");
    } else if (remise.adresse && (!data.cadresse || data.cadresse.trim().length < 8)) {
      fail("cadresse", "Une adresse est nécessaire pour la livraison.");
    }

    if (!data.cage) {
      fail("cage", "La confirmation d'âge est obligatoire pour commander de l'alcool.");
    }

    return firstBad;
  };

  if (form) {
    renderRecap();

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var remise = remiseChoisie();
      var data = {
        type: "commande",
        cname: ($("#cname").value || "").trim(),
        cemail: ($("#cemail").value || "").trim(),
        cadresse: (adresseInput && adresseInput.value || "").trim(),
        cmessage: ($("#cmessage").value || "").trim(),
        cage: $("#cage").checked
      };

      var bad = validate(data);
      if (bad) {
        showMessage("Quelques informations manquent ou sont à corriger — voir les champs signalés.", true);
        var el = document.getElementById(bad);
        if (el && el.focus) el.focus();
        return;
      }

      // Composition de l'envoi
      data.cphone = tel ? tel.compose() : "";
      data.cremise = remise ? remise.nom : "";
      data.cproduits = resume();
      data.ctotal = String(totalFcfa());
      PRODUITS.forEach(function (p) {
        data["q" + p.cle] = String(quantites[p.cle]);
      });
      delete data.cage;

      ["cname", "cemail", "cadresse", "cmessage", "cproduits"].forEach(function (k) {
        data[k] = sheetSafe(data[k]);
      });

      if (!CFG.SCRIPT_URL) {
        showMessage("La commande en ligne n'est pas encore reliée. Appelez-nous au " +
                    CFG.PHONE_DISPLAY + ".", true);
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Envoi en cours…";
      confirmBox.classList.remove("is-visible");

      fetch(CFG.SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(data)
      })
        .then(function (res) { return res.json(); })
        .then(function (result) {
          if (!result || result.ok !== true) {
            throw new Error((result && result.error) || "refus du serveur");
          }
          showMessage(
            "Merci " + data.cname.trim().split(" ")[0] + ", votre commande de " +
            resume() + " (" + fcfa(totalFcfa()) + ") est enregistrée. " +
            "Nous vous rappelons sous 24h au " +
            data.cphone.replace(/^00/, "+") +
            " pour convenir du règlement et de la remise.",
            false
          );
          form.reset();
          clearErrors();
          PRODUITS.forEach(function (p) { quantites[p.cle] = 0; });
          $$(".qty__input", panier).forEach(function (i) { i.value = "0"; });
          $$(".qty__btn", panier).forEach(function (b) {
            if (b.textContent === "−") b.disabled = true;
          });
          $$(".panier__row", panier).forEach(function (r) { r.classList.remove("is-chosen"); });
          if (adresseField) adresseField.hidden = true;
          renderRecap();
        })
        .catch(function () {
          showMessage(
            "Votre commande n'a pas pu être envoyée. Merci de réessayer, ou de nous appeler au " +
            CFG.PHONE_DISPLAY + " — nous la prenons directement.",
            true
          );
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "Envoyer la commande";
        });
    });

    form.addEventListener("input", function (e) {
      if (e.target.id) setError(e.target.id, "");
    });
  }
})();
