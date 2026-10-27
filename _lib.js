// Shared helpers for the serverless functions (and the build script).
// Your listings live in ONE JSON file stored in Cloudinary as a "raw" asset.
import crypto from 'node:crypto';

export const DATA_ID = process.env.LN_DATA_PUBLIC_ID || 'lemways/data/listings.json';
export const UPLOAD_FOLDERS = ['lemways/properties', 'lemways/team', 'lemways/site'];

export const cloud = () => ({
  name: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  key: (process.env.CLOUDINARY_API_KEY || '').trim(),
  secret: (process.env.CLOUDINARY_API_SECRET || '').trim()
});
export const cloudConfigured = () => !!cloud().name;
export const adminConfigured = () => !!(cloud().key && cloud().secret && process.env.ADMIN_PASSWORD);

/* Cloudinary signature: sha1 of the sorted "key=value" pairs + API secret */
export function sign(params, secret) {
  const str = Object.keys(params).filter((k) => params[k] !== undefined && params[k] !== '')
    .sort().map((k) => k + '=' + params[k]).join('&');
  return crypto.createHash('sha1').update(str + secret).digest('hex');
}

/* ---------- admin sign-in tokens (HMAC, 12 hours) ---------- */
const tokenKey = () => process.env.ADMIN_SECRET || (process.env.ADMIN_PASSWORD || '') + '|' + (process.env.CLOUDINARY_API_SECRET || '');
const b64 = (b) => Buffer.from(b).toString('base64url');

export function makeToken(hours = 12) {
  const exp = Date.now() + hours * 3600 * 1000;
  const mac = crypto.createHmac('sha256', tokenKey()).update(String(exp)).digest('base64url');
  return { token: exp + '.' + mac, expiresAt: exp };
}
export function verifyToken(token) {
  if (!token || typeof token !== 'string' || !tokenKey().replace('|', '')) return false;
  const [exp, mac] = token.split('.');
  if (!exp || !mac || !(Number(exp) > Date.now())) return false;
  const want = crypto.createHmac('sha256', tokenKey()).update(exp).digest('base64url');
  const a = Buffer.from(mac), b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function requireAdmin(req, res) {
  const h = req.headers['authorization'] || '';
  if (!verifyToken(h.startsWith('Bearer ') ? h.slice(7) : '')) {
    res.status(401).json({ error: 'Please sign in again.' });
    return false;
  }
  return true;
}
export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/* ---------- read the JSON file from Cloudinary ---------- */
async function fetchJSON(url) {
  const r = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
  if (!r.ok) return null;
  try { return await r.json(); } catch (e) { return null; }
}

export async function readData() {
  const c = cloud();
  if (!c.name) return null;
  // 1) With API keys, ask Cloudinary for the newest version so we never read a stale CDN copy.
  if (c.key && c.secret) {
    try {
      const auth = Buffer.from(c.key + ':' + c.secret).toString('base64');
      const r = await fetch('https://api.cloudinary.com/v1_1/' + c.name + '/resources/raw/upload/' + DATA_ID.split('/').map(encodeURIComponent).join('/'),
        { headers: { authorization: 'Basic ' + auth }, cache: 'no-store' });
      if (r.ok) {
        const info = await r.json();
        const d = info.secure_url ? await fetchJSON(info.secure_url) : null;
        if (d) return d;
      }
    } catch (e) { /* fall through to the public URL */ }
  }
  // 2) Public URL (may lag a minute or two behind after an update).
  return fetchJSON('https://res.cloudinary.com/' + c.name + '/raw/upload/' + DATA_ID + '?_=' + Date.now());
}

/* ---------- write the JSON file to Cloudinary ---------- */
export async function writeData(data) {
  const c = cloud();
  if (!c.name || !c.key || !c.secret) throw new Error('Cloudinary keys are missing on the server.');
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { invalidate: 'true', overwrite: 'true', public_id: DATA_ID, timestamp };
  const form = new FormData();
  form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }), 'listings.json');
  Object.entries(params).forEach(([k, v]) => form.append(k, String(v)));
  form.append('api_key', c.key);
  form.append('signature', sign(params, c.secret));
  const r = await fetch('https://api.cloudinary.com/v1_1/' + c.name + '/raw/upload', { method: 'POST', body: form });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || 'Cloudinary refused the save (' + r.status + ').');
  return j;
}

export const delay = (ms) => new Promise((r) => setTimeout(r, ms));
