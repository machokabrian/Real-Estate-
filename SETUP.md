# Setup – Lemways Nest website

About 30 minutes, no coding. You need free accounts on **GitHub**, **Cloudinary** and **Vercel**.

How it fits together: the site is static pages on Vercel. Your listings and settings are one small file stored in Cloudinary, and your photos live in Cloudinary too. The admin panel (`/admin`) edits that file; small server functions in the `api/` folder keep your Cloudinary secret safe.

## 1. Cloudinary (photos + listings)
1. Sign up at cloudinary.com and open the **Dashboard**.
2. Copy three values: **Cloud name**, **API Key**, **API Secret**. Keep the secret private.
3. Nothing else to create – the site makes its own folders (`lemways/properties`, `lemways/team`, `lemways/site`, `lemways/data`) the first time you save.

## 2. GitHub
1. Create a new repository (private is fine) and upload everything in this folder, keeping the folder structure (`api/`, `scripts/`, `data/` included).
2. Do not upload a `.env` file. `.env.example` only lists the names you need.

## 3. Vercel
1. At vercel.com choose **Add New → Project** and import the repository. Leave the build settings alone – `vercel.json` already sets them.
2. Before pressing Deploy, open **Environment Variables** and add:

| Name | Value |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | from step 1 |
| `CLOUDINARY_API_KEY` | from step 1 |
| `CLOUDINARY_API_SECRET` | from step 1 |
| `ADMIN_PASSWORD` | a long password you will type at `/admin` |
| `ADMIN_SECRET` | any long random text (e.g. 40 random characters) |

3. Press **Deploy**. Your site will be at `https://<project-name>.vercel.app`.
4. Open `https://<project-name>.vercel.app/admin`, sign in, and you will see six **sample** listings. Edit or delete them, add your real ones with photos, then press **Save & publish**.

## 4. Make it yours
- **Admin → Site settings:** phones, WhatsApp number, email, address, hours, social links, About text, and optional hero/About photos.
- **Admin → Team:** add your agents. Visitors can then pick an agent on each property page, and WhatsApp/call buttons go to that person.
- **Admin → Client reviews:** only add real reviews, with the client's permission. Both sections stay hidden until you add someone.
- `config.js` holds the defaults and rarely-changed settings (see step 7).
- Replace `logo.svg` with your real logo (or add `logo.png` and set `logo: "/logo.png"` in `config.js`). The page markup references `/logo.svg`; if you use a PNG, search for `logo.svg` and update it.
- Add **`og-image.jpg`** (1200 × 630) next to `index.html` – the picture shown when your link is shared on WhatsApp or Facebook.

## 5. Check it works
Visit your site and `/sitemap.xml` (it should list a page per property). Open a property page, tap the WhatsApp button, send a test enquiry from the contact form, and try everything once on your phone.

## 6. Automatic rebuilds (recommended)
Each property gets its own page for Google, built on every deploy. New listings work immediately without it (they load live), but with a deploy hook the pages and sitemap refresh automatically every time you press Save & publish:
1. Vercel → your project → **Settings → Git → Deploy Hooks** → create one (name it `admin`, branch `main`) and copy the URL.
2. Add it as the environment variable `VERCEL_DEPLOY_HOOK_URL`, then **Redeploy** once.

## 7. Your own domain
Buy a domain (e.g. `lemwaysnest.co.ke`), add it in Vercel → **Settings → Domains**, then change `siteUrl` in `config.js` (or set a `SITE_URL` variable) and redeploy. Submit `https://<your-domain>/sitemap.xml` in Google Search Console.

## 8. Contact form email backup (optional)
By default the form opens WhatsApp with the message ready to send. To also get emails: make a free form at formspree.io and paste its URL into `formEndpoint` in `config.js`.

## 9. Analytics (optional)
Put a Google Analytics ID (`G-…`) and/or Meta Pixel ID in `config.js`. They only load after a visitor accepts the cookie notice, which appears automatically when an ID is set.

## Changing things later
- **Listings, photos, text, team, reviews:** `/admin`, then Save & publish.
- **Design or code:** edit the files in GitHub; Vercel redeploys on its own.

## Troubleshooting
- **"The admin panel is not set up yet"** – one of the five variables in step 3 is missing; add it and redeploy.
- **Wrong password** – check `ADMIN_PASSWORD` in Vercel (changes need a redeploy).
- **Photo upload fails** – check the three Cloudinary values. In Cloudinary → Settings → Security, make sure image uploads are not restricted.
- **Photos don't show or look unoptimised** – if you enabled "Strict transformations" in Cloudinary, allow `f_auto`, `q_auto`, `w_*`, `h_*`, `c_fill`, `c_limit` and `g_auto`.
- **A change isn't visible yet** – listings refresh about once a minute; hard-refresh the page.
- **Running locally** – `npm run build` then `npx serve dist` shows the site with sample data. The admin and live data need Vercel (or `npx vercel dev` with the same variables).
- **Privacy policy** – the text in `details.js` is a sensible starting point, not legal advice. Have a Kenyan lawyer review it (and check whether you need to register with the Office of the Data Protection Commissioner).
