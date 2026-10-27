// Runs on every Vercel deploy (see vercel.json).
//  1. reads your listings from Cloudinary (or data/seed.json if nothing is saved yet)
//  2. publishes the site into ./dist
//  3. writes a real, Google-friendly page for every property, plus sitemap.xml and robots.txt
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readData, cloudConfigured } from '../api/_lib.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

await import(pathToFileURL(path.join(root, 'config.js')).href);
await import(pathToFileURL(path.join(root, 'shared.js')).href);
const LN = globalThis.LN;
const cfg = globalThis.LN_CONFIG;
const esc = LN.esc;

const siteUrl = (process.env.SITE_URL || cfg.siteUrl || '').trim().replace(/\/+$/, '');
const exists = (p) => fs.access(p).then(() => true, () => false);
const fill = (s) => s.replaceAll('%SITE_URL%', siteUrl);

/* ---------- 1. data ---------- */
let raw = null, source = 'sample data (data/seed.json)';
if (cloudConfigured()) {
  try {
    raw = await readData();
    if (raw) source = 'Cloudinary'; else console.warn('! Cloudinary is configured but no listings are saved there yet – using the sample data.');
  } catch (e) { console.warn('! Could not read Cloudinary (' + e.message + ') – using the sample data.'); }
} else {
  console.warn('! CLOUDINARY_CLOUD_NAME is not set – building with the sample data.');
}
if (!raw) raw = JSON.parse(await fs.readFile(path.join(root, 'data', 'seed.json'), 'utf8'));
const data = LN.normalizeData(raw);
data.listings = data.listings.filter((l) => l.published);
const site = LN.siteSettings(data);

/* ---------- 2. copy the static files ---------- */
await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(path.join(dist, 'property'), { recursive: true });
await fs.mkdir(path.join(dist, 'data'), { recursive: true });

const staticFiles = ['index.html', 'admin.html', '404.html', 'style.css', 'config.js', 'shared.js', 'db.js', 'script.js',
  'details.js', 'extras.js', 'analytics.js', 'property.js', 'admin.js', 'logo.svg', 'favicon.svg', 'logo.png', 'og-image.jpg', 'og-image.png'];
for (const f of staticFiles) {
  const src = path.join(root, f);
  if (!(await exists(src))) {
    if (f === 'og-image.jpg') console.warn('! og-image.jpg is missing – add a 1200x630 picture next to index.html for nice WhatsApp/Facebook previews.');
    continue;
  }
  if (/\.(html|css|js|svg|xml|txt)$/.test(f)) await fs.writeFile(path.join(dist, f), fill(await fs.readFile(src, 'utf8')));
  else await fs.copyFile(src, path.join(dist, f));
}
if (await exists(path.join(root, 'assets'))) await fs.cp(path.join(root, 'assets'), path.join(dist, 'assets'), { recursive: true });

await fs.writeFile(path.join(dist, 'data', 'listings.json'), JSON.stringify({ ...data, builtAt: new Date().toISOString() }));

/* ---------- 3. property pages ---------- */
const jsonLd = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

const header = `<div class="topbar"><div class="wrap"><span data-bind="address">${esc(site.address)}</span><span class="topbar-r"><a data-href="tel:{phone1Tel}" data-bind="phone1" href="tel:${esc(site.phone1Tel)}">${esc(site.phone1)}</a> <a data-href="tel:{phone2Tel}" data-bind="phone2" data-hide-empty href="tel:${esc(site.phone2Tel)}"${site.phone2 ? '' : ' hidden'}>${esc(site.phone2)}</a></span></div></div>
<header class="site-header"><div class="wrap bar"><a class="brand" href="/"><img src="/logo.svg" alt="" width="40" height="40"><span>Lemways <b>Nest</b></span></a>
<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav" aria-label="Menu"><span></span></button>
<nav class="site-nav" id="nav" aria-label="Main"><a href="/#properties">Properties</a><a href="/#services">Services</a><a href="/#about">About</a><a href="/#contact">Contact</a><a class="btn btn-gold btn-sm" href="/#contact">Talk to an agent</a></nav></div></header>`;

