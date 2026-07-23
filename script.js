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

  document.addEventListener('selectstart', function (event) {
    event.preventDefault();
  });

  document.addEventListener('dragstart', function (event) {
    event.preventDefault();
  });

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
    var cursorTrailPoints = [];
    var trailSampleDistance = 0;
    var trailPixelRatio = 1;
    var trailDirtyBounds = null;
    var lastFrameTime = 0;
    var cursorSurfaceElement = null;
    var cursorTrailOnDark = false;
    var cursorUsesScrollHeading = false;
    var lastScrollPosition = window.scrollY;
    var interactiveSelector = 'a, button, summary, input, textarea, select, label, [role="button"]';

    function resizeCursorTrail() {
      if (!trailContext) return;

      trailPixelRatio = 1;
      telegramCursorTrail.width = Math.max(1, Math.round(window.innerWidth * trailPixelRatio));
      telegramCursorTrail.height = Math.max(1, Math.round(window.innerHeight * trailPixelRatio));
      trailContext.setTransform(trailPixelRatio, 0, 0, trailPixelRatio, 0, 0);
      trailDirtyBounds = null;
      cursorTrailPoints.length = 0;
      trailSampleDistance = 0;
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

              return luminance < .18;
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
      cursorTrailOnDark = isDarkSurface(sampledElement);
      telegramCursor.classList.toggle('is-on-dark', cursorTrailOnDark);
    }

    function invalidateCursorSurface() {
      cursorSurfaceElement = null;
      if (cursorVisible) scheduleCursorFrame();
    }

    function updateCursorForScroll() {
      var nextScrollPosition = window.scrollY;
      var scrollDelta = nextScrollPosition - lastScrollPosition;
      lastScrollPosition = nextScrollPosition;
      invalidateCursorSurface();

      if (!cursorVisible || Math.abs(scrollDelta) < .1) return;

      cursorUsesScrollHeading = true;
      cursorVelocityX = 0;
      cursorVelocityY = 0;

      var desiredAngle = scrollDelta > 0 ? 125 : -55;
      var angleDelta = ((desiredAngle - cursorTargetAngle + 540) % 360) - 180;
      if (Math.abs(angleDelta + 180) < .001) angleDelta = scrollDelta > 0 ? 180 : -180;
      cursorTargetAngle += angleDelta;
      scheduleCursorFrame();
    }

    function clearCursorTrail() {
      if (!trailContext || !trailDirtyBounds) return;

      var padding = 9;
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

    function addCursorTrailPoint(x, y, onDark) {
      cursorTrailPoints.push({
        x: x,
        y: y,
        life: 1,
        color: onDark ? '251, 250, 246' : '47, 91, 255'
      });

      if (cursorTrailPoints.length > 64) cursorTrailPoints.shift();
    }

    function recordCursorTrail(previousX, previousY, nextX, nextY, startedOnDark, endedOnDark) {
      if (!trailContext || reduceMotion || !cursorVisible) return;

      var deltaX = nextX - previousX;
      var deltaY = nextY - previousY;
      var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance < .1) return;

      trailSampleDistance += distance;
      var pointCount = Math.min(16, Math.floor(trailSampleDistance / 4));

      if (!pointCount) return;

      trailSampleDistance %= 4;
      var directionX = deltaX / distance;
      var directionY = deltaY / distance;

      for (var index = 0; index < pointCount; index += 1) {
        var progress = (index + 1) / (pointCount + 1);
        addCursorTrailPoint(
          previousX + deltaX * progress - directionX * 15,
          previousY + deltaY * progress - directionY * 15,
          progress < .5 ? startedOnDark : endedOnDark
        );
      }
    }

    function renderCursorTrail(frameScale) {
      if (!trailContext) return;

      clearCursorTrail();

      for (var index = cursorTrailPoints.length - 1; index >= 0; index -= 1) {
        var point = cursorTrailPoints[index];
        point.life -= .034 * frameScale;

        if (point.life <= 0) cursorTrailPoints.splice(index, 1);
      }

      trailContext.lineCap = 'round';
      trailContext.lineJoin = 'round';

      for (var segmentIndex = 1; segmentIndex < cursorTrailPoints.length; segmentIndex += 1) {
        var previousPoint = cursorTrailPoints[segmentIndex - 1];
        var currentPoint = cursorTrailPoints[segmentIndex];
        var nextPoint = cursorTrailPoints[segmentIndex + 1];
        var startX = segmentIndex === 1
          ? previousPoint.x
          : (previousPoint.x + currentPoint.x) / 2;
        var startY = segmentIndex === 1
          ? previousPoint.y
          : (previousPoint.y + currentPoint.y) / 2;
        var endX = nextPoint
          ? (currentPoint.x + nextPoint.x) / 2
          : currentPoint.x;
        var endY = nextPoint
          ? (currentPoint.y + nextPoint.y) / 2
          : currentPoint.y;
        var strength = Math.max(0, Math.min(1, (previousPoint.life + currentPoint.life) / 2));
        var lineWidth = .45 + 3.1 * Math.pow(strength, 1.55);
        var lineAlpha = .05 + .58 * Math.pow(strength, 1.2);
        var trailColor = 'rgb(' + currentPoint.color + ')';

        trailContext.beginPath();
        trailContext.moveTo(startX, startY);
        trailContext.quadraticCurveTo(currentPoint.x, currentPoint.y, endX, endY);
        trailContext.globalAlpha = lineAlpha * .16;
        trailContext.lineWidth = lineWidth + 3.2;
        trailContext.strokeStyle = trailColor;
        trailContext.stroke();

        trailContext.beginPath();
        trailContext.moveTo(startX, startY);
        trailContext.quadraticCurveTo(currentPoint.x, currentPoint.y, endX, endY);
        trailContext.globalAlpha = lineAlpha;
        trailContext.lineWidth = lineWidth;
        trailContext.strokeStyle = trailColor;
        trailContext.stroke();

        includeCursorTrailPoint(startX, startY, lineWidth + 4);
        includeCursorTrailPoint(currentPoint.x, currentPoint.y, lineWidth + 4);
        includeCursorTrailPoint(endX, endY, lineWidth + 4);
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
      var trailStartedOnDark = cursorTrailOnDark;

      cursorX += (cursorTargetX - cursorX) * follow;
      cursorY += (cursorTargetY - cursorY) * follow;

      var frameVelocityX = cursorX - previousX;
      var frameVelocityY = cursorY - previousY;

      cursorVelocityX += (frameVelocityX - cursorVelocityX) * velocityFollow;
      cursorVelocityY += (frameVelocityY - cursorVelocityY) * velocityFollow;

      updateCursorSurface();
      recordCursorTrail(
        previousX,
        previousY,
        cursorX,
        cursorY,
        trailStartedOnDark,
        cursorTrailOnDark
      );

      if (
        !cursorUsesScrollHeading &&
        cursorVelocityX * cursorVelocityX + cursorVelocityY * cursorVelocityY > .001
      ) {
        var desiredAngle = Math.atan2(cursorVelocityY, cursorVelocityX) * 180 / Math.PI + 35;
        var headingDelta = ((desiredAngle - cursorTargetAngle + 540) % 360) - 180;
        cursorTargetAngle += headingDelta * headingFollow;
      }

      cursorAngle += (cursorTargetAngle - cursorAngle) * angleFollow;

      telegramCursor.style.transform =
        'translate3d(' + cursorX.toFixed(2) + 'px, ' + cursorY.toFixed(2) + 'px, 0) ' +
        'rotate(' + cursorAngle.toFixed(2) + 'deg)';

      renderCursorTrail(frameScale);

      if (
        cursorVisible &&
        !reduceMotion &&
        (Math.abs(cursorTargetX - cursorX) > .1 ||
          Math.abs(cursorTargetY - cursorY) > .1 ||
          Math.abs(cursorTargetAngle - cursorAngle) > .1 ||
          Math.abs(cursorVelocityX) > .01 ||
          Math.abs(cursorVelocityY) > .01 ||
          cursorTrailPoints.length > 0)
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
      cursorUsesScrollHeading = false;
      lastFrameTime = 0;

      if (cursorFrame) {
        window.cancelAnimationFrame(cursorFrame);
        cursorFrame = 0;
      }

      cursorTrailPoints.length = 0;
      trailSampleDistance = 0;
      cursorSurfaceElement = null;
      cursorTrailOnDark = false;
      clearCursorTrail();
      document.documentElement.classList.remove('telegram-cursor-active');
      telegramCursor.classList.remove('is-visible', 'is-interactive', 'is-pressed', 'is-on-dark');
    }

    function updateReducedMotion(event) {
      reduceMotion = event.matches;

      if (reduceMotion) {
        cursorTrailPoints.length = 0;
        trailSampleDistance = 0;
        clearCursorTrail();
      }

      lastFrameTime = 0;
      if (cursorVisible) scheduleCursorFrame();
    }

    window.addEventListener('pointermove', function (event) {
      if (event.pointerType === 'touch') return;

      cursorUsesScrollHeading = false;
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
    window.addEventListener('scroll', updateCursorForScroll, { passive: true });
    window.addEventListener('resize', resizeCursorTrail, { passive: true });
    reduceMotionQuery.addEventListener('change', updateReducedMotion);
    resizeCursorTrail();
  }
})();
