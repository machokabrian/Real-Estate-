/* Property page: refreshes the page with live data, gallery + lightbox,
   agent chooser (WhatsApp / call), calculator and similar listings.
   The server-built page already contains everything for Google; this adds the live parts.
   The same file powers /listing (the fallback for listings added since the last deploy). */
(async function (g) {
  'use strict';
  const LN = g.LN, doc = document;
  const $ = (s, r) => (r || doc).querySelector(s);
  const root = $('#listing-root');
  if (!root) return;

  const slug = doc.body.getAttribute('data-slug') || decodeURIComponent(location.pathname.replace(/\/+$/, '').split('/').pop() || '');

  function notFound() {
    root.innerHTML = '<div class="notfound"><h1>This property is no longer listed</h1><p>It may have been sold or let. See what’s available now, or ask us – we often know about new properties before they’re listed.</p><p><a class="btn btn-gold" href="/#properties">View current listings</a></p></div>';
    doc.title = 'Property not found – Lemways Nest';
  }

  let data;
  try { data = await LN.db.load(); }
  catch (e) { if (!$('.prop', root)) root.innerHTML = '<div class="notfound"><h1>We couldn’t load this property</h1><p>Please refresh the page, or call us and we’ll help directly.</p></div>'; return; }
  g.__LN_DATA__ = data;
  const site = LN.siteSettings(data);
  LN.bindSite(site);

  const l = data.listings.find((x) => x.slug === slug);
  if (!l) { notFound(); return; }

  /* if the listing changed since this page was built (or this is the fallback page), redraw it */
  const built = $('.prop', root);
  if (!built || built.getAttribute('data-sig') !== LN.sig(l)) {
    root.innerHTML = LN.propertyHTML(l, { site, data });
    doc.title = l.title + ' – ' + (l.location || 'Nairobi') + ' | Lemways Nest';
  }
  if (LN.track) LN.track('view_listing', { id: l.id, code: l.code });

  /* ---------- agent chooser ---------- */
  const box = $('#agent-box');
  const agents = data.team.length ? data.team : null;
  function renderAgent(a) {
    const msg = 'Hello ' + a.name + ', I am interested in ' + l.title + (l.code ? ' (' + l.code + ')' : '') + ' – ' + LN.priceText(l) + '.\n' + location.href.split('#')[0];
    const wa = LN.waLink(a.whatsapp, msg);
    const tel = a.phone ? '+' + LN.normKE(a.phone) : '';
    box.innerHTML =
      (agents && agents.length > 1 ? '<label class="agent-pick">Choose an agent<select id="agent-sel">' + agents.map((t) => '<option value="' + LN.esc(t.id) + '"' + (t.id === a.id ? ' selected' : '') + '>' + LN.esc(t.name) + '</option>').join('') + '</select></label>' : '') +
      '<p class="agent-name">' + (a.id ? 'Your agent: <b>' + LN.esc(a.name) + '</b>' + (a.role ? ' · ' + LN.esc(a.role) : '') : 'Enquire about this property') + '</p>' +
      '<div class="agent-actions">' +
      (wa ? '<a class="btn btn-wa" data-track="whatsapp_click" href="' + LN.esc(wa) + '" target="_blank" rel="noopener">Chat on WhatsApp</a>' : '') +
      (tel ? '<a class="btn btn-ghost" data-track="call_click" href="tel:' + tel + '">Call ' + LN.esc(a.phone) + '</a>' : '') + '</div>' +
      (a.id ? '<p class="fine">You’ll be connected to ' + LN.esc(a.name) + ', who knows this property well.</p>' : '');
    const sel = $('#agent-sel');
    if (sel) sel.addEventListener('change', () => renderAgent(agents.find((t) => t.id === sel.value) || a));
  }
  if (box) renderAgent(LN.agentFor(data, l, site));

  /* ---------- calculator ---------- */
  LN.mountCalculator($('#calc'), l);

  /* ---------- gallery + lightbox ---------- */
  const thumbs = Array.prototype.slice.call(doc.querySelectorAll('.gal-thumb'));
  const main = $('.gal-main[data-lightbox]');
  const full = thumbs.length ? thumbs.map((t) => t.getAttribute('data-full')) : (main ? [main.getAttribute('data-full')] : []);
  let cur = 0, lb;
  function show(i) {
    cur = (i + full.length) % full.length;
    const t = thumbs[cur], img = $('#gal-img');
    if (t && img) { img.src = t.getAttribute('data-mid'); thumbs.forEach((x, k) => x.classList.toggle('on', k === cur)); }
  }
  thumbs.forEach((t, i) => t.addEventListener('click', () => show(i)));
  function lbShow() { $('.lb-img', lb).src = full[cur]; $('.lb-count', lb).textContent = (cur + 1) + ' / ' + full.length; }
  function openLB() {
    if (!full.length) return;
    lb = doc.createElement('div'); lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML = '<button class="lb-x" type="button" aria-label="Close">×</button>' +
      (full.length > 1 ? '<button class="lb-nav lb-prev" type="button" aria-label="Previous">‹</button><button class="lb-nav lb-next" type="button" aria-label="Next">›</button>' : '') +
      '<img class="lb-img" alt=""><span class="lb-count"></span>';
    doc.body.appendChild(lb); doc.body.classList.add('noscroll');
    const close = () => { lb.remove(); doc.body.classList.remove('noscroll'); doc.removeEventListener('keydown', key); };
    const step = (d) => { show(cur + d); lbShow(); };
    const key = (e) => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight' && full.length > 1) step(1); else if (e.key === 'ArrowLeft' && full.length > 1) step(-1); };
    lb.addEventListener('click', (e) => {
      if (e.target.closest('.lb-x') || e.target === lb) close();
      else if (e.target.closest('.lb-next')) step(1);
      else if (e.target.closest('.lb-prev')) step(-1);
    });
    let x0 = null;
    lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => { if (x0 == null || full.length < 2) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); x0 = null; });
    doc.addEventListener('keydown', key);
    lbShow();
  }
  if (main) main.addEventListener('click', openLB);

  /* ---------- similar listings ---------- */
  const sim = data.listings.filter((x) => x.id !== l.id)
    .map((x) => ({ x, s: (x.status === l.status ? 2 : 0) + (x.category === l.category ? 2 : 0) + (x.location && x.location === l.location ? 3 : 0) }))
    .sort((a, b) => b.s - a.s).slice(0, 3).map((o) => o.x);
  if (sim.length) {
    $('#similar').hidden = false;
    $('#similar-grid').innerHTML = sim.map(LN.cardHTML).join('');
  }
  LN.syncFavs();
  LN.reveal();
})(globalThis);