const footer = `<footer class="site-footer"><div class="wrap foot">
<div><a class="brand" href="/"><img src="/logo.svg" alt="" width="36" height="36"><span>Lemways <b>Nest</b></span></a><p>Registered in Kenya. Founded <span data-bind="founded">${esc(site.founded)}</span>.<br><span data-bind="address">${esc(site.address)}</span></p></div>
<div><h4>Site</h4><a href="/#properties">Properties</a><a href="/#services">Services</a><a href="/#about">About</a><a href="/#contact">Contact</a></div>
<div><h4>Follow</h4><a data-href="{tiktok}" data-hide-empty target="_blank" rel="noopener" href="#" hidden>TikTok</a><a data-href="{instagram}" data-hide-empty target="_blank" rel="noopener" href="#" hidden>Instagram</a><a data-href="{facebook}" data-hide-empty target="_blank" rel="noopener" href="#" hidden>Facebook</a></div>
<div><h4>Legal</h4><a href="#" data-legal="privacy">Privacy policy</a><a href="#" data-legal="terms">Terms of use</a></div>
</div><div class="wrap legal"><span>© <span data-year>${new Date().getFullYear()}</span> ${esc(site.legalName)}. All rights reserved.</span><span>Built in Lavington</span></div></footer>
<a class="wa-float" data-href="https://wa.me/{whatsapp}" data-hide-empty data-track="whatsapp_click" target="_blank" rel="noopener" aria-label="Chat on WhatsApp" href="${esc(LN.waLink(site.whatsapp) || '#')}"${site.whatsapp ? '' : ' hidden'}><svg viewBox="0 0 32 32" width="28" height="28" fill="currentColor" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11 19.800L3 29l6.400-2A13 13 0 1 0 16 3zm0 2.400a10.600 10.600 0 1 1-5.600 19.600l-.4-.2-3.800 1.200 1.200-3.700-.3-.4A10.600 10.600 0 0 1 16 5.400zm-4 5.300c-.3 0-.7.100-1 .5-.4.400-1.300 1.300-1.300 3.100s1.300 3.600 1.500 3.800c.2.300 2.600 4.100 6.400 5.600 3.200 1.200 3.800 1 4.500.9.700-.1 2.200-.9 2.500-1.800.3-.9.300-1.600.2-1.800-.1-.2-.3-.3-.7-.5l-2.300-1.100c-.3-.1-.5-.2-.8.200l-1 1.200c-.2.200-.4.300-.7.100-.4-.2-1.400-.5-2.700-1.600-1-.9-1.600-2-1.800-2.300-.2-.4 0-.5.200-.7l.5-.6.300-.5c.1-.2 0-.4 0-.5l-1-2.500c-.2-.6-.5-.5-.7-.5z"/></svg></a>
<script src="/config.js"></script><script src="/shared.js"></script><script src="/db.js"></script><script src="/analytics.js"></script><script src="/extras.js"></script><script src="/details.js"></script><script src="/property.js"></script>`;

function page({ title, description, canonical, image, robots, ld, slug, main }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#193226">
${robots ? `<meta name="robots" content="${robots}">` : ''}
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website"><meta property="og:site_name" content="Lemways Nest">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
${ld ? `<script type="application/ld+json">${jsonLd(ld)}</script>` : ''}
</head>
<body class="page-property" data-slug="${esc(slug)}">
${header}
<main class="wrap" id="listing-root">${main}</main>
${footer}
</body></html>`;
}

const abs = (u) => (/^https?:/.test(u) ? u : siteUrl + u);
const defaultOg = abs(cfg.ogImage || '/og-image.jpg');
const ctx = { site, data };

for (const l of data.listings) {
  const url = `${siteUrl}/property/${l.slug}`;
  const plain = String(l.description || '').replace(/\s+/g, ' ').trim();
  const description = (plain ? plain.slice(0, 155) + (plain.length > 155 ? '…' : '') : `${l.title} in ${l.location || 'Nairobi'} – ${LN.priceText(l)}.`);
  const image = l.images[0] ? LN.imgUrl(l.images[0], 1200, 630) : defaultOg;
  const ld = {
    '@context': 'https://schema.org', '@type': 'RealEstateListing', name: l.title, description: plain || description, url,
    image: l.images.slice(0, 6).map((u) => LN.imgUrl(u, 1200)),
    ...(l.createdAt ? { datePosted: l.createdAt } : {}),
    offers: { '@type': 'Offer', price: l.price || undefined, priceCurrency: cfg.currency || 'KES', availability: 'https://schema.org/InStock' },
    contentLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: l.location || 'Nairobi', addressRegion: 'Nairobi', addressCountry: 'KE' } }
  };
  const html = page({
    title: `${l.title} – ${LN.STATUS[l.status]} in ${l.location || 'Nairobi'} | Lemways Nest`,
    description, canonical: url, image, ld, slug: l.slug, main: LN.propertyHTML(l, ctx)
  });
  await fs.writeFile(path.join(dist, 'property', `${l.slug}.html`), html);
}

// Fallback for listings added after the last build: vercel.json rewrites unknown /property/<slug> here.
await fs.writeFile(path.join(dist, 'listing.html'), page({
  title: 'Property – Lemways Nest', description: 'Property details from Lemways Nest Ltd, Nairobi.', canonical: '', image: defaultOg,
  robots: 'noindex', slug: '', main: '<p class="empty">Loading property…</p>'
}));

/* ---------- 4. sitemap + robots ---------- */
const urls = [{ loc: siteUrl + '/', lastmod: data.updatedAt }].concat(data.listings.map((l) => ({ loc: `${siteUrl}/property/${l.slug}`, lastmod: data.updatedAt })));
await fs.writeFile(path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`).join('\n') + '\n</urlset>\n');
await fs.writeFile(path.join(dist, 'robots.txt'), fill(await fs.readFile(path.join(root, 'robots.txt'), 'utf8')));

const samples = data.listings.filter((l) => l.sample).length;
console.log(`✓ Built ${data.listings.length} property page(s) from ${source}. Site URL: ${siteUrl}`);
if (samples) console.warn(`! ${samples} sample listing(s) are still published – replace them in /admin before launch.`);
