import { adminConfigured, makeToken, safeEqual, delay } from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!adminConfigured()) {
    return res.status(500).json({ error: 'The admin panel is not set up yet. Add ADMIN_PASSWORD and the three CLOUDINARY_* variables in Vercel (see SETUP.md).' });
  }
  const password = String((req.body && req.body.password) || '');
  if (!password || !safeEqual(password, process.env.ADMIN_PASSWORD)) {
    await delay(900); // slows down password guessing
    return res.status(401).json({ error: 'Wrong password.' });
  }
  return res.status(200).json(makeToken(12));
}
