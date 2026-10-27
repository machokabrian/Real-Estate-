// Admin only: gives the browser a one-off signature so photos upload straight to Cloudinary
// (your API secret never leaves the server).
import { cloud, requireAdmin, sign, UPLOAD_FOLDERS } from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAdmin(req, res)) return;
  const c = cloud();
  if (!c.name || !c.key || !c.secret) return res.status(500).json({ error: 'Cloudinary keys are missing on the server.' });

  const asked = String((req.body && req.body.folder) || '');
  const folder = UPLOAD_FOLDERS.includes(asked) ? asked : UPLOAD_FOLDERS[0];
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign({ folder, timestamp }, c.secret);
  return res.status(200).json({ cloudName: c.name, apiKey: c.key, timestamp, folder, signature });
}
