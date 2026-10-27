// Public: the live listings, trimmed to what visitors may see.
import { readData } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const d = await readData();
    if (!d) { res.setHeader('Cache-Control', 'no-store'); return res.status(404).json({ error: 'No listings saved yet.' }); }
    const out = { ...d, listings: (d.listings || []).filter((l) => l && l.published !== false) };
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(out);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Could not reach the listings database.' });
  }
}
