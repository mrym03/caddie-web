/* Caddie marketing site — UI interactions (nav, mobile menu, scroll reveal,
   ticker, and pausing the WebGL gradient when it's off-screen). */
(function () {
  'use strict';

  // ---- Nav: blur + hairline on scroll ----------------------------------------
  var nav = document.getElementById('nav');
  function onScroll() {
    if (window.scrollY > 24) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- Mobile menu ------------------------------------------------------------
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobileMenu');
  function toggleMenu(open) {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  burger.addEventListener('click', function () {
    toggleMenu(!document.body.classList.contains('menu-open'));
  });
  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') toggleMenu(false);
  });

  // ---- Ticker: duplicate the phrase set so the loop is seamless ---------------
  var ticker = document.getElementById('ticker');
  if (ticker) {
    var phrases = [
      'Joins Your Calls', 'Answers Live', 'Grounded In Your Knowledge',
      'Catches You When You Stall', 'Fact-Checks In Real Time',
      'Auto-Joins From Your Calendar', 'Never Forgets A Number', 'One Quiet Copilot'
    ];
    var unit = '';
    phrases.forEach(function (p) {
      unit += '<span>' + p + '</span><span class="dot">·</span>';
    });
    ticker.innerHTML = unit + unit; // two copies → -50% translate loops cleanly
  }

  // ---- Scroll reveal ----------------------------------------------------------
  var revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in-view');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealItems.forEach(function (el) { io.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add('in-view'); });
  }

  // ---- Pause the gradient when neither the hero nor the final CTA is visible --
  window.GRADIENT_ACTIVE = true;
  var gradientSections = [document.getElementById('top'), document.getElementById('get-started')].filter(Boolean);
  if ('IntersectionObserver' in window && gradientSections.length) {
    var visible = {};
    var vo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
      window.GRADIENT_ACTIVE = gradientSections.some(function (s) { return visible[s.id]; });
    }, { threshold: 0 });
    gradientSections.forEach(function (s) { vo.observe(s); });
  }
})();
