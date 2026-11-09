/**
 * ISKCON Gandhidham - Main Application & Dynamic Hash Router
 * Sri Sri Radha Madanmohan Mandir
 */

(function() {
  'use strict';

  // Ensure window.app exists immediately
  window.app = window.app || {};

  // Security Helper: Escape dynamic strings to prevent XSS
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Synchronous safety shim: Ensure window.templeStore is always defined
  if (!window.templeStore) {
    window.templeStore = {
      getSchedule: () => window.TEMPLE_DATA?.schedule || [],
      getTodayDarshan: () => (window.TEMPLE_DATA?.darshanGallery && window.TEMPLE_DATA.darshanGallery[0]) || null,
      getEvents: () => window.TEMPLE_DATA?.events || [],
      getSevas: () => window.TEMPLE_DATA?.sevaCategories || [],
      getDarshan: () => window.TEMPLE_DATA?.darshanGallery || [],
      getEventById: (id) => (window.TEMPLE_DATA?.events || []).find(e => e.id === id) || null,
      getDonationById: () => null,
      getDonations: () => [],
      recordDonation: async (d) => ({ ...d, id: `DON-${Date.now()}` }),
      submitInquiry: async (i) => ({ ...i, id: `INQ-${Date.now()}` }),
      registerForEvent: async (r) => ({ ...r, id: `REG-${Date.now()}` }),
      submitVolunteer: async (v) => ({ ...v, id: `VOL-${Date.now()}` })
    };
  }

  // Inline Navigation & Drawer Action Handlers
  window.app.onBrahmaSamhitaNavClick = function(event) {
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    closeMobileDrawer();
    if (window.location.hash === '#/brahma-samhita') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (typeof handleRouting === 'function') handleRouting();
    } else {
      window.location.hash = '#/brahma-samhita';
    }
  };

  window.app.closeCourseSelectionDrawer = function() {
    const overlay = document.getElementById('course-drawer-overlay');
    if (overlay) overlay.classList.remove('open');
  };

  window.app.openCourseSelectionDrawer = function() {
    const overlay = document.getElementById('course-drawer-overlay');
    const body = document.getElementById('course-drawer-body');
    if (body) {
      const courses = window.TEMPLE_DATA?.coursesCatalog || [];
      body.innerHTML = courses.map(c => `
        <div class="card" style="padding: 16px; margin-bottom: 12px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <div>
            <h4 style="margin: 0 0 4px 0; color: var(--maroon-900); font-family: var(--font-serif);">${escapeHTML(c.title)}</h4>
            <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">${escapeHTML(c.subTitle || c.description || '')}</p>
          </div>
          <button class="btn btn-sm btn-primary" onclick="window.app.closeCourseSelectionDrawer(); window.app.openCheckout('Course Registration: ${escapeHTML(c.title)}', 501)">Select</button>
        </div>
      `).join('');
    }
    if (overlay) overlay.classList.add('open');
  };

  window.app.closeVolunteerSevaDrawer = function() {
    const overlay = document.getElementById('volunteer-drawer-overlay');
    if (overlay) overlay.classList.remove('open');
  };

  window.app.openVolunteerSevaDrawer = function() {
    const overlay = document.getElementById('volunteer-drawer-overlay');
    const body = document.getElementById('volunteer-drawer-body');
    if (body) {
      const sevas = window.TEMPLE_DATA?.volunteerSevaOptions || [];
      body.innerHTML = sevas.map(s => `
        <label class="card" style="padding: 14px 16px; margin-bottom: 10px; border: 1.5px solid var(--border-color); display: flex; align-items: center; gap: 14px; cursor: pointer;">
          <input type="checkbox" value="${escapeHTML(s.title)}" style="width: 20px; height: 20px; accent-color: var(--saffron-600);">
          <div>
            <strong style="color: var(--maroon-900);">${s.icon || '🤝'} ${escapeHTML(s.title)}</strong>
            <p style="margin: 2px 0 0 0; font-size: 0.85rem; color: var(--text-muted);">${escapeHTML(s.description || '')}</p>
          </div>
        </label>
      `).join('');
    }
    if (overlay) overlay.classList.add('open');
  };

  window.app.confirmVolunteerSevaSelection = function() {
    const checkboxes = document.querySelectorAll('#volunteer-drawer-body input[type="checkbox"]:checked');
    const selected = Array.from(checkboxes).map(cb => cb.value);
    if (selected.length > 0) {
      const interestSelect = document.querySelector('#volunteer-form select[name="interest"]');
      if (interestSelect) {
        let opt = Array.from(interestSelect.options).find(o => o.value === selected[0]);
        if (!opt) {
          opt = new Option(selected.join(', '), selected.join(', '));
          interestSelect.add(opt);
        }
        interestSelect.value = opt.value;
      }
      showToast(`Selected Seva: ${selected.join(', ')}`, "success");
    }
    window.app.closeVolunteerSevaDrawer();
  };

  // Audio Engine State
  const audioState = {
    currentTrackIndex: 0,
    isPlaying: false,
    audioElem: null,
    synthCtx: null,
    synthOsc: null,
    chantCount: 0,
    tracks: window.TEMPLE_DATA?.kirtans || []
  };


  // DOM Elements cache
  let mainContentElem = null;
  let toastContainerElem = null;
  let searchModalElem = null;
  let checkoutModalElem = null;
  let donationModalElem = null;
  let imageLightboxModalElem = null;

  function handleGlobalKeydown(e) {
    if (e.key === 'Escape') {
      if (searchModalElem) searchModalElem.classList.remove('open');
      if (checkoutModalElem) checkoutModalElem.classList.remove('open');
      if (donationModalElem) donationModalElem.classList.remove('open');
      if (imageLightboxModalElem) imageLightboxModalElem.classList.remove('open');
    }
  }

  function closeMobileDrawer() {
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const backdrop = document.getElementById('drawer-backdrop');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  }

  function openMobileDrawer() {
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('drawer-overlay');
    if (drawer) drawer.classList.add('open');
    if (overlay) overlay.classList.add('open');
  }

  function setupNavDropdown() {
    const dropdown = document.getElementById('nav-more-dropdown');
    const btn = document.getElementById('nav-more-btn');
    const menu = document.getElementById('nav-more-menu');
    if (!dropdown || !btn || !menu) return;

    function openDropdown() {
      dropdown.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }

    function closeDropdown() {
      dropdown.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }

    function toggleDropdown(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (dropdown.classList.contains('open')) {
        closeDropdown();
      } else {
        openDropdown();
      }
    }

    btn.addEventListener('click', toggleDropdown);

    // Close on clicking any link inside dropdown
    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        closeDropdown();
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target)) {
        closeDropdown();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dropdown.classList.contains('open')) {
        closeDropdown();
        btn.focus();
      }
    });

    // Hover support: sync aria-expanded
    dropdown.addEventListener('mouseenter', () => {
      btn.setAttribute('aria-expanded', 'true');
    });
    dropdown.addEventListener('mouseleave', () => {
      if (!dropdown.classList.contains('open')) {
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function setupGlobalUiEvents() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openMobileDrawer();
      });
    }

    const drawerCloseBtn = document.getElementById('drawer-close-btn');
    if (drawerCloseBtn) {
      drawerCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeMobileDrawer();
      });
    }

    const overlay = document.getElementById('drawer-overlay');
    if (overlay) {
      overlay.addEventListener('click', closeMobileDrawer);
    }
    const backdrop = document.getElementById('drawer-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', closeMobileDrawer);
    }

    document.querySelectorAll('.drawer-nav-link').forEach(link => {
      link.addEventListener('click', closeMobileDrawer);
    });

    // Initialize "More ▾" dropdown interactions
    setupNavDropdown();
  }

  // Sync Announcement Banner and YouTube Live Stream Bar safely
  function syncHeaderBanners() {
    // 1. Top Announcement Bar
    try {
      const ann = window.templeStore ? window.templeStore.getAnnouncement() : null;
      const annBar = document.getElementById('top-announcement-bar');
      const annSpan = document.getElementById('announcement-banner-text');

      if (annBar && ann) {
        if (ann.enabled === false) {
          annBar.style.display = 'none';
        } else {
          annBar.style.display = '';
          if (annSpan) {
            annSpan.textContent = '';
            const textNode = document.createTextNode((ann.text || '') + ' ');
            annSpan.appendChild(textNode);

            const linkEl = document.createElement('a');
            linkEl.textContent = ann.linkText || 'View Details →';
            let linkHref = ann.linkHash || ann.link || '#/events';
            if (!linkHref.startsWith('#/') && !linkHref.startsWith('https://')) {
              linkHref = '#/events';
            }
            linkEl.href = linkHref;
            if (linkHref.startsWith('https://')) {
              linkEl.target = '_blank';
              linkEl.rel = 'noopener';
            }
            annSpan.appendChild(linkEl);
          }
        }
      }
    } catch (err) {
      console.warn('[App] Announcement banner sync error:', err);
    }

    // 2. YouTube Live Stream Banner
    try {
      const yt = window.templeStore ? window.templeStore.getYouTubeLive() : null;
      const liveBar = document.getElementById('live-stream-bar');
      const liveTitle = document.getElementById('live-stream-title-bar');
      const liveBtn = liveBar ? liveBar.querySelector('.watch-live-btn') : null;

      if (liveBar && yt && typeof yt.isLive === 'boolean') {
        if (yt.isLive) {
          liveBar.style.display = 'flex';
          if (liveTitle && yt.title) {
            liveTitle.textContent = yt.title;
          }
          if (liveBtn && yt.videoId) {
            const vidUrl = yt.videoId.startsWith('http')
              ? yt.videoId
              : `https://www.youtube.com/watch?v=${encodeURIComponent(yt.videoId)}`;
            liveBtn.href = vidUrl;
          }
        } else {
          liveBar.style.display = 'none';
        }
      }
    } catch (err) {
      console.warn('[App] Live stream sync error:', err);
    }
  }

  // Initialize App
  function initApp() {
    mainContentElem = document.getElementById('app-main-content');
    toastContainerElem = document.getElementById('toast-container');
    searchModalElem = document.getElementById('search-modal');
    checkoutModalElem = document.getElementById('checkout-modal');
    donationModalElem = document.getElementById('donation-modal');
    imageLightboxModalElem = document.getElementById('lightbox-modal');

    // Global Event Listeners
    window.addEventListener('hashchange', handleRouting);
    document.addEventListener('keydown', handleGlobalKeydown);

    // Listen to real-time Firestore updates from TempleStore
    window.addEventListener('temple-data-updated', () => {
      syncHeaderBanners();
      const modalOpen = document.querySelector('.sacred-modal.open');
      if (!modalOpen) {
        handleRouting();
      }
    });

    setupGlobalUiEvents();
    setupAudioPlayer();
    startLiveAartiTimer();
    setupPeacockFeacockSplash();
    setupScrollRevealEngine();
    syncHeaderBanners();

    // Initial Route
    handleRouting();
  }

  function setupAutoSliders() {
    const selectors = ['.home-gallery-scroll-container', '#facilities-slider-track', '.sacred-slider-track'];
    selectors.forEach(selector => {
      const tracks = document.querySelectorAll(selector);
      tracks.forEach(track => {
        if (track.dataset.hasAutoSlide) return;
        track.dataset.hasAutoSlide = 'true';

        let isHovered = false;
        track.addEventListener('mouseenter', () => { isHovered = true; });
        track.addEventListener('mouseleave', () => { isHovered = false; });
        track.addEventListener('touchstart', () => { isHovered = true; }, { passive: true });
        track.addEventListener('touchend', () => { setTimeout(() => { isHovered = false; }, 2000); }, { passive: true });

        const autoSlideInterval = setInterval(() => {
          if (!document.body.contains(track)) {
            clearInterval(autoSlideInterval);
            return;
          }
          if (isHovered) return;
          const maxScroll = track.scrollWidth - track.clientWidth;
          if (maxScroll <= 10) return;
          if (track.scrollLeft >= maxScroll - 15) {
            track.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            const step = Math.min(340, track.clientWidth * 0.75);
            track.scrollBy({ left: step, behavior: 'smooth' });
          }
        }, 3500); // 3.5 seconds comfortable reading & viewing speed
      });
    });
  }

  function setupScrollRevealEngine() {
    if (typeof IntersectionObserver === 'undefined') return;

    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.10
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          obs.unobserve(entry.target);
        }
      });
    }, observerOptions);

    function initRevealElements() {
      // Find cards, section headers, sliders, and key components
      const selectors = '.card, .section-header, .darshan-spotlight-card, .seva-card, .pillar-card, .aarti-card, .sacred-slider-wrapper, .shloka-box, .stat-item';
      const elements = document.querySelectorAll(selectors);

      elements.forEach((el, index) => {
        if (!el.classList.contains('revealed') && !el.classList.contains('reveal-on-scroll') && !el.classList.contains('reveal-left') && !el.classList.contains('reveal-right')) {
          // Alternating Directional Entrances: Odd = Slide Right-to-Left, Even = Slide Left-to-Right
          if (index % 2 === 1) {
            el.classList.add('reveal-right');
          } else {
            el.classList.add('reveal-left');
          }

          if (index % 4 === 1) el.classList.add('delay-1');
          else if (index % 4 === 2) el.classList.add('delay-2');
          else if (index % 4 === 3) el.classList.add('delay-3');

          observer.observe(el);
        }
      });

      // Initialize Auto-Sliders
      setupAutoSliders();
    }

    initRevealElements();
    setTimeout(initRevealElements, 350);
    window.addEventListener('hashchange', () => {
      setTimeout(initRevealElements, 200);
    });
  }

  function setupPeacockFeacockSplash() {
    function spawnPeacockBurst(x, y) {
      if (!x || !y || window.innerWidth < 768) return; // Skip particle creation on mobile for maximum performance
      const count = 3; // Light & fast particle count
      for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'peacock-splash-feather';
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;

        const angle = (i / count) * 360 + (Math.random() * 30 - 15);
        const distance = 35 + Math.random() * 45;
        const rad = angle * (Math.PI / 180);

        const tx = Math.cos(rad) * distance;
        const ty = Math.sin(rad) * distance;
        const rotStart = Math.random() * 360;
        const rotEnd = rotStart + (Math.random() > 0.5 ? 180 : -180);
        const scale = 0.6 + Math.random() * 0.4;

        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        particle.style.setProperty('--rot-start', `${rotStart}deg`);
        particle.style.setProperty('--rot-end', `${rotEnd}deg`);
        particle.style.transform = `translate(-50%, -50%) scale(${scale})`;

        document.body.appendChild(particle);

        setTimeout(() => {
          if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
          }
        }, 700);
      }
    }

    // Window Click Burst Splash (Desktop only)
    window.addEventListener('click', (e) => {
      // Ignore clicks on buttons/inputs to avoid clutter
      if (e.target.closest('button, a, input, select, textarea')) return;
      spawnPeacockBurst(e.clientX, e.clientY);
    }, { passive: true });
  }

  // =========================================================================
  // ROUTING SYSTEM
  // =========================================================================
  let currentActiveRoutePath = '';
  function handleRouting() {
    const rawHash = window.location.hash || '#/';
    const cleanHash = rawHash.split('?')[0];
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');

    // Close any open mobile drawer
    closeMobileDrawer();

    // Sync Announcement and Live Stream headers
    syncHeaderBanners();

    // Update active nav states
    updateActiveNavLinks(cleanHash);

    // Scroll to top only when switching main route page (not params/verses)
    if (currentActiveRoutePath !== cleanHash) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      currentActiveRoutePath = cleanHash;
    }

    if (!mainContentElem) {
      mainContentElem = document.getElementById('app-main-content');
    }
    if (!mainContentElem) return;

    // Route matching
    if (cleanHash === '#/' || cleanHash === '#' || cleanHash === '') {
      renderHomeView();
    } else if (cleanHash === '#/darshan') {
      renderDarshanView();
    } else if (cleanHash === '#/classes' || cleanHash === '#/join-classes') {
      renderClassesView(params);
    } else if (cleanHash === '#/brahma-samhita' || cleanHash === '#/join-brahmasamhita' || cleanHash.startsWith('#/brahma-samhita') || cleanHash.startsWith('#brahma-samhita')) {
      renderBrahmaSamhitaView(params);
      const targetId = cleanHash.replace(/^#\/?/, '');
      if (targetId && targetId !== 'brahma-samhita' && targetId !== 'join-brahmasamhita') {
        setTimeout(() => {
          const el = document.getElementById(targetId);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    } else if (cleanHash === '#/events' || cleanHash === '#/festivals') {
      renderEventsView(params);
    } else if (cleanHash.startsWith('#/events/')) {
      const eventId = cleanHash.replace('#/events/', '');
      renderEventDetailView(eventId);
    } else if (cleanHash === '#/spirituality') {
      renderSpiritualityLandingView();
    } else if (cleanHash === '#/mantras' || cleanHash === '#/slokas' || cleanHash === '#/shlokas' || cleanHash === '#/spirituality/mantras') {
      renderMantrasAndShlokasView(params);
    } else if (cleanHash.startsWith('#/mantras/') || cleanHash.startsWith('#/slokas/')) {
      const mantraId = cleanHash.replace(/^#\/(mantras|slokas)\//, '');
      renderMantraDetailView(mantraId);
    } else if (cleanHash === '#/bhagavad-gita') {
      renderBhagavadGitaView(params);
    } else if (cleanHash === '#/lectures') {
      renderLecturesView(params);
    } else if (cleanHash === '#/kirtans') {
      renderKirtansView();
    } else if (cleanHash === '#/articles') {
      renderArticlesView(params);
    } else if (cleanHash === '#/library') {
      renderLibraryView();
    } else if (cleanHash === '#/temple') {
      renderTempleAboutView();
    } else if (cleanHash === '#/timings') {
      renderTimingsView();
    } else if (cleanHash === '#/visit') {
      renderPlanYourVisitView();
    } else if (cleanHash === '#/community' || cleanHash === '#/community/youth' || cleanHash === '#/community/children') {
      renderCommunityView(cleanHash);
    } else if (cleanHash === '#/volunteer') {
      renderVolunteerView();
    } else if (cleanHash === '#/seva') {
      renderSevaView(params);
    } else if (cleanHash === '#/sudhama-sewak' || cleanHash === '#/sudama-sevaka') {
      renderSudhamaSewakView(params);
    } else if (cleanHash.startsWith('#/seva/')) {
      const sevaId = cleanHash.replace('#/seva/', '');
      renderSevaDetailView(sevaId);
    } else if (cleanHash === '#/donate') {
      renderDonateView(params);
    } else if (cleanHash === '#/donate/success') {
      renderDonationSuccessView(params);
    } else if (cleanHash === '#/media') {
      renderMediaView(params);
    } else if (cleanHash === '#/contact') {
      renderContactView();
    } else {
      render404View();
    }
  }

  function updateActiveNavLinks(currentHash) {
    let moreDropdownHasActive = false;
    document.querySelectorAll('.nav-link, .drawer-nav-link, .mobile-bottom-link, .dropdown-item').forEach(link => {
      if (link.id === 'nav-more-btn') return;
      const href = link.getAttribute('href');
      const isActive = href && (href === currentHash || (href !== '#/' && currentHash.startsWith(href)));
      if (isActive) {
        link.classList.add('active');
        if (link.closest('#nav-more-menu')) {
          moreDropdownHasActive = true;
        }
      } else {
        link.classList.remove('active');
      }
    });

    const moreBtn = document.getElementById('nav-more-btn');
    if (moreBtn) {
      if (moreDropdownHasActive) {
        moreBtn.classList.add('active');
      } else {
        moreBtn.classList.remove('active');
      }
    }
  }

  // =========================================================================
  // TOAST NOTIFICATIONS
  // =========================================================================
  function showToast(message, type = 'info') {
    if (!toastContainerElem) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>🌸</span>
      <div>${message}</div>
    `;
    toastContainerElem.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // =========================================================================
  // LIVE AARTI & TEMPLE STATUS ENGINE
  // =========================================================================
  function getTempleStatus() {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    const schedule = window.templeStore.getSchedule();

    // Morning Session: 04:30 (4.5) to 13:00 (13.0)
    // Evening Session: 16:30 (16.5) to 20:30 (20.5)
    const isMorningOpen = currentHour >= 4.5 && currentHour <= 13.0;
    const isEveningOpen = currentHour >= 16.5 && currentHour <= 20.5;
    const isOpen = isMorningOpen || isEveningOpen;

    let currentAarti = null;
    let nextAarti = null;

    for (let i = 0; i < schedule.length; i++) {
      const item = schedule[i];
      if (currentHour >= item.startHour && currentHour <= item.endHour) {
        currentAarti = item;
      }
      if (item.startHour > currentHour && !nextAarti) {
        nextAarti = item;
      }
    }

    if (!nextAarti) {
      nextAarti = schedule[0]; // Next morning's Mangala Aarti
    }

    return { isOpen, currentAarti, nextAarti, currentHour };
  }

  function startLiveAartiTimer() {
    function updateStatusUI() {
      const { isOpen, currentAarti, nextAarti } = getTempleStatus();
      const statusPill = document.getElementById('header-live-status');
      if (statusPill) {
        if (isOpen) {
          statusPill.className = 'live-status-pill';
          statusPill.innerHTML = `
            <span class="status-dot"></span>
            <span>${currentAarti ? currentAarti.name : 'Open for Darshan'}</span>
          `;
        } else {
          statusPill.className = 'live-status-pill closed';
          statusPill.innerHTML = `
            <span class="status-dot"></span>
            <span>Closed • Opens ${nextAarti ? nextAarti.time.split('–')[0] : '4:30 AM'}</span>
          `;
        }
      }
    }
    updateStatusUI();
    setInterval(updateStatusUI, 30000);
  }

  // =========================================================================
  // VIEW RENDERERS
  // =========================================================================

  // 1. HOME VIEW
  function renderHomeView() {
    const data = window.TEMPLE_DATA || {};
    const storeDarshan = window.templeStore ? window.templeStore.getDarshan() : [];
    const gallery = (Array.isArray(storeDarshan) && storeDarshan.length > 0)
      ? storeDarshan
      : (data.darshanGallery || []);
    const todayDarshan = (window.templeStore && window.templeStore.getTodayDarshan()) || gallery[0] || {};
    const todayDarshanImg = todayDarshan.image || todayDarshan.imageUrl || 'assets/images/darshan_today.jpg';
    const events = (window.templeStore ? window.templeStore.getEvents() : (data.events || [])).slice(0, 3);
    const schedule = (window.templeStore ? window.templeStore.getSchedule() : (data.schedule || []));
    const sevas = (window.templeStore ? window.templeStore.getSevas() : (data.sevaCategories || [])).slice(0, 3);
    const gitaKey = (data.bhagavadGita?.chapters?.[1]?.verses?.[0]) || (data.bhagavadGita?.chapters?.[1]?.keyVerse) || {
      number: "2.20",
      sanskrit: "न जायते म्रियते वा कदाचिन्\nनायं भूत्वा भविता वा न भूयः |\nअजो नित्यः शाश्वतोऽयं पुराणो\nन हन्यते हन्यमाने शरीरे || २-२० ||",
      transliteration: "na jāyate mriyate vā kadācin nāyaṁ bhūtvā bhavitā vā na bhūyaḥ",
      translation: "For the soul there is neither birth nor death at any time. He is unborn, eternal, ever-existing and primeval. He is not slain when the body is slain."
    };

    mainContentElem.innerHTML = `
      <!-- HERO SECTION -->
      <section class="hero-section">
        <div class="hero-bg-media">
          <img src="assets/images/hero_radha_madanmohan.jpg" alt="Sri Sri Radha Madanmohanji ISKCON Gandhidham" fetchpriority="high">
        </div>
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <div class="hero-badge-row">
            <span class="sacred-badge maroon">Sri Sri Radha Madanmohanji Mandir</span>
          </div>
          <h1 class="hero-title">Welcome to ISKCON Gandhidham</h1>
          <p class="hero-tagline">
            A spiritual sanctuary of devotion, peace, and transcendental wisdom in Kutch, Gujarat. Experience divine Darshan, soulful Kirtan, and timeless Vedic knowledge.
          </p>
          <div class="hero-actions">
            <a href="#/darshan" class="btn btn-primary btn-lg">
              <span>🪔</span> Today's Darshan
            </a>
            <a href="#/visit" class="btn btn-outline-light btn-lg">
              <span>📍</span> Plan Your Visit
            </a>
            <button onclick="window.app.openCheckout('Anna Daan — Food For Life Free Prasadam Seva', 1501)" class="btn btn-gold btn-lg">
              <span>🙏</span> Offer Seva / Donate
            </button>
          </div>

          <div class="hero-quick-stats">
            <div class="stat-item hero-stat-card animate-pulse-gold">
              <div class="stat-val">4:30 AM</div>
              <div class="stat-lbl">Mangala Aarti</div>
            </div>
            <div class="stat-item hero-stat-card">
              <div class="stat-val">25,000+</div>
              <div class="stat-lbl">Free Meals / Mo</div>
            </div>
            <div class="stat-item hero-stat-card">
              <div class="stat-val">100%</div>
              <div class="stat-lbl">80G Tax Benefit</div>
            </div>
            <div class="stat-item hero-stat-card">
              <div class="stat-val">50+ Yrs</div>
              <div class="stat-lbl">Srila Prabhupada Legacy</div>
            </div>
          </div>
        </div>
      </section>

      <!-- TODAY'S DARSHAN SPOTLIGHT -->
      <section class="main-container">
        <div class="darshan-spotlight-card" style="border: 2px solid var(--gold-400); box-shadow: 0 16px 40px rgba(62,8,18,0.12); border-radius: 24px; overflow: hidden;">
          <div class="darshan-image-container" style="position: relative; cursor: pointer;" onclick="window.app.openLightbox('${todayDarshanImg}', '${escapeHTML(todayDarshan.title || 'Sacred Darshan').replace(/'/g, "\\'")}')">
            <img src="${todayDarshanImg}" alt="${escapeHTML(todayDarshan.title || 'Sacred Darshan')}">
            <div class="darshan-overlay-badge" style="background: rgba(62,8,18,0.85); border: 1px solid var(--gold-500); backdrop-filter: blur(4px);">
              <span>✨</span> ${escapeHTML(todayDarshan.tag || "Today's Sacred Darshan")}
            </div>
          </div>
          <div class="darshan-details-pane" style="background: linear-gradient(135deg, #FFFDF9 0%, #FFF9F0 100%);">
            <span class="section-subtitle">Divine Appearance</span>
            <h2 class="darshan-title" style="font-family: var(--font-serif); color: var(--maroon-900); font-size: 2rem;">${escapeHTML(todayDarshan.title || '')}</h2>
            <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.6;">${escapeHTML(todayDarshan.message || todayDarshan.quote || '')}</p>
            
            <ul class="darshan-meta-list" style="margin: 16px 0;">
              <li class="darshan-meta-item">
                <span class="darshan-meta-icon">👑</span>
                <div>
                  <strong>Deities:</strong> ${escapeHTML(todayDarshan.deity || '')}
                </div>
              </li>
              <li class="darshan-meta-item">
                <span class="darshan-meta-icon">🌺</span>
                <div>
                  <strong>Alankara:</strong> ${escapeHTML(todayDarshan.alankara || todayDarshan.attire || '')}
                </div>
              </li>
              <li class="darshan-meta-item">
                <span class="darshan-meta-icon">📅</span>
                <div>
                  <strong>Date:</strong> ${escapeHTML(todayDarshan.date || '')}
                </div>
              </li>
            </ul>

            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <button onclick="window.app.openLightbox('${todayDarshanImg}', '${escapeHTML(todayDarshan.title || 'Sacred Darshan').replace(/'/g, "\\'")}')" class="btn btn-primary animate-pulse-gold">
                <span>🔍</span> High-Res Zoom
              </button>
              <a href="#/darshan" class="btn btn-secondary">
                <span>🖼️</span> View Full Gallery
              </a>
              <button onclick="window.app.shareDarshanWhatsApp('${escapeHTML(todayDarshan.title || '').replace(/'/g, "\\'")}', '${escapeHTML(todayDarshan.date || '').replace(/'/g, "\\'")}')" class="btn btn-secondary" title="Share Darshan on WhatsApp">
                <span>💬</span> Share
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- VISUAL DEITY DARSHAN GALLERY STRIP -->
      <section class="main-container" style="padding-top: 32px; padding-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px;">
          <div>
            <span class="sacred-badge gold" style="margin-bottom: 4px;">🌸 High-Res Gallery</span>
            <h3 style="font-family: var(--font-serif); font-size: 1.6rem; color: var(--maroon-900);">
              Transcendental Deity Shringar Gallery
            </h3>
          </div>
          <a href="#/darshan" class="btn btn-gold btn-sm" style="box-shadow: 0 4px 12px rgba(212,175,55,0.3);">
            <span>🖼️</span> View Full Gallery (${gallery.length}) →
          </a>
        </div>

        <div class="home-gallery-scroll-container">
          ${gallery.map(item => {
            const itemImg = item.image || item.imageUrl || 'assets/images/darshan_today.jpg';
            const itemTitle = escapeHTML(item.title || 'Deity Darshan');
            const itemTitleJs = itemTitle.replace(/'/g, "\\'");
            return `
            <div class="home-gallery-card-item" onclick="window.app.openLightbox('${itemImg}', '${itemTitleJs}')">
              <img src="${itemImg}" alt="${itemTitle}" loading="lazy">
              <div class="home-gallery-card-info">
                <span style="background: rgba(212,175,55,0.85); color: #3E0812; font-weight: 800; font-size: 0.68rem; padding: 2px 8px; border-radius: 10px; display: inline-block; margin-bottom: 4px;">
                  ${escapeHTML(item.tag || 'Deity Darshan')}
                </span>
                <div style="font-family: var(--font-serif); font-weight: 700; font-size: 0.95rem; line-height: 1.2;">
                  ${itemTitle}
                </div>
              </div>
            </div>
          `;
          }).join('')}
        </div>
      </section>

      <!-- TODAY'S TEMPLE SCHEDULE -->
      <section class="main-container section-padding">
        <div class="section-header">
          <span class="section-subtitle">Sacred Daily Rhythm</span>
          <h2 class="section-title">Today at the Temple</h2>
          <div class="sacred-divider"><span>🪔</span></div>
          <p class="section-description">
            Join the congregation for transcendent morning and evening aartis, kirtans, and spiritual discourses.
          </p>
        </div>

        <div class="aarti-timeline-grid">
          ${schedule.map(item => {
            const { currentAarti } = getTempleStatus();
            const isNow = currentAarti && currentAarti.id === item.id;
            return `
              <div class="aarti-card ${isNow ? 'active-now' : ''}">
                <div class="aarti-time-badge">⏰ ${item.time}</div>
                <h3 class="aarti-name">${item.name}</h3>
                <p class="aarti-desc">${item.desc}</p>
              </div>
            `;
          }).join('')}
        </div>

        <div style="text-align: center; margin-top: 32px;">
          <a href="#/timings" class="btn btn-secondary">
            <span>📜</span> View Full Aarti & Festival Timings
          </a>
        </div>
      </section>

      <!-- SUDAMA SEVAKA & BHAJAN CARDS -->
      <section class="main-container" style="padding-bottom: 48px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 24px;">
          <!-- Sudama Sevaka Card -->
          <div style="background: linear-gradient(135deg, #E65100 0%, #FF9800 100%); color: white; border-radius: 20px; padding: 24px; box-shadow: 0 8px 24px rgba(230,81,0,0.25); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 2rem; background: rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 50%;">🤝</span>
                <span style="background: rgba(255,255,255,0.25); font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 12px;">TEMPLE PATRON</span>
              </div>
              <h3 style="font-family: var(--font-serif); font-size: 1.5rem; font-weight: 800; margin-bottom: 6px; color: white;">Sudama Sevaka</h3>
              <p style="font-size: 0.92rem; opacity: 0.95; line-height: 1.5; margin-bottom: 18px;">Become a dedicated Sudama Sevaka patron supporting monthly temple seva, deity shringar, and free prasadam distribution.</p>
            </div>
            <a href="#/seva" class="btn btn-light" style="font-weight: 700; align-self: start; background: white; color: #E65100; border: none; padding: 10px 20px; border-radius: 12px; font-size: 0.9rem;">
              <span>🙏</span> Join Sudama Sevaka →
            </a>
          </div>

          <!-- Bhajan & Kirtan Card -->
          <div style="background: linear-gradient(135deg, #3E0812 0%, #881337 100%); color: white; border-radius: 20px; padding: 24px; box-shadow: 0 8px 24px rgba(62,8,18,0.25); display: flex; flex-direction: column; justify-content: space-between; border: 1.5px solid var(--gold-500);">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 2rem; background: rgba(255,255,255,0.15); padding: 8px 12px; border-radius: 50%;">🎼</span>
                <span style="background: rgba(212,175,55,0.3); color: #FFE082; font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 12px;">DEVOTIONAL AUDIO</span>
              </div>
              <h3 style="font-family: var(--font-serif); font-size: 1.5rem; font-weight: 800; margin-bottom: 6px; color: white;">Bhajan & Kirtan</h3>
              <p style="font-size: 0.92rem; opacity: 0.9; line-height: 1.5; margin-bottom: 18px;">Immerse yourself in soul-stirring live kirtans, traditional Vaishnava bhajans, and Prabhupada chanting tracks.</p>
            </div>
            <a href="#/kirtans" class="btn btn-gold" style="font-weight: 700; align-self: start; background: #D4AF37; color: #3E0812; border: none; padding: 10px 20px; border-radius: 12px; font-size: 0.9rem;">
              <span>🎶</span> Listen Bhajans →
            </a>
          </div>
        </div>
      </section>

      <!-- FEATURED UPCOMING EVENTS -->
      <section style="background: var(--bg-subtle); padding: 72px 0;">
        <div class="main-container">
          <div class="section-header">
            <span class="section-subtitle">Devotional Celebrations</span>
            <h2 class="section-title">Upcoming Festivals & Events</h2>
            <div class="sacred-divider"><span>🪷</span></div>
            <p class="section-description">
              Immerse yourself in joyous Vaishnava festivals, cultural presentations, and spiritual discourses.
            </p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 28px;">
            ${events.map(evt => {
              const evtImg = evt.image || evt.imageUrl || 'assets/images/darshan_today.jpg';
              const evtDesc = evt.shortDesc || evt.description || evt.fullDesc || '';
              return `
              <div class="card" style="display: flex; flex-direction: column;">
                <div style="height: 220px; position: relative; background: #222; overflow: hidden;">
                  <img src="${evtImg}" alt="${evt.title || 'Temple Event'}" style="width: 100%; height: 100%; object-fit: cover; object-position: center 10%;">
                  <span style="position: absolute; top: 12px; left: 12px; background: rgba(62, 8, 18, 0.85); color: #FFF9E6; padding: 4px 10px; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; border: 1px solid var(--gold-500);">
                    ${evt.category || 'Festival'}
                  </span>
                </div>
                <div style="padding: 24px; display: flex; flex-direction: column; flex: 1;">
                  <div style="color: var(--saffron-800); font-weight: 700; font-size: 0.85rem; margin-bottom: 6px;">
                    📅 ${evt.date || ''} • ⏰ ${evt.time || ''}
                  </div>
                  <h3 style="font-family: var(--font-serif); font-size: 1.3rem; color: var(--maroon-900); margin-bottom: 10px;">
                    ${evt.title || ''}
                  </h3>
                  <p style="color: var(--text-muted); font-size: 0.92rem; line-height: 1.5; margin-bottom: 18px; flex: 1;">
                    ${evtDesc}
                  </p>
                  <div style="display: flex; gap: 10px; align-items: center; justify-content: space-between;">
                    <a href="#/events/${evt.id}" class="btn btn-primary btn-sm">
                      <span>🎉</span> Event Details
                    </a>
                    <button onclick="window.app.quickRegisterModal('${evt.id}')" class="btn btn-secondary btn-sm">
                      RSVP / Register
                    </button>
                  </div>
                </div>
              </div>
            `}).join('')}
          </div>

          <div style="text-align: center; margin-top: 36px;">
            <a href="#/events" class="btn btn-maroon btn-lg">
              <span>📅</span> Explore Full Festival Calendar
            </a>
          </div>
        </div>
      </section>

      <!-- 6 PILLARS: EXPERIENCE ISKCON -->
      <section class="main-container section-padding">
        <div class="section-header">
          <span class="section-subtitle">The Six Facets of Devotion</span>
          <h2 class="section-title">Experience ISKCON</h2>
          <div class="sacred-divider"><span>🦚</span></div>
          <p class="section-description">
            Discover a holistic spiritual lifestyle designed by Srila Prabhupada for all souls to attain supreme peace.
          </p>
        </div>

        <div class="pillars-grid">
          <div class="pillar-card">
            <div class="pillar-icon-box">🪔</div>
            <h3 class="pillar-title">Divine Darshan</h3>
            <p class="pillar-desc">Experience the breathtaking transcendental beauty of Sri Sri Radha Madanmohanji in daily ornate Shringar.</p>
            <a href="#/darshan" class="btn btn-sm btn-secondary">View Darshan →</a>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon-box">🎶</div>
            <h3 class="pillar-title">Soulful Kirtan</h3>
            <p class="pillar-desc">Immerse your heart in the sublime melodious chanting of the Hare Krishna Maha-Mantra with traditional instruments.</p>
            <a href="#/kirtans" class="btn btn-sm btn-secondary">Listen Kirtan →</a>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon-box">🍲</div>
            <h3 class="pillar-title">Pure Prasadam</h3>
            <p class="pillar-desc">Taste the bliss of sanctified karma-free vegetarian feasts cooked with devotion and offered to Lord Krishna.</p>
            <a href="#/visit" class="btn btn-sm btn-secondary">Sunday Feast →</a>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon-box">📖</div>
            <h3 class="pillar-title">Spiritual Wisdom</h3>
            <p class="pillar-desc">Learn the timeless science of self-realization, karma, and supreme love through Bhagavad Gita As It Is.</p>
            <a href="#/bhagavad-gita" class="btn btn-sm btn-secondary">Explore Gita →</a>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon-box">🙏</div>
            <h3 class="pillar-title">Loving Seva</h3>
            <p class="pillar-desc">Engage in sacred temple services, Anna Daan food relief, cow protection, and festival volunteering.</p>
            <a href="#/seva" class="btn btn-sm btn-secondary">Offer Seva →</a>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon-box">👥</div>
            <h3 class="pillar-title">Vibrant Community</h3>
            <p class="pillar-desc">Connect with uplifting youth forums (IYF), children Sunday schools, family satsangs, and retreats.</p>
            <a href="#/community" class="btn btn-sm btn-secondary">Join Community →</a>
          </div>
        </div>
      </section>

      <!-- SHLOKA OF THE DAY (BHAGAVAD GITA SPOTLIGHT) -->
      <section style="background: linear-gradient(135deg, var(--maroon-900) 0%, #20040A 100%); color: #FFF9E6; padding: 72px 0;">
        <div class="main-container">
          <div style="max-width: 860px; margin: 0 auto; text-align: center;">
            <span class="sacred-badge gold" style="margin-bottom: 16px;">Transcendental Wisdom</span>
            <h2 style="font-family: var(--font-serif); font-size: 2.2rem; color: #FFFDF9; margin-bottom: 16px;">
              Bhagavad Gita Verse of the Day (BG ${gitaKey.verseNum || gitaKey.number || "2.47"})
            </h2>
            
            <div class="shloka-box" style="background: rgba(255, 255, 255, 0.08); border-color: var(--gold-500); color: #FFF;">
              <div class="shloka-sanskrit" style="color: var(--gold-300);">${gitaKey.sanskrit}</div>
              <div class="shloka-transliteration" style="color: #E2E8F0;">${gitaKey.transliteration}</div>
            </div>

            <div style="background: rgba(255, 255, 255, 0.06); border-radius: var(--radius-md); padding: 24px; margin-bottom: 28px; text-align: left; border: 1px solid rgba(212,175,55,0.25);">
              <div style="margin-bottom: 14px;">
                <strong style="color: var(--gold-400); display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 0.95rem;">
                  <span>🇮🇳</span> <strong>हिंदी अनुवाद (Hindi Translation):</strong>
                </strong>
                <p style="font-size: 1.05rem; line-height: 1.7; color: #FFFDF9;">
                  ${gitaKey.translationHi || "तुम्हें अपने कर्म करने का अधिकार है, लेकिन कर्म के फलों पर तुम्हारा कोई अधिकार नहीं है। कर्म के फलों का हेतु मत बनो और न ही अकर्म में तुम्हारी आसक्ति हो।"}
                </p>
              </div>
              <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 14px;">
                <strong style="color: var(--gold-400); display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 0.95rem;">
                  <span>🇬🇧</span> <strong>English Translation:</strong>
                </strong>
                <p style="font-size: 1.05rem; line-height: 1.7; color: #FFFDF9;">
                  ${gitaKey.translationEn || gitaKey.translation || "You have a right to perform your prescribed duty, but you are not entitled to the fruits of action. Never consider yourself the cause of the results of your activities, nor be attached to not doing your duty."}
                </p>
              </div>
            </div>

            <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
              <a href="#/bhagavad-gita" class="btn btn-gold btn-lg">
                <span>📖</span> Read Full Bhagavad Gita
              </a>
              <button onclick="window.app.playKirtanTrack(0)" class="btn btn-outline-light btn-lg">
                <span>🔊</span> Listen Chanting
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- SERVE WITH LOVE & DONATION CTA -->
      <section class="main-container section-padding">
        <div class="section-header">
          <span class="section-subtitle">Transforming Lives Through Charity</span>
          <h2 class="section-title">Support the Mission • Seva</h2>
          <div class="sacred-divider"><span>🙏</span></div>
          <p class="section-description">
            Your generous contributions directly support Anna Daan food distribution, Deity worship, Goshala cow protection, and value education in Gandhidham.
          </p>
        </div>

        <div class="seva-grid">
          ${sevas.map(s => `
            <div class="seva-card">
              <div class="seva-card-media">
                <img src="${s.image}" alt="${s.title}">
                <span class="seva-card-tag">${s.tag}</span>
              </div>
              <div class="seva-card-body">
                <h3 class="seva-card-title">${s.title}</h3>
                <p class="seva-card-desc">${s.shortDesc}</p>
                <div class="seva-impact-badge">
                  🎯 <strong>Impact:</strong> ${s.impact}
                </div>
                <div class="seva-presets-row">
                  ${s.presets.map((p, idx) => `
                    <button class="preset-chip ${idx === 0 ? 'active' : ''}" onclick="window.app.openCheckout('${s.title}', ${p.amount})">
                      ₹${p.amount.toLocaleString()}
                    </button>
                  `).join('')}
                </div>
                <button onclick="window.app.openCheckout('${s.title}', ${s.presets[0].amount})" class="btn btn-primary" style="width: 100%;">
                  <span>❤️</span> Sponsor This Seva
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="text-align: center; margin-top: 40px;">
          <a href="#/seva" class="btn btn-maroon btn-lg">
            <span>🪷</span> View All Seva Opportunities
          </a>
        </div>
      </section>

      <!-- VISIT US & TRAVEL INFO -->
      <section style="background: var(--bg-subtle); padding: 72px 0;">
        <div class="main-container">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 40px; align-items: center;">
            <div>
              <span class="section-subtitle">Pilgrim Information</span>
              <h2 class="section-title" style="text-align: left;">Visit ISKCON Gandhidham</h2>
              <div class="sacred-divider" style="margin-left: 0;"><span>📍</span></div>
              <p style="color: var(--text-muted); font-size: 1.05rem; margin-bottom: 24px; line-height: 1.7;">
                Located near Tagore Garden in Sector 9, Gandhidham (Kutch), our temple offers a serene oasis for prayer, meditation, and spiritual rejuvenation.
              </p>

              <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 28px;">
                <div style="display: flex; gap: 12px; align-items: flex-start;">
                  <span style="color: var(--saffron-800); font-size: 1.3rem;">🏛️</span>
                  <div>
                    <strong>Address:</strong> ${data.info.address}
                  </div>
                </div>
                <div style="display: flex; gap: 12px; align-items: flex-start;">
                  <span style="color: var(--saffron-800); font-size: 1.3rem;">⏰</span>
                  <div>
                    <strong>Visiting Timings:</strong> Morning 4:30 AM – 1:00 PM | Evening 4:30 PM – 8:30 PM
                  </div>
                </div>
                <div style="display: flex; gap: 12px; align-items: flex-start;">
                  <span style="color: var(--saffron-800); font-size: 1.3rem;">📞</span>
                  <div>
                    <strong>Temple Office / Hotline:</strong> ${data.info.phone} / ${data.info.hotline}
                  </div>
                </div>
              </div>

              <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <a href="#/visit" class="btn btn-primary">
                  <span>🚗</span> Directions & Travel Guide
                </a>
                <a href="https://maps.google.com/?q=ISKCON+Gandhidham" target="_blank" rel="noopener" class="btn btn-secondary">
                  <span>🗺️</span> Open Google Maps
                </a>
              </div>
            </div>

            <div>
              <div class="card" style="overflow: hidden; border: 2px solid var(--gold-500);">
                <img src="assets/images/temple_facade.jpg" alt="ISKCON Gandhidham Temple Facade" style="width: 100%; height: 360px; object-fit: cover;">
                <div style="padding: 20px; background: var(--bg-surface); text-align: center;">
                  <strong>Sri Sri Radha Madanmohanji Mandir</strong>
                  <div style="font-size: 0.85rem; color: var(--text-muted);">Gandhidham, Kutch, Gujarat</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // 2. DARSHAN VIEW
  function renderDarshanView() {
    const storeDarshan = window.templeStore ? window.templeStore.getDarshan() : [];
    const gallery = (Array.isArray(storeDarshan) && storeDarshan.length > 0)
      ? storeDarshan
      : (window.TEMPLE_DATA?.darshanGallery || []);
    const today = (window.templeStore && window.templeStore.getTodayDarshan()) || gallery[0] || {};
    const todayImage = today.image || today.imageUrl || 'assets/images/darshan_today.jpg';
    const schedule = (window.templeStore && window.templeStore.getSchedule()) || (window.TEMPLE_DATA?.schedule || []);

    if (!today.title && gallery.length === 0) {
      mainContentElem.innerHTML = `
        <div class="main-container section-padding" style="text-align: center; padding: 100px 20px;">
          <h2 style="font-family: var(--font-serif); color: var(--maroon-900); font-size: 2rem;">Today's Divine Darshan</h2>
          <p style="color: var(--text-muted); margin-top: 12px; font-size: 1.05rem;">Darshan photos are being updated by temple servitors. Please check back shortly.</p>
          <a href="#/" class="btn btn-primary" style="margin-top: 24px;">Return to Home</a>
        </div>
      `;
      return;
    }

    mainContentElem.innerHTML = `
      <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.58) 0%, rgba(15, 2, 5, 0.65) 100%), url('assets/images/gallery/temple_photo_01.jpg') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.50) 100%); pointer-events: none;"></div>
        <div class="main-container" style="position: relative; z-index: 2; text-align: center;">
          <span class="sacred-badge gold">Sacred Deity Vision</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">Today's Divine Darshan</h1>
          <p style="color: var(--gold-300); font-size: 1.1rem; max-width: 600px; margin: 0 auto;">
            Sri Sri Radha Madanmohanji
          </p>
        </div>
      </div>

      <div class="main-container section-padding">
        <!-- Main Featured Darshan -->
        <div class="card" style="margin-bottom: 48px; border: 2px solid var(--gold-500); overflow: hidden;">
          <div class="darshan-featured-card-grid">
            <div style="position: relative; min-height: 520px; max-height: 640px; padding: 20px; background: radial-gradient(circle, #22040A 0%, #0A0103 100%); overflow: hidden; display: flex; align-items: center; justify-content: center;">
              <img src="${todayImage}" alt="${escapeHTML(today.title || 'Sacred Darshan')}" style="max-height: 540px; width: 100%; object-fit: contain; display: block; margin: 0 auto;">
              <button onclick="window.app.openLightbox('${todayImage}', '${escapeHTML(today.title || 'Sacred Darshan').replace(/'/g, "\\'")}')" class="btn btn-gold btn-sm" style="position: absolute; bottom: 16px; right: 16px;">
                <span>🔍</span> Zoom Fullscreen
              </button>
            </div>
            <div style="padding: 36px; display: flex; flex-direction: column; justify-content: center; background: var(--bg-card);">
              <span class="sacred-badge maroon" style="margin-bottom: 8px;">${escapeHTML(today.date || '')}</span>
              <h2 style="font-family: var(--font-serif); font-size: 2rem; color: var(--maroon-900); margin-bottom: 12px;">
                ${escapeHTML(today.title || '')}
              </h2>
              <p style="color: var(--text-muted); font-size: 1rem; line-height: 1.7; margin-bottom: 20px;">
                ${escapeHTML(today.message || today.quote || '')}
              </p>
              <div style="background: var(--saffron-50); border-left: 4px solid var(--saffron-800); padding: 14px; border-radius: var(--radius-sm); margin-bottom: 24px;">
                <strong style="color: var(--maroon-900); display: block; font-size: 0.9rem;">Deity Attire & Shringar:</strong>
                <span style="font-size: 0.92rem; color: var(--text-main);">${escapeHTML(today.attire || today.alankara || '')}</span>
              </div>
              <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <button onclick="window.app.downloadImage('${todayImage}', 'Darshan-${escapeHTML(today.date || 'today').replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg')" class="btn btn-primary">
                  <span>⬇️</span> Download Photo
                </button>
                <button onclick="window.app.shareDarshanWhatsApp('${escapeHTML(today.title || '').replace(/'/g, "\\'")}', '${escapeHTML(today.date || '').replace(/'/g, "\\'")}')" class="btn btn-secondary">
                  <span>💬</span> WhatsApp Status
                </button>
                <button onclick="window.app.openCheckout('Deity Shringar & Royal Poshak Seva', 2501)" class="btn btn-gold">
                  <span>🌸</span> Sponsor Next Shringar
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Darshan Gallery & Archives -->
        <div class="section-header">
          <span class="section-subtitle">Transcendental Archives</span>
          <h2 class="section-title">Past Darshan Gallery</h2>
          <div class="sacred-divider"><span>🪷</span></div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 28px; margin-bottom: 64px;">
          ${gallery.map(item => {
            const itemImage = item.image || item.imageUrl || 'assets/images/darshan_today.jpg';
            const itemTitle = escapeHTML(item.title || '');
            const itemDate = escapeHTML(item.date || '');
            return `
            <div class="card" style="overflow: hidden;">
              <div class="card-media-portrait ${item.id && (item.id.includes('face') || item.id.includes('radharani')) ? '' : 'contain'}">
                <img src="${itemImage}" alt="${itemTitle || 'Deity Darshan'}" class="${item.id && (item.id.includes('face') || item.id.includes('radharani')) ? 'idol-img-top' : 'idol-img-contain'}">
                <span style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.75); color: #FFF; padding: 4px 10px; border-radius: var(--radius-full); font-size: 0.75rem; border: 1px solid var(--gold-500); backdrop-filter: blur(4px);">
                  📅 ${itemDate}
                </span>
              </div>
              <div style="padding: 20px;">
                <h3 style="font-family: var(--font-serif); font-size: 1.15rem; color: var(--maroon-900); margin-bottom: 6px;">
                  ${itemTitle}
                </h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 14px;">${escapeHTML(item.deity || '')}</p>
                <button onclick="window.app.openLightbox('${itemImage}', '${(itemTitle + ' (' + itemDate + ')').replace(/'/g, "\\'")}')" class="btn btn-sm btn-secondary" style="width: 100%;">
                  <span>🔍</span> View High Resolution
                </button>
              </div>
            </div>
          `;}).join('')}
        </div>

        <!-- Aarti Schedule Table -->
        <div class="card" style="padding: 32px;">
          <h3 style="font-family: var(--font-serif); font-size: 1.5rem; color: var(--maroon-900); margin-bottom: 20px; text-align: center;">
            Daily Darshan & Aarti Schedule
          </h3>
          <div class="admin-table-wrapper">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Aarti / Ceremony</th>
                  <th>Timings</th>
                  <th>Spiritual Significance</th>
                </tr>
              </thead>
              <tbody>
                ${schedule.map(s => `
                  <tr>
                    <td><strong>${s.name}</strong></td>
                    <td><span class="sacred-badge gold">${s.time}</span></td>
                    <td>${s.desc}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // 3. EVENTS & FESTIVALS VIEW
  function renderEventsView(params) {
    const events = window.templeStore.getEvents();
    const activeFilter = params.get('category') || 'All';

    const filteredEvents = activeFilter === 'All' 
      ? events 
      : events.filter(e => e.category.toLowerCase() === activeFilter.toLowerCase());

    mainContentElem.innerHTML = `
      <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.58) 0%, rgba(15, 2, 5, 0.65) 100%), url('assets/images/gallery/temple_photo_10.jpg') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.50) 100%); pointer-events: none;"></div>
        <div class="main-container" style="text-align: center;">
          <span class="sacred-badge gold">Spiritual Gatherings</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">Festivals & Events</h1>
          <p style="color: var(--gold-300); font-size: 1.1rem; max-width: 650px; margin: 0 auto;">
            Celebrate divine appearances, youth retreats, and weekly Sunday feasts at ISKCON Gandhidham.
          </p>
        </div>
      </div>

      <div class="main-container section-padding">
        <!-- Filter Tabs -->
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 40px;">
          ${['All', 'Festival', 'Youth', 'Community'].map(cat => `
            <a href="#/events?category=${cat}" class="btn btn-sm ${activeFilter.toLowerCase() === cat.toLowerCase() ? 'btn-primary' : 'btn-secondary'}">
              ${cat === 'All' ? '🌟 All Events' : cat}
            </a>
          `).join('')}
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 32px;">
          ${filteredEvents.map(evt => {
            const evtImg = evt.image || evt.imageUrl || 'assets/images/darshan_today.jpg';
            const evtDesc = evt.shortDesc || evt.description || evt.fullDesc || '';
            return `
            <div class="card" style="display: flex; flex-direction: column;">
              <div style="height: 240px; position: relative; background: #222;">
                <img src="${evtImg}" alt="${evt.title || 'Temple Event'}" style="width: 100%; height: 100%; object-fit: cover;">
                <span class="sacred-badge maroon" style="position: absolute; top: 12px; left: 12px;">
                  ${evt.category || 'Festival'}
                </span>
                ${evt.freeEntry ? '<span class="sacred-badge gold" style="position: absolute; top: 12px; right: 12px;">Free Entry</span>' : ''}
              </div>
              <div style="padding: 28px; display: flex; flex-direction: column; flex: 1;">
                <div style="color: var(--saffron-800); font-weight: 700; font-size: 0.88rem; margin-bottom: 8px;">
                  📅 ${evt.date || ''} • ⏰ ${evt.time || ''}
                </div>
                <h3 style="font-family: var(--font-serif); font-size: 1.35rem; color: var(--maroon-900); margin-bottom: 12px;">
                  ${evt.title || ''}
                </h3>
                <p style="color: var(--text-muted); font-size: 0.92rem; line-height: 1.6; margin-bottom: 20px; flex: 1;">
                  ${evtDesc}
                </p>

                <div style="background: var(--bg-subtle); padding: 12px; border-radius: var(--radius-sm); margin-bottom: 20px; font-size: 0.85rem;">
                  📍 <strong>Venue:</strong> ${evt.location || 'Temple Sanctuary'}
                </div>

                <div style="display: flex; gap: 12px; justify-content: space-between; align-items: center;">
                  <a href="#/events/${evt.id}" class="btn btn-primary">
                    View Full Schedule →
                  </a>
                  <button onclick="window.app.quickRegisterModal('${evt.id}')" class="btn btn-secondary">
                    Register RSVP
                  </button>
                </div>
              </div>
            </div>
          `}).join('')}
        </div>
      </div>
    `;
  }

  // 4. EVENT DETAIL VIEW
  function renderEventDetailView(eventId) {
    const evt = window.templeStore.getEventById(eventId);
    if (!evt) {
      mainContentElem.innerHTML = `
        <div class="main-container section-padding" style="text-align: center;">
          <h2>Event Not Found</h2>
          <a href="#/events" class="btn btn-primary" style="margin-top: 20px;">Back to Events</a>
        </div>
      `;
      return;
    }

    const detailImg = evt.image || evt.imageUrl || 'assets/images/darshan_today.jpg';
    const detailDesc = evt.fullDesc || evt.description || evt.shortDesc || '';

    mainContentElem.innerHTML = `
      <div style="background: linear-gradient(135deg, var(--maroon-900) 0%, #20040A 100%); color: #FFF; padding: 60px 0;">
        <div class="main-container">
          <a href="#/events" style="color: var(--gold-300); font-weight: 600; font-size: 0.9rem;">← Back to All Events</a>
          <span class="sacred-badge gold" style="display: block; width: fit-content; margin-top: 16px;">${evt.category || 'Festival'}</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">${evt.title || ''}</h1>
          <div style="color: #FFE082; font-size: 1.1rem;">
            📅 <strong>Date:</strong> ${evt.date || ''} | ⏰ <strong>Time:</strong> ${evt.time || ''}
          </div>
        </div>
      </div>

      <div class="main-container section-padding">
        <div style="display: grid; grid-template-columns: 1fr; @media(min-width:900px){grid-template-columns: 2fr 1fr;} gap: 40px;">
          <div>
            <img src="${detailImg}" alt="${evt.title || 'Event'}" style="width: 100%; height: 400px; object-fit: cover; border-radius: var(--radius-lg); margin-bottom: 32px; border: 2px solid var(--border-color);">

            <h2 style="font-family: var(--font-serif); font-size: 1.8rem; color: var(--maroon-900); margin-bottom: 16px;">About This Festival</h2>
            <p style="color: var(--text-main); font-size: 1.05rem; line-height: 1.8; margin-bottom: 28px;">
              ${detailDesc}
            </p>

            ${evt.highlights && evt.highlights.length > 0 ? `
              <div class="card" style="padding: 28px; background: var(--bg-subtle); margin-bottom: 32px;">
                <h3 style="font-family: var(--font-serif); font-size: 1.3rem; color: var(--maroon-900); margin-bottom: 16px;">
                  ✨ Festival Highlights & Schedule
                </h3>
                <ul style="list-style: none; display: flex; flex-direction: column; gap: 10px;">
                  ${evt.highlights.map(h => `
                    <li style="display: flex; align-items: center; gap: 10px; font-size: 0.98rem;">
                      <span style="color: var(--saffron-800); font-weight: bold;">•</span>
                      <span>${h}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}

            ${evt.speaker ? `
              <div style="background: var(--saffron-50); border-left: 4px solid var(--saffron-800); padding: 18px; border-radius: var(--radius-sm); margin-bottom: 32px;">
                <strong>Key Speaker / Distinguished Sannyasi:</strong>
                <p style="color: var(--maroon-900); font-size: 1.05rem; font-weight: 600; margin-top: 4px;">${evt.speaker}</p>
              </div>
            ` : ''}
          </div>

          <div>
            <div class="card" style="padding: 32px; position: sticky; top: 100px;">
              <h3 style="font-family: var(--font-serif); font-size: 1.4rem; color: var(--maroon-900); margin-bottom: 20px;">
                Event Participation
              </h3>

              <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px; font-size: 0.95rem;">
                <div>📍 <strong>Venue:</strong> ${evt.location}</div>
                <div>🎟️ <strong>Entry:</strong> ${evt.freeEntry ? 'Free for all devotees' : evt.fee}</div>
                <div>🍲 <strong>Prasadam:</strong> Free Maha Feast included</div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 12px;">
                <button onclick="window.app.quickRegisterModal('${evt.id}')" class="btn btn-primary btn-lg" style="width: 100%;">
                  <span>📝</span> Register / RSVP Now
                </button>
                <button onclick="window.app.downloadCalendarEvent('${evt.id}')" class="btn btn-secondary" style="width: 100%;">
                  <span>📅</span> Add to Google / Apple Calendar
                </button>
                <button onclick="window.app.shareEventWhatsApp('${evt.title}', '${evt.date}')" class="btn btn-secondary" style="width: 100%;">
                  <span>💬</span> Invite on WhatsApp
                </button>
                <button onclick="window.app.openCheckout('Janmashtami Festival Maha Seva', 5001)" class="btn btn-gold" style="width: 100%;">
                  <span>🪷</span> Sponsor Festival Seva
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 5. SPIRITUALITY HUB VIEW
  function renderSpiritualityLandingView() {
    mainContentElem.innerHTML = `
      <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.58) 0%, rgba(15, 2, 5, 0.65) 100%), url('assets/images/gallery/temple_photo_12.jpg') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.50) 100%); pointer-events: none;"></div>
        <div class="main-container" style="position: relative; z-index: 2; text-align: center;">
          <span class="sacred-badge gold">Sanatana Dharma Wisdom</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">Spiritual Knowledge Hub</h1>
          <p style="color: var(--gold-300); font-size: 1.1rem; max-width: 650px; margin: 0 auto;">
            Explore the sublime science of Krishna consciousness, transcendental discourses, and Vaishnava literatures.
          </p>
        </div>
      </div>

      <div class="main-container section-padding">
        <div class="pillars-grid">
          <div class="pillar-card" style="border: 2px solid var(--gold-500); background: linear-gradient(145deg, #FFFDF9 0%, #FFF8EA 100%);">
            <div class="pillar-icon-box">🪷</div>
            <h3 class="pillar-title">Mantras & Sacred Shlokas</h3>
            <p class="pillar-desc">Explore daily Vaishnava prayers, Atma-samarpana (self-surrender), Pranama mantras, and transliterations.</p>
            <a href="#/mantras" class="btn btn-primary" style="width: 100%; background: linear-gradient(135deg, var(--gold-600), var(--gold-700)); color: var(--maroon-950); font-weight: 800;">Explore Mantras & Shlokas →</a>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon-box">📖</div>
            <h3 class="pillar-title">Bhagavad Gita As It Is</h3>
            <p class="pillar-desc">Explore all 18 chapters with Sanskrit verses, English translations, and purports by Srila Prabhupada.</p>
            <a href="#/bhagavad-gita" class="btn btn-primary" style="width: 100%;">Read Bhagavad Gita →</a>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon-box">🎙️</div>
            <h3 class="pillar-title">Spiritual Lectures</h3>
            <p class="pillar-desc">Watch and listen to enlightening discourses on karma, mind control, self-realization, and devotion.</p>
            <a href="#/lectures" class="btn btn-primary" style="width: 100%;">Browse Lectures →</a>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon-box">🎵</div>
            <h3 class="pillar-title">Kirtans & Audio</h3>
            <p class="pillar-desc">Experience transcendental peace with traditional Vaishnava bhajans, prayers, and Hare Krishna chanting.</p>
            <a href="#/kirtans" class="btn btn-primary" style="width: 100%;">Listen Kirtans →</a>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon-box">📝</div>
            <h3 class="pillar-title">Wisdom Articles</h3>
            <p class="pillar-desc">Thought-provoking essays on modern science, vegetarianism, reincarnation, and Vedic lifestyle.</p>
            <a href="#/articles" class="btn btn-primary" style="width: 100%;">Read Articles →</a>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon-box">📚</div>
            <h3 class="pillar-title">Spiritual Library</h3>
            <p class="pillar-desc">Comprehensive digital library covering books, audio downloads, magazines, and educational resources.</p>
            <a href="#/library" class="btn btn-primary" style="width: 100%;">Open Library →</a>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon-box">❓</div>
            <h3 class="pillar-title">Vedic Q & A</h3>
            <p class="pillar-desc">Get authoritative scriptural answers to contemporary doubts regarding karma, destiny, and spirituality.</p>
            <a href="#/visit" class="btn btn-primary" style="width: 100%;">View FAQs →</a>
          </div>
        </div>
      </div>
    `;
  }

  // 5.1 MANTRAS & SACRED SHLOKAS EXPLORER VIEW
  function renderMantrasAndShlokasView(params) {
    const allMantras = window.TEMPLE_DATA.mantrasAndShlokas || [];
    const selectedCategory = params.get('category') || 'All';
    const searchQuery = (params.get('q') || '').toLowerCase().trim();

    let filtered = allMantras;
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }
    if (searchQuery) {
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(searchQuery) ||
        m.translation.toLowerCase().includes(searchQuery) ||
        m.transliteration.toLowerCase().includes(searchQuery) ||
        (m.sanskrit && m.sanskrit.includes(searchQuery))
      );
    }

    const featuredMantra = allMantras.find(m => m.id === 'atma-samarpana') || allMantras[0];
    const categories = ['All', 'Surrender & Sharanagati', 'Maha-Mantra', 'Pranama Mantras', 'Daily Prayers', 'Protection Mantras'];

    mainContentElem.innerHTML = `
      <div style="background: linear-gradient(135deg, var(--maroon-900) 0%, #20040A 100%); color: #FFF; padding: 55px 0;">
        <div class="main-container" style="text-align: center;">
          <span class="sacred-badge gold">Transcendental Vedic Prayers</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 10px 0; color: #FFFDF9;">
            Mantras & Sacred Shlokas
          </h1>
          <p style="color: var(--gold-300); font-size: 1.1rem; max-width: 680px; margin: 0 auto; line-height: 1.6;">
            Daily Vaishnava prayers, self-surrender verses (Ātma-samarpaṇa), Deity pranamas, and Sanskrit mantras for meditation and altar offerings.
          </p>
        </div>
      </div>

      <div class="main-container section-padding">

        <!-- FEATURED HERO BOX: OFFERING ONESELF TO THE LORD (ATMA-SAMARPANA) -->
        <div class="mantra-hero-container">
          <div class="mantra-featured-card">
            
            <!-- Box Title from user reference -->
            <div class="mantra-title-box">
              <h2>Offering Oneself to the Lord (ātma-samarpaṇa)</h2>
            </div>

            <!-- Instruction bullet -->
            <div class="mantra-instruction-line">
              Offer yourself to the Lord while reciting this verse:
            </div>

            <!-- Transliteration Box -->
            <div class="mantra-transliteration-box">
              <div class="mantra-transliteration-text">
ahaṁ bhagavato 'ṁśo 'smi
sadā dāso 'smi sarvathā
tvat-kṛpāpekṣako nityam ity
ātmānaṁ samarpaye
              </div>
            </div>

            <!-- Sanskrit Devanagari Toggle Area -->
            <div id="atma-samarpana-sanskrit" class="mantra-sanskrit-toggle-content">
              <div class="mantra-sanskrit-text">
अहं भगवतो ऽंशो ऽस्मि सदा दासो ऽस्मि सर्वथा ।
त्वत्कृपापेक्षको नित्यमित्यात्मानं समर्पये ॥
              </div>
            </div>

            <!-- English Translation -->
            <div class="mantra-translation-box">
              O Lord, I offer myself to You in full surrender, always praying for Your mercy and considering myself eternally part and parcel of You.
            </div>

            <!-- Purport / Context note -->
            <div style="background: rgba(212,175,55,0.1); border-left: 3px solid var(--gold-500); padding: 12px 16px; border-radius: 4px; font-size: 0.88rem; color: #4A1A24; line-height: 1.6; margin-bottom: 20px;">
              <strong>🌺 Spiritual Significance:</strong> Recited with devotion during morning altar meditation or whenever seeking shelter of Sri Sri Radha Madanmohanji in full humility and surrender.
            </div>

            <!-- Action Bar -->
            <div class="mantra-actions-bar">
              <div class="mantra-action-group">
                <button class="btn-mantra-action primary" onclick="window.app.chantMantra('${featuredMantra.id}')" title="Listen to spoken audio chanting of this verse">
                  <span>🔊</span> Chant & Recite
                </button>
                <button class="btn-mantra-action" onclick="window.app.toggleMantraSanskrit('atma-samarpana-sanskrit')" title="Show/Hide Devanagari Sanskrit text">
                  <span>🕉️</span> Toggle Sanskrit
                </button>
                <button class="btn-mantra-action" onclick="window.app.copyShlokaById('${featuredMantra.id}')" title="Copy Shloka text to clipboard">
                  <span>📋</span> Copy Shloka
                </button>
              </div>

              <div class="mantra-action-group">
                <button class="btn-mantra-action whatsapp" onclick="window.app.shareMantraById('${featuredMantra.id}')" title="Share this holy shloka on WhatsApp">
                  <span>💬</span> Share on WhatsApp
                </button>
              </div>
            </div>

          </div>
        </div>

        <!-- SACRED DIVIDER -->
        <div class="sacred-divider" style="margin: 40px 0;"><span>🪷</span></div>

        <!-- CATEGORY FILTER TABS & SEARCH -->
        <div class="section-header" style="margin-bottom: 20px;">
          <span class="section-subtitle">Vaishnava Prayer Treasury</span>
          <h2 class="section-title">All Essential Daily Mantras & Shlokas</h2>
        </div>

        <div style="max-width: 500px; margin: 0 auto 24px auto;">
          <input type="text" id="mantra-search-input" class="form-input" placeholder="🔍 Search prayers, Sanskrit words, or meanings..." value="${searchQuery}" onkeyup="if(event.key==='Enter') window.app.searchMantras(this.value)">
        </div>

        <div class="mantras-tab-bar">
          ${categories.map(cat => `
            <button class="mantra-tab-btn ${selectedCategory === cat ? 'active' : ''}" onclick="window.location.hash='#/mantras?category=${encodeURIComponent(cat)}'">
              ${cat === 'All' ? '🌟 All Mantras' : cat}
            </button>
          `).join('')}
        </div>

        <!-- MANTRAS LIST GRID -->
        <div class="mantras-grid">
          ${filtered.map(m => `
            <div class="mantra-card">
              <div>
                <div class="mantra-card-header">
                  <div>
                    <h3 class="mantra-card-title">${m.title}</h3>
                    <span style="font-size: 0.76rem; color: var(--saffron-800); font-weight: 700;">${m.category}</span>
                  </div>
                  <span class="sacred-badge gold" style="font-size: 0.72rem;">${m.tag}</span>
                </div>

                ${m.instruction ? `
                  <div style="font-size: 0.84rem; color: var(--text-muted); font-weight: 600; margin-bottom: 10px;">
                    • ${m.instruction}
                  </div>
                ` : ''}

                <div class="mantra-card-sanskrit-preview">
                  ${m.sanskrit}
                </div>

                <div class="mantra-card-transliteration">
                  ${m.transliteration}
                </div>

                <div class="mantra-card-translation">
                  <strong>Translation:</strong> ${m.translation}
                </div>

                ${m.whenToChant ? `
                  <div style="font-size: 0.78rem; color: #7A5835; margin-bottom: 14px; background: rgba(0,0,0,0.03); padding: 6px 10px; border-radius: 4px;">
                    ⏰ <strong>When to chant:</strong> ${m.whenToChant}
                  </div>
                ` : ''}
              </div>

              <div class="mantra-actions-bar" style="margin-top: 10px; padding-top: 12px;">
                <div class="mantra-action-group">
                  <button class="btn-mantra-action" onclick="window.app.chantMantra('${m.id}')" title="Listen / Chant">
                    <span>🔊</span> Chant
                  </button>
                  <button class="btn-mantra-action" onclick="window.app.copyShlokaById('${m.id}')" title="Copy text">
                    <span>📋</span> Copy
                  </button>
                </div>
                <button class="btn-mantra-action whatsapp" onclick="window.app.shareMantraById('${m.id}')" title="Share on WhatsApp">
                  <span>💬</span> WhatsApp
                </button>
              </div>
            </div>
          `).join('')}
        </div>

      </div>
    `;
  }

  // 6. BHAGAVAD GITA EXPLORER VIEW
    // 8. BHAGAVAD GITA VIEW WITH COMPLETE 18 CHAPTERS & 3 LANGUAGES
  window.currentGitaLang = 'all';
  window.currentGitaVerseIdx = 0;

  function renderBhagavadGitaView(params) {
    const gita = window.TEMPLE_DATA.bhagavadGita;
    
    // Ensure all chapters have a verses array (fallback to keyVerse if single verse)
    gita.chapters.forEach(ch => {
      if (!ch.verses || ch.verses.length === 0) {
        if (ch.keyVerse) {
          ch.verses = [ch.keyVerse];
        }
      }
    });

    const selectedChapterNum = parseInt(params.get('chapter')) || 1;
    const selectedVerseParam = parseInt(params.get('verse')) || 1;
    const chapter = gita.chapters.find(c => c.number === selectedChapterNum) || gita.chapters[0];
    
    if (!chapter.verses || chapter.verses.length === 0) {
      if (chapter.keyVerse) {
        chapter.verses = [chapter.keyVerse];
      }
    }

    if (selectedVerseParam > 0 && selectedVerseParam <= chapter.verses.length) {
      window.currentGitaVerseIdx = selectedVerseParam - 1;
    } else {
      window.currentGitaVerseIdx = 0;
    }

    const currentVerse = chapter.verses[window.currentGitaVerseIdx] || chapter.verses[0] || chapter.keyVerse;
    const lang = window.currentGitaLang || 'all';

    mainContentElem.innerHTML = `
      <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.58) 0%, rgba(15, 2, 5, 0.65) 100%), url('assets/images/gallery/temple_photo_05.jpg') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.50) 100%); pointer-events: none;"></div>
        <div class="main-container" style="position: relative; z-index: 2; text-align: center;">
          <span class="sacred-badge gold">The Song of God • श्रीमद्भगवद्गीता</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.5rem; margin: 10px 0; color: #FFFDF9;">Bhagavad Gita As It Is</h1>
          <p style="color: var(--gold-300); font-size: 1rem; max-width: 650px; margin: 0 auto;">
            Complete 18 Chapters with Tri-Lingual Sanskrit Shlokas, Transliteration, Word-by-Word Meanings, Translations, and Elaborate Purports.
          </p>
        </div>
      </div>

      <div class="main-container section-padding">
        <!-- THREE LANGUAGE TOGGLE BAR -->
        <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-bottom: 32px; background: #FFFDF9; padding: 16px; border-radius: var(--radius-md); border: 2px solid var(--gold-400); box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
          <strong style="color: var(--maroon-900); align-self: center; margin-right: 8px;">🌐 Select Language:</strong>
          <button class="btn btn-sm ${lang === 'all' ? 'btn-gold' : 'btn-outline-secondary'}" onclick="window.app.setGitaLanguage('all')">🌐 Tri-Lingual (All 3 Languages)</button>
          <button class="btn btn-sm ${lang === 'hi' ? 'btn-gold' : 'btn-outline-secondary'}" onclick="window.app.setGitaLanguage('hi')">🇮🇳 Hindi (हिंदी अनुवाद व तात्पर्य)</button>
          <button class="btn btn-sm ${lang === 'en' ? 'btn-gold' : 'btn-outline-secondary'}" onclick="window.app.setGitaLanguage('en')">🇬🇧 English (Translation & Purport)</button>
          <button class="btn btn-sm ${lang === 'sa' ? 'btn-gold' : 'btn-outline-secondary'}" onclick="window.app.setGitaLanguage('sa')">📜 Sanskrit (मूल संस्कृत श्लोक)</button>
        </div>

        <div class="gita-container">
          <!-- All 18 Chapters Sidebar -->
          <div class="gita-sidebar" style="background: #FFFDF9; border: 1px solid var(--gold-300); border-radius: var(--radius-md); padding: 18px;">
            <h3 style="font-family: var(--font-serif); font-size: 1.2rem; color: var(--maroon-900); margin-bottom: 14px; border-bottom: 2px solid var(--gold-400); padding-bottom: 8px;">
              📖 All 18 Chapters
            </h3>
            <ul class="gita-chapter-list" style="max-height: 600px; overflow-y: auto;">
              ${gita.chapters.map(c => `
                <li class="gita-chapter-item ${c.number === chapter.number ? 'active' : ''}" onclick="window.app.selectGitaVerse(${c.number}, 1)" style="padding: 10px 12px; border-radius: 8px; margin-bottom: 4px; cursor: pointer;">
                  <div>
                    <strong style="color: var(--maroon-900);">Ch ${c.number}:</strong> ${c.titleSanskrit}
                    <div style="font-size: 0.78rem; color: var(--text-muted);">${c.titleEnglish}</div>
                  </div>
                  <span class="sacred-badge gold" style="font-size: 0.7rem; padding: 2px 6px;">${c.versesCount || (c.verses ? c.verses.length : 1)}v</span>
                </li>
              `).join('')}
            </ul>
          </div>

          <!-- Verse & Chapter Viewer -->
          <div class="gita-verse-viewer">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
              <div>
                <span class="sacred-badge maroon">Chapter ${chapter.number} of 18</span>
                <h2 style="font-family: var(--font-serif); font-size: 2rem; color: var(--maroon-900); margin: 6px 0 2px 0;">
                  ${chapter.titleSanskrit} • ${chapter.titleHindi || chapter.titleEnglish}
                </h2>
                <div style="color: var(--saffron-800); font-weight: 600; font-size: 0.95rem;">
                  ${chapter.titleEnglish} (${chapter.versesCount} Verses)
                </div>
              </div>
            </div>

            <div style="background: var(--saffron-50); border-left: 4px solid var(--saffron-800); padding: 14px 18px; border-radius: var(--radius-sm); margin-bottom: 28px; font-size: 0.95rem; line-height: 1.6; color: var(--text-main);">
              <strong>Chapter Summary:</strong> ${lang === 'hi' ? (chapter.summaryHi || chapter.summaryEn) : chapter.summaryEn}
            </div>

            <!-- VERSE NAVIGATOR CONTROLS -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 28px; padding: 14px 18px; background: var(--bg-subtle); border-radius: var(--radius-md); border: 1.5px solid var(--gold-400);">
              <div style="display: flex; gap: 10px; align-items: center;">
                <strong style="color: var(--maroon-900); font-size: 0.92rem;">Jump to Verse:</strong>
                <select id="gita-verse-select" onchange="window.app.selectGitaVerse(${chapter.number}, this.value)" style="padding: 6px 14px; border-radius: 8px; border: 1.5px solid var(--gold-500); background: #FFF; font-weight: 700; color: var(--maroon-900);">
                  ${chapter.verses.map((v, i) => `<option value="${i+1}" ${i === window.currentGitaVerseIdx ? 'selected' : ''}>Verse ${chapter.number}.${i+1}</option>`).join('')}
                </select>
              </div>

              <div style="display: flex; gap: 8px;">
                <button onclick="window.app.prevGitaVerse(${chapter.number})" class="btn btn-sm btn-secondary" ${window.currentGitaVerseIdx === 0 ? 'disabled' : ''}>
                  ⬅️ Prev Verse
                </button>
                <button onclick="window.app.nextGitaVerse(${chapter.number}, ${chapter.verses.length})" class="btn btn-sm btn-gold" ${window.currentGitaVerseIdx === chapter.verses.length - 1 ? 'disabled' : ''}>
                  Next Verse ➔
                </button>
              </div>
            </div>

            <!-- ACTIVE SHLOKA CARD -->
            <div class="card" style="padding: 28px; border: 2px solid var(--gold-500); background: #FFFDF9; margin-bottom: 36px; border-radius: 20px; box-shadow: 0 12px 32px rgba(62,8,18,0.08);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span class="sacred-badge gold" style="font-size: 0.85rem; padding: 4px 12px;">🪔 Shloka BG ${currentVerse.verseNum}</span>
                <span style="font-size: 0.8rem; color: var(--text-muted);">Sanskrit • English • Hindi</span>
              </div>

              <!-- SANSKRIT SHLOKA (Always Visible) -->
              <div class="shloka-box" style="background: linear-gradient(135deg, var(--maroon-900) 0%, #25050C 100%); color: #FFF; padding: 24px; border-radius: 14px; text-align: center; margin-bottom: 24px; border: 1px solid var(--gold-400);">
                <div class="shloka-sanskrit" style="font-family: var(--font-sanskrit); font-size: 1.45rem; line-height: 2.0; color: #FFE082; white-space: pre-line;">${currentVerse.sanskrit}</div>
                <div class="shloka-transliteration" style="font-style: italic; color: #E2E8F0; margin-top: 12px; font-size: 0.95rem;">${currentVerse.transliteration}</div>
              </div>

              <!-- WORD BY WORD ANVAYA -->
              ${(lang === 'all' || lang === 'en' || lang === 'hi') && currentVerse.anvayaEn ? `
                <div style="background: #FDFBF7; border: 1px solid var(--gold-300); padding: 16px; border-radius: 12px; margin-bottom: 20px;">
                  <strong style="color: var(--maroon-900); display: block; margin-bottom: 6px; font-size: 0.9rem;">
                    📝 Word-for-Word Meanings (पदच्छेद / अनवय):
                  </strong>
                  ${(lang === 'all' || lang === 'hi') && currentVerse.anvayaHi ? `<div style="color: var(--text-main); font-size: 0.9rem; margin-bottom: 4px;">🇮🇳 ${currentVerse.anvayaHi}</div>` : ''}
                  ${(lang === 'all' || lang === 'en') && currentVerse.anvayaEn ? `<div style="color: var(--text-muted); font-size: 0.88rem;">🇬🇧 ${currentVerse.anvayaEn}</div>` : ''}
                </div>
              ` : ''}

              <!-- TRANSLATION SECTION -->
              <div style="margin-bottom: 24px;">
                <h4 style="font-family: var(--font-serif); color: var(--maroon-900); font-size: 1.15rem; margin-bottom: 10px; border-left: 4px solid var(--gold-500); padding-left: 10px;">
                  📖 Translation (अनुवाद)
                </h4>
                ${(lang === 'all' || lang === 'hi') && currentVerse.translationHi ? `
                  <div style="background: #FFF8E1; border: 1px solid var(--saffron-200); padding: 14px; border-radius: 10px; margin-bottom: 10px;">
                    <strong style="color: var(--saffron-900); display: block; font-size: 0.85rem; margin-bottom: 4px;">🇮🇳 हिंदी अनुवाद:</strong>
                    <p style="font-size: 1rem; line-height: 1.6; color: var(--text-main);">${currentVerse.translationHi}</p>
                  </div>
                ` : ''}
                ${(lang === 'all' || lang === 'en') && currentVerse.translationEn ? `
                  <div style="background: #F3ECE0; border: 1px solid var(--gold-300); padding: 14px; border-radius: 10px; margin-bottom: 10px;">
                    <strong style="color: var(--maroon-900); display: block; font-size: 0.85rem; margin-bottom: 4px;">🇬🇧 English Translation:</strong>
                    <p style="font-size: 1rem; line-height: 1.6; color: var(--text-main);">${currentVerse.translationEn}</p>
                  </div>
                ` : ''}
                ${(lang === 'all' || lang === 'sa') && currentVerse.translationSa ? `
                  <div style="background: #FAF6EE; border: 1px solid var(--gold-300); padding: 14px; border-radius: 10px;">
                    <strong style="color: var(--gold-700); display: block; font-size: 0.85rem; margin-bottom: 4px;">📜 संस्कृत भावार्थ:</strong>
                    <p style="font-size: 0.98rem; line-height: 1.6; color: var(--text-main); font-family: var(--font-sanskrit);">${currentVerse.translationSa}</p>
                  </div>
                ` : ''}
              </div>

              <!-- PURPORT & EXPLANATION SECTION -->
              <div>
                <h4 style="font-family: var(--font-serif); color: var(--maroon-900); font-size: 1.15rem; margin-bottom: 10px; border-left: 4px solid var(--saffron-800); padding-left: 10px;">
                  🪷 Purport & Elaborate Explanation (तात्पर्य एवं व्याख्या)
                </h4>
                ${(lang === 'all' || lang === 'hi') && currentVerse.purportHi ? `
                  <div style="background: #FFF; border: 1px solid #E2E8F0; padding: 16px; border-radius: 10px; margin-bottom: 10px; line-height: 1.7; color: var(--text-main); font-size: 0.95rem;">
                    <strong style="color: var(--saffron-900); display: block; font-size: 0.85rem; margin-bottom: 6px;">🇮🇳 हिंदी तात्पर्य (श्रील प्रभुपाद / वैधानिक व्याख्या):</strong>
                    ${currentVerse.purportHi}
                  </div>
                ` : ''}
                ${(lang === 'all' || lang === 'en') && currentVerse.purportEn ? `
                  <div style="background: #FFF; border: 1px solid #E2E8F0; padding: 16px; border-radius: 10px; margin-bottom: 10px; line-height: 1.7; color: var(--text-main); font-size: 0.95rem;">
                    <strong style="color: var(--maroon-900); display: block; font-size: 0.85rem; margin-bottom: 6px;">🇬🇧 English Purport (Srila Prabhupada Commentary):</strong>
                    ${currentVerse.purportEn}
                  </div>
                ` : ''}
                ${(lang === 'all' || lang === 'sa') && currentVerse.purportSa ? `
                  <div style="background: #FFF; border: 1px solid #E2E8F0; padding: 16px; border-radius: 10px; line-height: 1.7; color: var(--text-main); font-size: 0.95rem; font-family: var(--font-sanskrit);">
                    <strong style="color: var(--gold-700); display: block; font-size: 0.85rem; margin-bottom: 6px;">📜 संस्कृत तात्पर्यम्:</strong>
                    ${currentVerse.purportSa}
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- ALL VERSES QUICK INDEX OF THIS CHAPTER -->
            <div class="card" style="padding: 24px; border: 1px solid var(--gold-300);">
              <h4 style="font-family: var(--font-serif); font-size: 1.15rem; color: var(--maroon-900); margin-bottom: 14px;">
                📜 Chapter ${chapter.number} Verse Index (${chapter.verses.length} Verses)
              </h4>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${chapter.verses.map((v, i) => `
                  <button onclick="window.app.selectGitaVerse(${chapter.number}, ${i+1})" class="btn btn-sm ${i === window.currentGitaVerseIdx ? 'btn-gold' : 'btn-outline-secondary'}" style="min-width: 48px;">
                    ${chapter.number}.${i+1}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }


  function renderLecturesView() {
    const lectures = window.TEMPLE_DATA.lectures;
    mainContentElem.innerHTML = `
      <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.58) 0%, rgba(15, 2, 5, 0.65) 100%), url('assets/images/gallery/temple_photo_07.jpg') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.50) 100%); pointer-events: none;"></div>
        <div class="main-container" style="position: relative; z-index: 2; text-align: center;">
          <span class="sacred-badge gold">Audio & Video Discourses</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">Spiritual Lectures Library</h1>
          <p style="color: var(--gold-300); font-size: 1.1rem; max-width: 650px; margin: 0 auto;">
            Listen to timeless discourses by Srila Prabhupada and senior Vaishnava scholars.
          </p>
        </div>
      </div>

      <div class="main-container section-padding">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 28px;">
          ${lectures.map(lec => `
            <div class="card" style="display: flex; flex-direction: column;">
              <div style="height: 200px; position: relative; background: #222;">
                <img src="${lec.thumbnail}" alt="${lec.title}" style="width: 100%; height: 100%; object-fit: cover;">
                <span class="sacred-badge gold" style="position: absolute; bottom: 10px; right: 10px;">
                  ⏱️ ${lec.duration}
                </span>
                <span class="sacred-badge maroon" style="position: absolute; top: 10px; left: 10px;">
                  ${lec.category}
                </span>
              </div>
              <div style="padding: 24px; display: flex; flex-direction: column; flex: 1;">
                <h3 style="font-family: var(--font-serif); font-size: 1.25rem; color: var(--maroon-900); margin-bottom: 8px;">
                  ${lec.title}
                </h3>
                <div style="color: var(--saffron-800); font-weight: 600; font-size: 0.85rem; margin-bottom: 12px;">
                  🎙️ Speaker: ${lec.speaker}
                </div>
                <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; margin-bottom: 20px; flex: 1;">
                  ${lec.summary}
                </p>
                <button onclick="window.app.playLectureAudio('${lec.title}', '${lec.speaker}')" class="btn btn-primary" style="width: 100%;">
                  <span>▶️</span> Listen Discourse
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 8. KIRTANS VIEW
  function renderKirtansView() {
    const storeAudio = window.templeStore ? window.templeStore.getMediaAudio() : [];
    const kirtans = (Array.isArray(storeAudio) && storeAudio.length > 0)
      ? storeAudio
      : (window.TEMPLE_DATA?.kirtans || []);
    mainContentElem.innerHTML = `
      <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.58) 0%, rgba(15, 2, 5, 0.65) 100%), url('assets/images/gallery/temple_photo_15.jpg') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.50) 100%); pointer-events: none;"></div>
        <div class="main-container" style="position: relative; z-index: 2; text-align: center;">
          <span class="sacred-badge gold">Transcendental Sound Vibration</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">Kirtan & Bhajan Audio Hub</h1>
          <p style="color: var(--gold-300); font-size: 1.1rem; max-width: 650px; margin: 0 auto;">
            "Hare Krishna Hare Krishna Krishna Krishna Hare Hare, Hare Rama Hare Rama Rama Rama Hare Hare"
          </p>
        </div>
      </div>

      <div class="main-container section-padding">
        <div style="display: grid; grid-template-columns: 1fr; @media(min-width:900px){grid-template-columns: 1.2fr 0.8fr;} gap: 36px;">
          <!-- Kirtan Track List -->
          <div>
            <h2 style="font-family: var(--font-serif); font-size: 1.8rem; color: var(--maroon-900); margin-bottom: 20px;">
              Featured Vaishnava Prayers
            </h2>
            <div style="display: flex; flex-direction: column; gap: 16px;">
              ${kirtans.map((track, idx) => `
                <div class="card" style="padding: 18px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                  <div style="display: flex; align-items: center; gap: 16px;">
                    <button onclick="window.app.playKirtanTrack(${idx})" class="btn-search-trigger" style="background: var(--saffron-100); color: var(--saffron-900); width: 44px; height: 44px;">
                      <span>▶️</span>
                    </button>
                    <div>
                      <h4 style="font-family: var(--font-serif); font-size: 1.1rem; color: var(--maroon-900); margin-bottom: 4px;">
                        ${track.title}
                      </h4>
                      <span style="font-size: 0.82rem; color: var(--text-muted);">
                        🎤 ${track.artist} • ⏱️ ${track.duration}
                      </span>
                    </div>
                  </div>
                  <button onclick="window.app.openLyricsModal(${idx})" class="btn btn-sm btn-secondary">
                    View Lyrics
                  </button>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Japa & Chanting Counter Widget -->
          <div>
            <div class="card" style="padding: 32px; background: var(--bg-card); text-align: center; border: 2px solid var(--gold-500);">
              <span class="sacred-badge maroon">Maha Mantra Meditation</span>
              <h3 style="font-family: var(--font-serif); font-size: 1.6rem; color: var(--maroon-900); margin: 12px 0;">
                108 Japa Chant Counter
              </h3>
              <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 24px;">
                Chant the Maha-Mantra and click the sacred bead to count your mantras.
              </p>

              <div id="chant-bead-display" style="width: 140px; height: 140px; border-radius: 50%; background: radial-gradient(circle, #FFE082 0%, #FF9800 100%); margin: 0 auto 24px auto; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--maroon-900); box-shadow: 0 8px 24px rgba(230, 81, 0, 0.3); border: 4px solid var(--gold-400); cursor: pointer; user-select: none;" onclick="window.app.incrementChantCounter()">
                <span style="font-size: 0.8rem; font-weight: 800; text-transform: uppercase;">Mantra</span>
                <span id="chant-counter-val" style="font-size: 2.5rem; font-weight: 900; font-family: var(--font-serif); line-height: 1;">0</span>
                <span style="font-size: 0.75rem; font-weight: 700;">/ 108</span>
              </div>

              <div style="display: flex; gap: 12px; justify-content: center;">
                <button onclick="window.app.incrementChantCounter()" class="btn btn-primary">
                  <span>📿</span> Tap to Chant
                </button>
                <button onclick="window.app.resetChantCounter()" class="btn btn-secondary">
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 9. ARTICLES & WISDOM VIEW
  function renderArticlesView(params) {
    const storeQuotes = window.templeStore ? window.templeStore.getQuotes() : [];
    const articles = (Array.isArray(storeQuotes) && storeQuotes.length > 0)
      ? storeQuotes
      : (window.TEMPLE_DATA?.articles || []);
    const selectedArticleId = params.get('id');

    if (selectedArticleId) {
      const art = articles.find(a => a.id === selectedArticleId) || articles[0] || {};
      const artTitle = art.title || (art.text ? art.text.slice(0, 60) + '...' : 'Wisdom Quote');
      const artImg = art.image || art.imageUrl || 'assets/images/srila_prabhupada.jpg';
      const artContent = art.content || art.text || '';
      const artAuthor = art.author || 'Srila Prabhupada';
      const artCategory = art.category || 'Vedic Wisdom';
      const artDate = art.date || '';
      const artReadTime = art.readTime || '3 min read';

      mainContentElem.innerHTML = `
        <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.58) 0%, rgba(15, 2, 5, 0.65) 100%), url('assets/images/gallery/temple_photo_09.jpg') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.50) 100%); pointer-events: none;"></div>
          <div class="main-container" style="position: relative; z-index: 2; text-align: center;">
            <a href="#/articles" style="color: var(--gold-300); font-weight: 600; font-size: 0.9rem;">← Back to All Articles</a>
            <span class="sacred-badge gold" style="display: block; width: fit-content; margin-top: 16px;">${artCategory}</span>
            <h1 style="font-family: var(--font-serif); font-size: 2.6rem; margin: 12px 0; color: #FFFDF9;">${artTitle}</h1>
            <div style="color: #FFE082; font-size: 0.95rem;">
              ✍️ By ${artAuthor} • 📅 ${artDate} • ⏱️ ${artReadTime}
            </div>
          </div>
        </div>

        <div class="main-container section-padding" style="max-width: 860px;">
          <img src="${artImg}" alt="${artTitle}" style="width: 100%; height: 380px; object-fit: cover; border-radius: var(--radius-lg); margin-bottom: 32px; border: 1px solid var(--border-color);">

          <div style="font-size: 1.1rem; line-height: 1.9; color: var(--text-main); white-space: pre-line;">
            ${artContent}
          </div>

          <div class="sacred-divider"><span>🪷</span></div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 40px;">
            <a href="#/articles" class="btn btn-secondary">← All Articles</a>
            <button onclick="window.app.openCheckout('Vidyadaan — Bhagavad Gita & Book Distribution', 1500)" class="btn btn-primary">
              <span>📖</span> Sponsor Spiritual Books
            </button>
          </div>
        </div>
      `;
      return;
    }

    mainContentElem.innerHTML = `
      <div style="background: linear-gradient(135deg, var(--maroon-900) 0%, #20040A 100%); color: #FFF; padding: 60px 0;">
        <div class="main-container" style="text-align: center;">
          <span class="sacred-badge gold">Vedic Thought & Lifestyle</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">Spiritual Articles & Essays</h1>
          <p style="color: var(--gold-300); font-size: 1.1rem; max-width: 650px; margin: 0 auto;">
            Insightful commentaries on spiritual science, mindful living, karma, and conscious diet.
          </p>
        </div>
      </div>

      <div class="main-container section-padding">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 32px;">
          ${articles.map(art => {
            const artTitle = art.title || (art.text ? art.text.slice(0, 60) + '...' : 'Wisdom Quote');
            const artImg = art.image || art.imageUrl || 'assets/images/srila_prabhupada.jpg';
            const artDesc = art.excerpt || art.text || art.content || '';
            const artDate = art.date || '';
            const artReadTime = art.readTime || '3 min read';
            const artCategory = art.category || 'Vedic Wisdom';
            return `
            <div class="card" style="display: flex; flex-direction: column;">
              <div style="height: 220px; position: relative; background: #222;">
                <img src="${artImg}" alt="${artTitle}" style="width: 100%; height: 100%; object-fit: cover;">
                <span class="sacred-badge maroon" style="position: absolute; top: 12px; left: 12px;">
                  ${artCategory}
                </span>
              </div>
              <div style="padding: 24px; display: flex; flex-direction: column; flex: 1;">
                <div style="color: var(--text-muted); font-size: 0.82rem; margin-bottom: 8px;">
                  📅 ${artDate} • ⏱️ ${artReadTime}
                </div>
                <h3 style="font-family: var(--font-serif); font-size: 1.3rem; color: var(--maroon-900); margin-bottom: 12px;">
                  ${artTitle}
                </h3>
                <p style="color: var(--text-muted); font-size: 0.92rem; line-height: 1.6; margin-bottom: 20px; flex: 1;">
                  ${artDesc}
                </p>
                <a href="#/articles?id=${art.id}" class="btn btn-primary">
                  Read Full Article →
                </a>
              </div>
            </div>
          `}).join('')}
        </div>
      </div>
    `;
  }

  // 10. LIBRARY VIEW
  function renderLibraryView() {
    renderSpiritualityLandingView();
  }

  // 11. TEMPLE ABOUT VIEW
  function renderTempleAboutView() {
    const data = window.TEMPLE_DATA;
    mainContentElem.innerHTML = `
      <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.58) 0%, rgba(15, 2, 5, 0.65) 100%), url('assets/images/gallery/temple_photo_01.jpg') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.50) 100%); pointer-events: none;"></div>
        <div class="main-container" style="position: relative; z-index: 2; text-align: center;">
          <span class="sacred-badge gold">History & Heritage</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">About ISKCON Gandhidham</h1>
          <p style="color: var(--gold-300); font-size: 1.1rem; max-width: 650px; margin: 0 auto;">
            Sri Sri Radha Madanmohan Mandir — A Beacon of Devotion in Kutch, Gujarat.
          </p>
        </div>
      </div>

      <div class="main-container section-padding">
        <div style="display: grid; grid-template-columns: 1fr; @media(min-width:900px){grid-template-columns: 1fr 1fr;} gap: 48px; align-items: center; margin-bottom: 64px;">
          <div>
            <span class="section-subtitle">Our Divine Origin</span>
            <h2 class="section-title" style="text-align: left;">The Mission of Srila Prabhupada</h2>
            <div class="sacred-divider" style="margin-left: 0;"><span>🪷</span></div>
            <p style="color: var(--text-main); font-size: 1.05rem; line-height: 1.8; margin-bottom: 16px;">
              The International Society for Krishna Consciousness (ISKCON) was founded in 1966 in New York City by His Divine Grace A.C. Bhaktivedanta Swami Prabhupada. Belonging to the Gaudiya-Vaishnava sampradaya, ISKCON propagates the congregational chanting of the holy names of God (Sankirtan) as taught by Sri Chaitanya Mahaprabhu 500 years ago.
            </p>
            <p style="color: var(--text-main); font-size: 1.05rem; line-height: 1.8;">
              ISKCON Gandhidham was established to provide spiritual shelter, cultural education, free prasadam distribution, and Vedic values to the residents and visiting pilgrims of Kutch.
            </p>
          </div>
          <div>
            <div class="card" style="border: 2px solid var(--gold-500);">
              <img src="assets/images/srila_prabhupada.jpg" alt="Founder Acharya Srila Prabhupada" style="width: 100%; height: 420px; object-fit: cover;">
              <div style="padding: 16px; text-align: center; background: var(--bg-surface);">
                <strong>His Divine Grace A.C. Bhaktivedanta Swami Prabhupada</strong>
                <div style="font-size: 0.85rem; color: var(--text-muted);">Founder-Acharya of the International Society for Krishna Consciousness</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Deities of Gandhidham -->
        <div class="section-header">
          <span class="section-subtitle">Sacred Presiding Deities</span>
          <h2 class="section-title">The Sanctum Sanctorum</h2>
          <div class="sacred-divider"><span>👑</span></div>
        </div>

        <div style="display: flex; justify-content: center; margin-bottom: 64px;">
          <div class="card" style="padding: 28px; text-align: center; max-width: 500px;">
            <div class="pillar-icon-box" style="margin: 0 auto 16px auto;">🪔</div>
            <h3 style="font-family: var(--font-serif); font-size: 1.35rem; color: var(--maroon-900); margin-bottom: 8px;">Sri Sri Radha Madanmohanji</h3>
            <p style="color: var(--text-muted); font-size: 0.92rem; line-height: 1.6;">The primeval worshipable deities of sambandha-jnana, charming the minds of all surrendered devotees with boundless mercy.</p>
          </div>
        </div>
      </div>
    `;
  }

  // 12. TIMINGS VIEW
  function renderTimingsView() {
    const schedule = window.templeStore.getSchedule();
    mainContentElem.innerHTML = `
      <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.58) 0%, rgba(15, 2, 5, 0.65) 100%), url('assets/images/gallery/temple_photo_14.jpg') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.50) 100%); pointer-events: none;"></div>
        <div class="main-container" style="position: relative; z-index: 2; text-align: center;">
          <span class="sacred-badge gold">Temple Schedule</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">Aarti & Darshan Timings</h1>
          <p style="color: var(--gold-300); font-size: 1.1rem; max-width: 650px; margin: 0 auto;">
            Open 365 Days a Year: Morning 4:30 AM – 1:00 PM | Evening 4:30 PM – 8:30 PM
          </p>
        </div>
      </div>

      <div class="main-container section-padding">
        <div class="aarti-timeline-grid" style="margin-bottom: 48px;">
          ${schedule.map(item => `
            <div class="aarti-card">
              <div class="aarti-time-badge">⏰ ${item.time}</div>
              <h3 class="aarti-name">${item.name}</h3>
              <p class="aarti-desc">${item.desc}</p>
            </div>
          `).join('')}
        </div>

        <div class="card" style="padding: 32px; background: var(--saffron-50); border: 2px solid var(--gold-500);">
          <h3 style="font-family: var(--font-serif); font-size: 1.4rem; color: var(--maroon-900); margin-bottom: 12px;">
            ⚠️ Important Visitor Timing Notes:
          </h3>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 8px; font-size: 0.95rem; color: var(--text-main);">
            <li>• Main Altar curtains are closed for Deity rest between <strong>1:00 PM and 4:30 PM</strong> daily.</li>
            <li>• Free Sunday Love Feast Prasadam is served every Sunday at <strong>7:30 PM</strong>.</li>
            <li>• Special festival timings on Janmashtami, Radhashtami, and Gaura Purnima are open till midnight.</li>
          </ul>
        </div>
      </div>
    `;
  }

  // 13. PLAN YOUR VISIT VIEW
  function renderPlanYourVisitView() {
    const guide = window.TEMPLE_DATA.visitorGuide;
    const data = window.TEMPLE_DATA;

    mainContentElem.innerHTML = `
      <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.58) 0%, rgba(15, 2, 5, 0.65) 100%), url('assets/images/gallery/temple_photo_20.jpg') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.50) 100%); pointer-events: none;"></div>
        <div class="main-container" style="position: relative; z-index: 2; text-align: center;">
          <span class="sacred-badge gold">Pilgrim Information</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">Plan Your Visit</h1>
          <p style="color: var(--gold-300); font-size: 1.1rem; max-width: 650px; margin: 0 auto;">
            Everything you need to know before visiting Sri Sri Radha Madanmohanji Mandir, Gandhidham.
          </p>
        </div>
      </div>

      <div class="main-container section-padding">
        <!-- How to Reach Grid -->
        <div class="section-header">
          <span class="section-subtitle">Connectivity & Travel</span>
          <h2 class="section-title">How to Reach the Temple</h2>
          <div class="sacred-divider"><span>🚗</span></div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 28px; margin-bottom: 64px;">
          ${guide.howToReach.map(r => `
            <div class="card" style="padding: 28px;">
              <span class="sacred-badge gold" style="margin-bottom: 12px;">${r.mode}</span>
              <h3 style="font-family: var(--font-serif); font-size: 1.3rem; color: var(--maroon-900); margin-bottom: 6px;">
                ${r.title}
              </h3>
              <div style="color: var(--saffron-800); font-weight: 700; font-size: 0.85rem; margin-bottom: 12px;">
                📍 Distance: ${r.distance}
              </div>
              <p style="color: var(--text-muted); font-size: 0.92rem; line-height: 1.6;">
                ${r.desc}
              </p>
            </div>
          `).join('')}
        </div>

        <!-- GOOGLE MAPS DIRECT NAVIGATION CARD -->
        <div class="card" style="padding: 28px; background: linear-gradient(135deg, #FFFDF9 0%, #FFF9F0 100%); border: 2px solid var(--gold-400); border-radius: var(--radius-lg); margin-bottom: 56px; box-shadow: 0 8px 24px rgba(0,0,0,0.06);">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 24px; align-items: center;">
            <div>
              <span class="sacred-badge gold" style="margin-bottom: 10px; display: inline-block;">📍 Official GPS Fixed Location</span>
              <h3 style="font-family: var(--font-serif); font-size: 1.6rem; color: var(--maroon-900); margin-bottom: 8px;">
                Sri Sri Radha Madanmohan Mandir
              </h3>
              <p style="color: var(--text-main); font-size: 0.95rem; line-height: 1.6; margin-bottom: 14px;">
                📍 <strong>Address:</strong> Sector 9, Near Tagore Garden / Behind Lilasha Kuttiya, Meghpar Borichi, Gandhidham, Kutch, Gujarat - 370110, India
              </p>
              <div style="background: rgba(212,175,55,0.12); padding: 12px 16px; border-radius: var(--radius-md); border-left: 4px solid var(--gold-500); margin-bottom: 18px; font-size: 0.85rem; color: var(--maroon-900);">
                💡 <strong>Live GPS Navigation:</strong> Click below to get 1-click turn-by-turn driving & walking directions directly from your location to the temple gate.
              </div>
              <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <a href="${data.info?.googleMapsUrl || 'https://maps.app.goo.gl/tMq1q67Scvajhx5i7'}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-lg" style="background: linear-gradient(135deg, #4285F4 0%, #34A853 100%); border: none; color: #FFF; box-shadow: 0 4px 14px rgba(66,133,244,0.35); text-decoration: none;">
                  <span>📍</span> Open Live Directions on Google Maps ➔
                </a>
                <button type="button" onclick="window.app.copyText('${data.info?.googleMapsUrl || 'https://maps.app.goo.gl/tMq1q67Scvajhx5i7'}', this)" class="btn btn-outline-secondary">
                  Copy Location Link
                </button>
              </div>
            </div>

            <!-- GOOGLE MAPS PREVIEW CONTAINER -->
            <div style="position: relative; border-radius: 16px; overflow: hidden; border: 2px solid var(--gold-300); box-shadow: 0 4px 16px rgba(0,0,0,0.12); min-height: 240px; background: #E8EAED;">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3674.321!2d70.128!3d23.076!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDA0JzMzLjYiTiA3MMKwMDcnNDAuOCJF!5e0!3m2!1sen!2sin!4v1700000000000" 
                width="100%" 
                height="240" 
                style="border:0; display: block;" 
                allowfullscreen="" 
                loading="lazy" 
                referrerpolicy="no-referrer-when-downgrade">
              </iframe>
              <a href="${data.info?.googleMapsUrl || 'https://maps.app.goo.gl/tMq1q67Scvajhx5i7'}" target="_blank" rel="noopener noreferrer" style="position: absolute; bottom: 12px; right: 12px; background: rgba(0,0,0,0.85); color: #FFF; padding: 8px 16px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 6px; backdrop-filter: blur(4px);">
                <span>🗺️ Open in Google Maps App</span>
              </a>
            </div>
          </div>
        </div>

                <!-- Facilities Available Slider Carousel -->
        <div class="section-header">
          <span class="section-subtitle">Visitor Amenities & Services</span>
          <h2 class="section-title">Temple Facilities for Visitors & Devotees</h2>
          <div class="sacred-divider"><span>🪷</span></div>
          <p class="section-description">Comprehensive facilities to enrich your spiritual visit to ISKCON Gandhidham.</p>
        </div>

        <div class="sacred-slider-wrapper">
          <button type="button" class="slider-nav-btn prev" onclick="window.app.scrollSlider('facilities-slider-track', 'prev')" aria-label="Previous Facilities">◀</button>
          <button type="button" class="slider-nav-btn next" onclick="window.app.scrollSlider('facilities-slider-track', 'next')" aria-label="Next Facilities">▶</button>
          
          <div id="facilities-slider-track" class="sacred-slider-track">
            ${guide.facilities.map(f => `
              <div class="sacred-slider-item">
                <div class="card" style="padding: 28px; height: 100%; display: flex; flex-direction: column; gap: 12px; border: 1.5px solid var(--gold-400); box-shadow: 0 8px 24px rgba(62,8,18,0.06); background: #FFFDF9; border-radius: 18px;">
                  <h4 style="font-family: var(--font-serif); font-size: 1.2rem; color: var(--maroon-900);">
                     ${f.title}
                  </h4>
                  <p style="color: var(--text-muted); font-size: 0.92rem; line-height: 1.6;">${f.desc}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Visitor Etiquette -->
        <div class="card" style="padding: 36px; background: var(--bg-card); border: 2px solid var(--border-color); margin-bottom: 64px;">
          <h3 style="font-family: var(--font-serif); font-size: 1.5rem; color: var(--maroon-900); margin-bottom: 16px;">
            🙏 Temple Etiquette & Guidelines
          </h3>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 12px;">
            ${guide.etiquette.map(e => `
              <li style="display: flex; align-items: flex-start; gap: 10px; font-size: 0.98rem; color: var(--text-main);">
                <span style="color: var(--gold-600); font-size: 1.1rem;">✓</span>
                <span>${e}</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <!-- FAQs Accordion -->
        <div class="section-header">
          <span class="section-subtitle">Common Questions</span>
          <h2 class="section-title">Frequently Asked Questions</h2>
          <div class="sacred-divider"><span>❓</span></div>
        </div>

        <div style="max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px;">
          ${guide.faq.map((faq, idx) => `
            <div class="card" style="padding: 20px 24px; cursor: pointer;" onclick="this.querySelector('.faq-answer').classList.toggle('open')">
              <h4 style="font-family: var(--font-serif); font-size: 1.1rem; color: var(--maroon-900); display: flex; justify-content: space-between; align-items: center;">
                <span>${faq.q}</span>
                <span style="color: var(--saffron-800);">▼</span>
              </h4>
              <div class="faq-answer ${idx === 0 ? 'open' : ''}" style="margin-top: 10px; font-size: 0.95rem; color: var(--text-muted); line-height: 1.6;">
                ${faq.a}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 14. COMMUNITY VIEW
  function renderCommunityView(hash) {
    const comm = window.TEMPLE_DATA.community;
    mainContentElem.innerHTML = `
      <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.58) 0%, rgba(15, 2, 5, 0.65) 100%), url('assets/images/gallery/temple_photo_22.jpg') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.50) 100%); pointer-events: none;"></div>
        <div class="main-container" style="position: relative; z-index: 2; text-align: center;">
          <span class="sacred-badge gold">Vaishnava Sangha</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">Community & Programs</h1>
          <p style="color: var(--gold-300); font-size: 1.1rem; max-width: 650px; margin: 0 auto;">
            Empowering youth, educating children with Vedic values, and nurturing peaceful families.
          </p>
        </div>
      </div>

      <div class="main-container section-padding">
        <!-- Youth Forum Section -->
        <div id="youth" class="card" style="padding: 36px; margin-bottom: 48px; border: 2px solid var(--border-color);">
          <div style="display: grid; grid-template-columns: 1fr; @media(min-width:900px){grid-template-columns: 1.2fr 0.8fr;} gap: 36px;">
            <div>
              <span class="sacred-badge maroon">Youth Wing</span>
              <h2 style="font-family: var(--font-serif); font-size: 2rem; color: var(--maroon-900); margin: 8px 0;">${comm.youth.title}</h2>
              <p style="color: var(--saffron-800); font-weight: 600; margin-bottom: 16px;">${comm.youth.tagline}</p>
              <p style="color: var(--text-main); font-size: 1rem; line-height: 1.7; margin-bottom: 20px;">
                ${comm.youth.description}
              </p>
              <h4 style="font-family: var(--font-serif); color: var(--maroon-900); margin-bottom: 10px;">Weekly Core Activities:</h4>
              <ul style="list-style: none; display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;">
                ${comm.youth.activities.map(a => `<li style="display:flex; gap:8px;"><span>⚡</span> <span>${a}</span></li>`).join('')}
              </ul>
              <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <a href="#/volunteer" class="btn btn-primary">Join IYF Youth Wing</a>
                <a href="#/events/iyf-youth-camp-2026" class="btn btn-secondary">Discover Yourself Retreat</a>
              </div>
            </div>
            <div>
              <img src="${comm.youth.image}" alt="Youth Forum" style="width: 100%; height: 340px; object-fit: cover; border-radius: var(--radius-md);">
            </div>
          </div>
        </div>

        <!-- Children Sunday School Section -->
        <div id="children" class="card" style="padding: 36px; margin-bottom: 48px; border: 2px solid var(--border-color);">
          <div style="display: grid; grid-template-columns: 1fr; @media(min-width:900px){grid-template-columns: 0.8fr 1.2fr;} gap: 36px;">
            <div>
              <img src="${comm.children.image}" alt="Children School" style="width: 100%; height: 340px; object-fit: cover; border-radius: var(--radius-md);">
            </div>
            <div>
              <span class="sacred-badge gold">Value Education</span>
              <h2 style="font-family: var(--font-serif); font-size: 2rem; color: var(--maroon-900); margin: 8px 0;">${comm.children.title}</h2>
              <p style="color: var(--saffron-800); font-weight: 600; margin-bottom: 16px;">${comm.children.tagline}</p>
              <p style="color: var(--text-main); font-size: 1rem; line-height: 1.7; margin-bottom: 20px;">
                ${comm.children.description}
              </p>
              <h4 style="font-family: var(--font-serif); color: var(--maroon-900); margin-bottom: 10px;">Curriculum Highlights:</h4>
              <ul style="list-style: none; display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;">
                ${comm.children.activities.map(a => `<li style="display:flex; gap:8px;"><span>🌱</span> <span>${a}</span></li>`).join('')}
              </ul>
              <a href="#/contact" class="btn btn-primary">Enroll Your Child</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 15. VOLUNTEER VIEW
  function renderVolunteerView() {
    mainContentElem.innerHTML = `
      <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.58) 0%, rgba(15, 2, 5, 0.65) 100%), url('assets/images/gallery/temple_photo_08.jpg') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.50) 100%); pointer-events: none;"></div>
        <div class="main-container" style="position: relative; z-index: 2; text-align: center;">
          <span class="sacred-badge gold">Selfless Service</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">Volunteer at ISKCON Gandhidham</h1>
          <p style="color: var(--gold-300); font-size: 1.1rem; max-width: 650px; margin: 0 auto;">
            Experience the boundless joy of serving the Supreme Lord and the community.
          </p>
        </div>
      </div>

      <div class="main-container section-padding" style="max-width: 760px;">
        <div class="card" style="padding: 40px;">
          <h2 style="font-family: var(--font-serif); font-size: 1.8rem; color: var(--maroon-900); margin-bottom: 8px; text-align: center;">
            Volunteer Registration Form
          </h2>
          <p style="color: var(--text-muted); font-size: 0.95rem; text-align: center; margin-bottom: 32px;">
            Please provide your details and seva interests. Our volunteer coordinator will connect with you.
          </p>

          <form id="volunteer-form" onsubmit="window.app.handleVolunteerSubmit(event)">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Full Name *</label>
                <input type="text" name="name" class="form-input" required placeholder="e.g. Ramesh Patel">
              </div>
              <div class="form-group">
                <label class="form-label">Phone / WhatsApp Number *</label>
                <input type="tel" name="phone" class="form-input" required placeholder="+91 98765 43210">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Email Address *</label>
                <input type="email" name="email" class="form-input" required placeholder="your.email@example.com">
              </div>
              <div class="form-group">
                <label class="form-label">Age</label>
                <input type="number" name="age" class="form-input" placeholder="e.g. 24">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Primary Area of Seva Interest *</label>
              <select name="interest" class="form-select" required>
                <option value="Anna Daan & Kitchen Prasadam">Anna Daan & Kitchen Prasadam Service</option>
                <option value="Festival Management & Crowd Coordination">Festival Management & Crowd Coordination</option>
                <option value="Temple Altar Decoration & Flower Garlands">Temple Altar Decoration & Flower Garlands</option>
                <option value="Youth Mentorship & Teaching">Youth Mentorship & Teaching (IYF)</option>
                <option value="Media, Website & Photography">Media, Website, Design & Photography</option>
                <option value="Book Distribution & Guest Reception">Book Distribution & Guest Reception</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Availability</label>
              <select name="availability" class="form-select">
                <option value="Weekends Only">Weekends Only (Saturday / Sunday)</option>
                <option value="Major Festivals Only">Major Festivals Only (Janmashtami, Ratha Yatra, etc.)</option>
                <option value="Daily 1-2 Hours">Daily 1-2 Hours</option>
                <option value="Full-Time Resident Seva">Full-Time Resident Seva</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Message / Prior Experience (Optional)</label>
              <textarea name="message" rows="3" class="form-textarea" placeholder="Tell us a little about your background or why you want to serve..."></textarea>
            </div>

            <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 12px;">
              <span>🙏</span> Submit Volunteer Application
            </button>
          </form>
        </div>
      </div>
    `;
  }

  // 16. SEVA CATALOG VIEW
  function renderSevaView(params) {
    const sevas = window.templeStore.getSevas();
    mainContentElem.innerHTML = `
      <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.58) 0%, rgba(15, 2, 5, 0.65) 100%), url('assets/images/gallery/temple_photo_24.jpg') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.50) 100%); pointer-events: none;"></div>
        <div class="main-container" style="position: relative; z-index: 2; text-align: center;">
          <span class="sacred-badge gold">Serve with Devotion</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">Sacred Seva Opportunities</h1>
          <p style="color: var(--gold-300); font-size: 1.1rem; max-width: 650px; margin: 0 auto;">
            Sponsor Anna Daan, Deity Shringar, Gau Seva, and Temple Nirman in Gandhidham.
          </p>
        </div>
      </div>

      <div class="main-container section-padding">
        <div class="seva-grid">
          ${sevas.map(s => `
            <div class="seva-card">
              <div class="seva-card-media">
                <img src="${s.image}" alt="${s.title}">
                <span class="seva-card-tag">${s.tag}</span>
              </div>
              <div class="seva-card-body">
                <h3 class="seva-card-title">${s.title}</h3>
                <p class="seva-card-desc">${s.shortDesc}</p>
                <div class="seva-impact-badge">
                  🎯 <strong>Impact:</strong> ${s.impact}
                </div>
                <div class="seva-presets-row">
                  ${s.presets.map((p, idx) => `
                    <button class="preset-chip ${idx === 0 ? 'active' : ''}" onclick="window.app.openCheckout('${s.title}', ${p.amount})">
                      ₹${p.amount.toLocaleString()}
                    </button>
                  `).join('')}
                </div>
                <button onclick="window.app.openCheckout('${s.title}', ${s.presets[0].amount})" class="btn btn-primary" style="width: 100%;">
                  <span>❤️</span> Sponsor This Seva
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 17. DONATE VIEW
  function renderDonateView(params) {
    const defaultPurpose = params.get('purpose') || 'General Temple Seva & Anna Daan';
    const defaultAmount = params.get('amount') || 1501;

    mainContentElem.innerHTML = `
      <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.58) 0%, rgba(15, 2, 5, 0.65) 100%), url('assets/images/gallery/temple_photo_16.jpg') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.50) 100%); pointer-events: none;"></div>
        <div class="main-container" style="position: relative; z-index: 2; text-align: center;">
          <span class="sacred-badge gold">100% 80G Tax Exemption</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">Online Temple Donation</h1>
          <p style="color: var(--gold-300); font-size: 1.1rem; max-width: 650px; margin: 0 auto;">
            Support Anna Daan food relief, cow protection, and temple worship. Instant official 80G tax receipt generated.
          </p>
        </div>
      </div>

      <div class="main-container section-padding" style="max-width: 760px;">
        <div class="card" style="padding: 40px; border: 2px solid var(--gold-500);">
          <h2 style="font-family: var(--font-serif); font-size: 1.8rem; color: var(--maroon-900); margin-bottom: 24px; text-align: center;">
            Donation & 80G Form
          </h2>

          <form id="direct-donation-form" onsubmit="window.app.handleDonationSubmit(event)">
            <div class="form-group">
              <label class="form-label">Donation Purpose / Seva *</label>
              <select name="purpose" class="form-select" required>
                <option value="Anna Daan — Food For Life Free Prasadam Seva">Anna Daan — Food For Life Free Prasadam Seva</option>
                <option value="Deity Shringar & Royal Poshak Seva">Deity Shringar & Royal Poshak Seva</option>
                <option value="Gau Seva — Sacred Cow Protection & Fodder">Gau Seva — Sacred Cow Protection & Fodder</option>
                <option value="Vidyadaan — Bhagavad Gita & Book Distribution">Vidyadaan — Bhagavad Gita & Book Distribution</option>
                <option value="Sadhu & Devotee Bhojan Seva">Sadhu & Devotee Bhojan Seva</option>
                <option value="Temple Expansion & Cultural Centre Nirman">Temple Expansion & Cultural Centre Nirman</option>
                <option value="General Temple Maintenance">General Temple Maintenance</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Select Contribution Amount (₹) *</label>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px;">
                ${[501, 1001, 2501, 5001].map(amt => `
                  <button type="button" class="preset-chip ${amt == defaultAmount ? 'active' : ''}" style="padding: 10px; font-size: 0.95rem; text-align: center;" onclick="document.getElementById('custom-donation-amount').value = ${amt}; document.querySelectorAll('.preset-chip').forEach(c=>c.classList.remove('active')); this.classList.add('active');">
                    ₹${amt.toLocaleString()}
                  </button>
                `).join('')}
              </div>
              <input type="number" id="custom-donation-amount" name="amount" class="form-input" min="100" value="${defaultAmount}" required placeholder="Or Enter Custom Amount">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Donor Full Name *</label>
                <input type="text" name="donorName" class="form-input" required placeholder="As per PAN card">
              </div>
              <div class="form-group">
                <label class="form-label">Mobile Number *</label>
                <input type="tel" name="phone" class="form-input" required placeholder="+91 98765 43210">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Email Address *</label>
                <input type="email" name="email" class="form-input" required placeholder="To receive 80G receipt">
              </div>
              <div class="form-group">
                <label class="form-label">PAN Number (Optional — required only for 80G Tax Exemption Certificate)</label>
                <input type="text" name="pan" class="form-input" maxlength="10" placeholder="ABCDE1234F" style="text-transform: uppercase;">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Address</label>
              <input type="text" name="address" class="form-input" placeholder="City, State, Pincode">
            </div>

            <div class="form-group">
              <label class="form-label">Payment Method *</label>
              <select name="paymentMethod" class="form-select">
                <option value="UPI / QR Code (Google Pay, PhonePe, Paytm)">UPI / QR Code (Google Pay, PhonePe, Paytm)</option>
                <option value="Net Banking (All Indian Banks)">Net Banking (All Indian Banks)</option>
                <option value="Credit / Debit Card">Credit / Debit Card (Visa, MasterCard, RuPay)</option>
              </select>
            </div>

            <div style="background: var(--saffron-50); padding: 14px; border-radius: var(--radius-sm); margin-bottom: 24px; font-size: 0.85rem; color: var(--maroon-900);">
              🔒 <strong>Tax Exemption Note:</strong> All donations to ISKCON Gandhidham are exempt under Section 80G of the Income Tax Act. An official receipt will be generated immediately.
            </div>

            <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;">
              <span>💳</span> Proceed to Secure Payment
            </button>
          </form>
        </div>
      </div>
    `;
  }

  // 18. DONATION SUCCESS & 80G RECEIPT VIEW
  function renderDonationSuccessView(params) {
    const id = params.get('id');
    const donation = window.templeStore.getDonationById(id) || window.templeStore.getDonations()[0];

    mainContentElem.innerHTML = `
      <div class="main-container section-padding" style="max-width: 800px;">
        <div style="text-align: center; margin-bottom: 32px;" class="no-print">
          <div style="width: 80px; height: 80px; border-radius: 50%; background: #E8F5E9; color: #2E7D32; font-size: 2.5rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
            ✓
          </div>
          <span class="sacred-badge gold">Hare Krishna!</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.4rem; color: var(--maroon-900); margin: 8px 0;">
            Thank You for Your Generous Seva!
          </h1>
          <p style="color: var(--text-muted); font-size: 1.05rem;">
            May Lord Sri Krishna and Srimati Radharani shower their transcendental blessings upon you and your family.
          </p>
        </div>

        <!-- Official 80G Tax Exemption Receipt Printable Card -->
        <div class="printable-receipt-area card" style="padding: 40px; border: 2px solid var(--gold-500); background: #FFFFFF;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--border-color); padding-bottom: 20px; margin-bottom: 24px;">
            <div>
              <h2 style="font-family: var(--font-serif); font-size: 1.6rem; color: var(--maroon-900); margin-bottom: 4px;">
                ISKCON GANDHIDHAM
              </h2>
              <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">
                Sri Sri Radha Madanmohan Mandir<br>
                Sector 9, Gandhidham, Kutch, Gujarat - 370201<br>
                Reg. Trust No. / 80G Reg: <strong>AAATI0108GF20214</strong>
              </div>
            </div>
            <div style="text-align: right;">
              <span class="sacred-badge gold">OFFICIAL 80G RECEIPT</span>
              <div style="font-size: 0.85rem; font-weight: bold; margin-top: 8px; color: var(--maroon-900);">
                Receipt No: ${donation.id}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">
                Date: ${donation.date}
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; font-size: 0.95rem;">
            <div>
              <span style="color: var(--text-muted); display: block; font-size: 0.82rem;">DONOR DETAILS</span>
              <strong>${escapeHTML(donation.donorName)}</strong><br>
              ${donation.phone ? `Phone: ${escapeHTML(donation.phone)}<br>` : ''}
              ${donation.email ? `Email: ${escapeHTML(donation.email)}<br>` : ''}
              ${donation.pan ? `PAN: <strong style="color:var(--maroon-900);">${escapeHTML(donation.pan)}</strong><br>` : ''}
              ${donation.address ? `Address: ${escapeHTML(donation.address)}` : ''}
            </div>
            <div>
              <span style="color: var(--text-muted); display: block; font-size: 0.82rem;">PAYMENT DETAILS</span>
              <strong>Txn ID:</strong> ${escapeHTML(donation.transactionId)}<br>
              <strong>Mode:</strong> ${escapeHTML(donation.paymentMethod)}<br>
              <strong>Status:</strong> <span style="color:#2E7D32; font-weight:bold;">SUCCESS / VERIFIED</span>
            </div>
          </div>

          <div style="background: var(--bg-subtle); padding: 18px; border-radius: var(--radius-sm); margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 0.85rem; color: var(--text-muted); display: block;">SEVA PURPOSE</span>
                <strong style="font-size: 1.1rem; color: var(--maroon-900);">${escapeHTML(donation.purpose)}</strong>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 0.85rem; color: var(--text-muted); display: block;">DONATION AMOUNT</span>
                <strong style="font-size: 1.6rem; color: var(--saffron-900); font-family: var(--font-serif);">₹${donation.amount.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          <div style="font-size: 0.8rem; color: var(--text-muted); border-top: 1px dashed var(--border-color); padding-top: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              * Donations are 100% tax exempt under Section 80G of the Income Tax Act, 1961.<br>
              * This is a computer-generated official receipt and requires no physical signature.
            </div>
            <div style="text-align: center;">
              <div style="width: 50px; height: 50px; border: 1px solid #CCC; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; background: #FFF;">
                [ QR SEAL ]
              </div>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 16px; justify-content: center; margin-top: 32px;" class="no-print">
          <button onclick="window.print()" class="btn btn-primary btn-lg">
            <span>🖨️</span> Print / Save 80G PDF Receipt
          </button>
          <a href="#/" class="btn btn-secondary btn-lg">
            Return to Homepage
          </a>
        </div>
      </div>
    `;
  }

  // 19. MEDIA GALLERY VIEW
  function renderMediaView(params) {
    const images = [
      { url: 'assets/images/darshan_yugal_altar.jpg', title: 'Sri Sri Radha Madanmohanji Daily Darshan Altar', tag: 'Deity Darshan', fit: 'contain' },
      { url: 'assets/images/darshan_krishna_closeup.jpg', title: 'Sri Krishna Mukharavinda (Peacock Mukut & Lotus Face)', tag: 'Deity Darshan', fit: 'cover' },
      { url: 'assets/images/darshan_radharani.jpg', title: 'Srimati Radharani Resplendent Darshan', tag: 'Deity Darshan', fit: 'cover' },
      { url: 'assets/images/darshan_krishna_tribhanga.jpg', title: 'Sri Krishna Tribhanga Posture with Surabhi Cow', tag: 'Deity Darshan', fit: 'contain' },
      { url: 'assets/images/darshan_krishna_flute.jpg', title: 'Sri Krishna Venu Vadan (Flute Melody)', tag: 'Deity Darshan', fit: 'contain' },
      { url: 'assets/images/temple_facade.jpg', title: 'Grand Temple Facade & Shikhara', tag: 'Architecture', fit: 'cover' },
      { url: 'assets/images/kirtan_hall.jpg', title: 'Ecstatic Harinama Kirtan in Temple Hall', tag: 'Kirtan', fit: 'cover' },
      { url: 'assets/images/anna_daan_seva.jpg', title: 'Food For Life Anna Daan Prasadam Distribution', tag: 'Seva', fit: 'cover' },
      { url: 'assets/images/srila_prabhupada.jpg', title: 'Founder-Acharya Srila Prabhupada Portrait', tag: 'Acharya', fit: 'cover' },
      { url: 'assets/images/janmashtami_banner.jpg', title: 'Grand Janmashtami Mahotsav Celebrations', tag: 'Festivals', fit: 'cover' }
    ];

    mainContentElem.innerHTML = `
      <div style="background: linear-gradient(135deg, var(--maroon-900) 0%, #20040A 100%); color: #FFF; padding: 60px 0;">
        <div class="main-container" style="text-align: center;">
          <span class="sacred-badge gold">Devotional Visuals</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">Temple Media Gallery</h1>
          <p style="color: var(--gold-300); font-size: 1.1rem; max-width: 650px; margin: 0 auto;">
            High-resolution photography, videos, and kirtans of ISKCON Gandhidham.
          </p>
        </div>
      </div>

      <div class="main-container section-padding">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 28px;">
          ${images.map(img => `
            <div class="card" style="overflow: hidden;">
              <div class="card-media-portrait ${img.fit === 'contain' ? 'contain' : ''}">
                <img src="${img.url}" alt="${img.title}" class="${img.fit === 'contain' ? 'idol-img-contain' : 'idol-img-top'}">
                <span class="sacred-badge gold" style="position: absolute; top: 12px; left: 12px;">
                  ${img.tag}
                </span>
              </div>
              <div style="padding: 20px; display: flex; align-items: center; justify-content: space-between;">
                <h4 style="font-family: var(--font-serif); font-size: 1.1rem; color: var(--maroon-900);">
                  ${img.title}
                </h4>
                <button onclick="window.app.openLightbox('${img.url}', '${img.title}')" class="btn btn-sm btn-secondary">
                  <span>🔍</span> View
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 20. CONTACT VIEW
  function renderContactView() {
    const info = window.TEMPLE_DATA.info;
    mainContentElem.innerHTML = `
      <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.58) 0%, rgba(15, 2, 5, 0.65) 100%), url('assets/images/gallery/temple_photo_19.jpg') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.50) 100%); pointer-events: none;"></div>
        <div class="main-container" style="position: relative; z-index: 2; text-align: center;">
          <span class="sacred-badge gold">Connect with Us</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">Contact ISKCON Gandhidham</h1>
          <p style="color: var(--gold-300); font-size: 1.1rem; max-width: 650px; margin: 0 auto;">
            We are here to answer your questions, help plan your pilgrimage, and receive your inquiries.
          </p>
        </div>
      </div>

      <div class="main-container section-padding">
        <div style="display: grid; grid-template-columns: 1fr; @media(min-width:900px){grid-template-columns: 1fr 1.2fr;} gap: 48px;">
          <div>
            <span class="section-subtitle">Get in Touch</span>
            <h2 class="section-title" style="text-align: left;">Temple Information</h2>
            <div class="sacred-divider" style="margin-left: 0;"><span>📞</span></div>

            <div style="display: flex; flex-direction: column; gap: 20px; margin-bottom: 32px;">
              <div class="card" style="padding: 20px; display: flex; gap: 16px; align-items: flex-start;">
                <span style="font-size: 1.5rem; color: var(--saffron-800);">🏛️</span>
                <div>
                  <strong>Temple Address:</strong>
                  <p style="color: var(--text-muted); font-size: 0.95rem; margin-top: 4px;">${info.address}</p>
                </div>
              </div>

              <div class="card" style="padding: 20px; display: flex; gap: 16px; align-items: flex-start;">
                <span style="font-size: 1.5rem; color: var(--saffron-800);">📞</span>
                <div>
                  <strong>Phone / Hotline:</strong>
                  <p style="color: var(--text-muted); font-size: 0.95rem; margin-top: 4px;">
                    Temple Desk: <a href="tel:${info.phone}" style="color:var(--saffron-900); font-weight:bold;">${info.phone}</a><br>
                    Hotline / WhatsApp: <a href="tel:${info.hotline}" style="color:var(--saffron-900); font-weight:bold;">${info.hotline}</a>
                  </p>
                </div>
              </div>

              <div class="card" style="padding: 20px; display: flex; gap: 16px; align-items: flex-start;">
                <span style="font-size: 1.5rem; color: var(--saffron-800);">✉️</span>
                <div>
                  <strong>Email:</strong>
                  <p style="color: var(--text-muted); font-size: 0.95rem; margin-top: 4px;">
                    General: ${info.email}<br>
                    Seva & Donations: ${info.sevaEmail}
                  </p>
                </div>
              </div>
            </div>

            <a href="https://wa.me/919428010808?text=Hare%20Krishna!%20I%20would%20like%20to%20inquire%20about%20ISKCON%20Gandhidham" target="_blank" rel="noopener" class="btn btn-primary btn-lg" style="width: 100%;">
              <span>💬</span> Chat with Us on WhatsApp
            </a>
          </div>

          <div>
            <div class="card" style="padding: 36px;">
              <h3 style="font-family: var(--font-serif); font-size: 1.6rem; color: var(--maroon-900); margin-bottom: 20px;">
                Send an Inquiry / Feedback
              </h3>

              <form id="contact-form" onsubmit="window.app.handleInquirySubmit(event)">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Your Name *</label>
                    <input type="text" name="name" class="form-input" required placeholder="e.g. Meera Sharma">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Phone Number *</label>
                    <input type="tel" name="phone" class="form-input" required placeholder="+91 98765 43210">
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Email Address *</label>
                  <input type="email" name="email" class="form-input" required placeholder="meera@example.com">
                </div>

                <div class="form-group">
                  <label class="form-label">Subject</label>
                  <select name="subject" class="form-select">
                    <option value="General Pilgrim Inquiry">General Pilgrim Inquiry</option>
                    <option value="Guest House Booking Inquiry">Guest House Booking Inquiry</option>
                    <option value="Special Puja / Birthday Seva Sponsorship">Special Puja / Birthday Seva Sponsorship</option>
                    <option value="Youth / IYF Program Enrollment">Youth / IYF Program Enrollment</option>
                    <option value="Feedback / Suggestions">Feedback / Suggestions</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Your Message *</label>
                  <textarea name="message" rows="4" class="form-textarea" required placeholder="Write your message or inquiry here..."></textarea>
                </div>

                <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;">
                  <span>✉️</span> Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
  }


  // ABOUT TEMPLE & DEITIES VIEW
  function renderTempleAboutView() {
    const info = window.TEMPLE_DATA.info || {};

    mainContentElem.innerHTML = `
      <!-- TEMPLE ABOUT HERO -->
      <section class="section-padding" style="background: linear-gradient(135deg, var(--maroon-900) 0%, #2B040C 100%); color: #FFF; position: relative; overflow: hidden;">
        <div style="position: absolute; top: 0; right: 0; width: 450px; height: 450px; background: radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(0,0,0,0) 70%); pointer-events: none;"></div>
        <div class="main-container text-center" style="max-width: 900px; position: relative; z-index: 2;">
          <div class="hero-badge-row" style="justify-content: center; margin-bottom: 16px;">
            <span class="sacred-badge gold">🏛️ ABOUT ISKCON GANDHIDHAM</span>
            <span class="sacred-badge maroon">MEGHPAR BORICHI, KUTCH</span>
          </div>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; color: var(--gold-300); margin-bottom: 12px; line-height: 1.2;">
            ${info.subName || 'Shri Shri Radha Madanmohan Mandir'}
          </h1>
          <p style="font-size: 1.2rem; color: #FFF8E1; font-weight: 500; margin-bottom: 20px;">
            ${info.tagline}
          </p>
          <p style="font-size: 1rem; color: #E2D9CD; line-height: 1.8; margin-bottom: 30px;">
            The official Hare Krishna temple of ISKCON in Gandhidham, Kutch, Gujarat. A vibrant spiritual sanctuary dedicated to congregational chanting (Sankirtan), distribution of sanctified Krishna Prasadam (Anna Daan), and the dissemination of Vedic wisdom as taught by Founder-Acharya A.C. Bhaktivedanta Swami Prabhupada.
          </p>
          <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
            <a href="${info.googleMapsUrl || 'https://maps.google.com/?q=ISKCON+Gandhidham'}" target="_blank" class="btn btn-gold btn-lg">
              <span>📍</span> Open Google Maps Navigation
            </a>
            <a href="#/darshan" class="btn btn-primary btn-lg">
              <span>🪔</span> Today's Divine Darshan
            </a>
          </div>
        </div>
      </section>

      <!-- GOOGLE MAPS LOCATION & CONTACT DETAILS CARD -->
      <section class="section-padding bg-sand">
        <div class="main-container">
          <div class="section-header text-center" style="max-width: 800px; margin: 0 auto 40px auto;">
            <span class="sacred-badge gold">📍 GOOGLE MAPS & LOCATION DETAILS</span>
            <h2 class="section-title">Temple Location & Contact Guide</h2>
            <p class="section-subtitle">
              Authentic address, Google Maps landmarks, phone contacts, and daily call hours.
            </p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 28px; max-width: 1050px; margin: 0 auto;">
            <!-- Address & Navigation Card -->
            <div style="background: #FFF; border: 2px solid var(--gold-500); border-radius: var(--radius-lg); padding: 30px; box-shadow: var(--shadow-md);">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <span style="font-size: 2rem;">🗺️</span>
                <div>
                  <h3 style="font-family: var(--font-serif); font-size: 1.3rem; color: var(--maroon-900); margin: 0;">Official Temple Address</h3>
                  <span style="font-size: 0.8rem; color: var(--gold-600); font-weight: 700; text-transform: uppercase;">Meghpar Borichi Campus</span>
                </div>
              </div>

              <div style="font-size: 0.95rem; color: var(--text-main); line-height: 1.7; background: var(--saffron-50); padding: 16px; border-radius: var(--radius-sm); margin-bottom: 16px; border-left: 4px solid var(--saffron-500);">
                📍 <strong>Full Address:</strong><br>
                ${info.address || 'Behind Lilasha Kuttiya, Meghpar Borichi, Gandhidham, Kutch, Gujarat 370110'}
              </div>

              <div style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 20px;">
                🚩 <strong>Key Landmark:</strong> ${info.googleMapsLandmark || 'Behind Lilasha Kuttiya, Meghpar Borichi'}<br>
                💡 <strong>Google Maps Tip:</strong> ${info.googleMapsSearchTip || 'Search "ISKCON Gandhidham" directly in Google Maps.'}
              </div>

              <a href="${info.googleMapsUrl || 'https://maps.google.com/?q=ISKCON+Gandhidham'}" target="_blank" class="btn btn-gold" style="width: 100%; text-align: center;">
                <span>🚀</span> Direct GPS Route on Google Maps
              </a>
            </div>

            <!-- Phone Numbers & Hours Card -->
            <div style="background: #FFF; border: 2px solid var(--saffron-400); border-radius: var(--radius-lg); padding: 30px; box-shadow: var(--shadow-md);">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <span style="font-size: 2rem;">📞</span>
                <div>
                  <h3 style="font-family: var(--font-serif); font-size: 1.3rem; color: var(--maroon-900); margin: 0;">Phone Contacts & Timings</h3>
                  <span style="font-size: 0.8rem; color: var(--saffron-800); font-weight: 700; text-transform: uppercase;">Helpdesk & Seva Office</span>
                </div>
              </div>

              <div style="font-size: 0.92rem; color: var(--text-main); line-height: 1.8; margin-bottom: 16px;">
                <div>📞 <strong>Primary Phone:</strong> <a href="tel:${info.phone}" style="color: var(--maroon-900); font-weight: 700;">${info.phone}</a></div>
                <div>📞 <strong>Alternate Phone:</strong> <a href="tel:${info.altPhone}" style="color: var(--maroon-900); font-weight: 700;">${info.altPhone}</a></div>
                <div>💬 <strong>WhatsApp Helpline:</strong> <a href="https://wa.me/${info.whatsapp}" target="_blank" style="color: var(--emerald-green); font-weight: 700;">+91 90998 00489</a></div>
                <div>✉️ <strong>Official Email:</strong> <a href="mailto:${info.email}" style="color: var(--saffron-800); font-weight: 600;">${info.email}</a></div>
              </div>

              <div style="background: var(--bg-sand); padding: 14px; border-radius: var(--radius-sm); font-size: 0.88rem; color: var(--text-muted); line-height: 1.6;">
                ⏰ <strong>Call Receive Timings:</strong><br>
                🌅 <em>Morning Session:</em> 10:00 AM – 01:00 PM<br>
                🌆 <em>Evening Session:</em> 04:00 PM – 08:00 PM
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- PRESIDING DEITIES SECTION -->
      <section class="section-padding" style="background: #FFF;">
        <div class="main-container">
          <div class="section-header text-center" style="max-width: 800px; margin: 0 auto 40px auto;">
            <span class="sacred-badge gold">🌸 DIVINE PRESENCE</span>
            <h2 class="section-title">The Presiding Deities of ISKCON Gandhidham</h2>
            <p class="section-subtitle">
              Experience the transcendental beauty and spiritual mercy of the Deities on the alter.
            </p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">
            <div style="background: var(--bg-sand); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 26px; text-align: center;">
              <div style="font-size: 3rem; margin-bottom: 10px;">👑</div>
              <h3 style="font-family: var(--font-serif); font-size: 1.3rem; color: var(--maroon-900); margin-bottom: 8px;">Shri Shri Radha Madanmohanji</h3>
              <p style="font-size: 0.92rem; color: var(--text-muted); line-height: 1.6;">
                Madanmohan means "He who captivates even the mind of Cupid." Together with Srimati Radharani, the Deities bestow eternal bliss and pure devotion upon all who take their Darshan.
              </p>
            </div>



            <div style="background: var(--bg-sand); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 26px; text-align: center;">
              <div style="font-size: 3rem; margin-bottom: 10px;">📘</div>
              <h3 style="font-family: var(--font-serif); font-size: 1.3rem; color: var(--maroon-900); margin-bottom: 8px;">Srila Prabhupada</h3>
              <p style="font-size: 0.92rem; color: var(--text-muted); line-height: 1.6;">
                His Divine Grace A.C. Bhaktivedanta Swami Prabhupada—Founder-Acharya of ISKCON, who carried the message of Bhagavad Gita As It Is to every corner of the world.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- CAMPUS FACILITIES & COMMUNITY SERVICES -->
      <section class="section-padding bg-sand">
        <div class="main-container">
          <div class="section-header text-center" style="max-width: 800px; margin: 0 auto 40px auto;">
            <span class="sacred-badge gold">🏛️ TEMPLE CAMPUS & SERVICES</span>
            <h2 class="section-title">Temple Facilities for Visitors & Devotees</h2>
            <p class="section-subtitle">
              Comprehensive facilities to enrich your spiritual visit to ISKCON Gandhidham.
            </p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
            <div style="background: #FFF; border-radius: var(--radius-md); padding: 22px; border: 1px solid var(--border-color);">
              <h4 style="font-family: var(--font-serif); color: var(--maroon-900); margin-bottom: 6px;">🪔 Main Prayer & Aarti Hall</h4>
              <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.6;">Daily Mangala Aarti (4:30 AM), Sandhya Aarti (7:00 PM), and morning Japa meditation.</p>
            </div>

            <div style="background: #FFF; border-radius: var(--radius-md); padding: 22px; border: 1px solid var(--border-color);">
              <h4 style="font-family: var(--font-serif); color: var(--maroon-900); margin-bottom: 6px;">🍲 Govinda's Prasadam Hall</h4>
              <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.6;">Pure vegetarian Krishna Prasadam, Sunday Feast, and free Anna Daan distribution.</p>
            </div>

            <div style="background: #FFF; border-radius: var(--radius-md); padding: 22px; border: 1px solid var(--border-color);">
              <h4 style="font-family: var(--font-serif); color: var(--maroon-900); margin-bottom: 6px;">📖 Vedic Book & Gift Counter</h4>
              <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.6;">Bhagavad Gita As It Is, Srimad Bhagavatam sets, Japa beads, Tilak, and Deity souvenirs.</p>
            </div>

            <div style="background: #FFF; border-radius: var(--radius-md); padding: 22px; border: 1px solid var(--border-color);">
              <h4 style="font-family: var(--font-serif); color: var(--maroon-900); margin-bottom: 6px;">👥 Youth Forum & Gurukul</h4>
              <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.6;">ISKCON Youth Forum (IYF), Sunday School for kids, and Bhagavad Gita diploma classes.</p>
            </div>
          </div>

          <div style="margin-top: 40px; text-align: center;">
            <a href="#/visit" class="btn btn-primary btn-lg">
              <span>🚗</span> Plan Your Visit to ISKCON Gandhidham
            </a>
          </div>
        </div>
      </section>
    `;
  }

  // 22. 404 NOT FOUND VIEW
  function render404View() {
    mainContentElem.innerHTML = `
      <div class="main-container section-padding" style="text-align: center; max-width: 600px;">
        <div style="font-size: 4rem; margin-bottom: 16px;">🌸</div>
        <span class="sacred-badge gold">Hare Krishna</span>
        <h1 style="font-family: var(--font-serif); font-size: 2.4rem; color: var(--maroon-900); margin: 12px 0;">
          Page Not Found
        </h1>
        <p style="color: var(--text-muted); font-size: 1.05rem; line-height: 1.7; margin-bottom: 32px;">
          The sacred page or resource you are seeking has moved or is under preparation.
        </p>
        <div style="display: flex; gap: 16px; justify-content: center;">
          <a href="#/" class="btn btn-primary">Return to Homepage</a>
          <a href="#/darshan" class="btn btn-secondary">View Today's Darshan</a>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // AUDIO & KIRTAN ENGINE CONTROLLER
  // =========================================================================
  function setupAudioPlayer() {
    const playerBar = document.getElementById('floating-audio-bar');
    const btnPlayPause = document.getElementById('player-play-btn');
    const trackTitle = document.getElementById('player-title');
    const trackArtist = document.getElementById('player-artist');

    if (!playerBar) return;

    window.app.playKirtanTrack = function(index) {
      audioState.currentTrackIndex = index;
      const track = audioState.tracks[index] || audioState.tracks[0];
      audioState.isPlaying = true;

      trackTitle.textContent = track.title;
      trackArtist.textContent = track.artist;
      playerBar.classList.add('visible');
      btnPlayPause.innerHTML = '⏸️';

      playSynthChantAudio();
      showToast(`Now Playing: ${track.title}`, 'info');
    };

    window.app.toggleAudioPlay = function() {
      audioState.isPlaying = !audioState.isPlaying;
      btnPlayPause.innerHTML = audioState.isPlaying ? '⏸️' : '▶️';
      if (audioState.isPlaying) {
        playSynthChantAudio();
      } else {
        stopSynthChantAudio();
      }
    };

    window.app.playNextTrack = function() {
      const nextIdx = (audioState.currentTrackIndex + 1) % audioState.tracks.length;
      window.app.playKirtanTrack(nextIdx);
    };

    window.app.playPrevTrack = function() {
      const prevIdx = (audioState.currentTrackIndex - 1 + audioState.tracks.length) % audioState.tracks.length;
      window.app.playKirtanTrack(prevIdx);
    };
  }

  // Web Audio Synthesizer for meditative Tanpura & Bell Chimes
  function playSynthChantAudio() {
    try {
      if (!audioState.synthCtx) {
        audioState.synthCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioState.synthCtx.state === 'suspended') {
        audioState.synthCtx.resume();
      }

      // Meditative Tanpura drone simulation
      const osc = audioState.synthCtx.createOscillator();
      const gain = audioState.synthCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(146.83, audioState.synthCtx.currentTime); // Root note D3

      gain.gain.setValueAtTime(0.01, audioState.synthCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, audioState.synthCtx.currentTime + 1);

      osc.connect(gain);
      gain.connect(audioState.synthCtx.destination);
      osc.start();
      audioState.synthOsc = osc;
    } catch (e) {
      console.log("Web Audio initialized.");
    }
  }

  function stopSynthChantAudio() {
    if (audioState.synthOsc) {
      try {
        audioState.synthOsc.stop();
        audioState.synthOsc.disconnect();
      } catch (e) {}
    }
  }

  // Chant Counter
  window.app = window.app || {};

  // Bhagavad Gita Language & Navigation Helpers
  window.app.setGitaLanguage = function(lang) {
    window.currentGitaLang = lang;
    const rawHash = window.location.hash || '#/bhagavad-gita';
    const params = new URLSearchParams(rawHash.split('?')[1] || '');
    renderBhagavadGitaView(params);
  };

  window.app.selectGitaVerse = function(chNum, verseVal) {
    const ch = parseInt(chNum) || 1;
    const v = parseInt(verseVal) || 1;
    window.location.hash = `#/bhagavad-gita?chapter=${ch}&verse=${v}`;
  };

  window.app.prevGitaVerse = function(chNum) {
    const currentVerseNum = (window.currentGitaVerseIdx !== undefined ? window.currentGitaVerseIdx : 0) + 1;
    if (currentVerseNum > 1) {
      window.app.selectGitaVerse(chNum, currentVerseNum - 1);
    }
  };

  window.app.nextGitaVerse = function(chNum, maxVerses) {
    const currentVerseNum = (window.currentGitaVerseIdx !== undefined ? window.currentGitaVerseIdx : 0) + 1;
    if (currentVerseNum < maxVerses) {
      window.app.selectGitaVerse(chNum, currentVerseNum + 1);
    }
  };


  window.app.incrementChantCounter = function() {
    audioState.chantCount++;
    const disp = document.getElementById('chant-counter-val');
    if (disp) disp.textContent = audioState.chantCount;

    if (audioState.chantCount === 108) {
      showToast("🎉 Hare Krishna! You have completed 1 Round (108 Mantras) of Japa!", "success");
    }
  };

  window.app.resetChantCounter = function() {
    audioState.chantCount = 0;
    const disp = document.getElementById('chant-counter-val');
    if (disp) disp.textContent = '0';
    showToast("Japa chant counter reset to 0.", "info");
  };

  // =========================================================================
  // MODALS & ACTIONS
  // =========================================================================

  // Lightbox Modal
  window.app.openLightbox = function(imageUrl, title) {
    if (!imageLightboxModalElem) return;
    const cleanImg = imageUrl || 'assets/images/darshan_today.jpg';
    const cleanTitle = escapeHTML(title || 'Sacred Darshan');
    imageLightboxModalElem.innerHTML = `
      <div class="modal-card" style="max-width: 900px; background: #0A0A0A; color: #FFF; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="font-family: var(--font-serif); color: var(--gold-300);">${cleanTitle}</h3>
          <button onclick="window.app.closeModal('lightbox-modal')" class="modal-close-btn" style="color: #FFF;">✕</button>
        </div>
        <img src="${cleanImg}" alt="${cleanTitle}" style="max-height: 75vh; width: 100%; object-fit: contain; margin: 0 auto; border-radius: var(--radius-sm);">
      </div>
    `;
    imageLightboxModalElem.classList.add('open');
  };

  // Image Download Helper (Supports data: URLs, relative assets, and remote URLs)
  window.app.downloadImage = async function(imageUrl, filename) {
    if (!imageUrl) return;
    const name = filename || 'Darshan.jpg';
    try {
      if (imageUrl.startsWith('data:') || imageUrl.startsWith('assets/') || imageUrl.startsWith('.')) {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      }
    } catch (e) {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Checkout Payment Modal (Delegates to enriched Donation & Contact Popup)
  window.app.openCheckout = function(purpose, amount) {
    window.app.openDonationModal(purpose, amount, 'donate');
  };

  // Quick RSVP Modal
  window.app.quickRegisterModal = function(eventId) {
    const evt = window.templeStore.getEventById(eventId) || window.templeStore.getEvents()[0];
    if (!checkoutModalElem) return;

    checkoutModalElem.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Event Registration / RSVP</h3>
          <button onclick="window.app.closeModal('checkout-modal')" class="modal-close-btn">✕</button>
        </div>
        <div class="modal-body">
          <form onsubmit="window.app.handleEventRsvpSubmit(event, '${evt.id}')">
            <div style="background: var(--bg-subtle); padding: 14px; border-radius: var(--radius-sm); margin-bottom: 20px;">
              <strong style="color: var(--maroon-900); font-size: 1.1rem; display: block;">${evt.title}</strong>
              <span style="font-size: 0.85rem; color: var(--saffron-800);">📅 ${evt.date} • ⏰ ${evt.time}</span>
            </div>

            <div class="form-group">
              <label class="form-label">Your Name *</label>
              <input type="text" name="name" class="form-input" required placeholder="e.g. Anand Kumar">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Phone / WhatsApp *</label>
                <input type="tel" name="phone" class="form-input" required placeholder="+91 98765 43210">
              </div>
              <div class="form-group">
                <label class="form-label">Number of Attendees</label>
                <input type="number" name="attendees" class="form-input" value="1" min="1" max="10">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Email Address *</label>
              <input type="email" name="email" class="form-input" required placeholder="anand@example.com">
            </div>

            <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 10px;">
              <span>🎟️</span> Confirm Free Registration
            </button>
          </form>
        </div>
      </div>
    `;
    checkoutModalElem.classList.add('open');
  };

  // Close Modal Helper
  window.app.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  };

  // Dedicated Donation & Contact Popup Modal
  window.app.openDonationModal = function(purpose = '', amount = 2501, initialTab = 'donate') {
    if (!donationModalElem) {
      donationModalElem = document.getElementById('donation-modal');
    }
    if (!donationModalElem) return;

    const sevas = (window.templeStore && window.templeStore.getSevas()) || [];
    const info = (window.TEMPLE_DATA && window.TEMPLE_DATA.info) || {};
    const bank = info.bankDetails || {
      accountName: "ISKCON",
      bankName: "HDFC Bank Ltd",
      accountNumber: "50100236049193",
      ifscCode: "HDFC0001276",
      micrCode: "370240002",
      customerID: "114508073",
      branch: "1276 - Adipur (Kutch, Gujarat)",
      address: "Ground Floor, Plot No 19,20,21, Ward 2a, Maitri Road, Adipur, Kutch, Gujarat - 370205",
      accountType: "INSTITUTIONAL SAVINGS ACCOUNT",
      upiId: "Vyapar.178345262763@hdfcbank",
      payzappId: "65007353",
      upiDeepLink: "upi://pay?pa=Vyapar.178345262763@hdfcbank&pn=ISKCON%20Gandhidham&cu=INR",
      reg80G: "100% Tax Exemption under Section 80G of Income Tax Act 1961",
      qrClean: "assets/images/upi_qr_clean.png",
      qrStandee: "assets/images/upi_qr_standee.png",
      bankStatementImg: "assets/images/bank_details.jpg"
    };

    const presetAmounts = [501, 1100, 2501, 5100, 11000];
    const defaultPurpose = purpose || (sevas.length > 0 ? sevas[0].title : 'Anna Daan — Food For Life Free Prasadam Seva');
    const defaultAmount = amount || 2501;

    const whatsappMessage = encodeURIComponent(
      `Hare Krishna! I would like to inquire about Seva / Donation at ISKCON Gandhidham.\nPurpose: ${defaultPurpose}\nAmount: ₹${defaultAmount}`
    );

    donationModalElem.innerHTML = `
      <div class="modal-card donation-modal-card">
        <div class="donation-modal-header">
          <h3 class="modal-title">
            <span>🙏</span>
            <span>Sri Sri Radha Madanmohan Seva & 80G Gateway</span>
          </h3>
          <button onclick="window.app.closeModal('donation-modal')" class="modal-close-btn" aria-label="Close modal">✕</button>
        </div>

        <div class="donation-modal-grid">
          <!-- LEFT COLUMN: DIVINE MESSAGE & DEVOTEE FAITH -->
          <div class="divine-aastha-sidebar">
            <div class="divine-header-block">
              <span class="divine-deity-badge">🪔 श्री श्री राधा मदनमोहन कृपा</span>
              <h4 style="font-family: var(--font-serif); font-size: 1.3rem; color: #FFFDF9; margin-bottom: 6px;">
                Sacred Seva & Devotion
              </h4>
              <p style="font-size: 0.82rem; color: var(--gold-300); line-height: 1.4;">
                Every offering rendered with love reaches the Supreme Lord directly and brings boundless auspiciousness.
              </p>
            </div>

            <!-- DIVINE SHLOKA -->
            <div class="divine-shloka-box">
              <div class="divine-shloka-sanskrit">
                पत्रं पुष्पं फलं तोयं यो मे भक्त्या प्रयच्छति ।<br>
                तदहं भक्त्युपहृतमश्नामि प्रयतात्मनः ॥
              </div>
              <div class="divine-shloka-meaning">
                "If one offers Me with love and devotion a leaf, a flower, a fruit or water, I will accept it." — Bhagavad Gita 9.26
              </div>
            </div>

            <!-- UPI QR CODE DISPLAY CARD IN SIDEBAR -->
            <div style="background: rgba(255,255,255,0.08); padding: 14px; border-radius: var(--radius-md); border: 1px solid rgba(212,175,55,0.3); text-align: center; margin-top: 12px;">
              <span style="font-size: 0.78rem; color: var(--gold-300); font-weight: 600; display: block; margin-bottom: 6px;">⚡ Scan & Pay via Any UPI App</span>
              <img src="${bank.qrClean || 'assets/images/upi_qr_clean.png'}" alt="UPI QR Code" style="width: 140px; height: 140px; background: #FFF; padding: 6px; border-radius: 8px; margin: 0 auto; display: block; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
              <div style="font-size: 0.75rem; color: #FFF; margin-top: 6px; font-weight: 600;">UPI ID: ${bank.upiId}</div>
              <div style="font-size: 0.7rem; color: var(--gold-300);">PayZapp ID: ${bank.payzappId}</div>
            </div>

            <!-- LIVE IMPACT STATS -->
            <div class="aastha-section" style="margin-top: 12px;">
              <div class="aastha-stats-row">
                <div class="aastha-stat-box">
                  <span class="num">2,500+</span>
                  <span class="label">Daily Meals</span>
                </div>
                <div class="aastha-stat-box">
                  <span class="num">108+</span>
                  <span class="label">Gir Cows Care</span>
                </div>
                <div class="aastha-stat-box">
                  <span class="num">100%</span>
                  <span class="label">80G Tax Free</span>
                </div>
              </div>
            </div>

            <!-- PRIEST SANKALPA BLESSINGS NOTE -->
            <div class="divine-sankalpa-note" style="margin-top: 12px;">
              🪔 <strong>Special Sankalpa:</strong> The donor family name is recited in the holy temple altar during Raj Bhog & Sandhya Aarti.
            </div>
          </div>

          <!-- RIGHT COLUMN: INTERACTIVE TABS & PAYMENT OPTIONS -->
          <div class="donation-modal-content-area">
            <div class="modal-tabs-nav">
              <button type="button" class="modal-tab-btn ${initialTab === 'donate' ? 'active' : ''}" onclick="window.app.switchDonationTab('tab-donate', this)">
                <span>⚡</span> UPI & Instant Form (80G)
              </button>
              <button type="button" class="modal-tab-btn ${initialTab === 'contact' ? 'active' : ''}" onclick="window.app.switchDonationTab('tab-contact', this)">
                <span>🏦</span> Bank Details & QR
              </button>
            </div>

            <div class="modal-body" style="padding: 24px;">
              <!-- TAB 1: ONLINE DONATION & UPI SCAN -->
              <div id="tab-donate" class="modal-tab-content ${initialTab === 'donate' ? 'active' : ''}">
                <div class="tax-highlight-banner">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.4rem;">📜</span>
                    <div>
                      <strong style="color: var(--maroon-900); font-size: 0.9rem; display: block;">100% Tax Exemption under Sec 80G</strong>
                      <span style="font-size: 0.76rem; color: var(--text-muted);">Registered Charitable Trust • Instant Official 80G Tax Receipt</span>
                    </div>
                  </div>
                  <span class="sacred-badge gold" style="font-size: 0.72rem;">HDFC Bank Verified</span>
                </div>

                <form id="popup-donation-form" onsubmit="window.app.handleQuickDonationSubmit(event)">
                  <div class="form-group">
                    <label class="form-label">Select Seva / Contribution Purpose *</label>
                    <select name="purpose" class="form-select" id="popup-donation-purpose" required>
                      <option value="Anna Daan — Food For Life Free Prasadam Seva" ${defaultPurpose.includes('Anna Daan') ? 'selected' : ''}>🍲 Anna Daan — Food For Life Free Prasadam</option>
                      <option value="Deity Shringar & Royal Poshak Seva" ${defaultPurpose.includes('Shringar') ? 'selected' : ''}>🌸 Deity Shringar & Royal Poshak Seva</option>
                      <option value="Gau Seva — Sacred Cow Protection & Fodder" ${defaultPurpose.includes('Gau') ? 'selected' : ''}>🐄 Gau Seva — Sacred Cow Protection & Fodder</option>
                      <option value="Vidyadaan — Bhagavad Gita & Book Distribution" ${defaultPurpose.includes('Vidyadaan') ? 'selected' : ''}>📖 Vidyadaan — Bhagavad Gita & Book Distribution</option>
                      <option value="Sadhu & Brahmachari Bhojan Seva" ${defaultPurpose.includes('Sadhu') ? 'selected' : ''}>📿 Sadhu & Brahmachari Bhojan Seva</option>
                      <option value="Temple Expansion & Cultural Centre Nirman Seva" ${defaultPurpose.includes('Nirman') || defaultPurpose.includes('Expansion') ? 'selected' : ''}>🏛️ Temple Expansion & Cultural Centre Nirman</option>
                      <option value="Sri Krishna Janmashtami Mahotsav 2026 Seva" ${defaultPurpose.includes('Janmashtami') ? 'selected' : ''}>✨ Sri Krishna Janmashtami 2026 Seva</option>
                      <option value="General Temple Maintenance & Worship" ${defaultPurpose.includes('Maintenance') ? 'selected' : ''}>🪔 General Temple Maintenance & Worship</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Select Contribution Amount (₹) *</label>
                    <div class="amount-chips-grid">
                      ${presetAmounts.map(amt => `
                        <button type="button" class="amount-chip-btn ${amt === defaultAmount ? 'active' : ''}" onclick="window.app.selectDonationAmount(${amt}, this)">
                          ₹${amt.toLocaleString('en-IN')}
                        </button>
                      `).join('')}
                    </div>
                    <input type="number" id="popup-custom-amount" name="amount" class="form-input" min="50" value="${defaultAmount}" required placeholder="Or enter custom amount (₹)" oninput="document.getElementById('popup-submit-btn-amt').textContent = Number(this.value || 0).toLocaleString('en-IN')">
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Donor Full Name *</label>
                      <input type="text" name="donorName" class="form-input" required placeholder="As per PAN / Bank">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Mobile / WhatsApp Number *</label>
                      <input type="tel" name="phone" class="form-input" required placeholder="+91 98765 43210">
                    </div>
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Email Address * (For 80G Receipt)</label>
                      <input type="email" name="email" class="form-input" required placeholder="donor@example.com">
                    </div>
                    <div class="form-group">
                      <label class="form-label">PAN Number (Optional — required only for 80G Tax Exemption Certificate)</label>
                      <input type="text" name="pan" class="form-input" maxlength="10" placeholder="ABCDE1234F" style="text-transform: uppercase;">
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Preferred Payment Mode *</label>
                    <select name="paymentMethod" class="form-select">
                      <option value="UPI / QR Code (${bank.upiId})">⚡ UPI / QR Code (GPay, PhonePe, Paytm, BHIM, PayZapp)</option>
                      <option value="HDFC Bank Transfer (Acc: ${bank.accountNumber})">🏛️ HDFC Direct Bank Transfer (NEFT / RTGS / IMPS)</option>
                      <option value="Credit / Debit Card (Visa, Mastercard, RuPay)">💳 Debit / Credit Card (Visa, MasterCard, RuPay)</option>
                    </select>
                  </div>

                  <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 10px;">
                    <span>🙏</span> Complete Seva Donation (₹<span id="popup-submit-btn-amt">${defaultAmount.toLocaleString('en-IN')}</span>)
                  </button>

                  <div style="text-align: center; margin-top: 12px; font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <span>🔒 256-Bit SSL Encrypted</span>
                    <span>•</span>
                    <span>Instant 80G Tax Invoice</span>
                  </div>
                </form>
              </div>

              <!-- TAB 2: BANK DETAILS & UPI QR CODE -->
              <div id="tab-contact" class="modal-tab-content ${initialTab === 'contact' ? 'active' : ''}">
                <div style="margin-bottom: 12px;">
                  <div class="bank-details-card" style="background: linear-gradient(135deg, #FFF9F0 0%, #FFF 100%); border: 1px solid var(--gold-300); padding: 18px; border-radius: var(--radius-md); box-shadow: 0 4px 14px rgba(0,0,0,0.05);">
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(212, 175, 55, 0.3); padding-bottom: 10px; margin-bottom: 14px;">
                      <div>
                        <strong style="color: var(--maroon-900); font-family: var(--font-serif); font-size: 1.1rem; display: block;">🏛️ Official HDFC Bank Account</strong>
                        <span style="font-size: 0.78rem; color: var(--text-muted);">For Direct NEFT / RTGS / IMPS Bank Transfer</span>
                      </div>
                      <span class="sacred-badge gold" style="font-size: 0.72rem;">HDFC Bank Ltd</span>
                    </div>

                    <div class="bank-details-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                      <div class="bank-detail-item" style="background: rgba(255,255,255,0.9); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                          <span class="label" style="display: block; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Account Name</span>
                          <strong class="value" style="color: var(--maroon-900); font-size: 0.95rem;">${bank.accountName}</strong>
                        </div>
                        <button type="button" class="btn-copy-mini" onclick="window.app.copyText('${bank.accountName}', this)">Copy</button>
                      </div>

                      <div class="bank-detail-item" style="background: rgba(255,255,255,0.9); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                          <span class="label" style="display: block; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Bank Name</span>
                          <strong class="value" style="color: var(--maroon-900); font-size: 0.95rem;">${bank.bankName}</strong>
                        </div>
                      </div>

                      <div class="bank-detail-item" style="background: rgba(255,255,255,0.9); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                          <span class="label" style="display: block; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Account Number</span>
                          <strong class="value" style="color: var(--maroon-900); font-size: 1.05rem; letter-spacing: 0.05em;">${bank.accountNumber}</strong>
                        </div>
                        <button type="button" class="btn-copy-mini" onclick="window.app.copyText('${bank.accountNumber}', this)">Copy</button>
                      </div>

                      <div class="bank-detail-item" style="background: rgba(255,255,255,0.9); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                          <span class="label" style="display: block; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">IFSC Code</span>
                          <strong class="value" style="color: var(--maroon-900); font-size: 1.05rem; letter-spacing: 0.05em;">${bank.ifscCode}</strong>
                        </div>
                        <button type="button" class="btn-copy-mini" onclick="window.app.copyText('${bank.ifscCode}', this)">Copy</button>
                      </div>

                      <div class="bank-detail-item" style="background: rgba(255,255,255,0.9); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                          <span class="label" style="display: block; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Branch & Address</span>
                          <span class="value" style="font-size: 0.82rem; color: var(--text-main); font-weight: 500;">${bank.address}</span>
                        </div>
                        <button type="button" class="btn-copy-mini" onclick="window.app.openLightbox('${bank.bankStatementImg}', 'Official HDFC Bank Account Document')">View Doc 📄</button>
                      </div>

                      <div class="bank-detail-item" style="background: #F0FDF4; padding: 10px; border-radius: var(--radius-sm); border: 1px solid #BBF7D0; grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                          <span class="label" style="display: block; font-size: 0.72rem; color: #166534; text-transform: uppercase;">Direct UPI VPA & PayZapp</span>
                          <strong class="value" style="color: #15803D; font-size: 0.98rem;">${bank.upiId}</strong>
                          <span style="font-size: 0.75rem; color: #166534; margin-left: 8px;">(PayZapp ID: ${bank.payzappId})</span>
                        </div>
                        <div style="display: flex; gap: 6px;">
                          <button type="button" class="btn-copy-mini" onclick="window.app.copyText('${bank.upiId}', this)">Copy UPI</button>
                          <a href="${bank.upiDeepLink}" class="btn-copy-mini" style="background: var(--emerald-green); color: #FFF; text-decoration: none;">Pay via App ⚡</a>
                        </div>
                      </div>
                    </div>

                    <div style="margin-top: 12px; font-size: 0.78rem; color: var(--text-muted); background: rgba(255, 255, 255, 0.8); padding: 10px 14px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center;">
                      <span>💡 <em>After transferring, click button to submit UTR or notify on WhatsApp:</em></span>
                      <a href="https://wa.me/${info.whatsapp ? info.whatsapp.replace(/[^0-9]/g, '') : '919099800489'}?text=${whatsappMessage}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="font-size: 0.78rem; padding: 4px 10px;">💬 Share Receipt on WhatsApp</a>
                    </div>
                  </div>

                  <!-- Quick Callback Inquiry Form -->
                  <div style="background: var(--bg-subtle); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-top: 14px;">
                    <strong style="color: var(--maroon-900); font-size: 0.95rem; display: block; margin-bottom: 10px;">Request a Callback from Temple Seva Desk</strong>
                    <form id="donation-callback-form" onsubmit="window.app.handleDonationInquirySubmit(event)">
                      <div class="form-row">
                        <div class="form-group" style="margin-bottom: 8px;">
                          <input type="text" name="name" class="form-input" required placeholder="Your Name *">
                        </div>
                        <div class="form-group" style="margin-bottom: 8px;">
                          <input type="tel" name="phone" class="form-input" required placeholder="Mobile / WhatsApp *">
                        </div>
                      </div>
                      <div class="form-group" style="margin-bottom: 10px;">
                        <input type="text" name="sevaQuery" class="form-input" placeholder="Interested Seva (e.g. Birthday Anna Daan, Janmashtami Abhishek, Goshala)">
                      </div>
                      <button type="submit" class="btn btn-secondary btn-sm" style="width: 100%;">
                        <span>📨</span> Request Temple Coordinator Call
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    donationModalElem.classList.add('open');
  };

  // Tab Switcher for Donation Modal
  window.app.switchDonationTab = function(tabId, btnElem) {
    document.querySelectorAll('.donation-modal-card .modal-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.donation-modal-card .modal-tab-content').forEach(content => content.classList.remove('active'));

    if (btnElem) btnElem.classList.add('active');
    const targetContent = document.getElementById(tabId);
    if (targetContent) targetContent.classList.add('active');
  };

  // Select Preset Amount
  window.app.selectDonationAmount = function(amount, btnElem) {
    const customInp = document.getElementById('popup-custom-amount');
    const submitBtnAmt = document.getElementById('popup-submit-btn-amt');
    if (customInp) customInp.value = amount;
    if (submitBtnAmt) submitBtnAmt.textContent = Number(amount).toLocaleString('en-IN');

    document.querySelectorAll('.amount-chip-btn').forEach(b => b.classList.remove('active'));
    if (btnElem) btnElem.classList.add('active');
  };

  // Copy to Clipboard Helper with UI Feedback
  window.app.copyText = function(text, btnElem) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        if (btnElem) {
          const originalText = btnElem.textContent;
          btnElem.textContent = '✓ Copied!';
          btnElem.style.background = 'var(--emerald-green)';
          btnElem.style.color = '#FFF';
          setTimeout(() => {
            btnElem.textContent = originalText;
            btnElem.style.background = '';
            btnElem.style.color = '';
          }, 2000);
        }
        showToast(`Copied "${text}" to clipboard`, 'success');
      }).catch(() => {
        showToast(`Selected: ${text}`, 'info');
      });
    } else {
      showToast(`Selected: ${text}`, 'info');
    }
  };

  // Quick Donation Form Submission
  window.app.handleQuickDonationSubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const rawPan = (formData.get('pan') || '').trim().toUpperCase();
    if (rawPan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(rawPan)) {
      showToast("Invalid PAN format. Please enter a valid 10-character PAN (e.g. ABCDE1234F) or leave it blank.", "warning");
      return;
    }

    const donationData = {
      donorName: formData.get('donorName'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      pan: rawPan || null,
      amount: formData.get('amount'),
      purpose: formData.get('purpose'),
      paymentMethod: formData.get('paymentMethod'),
      address: 'Online Seva Portal'
    };

    try {
      const newRecord = await window.templeStore.recordDonation(donationData);
      window.app.closeModal('donation-modal');
      showToast("Donation successful! Generating official 80G tax receipt...", "success");
      window.location.hash = `#/donate/success?id=${newRecord.id}`;
    } catch (err) {
      showToast("Failed to process donation. Please try again.", "danger");
    }
  };

  // Seva Callback Inquiry Submission
  window.app.handleDonationInquirySubmit = function(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    window.templeStore.submitInquiry({
      name: formData.get('name'),
      phone: formData.get('phone'),
      subject: `Seva Inquiry: ${formData.get('sevaQuery') || 'Temple Donation'}`,
      message: `Inquiry submitted via Donation Pop-up. Seva interest: ${formData.get('sevaQuery') || 'General Seva'}`
    });

    form.reset();
    showToast("Callback request received! Temple Seva desk will contact you shortly.", "success");
  };

  // Universal Search Modal
  window.app.openSearch = function() {
    if (!searchModalElem) return;
    searchModalElem.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Search ISKCON Gandhidham</h3>
          <button onclick="window.app.closeModal('search-modal')" class="modal-close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="search-input-box">
            <span>🔍</span>
            <input type="text" id="universal-search-input" placeholder="Search Darshan, Gita verses, Events, Seva, Timings..." autofocus oninput="window.app.handleSearchQuery(this.value)">
          </div>

          <div id="search-results-container" class="search-results-list">
            <div style="text-align: center; color: var(--text-muted); padding: 24px;">
              Type keywords like "Gita", "Janmashtami", "Aarti", "Anna Daan", "Timings"...
            </div>
          </div>
        </div>
      </div>
    `;
    searchModalElem.classList.add('open');
    setTimeout(() => {
      const inp = document.getElementById('universal-search-input');
      if (inp) inp.focus();
    }, 100);
  };

  window.app.handleSearchQuery = function(query) {
    const resultsContainer = document.getElementById('search-results-container');
    if (!resultsContainer) return;
    const q = query.trim().toLowerCase();

    if (!q) {
      resultsContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">Type to search...</div>`;
      return;
    }

    const results = [];
    const data = window.TEMPLE_DATA;

    // Search Events
    (window.templeStore ? window.templeStore.getEvents() : (data?.events || [])).forEach(e => {
      const titleStr = (e.title || '').toLowerCase();
      const descStr = (e.shortDesc || e.description || e.fullDesc || '').toLowerCase();
      if (titleStr.includes(q) || descStr.includes(q)) {
        results.push({ title: e.title || 'Temple Event', category: 'Event', hash: `#/events/${e.id}`, subtitle: e.date || '' });
      }
    });

    // Search Seva
    (window.templeStore ? window.templeStore.getSevas() : (data?.sevaCategories || [])).forEach(s => {
      const titleStr = (s.title || '').toLowerCase();
      const descStr = (s.shortDesc || s.description || '').toLowerCase();
      if (titleStr.includes(q) || descStr.includes(q)) {
        results.push({ title: s.title || 'Temple Seva', category: 'Seva', hash: `#/seva`, subtitle: s.impact || '' });
      }
    });

    // Search Gita Chapters
    (data?.bhagavadGita?.chapters || []).forEach(c => {
      const titleEn = (c.titleEnglish || '').toLowerCase();
      const titleSa = (c.titleSanskrit || '').toLowerCase();
      const summaryText = (c.summary || '').toLowerCase();
      if (titleEn.includes(q) || titleSa.includes(q) || summaryText.includes(q)) {
        results.push({ title: `Gita Ch ${c.number}: ${c.titleEnglish || ''}`, category: 'Bhagavad Gita', hash: `#/bhagavad-gita?chapter=${c.number}`, subtitle: c.titleSanskrit || '' });
      }
    });

    // Search Articles & Wisdom
    const articleList = (window.templeStore ? window.templeStore.getQuotes() : null) || data?.articles || [];
    articleList.forEach(a => {
      const titleStr = (a.title || a.text || '').toLowerCase();
      const excerptStr = (a.excerpt || a.text || a.author || '').toLowerCase();
      if (titleStr.includes(q) || excerptStr.includes(q)) {
        const displayTitle = a.title || (a.text ? a.text.slice(0, 50) + '...' : 'Wisdom Quote');
        results.push({ title: displayTitle, category: 'Article', hash: `#/articles?id=${a.id}`, subtitle: a.author || a.readTime || '' });
      }
    });

    // Search Schedule Timings
    (window.templeStore ? window.templeStore.getSchedule() : (data?.schedule || [])).forEach(s => {
      const nameStr = (s.name || '').toLowerCase();
      const descStr = (s.desc || s.description || '').toLowerCase();
      if (nameStr.includes(q) || descStr.includes(q)) {
        results.push({ title: s.name || 'Aarti', category: 'Temple Aarti', hash: `#/timings`, subtitle: s.time || '' });
      }
    });

    if (results.length === 0) {
      resultsContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">No matching results found for "${query}".</div>`;
      return;
    }

    resultsContainer.innerHTML = results.slice(0, 8).map(r => `
      <div class="search-result-item" onclick="window.location.hash='${r.hash}'; window.app.closeModal('search-modal');">
        <div>
          <strong style="color: var(--maroon-900); display: block; font-size: 0.95rem;">${r.title}</strong>
          <span style="font-size: 0.8rem; color: var(--text-muted);">${r.subtitle}</span>
        </div>
        <span class="sacred-badge maroon">${r.category}</span>
      </div>
    `).join('');
  };

  // =========================================================================
  // FORM HANDLERS
  // =========================================================================
  window.app.handleDonationSubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const rawPan = (formData.get('pan') || '').trim().toUpperCase();
    if (rawPan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(rawPan)) {
      showToast("Invalid PAN format. Please enter a valid 10-character PAN (e.g. ABCDE1234F) or leave it blank.", "warning");
      return;
    }

    const donationData = {
      donorName: formData.get('donorName'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      pan: rawPan || null,
      amount: formData.get('amount'),
      purpose: formData.get('purpose'),
      paymentMethod: formData.get('paymentMethod'),
      address: formData.get('address')
    };

    try {
      const newRecord = await window.templeStore.recordDonation(donationData);
      showToast("Donation successful! Generating official 80G receipt...", "success");
      window.location.hash = `#/donate/success?id=${newRecord.id}`;
    } catch (err) {
      showToast("Failed to process donation. Please try again.", "danger");
    }
  };

  window.app.handleCheckoutSubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const rawPan = (formData.get('pan') || '').trim().toUpperCase();
    if (rawPan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(rawPan)) {
      showToast("Invalid PAN format. Please enter a valid 10-character PAN (e.g. ABCDE1234F) or leave it blank.", "warning");
      return;
    }

    const donationData = {
      donorName: formData.get('donorName'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      pan: rawPan || null,
      amount: formData.get('amount'),
      purpose: formData.get('purpose'),
      paymentMethod: formData.get('paymentMethod')
    };

    try {
      const newRecord = await window.templeStore.recordDonation(donationData);
      window.app.closeModal('checkout-modal');
      showToast("Seva payment verified successfully! Thank you.", "success");
      window.location.hash = `#/donate/success?id=${newRecord.id}`;
    } catch (err) {
      showToast("Failed to process donation. Please try again.", "danger");
    }
  };

  window.app.handleEventRsvpSubmit = async function(e, eventId) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    try {
      await window.templeStore.registerForEvent({
        eventId: eventId,
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        attendees: formData.get('attendees')
      });
      window.app.closeModal('checkout-modal');
      showToast("Registration Confirmed! We look forward to your presence.", "success");
    } catch (err) {
      showToast("Failed to confirm RSVP. Please try again.", "danger");
    }
  };

  window.app.handleVolunteerSubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    try {
      await window.templeStore.submitVolunteer({
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        age: formData.get('age'),
        interest: formData.get('interest'),
        availability: formData.get('availability'),
        message: formData.get('message')
      });
      form.reset();
      showToast("Thank you for offering your seva! Our team will contact you soon.", "success");
    } catch (err) {
      showToast("Failed to submit volunteer form. Please try again.", "danger");
    }
  };

  window.app.handleInquirySubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    try {
      await window.templeStore.submitInquiry({
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        subject: formData.get('subject'),
        message: formData.get('message')
      });
      form.reset();
      showToast("Your message has been sent to the temple office. Hare Krishna!", "success");
    } catch (err) {
      showToast("Failed to submit inquiry. Please try again.", "danger");
    }
  };


  // Helper Utility Actions
  window.app.navigateGitaChapter = function(chNum) {
    if (chNum >= 1 && chNum <= 18) {
      window.location.hash = `#/bhagavad-gita?chapter=${chNum}`;
    }
  };

  window.app.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('open');
    }
  };

  window.app.startWhatsAppChat = function(customMessage, phoneOverride) {
    const info = window.TEMPLE_DATA?.info || {};
    const rawPhone = phoneOverride || info.whatsapp || '919099800489';
    const cleanPhone = rawPhone.replace(/\+/g, '').replace(/\s+/g, '');
    const text = encodeURIComponent(customMessage || 'Hare Krishna! I want to connect with ISKCON Gandhidham temple helpdesk.');
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`;
    window.open(whatsappUrl, '_blank');
  };

  window.app.openWhatsAppContactModal = function() {
    const info = window.TEMPLE_DATA?.info || {};
    const modal = document.getElementById('whatsapp-contact-modal');
    if (!modal) return;

    const communityLink = info.socialLinks?.whatsappChannel || 'https://whatsapp.com/channel/iskcongandhidham';

    modal.innerHTML = `
      <div class="divine-modal-content" style="max-width: 560px; text-align: left; position: relative;" onclick="event.stopPropagation()">
        <button class="modal-close-btn" onclick="window.app.closeModal('whatsapp-contact-modal')" aria-label="Close Modal" style="position: absolute; top: 16px; right: 16px; background: rgba(0,0,0,0.06); border: none; border-radius: 50%; width: 32px; height: 32px; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--maroon-900);">✕</button>

        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 3.2rem; margin-bottom: 6px;">💬 🌸</div>
          <span class="sacred-badge gold" style="background: #25D366; color: #FFF; font-weight: 700; font-size: 0.8rem; padding: 4px 14px; border-radius: 20px; text-transform: uppercase;">Official WhatsApp Support</span>
          <h2 style="font-family: var(--font-serif); color: var(--maroon-900); font-size: 1.75rem; margin: 10px 0 4px 0;">
            Connect with ISKCON Gandhidham
          </h2>
          <p style="font-size: 0.92rem; color: var(--text-muted); margin: 0 auto; max-width: 440px;">
            Please select an option below to continue on WhatsApp:
          </p>
        </div>

        <!-- OPTION 1: JOIN COMMUNITY -->
        <div style="background: #F0FDF4; border: 2px solid #25D366; border-radius: var(--radius-md, 12px); padding: 18px; margin-bottom: 16px; transition: all 0.2s ease;">
          <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
            <div style="background: #25D366; color: #FFF; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; box-shadow: 0 4px 10px rgba(37,211,102,0.3);">
              👥
            </div>
            <div>
              <span style="background: #DCFCE7; color: #166534; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">Option 1</span>
              <h3 style="font-family: var(--font-serif); font-size: 1.15rem; color: #14532D; margin: 4px 0 4px 0;">
                Join Devotee WhatsApp Community
              </h3>
              <p style="font-size: 0.86rem; color: #166534; line-height: 1.45; margin: 0;">
                Get Daily Divine Darshan photos, festival alerts, live stream links, and inspiring spiritual quotes directly on WhatsApp.
              </p>
            </div>
          </div>
          <a href="${communityLink}" target="_blank" rel="noopener noreferrer" class="btn" style="width: 100%; background: #25D366; color: #FFF; border: none; font-weight: 700; font-size: 0.95rem; padding: 12px 18px; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(37,211,102,0.35);">
            <span>🟢</span> JOIN WHATSAPP COMMUNITY NOW
          </a>
        </div>

        <!-- OPTION 2: CONTACT TEMPLE OWNER / DONATIONS -->
        <div style="background: #FFFBEB; border: 2px solid var(--gold-500, #D97706); border-radius: var(--radius-md, 12px); padding: 18px; margin-bottom: 20px;">
          <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
            <div style="background: var(--maroon-900, #4A0404); color: var(--gold-300, #FDE68A); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; box-shadow: 0 4px 10px rgba(74,4,4,0.3);">
              🪔
            </div>
            <div>
              <span style="background: #FEF3C7; color: #92400E; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">Option 2</span>
              <h3 style="font-family: var(--font-serif); font-size: 1.15rem; color: var(--maroon-900, #4A0404); margin: 4px 0 4px 0;">
                Contact Temple Owner / Helpdesk
              </h3>
              <p style="font-size: 0.86rem; color: #78350F; line-height: 1.45; margin: 0;">
                Connect directly with temple authorities to inquire about temple activities or offer Seva & donations:
              </p>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button onclick="window.app.startWhatsAppChat('Hare Krishna! I would like to contact the temple owner/helpdesk to know more about ISKCON Gandhidham timings and activities.')" class="whatsapp-preset-card" style="background: #FFF; border: 1.5px solid #FCD34D; border-radius: 8px; padding: 12px 14px; text-align: left; cursor: pointer; transition: all 0.2s ease;">
              <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 1.3rem;">ℹ️</span>
                  <div>
                    <strong style="font-size: 0.92rem; color: var(--maroon-900); display: block;">Know More About Temple</strong>
                    <span style="font-size: 0.78rem; color: var(--text-muted);">Inquire about timings, location & lectures</span>
                  </div>
                </div>
                <span style="color: #D97706; font-weight: 700; font-size: 1.1rem;">➔</span>
              </div>
            </button>

            <button onclick="window.app.startWhatsAppChat('Hare Krishna! I am contacting to inquire about making a donation / offering Seva (Anna Daan, Deity Poshaka, Temple Construction) to ISKCON Gandhidham.')" class="whatsapp-preset-card" style="background: #FFF; border: 1.5px solid #FCD34D; border-radius: 8px; padding: 12px 14px; text-align: left; cursor: pointer; transition: all 0.2s ease;">
              <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 1.3rem;">🙏</span>
                  <div>
                    <strong style="font-size: 0.92rem; color: var(--maroon-900); display: block;">Temple Donation & Sacred Seva</strong>
                    <span style="font-size: 0.78rem; color: var(--text-muted);">Anna Daan, 80G tax receipt & Deity Seva</span>
                  </div>
                </div>
                <span style="color: #D97706; font-weight: 700; font-size: 1.1rem;">➔</span>
              </div>
            </button>
          </div>
        </div>

        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px 16px; border-radius: 8px; font-size: 0.82rem; color: #475569; text-align: center;">
          📞 <strong>Helpline:</strong> +91 90998 00489 / +91 98792 00489 &nbsp;|&nbsp; ⏰ 10:00 AM – 8:00 PM
        </div>
      </div>
    `;

    modal.classList.add('open');
  };

  window.app.shareDarshanWhatsApp = function(title, date) {
    const text = encodeURIComponent(`🌸 Today's Divine Darshan from ISKCON Gandhidham (${date}): ${title}\nView online: ${window.location.origin}/#/darshan\nHare Krishna!`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  window.app.shareEventWhatsApp = function(title, date) {
    const text = encodeURIComponent(`🎉 Invitation: Join us for ${title} on ${date} at ISKCON Gandhidham!\nDetails & RSVP: ${window.location.origin}/#/events\nHare Krishna!`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  window.app.downloadCalendarEvent = function(eventId) {
    const evt = window.templeStore.getEventById(eventId) || window.templeStore.getEvents()[0] || {};
    const titleText = evt.title || 'Temple Event';
    const descText = evt.shortDesc || evt.description || evt.fullDesc || '';
    const locText = evt.location || 'Temple Sanctuary';
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ISKCON Gandhidham//Temple Events//EN
BEGIN:VEVENT
SUMMARY:${titleText}
DESCRIPTION:${descText}
LOCATION:${locText}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${evt.id || 'event'}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Event downloaded to your calendar.", "success");
  };

  window.app.toggleMantraSanskrit = function(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
      el.classList.toggle('open');
    }
  };

  window.app.copyShlokaById = function(mantraId) {
    const allMantras = window.TEMPLE_DATA.mantrasAndShlokas || [];
    const mantra = allMantras.find(m => m.id === mantraId);
    if (mantra) {
      const text = `${mantra.title}\n\n${mantra.sanskrit || ''}\n\n${mantra.transliteration || ''}\n\nMeaning:\n"${mantra.translation}"\n\n— ISKCON Gandhidham (Sri Sri Radha Madanmohan Mandir)`;
      window.app.copyShlokaText(text);
    }
  };

  window.app.shareMantraById = function(mantraId) {
    const allMantras = window.TEMPLE_DATA.mantrasAndShlokas || [];
    const mantra = allMantras.find(m => m.id === mantraId);
    if (mantra) {
      window.app.shareMantraWhatsApp(mantra.title, mantra.transliteration, mantra.translation);
    }
  };

  window.app.copyShlokaText = function(textToCopy) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast("✨ Shloka copied to clipboard!", "success");
    }).catch(() => {
      showToast("Selected text for copying.", "info");
    });
  };

  window.app.shareMantraWhatsApp = function(title, transliteration, translation) {
    const text = encodeURIComponent(`🌺 Sacred Shloka from ISKCON Gandhidham:\n\n*${title}*\n\n${transliteration}\n\n📖 _Meaning:_\n"${translation}"\n\nExplore more mantras & daily darshan: ${window.location.origin}/#/mantras\nHare Krishna! 🙏`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  window.app.chantMantra = function(mantraId) {
    const allMantras = window.TEMPLE_DATA.mantrasAndShlokas || [];
    const mantra = allMantras.find(m => m.id === mantraId);
    
    // Play harmonic chime using Web Audio API
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(432, ctx.currentTime); // 432 Hz Sacred Frequency
        osc.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      }
    } catch(e) {}

    // Speech Synthesis for Sanskrit / English recitation if available
    if ('speechSynthesis' in window && mantra) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(mantra.transliteration || mantra.translation);
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }

    // Increment chant count
    audioState.chantCount = (audioState.chantCount || 0) + 1;
    showToast(`📿 Chant Recorded (${audioState.chantCount}): ${mantra ? mantra.title : 'Sacred Mantra'}`, "success");
  };

  window.app.searchMantras = function(query) {
    window.location.hash = `#/mantras?q=${encodeURIComponent(query)}`;
  };

  // =========================================================================
  // JOIN OUR CLASSES & BRAHMA SAMHITA VIEW RENDERERS
  // =========================================================================

  // 1. JOIN OUR CLASSES VIEW
  function renderClassesView(params) {
    const courses = window.TEMPLE_DATA.coursesCatalog || [];

    mainContentElem.innerHTML = `
      <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.58) 0%, rgba(15, 2, 5, 0.65) 100%), url('assets/images/gallery/temple_photo_04.jpg') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden; margin-bottom: 40px;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.50) 100%); pointer-events: none;"></div>
        <div class="main-container" style="position: relative; z-index: 2; text-align: center;">
          <span class="sacred-badge gold" style="margin-bottom: 8px;">🎓 ISKCON GANDHIDHAM GURUKUL</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">Join Our Spiritual Classes</h1>
          <p style="color: var(--gold-300); font-size: 1.1rem; max-width: 700px; margin: 0 auto;">
            Transform your life with authentic Vedic wisdom, Bhagavad Gita As It Is, Brahma Samhita, and devotional lifestyle courses guided by senior Vaishnava scholars.
          </p>
        </div>
      </div>
      <div class="main-container section-padding">
        <div class="course-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 28px; margin-bottom: 60px;">
          ${courses.map(c => `
            <div class="card course-card" style="display: flex; flex-direction: column; height: 100%; overflow: hidden; border: 1px solid var(--gold-300);">
              <div style="height: 200px; position: relative; overflow: hidden; background: #22040A;">
                <img src="${c.image || 'assets/images/gallery/temple_photo_04.jpg'}" alt="${c.title}" style="width: 100%; height: 100%; object-fit: cover;">
                <span class="sacred-badge gold" style="position: absolute; top: 12px; left: 12px;">${c.badge || 'Spiritual Course'}</span>
              </div>
              <div style="padding: 24px; display: flex; flex-direction: column; flex: 1;">
                <h3 style="font-family: var(--font-serif); font-size: 1.35rem; color: var(--maroon-900); margin-bottom: 8px;">${c.title}</h3>
                <p style="color: var(--text-muted); font-size: 0.92rem; line-height: 1.6; margin-bottom: 20px; flex: 1;">${c.description}</p>
                <div style="background: var(--saffron-50); padding: 12px 16px; border-radius: var(--radius-sm); margin-bottom: 20px; font-size: 0.88rem; color: var(--maroon-900);">
                  ⏰ <strong>Duration / Schedule:</strong> ${c.schedule || 'Weekly Interactive Sessions'}
                </div>
                <button onclick="window.app.openCheckout('Course Registration: ${c.title}', 501)" class="btn btn-primary" style="width: 100%;">
                  <span>📝</span> Register / Enroll Now
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 2. SRI BRAHMA SAMHITA VIEW
  // =========================================================================
  function renderBrahmaSamhitaView(params) {
    const bs = window.TEMPLE_DATA?.brahmaSamhita || {};
    const slokas = bs.slokas || [];

    mainContentElem.innerHTML = `
      <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.70) 0%, rgba(15, 2, 5, 0.80) 100%), url('assets/images/hero_radha_madanmohan.jpg') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden; margin-bottom: 40px;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.60) 100%); pointer-events: none;"></div>
        <div class="main-container" style="position: relative; z-index: 2; text-align: center;">
          <span class="sacred-badge gold" style="margin-bottom: 8px;">📜 VEDIC HYMNS OF CREATION • CHAPTER 5</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">${escapeHTML(bs.title || 'Sri Brahma Samhita')}</h1>
          <p style="color: var(--gold-300); font-size: 1.15rem; max-width: 780px; margin: 0 auto 16px auto; font-family: var(--font-serif); font-style: italic;">
            ${escapeHTML(bs.subTitle || 'The Transcendental Hymns of Creation Spoken by Lord Brahma')}
          </p>
          <p style="color: #F7FAFC; font-size: 0.95rem; max-width: 820px; margin: 0 auto 24px auto; line-height: 1.7;">
            ${escapeHTML(bs.overview || '')}
          </p>
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <a href="#bs-5-1" class="btn btn-gold btn-sm">Read Verse 5.1 (ईश्वरः परमः कृष्णः)</a>
            <button onclick="window.app.openCheckout('Course Registration: Sri Brahma Samhita', 501)" class="btn btn-outline-light btn-sm">🎓 Enroll in Course</button>
          </div>
        </div>
      </div>

      <div class="main-container section-padding" style="padding-top: 0;">
        <!-- Philosophical Importance Cards -->
        <h2 style="font-family: var(--font-serif); font-size: 2rem; color: var(--maroon-900); text-align: center; margin-bottom: 30px;">
          Glories & Philosophical Significance
        </h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 50px;">
          ${(bs.importance || []).map(item => `
            <div class="card" style="padding: 24px; border: 1.5px solid var(--gold-300); background: #FFFDF9; border-radius: var(--radius-md);">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                <span style="font-size: 1.4rem;">✨</span>
                <h3 style="font-family: var(--font-serif); font-size: 1.15rem; color: var(--maroon-900); margin: 0;">${escapeHTML(item.title)}</h3>
              </div>
              <p style="color: var(--text-main); font-size: 0.92rem; line-height: 1.65; margin: 0;">${escapeHTML(item.desc)}</p>
            </div>
          `).join('')}
        </div>

        <!-- Sacred Verses Display -->
        <h2 style="font-family: var(--font-serif); font-size: 2rem; color: var(--maroon-900); text-align: center; margin-bottom: 8px;">
          Sacred Slokas (Chapter 5)
        </h2>
        <p style="text-align: center; color: var(--text-muted); margin-bottom: 36px;">
          Recited in the early morning Brahma-Muhurta across all ISKCON temples worldwide
        </p>

        <div style="display: flex; flex-direction: column; gap: 32px; max-width: 900px; margin: 0 auto 60px auto;">
          ${slokas.map(s => `
            <div id="${s.id || ''}" class="card" style="padding: 32px; border: 2px solid var(--gold-400); border-radius: var(--radius-lg); background: #FFFDF9; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--gold-200); padding-bottom: 14px; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <span class="sacred-badge gold" style="font-size: 0.9rem;">Verse ${escapeHTML(s.verse)}</span>
                <h3 style="font-family: var(--font-serif); font-size: 1.25rem; color: var(--maroon-900); margin: 0;">${escapeHTML(s.title)}</h3>
              </div>

              <!-- Sanskrit text -->
              <div style="font-family: 'Tiro Devanagari Sanskrit', serif; font-size: 1.4rem; line-height: 2; color: var(--maroon-900); text-align: center; margin-bottom: 18px; white-space: pre-line; background: var(--saffron-50); padding: 20px; border-radius: var(--radius-sm); border: 1px dashed var(--gold-400);">
                ${escapeHTML(s.sanskrit)}
              </div>

              <!-- Transliteration -->
              <div style="font-style: italic; color: var(--saffron-900); font-weight: 600; text-align: center; margin-bottom: 20px; line-height: 1.7; font-size: 1.02rem;">
                ${escapeHTML(s.transliteration)}
              </div>

              <!-- Translation -->
              <div style="margin-bottom: 20px; line-height: 1.7; color: var(--text-main); font-size: 1rem; border-left: 4px solid var(--gold-500); padding-left: 16px;">
                <strong>Translation:</strong> ${escapeHTML(s.translation)}
              </div>

              <!-- Purport -->
              ${s.purport ? `
                <div style="background: rgba(0,0,0,0.02); padding: 18px; border-radius: var(--radius-sm); font-size: 0.92rem; line-height: 1.7; color: var(--text-muted); margin-bottom: 20px;">
                  <strong style="color: var(--maroon-900);">Purport:</strong> ${escapeHTML(s.purport)}
                </div>
              ` : ''}

              <!-- Actions -->
              <div style="display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
                <button class="btn btn-sm btn-secondary" onclick="window.app.copyShlokaText('${escapeHTML(s.sanskrit + '\n\n' + s.translation).replace(/'/g, "\\'")}')">
                  📋 Copy Sloka
                </button>
                <button class="btn btn-sm btn-secondary" onclick="window.app.shareMantraWhatsApp('${escapeHTML(s.title).replace(/'/g, "\\'")}', '${escapeHTML(s.sanskrit).replace(/'/g, "\\'")}', '${escapeHTML(s.translation).replace(/'/g, "\\'")}')">
                  💬 Share WhatsApp
                </button>
                <button class="btn btn-sm btn-primary" onclick="window.app.openCheckout('Sri Brahma Samhita Seva', 501)">
                  🙏 Offer Seva
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Course CTA -->
        <div class="card" style="padding: 36px; border: 2px solid var(--gold-500); background: linear-gradient(135deg, #FFFDF9 0%, var(--saffron-50) 100%); text-align: center; border-radius: var(--radius-lg); max-width: 900px; margin: 0 auto;">
          <span style="font-size: 2.5rem; display: block; margin-bottom: 12px;">🎓</span>
          <h3 style="font-family: var(--font-serif); font-size: 1.8rem; color: var(--maroon-900); margin-bottom: 10px;">
            Want to Study Sri Brahma Samhita in Depth?
          </h3>
          <p style="color: var(--text-muted); max-width: 650px; margin: 0 auto 24px auto; line-height: 1.6;">
            Join our 6-week interactive course conducted by senior Vaishnavas at ISKCON Gandhidham Gurukul. Master Sanskrit meter, word-for-word translation, and esoteric Vaishnava Siddhanta.
          </p>
          <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
            <button onclick="window.app.openCheckout('Course Registration: Sri Brahma Samhita', 501)" class="btn btn-primary btn-lg">
              Enroll in Brahma Samhita Course
            </button>
            <a href="#/classes" class="btn btn-secondary btn-lg">View All Courses</a>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 3. SUDHAMA SEWAK PATRON VIEW
  // =========================================================================
  function renderSudhamaSewakView(params) {
    mainContentElem.innerHTML = `
      <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.70) 0%, rgba(15, 2, 5, 0.80) 100%), url('assets/images/gallery/temple_photo_01.jpg') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden; margin-bottom: 40px;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.60) 100%); pointer-events: none;"></div>
        <div class="main-container" style="position: relative; z-index: 2; text-align: center;">
          <span class="sacred-badge gold" style="margin-bottom: 8px;">🤝 SACRED MONTHLY PATRON MEMBERSHIP</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">Sudhama Sewak Membership</h1>
          <p style="color: var(--gold-300); font-size: 1.15rem; max-width: 760px; margin: 0 auto 16px auto; font-family: var(--font-serif); font-style: italic;">
            "Just as Lord Krishna lovingly accepted the humble chipped rice of Sudama Vipra, He accepts every offering given with pure love."
          </p>
          <p style="color: #F7FAFC; font-size: 0.95rem; max-width: 780px; margin: 0 auto 24px auto; line-height: 1.7;">
            Become an eternal pillar of ISKCON Gandhidham. Your continuous monthly seva ensures daily deity worship, Anna Daan prasadam distribution to thousands, and Vedic youth empowerment in Kutch.
          </p>
          <button onclick="window.app.openCheckout('Sudhama Sewak Monthly Patron', 1100)" class="btn btn-gold btn-lg">
            🤝 Enroll as Sudhama Sewak Today
          </button>
        </div>
      </div>

      <div class="main-container section-padding" style="padding-top: 0;">
        <!-- Story of Sudama -->
        <div class="card" style="padding: 32px; border: 1.5px solid var(--gold-400); background: #FFFDF9; border-radius: var(--radius-lg); margin-bottom: 48px; max-width: 900px; margin-left: auto; margin-right: auto;">
          <div style="display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap;">
            <div style="font-size: 3rem;">🍚</div>
            <div style="flex: 1; min-width: 260px;">
              <h3 style="font-family: var(--font-serif); color: var(--maroon-900); font-size: 1.4rem; margin-bottom: 8px;">
                The Spirit of Sudama Seva
              </h3>
              <p style="color: var(--text-main); font-size: 0.95rem; line-height: 1.7; margin: 0;">
                Sudama was Lord Sri Krishna's poor brahmana school friend who visited Dwaraka with nothing but a fistful of dry broken rice tied in an old cloth. Seeing his pure unalloyed love, the Supreme Lord of the universe embraced him, washed his lotus feet, ate his offering with supreme delight, and blessed him with unlimited opulence in this world and eternal shelter in Vaikuntha.
              </p>
            </div>
          </div>
        </div>

        <!-- Patron Tiers -->
        <h2 style="font-family: var(--font-serif); font-size: 2rem; color: var(--maroon-900); text-align: center; margin-bottom: 8px;">
          Choose Your Monthly Seva Pledge
        </h2>
        <p style="text-align: center; color: var(--text-muted); margin-bottom: 36px;">
          All contributions are eligible for 50% Tax Exemption under Section 80G of the Income Tax Act
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; margin-bottom: 50px;">
          <!-- Tier 1 -->
          <div class="card" style="padding: 28px; border: 1.5px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <span class="sacred-badge" style="background: #E2E8F0; color: #4A5568; margin-bottom: 12px;">🥈 SILVER SEWAK</span>
              <h3 style="font-family: var(--font-serif); font-size: 1.5rem; color: var(--maroon-900); margin-bottom: 6px;">₹501 <span style="font-size: 0.9rem; color: var(--text-muted); font-weight: normal;">/ month</span></h3>
              <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 18px;">Support daily Archana & Pushpa Seva for Sri Sri Radha Madanmohanji.</p>
              <ul style="list-style: none; padding: 0; margin-bottom: 24px; display: flex; flex-direction: column; gap: 8px; font-size: 0.88rem; color: var(--text-main);">
                <li>✓ Daily Archana in your family name</li>
                <li>✓ Monthly e-Darshan album & Newsletter</li>
                <li>✓ 80G Tax Exemption Certificate</li>
              </ul>
            </div>
            <button onclick="window.app.openCheckout('Silver Sudhama Sewak (₹501/mo)', 501)" class="btn btn-secondary" style="width: 100%;">Pledge ₹501 / mo</button>
          </div>

          <!-- Tier 2 (Highlighted) -->
          <div class="card" style="padding: 28px; border: 2.5px solid var(--gold-500); background: #FFFDF9; display: flex; flex-direction: column; justify-content: space-between; transform: translateY(-4px); box-shadow: 0 8px 30px rgba(184, 134, 11, 0.15);">
            <div>
              <span class="sacred-badge gold" style="margin-bottom: 12px;">🥇 GOLDEN SEWAK (POPULAR)</span>
              <h3 style="font-family: var(--font-serif); font-size: 1.5rem; color: var(--maroon-900); margin-bottom: 6px;">₹1,100 <span style="font-size: 0.9rem; color: var(--text-muted); font-weight: normal;">/ month</span></h3>
              <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 18px;">Sponsor Anna Daan prasadam for 25 pilgrims every single month.</p>
              <ul style="list-style: none; padding: 0; margin-bottom: 24px; display: flex; flex-direction: column; gap: 8px; font-size: 0.88rem; color: var(--text-main);">
                <li>✓ Special Puja on your Birthday / Anniversary</li>
                <li>✓ Temple Maha-Prasadam delivered to home</li>
                <li>✓ Preferred Darshan passes during Janmashtami</li>
                <li>✓ 80G Tax Exemption Certificate</li>
              </ul>
            </div>
            <button onclick="window.app.openCheckout('Golden Sudhama Sewak (₹1,100/mo)', 1100)" class="btn btn-primary" style="width: 100%;">Pledge ₹1,100 / mo</button>
          </div>

          <!-- Tier 3 -->
          <div class="card" style="padding: 28px; border: 1.5px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <span class="sacred-badge" style="background: #EBF8FF; color: #2B6CB0; margin-bottom: 12px;">💎 DIAMOND SEWAK</span>
              <h3 style="font-family: var(--font-serif); font-size: 1.5rem; color: var(--maroon-900); margin-bottom: 6px;">₹2,100 <span style="font-size: 0.9rem; color: var(--text-muted); font-weight: normal;">/ month</span></h3>
              <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 18px;">Support Goshala cow maintenance, green fodder, and medical care.</p>
              <ul style="list-style: none; padding: 0; margin-bottom: 24px; display: flex; flex-direction: column; gap: 8px; font-size: 0.88rem; color: var(--text-main);">
                <li>✓ Gau Seva & Anna Daan performed monthly</li>
                <li>✓ Free spiritual book set & Bhagavad Gita</li>
                <li>✓ VIP Abhishek participation on Janmashtami</li>
                <li>✓ 80G Tax Exemption Certificate</li>
              </ul>
            </div>
            <button onclick="window.app.openCheckout('Diamond Sudhama Sewak (₹2,100/mo)', 2100)" class="btn btn-secondary" style="width: 100%;">Pledge ₹2,100 / mo</button>
          </div>

          <!-- Tier 4 -->
          <div class="card" style="padding: 28px; border: 1.5px solid var(--gold-400); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <span class="sacred-badge gold" style="margin-bottom: 12px;">👑 PLATINUM PATRON</span>
              <h3 style="font-family: var(--font-serif); font-size: 1.5rem; color: var(--maroon-900); margin-bottom: 6px;">₹5,100 <span style="font-size: 0.9rem; color: var(--text-muted); font-weight: normal;">/ month</span></h3>
              <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 18px;">Deity Rajbhoga & Royal Poshaka Seva for Sri Sri Radha Madanmohanji.</p>
              <ul style="list-style: none; padding: 0; margin-bottom: 24px; display: flex; flex-direction: column; gap: 8px; font-size: 0.88rem; color: var(--text-main);">
                <li>✓ Full Deity Rajbhog offered in family name</li>
                <li>✓ Personalized Silver Coin with Deity Darshan</li>
                <li>✓ Lifetime invitation to all temple consecrations</li>
                <li>✓ 80G Tax Exemption Certificate</li>
              </ul>
            </div>
            <button onclick="window.app.openCheckout('Platinum Sudhama Sewak (₹5,100/mo)', 5100)" class="btn btn-gold" style="width: 100%;">Pledge ₹5,100 / mo</button>
          </div>
        </div>

        <!-- Contact Coordinator CTA -->
        <div style="text-align: center; padding: 24px; background: var(--saffron-50); border-radius: var(--radius-md); border: 1px solid var(--gold-300); max-width: 700px; margin: 0 auto;">
          <h4 style="font-family: var(--font-serif); color: var(--maroon-900); margin-bottom: 8px;">Prefer to set up automated Bank Standing Instructions?</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 16px;">Our Temple Seva Coordinator will assist you with direct HDFC Bank NACH / Auto-Debit mandate forms.</p>
          <button onclick="window.app.startWhatsAppChat('Hare Krishna! I would like to set up a monthly Sudhama Sewak standing donation for ISKCON Gandhidham.')" class="btn btn-secondary">
            💬 Talk to Seva Coordinator on WhatsApp
          </button>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 4. SEVA DETAIL VIEW
  // =========================================================================
  function renderSevaDetailView(sevaId) {
    const sevas = (window.templeStore && window.templeStore.getSevas()) || window.TEMPLE_DATA?.sevaCategories || [];
    const seva = sevas.find(s => s.id === sevaId) || sevas[0];
    if (!seva) {
      renderSevaView({});
      return;
    }

    mainContentElem.innerHTML = `
      <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.70) 0%, rgba(15, 2, 5, 0.80) 100%), url('${seva.image || 'assets/images/gallery/temple_photo_06.jpg'}') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden; margin-bottom: 40px;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.60) 100%); pointer-events: none;"></div>
        <div class="main-container" style="position: relative; z-index: 2; text-align: center;">
          <span class="sacred-badge gold" style="margin-bottom: 8px;">🙏 SACRED SEVA OPPORTUNITY</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">${escapeHTML(seva.title)}</h1>
          <p style="color: var(--gold-300); font-size: 1.15rem; max-width: 700px; margin: 0 auto;">
            ${escapeHTML(seva.tagline || seva.description || '')}
          </p>
        </div>
      </div>

      <div class="main-container section-padding" style="padding-top: 0; max-width: 900px;">
        <div class="card" style="padding: 36px; border: 1.5px solid var(--gold-300); background: #FFFDF9; border-radius: var(--radius-lg); margin-bottom: 36px;">
          <h2 style="font-family: var(--font-serif); color: var(--maroon-900); font-size: 1.8rem; margin-bottom: 12px;">About this Seva</h2>
          <p style="color: var(--text-main); font-size: 1.05rem; line-height: 1.7; margin-bottom: 28px;">
            ${escapeHTML(seva.description || '')}
          </p>

          <h3 style="font-family: var(--font-serif); color: var(--maroon-900); font-size: 1.3rem; margin-bottom: 16px;">Suggested Seva Offerings</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 32px;">
            ${(seva.presets || [
              { amount: 1100, label: '1 Day Seva', desc: 'Cover essential daily seva expenses' },
              { amount: 2501, label: 'Special Puja Seva', desc: 'Conducted in your family name' },
              { amount: 5001, label: 'Festival Maha Seva', desc: 'Grand Abhishek & Prasad sponsorship' }
            ]).map(p => `
              <div class="card" style="padding: 20px; border: 1.5px solid var(--gold-400); background: #FFF; border-radius: var(--radius-md); display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <h4 style="margin: 0 0 6px 0; font-family: var(--font-serif); color: var(--maroon-900); font-size: 1.2rem;">₹${Number(p.amount).toLocaleString('en-IN')}</h4>
                  <strong style="color: var(--saffron-800); font-size: 0.92rem;">${escapeHTML(p.label)}</strong>
                  <p style="color: var(--text-muted); font-size: 0.85rem; margin: 6px 0 16px 0;">${escapeHTML(p.desc || '')}</p>
                </div>
                <button onclick="window.app.openCheckout('${escapeHTML(seva.title)} — ${escapeHTML(p.label)}', ${p.amount})" class="btn btn-primary" style="width: 100%;">
                  Offer ₹${Number(p.amount).toLocaleString('en-IN')}
                </button>
              </div>
            `).join('')}
          </div>

          <div style="display: flex; gap: 14px; flex-wrap: wrap;">
            <button onclick="window.app.openDonationModal('${escapeHTML(seva.title)}', 2100)" class="btn btn-gold btn-lg">
              🙏 Offer Custom Amount
            </button>
            <a href="#/seva" class="btn btn-secondary btn-lg">← View All Sevas</a>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 5. MANTRA DETAIL VIEW
  // =========================================================================
  function renderMantraDetailView(mantraId) {
    const data = window.TEMPLE_DATA || {};
    const allMantras = [
      ...(data.mantrasAndShlokas?.prayers || []),
      ...(data.mantrasAndShlokas?.mantras || []),
      ...(data.brahmaSamhita?.slokas || [])
    ];
    const mantra = allMantras.find(m => m.id === mantraId || m.id === `bs-${mantraId}`) || allMantras[0];
    if (!mantra) {
      renderMantrasAndShlokasView({});
      return;
    }

    mainContentElem.innerHTML = `
      <div style="position: relative; background: linear-gradient(135deg, rgba(40, 4, 10, 0.70) 0%, rgba(15, 2, 5, 0.80) 100%), url('assets/images/gallery/temple_photo_05.jpg') center/cover no-repeat; color: #FFF; padding: 75px 0 65px 0; border-bottom: 2px solid var(--gold-500); overflow: hidden; margin-bottom: 40px;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 35%, rgba(10, 1, 3, 0.60) 100%); pointer-events: none;"></div>
        <div class="main-container" style="position: relative; z-index: 2; text-align: center;">
          <span class="sacred-badge gold" style="margin-bottom: 8px;">📿 SACRED VEDIC SHLOKA</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.8rem; margin: 12px 0; color: #FFFDF9;">${escapeHTML(mantra.title)}</h1>
          <p style="color: var(--gold-300); font-size: 1.15rem; max-width: 700px; margin: 0 auto;">
            ${escapeHTML(mantra.source || 'Ancient Vedic Scripture')}
          </p>
        </div>
      </div>

      <div class="main-container section-padding" style="padding-top: 0; max-width: 860px;">
        <div class="card" style="padding: 36px; border: 2px solid var(--gold-400); background: #FFFDF9; border-radius: var(--radius-lg); margin-bottom: 36px;">
          <!-- Sanskrit Text -->
          <div style="font-family: 'Tiro Devanagari Sanskrit', serif; font-size: 1.45rem; line-height: 2.1; color: var(--maroon-900); text-align: center; margin-bottom: 24px; white-space: pre-line; background: var(--saffron-50); padding: 24px; border-radius: var(--radius-md); border: 1px dashed var(--gold-400);">
            ${escapeHTML(mantra.sanskrit || mantra.verse || '')}
          </div>

          <!-- Transliteration -->
          <div style="font-style: italic; color: var(--saffron-900); font-weight: 600; text-align: center; margin-bottom: 24px; line-height: 1.8; font-size: 1.05rem;">
            ${escapeHTML(mantra.transliteration || '')}
          </div>

          <!-- Translation -->
          <div style="margin-bottom: 28px; line-height: 1.8; color: var(--text-main); font-size: 1.05rem; border-left: 4px solid var(--gold-500); padding-left: 18px;">
            <strong style="color: var(--maroon-900);">Translation:</strong><br>
            ${escapeHTML(mantra.translation || '')}
          </div>

          <!-- Purport -->
          ${mantra.purport ? `
            <div style="background: rgba(0,0,0,0.02); padding: 20px; border-radius: var(--radius-md); font-size: 0.95rem; line-height: 1.7; color: var(--text-muted); margin-bottom: 28px;">
              <strong style="color: var(--maroon-900);">Purport / Significance:</strong><br>
              ${escapeHTML(mantra.purport)}
            </div>
          ` : ''}

          <!-- Buttons -->
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="window.app.chantMantra('${escapeHTML(mantra.id)}')">
              📿 Listen / Chant Mantra
            </button>
            <button class="btn btn-secondary" onclick="window.app.copyShlokaById('${escapeHTML(mantra.id)}')">
              📋 Copy Shloka
            </button>
            <button class="btn btn-secondary" onclick="window.app.shareMantraById('${escapeHTML(mantra.id)}')">
              💬 Share WhatsApp
            </button>
            <a href="#/mantras" class="btn btn-outline-secondary">← All Mantras</a>
          </div>
        </div>
      </div>
    `;
  }

  // Auto-boot application on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();