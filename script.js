(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var year = document.querySelector('[data-year]');
  var revealItems = document.querySelectorAll('[data-reveal]');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (year) year.textContent = String(new Date().getFullYear());

  function updateHeader() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 10);
  }

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(function (item) {
      item.classList.add('is-visible');
    });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {
      rootMargin: '0px 0px -9% 0px',
      threshold: 0.08
    });

    revealItems.forEach(function (item) {
      observer.observe(item);
    });
  }

  document.querySelectorAll('.faq-item').forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      document.querySelectorAll('.faq-item[open]').forEach(function (other) {
        if (other !== item) other.removeAttribute('open');
      });
    });
  });
})();
