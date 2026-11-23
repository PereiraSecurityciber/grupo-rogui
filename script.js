(() => {
  'use strict';

  // Header turns solid after leaving the hero
  const bar = document.querySelector('.topbar');
  const onScroll = () => bar && bar.classList.toggle('is-solid', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu
  const btn = document.querySelector('.menu-btn');
  const nav = document.getElementById('menu');
  if (btn && nav) {
    const close = () => { nav.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); btn.textContent = 'Menu'; };
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Fechar' : 'Menu';
    });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  // Background video: plays only when visible, never with reduced motion
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const video = document.querySelector('.hero__video');
  const toggle = document.querySelector('.hero__toggle');
  let userPaused = reduce;
  if (video) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !userPaused) video.play().catch(() => {});
        else video.pause();
      }, { threshold: 0.2 }).observe(video);
    }
    if (toggle) {
      const sync = () => { toggle.textContent = video.paused ? 'Reproduzir vídeo' : 'Pausar vídeo'; toggle.setAttribute('aria-label', toggle.textContent + ' de fundo'); };
      video.addEventListener('play', sync);
      video.addEventListener('pause', sync);
      toggle.addEventListener('click', () => {
        if (video.paused) { userPaused = false; video.play().catch(() => {}); }
        else { userPaused = true; video.pause(); }
      });
      sync();
    }
  }

  // Carousel: flat slider, drag/swipe, autoplay
  const car = document.querySelector('.carousel');
  if (car) {
    const stage = car.querySelector('.carousel__stage');
    const ring = car.querySelector('.carousel__ring');
    const slides = [...ring.children];
    const n = slides.length;
    const count = car.querySelector('.carousel__count strong');
    let cur = 0;
    const prevRel = new Array(n).fill(null);
    const mod = (x) => ((x % n) + n) % n;
    const relOf = (k) => { let r = mod(k - cur); if (r > n / 2) r -= n; return r; };

    const render = (dragPx = 0) => {
      const w = slides[0].offsetWidth + 24;
      slides.forEach((s, k) => {
        const r = relOf(k);
        // a slide wrapping from one end to the other jumps without animating
        if (prevRel[k] !== null && Math.abs(r - prevRel[k]) > 1) {
          s.classList.add('no-anim');
          requestAnimationFrame(() => requestAnimationFrame(() => s.classList.remove('no-anim')));
        }
        prevRel[k] = r;
        const a = Math.abs(r);
        s.style.transform = `translateX(${r * w + dragPx}px) scale(${a ? 0.86 : 1})`;
        s.style.opacity = a > 1 ? '0' : a ? '.5' : '1';
        s.style.zIndex = String(10 - a);
        s.classList.toggle('is-current', a === 0);
        s.setAttribute('aria-hidden', String(a !== 0));
      });
      count.textContent = String(cur + 1);
    };
    const goTo = (i) => { cur = mod(i); render(); };

    car.querySelectorAll('.carousel__btn').forEach((b) => b.addEventListener('click', () => { goTo(cur + Number(b.dataset.dir)); restart(); }));
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(cur + 1); restart(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(cur - 1); restart(); }
    });
    slides.forEach((s, k) => s.addEventListener('click', () => { if (!moved && k !== cur) { goTo(k); restart(); } }));

    // Drag / swipe
    let startX = 0, dragging = false, moved = false;
    stage.addEventListener('pointerdown', (e) => { dragging = true; moved = false; startX = e.clientX; stage.setPointerCapture(e.pointerId); });
    stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; stage.classList.add('is-dragging'); }
      if (moved) render(dx);
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false; stage.classList.remove('is-dragging');
      if (moved) {
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 50) goTo(cur - Math.sign(dx)); else render();
        restart();
      }
      setTimeout(() => { moved = false; }, 0);
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    window.addEventListener('resize', () => render());
    render();

    // Autoplay: pauses on hover/focus, off-screen, hidden tab, or by the button
    const INTERVAL = 2000;
    car.style.setProperty('--car-interval', INTERVAL + 'ms');
    const playBtn = car.querySelector('.carousel__play');
    const progress = document.createElement('span');
    progress.className = 'carousel__progress';
    progress.setAttribute('aria-hidden', 'true');
    car.querySelector('.carousel__controls').appendChild(progress);
    let timer = null;
    let userStopped = reduce;
    let hovering = false;
    let visible = false;
    const restartBar = () => { progress.style.display = 'none'; void progress.offsetWidth; progress.style.display = ''; };
    const run = () => {
      const should = !userStopped && !hovering && visible && !document.hidden;
      if (should && !timer) {
        restartBar();
        timer = setInterval(() => goTo(cur + 1), INTERVAL);
      } else if (!should && timer) {
        clearInterval(timer); timer = null;
      }
      car.classList.toggle('is-playing', should);
      playBtn.textContent = userStopped ? 'Reproduzir' : 'Pausar';
      playBtn.setAttribute('aria-pressed', String(userStopped));
      playBtn.setAttribute('aria-label', userStopped ? 'Reproduzir carrossel automático' : 'Pausar carrossel automático');
    };
    function restart() { if (timer) { clearInterval(timer); timer = null; } run(); }
    playBtn.addEventListener('click', () => { userStopped = !userStopped; run(); });
    stage.addEventListener('mouseenter', () => { hovering = true; run(); });
    stage.addEventListener('mouseleave', () => { hovering = false; run(); });
    stage.addEventListener('focusin', () => { hovering = true; run(); });
    stage.addEventListener('focusout', () => { hovering = false; run(); });
    document.addEventListener('visibilitychange', run);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; run(); }, { threshold: 0.3 }).observe(car);
    } else { visible = true; }
    run();
  }

  // Highlight the nav link of the section in view
  const links = [...document.querySelectorAll('.nav a[href^="#"]:not(.btn)')];
  if (links.length && 'IntersectionObserver' in window) {
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) { links.forEach((l) => l.classList.remove('is-active')); map.get(target.id).classList.add('is-active'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
  }

  const y = document.querySelector('[data-year]');
  if (y) y.textContent = String(new Date().getFullYear());
})();
