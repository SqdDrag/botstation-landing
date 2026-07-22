(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var year = document.querySelector('[data-year]');
  var revealItems = document.querySelectorAll('[data-reveal]');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var telegramCursor = document.querySelector('[data-telegram-cursor]');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

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

  if (telegramCursor && finePointer.matches) {
    var cursorX = -80;
    var cursorY = -80;
    var cursorTargetX = -80;
    var cursorTargetY = -80;
    var cursorAngle = 0;
    var cursorTargetAngle = 0;
    var cursorVelocityX = 0;
    var cursorVelocityY = 0;
    var cursorFrame = 0;
    var cursorVisible = false;
    var cursorInitialized = false;
    var interactiveSelector = 'a, button, summary, input, textarea, select, label, [role="button"]';

    function scheduleCursorFrame() {
      if (cursorFrame) return;
      cursorFrame = window.requestAnimationFrame(renderCursor);
    }

    function renderCursor() {
      cursorFrame = 0;

      var follow = reduceMotion ? 1 : .18;
      var velocityFollow = reduceMotion ? 1 : .14;
      var headingFollow = reduceMotion ? 1 : .2;
      var angleFollow = reduceMotion ? 1 : .14;
      var previousX = cursorX;
      var previousY = cursorY;

      cursorX += (cursorTargetX - cursorX) * follow;
      cursorY += (cursorTargetY - cursorY) * follow;

      var frameVelocityX = cursorX - previousX;
      var frameVelocityY = cursorY - previousY;

      cursorVelocityX += (frameVelocityX - cursorVelocityX) * velocityFollow;
      cursorVelocityY += (frameVelocityY - cursorVelocityY) * velocityFollow;

      if (cursorVelocityX * cursorVelocityX + cursorVelocityY * cursorVelocityY > .001) {
        var desiredAngle = Math.atan2(cursorVelocityY, cursorVelocityX) * 180 / Math.PI + 35;
        var headingDelta = ((desiredAngle - cursorTargetAngle + 540) % 360) - 180;
        cursorTargetAngle += headingDelta * headingFollow;
      }

      cursorAngle += (cursorTargetAngle - cursorAngle) * angleFollow;

      telegramCursor.style.transform =
        'translate3d(' + cursorX.toFixed(2) + 'px, ' + cursorY.toFixed(2) + 'px, 0) ' +
        'rotate(' + cursorAngle.toFixed(2) + 'deg)';

      if (
        cursorVisible &&
        !reduceMotion &&
        (Math.abs(cursorTargetX - cursorX) > .1 ||
          Math.abs(cursorTargetY - cursorY) > .1 ||
          Math.abs(cursorTargetAngle - cursorAngle) > .1 ||
          Math.abs(cursorVelocityX) > .01 ||
          Math.abs(cursorVelocityY) > .01)
      ) {
        scheduleCursorFrame();
      }
    }

    function updateInteractiveState(target) {
      var isInteractive = target instanceof Element && Boolean(target.closest(interactiveSelector));
      telegramCursor.classList.toggle('is-interactive', isInteractive);
    }

    function showCursor() {
      cursorVisible = true;
      document.documentElement.classList.add('telegram-cursor-active');
      telegramCursor.classList.add('is-visible');
    }

    function hideCursor() {
      cursorVisible = false;
      cursorInitialized = false;
      cursorVelocityX = 0;
      cursorVelocityY = 0;
      document.documentElement.classList.remove('telegram-cursor-active');
      telegramCursor.classList.remove('is-visible', 'is-interactive', 'is-pressed');
    }

    window.addEventListener('pointermove', function (event) {
      if (event.pointerType === 'touch') return;

      var nextX = event.clientX;
      var nextY = event.clientY;

      if (!cursorInitialized) {
        cursorX = nextX;
        cursorY = nextY;
        cursorTargetX = nextX;
        cursorTargetY = nextY;
        cursorInitialized = true;
        renderCursor();
      } else {
        cursorTargetX = nextX;
        cursorTargetY = nextY;
        scheduleCursorFrame();
      }

      updateInteractiveState(event.target);
      showCursor();
    }, { passive: true });

    window.addEventListener('pointerdown', function () {
      if (!cursorVisible) return;
      telegramCursor.classList.add('is-pressed');
    }, { passive: true });

    window.addEventListener('pointerup', function () {
      telegramCursor.classList.remove('is-pressed');
    }, { passive: true });

    window.addEventListener('pointercancel', hideCursor, { passive: true });
    window.addEventListener('blur', hideCursor);
    document.addEventListener('mouseleave', hideCursor);
  }
})();
