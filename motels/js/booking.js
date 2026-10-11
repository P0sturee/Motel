/*
  Reserva: suíte, dia, permanência, horário, quantidade, extras e contato.
  A disponibilidade abaixo é simulada (determinística por dia/horário) para o
  site funcionar sozinho. Para ligar ao sistema real, troque `freeCount`.
*/
(function () {
  'use strict';

  const D = window.ALCOVA;
  const form = document.querySelector('[data-form]');
  if (!D || !form) return;

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  // ---------- datas ----------
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const hhmm = (m) => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const fmtDay = (d) => d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
  const fmtDayLong = (d) => d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
  const money = (v) => 'R$ ' + v.toLocaleString('pt-BR');

  const today = startOfDay(new Date());
  const lastDay = addDays(today, D.bookAheadDays);

  // ---------- estado ----------
  const state = {
    suite: D.suites[0],
    date: null,
    period: '2h',
    time: null,
    qty: 1,
    extras: new Set()
  };

  // ---------- disponibilidade simulada ----------
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function freeCount(suite, date, minutes) {
    if (!date || minutes == null) return suite.qty;
    const dow = date.getDay();
    const night = minutes >= 19 * 60 || minutes < 3 * 60;
    const weekendNight = (dow === 5 || dow === 6) && night;
    const busy = weekendNight ? 0.72 : night ? 0.48 : 0.26;
    const r = (hash(suite.id + iso(date) + minutes) % 1000) / 1000;
    const occupied = Math.round(suite.qty * busy * (0.55 + r * 0.75));
    return Math.max(0, Math.min(suite.qty, suite.qty - occupied));
  }
  const free = () => freeCount(state.suite, state.date, state.time);
  const level = (n, total) => (n === 0 ? 'is-none' : n <= Math.max(1, Math.round(total * 0.25)) ? 'is-low' : '');

  // ---------- elementos ----------
  const pick = $('[data-suite-pick]');
  const calMonth = $('[data-cal-month]');
  const calDays = $('[data-cal-days]');
  const calPrev = $('[data-cal-prev]');
  const calNext = $('[data-cal-next]');
  const timeSel = $('[data-time]');
  const outEl = $('[data-out] b');
  const qtyVal = $('[data-qty]');
  const qtyMinus = $('[data-qty-minus]');
  const qtyPlus = $('[data-qty-plus]');
  const availEl = $('[data-avail]');
  const extrasEl = $('[data-extras]');
  const nameIn = form.elements.name;
  const phoneIn = form.elements.phone;
  const body = $('[data-ticket-body]');
  const done = $('[data-done]');
  const fob = $('[data-fob]');
  const submitBtn = $('[data-submit]');
  const sum = (k) => $('[data-sum="' + k + '"]');
  const err = (k) => $('[data-err="' + k + '"]');

  // ---------- suítes ----------
  pick.innerHTML = D.suites.map((s, i) =>
    '<label class="suite-opt" data-id="' + s.id + '">' +
      '<input type="radio" name="suite" value="' + s.id + '"' + (i === 0 ? ' checked' : '') + '>' +
      '<span class="suite-opt__num">' + s.id + '</span>' +
      '<span class="suite-opt__name">' + s.name + '</span>' +
      '<span class="suite-opt__meta" data-meta></span>' +
    '</label>'
  ).join('');

  function renderSuiteMeta() {
    $$('.suite-opt', pick).forEach((el) => {
      const s = D.suites.find((x) => x.id === el.dataset.id);
      const meta = $('[data-meta]', el);
      const checked = s === state.suite;
      el.classList.toggle('is-checked', checked);
      if (state.date && state.time != null) {
        const n = freeCount(s, state.date, state.time);
        el.classList.toggle('is-full', n === 0);
        meta.innerHTML = '<i class="' + level(n, s.qty) + '"></i>' + (n === 0 ? 'cheia nesse horário' : n + (n === 1 ? ' livre' : ' livres') + ' · ' + money(s.prices[state.period]));
      } else {
        el.classList.remove('is-full');
        meta.textContent = 'a partir de ' + money(s.prices['2h']);
      }
    });
  }

  pick.addEventListener('change', (e) => {
    if (e.target.name !== 'suite') return;
    setSuite(e.target.value, { swing: true });
  });

  function setSuite(id, opts) {
    const s = D.suites.find((x) => x.id === id);
    if (!s) return;
    const prev = state.suite;
    state.suite = s;
    const radio = $('input[value="' + id + '"]', pick);
    if (radio) radio.checked = true;
    update();
    if (opts && opts.swing && prev !== s) swing(D.suites.indexOf(s) > D.suites.indexOf(prev) ? 1 : -1);
  }

  // ---------- calendário ----------
  let view = new Date(today.getFullYear(), today.getMonth(), 1);

  function renderCal() {
    const label = view.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    calMonth.textContent = label;
    calPrev.disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
    calNext.disabled = new Date(view.getFullYear(), view.getMonth() + 1, 1) > lastDay;

    const first = view.getDay();
    const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    let html = '';
    for (let i = 0; i < first; i++) html += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const date = new Date(view.getFullYear(), view.getMonth(), d);
      const off = date < today || date > lastDay;
      const sel = sameDay(date, state.date);
      const label = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
      html += '<button type="button" class="cal__day' + (sameDay(date, today) ? ' is-today' : '') + '"' +
        ' data-date="' + iso(date) + '" aria-pressed="' + sel + '" aria-label="' + label + '"' +
        (off ? ' disabled' : '') + '>' + d + '</button>';
    }
    calDays.innerHTML = html;
  }

  calPrev.addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderCal(); });
  calNext.addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderCal(); });
  calDays.addEventListener('click', (e) => {
    const b = e.target.closest('.cal__day');
    if (!b || b.disabled) return;
    const [y, m, d] = b.dataset.date.split('-').map(Number);
    state.date = new Date(y, m - 1, d);
    err('date').textContent = '';
    renderCal();
    update();
    const again = $('[data-date="' + b.dataset.date + '"]', calDays);
    if (again) again.focus();
  });

  // ---------- permanência e horário ----------
  $$('input[name="period"]', form).forEach((r) => r.addEventListener('change', () => {
    state.period = r.value;
    if (state.period !== 'pernoite') state.extras.delete('cafe');
    update();
  }));

  function validTimes() {
    if (!state.date) return [];
    const isToday = sameDay(state.date, today);
    const now = new Date();
    const minNow = now.getHours() * 60 + now.getMinutes() + 30;
    const out = [];
    for (let m = 0; m < 1440; m += 30) {
      if (state.period === 'pernoite' && (m < D.pernoite.from || m > D.pernoite.to)) continue;
      if (isToday && m < minNow) continue;
      out.push(m);
    }
    return out;
  }

  function renderTimes() {
    const list = validTimes();
    timeSel.innerHTML = '';
    if (!state.date) {
      timeSel.disabled = true;
      timeSel.add(new Option('escolha o dia antes', ''));
      state.time = null;
      return;
    }
    if (!list.length) {
      timeSel.disabled = true;
      timeSel.add(new Option(state.period === 'pernoite' ? 'pernoite encerrado hoje' : 'sem horários hoje', ''));
      state.time = null;
      return;
    }
    timeSel.disabled = false;
    list.forEach((m) => timeSel.add(new Option(hhmm(m), String(m))));
    if (state.time == null || list.indexOf(state.time) === -1) {
      const pref = state.period === 'pernoite' ? 22 * 60 : 21 * 60;
      state.time = list.indexOf(pref) !== -1 ? pref : list[0];
    }
    timeSel.value = String(state.time);
  }

  timeSel.addEventListener('change', () => {
    state.time = timeSel.value === '' ? null : Number(timeSel.value);
    err('time').textContent = '';
    update();
  });

  function checkout() {
    if (!state.date || state.time == null) return null;
    if (state.period === 'pernoite') return { m: D.pernoite.checkout, next: true };
    const hours = state.period === '4h' ? 4 : 2;
    const end = state.time + hours * 60;
    return { m: end % 1440, next: end >= 1440 };
  }
  function checkoutLabel(empty) {
    const c = checkout();
    if (!c) return empty || '--:--';
    if (!c.next) return hhmm(c.m);
    return hhmm(c.m) + ' de ' + addDays(state.date, 1).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  }

  // ---------- quantidade ----------
  function maxQty() { return Math.max(1, Math.min(D.maxPerBooking, free())); }
  qtyMinus.addEventListener('click', () => { state.qty = Math.max(1, state.qty - 1); update(); });
  qtyPlus.addEventListener('click', () => { state.qty = Math.min(maxQty(), state.qty + 1); update(); });

  // ---------- extras ----------
  extrasEl.innerHTML = D.extras.map((x) =>
    '<label class="extra"><input type="checkbox" name="extra" value="' + x.id + '">' +
    '<span>' + x.label + (x.onlyPernoite ? '<small>só no pernoite</small>' : '') + '</span>' +
    '<b>+ ' + money(x.price) + '</b></label>'
  ).join('');
  extrasEl.addEventListener('change', (e) => {
    if (e.target.name !== 'extra') return;
    if (e.target.checked) state.extras.add(e.target.value); else state.extras.delete(e.target.value);
    update();
  });

  // ---------- contato ----------
  phoneIn.addEventListener('input', () => {
    const d = phoneIn.value.replace(/\D/g, '').slice(0, 11);
    let v = d;
    if (d.length > 2) v = '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length > 7 && d.length === 11) v = '(' + d.slice(0, 2) + ') ' + d.slice(2, 3) + ' ' + d.slice(3, 7) + '-' + d.slice(7);
    else if (d.length > 6) v = '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    phoneIn.value = v;
    phoneIn.removeAttribute('aria-invalid');
  });
  nameIn.addEventListener('input', () => nameIn.removeAttribute('aria-invalid'));

  // ---------- resumo ----------
  function total() {
    const base = state.suite.prices[state.period];
    const extras = D.extras.filter((x) => state.extras.has(x.id)).reduce((a, x) => a + x.price, 0);
    return (base + extras) * state.qty;
  }

  function update() {
    // mexeu em algo depois de confirmar: o código antigo deixa de valer
    if (!done.hidden) {
      done.hidden = true;
      body.hidden = false;
      if (window.gsap) gsap.set(body, { clearProps: 'all' });
    }
    renderTimes();

    const n = free();
    const mq = maxQty();
    if (state.qty > mq) state.qty = mq;
    qtyVal.textContent = state.qty;
    qtyMinus.disabled = state.qty <= 1;
    qtyPlus.disabled = state.qty >= mq;

    if (state.date && state.time != null) {
      availEl.innerHTML = '<i class="' + level(n, state.suite.qty) + '"></i>' +
        (n === 0
          ? state.suite.name + ' cheia nesse horário'
          : n + ' ' + state.suite.name + (n === 1 ? ' livre' : ' livres') + ' às ' + hhmm(state.time));
    } else {
      availEl.innerHTML = '<i></i>' + state.suite.qty + ' suítes ' + state.suite.name + ' na casa';
    }

    $$('input[name="extra"]', extrasEl).forEach((cb) => {
      const x = D.extras.find((e) => e.id === cb.value);
      const blocked = x.onlyPernoite && state.period !== 'pernoite';
      cb.disabled = blocked;
      if (blocked) { cb.checked = false; state.extras.delete(x.id); }
      cb.checked = state.extras.has(x.id);
    });

    outEl.textContent = checkoutLabel('\u2013');
    renderSuiteMeta();

    sum('suite').textContent = state.suite.id + ' ' + state.suite.name;
    sum('date').textContent = state.date ? fmtDay(state.date) : 'escolha no calendário';
    sum('time').textContent = state.time != null ? hhmm(state.time) + ' · ' + D.periods.find((p) => p.id === state.period).label.toLowerCase() : '--:--';
    sum('out').textContent = checkoutLabel();
    sum('qty').textContent = state.qty + (state.qty === 1 ? ' suíte' : ' suítes');
    const ex = D.extras.filter((x) => state.extras.has(x.id)).map((x) => x.label.split(' ')[0]);
    sum('extras').textContent = ex.length ? ex.join(', ') : 'nenhum';
    sum('total').textContent = money(total());

    $('[data-fob-num]', fob).textContent = state.suite.id;
    $('[data-fob-name]', fob).textContent = state.suite.name.toUpperCase();

    submitBtn.disabled = !!(state.date && state.time != null && n === 0);
  }

  // ---------- chaveiro ----------
  function swing(dir) {
    if (!window.gsap || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.killTweensOf(fob);
    gsap.fromTo(fob, { rotation: 16 * (dir || 1) }, {
      rotation: 0, duration: 2.2, ease: 'elastic.out(1, 0.22)', transformOrigin: '50% 14.8%'
    });
  }

  // ---------- envio ----------
  function code() {
    const h = hash(state.suite.id + (state.date ? iso(state.date) : '') + state.time + nameIn.value + Date.now());
    return 'ALC-' + h.toString(36).toUpperCase().slice(-4).padStart(4, '7');
  }

  function validate() {
    let first = null;
    const mark = (k, msg, el) => { err(k).textContent = msg; if (!first) first = el; };
    ['date', 'time', 'contact'].forEach((k) => (err(k).textContent = ''));
    nameIn.removeAttribute('aria-invalid');
    phoneIn.removeAttribute('aria-invalid');

    if (!state.date) mark('date', 'Escolha o dia no calendário.', calDays.querySelector('button:not(:disabled)'));
    else if (state.time == null) mark('time', 'Não há horários livres nesse dia para essa permanência. Tente outro dia.', timeSel);
    else if (free() === 0) mark('time', 'Essa suíte está cheia nesse horário. Tente outro horário ou outra suíte.', timeSel);

    const contact = [];
    if (nameIn.value.trim().length < 2) { contact.push('diga como podemos chamar você'); nameIn.setAttribute('aria-invalid', 'true'); if (!first) first = nameIn; }
    const digits = phoneIn.value.replace(/\D/g, '');
    if (digits.length < 10) { contact.push('confira o WhatsApp com DDD'); phoneIn.setAttribute('aria-invalid', 'true'); if (!first) first = phoneIn; }
    if (contact.length) {
      const msg = contact.join(' e ');
      err('contact').textContent = msg.charAt(0).toUpperCase() + msg.slice(1) + '.';
    }
    return first;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const bad = validate();
    if (bad) {
      const target = bad.closest('.field') || bad;
      if (window.__lenis) window.__lenis.scrollTo(target, { offset: -100, duration: 1 });
      else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => bad.focus && bad.focus({ preventScroll: true }), 500);
      return;
    }
    confirm();
  });

  function confirm() {
    const c = code();
    const per = D.periods.find((p) => p.id === state.period).label.toLowerCase();
    const extras = D.extras.filter((x) => state.extras.has(x.id)).map((x) => x.label);
    const lines = [
      'Olá! Quero confirmar a reserva ' + c + '.',
      'Suíte ' + state.suite.id + ' ' + state.suite.name + ' × ' + state.qty,
      'Dia: ' + fmtDayLong(state.date),
      'Chegada: ' + hhmm(state.time) + ' (' + per + ', saída até ' + checkoutLabel() + ')',
      extras.length ? 'Extras: ' + extras.join(', ') : '',
      'Total estimado: ' + money(total()),
      'Nome: ' + nameIn.value.trim()
    ].filter(Boolean);

    $('[data-done-code]').textContent = c;
    $('[data-done-txt]').textContent =
      state.qty + (state.qty === 1 ? ' suíte ' : ' suítes ') + state.suite.name + ', ' + fmtDay(state.date) + ' às ' + hhmm(state.time) + '.\n' +
      'Mande o código pelo WhatsApp para a portaria acender o seu número.';
    $('[data-done-wa]').href = 'https://wa.me/' + D.whatsapp + '?text=' + encodeURIComponent(lines.join('\n'));

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!window.gsap || reduce) {
      body.hidden = true; done.hidden = false;
      return;
    }
    gsap.timeline()
      .to(fob, { rotation: -10, y: -8, duration: .25, ease: 'power2.out', transformOrigin: '50% 14.8%' })
      .to(fob, { rotation: 0, y: 0, duration: 1.6, ease: 'elastic.out(1, 0.25)' })
      .to(body, { autoAlpha: 0, y: 16, duration: .35, ease: 'power2.in' }, 0.1)
      .add(() => {
        body.hidden = true;
        done.hidden = false;
        gsap.fromTo(done.children, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, stagger: .07, duration: .6, ease: 'power3.out' });
      }, 0.45);
  }

  $('[data-done-reset]').addEventListener('click', () => {
    done.hidden = true;
    body.hidden = false;
    if (window.gsap) gsap.set(body, { clearProps: 'all' });
    form.reset();
    state.suite = D.suites[0];
    state.date = null; state.time = null; state.period = '2h'; state.qty = 1; state.extras.clear();
    renderCal();
    update();
    swing(-1);
  });

  // ---------- início ----------
  renderCal();
  update();

  window.AlcovaBooking = {
    setSuite: (id) => setSuite(id, { swing: true })
  };
})();
