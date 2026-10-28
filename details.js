/* Privacy policy, terms and the cookie notice.
   >>> Have the policy text below reviewed by a lawyer before launch. <<< */
(function (g) {
  'use strict';
  const LN = g.LN, doc = document;
  const esc = LN.esc;

  function privacy(s) {
    return '<h2>Privacy policy</h2>' +
      '<p><em>Last updated: ' + new Date().toLocaleDateString('en-KE', { month: 'long', year: 'numeric' }) + '</em></p>' +
      '<p><strong>Who we are.</strong> ' + esc(s.legalName) + ' (“we”, “us”) is a real estate company based at ' + esc(s.address) + '. We are the data controller for personal data collected through this website.</p>' +
      '<h3>What we collect</h3><ul>' +
      '<li>Details you send us through the contact form or WhatsApp: name, email, phone number, the service you are interested in and your message.</li>' +
      '<li>Saved properties, which stay on your own device (in your browser) and are not sent to us.</li>' +
      '<li>Only if you accept the cookie notice: anonymous visit statistics from Google Analytics and/or Meta Pixel, where we have enabled them.</li></ul>' +
      '<h3>How we use it</h3><p>To answer your enquiry, arrange viewings, provide the property services you ask for, and improve the website. We do not sell your personal data.</p>' +
      '<h3>Lawful basis</h3><p>Your consent (for example when you contact us or accept cookies), our legitimate interest in running and improving our business, and steps needed before entering into a contract with you – in line with the Data Protection Act, 2019 (Kenya).</p>' +
      '<h3>Who we share it with</h3><p>Service providers that help us run the site: our hosting provider (Vercel), our image host (Cloudinary), our contact-form provider (Formspree, if enabled), Google Maps (the maps on this site load from Google, which may receive your IP address), WhatsApp / Meta, and analytics providers if you accept cookies. They process data on our behalf or under their own privacy terms. Some of them are located outside Kenya.</p>' +
      '<h3>How long we keep it</h3><p>Enquiries are kept only for as long as needed to deal with them and for our records, and are then deleted.</p>' +
      '<h3>Your rights</h3><p>You can ask to see, correct or delete the personal data we hold about you, withdraw your consent, or object to certain uses, by contacting us' +
      (s.email ? ' at <a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a>' : '') +
      '. You also have the right to complain to the Office of the Data Protection Commissioner (Kenya).</p>' +
      '<h3>Cookies</h3><p>The site works without cookies. Optional analytics cookies are used only after you accept them, and you can change your mind at any time by clearing this site’s data in your browser.</p>';
  }

  function terms(s) {
    return '<h2>Terms of use</h2>' +
      '<p>By using this website you agree to these terms.</p>' +
      '<h3>Listings</h3><p>We take care to keep listings accurate and up to date, but prices, availability, sizes and descriptions can change and may contain errors. Listings are an invitation to enquire, not an offer capable of acceptance. Please confirm details with us before making any decision or payment, and always carry out your own due diligence, including title searches, on any property.</p>' +
      '<h3>Viewings and payments</h3><p>Viewings are arranged through ' + esc(s.legalName) + ' only. Do not send money to anyone who is not verified by us; we will never ask you to pay a deposit before you have viewed a property and received written terms.</p>' +
      '<h3>Our content</h3><p>The text, photographs and design on this site belong to ' + esc(s.legalName) + ' or its licensors. Please do not copy or reuse them without our written permission.</p>' +
      '<h3>Liability</h3><p>To the extent the law allows, we are not responsible for loss arising from your reliance on the information on this website. Nothing here limits liability that cannot be limited by law.</p>' +
      '<h3>Contact</h3><p>' + esc(s.legalName) + ', ' + esc(s.address) + '.</p>';
  }

  let dlg;
  function open(kind) {
    const site = LN.siteSettings(g.__LN_DATA__ || null);
    if (!dlg) {
      dlg = doc.createElement('dialog');
      dlg.className = 'modal';
      dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
      doc.body.appendChild(dlg);
    }
    dlg.innerHTML = '<button class="modal-x" type="button" data-close aria-label="Close">×</button><div class="modal-body prose">' +
      (kind === 'terms' ? terms(site) : privacy(site)) + '</div>';
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }
  LN.legal = { open };
  doc.addEventListener('click', (e) => {
    const a = e.target.closest('[data-legal]');
    if (a) { e.preventDefault(); open(a.getAttribute('data-legal')); }
  });

  /* cookie notice – only when analytics is switched on in config.js */
  function cookieNotice() {
    if (!LN.analyticsEnabled) return;
    let c = null;
    try { c = localStorage.getItem('ln_consent'); } catch (e) { return; }
    if (c) return;
    const bar = doc.createElement('div');
    bar.className = 'cookie'; bar.setAttribute('role', 'dialog'); bar.setAttribute('aria-label', 'Cookie notice');
    bar.innerHTML = '<p>We use optional analytics cookies to see which pages are useful. Nothing loads unless you accept. <a href="#" data-legal="privacy">Privacy policy</a></p>' +
      '<div><button class="btn btn-ghost btn-sm" type="button" data-c="no">Decline</button> <button class="btn btn-gold btn-sm" type="button" data-c="yes">Accept</button></div>';
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      const v = b.getAttribute('data-c');
      try { localStorage.setItem('ln_consent', v); } catch (err) { /* ignore */ }
      doc.dispatchEvent(new CustomEvent('ln:consent', { detail: v }));
      bar.remove();
    });
    doc.body.appendChild(bar);
  }
  cookieNotice();
})(globalThis);
