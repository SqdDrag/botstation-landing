(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var year = document.querySelector('[data-year]');
  var revealItems = document.querySelectorAll('[data-reveal]');
  var reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduceMotion = reduceMotionQuery.matches;
  var telegramCursor = document.querySelector('[data-telegram-cursor]');
  var telegramCursorTrail = document.querySelector('[data-telegram-cursor-trail]');
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

  var faqList = document.querySelector('.faq-list');
  var faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(function (item) {
    var trigger = item.querySelector('.faq-trigger');
    var answer = item.querySelector('.faq-answer');

    if (!trigger || !answer) return;

    trigger.setAttribute('aria-expanded', 'false');
    answer.setAttribute('aria-hidden', 'true');

    trigger.addEventListener('click', function () {
      var shouldOpen = !item.classList.contains('is-open');

      faqItems.forEach(function (otherItem) {
        var otherTrigger = otherItem.querySelector('.faq-trigger');
        var otherAnswer = otherItem.querySelector('.faq-answer');
        var isCurrentItem = otherItem === item && shouldOpen;

        otherItem.classList.toggle('is-open', isCurrentItem);
        if (otherTrigger) otherTrigger.setAttribute('aria-expanded', String(isCurrentItem));
        if (otherAnswer) otherAnswer.setAttribute('aria-hidden', String(!isCurrentItem));
      });
    });
  });

  if (faqList) faqList.classList.add('is-ready');

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
    var trailContext = telegramCursorTrail ? telegramCursorTrail.getContext('2d') : null;
    var cursorParticles = [];
    var particleDistance = 0;
    var trailPixelRatio = 1;
    var trailDirtyBounds = null;
    var lastFrameTime = 0;
    var cursorSurfaceElement = null;
    var interactiveSelector = 'a, button, summary, input, textarea, select, label, [role="button"]';

    function resizeCursorTrail() {
      if (!trailContext) return;

      trailPixelRatio = 1;
      telegramCursorTrail.width = Math.max(1, Math.round(window.innerWidth * trailPixelRatio));
      telegramCursorTrail.height = Math.max(1, Math.round(window.innerHeight * trailPixelRatio));
      trailContext.setTransform(trailPixelRatio, 0, 0, trailPixelRatio, 0, 0);
      trailDirtyBounds = null;
      cursorSurfaceElement = null;
      if (cursorVisible) scheduleCursorFrame();
    }

    function colorChannelToLinear(channel) {
      var normalized = channel / 255;
      return normalized <= .04045
        ? normalized / 12.92
        : Math.pow((normalized + .055) / 1.055, 2.4);
    }

    function isDarkSurface(element) {
      var currentElement = element;

      while (currentElement instanceof Element) {
        if (currentElement !== telegramCursor && currentElement !== telegramCursorTrail) {
          var backgroundColor = window.getComputedStyle(currentElement).backgroundColor;
          var channels = backgroundColor.match(/[\d.]+/g);

          if (channels && channels.length >= 3) {
            var alpha = channels.length > 3 ? Number(channels[3]) : 1;

            if (alpha >= .45) {
              var luminance =
                .2126 * colorChannelToLinear(Number(channels[0])) +
                .7152 * colorChannelToLinear(Number(channels[1])) +
                .0722 * colorChannelToLinear(Number(channels[2]));

              return luminance < .08;
            }
          }
        }

        currentElement = currentElement.parentElement;
      }

      return false;
    }

    function updateCursorSurface() {
      if (!cursorVisible) return;

      var sampledElement = document.elementFromPoint(
        Math.max(0, Math.min(window.innerWidth - 1, cursorX)),
        Math.max(0, Math.min(window.innerHeight - 1, cursorY))
      );

      if (sampledElement === cursorSurfaceElement) return;

      cursorSurfaceElement = sampledElement;
      telegramCursor.classList.toggle('is-on-dark', isDarkSurface(sampledElement));
    }

    function invalidateCursorSurface() {
      cursorSurfaceElement = null;
      if (cursorVisible) scheduleCursorFrame();
    }

    function clearCursorTrail() {
      if (!trailContext || !trailDirtyBounds) return;

      var padding = 5;
      trailContext.clearRect(
        trailDirtyBounds.left - padding,
        trailDirtyBounds.top - padding,
        trailDirtyBounds.right - trailDirtyBounds.left + padding * 2,
        trailDirtyBounds.bottom - trailDirtyBounds.top + padding * 2
      );
      trailDirtyBounds = null;
    }

    function includeCursorTrailPoint(x, y, radius) {
      if (!trailDirtyBounds) {
        trailDirtyBounds = {
          left: x - radius,
          top: y - radius,
          right: x + radius,
          bottom: y + radius
        };
        return;
      }

      trailDirtyBounds.left = Math.min(trailDirtyBounds.left, x - radius);
      trailDirtyBounds.top = Math.min(trailDirtyBounds.top, y - radius);
      trailDirtyBounds.right = Math.max(trailDirtyBounds.right, x + radius);
      trailDirtyBounds.bottom = Math.max(trailDirtyBounds.bottom, y + radius);
    }

    function addCursorParticle(x, y, directionX, directionY) {
      var sideX = -directionY;
      var sideY = directionX;
      var sideOffset = (Math.random() - .5) * 7;
      var backwardSpeed = .35 + Math.random() * .55;
      var sideSpeed = (Math.random() - .5) * .38;
      var colorRoll = Math.random();

      cursorParticles.push({
        x: x - directionX * 15 + sideX * sideOffset,
        y: y - directionY * 15 + sideY * sideOffset,
        velocityX: -directionX * backwardSpeed + sideX * sideSpeed,
        velocityY: -directionY * backwardSpeed + sideY * sideSpeed,
        size: 1 + Math.random() * 2.2,
        life: 1,
        fade: .026 + Math.random() * .018,
        color: colorRoll < .58 ? '47, 91, 255' : (colorRoll < .82 ? '16, 17, 15' : '201, 255, 69')
      });

      if (cursorParticles.length > 90) cursorParticles.shift();
    }

    function emitCursorParticles(previousX, previousY, nextX, nextY) {
      if (!trailContext || reduceMotion || !cursorVisible) return;

      var deltaX = nextX - previousX;
      var deltaY = nextY - previousY;
      var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance < .1) return;

      particleDistance += distance;
      var particleCount = Math.min(10, Math.floor(particleDistance / 7));

      if (!particleCount) return;

      particleDistance %= 7;
      var directionX = deltaX / distance;
      var directionY = deltaY / distance;

      for (var index = 0; index < particleCount; index += 1) {
        var progress = (index + 1) / (particleCount + 1);
        addCursorParticle(
          previousX + deltaX * progress,
          previousY + deltaY * progress,
          directionX,
          directionY
        );
      }
    }

    function renderCursorParticles(frameScale) {
      if (!trailContext) return;

      clearCursorTrail();

      for (var index = cursorParticles.length - 1; index >= 0; index -= 1) {
        var particle = cursorParticles[index];

        particle.x += particle.velocityX * frameScale;
        particle.y += particle.velocityY * frameScale;
        particle.velocityX *= Math.pow(.97, frameScale);
        particle.velocityY *= Math.pow(.97, frameScale);
        particle.life -= particle.fade * frameScale;

        if (particle.life <= 0) {
          cursorParticles.splice(index, 1);
          continue;
        }

        var particleRadius = particle.size * (.55 + particle.life * .45);

        trailContext.globalAlpha = Math.min(1, particle.life * 1.15);
        trailContext.fillStyle = 'rgb(' + particle.color + ')';
        trailContext.beginPath();
        trailContext.arc(
          particle.x,
          particle.y,
          particleRadius,
          0,
          Math.PI * 2
        );
        trailContext.fill();
        includeCursorTrailPoint(particle.x, particle.y, particleRadius);
      }

      trailContext.globalAlpha = 1;
    }

    function scheduleCursorFrame() {
      if (cursorFrame) return;
      cursorFrame = window.requestAnimationFrame(renderCursor);
    }

    function frameAdjustedFollow(baseFollow, frameScale) {
      return 1 - Math.pow(1 - baseFollow, frameScale);
    }

    function renderCursor(timestamp) {
      cursorFrame = 0;

      var currentTime = typeof timestamp === 'number' ? timestamp : window.performance.now();
      var frameDuration = lastFrameTime ? Math.min(34, Math.max(4, currentTime - lastFrameTime)) : 16.667;
      var frameScale = frameDuration / 16.667;
      lastFrameTime = currentTime;

      var follow = reduceMotion ? 1 : frameAdjustedFollow(.18, frameScale);
      var velocityFollow = reduceMotion ? 1 : frameAdjustedFollow(.14, frameScale);
      var headingFollow = reduceMotion ? 1 : frameAdjustedFollow(.2, frameScale);
      var angleFollow = reduceMotion ? 1 : frameAdjustedFollow(.14, frameScale);
      var previousX = cursorX;
      var previousY = cursorY;

      cursorX += (cursorTargetX - cursorX) * follow;
      cursorY += (cursorTargetY - cursorY) * follow;

      var frameVelocityX = cursorX - previousX;
      var frameVelocityY = cursorY - previousY;

      cursorVelocityX += (frameVelocityX - cursorVelocityX) * velocityFollow;
      cursorVelocityY += (frameVelocityY - cursorVelocityY) * velocityFollow;

      emitCursorParticles(previousX, previousY, cursorX, cursorY);

      if (cursorVelocityX * cursorVelocityX + cursorVelocityY * cursorVelocityY > .001) {
        var desiredAngle = Math.atan2(cursorVelocityY, cursorVelocityX) * 180 / Math.PI + 35;
        var headingDelta = ((desiredAngle - cursorTargetAngle + 540) % 360) - 180;
        cursorTargetAngle += headingDelta * headingFollow;
      }

      cursorAngle += (cursorTargetAngle - cursorAngle) * angleFollow;

      telegramCursor.style.transform =
        'translate3d(' + cursorX.toFixed(2) + 'px, ' + cursorY.toFixed(2) + 'px, 0) ' +
        'rotate(' + cursorAngle.toFixed(2) + 'deg)';

      updateCursorSurface();
      renderCursorParticles(frameScale);

      if (
        cursorVisible &&
        !reduceMotion &&
        (Math.abs(cursorTargetX - cursorX) > .1 ||
          Math.abs(cursorTargetY - cursorY) > .1 ||
          Math.abs(cursorTargetAngle - cursorAngle) > .1 ||
          Math.abs(cursorVelocityX) > .01 ||
          Math.abs(cursorVelocityY) > .01 ||
          cursorParticles.length > 0)
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
      lastFrameTime = 0;

      if (cursorFrame) {
        window.cancelAnimationFrame(cursorFrame);
        cursorFrame = 0;
      }

      cursorParticles.length = 0;
      particleDistance = 0;
      cursorSurfaceElement = null;
      clearCursorTrail();
      document.documentElement.classList.remove('telegram-cursor-active');
      telegramCursor.classList.remove('is-visible', 'is-interactive', 'is-pressed', 'is-on-dark');
    }

    function updateReducedMotion(event) {
      reduceMotion = event.matches;

      if (reduceMotion) {
        cursorParticles.length = 0;
        particleDistance = 0;
        clearCursorTrail();
      }

      lastFrameTime = 0;
      if (cursorVisible) scheduleCursorFrame();
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
      updateCursorSurface();
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
    window.addEventListener('scroll', invalidateCursorSurface, { passive: true });
    window.addEventListener('resize', resizeCursorTrail, { passive: true });
    reduceMotionQuery.addEventListener('change', updateReducedMotion);
    resizeCursorTrail();
  }
})();
