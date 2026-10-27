// Admin only: save the whole data file to Cloudinary, then (optionally) trigger a Vercel rebuild
// so the per-property pages and sitemap are regenerated.
import { requireAdmin, writeData } from './_lib.js';

const arr = (x, max) => (Array.isArray(x) ? x.slice(0, max) : []);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAdmin(req, res)) return;

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const d = body.data;
  if (!d || typeof d !== 'object' || !Array.isArray(d.listings)) {
    return res.status(400).json({ error: 'Nothing to save.' });
  }
  const clean = {
    settings: d.settings && typeof d.settings === 'object' ? d.settings : {},
    listings: arr(d.listings, 500),
    team: arr(d.team, 50),
    reviews: arr(d.reviews, 100),
    updatedAt: new Date().toISOString()
  };
  if (JSON.stringify(clean).length > 3_000_000) return res.status(413).json({ error: 'That is too much data to save.' });

  try {
    const r = await writeData(clean);
    let rebuild = false;
    const hook = (process.env.VERCEL_DEPLOY_HOOK_URL || '').trim();
    if (hook) {
      try { rebuild = (await fetch(hook, { method: 'POST' })).ok; } catch (e) { rebuild = false; }
    }
    return res.status(200).json({ ok: true, version: r.version, updatedAt: clean.updatedAt, rebuild });
  } catch (e) {
    return res.status(502).json({ error: e.message || 'Save failed.' });
  }
}
