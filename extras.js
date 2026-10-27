/* Small features shared by every page: mobile menu, saved properties (♥),
   share button, back-to-top, scroll reveal, and the mortgage / move-in calculator. */
(function (g) {
  'use strict';
  const LN = g.LN, doc = document;

  /* safe localStorage */
  LN.store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };

  /* saved properties */
  LN.fav = {
    list() { const l = LN.store.get('ln_fav', []); return Array.isArray(l) ? l : []; },
    has(id) { return this.list().indexOf(id) > -1; },
    toggle(id) {
      const l = this.list(), i = l.indexOf(id);
      if (i > -1) l.splice(i, 1); else l.push(id);
      LN.store.set('ln_fav', l);
      return i === -1;
    }
  };
  LN.syncFavs = function () {
    doc.querySelectorAll('[data-fav]').forEach((b) => {
      const on = LN.fav.has(b.getAttribute('data-fav'));
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('on', on);
    });
  };
  doc.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fav]');
    if (!b) return;
    e.preventDefault();
    const id = b.getAttribute('data-fav');
    const on = LN.fav.toggle(id);
    LN.syncFavs();
    if (LN.track) LN.track(on ? 'save_listing' : 'unsave_listing', { id });
    doc.dispatchEvent(new CustomEvent('ln:fav'));
  });

  /* share */
  doc.addEventListener('click', (e) => {
    const b = e.target.closest('[data-share]');
    if (!b) return;
    const title = b.getAttribute('data-title') || doc.title, url = location.href.split('#')[0];
    if (navigator.share) { navigator.share({ title, url }).catch(() => {}); return; }
    window.open('https://wa.me/?text=' + encodeURIComponent(title + ' – ' + url), '_blank', 'noopener');
  });

  /* mobile menu */
  const btn = doc.querySelector('.nav-toggle'), nav = doc.querySelector('.site-nav');
  if (btn && nav) {
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* header shadow + back to top */
  const header = doc.querySelector('.site-header');
  const top = doc.createElement('button');
  top.className = 'to-top'; top.type = 'button'; top.setAttribute('aria-label', 'Back to top'); top.innerHTML = '↑';
  top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  doc.body.appendChild(top);
  const onScroll = () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 8);
    top.classList.toggle('show', window.scrollY > 700);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* year in the footer */
  doc.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* scroll reveal (call LN.reveal() again after injecting new content) */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12 }) : null;
  LN.reveal = function (root) {
    (root || doc).querySelectorAll('[data-reveal]:not(.in)').forEach((el) => { if (io) io.observe(el); else el.classList.add('in'); });
  };
  LN.reveal();

  /* calculator */
  LN.mountCalculator = function (el, l) {
    if (!el || !l || !l.price) return;
    const cur = (g.LN_CONFIG && g.LN_CONFIG.currency) || 'KES';
    const money = (n) => cur + ' ' + LN.num(Math.round(n));
    if (l.status === 'sale') {
      el.innerHTML = '<h2>Mortgage estimate</h2><div class="calc-grid">' +
        '<label>Deposit (%)<input id="c-dep" type="number" inputmode="decimal" value="20" min="0" max="90"></label>' +
        '<label>Interest rate (% a year)<input id="c-rate" type="number" inputmode="decimal" value="13" min="0" step="0.1"></label>' +
        '<label>Term (years)<input id="c-yrs" type="number" inputmode="numeric" value="20" min="1" max="30"></label></div>' +
        '<p class="calc-out">Estimated monthly repayment <strong id="c-out"></strong></p>' +
        '<p class="fine">An illustration only – the rate is an assumption, so check current terms with your bank.</p>';
      const calc = () => {
        const dep = Math.min(Math.max(+el.querySelector('#c-dep').value || 0, 0), 90) / 100;
        const r = Math.max(+el.querySelector('#c-rate').value || 0, 0) / 1200;
        const n = Math.max(Math.round(+el.querySelector('#c-yrs').value || 1), 1) * 12;
        const P = l.price * (1 - dep);
        const pay = r ? (P * r) / (1 - Math.pow(1 + r, -n)) : P / n;
        el.querySelector('#c-out').textContent = money(pay) + ' / month';
      };
      el.addEventListener('input', calc); calc();
    } else {
      el.innerHTML = '<h2>Move-in estimate</h2><div class="calc-grid">' +
        '<label>Deposit (months of rent)<input id="c-dep" type="number" inputmode="numeric" value="2" min="0" max="12"></label></div>' +
        '<p class="calc-out">Estimated cost to move in <strong id="c-out"></strong></p>' +
        '<p class="fine">First month plus deposit. Deposit and any agency fees are agreed in the lease – ask us for the exact figures.</p>';
      const calc = () => {
        const m = Math.min(Math.max(Math.round(+el.querySelector('#c-dep').value || 0), 0), 12);
        el.querySelector('#c-out').textContent = money(l.price * (1 + m));
      };
      el.addEventListener('input', calc); calc();
    }
  };
})(globalThis);
