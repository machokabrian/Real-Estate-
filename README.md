# Lemways Nest Ltd – website

Real estate website for Nairobi. Static pages + a password-protected admin panel, with **Cloudinary** storing both your photos and your listings (no Supabase or other database).

## Files to upload to GitHub (keep the folders)
- `index.html`, `style.css` – home page and design
- `config.js` – **your settings**: contact details, domain, email backup, analytics
- `shared.js` – helpers shared by the site and the build
- `db.js` – loads your listings (live from `/api/listings`, falling back to the last build)
- `script.js`, `details.js`, `extras.js`, `analytics.js` – site logic (listings/filters/forms, privacy policy + cookie notice, favourites/calculator/etc., optional analytics)
- `property.js` – logic for the generated property pages (gallery, agent chooser, lightbox)
- `admin.html`, `admin.js` – the admin panel (sign-in required)
- `api/` – small server functions: `login`, `listings`, `admin-data`, `save`, `sign-upload`, `_lib` (Cloudinary access; your secret stays here)
- `scripts/build-pages.mjs` – creates a page for every property, plus `sitemap.xml` and `robots.txt`
- `data/seed.json` – six sample listings used until you save your own
- `vercel.json`, `package.json` – hosting and build settings
- `404.html`, `robots.txt`, `sitemap.xml`, `logo.svg`, `favicon.svg`
- `og-image.jpg` – **you add this**: a 1200 × 630 picture used when your link is shared on WhatsApp/Facebook
- `.env.example` – the environment variable names (never upload real secrets)

Never published (Vercel only serves the `dist` folder it builds): `SETUP.md`, `data/`, `scripts/`, `api/` source, `vercel.json`.

## Start here
Follow **SETUP.md** (Cloudinary → GitHub → Vercel → `/admin`).

## Before launch checklist
- [ ] SETUP.md steps 1–3 done; sample listings replaced with real listings and real photos
- [ ] Admin → Site settings: real phones, WhatsApp number, email, address, hours, social links, About text (and your own photos if you like)
- [ ] Add `og-image.jpg` (1200 × 630) next to `index.html`; replace `logo.svg` with your real logo
- [ ] Vercel: create a Deploy Hook and set `VERCEL_DEPLOY_HOOK_URL` (SETUP.md step 6), redeploy once, then check `/sitemap.xml`
- [ ] When you get your own domain: add it in Vercel, then change `siteUrl` in `config.js`
- [ ] After launch: submit `https://<your-domain>/sitemap.xml` in Google Search Console
- [ ] Email backup: free form at formspree.io, URL into `formEndpoint` (optional)
- [ ] Analytics IDs (optional)
- [ ] Add real team members and genuine client reviews in the admin (Team and Client reviews tabs); the sections stay hidden until you do
- [ ] Have the privacy policy (built in `details.js`) reviewed by a lawyer

## How the Cloudinary "database" works
Listings, settings, team and reviews are saved as **one JSON file** (`lemways/data/listings.json`, a raw asset). The admin's *Save & publish* overwrites it; the public site reads it through `/api/listings` (cached about a minute). Photos upload straight from the browser to Cloudinary using a short-lived signature, are shrunk first, and are served optimised (`f_auto,q_auto`) at the right size. This suits a small agency (up to a few hundred listings). If you ever outgrow it, only `api/_lib.js` and `db.js` need to change.

## Hosting
Vercel (see SETUP.md). `sitemap.xml` and `robots.txt` are regenerated on every deployment.
