/* Optional analytics (Google Analytics 4 / Meta Pixel).
   Nothing loads until the visitor accepts the cookie notice (see details.js). */
(function (g) {
  'use strict';
  const LN = g.LN || (g.LN = {});
  const a = (g.LN_CONFIG && g.LN_CONFIG.analytics) || {};
  let loaded = false;

  const consent = () => { try { return localStorage.getItem('ln_consent'); } catch (e) { return null; } };

  function load() {
    if (loaded) return; loaded = true;
    if (a.ga4) {
      const s = document.createElement('script');
      s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(a.ga4);
      document.head.appendChild(s);
      g.dataLayer = g.dataLayer || [];
      g.gtag = function () { g.dataLayer.push(arguments); };
      g.gtag('js', new Date());
      g.gtag('config', a.ga4, { anonymize_ip: true });
    }
    if (a.metaPixel) {
      /* eslint-disable */
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0;
        t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(g, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      /* eslint-enable */
      g.fbq('init', a.metaPixel); g.fbq('track', 'PageView');
    }
  }

  LN.analyticsEnabled = !!(a.ga4 || a.metaPixel);
  LN.track = function (name, params) {
    try {
      if (g.gtag) g.gtag('event', name, params || {});
      if (g.fbq && /whatsapp|call|enquiry/.test(name)) g.fbq('track', 'Contact');
    } catch (e) { /* analytics must never break the site */ }
  };

  if (consent() === 'yes') load();
  document.addEventListener('ln:consent', (e) => { if (e.detail === 'yes') load(); });
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-track]');
    if (t) LN.track(t.getAttribute('data-track'), { page: location.pathname });
  });
})(globalThis);
