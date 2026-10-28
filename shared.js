/* Shared helpers – runs in the browser AND in the Node build script. */
(function (g) {
  'use strict';
  const LN = g.LN || (g.LN = {});
  const cfg = () => g.LN_CONFIG || {};

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
  const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  const digits = (s) => String(s == null ? '' : s).replace(/\D/g, '');
  const num = (n) => new Intl.NumberFormat('en-KE', { maximumFractionDigits: 2 }).format(Number(n) || 0);
  // Kenyan numbers: 0712… -> 254712…  (wa.me and tel: need the country code)
  const normKE = (s) => { let d = digits(s); if (d.startsWith('0')) d = '254' + d.slice(1); return d; };

  const STATUS = { sale: 'For sale', let: 'To let' };
  const CATS = { residential: 'Residential', commercial: 'Commercial', land: 'Land' };

  function sig(o) {
    const s = JSON.stringify(o); let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  /* ---------- site settings (config.js defaults + admin overrides) ---------- */
  function siteSettings(data) {
    const c = cfg(), ct = c.contact || {}, so = c.social || {}, cp = c.copy || {};
    const s = (data && data.settings) || {};
    const phones = ct.phones || [];
    const get = (k, def) => (k in s && s[k] != null ? String(s[k]).trim() : (def == null ? '' : String(def)));
    const out = {
      brand: c.brand || 'Lemways Nest',
      legalName: c.legalName || c.brand || 'Lemways Nest',
      phone1: get('phone1', phones[0]), phone2: get('phone2', phones[1]),
      whatsapp: normKE(get('whatsapp', ct.whatsapp)),
      email: get('email', ct.email), address: get('address', ct.address),
      hours: get('hours', ct.hours), mapUrl: get('mapUrl', ct.mapUrl),
      instagram: get('instagram', so.instagram), facebook: get('facebook', so.facebook), tiktok: get('tiktok', so.tiktok),
      heroTitle: get('heroTitle', cp.heroTitle), heroText: get('heroText', cp.heroText),
      aboutTitle: get('aboutTitle', cp.aboutTitle), aboutText: get('aboutText', cp.aboutText),
      aboutQuote: get('aboutQuote', cp.aboutQuote), coverage: get('coverage', cp.coverage),
      viewingNote: get('viewingNote', cp.viewingNote), founded: get('founded', c.founded),
      heroImage: get('heroImage', ''), aboutImage: get('aboutImage', '')
    };
    out.phone1Tel = out.phone1 ? '+' + normKE(out.phone1) : '';
    out.phone2Tel = out.phone2 ? '+' + normKE(out.phone2) : '';
    return out;
  }

  /* ---------- clean up whatever came out of the database ---------- */
  function normalizeData(d) {
    d = d && typeof d === 'object' ? d : {};
    const out = {
      settings: d.settings && typeof d.settings === 'object' ? d.settings : {},
      listings: [], team: [], reviews: [], updatedAt: d.updatedAt || null
    };
    out.team = (Array.isArray(d.team) ? d.team : []).filter((t) => t && t.name)
      .map((t, i) => ({ ...t, id: t.id || 't' + (i + 1) }));
    out.reviews = (Array.isArray(d.reviews) ? d.reviews : []).filter((r) => r && r.text && r.name);
    const seen = new Set();
    (Array.isArray(d.listings) ? d.listings : []).forEach((l, i) => {
      if (!l || typeof l !== 'object') return;
      const id = l.id || 'l' + (i + 1);
      const base = slugify(l.slug || l.title) || slugify(id) || 'listing-' + (i + 1);
      let slug = base, n = 2;
      while (seen.has(slug)) slug = base + '-' + n++;
      seen.add(slug);
      out.listings.push({
        ...l, id, slug,
        status: l.status === 'let' ? 'let' : 'sale',
        category: CATS[l.category] ? l.category : 'residential',
        images: Array.isArray(l.images) ? l.images.filter(Boolean) : [],
        features: Array.isArray(l.features) ? l.features.filter(Boolean) : [],
        published: l.published !== false
      });
    });
    return out;
  }

  /* ---------- formatting ---------- */
  function priceText(l) {
    if (!l.price) return 'Price on request';
    const unit = l.priceUnit ? l.priceUnit : (l.status === 'let' ? '/ month' : '');
    return (cfg().currency || 'KES') + ' ' + num(l.price) + (unit ? ' ' + unit : '');
  }
  const sizeText = (l) => {
    if (!l.size && l.size !== 0) return '';
    const v = isNaN(Number(l.size)) ? String(l.size) : num(l.size);
    return v + (l.sizeUnit ? ' ' + l.sizeUnit : '');
  };
  function subtitle(l) {
    const mid = [l.beds ? l.beds + ' bed' : '', l.propertyType || ''].filter(Boolean).join(' ');
    return [l.location, mid, sizeText(l)].filter(Boolean).join(' · ');
  }
  function imgUrl(url, w, h) {
    const marker = '/image/upload/';
    if (!url || url.indexOf('res.cloudinary.com') === -1 || url.indexOf(marker) === -1) return url || '';
    const i = url.indexOf(marker) + marker.length;
    const head = url.slice(0, i), tail = url.slice(i);
    if (/^[a-z]{1,3}_/.test(tail.split('/')[0])) return url; // already transformed
    const t = ['f_auto', 'q_auto'];
    if (w) t.push('w_' + w);
    if (h) t.push('h_' + h, 'c_fill', 'g_auto'); else if (w) t.push('c_limit');
    return head + t.join(',') + '/' + tail;
  }
  const waLink = (number, text) => {
    const n = normKE(number);
    return n ? 'https://wa.me/' + n + (text ? '?text=' + encodeURIComponent(text) : '') : '';
  };
  function agentFor(data, l, site) {
    const t = (data && data.team) || [];
    const a = t.find((x) => l && x.id === l.agentId) || t[0];
    if (a) return { id: a.id, name: a.name, role: a.role || '', phone: a.phone || site.phone1, whatsapp: normKE(a.whatsapp || a.phone) || site.whatsapp };
    return { id: '', name: site.brand + ' team', role: '', phone: site.phone1, whatsapp: site.whatsapp };
  }

  /* ---------- maps (Google Maps embed – no API key needed) ---------- */
  // Accepts "-1.2833, 36.7667", or a Google Maps link containing @lat,lng / !3dlat!4dlng / q=lat,lng
  function parseLatLng(text) {
    const s = String(text || '').trim(); if (!s) return null;
    const pats = [/@(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/, /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/, /[?&](?:q|query|ll|destination)=(-?\d{1,3}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)/i, /^\s*(-?\d{1,3}\.\d+)\s*[, ]\s*(-?\d{1,3}\.\d+)\s*$/];
    for (const p of pats) {
      const m = p.exec(s); if (!m) continue;
      const la = +m[1], ln = +m[2];
      if (Math.abs(la) <= 90 && Math.abs(ln) <= 180) return { lat: la, lng: ln };
    }
    return null;
  }
  const mapQuery = (l) => (l.lat != null && l.lng != null && l.lat !== '' ? l.lat + ',' + l.lng : [l.location, 'Nairobi, Kenya'].filter(Boolean).join(', '));
  const mapEmbed = (q, z) => 'https://maps.google.com/maps?q=' + encodeURIComponent(q) + '&z=' + (z || 15) + '&output=embed';
  const mapLink = (q) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  const dirLink = (q) => 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(q);
  function mapBlock(l) {
    if (!l.location && !(l.lat != null && l.lng != null)) return '';
    const q = mapQuery(l), exact = l.lat != null && l.lng != null && l.lat !== '';
    return '<h2>Location</h2><div class="map"><iframe src="' + esc(mapEmbed(q, exact ? 16 : 14)) + '" title="Map of ' + esc(l.title) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>' +
      '<p class="map-links"><a class="btn btn-ghost btn-sm" data-track="map_click" href="' + esc(mapLink(q)) + '" target="_blank" rel="noopener">Open in Google Maps</a> ' +
      '<a class="btn btn-ghost btn-sm" data-track="directions_click" href="' + esc(dirLink(q)) + '" target="_blank" rel="noopener">Get directions</a></p>' +
      (exact ? '' : '<p class="fine">Map shows the general area. Exact address is shared when you book a viewing.</p>');
  }

  /* ---------- HTML builders (used by the browser AND the build script) ---------- */
  const placeholder = () => '<div class="ph" role="img" aria-label="Photos coming soon"><svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 31 32 9l26 22"/><path d="M13 27v27h38V27"/><path d="M26 54V38h12v16"/></svg><span>Photos coming soon</span></div>';

  function cardHTML(l) {
    const href = '/property/' + esc(l.slug);
    const img = l.images && l.images[0];
    const media = img
      ? '<img src="' + esc(imgUrl(img, 640, 440)) + '" alt="' + esc(l.title) + '" loading="lazy" width="640" height="440">'
      : placeholder();
    return '<article class="card" data-id="' + esc(l.id) + '" data-cat="' + esc(l.category) + '" data-status="' + esc(l.status) + '">' +
      '<a class="card-media" href="' + href + '" aria-label="' + esc(l.title) + '">' + media +
      '<span class="badge badge-' + esc(l.status) + '">' + esc(STATUS[l.status]) + '</span></a>' +
      '<button class="fav" type="button" data-fav="' + esc(l.id) + '" aria-pressed="false" aria-label="Save ' + esc(l.title) + '">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 5 6.4 5c2 0 3.6 1 5.6 3 2-2 3.6-3 5.6-3 3.4 0 5.5 3.300 4 6.700C19.500 16.400 12 21 12 21z"/></svg></button>' +
      '<div class="card-body"><h3><a href="' + href + '">' + esc(l.title) + '</a></h3>' +
      '<p class="card-sub">' + esc(subtitle(l)) + '</p>' +
      '<p class="card-price">' + esc(priceText(l)) + '</p>' +
      '<a class="card-link" href="' + href + '">View details <span aria-hidden="true">→</span></a></div></article>';
  }

  function propertyHTML(l, ctx) {
    const site = (ctx && ctx.site) || siteSettings(null);
    const imgs = l.images || [];
    let gallery;
    if (imgs.length) {
      gallery = '<div class="gal"><button class="gal-main" type="button" data-lightbox data-full="' + esc(imgUrl(imgs[0], 1800)) + '" aria-label="Open photo full screen">' +
        '<img id="gal-img" src="' + esc(imgUrl(imgs[0], 1200)) + '" alt="' + esc(l.title) + '" width="1200" height="800" fetchpriority="high"></button>' +
        (imgs.length > 1 ? '<div class="gal-thumbs">' + imgs.map((u, i) =>
          '<button type="button" class="gal-thumb' + (i === 0 ? ' on' : '') + '" data-index="' + i + '" data-full="' + esc(imgUrl(u, 1800)) + '" data-mid="' + esc(imgUrl(u, 1200)) + '" aria-label="Show photo ' + (i + 1) + '">' +
          '<img src="' + esc(imgUrl(u, 180, 120)) + '" alt="" loading="lazy" width="180" height="120"></button>').join('') + '</div>' : '') +
        '</div>';
    } else {
      gallery = '<div class="gal"><div class="gal-main gal-empty">' + placeholder() + '</div></div>';
    }

    const facts = [
      ['Type', CATS[l.category] + (l.propertyType ? ' · ' + l.propertyType : '')],
      l.beds ? ['Bedrooms', l.beds] : null,
      l.baths ? ['Bathrooms', l.baths] : null,
      sizeText(l) ? ['Size', sizeText(l)] : null,
      l.location ? ['Location', l.location] : null,
      l.code ? ['Code', l.code] : null
    ].filter(Boolean).map((f) => '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>').join('');

    const desc = String(l.description || '').split(/\n{2,}/).filter((p) => p.trim())
      .map((p) => '<p>' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>').join('');
    const feats = (l.features || []).length
      ? '<h2>Features</h2><ul class="features">' + l.features.map((f) => '<li>' + esc(f) + '</li>').join('') + '</ul>' : '';

    const msg = 'Hello, I am interested in ' + l.title + (l.code ? ' (' + l.code + ')' : '') + ' – ' + priceText(l) + '.';
    const wa = waLink(site.whatsapp, msg);
    const agent = '<div class="agent-box" id="agent-box"><p class="agent-name">Enquire about this property</p><div class="agent-actions">' +
      (wa ? '<a class="btn btn-wa" data-track="whatsapp_click" href="' + esc(wa) + '" target="_blank" rel="noopener">Chat on WhatsApp</a>' : '') +
      (site.phone1Tel ? '<a class="btn btn-ghost" data-track="call_click" href="tel:' + esc(site.phone1Tel) + '">Call ' + esc(site.phone1) + '</a>' : '') +
      '</div></div>';

    return '<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/#properties">Properties</a><span>/</span><span aria-current="page">' + esc(l.title) + '</span></nav>' +
      '<div class="prop" data-id="' + esc(l.id) + '" data-sig="' + sig(l) + '">' +
      '<div class="prop-media">' + gallery + '</div>' +
      '<aside class="prop-info"><div class="prop-tags"><span class="badge badge-' + esc(l.status) + '">' + esc(STATUS[l.status]) + '</span>' +
      (l.code ? '<span class="code">' + esc(l.code) + '</span>' : '') + '</div>' +
      '<h1>' + esc(l.title) + '</h1><p class="prop-loc">' + esc(subtitle(l)) + '</p>' +
      '<p class="prop-price">' + esc(priceText(l)) + '</p>' + agent +
      '<div class="prop-tools"><button class="btn btn-ghost btn-sm" type="button" data-fav="' + esc(l.id) + '" aria-pressed="false">♥ Save</button>' +
      '<button class="btn btn-ghost btn-sm" type="button" data-share data-title="' + esc(l.title) + '">Share</button></div>' +
      (site.viewingNote ? '<p class="note" id="viewing-note">' + esc(site.viewingNote) + '</p>' : '') + '</aside>' +
      '<div class="prop-body"><dl class="facts">' + facts + '</dl>' +
      (desc ? '<h2>About this property</h2><div class="desc">' + desc + '</div>' : '') + feats + mapBlock(l) +
      '<div class="calc" id="calc"></div></div></div>' +
      '<section class="similar" id="similar" hidden><h2>You may also like</h2><div class="grid" id="similar-grid"></div></section>';
  }

  /* ---------- DOM binding (browser only) ---------- */
  function bindSite(site) {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('[data-bind]').forEach((el) => {
      const v = site[el.getAttribute('data-bind')];
      if (v) el.textContent = v; else if (el.hasAttribute('data-hide-empty')) el.hidden = true;
    });
    document.querySelectorAll('[data-href]').forEach((el) => {
      const t = el.getAttribute('data-href');
      const keys = (t.match(/\{(\w+)\}/g) || []).map((k) => k.slice(1, -1));
      if (keys.some((k) => !site[k])) { if (el.hasAttribute('data-hide-empty')) el.hidden = true; return; }
      el.href = t.replace(/\{(\w+)\}/g, (_, k) => site[k]);
      el.hidden = false;
    });
  }

  Object.assign(LN, {
    esc, slugify, digits, num, normKE, sig, STATUS, CATS,
    parseLatLng, mapQuery, mapEmbed, mapLink, dirLink, mapBlock,
    siteSettings, normalizeData, priceText, sizeText, subtitle, imgUrl, waLink, agentFor,
    placeholder, cardHTML, propertyHTML, bindSite
  });
})(globalThis);
