/* Talks to your listings "database" (a JSON file kept in Cloudinary).
   1. /api/listings   – live copy, refreshed about once a minute
   2. /data/listings.json – the copy baked in at the last deploy (fallback) */
(function (g) {
  'use strict';
  const LN = g.LN;
  const base = (g.LN_CONFIG && g.LN_CONFIG.apiBase) || '';
  let cache = null;

  async function getJSON(url) {
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  LN.db = {
    async load() {
      if (cache) return cache;
      let raw;
      try { raw = await getJSON(base + '/api/listings'); }
      catch (e) { raw = await getJSON(base + '/data/listings.json'); }
      cache = LN.normalizeData(raw);
      // published only; featured first, otherwise the order set in the admin panel
      const pub = cache.listings.filter((l) => l.published);
      cache.listings = pub.filter((l) => l.featured).concat(pub.filter((l) => !l.featured));
      return cache;
    }
  };
})(globalThis);
