// Admin only: the full data file including unpublished listings.
import { readData, requireAdmin } from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAdmin(req, res)) return;
  try {
    return res.status(200).json({ data: await readData() });
  } catch (e) {
    return res.status(502).json({ error: 'Could not read the listings database.' });
  }
}
