/* ==========================================================================
   Kolac Digital – Main JavaScript
   ========================================================================== */

(function () {
  'use strict';

  let siteData = null;

  /* ---------- 1. Load Content JSON ---------- */
  async function loadContent() {
    try {
      const res = await fetch('content/site.json');
      if (!res.ok) throw new Error('Failed to load site.json');
      siteData = await res.json();
      renderContent();
      initAfterRender();
    } catch (err) {
      console.error('Content loading error:', err);
      // Fallback: page still works with HTML defaults
      initAfterRender();
    }
  }

  /* ---------- 2. Render Content ---------- */
  function renderContent() {
    if (!siteData) return;

    // Nav logo
    setLogo('.nav-logo', siteData.site.logo);
    setLogo('.footer-logo', siteData.site.logo);

    // Hero
    renderHero();

    // Leistungen
    renderLeistungen();

    // About
    renderAbout();

    // Referenzen
    renderReferenzen();

    // Kundenstimmen
    renderKundenstimmen();

    // Kontakt
    renderKontakt();

    // Footer
    const footerCopy = document.querySelector('.footer-copy');
    if (footerCopy) footerCopy.textContent = siteData.footer.copyright;
  }

  function setLogo() {
    // Logo is now an <img> element set in HTML – no dynamic rendering needed
  }

  function renderHero() {
    const d = siteData.hero;

    // Single headline element for typewriter effect
    const wrapper = document.querySelector('.hero-headline-wrapper');
    if (wrapper) {
      wrapper.innerHTML = '';
      const h1 = document.createElement('h1');
      h1.className = 'hero-headline';
      h1.dataset.headlines = JSON.stringify(d.rotatingHeadlines);
      wrapper.appendChild(h1);
    }

    // Subline
    const subline = document.querySelector('.hero-subline');
    if (subline) subline.textContent = d.subline;

    // Buttons
    const btnPrimary = document.querySelector('.hero-btn-primary');
    if (btnPrimary) btnPrimary.textContent = d.buttonPrimary;

    const btnSecondary = document.querySelector('.hero-btn-secondary');
    if (btnSecondary) btnSecondary.textContent = d.buttonSecondary;
  }

  function renderLeistungen() {
    const d = siteData.leistungen;

    const label = document.querySelector('.leistungen .section-label');
    if (label) label.innerHTML = `<span></span>${d.label}`;

    const headline = document.querySelector('.leistungen .section-headline');
    if (headline) headline.textContent = d.headline;

    const intro = document.querySelector('.leistungen .section-subline');
    if (intro) intro.textContent = d.intro;

    // Service cards
    const grid = document.querySelector('.services-grid');
    if (grid) {
      grid.innerHTML = '';
      d.services.forEach((service, i) => {
        const card = document.createElement('div');
        const featuredClass = service.featured ? ' service-card-featured' : '';
        card.className = `service-card reveal reveal-delay-${i + 1}${featuredClass}`;
        const linkHTML = service.link
          ? `<a href="${service.link}" class="service-card-link">${service.linkText || 'Mehr erfahren'} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>`
          : '';
        card.innerHTML = `
          <div class="service-icon">${getServiceIcon(service.icon)}</div>
          <h3>${service.title}</h3>
          <p>${service.description}</p>
          <ul class="service-features">
            ${service.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
          ${linkHTML}
        `;
        grid.appendChild(card);
      });
    }

    const extraText = document.querySelector('.leistungen-extra-text');
    if (extraText) extraText.textContent = d.extra;
  }

  function getServiceIcon(type) {
    const icons = {
      monitor: `<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
      search: `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><circle cx="11" cy="11" r="3" stroke-dasharray="2 2"/></svg>`,
      video: `<svg viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`
    };
    return icons[type] || icons.monitor;
  }

  function renderAbout() {
    const d = siteData.about;

    const label = document.querySelector('.about .section-label');
    if (label) label.innerHTML = `<span></span>${d.label}`;

    const headline = document.querySelector('.about .section-headline');
    if (headline) headline.textContent = d.headline;

    // Image
    const imgContainer = document.querySelector('.about-image');
    if (imgContainer) {
      const img = document.createElement('img');
      img.src = d.image;
      img.alt = 'Kolac Digital Team';
      img.onerror = function () {
        this.style.display = 'none';
        const ph = document.createElement('div');
        ph.className = 'about-image-placeholder';
        ph.textContent = 'Bild folgt';
        imgContainer.appendChild(ph);
      };
      imgContainer.appendChild(img);
    }

    // Text
    const textContainer = document.querySelector('.about-text');
    if (textContainer) {
      const textHTML = d.text.map(p => `<p>${p}</p>`).join('');
      const tagsHTML = d.tags.map(t => `<span class="about-tag">${t}</span>`).join('');
      const ctaHTML = d.cta
        ? `<a href="${d.cta.link}" class="about-cta-btn">${d.cta.text} <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>`
        : '';
      textContainer.innerHTML = `
        <div class="section-label"><span></span>${d.label}</div>
        <h2 class="section-headline">${d.headline}</h2>
        ${textHTML}
        <div class="about-tags">${tagsHTML}</div>
        ${ctaHTML}
      `;
    }
  }

  function renderReferenzen() {
    const d = siteData.referenzen;

    const label = document.querySelector('.referenzen .section-label');
    if (label) label.innerHTML = `<span></span>${d.label}`;

    const headline = document.querySelector('.referenzen .section-headline');
    if (headline) headline.textContent = d.headline;

    const subline = document.querySelector('.referenzen .section-subline');
    if (subline) subline.textContent = d.subline;

    const grid = document.querySelector('.referenzen-grid');
    if (!grid) return;

    grid.innerHTML = '';
    d.projects.forEach((project, i) => {
      const card = document.createElement('div');
      card.className = `ref-card reveal reveal-delay-${(i % 4) + 1}`;

      const wrapLink = (html, href) => href
        ? `<a href="${href}" target="_blank" rel="noopener" class="mockup-clickable">${html}</a>`
        : html;

      let mockupHTML;
      if (project.mockupType === 'phone-app') {
        mockupHTML = `<div class="ref-mockup ref-mockup-phone-app">
            ${wrapLink(`<div class="ref-mockup-phone ref-mockup-elem">
              <div class="mockup-notch"></div>
              <div class="mockup-screen">
                <img src="${project.mockupImage}" alt="${project.company} TikTok" onerror="this.style.display='none'">
              </div>
            </div>`, project.socialLink)}
            ${wrapLink(`<div class="ref-mockup-app-icon ref-mockup-elem">
              <img src="${project.mockupImageApp}" alt="${project.company} App">
            </div>`, project.link)}
          </div>`;
      } else if (project.mockupType === 'both') {
        mockupHTML = `<div class="ref-mockup ref-mockup-dual">
            ${wrapLink(`<div class="ref-mockup-browser">
              <div class="mockup-bar">
                <span class="mockup-bar-dot"></span>
                <span class="mockup-bar-dot"></span>
                <span class="mockup-bar-dot"></span>
              </div>
              <div class="mockup-screen">
                <img src="${project.mockupImage}" alt="${project.company} Website" onerror="this.style.display='none'">
              </div>
            </div>`, project.link)}
            ${wrapLink(`<div class="ref-mockup-phone ref-mockup-phone-overlay">
              <div class="mockup-notch"></div>
              <div class="mockup-screen">
                <img src="${project.mockupImagePhone}" alt="${project.company} Social Media" onerror="this.style.display='none'">
              </div>
            </div>`, project.socialLink)}
          </div>`;
      } else if (project.mockupType === 'phone') {
        mockupHTML = `<div class="ref-mockup">
            ${wrapLink(`<div class="ref-mockup-phone">
              <div class="mockup-notch"></div>
              <div class="mockup-screen">
                <img src="${project.mockupImage}" alt="${project.company}" onerror="this.style.display='none'">
              </div>
            </div>`, project.socialLink)}
          </div>`;
      } else {
        mockupHTML = `<div class="ref-mockup">
            ${wrapLink(`<div class="ref-mockup-browser">
              <div class="mockup-bar">
                <span class="mockup-bar-dot"></span>
                <span class="mockup-bar-dot"></span>
                <span class="mockup-bar-dot"></span>
              </div>
              <div class="mockup-screen">
                <img src="${project.mockupImage}" alt="${project.company}" onerror="this.style.display='none'">
              </div>
            </div>`, project.link)}
          </div>`;
      }

      const servicesHTML = project.services.map(s => `<li>${s}</li>`).join('');

      const icons = {
        tiktok: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.05a8.15 8.15 0 0 0 4.77 1.52V7.12a4.85 4.85 0 0 1-1-.43z"/></svg>`,
        instagram: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
        website: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
        shop: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
        app: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
      };

      const linkHTML = project.link
        ? `<a href="${project.link}" target="_blank" rel="noopener" class="ref-link ref-link-${project.linkIcon || 'website'}">${icons[project.linkIcon || 'website'] || ''} ${project.linkText}</a>`
        : '';
      const socialLinkHTML = project.socialLink
        ? `<a href="${project.socialLink}" target="_blank" rel="noopener" class="ref-link ref-link-${project.socialIcon}">${icons[project.socialIcon] || ''} ${project.socialLinkText}</a>`
        : '';

      card.innerHTML = `
        ${mockupHTML}
        <div class="ref-content">
          <span class="ref-tag">${project.tag}</span>
          <h3 class="ref-company">${project.company}</h3>
          <ul class="ref-services">${servicesHTML}</ul>
          <div class="ref-keywin">
            <div class="ref-keywin-label">Key Win</div>
            <div class="ref-keywin-text">${project.keyWin}</div>
          </div>
          <div class="ref-links">
            ${linkHTML}
            ${socialLinkHTML}
          </div>
        </div>
      `;

      grid.appendChild(card);
    });

    // CTA button after grid
    const ctaWrap = document.createElement('div');
    ctaWrap.className = 'ref-cta-wrap reveal';
    ctaWrap.innerHTML = `<a href="#kontakt" class="ref-cta-btn">Vielleicht dein Projekt als nächstes? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>`;
    grid.parentElement.appendChild(ctaWrap);
  }

  function renderKontakt() {
    const d = siteData.kontakt;

    const label = document.querySelector('.kontakt-info .section-label');
    if (label) label.innerHTML = `<span></span>${d.label}`;

    const headline = document.querySelector('.kontakt-info .section-headline');
    if (headline) headline.textContent = d.headline;

    const subline = document.querySelector('.kontakt-info .section-subline');
    if (subline) subline.textContent = d.subline;

    const emailEl = document.querySelector('.kontakt-email');
    if (emailEl) {
      emailEl.textContent = d.email;
      emailEl.href = `mailto:${d.email}`;
    }

    const phoneEl = document.querySelector('.kontakt-phone');
    if (phoneEl) {
      phoneEl.textContent = d.phone;
      phoneEl.href = `tel:${d.phone.replace(/\s/g, '')}`;
    }

    const submitBtn = document.querySelector('.form-submit');
    if (submitBtn) submitBtn.textContent = d.formButton;
  }

  function renderKundenstimmen() {
    if (!siteData.kundenstimmen) return;
    const d = siteData.kundenstimmen;

    const label = document.querySelector('.kundenstimmen .section-label');
    if (label) label.innerHTML = `<span></span>${d.label}`;

    const headline = document.querySelector('.kundenstimmen .section-headline');
    if (headline) headline.textContent = d.headline;

    const subline = document.querySelector('.kundenstimmen .section-subline');
    if (subline) subline.textContent = d.subline;

    const track = document.querySelector('.testimonial-track');
    if (!track) return;

    track.innerHTML = '';
    d.testimonials.forEach((t) => {
      const card = document.createElement('div');
      card.className = 'testimonial-card';

      const initial = t.name.charAt(0).toUpperCase();
      const starsHTML = Array(t.rating || 5).fill(
        '<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
      ).join('');

      card.innerHTML = `
        <div class="testimonial-stars">${starsHTML}</div>
        <p class="testimonial-quote">${t.quote}</p>
        <div class="testimonial-author">
          <div class="testimonial-avatar">${initial}</div>
          <div class="testimonial-author-info">
            <span class="testimonial-name">${t.name}</span>
            <span class="testimonial-company">${t.company}</span>
          </div>
        </div>
      `;

      track.appendChild(card);
    });

    // Render dots
    const dotsContainer = document.querySelector('.testimonial-dots');
    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      d.testimonials.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'testimonial-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Testimonial ${i + 1}`);
        dot.dataset.index = i;
        dotsContainer.appendChild(dot);
      });
    }
  }

  /* ---------- 3. Init after render ---------- */
  function initAfterRender() {
    initRotatingHeadlines();
    initScrollReveal();
    initParallax();
    initNavbar();
    initSmoothScroll();
    initMobileMenu();
    initContactForm();
    initTestimonialSlider();
    initBgFloatingElements();
  }

  /* ---------- 4. Typewriter Headlines ---------- */
  function initRotatingHeadlines() {
    const el = document.querySelector('.hero-headline');
    if (!el || !el.dataset.headlines) return;

    const headlines = JSON.parse(el.dataset.headlines);
    if (headlines.length === 0) return;

    // Structure: mainSpan (all but last word) + noBreakSpan (last word + cursor)
    const mainSpan = document.createElement('span');
    const noBreakSpan = document.createElement('span');
    noBreakSpan.style.whiteSpace = 'nowrap';
    const lastWordNode = document.createTextNode('');
    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    noBreakSpan.appendChild(lastWordNode);
    noBreakSpan.appendChild(cursor);
    el.innerHTML = '';
    el.appendChild(mainSpan);
    el.appendChild(noBreakSpan);

    const typeSpeed = 55;
    const deleteSpeed = 35;
    const pauseAfterType = 2500;
    const pauseAfterDelete = 400;

    let headlineIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function updateDisplay(text) {
      const lastSpace = text.lastIndexOf(' ');
      if (lastSpace === -1) {
        mainSpan.textContent = '';
        lastWordNode.textContent = text;
      } else {
        mainSpan.textContent = text.substring(0, lastSpace + 1);
        lastWordNode.textContent = text.substring(lastSpace + 1);
      }
    }

    function tick() {
      const currentText = headlines[headlineIndex];

      if (!isDeleting) {
        charIndex++;
        updateDisplay(currentText.substring(0, charIndex));

        if (charIndex === currentText.length) {
          isDeleting = true;
          setTimeout(tick, pauseAfterType);
          return;
        }
        setTimeout(tick, typeSpeed);
      } else {
        charIndex--;
        updateDisplay(currentText.substring(0, charIndex));

        if (charIndex === 0) {
          isDeleting = false;
          headlineIndex = (headlineIndex + 1) % headlines.length;
          setTimeout(tick, pauseAfterDelete);
          return;
        }
        setTimeout(tick, deleteSpeed);
      }
    }

    tick();
  }

  /* ---------- 5. Scroll Reveal ---------- */
  function initScrollReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach((el) => observer.observe(el));
  }

  /* ---------- 6. Parallax ---------- */
  function initParallax() {
    const floatingEls = document.querySelectorAll('.float-el');
    if (floatingEls.length === 0) return;

    const speeds = [0.3, 0.2, 0.15, 0.1, 0.25, 0.05, 0.12, 0.08];

    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          floatingEls.forEach((el, i) => {
            const speed = speeds[i % speeds.length];
            const y = -(scrollY * speed);
            el.style.transform = `translateY(${y}px) ${getComputedRotation(el)}`;
          });
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  function getComputedRotation(el) {
    if (el.classList.contains('float-phone')) return 'rotate(6deg)';
    if (el.classList.contains('float-browser')) return 'rotate(-4deg)';
    if (el.classList.contains('float-dashboard')) return 'rotate(3deg)';
    if (el.classList.contains('float-line-1')) return 'rotate(-20deg)';
    if (el.classList.contains('float-line-2')) return 'rotate(15deg)';
    return '';
  }

  /* ---------- 7. Navbar ---------- */
  function initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const blurBottom = document.querySelector('.scroll-blur-bottom');

    const onScroll = () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }

      if (blurBottom) {
        const distFromBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
        if (distFromBottom < 120) {
          blurBottom.classList.add('hidden');
        } else {
          blurBottom.classList.remove('hidden');
        }
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 8. Smooth Scroll ---------- */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (targetId === '#') return;

        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 72;
          const top = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });
  }

  /* ---------- 9. Mobile Menu ---------- */
  function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    if (!hamburger || !mobileMenu) return;

    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });

    // Close menu on link click
    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ---------- 10. Contact Form ---------- */
  function initContactForm() {
    const form = document.querySelector('#contact-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      // Validate required fields
      if (!data.name || !data.email) {
        alert('Bitte fülle alle Pflichtfelder aus.');
        return;
      }

      // Simple email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        alert('Bitte gib eine gültige E-Mail-Adresse ein.');
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Wird gesendet...';
      submitBtn.disabled = true;

      // Web3Forms – JSON format
      var payload = {
        access_key: '32c71b72-7062-453d-a6a8-8b877f0aa323',
        subject: 'Neue Kontaktanfrage über kolac-digital.de',
        from_name: 'Kolac Digital Website',
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        company: data.company || '',
        service: data.service || '',
        message: data.message || ''
      };

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then((res) => res.json())
        .then((result) => {
          if (result.success) {
            alert('Danke für deine Nachricht! Wir melden uns innerhalb von 24 Stunden bei dir.');
            form.reset();
          } else {
            console.error('Web3Forms error:', result);
            alert('Etwas ist schiefgelaufen. Bitte versuche es erneut oder schreib uns direkt an yusuf@kolac-digital.de');
          }
        })
        .catch((err) => {
          console.error('Form submit error:', err);
          alert('Etwas ist schiefgelaufen. Bitte versuche es erneut oder schreib uns direkt an yusuf@kolac-digital.de');
        })
        .finally(() => {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        });
    });
  }

  /* ---------- 11. Testimonial Slider (Infinite Loop) ---------- */
  function initTestimonialSlider() {
    const slider = document.querySelector('.testimonial-slider');
    const track = document.querySelector('.testimonial-track');
    if (!slider || !track) return;

    const originalCards = Array.from(track.querySelectorAll('.testimonial-card'));
    const totalOriginal = originalCards.length;
    if (totalOriginal === 0) return;

    // Clone all cards and append for infinite loop
    originalCards.forEach((card) => {
      track.appendChild(card.cloneNode(true));
    });

    const allCards = track.querySelectorAll('.testimonial-card');

    let currentIndex = 0;
    let startX = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;
    let isDragging = false;
    let isTransitioning = false;

    const prevBtn = slider.querySelector('.testimonial-arrow-prev');
    const nextBtn = slider.querySelector('.testimonial-arrow-next');
    const dots = slider.querySelectorAll('.testimonial-dot');

    function getCardsPerView() {
      const width = window.innerWidth;
      if (width >= 1024) return 3;
      if (width >= 768) return 2;
      return 1;
    }

    function getSlideWidth() {
      if (allCards.length === 0) return 0;
      const style = getComputedStyle(track);
      const gap = parseFloat(style.gap) || 24;
      return allCards[0].offsetWidth + gap;
    }

    function setTransform(animate) {
      if (animate) {
        track.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
      } else {
        track.style.transition = 'none';
      }
      currentTranslate = -(currentIndex * getSlideWidth());
      prevTranslate = currentTranslate;
      track.style.transform = `translateX(${currentTranslate}px)`;
    }

    function goToSlide(index, animate) {
      if (isTransitioning) return;
      currentIndex = index;
      setTransform(animate !== false);
      updateDots();

      // Check if we need to loop
      if (currentIndex >= totalOriginal) {
        isTransitioning = true;
        setTimeout(() => {
          currentIndex = currentIndex - totalOriginal;
          setTransform(false);
          isTransitioning = false;
        }, 520);
      } else if (currentIndex < 0) {
        isTransitioning = true;
        currentIndex = currentIndex + totalOriginal;
        setTransform(false);
        // Jump to clone position, then animate back
        currentIndex = currentIndex + totalOriginal;
        setTransform(false);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            currentIndex = currentIndex - totalOriginal;
            setTransform(true);
            setTimeout(() => { isTransitioning = false; }, 520);
          });
        });
      }
    }

    function updateDots() {
      const dotIndex = ((currentIndex % totalOriginal) + totalOriginal) % totalOriginal;
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === dotIndex);
      });
    }

    // Remove disabled logic – infinite loop never disables buttons
    if (prevBtn) {
      prevBtn.removeAttribute('disabled');
      prevBtn.addEventListener('click', () => goToSlide(currentIndex - 1));
    }
    if (nextBtn) {
      nextBtn.removeAttribute('disabled');
      nextBtn.addEventListener('click', () => goToSlide(currentIndex + 1));
    }

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        goToSlide(parseInt(dot.dataset.index, 10));
      });
    });

    // Bind touch to the stable wrapper — track moves via transform so its
    // hit area shifts after each swipe, causing events to miss on repeat swipes.
    const trackWrap = slider.querySelector('.testimonial-track-wrap') || slider;

    let startY = 0;
    let isHorizontalSwipe = null;

    function touchStart(e) {
      if (isTransitioning) return;
      const t = e.touches[0];
      isDragging = true;
      isHorizontalSwipe = null;
      startX = t.clientX;
      startY = t.clientY;
      track.style.transition = 'none';
    }

    function touchMove(e) {
      if (!isDragging) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      if (isHorizontalSwipe === null && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        isHorizontalSwipe = Math.abs(dx) >= Math.abs(dy);
      }
      if (!isHorizontalSwipe) return; // vertical → page scrolls normally

      if (e.cancelable) e.preventDefault();
      currentTranslate = prevTranslate + dx;
      track.style.transform = `translateX(${currentTranslate}px)`;
    }

    function touchEnd() {
      if (!isDragging) return;
      isDragging = false;
      isHorizontalSwipe = null;

      const movedBy = currentTranslate - prevTranslate;
      const threshold = getSlideWidth() * 0.25;

      if (movedBy < -threshold) {
        goToSlide(currentIndex + 1);
      } else if (movedBy > threshold) {
        goToSlide(currentIndex - 1);
      } else {
        goToSlide(currentIndex);
      }
    }

    function getPositionX(e) {
      return e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
    }

    // Mouse drag (desktop)
    track.addEventListener('mousedown', (e) => {
      if (isTransitioning) return;
      isDragging = true; startX = e.pageX;
      track.style.transition = 'none';
    });
    track.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      currentTranslate = prevTranslate + (e.pageX - startX);
      track.style.transform = `translateX(${currentTranslate}px)`;
    });
    track.addEventListener('mouseup', touchEnd);
    track.addEventListener('mouseleave', () => { if (isDragging) touchEnd(); });
    track.addEventListener('dragstart', (e) => e.preventDefault());

    // Touch – bound to stable wrapper so hit area never shifts after a swipe
    trackWrap.addEventListener('touchstart', touchStart, { passive: true });
    trackWrap.addEventListener('touchmove', touchMove, { passive: false });
    trackWrap.addEventListener('touchend', touchEnd);
    trackWrap.addEventListener('touchcancel', touchEnd);

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setTransform(false);
      }, 150);
    });

    updateDots();
  }

  /* ---------- 12. Background Floating Elements ---------- */
  function initBgFloatingElements() {
    const container = document.querySelector('.bg-floating-elements');
    if (!container) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const icons = [
      { svg: '<svg viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>' },
      { svg: '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>', fill: true },
      { svg: '<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' },
      { svg: '<svg viewBox="0 0 24 24"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>' },
      { svg: '<svg viewBox="0 0 24 24"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>' },
      { svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' },
      { svg: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' },
      { svg: '<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>' },
      { svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>' },
      { svg: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' },
    ];

    const animations = ['bg-float-drift-1', 'bg-float-drift-2', 'bg-float-drift-3'];
    const sizes = [28, 34, 40, 48, 56];
    const opacities = [0.35, 0.45, 0.55, 0.65, 0.75];
    const durations = [12, 16, 20, 24, 28, 32];
    const spinDurations = [14, 18, 22, 26, 30, 35];
    const elementCount = 24;

    for (let i = 0; i < elementCount; i++) {
      const icon = icons[i % icons.length];
      const el = document.createElement('div');
      el.className = 'bg-float-icon' + (icon.fill ? ' fill-icon' : '');

      const size = sizes[i % sizes.length];
      const opacity = opacities[i % opacities.length];
      const duration = durations[i % durations.length];
      const animation = animations[i % animations.length];
      const spinDuration = spinDurations[i % spinDurations.length];
      const spinDir = i % 2 === 0 ? 'normal' : 'reverse';
      const delay = (i * 0.8);
      const left = (i * 7 + (i * 13 % 5)) % 100;
      const top = (i * 6 + (i * 17 % 8)) % 100;

      el.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${left}%;
        top: ${top}%;
        --float-opacity: ${opacity};
        --spin-duration: ${spinDuration}s;
        --spin-direction: ${spinDir};
        animation: ${animation} ${duration}s ease-in-out ${delay}s infinite;
      `;
      el.innerHTML = icon.svg;
      container.appendChild(el);

      setTimeout(() => {
        el.classList.add('active');
      }, 300 + (i * 120));
    }
  }

  /* ---------- 12. YouTube Video Lazy Loading ---------- */
  function initVideoPlayers() {
    document.querySelectorAll('.video-placeholder').forEach(function (placeholder) {
      function handleClick() {
        var wrapper = placeholder.closest('.video-wrapper');
        var videoId = wrapper.dataset.youtubeId;
        if (!videoId) return;

        // Check cookie consent
        if (window.CookieConsent && !window.CookieConsent.hasFunctional()) {
          // Show consent notice
          var notice = document.createElement('div');
          notice.className = 'video-consent-notice';
          notice.innerHTML =
            '<p>Dieses Video wird von YouTube bereitgestellt. ' +
            'Bitte akzeptiere funktionale Cookies, um es abzuspielen.</p>' +
            '<button>Cookies akzeptieren</button>';
          notice.querySelector('button').addEventListener('click', function () {
            // Accept functional cookies and reload video
            if (window.CookieConsent) {
              var consent = window.CookieConsent.getConsent() || {};
              consent.essential = true;
              consent.functional = true;
              consent.timestamp = new Date().toISOString();
              localStorage.setItem('kolac_cookie_consent', JSON.stringify(consent));
              window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: consent }));
            }
            notice.remove();
            embedVideo(wrapper, videoId);
          });
          wrapper.appendChild(notice);
          return;
        }

        embedVideo(wrapper, videoId);
      }

      placeholder.addEventListener('click', handleClick);
      placeholder.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      });
    });
  }

  function embedVideo(wrapper, videoId) {
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + videoId + '?autoplay=1&rel=0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.title = 'YouTube Video';
    wrapper.innerHTML = '';
    wrapper.appendChild(iframe);
  }

  /* ---------- Init on DOM ready ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    loadContent();
    initVideoPlayers();
  });
})();
