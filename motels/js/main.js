/*
  Movimento do site: rolagem suave (Lenis) + cenas com GSAP ScrollTrigger.
  1. fachada: o portão sobe e a câmera atravessa a garagem
  2. manifesto: palavras acendem conforme a rolagem
  3. rua de dentro: câmera em 3D passando pelas garagens das suítes
  4. painel de valores com letras que viram
  5. "por dentro" em rolagem horizontal
  6. discrição: imagem fixa que troca a cada passo
*/
(function () {
  'use strict';

  const D = window.ALCOVA;
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const money = (v) => 'R$ ' + v.toLocaleString('pt-BR');
  const pad2 = (n) => String(n).padStart(2, '0');

  const root = document.documentElement;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || !hasGsap;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (reduce) root.classList.add('is-static');

  // ---------------------------------------------------------------
  // Monta as garagens da rua de dentro a partir de js/data.js
  // ---------------------------------------------------------------
  (function buildLane() {
    const world = $('[data-world]');
    world.innerHTML = D.suites.map((s, i) =>
      '<article class="unit" data-i="' + i + '">' +
        '<div class="unit__top"><span class="unit__plate">' + s.id + '</span><span class="unit__lamp"></span></div>' +
        '<div class="unit__frame ph">' +
          '<img src="' + s.img + '" srcset="' + s.imgSmall + ' 800w, ' + s.img + ' 1400w" sizes="(max-width: 860px) 80vw, 40vw" alt="Suíte ' + s.name + '" decoding="async">' +
          '<div class="unit__shutter"><b>' + s.id + '</b></div>' +
          '<div class="unit__shade"></div>' +
        '</div>' +
        '<p class="unit__name">' + s.name + '</p>' +
        '<div class="unit__caption"><h3><span>' + s.id + '</span>' + s.name + '</h3><p>' + s.text + '</p>' +
          '<p>2 horas a partir de ' + money(s.prices['2h']) + ' · ' + s.qty + ' suítes</p></div>' +
      '</article>'
    ).join('');
  })();

  // Se uma foto não carregar, fica o fundo vinho do .ph no lugar
  $$('.ph img').forEach((img) => {
    const bad = () => img.classList.add('is-broken');
    img.addEventListener('error', bad, { once: true });
    if (img.complete && img.naturalWidth === 0 && (img.currentSrc || img.src)) bad();
  });

  // Relógio da navegação
  (function clock() {
    const el = $('[data-clock]');
    const tick = () => { const d = new Date(); el.textContent = pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
    tick();
    setInterval(tick, 10000);
  })();

  if (!hasGsap) {
    $('.loader').remove();
    $('.lane').classList.add('is-static');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // ---------------------------------------------------------------
  // Rolagem suave
  // ---------------------------------------------------------------
  let lenis = null;
  let scrollDir = 1;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  window.__lenis = lenis;

  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else if (target === 0) window.scrollTo(0, 0);
    else target.scrollIntoView();
  }

  // ---------------------------------------------------------------
  // Navegação: esconde ao descer, volta ao subir, links internos
  // ---------------------------------------------------------------
  const nav = $('[data-nav]');
  let menuOpen = false;

  function onScroll(y, dir) {
    if (dir) scrollDir = dir;
    nav.classList.toggle('is-solid', y > 40);
    nav.classList.toggle('is-hidden', !menuOpen && scrollDir === 1 && y > 240);
  }
  if (lenis) lenis.on('scroll', (l) => onScroll(l.scroll, l.direction));
  else {
    let last = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      onScroll(y, y > last ? 1 : -1);
      last = y;
    }, { passive: true });
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = id === '#topo' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    if (menuOpen) setMenu(false);
    scrollToTarget(target);
    if (target && target.id === 'reservar') {
      setTimeout(() => { const f = $('.suite-opt input:checked'); if (f) f.focus({ preventScroll: true }); }, 1900);
    }
  });

  const menuBtn = $('[data-menu-btn]');
  const menuEl = $('[data-menu]');
  function setMenu(open) {
    menuOpen = open;
    menuBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      menuEl.hidden = false;
      nav.classList.remove('is-hidden');
      if (lenis) lenis.stop();
      gsap.fromTo(menuEl, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: .7, ease: 'expo.inOut' });
      gsap.fromTo($$('li', menuEl), { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, stagger: .06, duration: .7, delay: .25, ease: 'power3.out' });
    } else {
      if (lenis) lenis.start();
      gsap.to(menuEl, { clipPath: 'inset(0 0 100% 0)', duration: .55, ease: 'expo.inOut', onComplete: () => { menuEl.hidden = true; } });
    }
  }
  menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) setMenu(false); });

  // ---------------------------------------------------------------
  // Cursor
  // ---------------------------------------------------------------
  (function cursor() {
    if (!fine || reduce) return;
    root.classList.add('has-cursor');
    const c = $('.cursor');
    const label = $('[data-cursor-label]');
    const xTo = gsap.quickTo(c, 'x', { duration: .3, ease: 'power3' });
    const yTo = gsap.quickTo(c, 'y', { duration: .3, ease: 'power3' });
    let moved = false;
    c.classList.add('is-hidden');
    window.addEventListener('pointermove', (e) => {
      if (!moved) { moved = true; gsap.set(c, { x: e.clientX, y: e.clientY }); c.classList.remove('is-hidden'); }
      xTo(e.clientX); yTo(e.clientY);
    }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const field = e.target.closest('input, select, textarea');
      const hit = e.target.closest('a, button, label');
      const tag = e.target.closest('[data-cursor]');
      c.classList.toggle('is-hidden', !!field || !moved);
      c.classList.toggle('is-hover', !!hit && !field);
      c.classList.toggle('is-label', !hit && !field && !!tag);
      label.textContent = !hit && tag ? tag.dataset.cursor : '';
    });
    document.addEventListener('pointerleave', () => c.classList.add('is-hidden'));
    document.addEventListener('pointerenter', () => c.classList.remove('is-hidden'));
  })();

  // ---------------------------------------------------------------
  // Neon: liga piscando
  // ---------------------------------------------------------------
  function flickerOn(el, onToggle) {
    const tl = gsap.timeline();
    const steps = [.06, .05, .11, .04, .22, .05, .07, .3, .04];
    let on = false;
    steps.forEach((s) => tl.add(() => {
      on = !on;
      el.classList.toggle('is-on', on);
      if (onToggle) onToggle(on);
    }, '+=' + s));
    tl.add(() => { el.classList.add('is-on', 'is-humming'); if (onToggle) onToggle(true); }, '+=.08');
    return tl;
  }

  // ---------------------------------------------------------------
  // 1. Fachada: portão sobe, câmera entra
  // ---------------------------------------------------------------
  function heroScene() {
    const hero = $('.hero');
    const facade = $('.hero__facade');
    const room = $('.hero__room');
    const gate = $('.gate');
    const shade = $('.hero__shade');
    const lines = $$('[data-hero-title] .line > span');
    const extras = [$('.hero__title .eyebrow'), $('.hero__lead')];

    if (reduce) return;

    function coverScale() {
      const pin = hero.querySelector('.hero__pin');
      const vw = pin.clientWidth;
      const vh = pin.clientHeight;
      const cx = gate.offsetLeft + gate.offsetWidth / 2;
      const cy = gate.offsetTop + gate.offsetHeight / 2;
      const sx = (2 * Math.max(cx, vw - cx)) / gate.offsetWidth;
      const sy = (2 * Math.max(cy, vh - cy)) / gate.offsetHeight;
      return Math.max(sx, sy) * 1.06;
    }

    gsap.set(room, { scale: 0.82 });
    gsap.set(lines, { yPercent: 115 });
    gsap.set(extras, { autoAlpha: 0, y: 24 });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: '+=250%',
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });

    tl.to('.hero__meta', { autoAlpha: 0, y: 24, duration: .3 }, 0)
      .to('.gate__shutter', { yPercent: -102, duration: 1, ease: 'power1.inOut' }, 0)
      .to('.gate__light', { opacity: 1, duration: .8 }, .1)
      .fromTo('.hero__spill', { opacity: 0, scaleY: .25 }, { opacity: 1, scaleY: 1, duration: .9 }, .1)
      .to(facade, { scale: coverScale, duration: 1.7, ease: 'power3.in' }, .85)
      .to(room, { scale: 1, duration: 1.7, ease: 'power2.in' }, .85)
      .to(facade, { autoAlpha: 0, duration: .12 }, 2.48)
      .to(shade, { opacity: 1, duration: .6 }, 2.2)
      .to(lines, { yPercent: 0, stagger: .12, duration: .6, ease: 'power3.out' }, 2.35)
      .to(extras, { autoAlpha: 1, y: 0, stagger: .1, duration: .5, ease: 'power2.out' }, 2.55)
      .to({}, { duration: .45 });

    // Leve balanço de câmera na mão, só antes de começar a rolar
    if (fine) {
      const fx = gsap.quickTo(facade, 'x', { duration: 1.2, ease: 'power3' });
      const fy = gsap.quickTo(facade, 'y', { duration: 1.2, ease: 'power3' });
      const rx = gsap.quickTo(room, 'x', { duration: 1.6, ease: 'power3' });
      const ry = gsap.quickTo(room, 'y', { duration: 1.6, ease: 'power3' });
      hero.addEventListener('pointermove', (e) => {
        const k = 1 - clamp01(tl.scrollTrigger.progress * 3);
        const nx = (e.clientX / window.innerWidth - .5) * k;
        const ny = (e.clientY / window.innerHeight - .5) * k;
        fx(nx * -14); fy(ny * -10);
        rx(nx * 22); ry(ny * 14);
      });
    }
  }

  // ---------------------------------------------------------------
  // 2. Manifesto
  // ---------------------------------------------------------------
  function manifestoScene() {
    const txt = $('[data-reveal-words]');
    if (window.SplitText && !reduce) {
      const split = new SplitText(txt, { type: 'words' });
      gsap.fromTo(split.words, { opacity: .12 }, {
        opacity: 1, stagger: .08, ease: 'none',
        scrollTrigger: { trigger: txt, start: 'top 80%', end: 'bottom 45%', scrub: true }
      });
    }
    if (reduce) return;

    $$('.float').forEach((el) => {
      const s = Number(el.dataset.speed) || 20;
      const st = { trigger: '.manifesto', start: 'top bottom', end: 'bottom top', scrub: true };
      gsap.fromTo(el, { yPercent: -s }, { yPercent: s, ease: 'none', scrollTrigger: st });
      gsap.fromTo($('img', el), { scale: 1.35 }, { scale: 1.05, ease: 'none', scrollTrigger: Object.assign({}, st) });
    });

    gsap.from('.facts li', {
      y: 50, autoAlpha: 0, stagger: .09, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: '.facts', start: 'top 88%' }
    });
    $$('.facts b').forEach((b) => {
      const m = b.textContent.match(/^(\d+)(.*)$/);
      if (!m || m[1] === '0') return;
      const len = m[1].length;
      const end = Number(m[1]);
      const o = { v: 0 };
      gsap.to(o, {
        v: end, duration: 1.4, ease: 'power2.out',
        scrollTrigger: { trigger: '.facts', start: 'top 88%' },
        onUpdate: () => { b.textContent = String(Math.round(o.v)).padStart(len, '0') + m[2]; }
      });
    });
  }

  // ---------------------------------------------------------------
  // Faixa que corre e acompanha a direção da rolagem
  // ---------------------------------------------------------------
  function tickerScene() {
    if (reduce) return;
    const wrap = $('.ticker');
    let visible = false;
    ScrollTrigger.create({ trigger: wrap, start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; } });

    $$('[data-ticker]').forEach((row) => {
      const set = Array.from(row.children);
      let guard = 0;
      while (row.scrollWidth < window.innerWidth * 1.3 && guard++ < 12) set.forEach((n) => row.appendChild(n.cloneNode(true)));
      Array.from(row.children).forEach((n) => row.appendChild(n.cloneNode(true)));

      const dir = Number(row.dataset.ticker) || 1;
      const base = row.classList.contains('ticker__row--alt') ? .5 : .9;
      let half = row.scrollWidth / 2;
      let x = 0;
      window.addEventListener('resize', () => { half = row.scrollWidth / 2; });

      gsap.ticker.add((t, dt) => {
        if (!visible) return;
        const v = lenis ? Math.min(Math.abs(lenis.velocity), 80) : 0;
        x -= (base + v * .14) * dir * scrollDir * (dt / 16.67);
        x = ((x % half) - half) % half;
        const skew = lenis ? Math.max(-7, Math.min(7, -lenis.velocity * .12)) : 0;
        row.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0) skewX(' + skew.toFixed(2) + 'deg)';
      });
    });
  }

  // ---------------------------------------------------------------
  // 3. A rua de dentro: câmera 3D
  // ---------------------------------------------------------------
  function laneScene() {
    const lane = $('.lane');
    if (reduce) { lane.classList.add('is-static'); return; }

    const stage = $('.lane__stage');
    const viewport = $('.lane__viewport');
    const env = $('[data-env]');
    const world = $('[data-world]');
    const floor = $('.lane__floor', env);
    const wallL = $('.lane__wall--l', env);
    const wallR = $('.lane__wall--r', env);
    const head = $('.lane__head');
    const hud = $('[data-hud]');
    const bar = $('[data-lane-bar]');
    const units = $$('.unit', world).map((el) => ({
      el, shutter: $('.unit__shutter', el), shade: $('.unit__shade', el), x: 0, z: 0
    }));
    const n = units.length;
    const G = {};
    const st = { p: 0 };
    const START = -0.8;
    const END = n - 1 + 0.32;
    let active = -1;

    const hudEls = {
      num: $('[data-hud-num]'), name: $('[data-hud-name]'), text: $('[data-hud-text]'),
      feat: $('[data-hud-feat]'), price: $('[data-hud-price]'), qty: $('[data-hud-qty]')
    };
    function fillHud(i) {
      const s = D.suites[i];
      hudEls.num.textContent = s.id;
      hudEls.name.textContent = s.name;
      hudEls.text.textContent = s.text;
      hudEls.feat.innerHTML = s.feat.map((f) => '<li>' + f + '</li>').join('');
      hudEls.price.textContent = money(s.prices['2h']);
      hudEls.qty.textContent = s.qty + (s.qty > 1 ? ' suítes deste tipo' : ' suíte deste tipo');
    }
    function setActive(i) {
      const first = active === -1;
      active = i;
      if (first) { fillHud(i); return; }
      const kids = Array.from(hud.children);
      gsap.killTweensOf(kids);
      gsap.timeline()
        .to(kids, { autoAlpha: 0, y: -10, duration: .16, stagger: .02, ease: 'power2.in' })
        .add(() => { fillHud(i); hud.classList.toggle('is-left', i % 2 === 1); })
        .fromTo(kids, { y: 14 }, { autoAlpha: 1, y: 0, duration: .5, stagger: .035, ease: 'power3.out' });
    }
    $('[data-hud-book]').addEventListener('click', () => {
      if (window.AlcovaBooking && active > -1) window.AlcovaBooking.setSuite(D.suites[active].id);
    });

    function measure() {
      const vw = stage.clientWidth;
      const vh = stage.clientHeight;
      G.mobile = vw < 860;
      G.uw = G.mobile ? Math.min(vw * 0.78, 520) : Math.min(vw * 0.36, 600);
      G.uh = G.uw * 0.66;
      G.L = G.mobile ? G.uw * 0.14 : G.uw * 0.62;
      G.D = G.uw * 2.7;
      G.persp = G.mobile ? Math.max(620, vw * 1.5) : Math.max(820, vw * 0.66);
      G.wallX = G.L + G.uw * 1.2;
      G.floorY = G.uh * 0.5 + G.uw * 0.24;
      G.wallH = G.floorY + G.uh * 1.5;
      G.len = G.D * 5.5;
      G.near = G.persp * 0.85;
      G.offY = G.mobile ? -vh * 0.16 : 0;

      viewport.style.perspective = G.persp + 'px';
      world.style.setProperty('--uw', G.uw + 'px');
      world.style.setProperty('--uh', G.uh + 'px');

      units.forEach((u, i) => {
        u.x = (i % 2 ? 1 : -1) * G.L;
        u.z = -i * G.D;
        u.el.style.transform = 'translate3d(' + u.x + 'px,0,' + u.z + 'px)';
      });

      // chão: rotateX(90) faz a altura do elemento correr em direção à câmera
      floor.style.width = G.wallX * 2 + 'px';
      floor.style.height = G.len + 'px';
      floor.style.transform = 'translate3d(' + (-G.wallX) + 'px,' + G.floorY + 'px,' + (G.near - G.len) + 'px) rotateX(90deg)';
      // paredes com as outras garagens
      wallL.style.width = wallR.style.width = G.len + 'px';
      wallL.style.height = wallR.style.height = G.wallH + 'px';
      wallL.style.transform = 'translate3d(' + (-G.wallX) + 'px,' + (G.floorY - G.wallH) + 'px,' + G.near + 'px) rotateY(90deg)';
      wallR.style.transform = 'translate3d(' + G.wallX + 'px,' + (G.floorY - G.wallH) + 'px,' + (G.near - G.len) + 'px) rotateY(-90deg)';
      render();
    }

    // segura um pouco em cada garagem (degraus suaves)
    function stair(x) {
      if (x <= 0 || x >= n - 1) return x;
      return x - 0.86 * Math.sin(2 * Math.PI * x) / (2 * Math.PI);
    }

    function render() {
      if (!G.D) return;
      const x = START + st.p * (END - START);
      const u = stair(x);
      const T = u * G.D;

      const k = Math.floor(u);
      const i0 = Math.max(0, Math.min(n - 1, k));
      const i1 = Math.max(0, Math.min(n - 1, k + 1));
      const f = clamp01(u - k);
      const e = f * f * (3 - 2 * f);
      // a câmera segue reto pela rua e só puxa um pouco para o lado da garagem da vez
      const ux = units[i0].x + (units[i1].x - units[i0].x) * e;
      const yaw = ((units[i1].x - units[i0].x) / (G.L * 2 || 1)) * Math.sin(f * Math.PI) * (G.mobile ? 1.5 : 3);
      const cam = 'translate3d(' + (-ux * 0.28).toFixed(2) + 'px,' + G.offY.toFixed(2) + 'px,0) rotateY(' + yaw.toFixed(3) + 'deg)';
      env.style.transform = cam;
      world.style.transform = cam + ' translateZ(' + T.toFixed(2) + 'px)';

      // texturas do chão e das paredes andam junto com a câmera
      floor.style.backgroundPositionY = T + 'px, 0px, ' + T + 'px, 0px';
      wallL.style.backgroundPositionX = (-T) + 'px, ' + (-T) + 'px, 0px, ' + (-T) + 'px, 0px';
      wallR.style.backgroundPositionX = T + 'px, ' + T + 'px, 0px, ' + T + 'px, 0px';

      units.forEach((un) => {
        const z = T + un.z;
        const ahead = -z;
        const open = clamp01((G.D * 0.92 - ahead) / (G.D * 0.62));
        un.shutter.style.transform = 'translate3d(0,' + (-open * 102).toFixed(2) + '%,0)';
        un.shade.style.opacity = ((1 - open) * 0.6).toFixed(3);
        const far = clamp01(1 - (ahead - G.D * 1.3) / (G.D * 2.2));
        const near = clamp01(1 - (z - G.persp * 0.18) / (G.persp * 0.32));
        const o = Math.min(far, near);
        un.el.style.opacity = o.toFixed(3);
        un.el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      });

      const idx = Math.max(0, Math.min(n - 1, Math.round(u)));
      if (idx !== active) setActive(idx);
      head.style.opacity = clamp01(1 - (x - START) / 0.5).toFixed(3);
      hud.style.opacity = clamp01((x - START - 0.35) / 0.3).toFixed(3);
      hud.style.visibility = x - START < 0.36 ? 'hidden' : 'visible';
      bar.style.transform = 'scaleX(' + st.p.toFixed(4) + ')';
    }

    measure();
    gsap.to(st, {
      p: 1,
      ease: 'none',
      onUpdate: render,
      scrollTrigger: {
        trigger: lane,
        start: 'top top',
        end: () => '+=' + Math.round(window.innerHeight * n * 0.9),
        pin: true,
        scrub: .9,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });
    ScrollTrigger.addEventListener('refreshInit', () => { G.D = 0; });
    ScrollTrigger.addEventListener('refresh', measure);
  }

  // ---------------------------------------------------------------
  // 4. Painel de valores
  // ---------------------------------------------------------------
  function boardScene() {
    const COLS = 20;
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$';
    const board = $('[data-board]');
    const tabsEl = $('[data-board-tabs]');
    const cells = [];

    board.setAttribute('role', 'tabpanel');
    board.removeAttribute('aria-label');
    const sr = document.createElement('p');
    sr.className = 'sr';
    sr.setAttribute('aria-live', 'polite');

    for (let r = 0; r < 6; r++) {
      const row = document.createElement('div');
      row.className = 'board__row' + (r === 0 ? ' board__row--head' : r === 5 ? ' board__row--foot' : '');
      row.setAttribute('aria-hidden', 'true');
      const rc = [];
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('span');
        cell.className = 'cell';
        const ch = document.createElement('span');
        ch.textContent = ' ';
        cell.appendChild(ch);
        row.appendChild(cell);
        rc.push({ el: ch, cur: ' ', tl: null });
      }
      board.appendChild(row);
      cells.push(rc);
    }
    board.appendChild(sr);

    const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    const line = (a, b) => (a + ' '.repeat(Math.max(1, COLS - a.length - b.length)) + b).slice(0, COLS);
    const linesFor = (s) => [
      line('SUITE ' + s.id, plain(s.name)),
      line('2 HORAS', 'R$ ' + s.prices['2h']),
      line('4 HORAS', 'R$ ' + s.prices['4h']),
      line('PERNOITE', 'R$ ' + s.prices.pernoite),
      line('HORA EXTRA', 'R$ ' + s.prices.extra),
      line('NA CASA', s.qty + (s.qty > 1 ? ' SUITES' : ' SUITE'))
    ];

    function flip(cell, target, delay) {
      if (cell.cur === target) return;
      if (cell.tl) cell.tl.kill();
      cell.cur = target;
      if (reduce) { cell.el.textContent = target === ' ' ? ' ' : target; return; }
      const tl = gsap.timeline({ delay });
      const steps = 3 + Math.floor(Math.random() * 6);
      for (let k = 0; k < steps; k++) {
        tl.add(() => { cell.el.textContent = CHARS[Math.floor(Math.random() * CHARS.length)]; });
        tl.fromTo(cell.el, { rotationX: -88 }, { rotationX: 0, duration: .05, ease: 'none' });
      }
      tl.add(() => { cell.el.textContent = target === ' ' ? ' ' : target; });
      tl.fromTo(cell.el, { rotationX: -88 }, { rotationX: 0, duration: .14, ease: 'back.out(2.4)' });
      cell.tl = tl;
    }

    tabsEl.innerHTML = D.suites.map((s, i) =>
      '<button class="tab" type="button" role="tab" id="tab-' + s.id + '" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '">' +
      '<b>' + s.id + '</b>' + s.name + '</button>'
    ).join('');
    const tabs = $$('.tab', tabsEl);

    function show(i) {
      const s = D.suites[i];
      linesFor(s).forEach((ln, r) => ln.split('').forEach((ch, c) => flip(cells[r][c], ch, r * .05 + c * .022)));
      tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      board.setAttribute('aria-labelledby', 'tab-' + s.id);
      sr.textContent = 'Suíte ' + s.id + ' ' + s.name + ': 2 horas ' + money(s.prices['2h']) + ', 4 horas ' + money(s.prices['4h']) +
        ', pernoite ' + money(s.prices.pernoite) + ', hora extra ' + money(s.prices.extra) + '. ' + s.qty + ' suítes deste tipo.';
    }
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(i));
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        tabs[j].focus();
        show(j);
      });
    });

    if (reduce) show(0);
    else ScrollTrigger.create({ trigger: board, start: 'top 82%', once: true, onEnter: () => show(0) });
  }

  // ---------------------------------------------------------------
  // Seções que entram com a câmera inclinando
  // ---------------------------------------------------------------
  function tiltScene() {
    if (reduce) return;
    $$('.tilt').forEach((el) => {
      gsap.fromTo(el, { rotationX: 9, y: 90, scale: .95, transformOrigin: '50% 0%' }, {
        rotationX: 0, y: 0, scale: 1, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'top 25%', scrub: true }
      });
    });
  }

  // ---------------------------------------------------------------
  // 5. Por dentro: rolagem horizontal
  // ---------------------------------------------------------------
  function insideScene() {
    const section = $('.inside');
    if (reduce) { section.classList.add('is-static'); return; }
    const pin = $('.inside__pin');
    const track = $('[data-inside-track]');
    const bar = $('[data-inside-bar]');
    const dist = () => Math.max(0, track.scrollWidth - pin.clientWidth);

    const move = gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => '+=' + dist(),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (s) => { bar.style.transform = 'scaleX(' + s.progress.toFixed(4) + ')'; }
      }
    });

    $$('.card', track).forEach((card) => {
      gsap.fromTo($('img', card), { xPercent: -7 }, {
        xPercent: 7, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: move, start: 'left right', end: 'right left', scrub: true }
      });
      gsap.fromTo(card, { rotationY: -10, transformPerspective: 1200 }, {
        rotationY: 0, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: move, start: 'left right', end: 'center 60%', scrub: true }
      });
      gsap.from($('figcaption', card), {
        y: 30, autoAlpha: 0, duration: .9, ease: 'power3.out',
        scrollTrigger: { trigger: card, containerAnimation: move, start: 'left 78%' }
      });
    });
    gsap.from('.inside__end p', {
      xPercent: 18, autoAlpha: 0, ease: 'none',
      scrollTrigger: { trigger: '.inside__end', containerAnimation: move, start: 'left right', end: 'center 70%', scrub: true }
    });
  }

  // ---------------------------------------------------------------
  // 6. Discrição
  // ---------------------------------------------------------------
  function storyScene() {
    const steps = $$('.step');
    const imgs = $$('.story__img');
    const num = $('[data-story-num]');
    let current = 0;
    steps[0].classList.add('is-active');

    function go(i) {
      if (i === current) return;
      const down = i > current;
      const prev = imgs[current];
      const next = imgs[i];
      imgs.forEach((im) => { if (im !== prev && im !== next) { gsap.killTweensOf(im); im.style.zIndex = 1; im.classList.remove('is-on'); gsap.set(im, { clipPath: 'inset(100% 0% 0% 0%)' }); } });
      gsap.killTweensOf([prev, next, $('img', next)]);
      prev.style.zIndex = 2;
      next.style.zIndex = 3;
      next.classList.add('is-on');
      gsap.fromTo(next, { clipPath: down ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: reduce ? 0 : 1.1, ease: 'expo.inOut',
        onComplete: () => { prev.classList.remove('is-on'); gsap.set(prev, { clipPath: 'inset(100% 0% 0% 0%)' }); }
      });
      if (!reduce) gsap.fromTo($('img', next), { scale: 1.22 }, { scale: 1, duration: 1.5, ease: 'expo.out' });
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
      num.textContent = pad2(i + 1);
      current = i;
    }

    steps.forEach((s, i) => ScrollTrigger.create({
      trigger: s, start: 'top 45%', end: 'bottom 45%',
      onToggle: (self) => { if (self.isActive) go(i); }
    }));
  }

  // ---------------------------------------------------------------
  // Rodapé: letreiro acende quando aparece
  // ---------------------------------------------------------------
  function footScene() {
    const neon = $('[data-neon-foot]');
    if (reduce) { neon.classList.add('is-on'); return; }
    ScrollTrigger.create({ trigger: '.foot', start: 'top 70%', once: true, onEnter: () => flickerOn(neon) });
  }

  // Link ativo na navegação
  function navScene() {
    $$('.nav__links a').forEach((a) => {
      const sec = $(a.getAttribute('href'));
      if (!sec) return;
      ScrollTrigger.create({
        trigger: sec, start: 'top 50%', end: 'bottom 50%',
        onToggle: (s) => a.classList.toggle('is-current', s.isActive)
      });
    });
  }

  // ---------------------------------------------------------------
  // Entrada: contador, fontes e a foto principal
  // ---------------------------------------------------------------
  function heroImageReady() {
    const img = $('.hero__room img');
    if (!img || (img.complete && img.naturalWidth)) return Promise.resolve();
    return new Promise((res) => {
      img.addEventListener('load', res, { once: true });
      img.addEventListener('error', res, { once: true });
    });
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

  function buildScenes() {
    heroScene();
    manifestoScene();
    tickerScene();
    laneScene();
    boardScene();
    tiltScene();
    insideScene();
    storyScene();
    footScene();
    navScene();
    ScrollTrigger.refresh();
  }

  function lightSign() {
    const facade = $('.hero__facade');
    flickerOn($('[data-neon]'), (on) => facade.classList.toggle('is-lit', on));
  }

  const loader = $('.loader');
  if (reduce) {
    loader.remove();
    fontsReady.then(() => {
      buildScenes();
      $('[data-neon]').classList.add('is-on');
      $('.hero__facade').classList.add('is-lit');
    });
    return;
  }

  if (lenis) lenis.stop();
  nav.classList.add('is-hidden');
  window.scrollTo(0, 0);
  const counter = $('[data-count]', loader);
  const count = { v: 0 };
  const intro = gsap.timeline()
    .to(count, { v: 100, duration: 1.5, ease: 'power2.inOut', onUpdate: () => { counter.textContent = String(Math.round(count.v)).padStart(3, '0'); } }, 0)
    .to('.loader__line span', { scaleX: 1, duration: 1.5, ease: 'power2.inOut' }, 0);

  Promise.all([
    Promise.race([Promise.all([fontsReady, heroImageReady()]), wait(3200)]),
    new Promise((r) => intro.eventCallback('onComplete', r))
  ]).then(() => {
    buildScenes();
    gsap.timeline()
      .to(loader, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut' })
      .from('.hero__facade', { scale: 1.08, duration: 1.6, ease: 'expo.out' }, .25)
      .add(() => nav.classList.remove('is-hidden'), .5)
      .add(lightSign, .55)
      .add(() => {
        loader.remove();
        if (lenis) lenis.start();
        if (location.hash.length > 1) {
          const t = $(location.hash);
          if (t) scrollToTarget(t);
        }
      });
  });
})();
