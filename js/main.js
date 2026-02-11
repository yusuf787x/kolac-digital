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

    // Kontakt
    renderKontakt();

    // Footer
    const footerCopy = document.querySelector('.footer-copy');
    if (footerCopy) footerCopy.textContent = siteData.footer.copyright;
  }

  function setLogo(selector, text) {
    const el = document.querySelector(selector);
    if (!el) return;
    // "kolac.digital" → "kolac" + gold dot + "digital"
    const parts = text.split('.');
    if (parts.length === 2) {
      el.innerHTML = `${parts[0]}<span class="dot">.</span>${parts[1]}`;
    } else {
      el.textContent = text;
    }
  }

  function renderHero() {
    const d = siteData.hero;

    // Rotating headlines
    const wrapper = document.querySelector('.hero-headline-wrapper');
    if (wrapper) {
      wrapper.innerHTML = '';
      d.rotatingHeadlines.forEach((text, i) => {
        const h1 = document.createElement('h1');
        h1.className = 'hero-headline' + (i === 0 ? ' active' : '');
        h1.textContent = text;
        wrapper.appendChild(h1);
      });
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
        card.className = `service-card reveal reveal-delay-${i + 1}`;
        card.innerHTML = `
          <div class="service-icon">${getServiceIcon(service.icon)}</div>
          <h3>${service.title}</h3>
          <p>${service.description}</p>
          <ul class="service-features">
            ${service.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
        `;
        grid.appendChild(card);
      });
    }

    const extra = document.querySelector('.leistungen-extra');
    if (extra) extra.textContent = d.extra;
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
      textContainer.innerHTML = `
        <div class="section-label"><span></span>${d.label}</div>
        <h2 class="section-headline">${d.headline}</h2>
        ${textHTML}
        <div class="about-tags">${tagsHTML}</div>
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

      const mockupHTML = project.mockupType === 'phone'
        ? `<div class="ref-mockup">
            <div class="ref-mockup-phone">
              <div class="mockup-notch"></div>
              <div class="mockup-screen">
                <img src="${project.mockupImage}" alt="${project.company}" onerror="this.style.display='none'">
              </div>
            </div>
          </div>`
        : `<div class="ref-mockup">
            <div class="ref-mockup-browser">
              <div class="mockup-bar">
                <span class="mockup-bar-dot"></span>
                <span class="mockup-bar-dot"></span>
                <span class="mockup-bar-dot"></span>
              </div>
              <div class="mockup-screen">
                <img src="${project.mockupImage}" alt="${project.company}" onerror="this.style.display='none'">
              </div>
            </div>
          </div>`;

      const servicesHTML = project.services.map(s => `<li>${s}</li>`).join('');
      const linkHTML = project.link
        ? `<a href="${project.link}" target="_blank" rel="noopener" class="ref-link">${project.linkText} →</a>`
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
          ${linkHTML}
        </div>
      `;

      grid.appendChild(card);
    });
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

  /* ---------- 3. Init after render ---------- */
  function initAfterRender() {
    initRotatingHeadlines();
    initScrollReveal();
    initParallax();
    initNavbar();
    initSmoothScroll();
    initMobileMenu();
    initContactForm();
  }

  /* ---------- 4. Rotating Headlines ---------- */
  function initRotatingHeadlines() {
    const headlines = document.querySelectorAll('.hero-headline');
    if (headlines.length === 0) return;

    let current = 0;

    setInterval(() => {
      headlines[current].classList.remove('active');
      current = (current + 1) % headlines.length;
      headlines[current].classList.add('active');
    }, 3000);
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

    const onScroll = () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
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

      // For now, show success message
      alert('Danke für deine Nachricht! Wir melden uns innerhalb von 24 Stunden bei dir.');
      form.reset();

      console.log('Form submission:', data);
    });
  }

  /* ---------- Init on DOM ready ---------- */
  document.addEventListener('DOMContentLoaded', loadContent);
})();
