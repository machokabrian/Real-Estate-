// ===== LEMWAYS NEST - PERFECTED MODERN JS (COMPACT NAV + AGENT PICKER) =====
document.addEventListener('DOMContentLoaded', () => {

  // Year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ===== NAVIGATION - COMPACT PILL + DROPDOWN =====
  const header = document.getElementById('siteHeader');
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('mainNav');
  const navOverlay = document.getElementById('navOverlay');

  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  const openNav = () => {
    if (!nav || !toggle) return;
    nav.classList.add('is-open');
    toggle.classList.add('is-active');
    toggle.setAttribute('aria-expanded', 'true');
    if (navOverlay) navOverlay.classList.add('is-open');
  };
  const closeNav = () => {
    if (!nav || !toggle) return;
    nav.classList.remove('is-open');
    toggle.classList.remove('is-active');
    toggle.setAttribute('aria-expanded', 'false');
    if (navOverlay) navOverlay.classList.remove('is-open');
  };

  if (toggle && nav) {
    toggle.addEventListener('click', e => {
      e.stopPropagation();
      nav.classList.contains('is-open') ? closeNav() : openNav();
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
    document.addEventListener('click', e => {
      if (nav.classList.contains('is-open') && !nav.contains(e.target) && !toggle.contains(e.target)) closeNav();
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 820) closeNav(); });
  }
  if (navOverlay) navOverlay.addEventListener('click', closeNav);

  // ===== FILTERS =====
  const buttons = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.property-card');
  if (buttons.length && cards.length) {
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const f = btn.dataset.filter;
        cards.forEach(card => {
          const match = f === 'all' || card.dataset.category === f;
          card.style.display = match ? 'flex' : 'none';
          if (match) {
            card.style.animation = 'none';
            void card.offsetHeight;
            card.style.animation = 'modalIn .4s ease';
          }
        });
      });
    });
  }

  // ===== AGENTS (visitor chooses) =====
  const agents = [
    { name: 'Agent 1', phone: '254762840600', display: '+254 762 840600', short: 'Agent 1 - Lavington Office' },
    { name: 'Agent 2', phone: '254713854394', display: '+254 713 854394', short: 'Agent 2 - Kilimani Office' }
  ];

  // ===== MODAL + WHATSAPP =====
  const overlay = document.getElementById('modalOverlay');
  const closeBtn = document.getElementById('modalClose');
  const waBtn = document.getElementById('modalWhatsAppBtn');
  const pickerEl = document.getElementById('agentPicker');
  let activeAgent = agents[0];
  let activeCard = null;

  const setText = (id, t) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t;
  };

  const buildMsg = (card, agent) =>
    `Hello ${agent.name} - Lemways Nest\n\nI'm interested in:\n*${card.dataset.title || 'Property'}* (${card.dataset.code || ''})\n${card.dataset.type || ''}\nPrice: ${card.dataset.price || ''}\nLocation: ${card.dataset.location || ''}\n\nLink: ${location.href}\n\nPlease confirm:\n1. Available?\n2. Viewing time?\n3. More photos?\n\nMy name: `;

  const openWA = url => { location.href = url; };

  const directWA = card => {
    if (!card) return;
    const ag = agents[0];
    openWA(`https://wa.me/${ag.phone}?text=${encodeURIComponent(buildMsg(card, ag))}`);
  };

  // Select an agent: updates labels, call button and picker highlight
  const setAgent = i => {
    activeAgent = agents[i] || agents[0];
    const n = agents.indexOf(activeAgent);
    setText('modalAgent', activeAgent.short);
    setText('modalAgentName', activeAgent.name);
    setText('modalAgentNote', activeAgent.name);
    const callBtn = document.getElementById('modalCallBtn');
    if (callBtn) {
      callBtn.href = `tel:+${activeAgent.phone}`;
      callBtn.textContent = `Call ${activeAgent.name}: ${activeAgent.display}`;
    }
    if (pickerEl) {
      pickerEl.querySelectorAll('.agent-opt').forEach((b, k) => {
        b.classList.toggle('is-active', k === n);
        b.setAttribute('aria-checked', k === n ? 'true' : 'false');
      });
    }
  };

  if (pickerEl) {
    pickerEl.innerHTML = '';
    agents.forEach((a, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'agent-opt';
      b.setAttribute('role', 'radio');
      b.innerHTML = `<strong>${a.name}</strong><small>${a.display}</small>`;
      b.addEventListener('click', () => setAgent(i));
      pickerEl.appendChild(b);
    });
  }

  const FALLBACK_IMG = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=900&q=70';

  const openModal = card => {
    if (!card) return;
    if (!overlay) return directWA(card);

    closeNav();
    activeCard = card;

    let mainImg = FALLBACK_IMG;
    try {
      const bg = card.querySelector('.property-image').style.backgroundImage;
      const m = bg.match(/url\(["']?(.*?)["']?\)/);
      if (m && m[1]) mainImg = m[1];
    } catch {}

    const tag = card.querySelector('.tag')?.textContent || 'For sale';
    setText('modalTag', tag);
    setText('modalCode', card.dataset.code || 'LN-000');
    setText('modalCode2', card.dataset.code || 'LN-000');
    setText('modalTitle', card.dataset.title || 'Property');
    setText('modalLoc', card.dataset.location || '');
    setText('modalPrice', card.dataset.price || '');
    setText('modalFullLoc', card.dataset.location || '');
    setText('modalType', card.dataset.type || '');

    setAgent(0); // Agent 1 selected by default; visitor can switch

    const mainImgEl = document.getElementById('modalMainImg');
    const thumbsEl = document.getElementById('modalThumbs');
    if (mainImgEl) mainImgEl.style.backgroundImage = `url('${mainImg}')`;
    if (thumbsEl) {
      thumbsEl.innerHTML = '';
      const imgs = card.dataset.images ? card.dataset.images.split(',') : [mainImg];
      imgs.forEach((img, i) => {
        const clean = img.trim();
        if (!clean) return;
        const d = document.createElement('div');
        d.style.backgroundImage = `url('${clean}')`;
        if (i === 0) d.classList.add('is-active');
        d.addEventListener('click', () => {
          if (mainImgEl) mainImgEl.style.backgroundImage = `url('${clean}')`;
          thumbsEl.querySelectorAll('div').forEach(t => t.classList.remove('is-active'));
          d.classList.add('is-active');
        });
        thumbsEl.appendChild(d);
      });
    }

    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeNav();
      closeModal();
    }
  });

  cards.forEach(card => card.addEventListener('click', () => openModal(card)));

  // WhatsApp Button (uses the agent the visitor selected)
  if (waBtn) {
    waBtn.addEventListener('click', e => {
      e.preventDefault();
      if (!activeCard) return;

      const url = `https://wa.me/${activeAgent.phone}?text=${encodeURIComponent(buildMsg(activeCard, activeAgent))}`;
      const orig = waBtn.innerHTML;

      waBtn.textContent = 'Opening WhatsApp...';
      waBtn.disabled = true;

      try {
        fetch('contact.php', {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            name: `WA - ${activeCard.dataset.title || ''}`,
            email: 'wa@lead.com',
            interest: `${activeCard.dataset.type || ''} | ${activeCard.dataset.code || ''} | ${activeAgent.name}`,
            message: `Lead -> ${activeAgent.phone} for ${activeCard.dataset.code || ''}`
          })
        }).catch(() => {});
      } catch {}

      openWA(url);

      setTimeout(() => {
        waBtn.innerHTML = orig;
        waBtn.disabled = false;
        closeModal();
      }, 1000);
    });
  }

  // ===== CONTACT FORM =====
  const form = document.getElementById('contactForm');
  const note = document.getElementById('formNote');
  if (form && note) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (!btn) return;
      const orig = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;
      note.textContent = '';
      try {
        const res = await fetch('contact.php', { method: 'POST', body: new FormData(form) });
        const txt = await res.text();
        let data; try { data = JSON.parse(txt); } catch { data = { ok: false, msg: txt }; }
        note.style.color = data.ok ? '#193226' : '#a33';
        if (data.ok) {
          note.innerHTML = data.msg + (data.whatsapp ? `<br><br><a href="${data.whatsapp}" target="_blank" rel="noopener" style="text-decoration:underline;font-weight:600">Continue on WhatsApp →</a>` : '');
          form.reset();
        } else {
          note.textContent = data.msg || 'Error sending';
        }
      } catch {
        note.textContent = 'Could not send. Call us +254 762 840600';
        note.style.color = '#a33';
      } finally {
        btn.textContent = orig;
        btn.disabled = false;
      }
    });
  }

});
