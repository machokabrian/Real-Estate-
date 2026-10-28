/* Admin panel. Talks to /api/* (which holds your Cloudinary secret) and uploads photos
   straight to Cloudinary with a one-off signature. */
(function (g) {
  'use strict';
  const LN = g.LN, doc = document, esc = LN.esc;
  const $ = (s, r) => (r || doc).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || doc).querySelectorAll(s));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const S = { token: '', data: null, dirty: false, ed: null };
  try { S.token = sessionStorage.getItem('ln_admin') || ''; } catch (e) { /* ignore */ }

  /* ---------- helpers ---------- */
  let toastT;
  function toast(msg, err) {
    const old = $('.toast'); if (old) old.remove();
    const t = doc.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.setAttribute('role', 'status'); t.textContent = msg;
    doc.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), err ? 7000 : 4500);
  }
  async function api(path, body) {
    let r;
    try {
      r = await fetch(path, { method: body ? 'POST' : 'GET', headers: Object.assign({ 'content-type': 'application/json' }, S.token ? { authorization: 'Bearer ' + S.token } : {}), body: body ? JSON.stringify(body) : undefined });
    } catch (e) { throw new Error('No connection. Check your internet and try again.'); }
    let j = {}; try { j = await r.json(); } catch (e) { /* not json */ }
    if (r.status === 401 && S.token) { signOut('Your session expired – please sign in again.'); throw new Error('Session expired – sign in again.'); }
    if (r.status === 404 && !j.error && path.indexOf('/api/') === 0) throw new Error('The admin API was not found. It only runs on Vercel (or "vercel dev"), not from a plain file preview.');
    if (!r.ok) throw new Error(j.error || 'Something went wrong (' + r.status + ').');
    return j;
  }
  function markDirty(on) {
    S.dirty = on !== false;
    const st = $('#status'); st.textContent = S.dirty ? 'Unsaved changes' : 'All changes saved'; st.className = S.dirty ? 'chip-dirty' : 'chip-clean';
  }
  g.addEventListener('beforeunload', (e) => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- sign-in / out ---------- */
  function showLogin(msg) { $('#app').hidden = true; $('#login').hidden = false; $('#login-err').textContent = msg || ''; setTimeout(() => $('#pw').focus(), 30); }
  function signOut(msg) {
    S.token = ''; try { sessionStorage.removeItem('ln_admin'); } catch (e) { /* ignore */ }
    if ($('#ed').open) $('#ed').close();
    showLogin(msg);
  }
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const b = $('#login-btn'); b.disabled = true; b.textContent = 'Signing in…'; $('#login-err').textContent = '';
    try {
      const r = await api('/api/login', { password: $('#pw').value });
      S.token = r.token; try { sessionStorage.setItem('ln_admin', S.token); } catch (err) { /* ignore */ }
      $('#pw').value = '';
      await load();
    } catch (err) { $('#login-err').textContent = err.message; }
    finally { b.disabled = false; b.textContent = 'Sign in'; }
  });
  $('#btn-out').addEventListener('click', () => { if (!S.dirty || confirm('You have unsaved changes. Sign out anyway?')) { markDirty(false); signOut(); } });

  async function load() {
    const r = await api('/api/admin-data');
    let d = r.data, sample = false;
    if (!d) { sample = true; try { d = await (await fetch('/data/listings.json')).json(); } catch (e) { d = {}; } }
    S.data = LN.normalizeData(d);
    $('#login').hidden = true; $('#app').hidden = false;
    markDirty(sample);
    renderAll();
    if (sample) toast('Nothing is saved yet – these are sample listings. Edit or delete them, then press Save & publish.');
  }

  /* ---------- tabs ---------- */
  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    $$('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
    ['listings', 'settings', 'team', 'reviews', 'help'].forEach((t) => { $('#tab-' + t).hidden = t !== b.getAttribute('data-tab'); });
  });
  function renderAll() { renderListings(); renderSettings(); renderList('team'); renderList('reviews'); }

  /* ---------- photo upload (resize in the browser → Cloudinary) ---------- */
  async function shrink(file, max) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
      if (scale === 1 && file.size < 1.5e6) return file;
      const c = doc.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      return await new Promise((res) => c.toBlob((b) => res(b || file), 'image/jpeg', 0.86));
    } catch (e) { return file; }
  }
  async function uploadImage(file, folder) {
    const blob = await shrink(file, 2000);
    const sig = await api('/api/sign-upload', { folder });
    const f = new FormData();
    f.append('file', blob, (file.name || 'photo').replace(/\.\w+$/, '') + (blob.type === 'image/jpeg' ? '.jpg' : ''));
    f.append('api_key', sig.apiKey); f.append('timestamp', sig.timestamp); f.append('signature', sig.signature); f.append('folder', sig.folder);
    const r = await fetch('https://api.cloudinary.com/v1_1/' + sig.cloudName + '/image/upload', { method: 'POST', body: f });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || 'Photo upload failed.');
    return j.secure_url;
  }

  /* ---------- listings ---------- */
  function renderListings() {
    const q = ($('#l-search').value || '').toLowerCase().trim();
    const rows = S.data.listings.filter((l) => !q || (l.title + ' ' + (l.location || '') + ' ' + (l.code || '')).toLowerCase().indexOf(q) > -1);
    $('#l-rows').innerHTML = rows.length ? rows.map((l) =>
      '<div class="row" data-id="' + esc(l.id) + '"><div class="th">' + (l.images[0] ? '<img src="' + esc(LN.imgUrl(l.images[0], 168, 120)) + '" alt="">' : 'No photo') + '</div>' +
      '<div><h4>' + esc(l.title) + (l.sample ? '<span class="pill warn">Sample</span>' : '') + (!l.published ? '<span class="pill off">Hidden</span>' : '') + (l.featured ? '<span class="pill">★ Featured</span>' : '') + '</h4>' +
      '<div class="meta">' + esc([l.code, LN.STATUS[l.status], l.location, LN.priceText(l)].filter(Boolean).join(' · ')) + '</div></div>' +
      '<div class="acts"><button data-act="up" aria-label="Move up">↑</button><button data-act="down" aria-label="Move down">↓</button><button data-act="edit">Edit</button>' +
      '<button data-act="toggle">' + (l.published ? 'Hide' : 'Show') + '</button><button class="danger" data-act="del">Delete</button></div></div>').join('')
      : '<p class="empty">' + (S.data.listings.length ? 'No listings match your search.' : 'No listings yet. Press “+ Add listing” to create your first one.') + '</p>';
  }
  $('#l-search').addEventListener('input', renderListings);
  $('#l-add').addEventListener('click', () => openEditor(null));
  $('#l-rows').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const id = b.closest('.row').getAttribute('data-id'), L = S.data.listings, i = L.findIndex((x) => x.id === id);
    if (i < 0) return;
    const act = b.getAttribute('data-act');
    if (act === 'edit') return openEditor(id);
    if (act === 'toggle') L[i].published = !L[i].published;
    else if (act === 'del') { if (!confirm('Delete “' + L[i].title + '”? This can’t be undone once you publish.')) return; L.splice(i, 1); }
    else if (act === 'up' && i > 0) { const t = L[i - 1]; L[i - 1] = L[i]; L[i] = t; }
    else if (act === 'down' && i < L.length - 1) { const t = L[i + 1]; L[i + 1] = L[i]; L[i] = t; }
    markDirty(); renderListings();
  });

  const ed = $('#ed'), edf = $('#ed-form');
  function renderEdImages() {
    $('#ed-images').innerHTML = S.ed.images.map((u, i) =>
      '<div class="adm-img" data-i="' + i + '"><img src="' + esc(LN.imgUrl(u, 240, 180)) + '" alt="Photo ' + (i + 1) + '">' + (i === 0 ? '<span class="cover">Cover</span>' : '') +
      '<div><button type="button" data-img="left" aria-label="Move earlier">←</button><button type="button" data-img="right" aria-label="Move later">→</button><button type="button" data-img="del" aria-label="Remove photo">✕</button></div></div>').join('');
  }
  function nextCode() {
    const n = S.data.listings.reduce((m, l) => { const k = /(\d+)\s*$/.exec(l.code || ''); return k ? Math.max(m, +k[1]) : m; }, 0);
    return 'LN-' + String(n + 1).padStart(3, '0');
  }
  function openEditor(id) {
    const l = id ? S.data.listings.find((x) => x.id === id) : null;
    S.ed = { id: l ? l.id : null, images: l ? l.images.slice() : [] };
    const v = l || { status: 'sale', category: 'residential', published: true };
    $('#ed-title').textContent = l ? 'Edit listing' : 'New listing';
    const E = edf.elements;
    ['title', 'status', 'category', 'propertyType', 'location', 'priceUnit', 'sizeUnit', 'description', 'code', 'slug'].forEach((k) => { E[k].value = v[k] || ''; });
    ['price', 'beds', 'baths', 'size'].forEach((k) => { E[k].value = v[k] == null ? '' : v[k]; });
    E.mapPin.value = v.lat != null && v.lng != null ? v.lat + ', ' + v.lng : '';
    $('#e-map-ok').textContent = '';
    E.features.value = (v.features || []).join('\n');
    E.published.checked = v.published !== false; E.featured.checked = !!v.featured;
    E.agentId.innerHTML = '<option value="">Default (first team member, or the company)</option>' +
      S.data.team.map((t) => '<option value="' + esc(t.id) + '">' + esc(t.name) + '</option>').join('');
    E.agentId.value = v.agentId || '';
    $('#ed-up').textContent = ''; $('#ed-file').value = '';
    slugPreview(); renderEdImages();
    ed.showModal();
  }
  function slugPreview() { $('#slug-prev').textContent = LN.slugify(edf.elements.slug.value || edf.elements.title.value) || '…'; }
  $('#e-geo').addEventListener('click', () => {
    const out = $('#e-map-ok');
    if (!navigator.geolocation) { out.textContent = 'Not supported on this device.'; return; }
    out.textContent = 'Locating…';
    navigator.geolocation.getCurrentPosition((p) => { edf.elements.mapPin.value = p.coords.latitude.toFixed(6) + ', ' + p.coords.longitude.toFixed(6); out.textContent = 'Pin set to where you are now.'; },
      () => { out.textContent = 'Couldn’t get your location – allow location access, or paste coordinates.'; }, { enableHighAccuracy: true, timeout: 12000 });
  });
  edf.elements.title.addEventListener('input', slugPreview);
  edf.elements.slug.addEventListener('input', slugPreview);
  $$('[data-ed-close]').forEach((b) => b.addEventListener('click', () => ed.close()));

  $('#ed-images').addEventListener('click', (e) => {
    const b = e.target.closest('[data-img]'); if (!b) return;
    const i = +b.closest('.adm-img').getAttribute('data-i'), a = S.ed.images, k = b.getAttribute('data-img');
    if (k === 'del') a.splice(i, 1);
    else if (k === 'left' && i > 0) { const t = a[i - 1]; a[i - 1] = a[i]; a[i] = t; }
    else if (k === 'right' && i < a.length - 1) { const t = a[i + 1]; a[i + 1] = a[i]; a[i] = t; }
    renderEdImages();
  });
  $('#ed-file').addEventListener('change', async (e) => {
    const files = Array.prototype.slice.call(e.target.files); const msg = $('#ed-up');
    for (let i = 0; i < files.length; i++) {
      if (S.ed.images.length >= 25) { msg.textContent = 'That’s the maximum of 25 photos.'; break; }
      msg.textContent = 'Uploading photo ' + (i + 1) + ' of ' + files.length + '…';
      try { S.ed.images.push(await uploadImage(files[i], 'lemways/properties')); renderEdImages(); }
      catch (err) { msg.textContent = ''; toast(err.message, true); e.target.value = ''; return; }
    }
    msg.textContent = files.length ? 'Done – ' + files.length + ' photo(s) added.' : '';
    e.target.value = '';
  });

  edf.addEventListener('submit', (e) => {
    e.preventDefault();
    const E = edf.elements, L = S.data.listings;
    const title = E.title.value.trim(), location = E.location.value.trim();
    if (!title) { toast('Please give the listing a title.', true); E.title.focus(); return; }
    if (!location) { toast('Please add the area / location.', true); E.location.focus(); return; }
    const price = E.price.value.replace(/[,\s]/g, '');
    if (price && isNaN(+price)) { toast('Price should be a number, e.g. 85000000.', true); E.price.focus(); return; }
    const old = S.ed.id ? L.find((x) => x.id === S.ed.id) : null;
    const id = S.ed.id || 'l_' + Date.now().toString(36) + uid().slice(0, 3);
    const base = LN.slugify(E.slug.value || title) || id; let slug = base, n = 2;
    while (L.some((x) => x.id !== id && x.slug === slug)) slug = base + '-' + n++;
    const pinText = E.mapPin.value.trim(), pin = LN.parseLatLng(pinText);
    if (pinText && !pin) { toast('Couldn’t read that map pin. Paste coordinates like -1.2833, 36.7667 or a full Google Maps link (short maps.app.goo.gl links can’t be read – open them first and copy the long link).', true); E.mapPin.focus(); return; }
    const sz = E.size.value.trim();
    const obj = Object.assign({}, old || { createdAt: new Date().toISOString() }, {
      id, title, location, slug, lat: pin ? pin.lat : undefined, lng: pin ? pin.lng : undefined, status: E.status.value, category: E.category.value,
      propertyType: E.propertyType.value.trim() || undefined, price: +price || 0, priceUnit: E.priceUnit.value.trim() || undefined,
      beds: +E.beds.value || undefined, baths: +E.baths.value || undefined,
      size: sz === '' ? undefined : (isNaN(+sz) ? sz : +sz), sizeUnit: E.sizeUnit.value.trim() || undefined,
      description: E.description.value.trim(), features: E.features.value.split('\n').map((s) => s.trim()).filter(Boolean),
      images: S.ed.images.slice(), agentId: E.agentId.value || undefined,
      code: E.code.value.trim() || (old && old.code) || nextCode(), published: E.published.checked, featured: E.featured.checked
    });
    delete obj.sample;
    if (old) L[L.indexOf(old)] = obj; else L.unshift(obj);
    ed.close(); markDirty(); renderListings();
    toast('Listing saved here – press “Save & publish” to put it on the website.');
  });

  /* ---------- site settings ---------- */
  const SET = [
    ['Contact details', [['phone1', 'Main phone', 'tel'], ['phone2', 'Second phone', 'tel'], ['whatsapp', 'WhatsApp number', 'tel', 'Country code first, e.g. 254712345678'], ['email', 'Email', 'email'], ['address', 'Address', 'text'], ['hours', 'Opening hours', 'text'], ['mapUrl', 'Directions link (Google Maps)', 'url']]],
    ['Social media (leave blank to hide)', [['instagram', 'Instagram link', 'url'], ['facebook', 'Facebook link', 'url'], ['tiktok', 'TikTok link', 'url']]],
    ['Home page text', [['heroTitle', 'Headline', 'text'], ['heroText', 'Intro under the headline', 'textarea'], ['aboutTitle', 'About – heading', 'text'], ['aboutText', 'About – text', 'textarea'], ['aboutQuote', 'About – quote', 'textarea'], ['coverage', 'Areas covered', 'text'], ['founded', 'Year founded', 'text'], ['viewingNote', 'Note shown on each property page', 'textarea']]]
  ];
  function photoField(key, label, kind, idx, url, folder) {
    return '<div class="field wide"><label>' + label + '</label><div class="photo-line">' + (url ? '<img src="' + esc(LN.imgUrl(url, 128, 128)) + '" alt="">' : '') +
      '<input type="file" accept="image/*" data-photo="' + kind + '" data-key="' + key + '" data-idx="' + idx + '" data-folder="' + folder + '">' +
      (url ? '<button type="button" class="btn btn-ghost btn-sm" data-photo-clear="' + kind + '" data-key="' + key + '" data-idx="' + idx + '">Remove</button>' : '') + '</div></div>';
  }
  function renderSettings() {
    const s = LN.siteSettings(S.data), box = $('#tab-settings');
    box.innerHTML = SET.map(([h, fields]) => '<h3>' + h + '</h3><div class="form-grid">' + fields.map(([k, label, type, hint]) =>
      '<div class="field' + (type === 'textarea' ? ' wide' : '') + '"><label for="s-' + k + '">' + label + '</label>' +
      (type === 'textarea' ? '<textarea id="s-' + k + '" rows="3" data-set="' + k + '">' + esc(s[k]) + '</textarea>' : '<input id="s-' + k + '" type="' + type + '" data-set="' + k + '" value="' + esc(s[k]) + '">') +
      (hint ? '<p class="hint">' + hint + '</p>' : '') + '</div>').join('') + '</div>').join('') +
      '<h3>Photos</h3><div class="form-grid">' + photoField('heroImage', 'Home page top photo (optional)', 'setting', '', s.heroImage, 'lemways/site') + photoField('aboutImage', 'About section photo (optional)', 'setting', '', s.aboutImage, 'lemways/site') + '</div>';
  }
  $('#tab-settings').addEventListener('input', (e) => {
    const k = e.target.getAttribute('data-set'); if (!k) return;
    S.data.settings[k] = e.target.value; markDirty();
  });

  /* ---------- team & reviews ---------- */
  const LISTS = {
    team: { empty: 'No team members yet. The Team section stays hidden on the website until you add someone.', add: '+ Add team member', noun: 'team member', folder: 'lemways/team',
      fields: [['name', 'Name', 'text'], ['role', 'Role', 'text'], ['phone', 'Phone', 'tel'], ['whatsapp', 'WhatsApp', 'tel', 'Optional – defaults to the phone number'], ['bio', 'Short bio', 'textarea']], photo: 'photo' },
    reviews: { empty: 'No reviews yet. The Reviews section stays hidden until you add one. Only add real reviews from real clients, with their permission.', add: '+ Add client review', noun: 'review',
      fields: [['name', 'Client name', 'text'], ['detail', 'What they did', 'text', 'e.g. “Rented in Kilimani”'], ['rating', 'Rating (1–5)', 'number'], ['text', 'Their words', 'textarea']] }
  };
  function renderList(kind) {
    const cfg = LISTS[kind], items = S.data[kind], box = $('#tab-' + kind);
    box.innerHTML = '<div class="tool"><span class="meta">' + (kind === 'team' ? 'Agents appear on property pages and can be chosen by visitors.' : 'Shown on the home page.') + '</span><button class="btn btn-gold btn-sm" type="button" data-add="' + kind + '">' + cfg.add + '</button></div>' +
      (items.length ? items.map((it, i) =>
        '<div class="card-edit"><div class="top"><b>' + esc(it.name || ('New ' + cfg.noun)) + '</b><button class="btn btn-ghost btn-sm" type="button" data-del="' + kind + '" data-i="' + i + '">Remove</button></div>' +
        '<div class="form-grid">' + cfg.fields.map(([k, label, type, hint]) =>
          '<div class="field' + (type === 'textarea' ? ' wide' : '') + '"><label>' + label + '</label>' +
          (type === 'textarea' ? '<textarea rows="3" data-list="' + kind + '" data-i="' + i + '" data-f="' + k + '">' + esc(it[k] || '') + '</textarea>'
            : '<input type="' + type + '"' + (type === 'number' ? ' min="1" max="5"' : '') + ' data-list="' + kind + '" data-i="' + i + '" data-f="' + k + '" value="' + esc(it[k] == null ? '' : it[k]) + '">') +
          (hint ? '<p class="hint">' + hint + '</p>' : '') + '</div>').join('') +
        (cfg.photo ? photoField(cfg.photo, 'Photo', kind, i, it[cfg.photo], cfg.folder) : '') + '</div></div>').join('') : '<p class="empty">' + cfg.empty + '</p>');
  }
  ['team', 'reviews'].forEach((kind) => {
    const box = $('#tab-' + kind);
    box.addEventListener('input', (e) => {
      const t = e.target; if (t.getAttribute('data-list') !== kind) return;
      const v = t.type === 'number' ? (t.value === '' ? '' : Math.max(1, Math.min(5, +t.value))) : t.value;
      S.data[kind][+t.getAttribute('data-i')][t.getAttribute('data-f')] = v; markDirty();
    });
    box.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]'), del = e.target.closest('[data-del]');
      if (add) { S.data[kind].push(kind === 'team' ? { id: 't_' + uid(), name: '' } : { name: '', rating: 5, text: '' }); 