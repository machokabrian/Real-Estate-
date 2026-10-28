/* Home page: listings grid + filters, team, reviews, contact form. */
(async function (g) {
  'use strict';
  const LN = g.LN, doc = document;
  const $ = (s) => doc.querySelector(s);
  const grid = $('#grid'), empty = $('#empty');

  let data;
  try { data = await LN.db.load(); }
  catch (e) {
    grid.innerHTML = '';
    empty.hidden = false;
    empty.textContent = 'We couldn’t load the listings just now. Please refresh, or call us and we’ll help directly.';
    return;
  }
  g.__LN_DATA__ = data;
  const site = LN.siteSettings(data);
  LN.bindSite(site);

  /* optional photos set in the admin panel */
  if (site.heroImage) {
    const art = $('#hero-art');
    art.classList.add('has-photo');
    art.style.backgroundImage = 'url("' + LN.imgUrl(site.heroImage, 1000).replace(/"/g, '%22') + '")';
    art.innerHTML = '';
  }
  if (site.aboutImage) {
    const im = $('#about-img');
    im.src = LN.imgUrl(site.aboutImage, 900); im.hidden = false;
  }
  $('#stat-count').textContent = data.listings.length;
  const omap = $('#office-map'), oq = (site.address || '') + (/nairobi/i.test(site.address || '') ? '' : ', Nairobi, Kenya');
  if (omap && site.address) omap.src = LN.mapEmbed(oq, 15);
  const dir = $('[data-href="{mapUrl}"]'); if (dir && !site.mapUrl && site.address) { dir.href = LN.mapLink(oq); dir.hidden = false; }

  /* ---------- listings ---------- */
  const state = { cat: 'all', status: 'all', q: '' };
  function render() {
    const saved = LN.fav.list();
    const q = state.q.trim().toLowerCase();
    const items = data.listings.filter((l) => {
      if (state.cat === 'saved' && saved.indexOf(l.id) === -1) return false;
      if (state.cat !== 'all' && state.cat !== 'saved' && l.category !== state.cat) return false;
      if (state.status !== 'all' && l.status !== state.status) return false;
      if (q && (l.title + ' ' + l.location + ' ' + (l.propertyType || '') + ' ' + (l.code || '')).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    grid.innerHTML = items.map(LN.cardHTML).join('');
    LN.syncFavs();
    LN.reveal(grid);
    $('#saved-n').textContent = saved.filter((id) => data.listings.some((l) => l.id === id)).length;
    if (items.length) { empty.hidden = true; return; }
    empty.hidden = false;
    empty.textContent = !data.listings.length
      ? 'New listings are being added – call or WhatsApp us to hear about what’s available right now.'
      : state.cat === 'saved' ? 'You haven’t saved any properties yet. Tap the ♥ on a listing to keep it here.'
        : 'No properties match that search. Try clearing a filter – or tell us what you need and we’ll look for you.';
  }
  $('#chips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.cat = b.getAttribute('data-cat');
    doc.querySelectorAll('#chips .chip').forEach((c) => c.classList.toggle('on', c === b));
    render();
  });
  $('#st').addEventListener('change', (e) => { state.status = e.target.value; render(); });
  $('#q').addEventListener('input', (e) => { state.q = e.target.value; render(); });
  doc.addEventListener('ln:fav', () => { if (state.cat === 'saved') render(); else $('#saved-n').textContent = LN.fav.list().filter((id) => data.listings.some((l) => l.id === id)).length; });
  render();

  /* ---------- team ---------- */
  if (data.team.length) {
    $('#team').hidden = false; $('#nav-team').hidden = false;
    $('#team-grid').innerHTML = data.team.map((t) => {
      const ini = LN.esc(t.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase());
      const wa = LN.waLink(t.whatsapp || t.phone, 'Hello ' + t.name + ', I found you on the Lemways Nest website.');
      return '<article class="member" data-reveal>' +
        (t.photo ? '<img src="' + LN.esc(LN.imgUrl(t.photo, 480, 480)) + '" alt="' + LN.esc(t.name) + '" loading="lazy" width="480" height="480">' : '<div class="member-ini">' + ini + '</div>') +
        '<h3>' + LN.esc(t.name) + '</h3>' + (t.role ? '<p class="role">' + LN.esc(t.role) + '</p>' : '') +
        (t.bio ? '<p>' + LN.esc(t.bio) + '</p>' : '') +
        '<p class="member-links">' + (t.phone ? '<a href="tel:+' + LN.normKE(t.phone) + '">Call</a>' : '') +
        (wa ? '<a href="' + LN.esc(wa) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') + '</p></article>';
    }).join('');
  }

  /* ---------- reviews (only genuine reviews added in the admin panel) ---------- */
  if (data.reviews.length) {
    $('#reviews').hidden = false;
    $('#reviews-grid').innerHTML = data.reviews.map((r) => {
      const n = Math.max(1, Math.min(5, Math.round(+r.rating || 5)));
      return '<figure class="review" data-reveal><div class="stars" role="img" aria-label="' + n + ' out of 5 stars">' + '★'.repeat(n) + '<span>' + '★'.repeat(5 - n) + '</span></div>' +
        '<blockquote>' + LN.esc(r.text) + '</blockquote><figcaption><b>' + LN.esc(r.name) + '</b>' + (r.detail ? ' · ' + LN.esc(r.detail) : '') + '</figcaption></figure>';
    }).join('');
  }
  LN.reveal();

  /* ---------- contact form ---------- */
  const form = $('#contact-form'), out = $('#f-msg-out'), send = $('#f-send');
  const endpoint = (g.LN_CONFIG && g.LN_CONFIG.formEndpoint) || '';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    out.className = 'form-msg';
    const f = Object.fromEntries(new FormData(form).entries());
    if (f._gotcha) return;                                    // spam trap
    if (!f.name.trim() || !f.message.trim()) { out.textContent = 'Please add your name and a message.'; out.classList.add('err'); return; }
    if (!f.email.trim() && !f.phone.trim()) { out.textContent = 'Please add an email or phone number so we can reply.'; out.classList.add('err'); return; }
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) { out.textContent = 'That email address doesn’t look right.'; out.classList.add('err'); return; }

    const text = 'Hello Lemways Nest, my name is ' + f.name.trim() + '. I am interested in: ' + f.interest + '.\n\n' + f.message.trim() +
      '\n\nContact: ' + [f.phone, f.email].filter(Boolean).join(' / ');
    const wa = LN.waLink(site.whatsapp, text);
    LN.track('enquiry_submit', { interest: f.interest });

    if (!endpoint) {                                          // no email backup configured → WhatsApp
      if (wa) { window.open(wa, '_blank', 'noopener'); out.textContent = 'Opening WhatsApp so you can send your message…'; out.classList.add('ok'); }
      else { out.textContent = 'Please call or email us directly.'; out.classList.add('err'); }
      return;
    }
    send.disabled = true; send.textContent = 'Sending…';
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ name: f.name, email: f.email, phone: f.phone, interest: f.interest, message: f.message, _subject: 'Website enquiry – ' + f.interest }) });
      if (!r.ok) throw new Error('send failed');
      form.reset();
      out.innerHTML = 'Thank you – we’ve received your message and will reply shortly.' + (wa ? ' In a hurry? <a href="' + LN.esc(wa) + '" target="_blank" rel="noopener">Message us on WhatsApp</a>.' : '');
      out.classList.add('ok');
    } catch (err) {
      out.innerHTML = 'Sorry, that didn’t send.' + (wa ? ' <a href="' + LN.esc(wa) + '" target="_blank" rel="noopener">Send it on WhatsApp instead</a>.' : ' Please call or email us.');
      out.classList.add('err');
    } finally { send.disabled = false; send.textContent = 'Send message'; }
  });
})(globalThis);
