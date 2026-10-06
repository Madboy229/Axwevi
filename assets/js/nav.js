/* ==========================================================================
   AXWEVI — Navigation, révélations, année courante
   Commun à toutes les pages publiques. À charger avant le script de la page.
   ========================================================================== */

(function () {
  "use strict";

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  };

  var nav = $("#nav");
  var burger = $("#navBurger");
  var navLinks = $("#navLinks");
  var scrim = $("#navScrim");

  /* ------------------------------------------------- Fond au défilement -- */

  if (nav) {
    var setNavState = function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 40);
    };
    setNavState();
    window.addEventListener("scroll", setNavState, { passive: true });
  }

  /* --------------------------------------------------- Tiroir mobile ----- */

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

  if (sections.length && navAnchors.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navAnchors.forEach(function (a) {
          var href = a.getAttribute("href") || "";
          if (href === "#" + entry.target.id) a.setAttribute("aria-current", "true");
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

  /* ------------------------------------------------------- Pied de page -- */

  var year = $("#year");
  if (year) year.textContent = new Date().getFullYear();
})();
