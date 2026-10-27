/* ==========================================================================
   Lemways Nest – SITE SETTINGS
   Edit this file for anything that rarely changes. Day-to-day text (phones,
   hours, About text, social links, photos) is easier to change in the admin
   panel (/admin → Site settings); values saved there override the ones here.
   ========================================================================== */
globalThis.LN_CONFIG = {
  brand: "Lemways Nest",
  legalName: "Lemways Nest Ltd",

  // The public address of your site, no trailing slash. Used for the sitemap,
  // share previews and Google. Change it when you connect your own domain
  // (or set a SITE_URL environment variable in Vercel instead).
  siteUrl: "https://www.lemwaysnest.co.ke",

  currency: "KES",
  founded: 2021,
  logo: "/logo.svg",          // replace logo.svg (or point this at /logo.png)
  ogImage: "/og-image.jpg",   // 1200 x 630 picture shown when the link is shared

  // Starting values – the admin panel can override every one of these.
  contact: {
    phones: ["+254 762 840600", "+254 713 854394"],
    whatsapp: "254762840600",            // digits only, with country code
    email: "lemwaysnest@gmail.com",
    address: "Off Muthangari Road, Lavington, Nairobi",
    hours: "Mon–Fri 8:30–17:30, Sat 9:00–13:00",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Muthangari+Road+Lavington+Nairobi"
  },

  social: {
    instagram: "https://www.instagram.com/calvin854394",
    facebook: "https://www.facebook.com/profile.php?id=61558114116767",
    tiktok: ""
  },

  copy: {
    heroTitle: "Property in Nairobi, handled properly.",
    heroText: "We find, sell, let and manage homes and commercial space across the city, working out of our office off Muthangari Road in Lavington.",
    aboutTitle: "Started on one street. Still walking every listing.",
    aboutText: "Lemways Nest Ltd opened in 2021, off Muthangari Road in Lavington. What began as a small team helping neighbours buy and let homes nearby has grown into a full property practice working across Nairobi – without losing the street-level knowledge of the estates where we started.",
    aboutQuote: "We still walk every property we list. If we wouldn't put our own family in it, it doesn't go on the list.",
    coverage: "Lavington, Kilimani, Karen, Runda, Westlands & beyond",
    viewingNote: "Verified listing. Viewing available daily 9am–5pm – please call or WhatsApp to confirm a time. We walk every listing."
  },

  // Email backup for the contact form (free form at https://formspree.io).
  // Leave empty and the form opens WhatsApp with the message pre-filled instead.
  formEndpoint: "",

  // Optional analytics. Only loaded after a visitor accepts the cookie notice.
  analytics: {
    ga4: "",        // e.g. "G-XXXXXXXXXX"
    metaPixel: ""   // e.g. "123456789012345"
  },

  // Leave empty when the site and its /api folder are on the same domain (Vercel).
  apiBase: ""
};
