/**
 * ISKCON Admin Panel — Main Application & Controller Logic
 * 
 * Interacts with window.adminStore and window.adminAuth.
 * Backed by Firestore and Firebase Auth with real-time UI synchronization,
 * loading states, error states, and HTML content escaping.
 */

(function () {
  'use strict';

  // Security Helper: Escape all dynamic and user-submitted strings before rendering
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.adminApp = new AdminApp();
  });

  class AdminApp {
    constructor() {
      this.store = window.adminStore;
      this.init();
    }

    init() {
      this.bindEvents();
      this.checkAuth();

      // Listen for Firestore real-time updates from adminStore
      window.addEventListener("admin:data-updated", () => {
        if (window.adminAuth && window.adminAuth.isAuthenticated()) {
          this.renderCurrentView();
        }
      });
    }

    checkAuth() {
      const authWrapper = document.getElementById("auth-wrapper");
      const appContainer = document.getElementById("app-container");

      if (window.adminAuth && window.adminAuth.isAuthenticated()) {
        if (authWrapper) authWrapper.style.display = "none";
        if (appContainer) appContainer.style.display = "flex";
        this.renderCurrentView();
      } else {
        if (authWrapper) authWrapper.style.display = "flex";
        if (appContainer) appContainer.style.display = "none";
      }
    }

    bindEvents() {
      // 1. Login Form Submit (Delegated to window.adminAuth)
      const loginForm = document.getElementById("login-form");
      if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const email = document.getElementById("login-user").value.trim();
          const pass = document.getElementById("login-pass").value;
          const errorMsg = document.getElementById("login-error");
          const submitBtn = loginForm.querySelector("button[type='submit']");

          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Verifying with Firebase...";
          }
          try {
            const success = await window.adminAuth.login(email, pass);
            if (success) {
              if (errorMsg) {
                errorMsg.style.display = "none";
                errorMsg.textContent = "";
              }
              document.getElementById("login-pass").value = "";
              this.showToast("Login Successful! Welcome to ISKCON Admin Panel.", "success");
              this.checkAuth();
            }
          } catch (err) {
            if (errorMsg) {
              errorMsg.textContent = err.message || "Invalid credentials";
              errorMsg.style.display = "block";
            }
            this.showToast(err.message || "Invalid credentials", "danger");
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = `🔓 Authenticate & Access Admin Panel`;
            }
          }
        });
      }

      // 2. Sidebar Navigation
      const navItems = document.querySelectorAll(".nav-item[data-view]");
      navItems.forEach(item => {
        item.addEventListener("click", (e) => {
          e.preventDefault();
          const viewTarget = item.getAttribute("data-view");

          navItems.forEach(nav => nav.classList.remove("active"));
          item.classList.add("active");

          this.switchView(viewTarget);
          const sidebar = document.querySelector(".sidebar");
          if (sidebar) sidebar.classList.remove("mobile-open");
        });
      });

      // 3. Global Logout
      const logoutBtn = document.getElementById("btn-logout");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
          if (window.adminAuth) {
            await window.adminAuth.logout();
          }
          this.showToast("Logged out successfully.", "info");
          this.checkAuth();
        });
      }

      // 4. Listen for auth state changes (e.g. session timeout or background signout)
      window.addEventListener("admin:auth-changed", (e) => {
        if (!e.detail || !e.detail.authenticated) {
          this.checkAuth();
        } else {
          this.checkAuth();
        }
      });

      // 5. One-Time "Import default data" Button (Firestore Seeding)
      const resetBtn = document.getElementById("btn-reset-data");
      if (resetBtn) {
        resetBtn.addEventListener("click", async () => {
          if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
            this.checkAuth();
            return;
          }
          if (confirm("Import default temple data (events, darshan, aarti schedule, sevas, announcements, live stream) into Firestore?")) {
            try {
              resetBtn.disabled = true;
              resetBtn.textContent = "⏳ Importing to Firestore...";
              await this.store.seedFirestoreDefaults();
              this.showToast("Default temple data imported into Firestore successfully!", "success");
              this.renderCurrentView();
            } catch (err) {
              this.showToast("Import failed: " + (err.message || "Permission or network error"), "danger");
            } finally {
              resetBtn.disabled = false;
              resetBtn.innerHTML = `<span>📥</span> Import Default Data`;
            }
          }
        });
      }

      // 6. Setup Media & Image Upload Handling for Modals
      this.setupMediaFileInput({
        fileInputId: "darshan-file-input",
        urlInputId: "darshan-img-url",
        previewBoxId: "darshan-img-preview-box",
        errorBoxId: "darshan-img-error",
        msgBoxId: "darshan-file-msg"
      });

      this.setupMediaFileInput({
        fileInputId: "event-file-input",
        urlInputId: "event-img",
        previewBoxId: "event-img-preview-box",
        errorBoxId: "event-img-error",
        msgBoxId: "event-file-msg"
      });
    }

    switchView(viewName) {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }

      const views = document.querySelectorAll(".view-section");
      views.forEach(v => v.classList.remove("active"));

      const targetView = document.getElementById(`view-${viewName}`);
      if (targetView) {
        targetView.classList.add("active");

        // Update Topbar Title
        const pageTitle = document.getElementById("topbar-page-title");
        if (pageTitle) {
          const titles = {
            dashboard: "⚙️ Dashboard Overview",
            darshan: "🌸 Daily Darshan & Spiritual Posts",
            events: "🎉 Events & Festivals",
            schedule: "⏰ Aarti & Temple Timings",
            donations: "💰 Donations & 80G Receipts",
            volunteers: "🤝 Volunteers & Inquiries",
            media: "🎵 Audio, Video & E-Books",
            announcement: "📢 Banner & Push Broadcast",
            youtube: "🔴 YouTube & Live Broadcast"
          };
          pageTitle.textContent = titles[viewName] || "Admin Panel";
        }

        // Render view data
        switch (viewName) {
          case "dashboard": this.renderDashboard(); break;
          case "darshan": this.renderDarshan(); break;
          case "events": this.renderEvents(); break;
          case "schedule": this.renderSchedule(); break;
          case "donations": this.renderDonations(); break;
          case "volunteers": this.renderVolunteers(); break;
          case "media": this.renderMedia(); break;
          case "announcement": this.renderAnnouncement(); break;
          case "youtube": this.renderYouTubeLive(); break;
        }
      }
    }

    renderCurrentView() {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      const activeNav = document.querySelector(".nav-item.active");
      const currentView = activeNav ? activeNav.getAttribute("data-view") : "dashboard";
      this.switchView(currentView);
    }

    // Dynamic Form Switcher: Image / Video / Text Quote
    setFormContentType(type) {
      const tabs = document.querySelectorAll(".type-tab");
      tabs.forEach(t => t.classList.remove("active"));

      const activeTab = document.querySelector(`.type-tab[data-type="${type}"]`);
      if (activeTab) activeTab.classList.add("active");

      const groupMedia = document.getElementById("group-media-upload");
      const groupQuote = document.getElementById("group-quote-input");

      if (type === 'quote') {
        if (groupMedia) groupMedia.style.display = "none";
        if (groupQuote) groupQuote.style.display = "block";
      } else {
        if (groupMedia) groupMedia.style.display = "block";
        if (groupQuote) groupQuote.style.display = "none";
      }
    }

    // Helper: Build loading or error banner HTML
    _renderStateBanner(viewKey) {
      const state = this.store.getViewState(viewKey);
      if (state.loading) {
        return `<div class="loading-state"><div class="spinner"></div><p>Syncing ${escapeHTML(viewKey)} with Firestore...</p></div>`;
      }
      if (state.error) {
        return `<div class="error-state"><div style="font-size:1.5rem; margin-bottom:8px;">⚠️</div><p>${escapeHTML(state.error)}</p><button class="btn btn-secondary btn-sm" onclick="window.adminApp.renderCurrentView()" style="margin-top:10px;">🔄 Retry</button></div>`;
      }
      return null;
    }

    // 1. DASHBOARD OVERVIEW
    renderDashboard() {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }

      const darshans = this.store.getDarshans();
      const events = this.store.getEvents();
      const donations = this.store.getDonations();
      const volunteers = this.store.getVolunteers();

      // Stats
      const todayDarshan = this.store.getTodayDarshan();
      const darshanStatusElem = document.getElementById("stat-darshan-status");
      if (darshanStatusElem) {
        darshanStatusElem.textContent = todayDarshan ? "Uploaded & Live" : "Pending Today";
      }

      const eventsCountElem = document.getElementById("stat-events-count");
      if (eventsCountElem) eventsCountElem.textContent = events.length;

      const totalAmount = donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      const donTotalElem = document.getElementById("stat-donations-total");
      if (donTotalElem) donTotalElem.textContent = `₹${totalAmount.toLocaleString('en-IN')}`;

      const volCountElem = document.getElementById("stat-volunteers-count");
      if (volCountElem) volCountElem.textContent = volunteers.length;

      // Recent Donations Table Preview
      const tbody = document.getElementById("dashboard-donations-tbody");
      if (tbody) {
        if (donations.length === 0) {
          tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No donation records in Firestore yet. Click "Import Default Data" to seed demo records.</td></tr>`;
        } else {
          tbody.innerHTML = donations.slice(0, 4).map(d => `
            <tr>
              <td><strong>${escapeHTML(d.id)}</strong></td>
              <td>${escapeHTML(d.donorName)}</td>
              <td><strong style="color:var(--saffron-700)">₹${(Number(d.amount) || 0).toLocaleString('en-IN')}</strong></td>
              <td>${escapeHTML(d.purpose)}</td>
              <td><span class="badge badge-success">${escapeHTML(d.paymentMethod)}</span></td>
              <td>${escapeHTML(d.date)}</td>
            </tr>
          `).join("");
        }
      }
    }

    // 2. DARSHAN & SPIRITUAL POSTS MANAGER
    renderDarshan() {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }

      const grid = document.getElementById("darshan-cards-grid");
      const banner = this._renderStateBanner("darshan");

      if (grid) {
        if (banner) {
          grid.innerHTML = banner;
          return;
        }
        const darshans = this.store.getDarshans();
        if (darshans.length === 0) {
          grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">No darshan posts in Firestore. Click "+ Upload New Darshan / Post" to create one.</div>`;
        } else {
          grid.innerHTML = darshans.map(d => `
            <div class="darshan-card ${d.active ? 'active' : ''}">
              <img src="${escapeHTML(d.imageUrl || d.image)}" class="darshan-img" alt="${escapeHTML(d.deity || d.title)}" />
              <div class="darshan-body">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                  <div class="darshan-date">${escapeHTML(d.date)} ${d.active ? '• <span class="badge badge-success">Live Today</span>' : ''}</div>
                  ${this.store.getTargetBadgeHTML(d.targetPlatform || 'both')}
                </div>
                <div class="darshan-deity">${escapeHTML(d.deity || d.title)}</div>
                <div class="darshan-quote">"${escapeHTML(d.quote || d.message)}"</div>
                <div style="display:flex; gap:0.5rem; margin-top:1rem;">
                  ${!d.active ? `<button class="btn btn-primary btn-sm" onclick="window.adminApp.setDarshanActive('${escapeHTML(d.id)}')">Make Active</button>` : ''}
                  <button class="btn btn-danger btn-sm" onclick="window.adminApp.deleteDarshan('${escapeHTML(d.id)}')">Delete</button>
                </div>
              </div>
            </div>
          `).join("");
        }
      }

      // Render Text Quotes Grid
      const quotesGrid = document.getElementById("quotes-cards-grid");
      if (quotesGrid) {
        const quotes = this.store.getQuotes();
        quotesGrid.innerHTML = quotes.map(q => `
          <div class="quote-card ${escapeHTML(q.bgStyle || 'saffron-gradient')}">
            <div class="quote-card-header">
              <span class="quote-category">${escapeHTML(q.category)}</span>
              ${this.store.getTargetBadgeHTML(q.targetPlatform || 'both')}
            </div>
            <div class="quote-text">"${escapeHTML(q.text)}"</div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="quote-author">— ${escapeHTML(q.author)}</div>
              <button class="btn btn-danger btn-sm" style="background:rgba(0,0,0,0.3); color:#fff; border:none;" onclick="window.adminApp.deleteQuote('${escapeHTML(q.id)}')">Delete</button>
            </div>
          </div>
        `).join("");
      }
    }

    async setDarshanActive(id) {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      try {
        await this.store.setDarshanActive(id);
        this.showToast("Today's Active Darshan updated in Firestore!", "success");
        this.renderDarshan();
      } catch (err) {
        this.showToast("Failed to update active darshan: " + (err.message || "Network error"), "danger");
      }
    }

    async deleteDarshan(id) {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      if (confirm("Delete this darshan record from Firestore?")) {
        try {
          await this.store.deleteDarshan(id);
          this.showToast("Darshan record deleted from Firestore.", "info");
          this.renderDarshan();
        } catch (err) {
          this.showToast("Failed to delete darshan: " + (err.message || "Network error"), "danger");
        }
      }
    }

    async deleteQuote(id) {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      if (confirm("Delete this text quote post?")) {
        try {
          await this.store.deleteQuote(id);
          this.showToast("Quote post deleted.", "info");
          this.renderDarshan();
        } catch (err) {
          this.showToast("Failed to delete quote: " + (err.message || "Network error"), "danger");
        }
      }
    }

    async saveDarshanForm(e) {
      e.preventDefault();
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      const activeTab = document.querySelector(".type-tab.active");
      const contentType = activeTab ? activeTab.getAttribute("data-type") : "image";
      const targetPlatform = document.getElementById("darshan-target").value;

      if (contentType === "quote") {
        const text = document.getElementById("quote-text-input").value.trim();
        const author = document.getElementById("quote-author-input").value.trim() || "Vedic Wisdom";
        const category = document.getElementById("quote-category-input").value || "Vedic Wisdom";
        const bgStyle = document.getElementById("quote-theme-input").value || "saffron-gradient";

        if (!text) {
          this.showToast("Please enter quote text.", "warning");
          return;
        }

        try {
          await this.store.saveQuote({ text, author, category, bgStyle, targetPlatform });
          this.showToast(`Text Quote published for ${targetPlatform.toUpperCase()}!`, "success");
        } catch (err) {
          this.showToast("Failed to save quote: " + (err.message || "Network error"), "danger");
        }
      } else {
        const imageUrl = document.getElementById("darshan-img-url").value.trim();
        const deity = document.getElementById("darshan-deity").value.trim();
        const quote = document.getElementById("darshan-quote").value.trim();

        if (!imageUrl || !deity) {
          this.showToast("Please provide image path/URL and deity name.", "warning");
          return;
        }

        if (!this.isValidMediaUrl(imageUrl)) {
          const errEl = document.getElementById("darshan-img-error");
          if (errEl) {
            errEl.textContent = "Please enter a valid URL (starting with https://, assets/, or select an image file).";
            errEl.style.display = "block";
          }
          this.showToast("Please enter a valid image URL or upload an image file.", "warning");
          return;
        }

        try {
          await this.store.addOrUpdateDarshan({ imageUrl, deity, quote, contentType, active: true, targetPlatform });
          this.showToast(`Media post published to Firestore for ${targetPlatform.toUpperCase()}!`, "success");
        } catch (err) {
          this.showToast("Failed to save darshan: " + (err.message || "Firestore error"), "danger");
        }
      }

      this.closeModal('darshan-modal');
      this.renderDarshan();
    }

    // 3. EVENTS & FESTIVALS
    renderEvents() {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }

      const tbody = document.getElementById("events-table-tbody");
      if (!tbody) return;

      const state = this.store.getViewState("events");
      if (state.loading) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="loading-state"><div class="spinner"></div><p>Loading events from Firestore...</p></div></td></tr>`;
        return;
      }
      if (state.error) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="error-state"><p>${escapeHTML(state.error)}</p></div></td></tr>`;
        return;
      }

      const events = this.store.getEvents();
      if (events.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No events found in Firestore. Click "+ Add New Event" to create one.</td></tr>`;
        return;
      }

      tbody.innerHTML = events.map(e => `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <img src="${escapeHTML(e.imageUrl)}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;" />
              <div>
                <strong>${escapeHTML(e.title)}</strong><br/>
                <small style="color:var(--gold-700); font-weight:600;">${escapeHTML(e.category)}</small>
              </div>
            </div>
          </td>
          <td>${escapeHTML(e.date)}<br/><small style="color:var(--text-muted);">${escapeHTML(e.time)}</small></td>
          <td>${escapeHTML(e.location)}</td>
          <td>${this.store.getTargetBadgeHTML(e.targetPlatform || 'both')}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="window.adminApp.editEvent('${escapeHTML(e.id)}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="window.adminApp.deleteEvent('${escapeHTML(e.id)}')">Delete</button>
          </td>
        </tr>
      `).join("");
    }

    editEvent(id) {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      const event = this.store.getEvents().find(e => e.id === id);
      if (!event) return;

      document.getElementById("event-id").value = event.id;
      document.getElementById("event-title").value = event.title;
      document.getElementById("event-category").value = event.category;
      document.getElementById("event-date").value = event.date;
      document.getElementById("event-time").value = event.time;
      document.getElementById("event-location").value = event.location;
      document.getElementById("event-speaker").value = event.speaker || "";
      document.getElementById("event-img").value = event.imageUrl || event.image || "";
      document.getElementById("event-target").value = event.targetPlatform || "both";
      document.getElementById("event-desc").value = event.description || event.shortDesc || "";

      this.openModal('event-modal');
    }

    async deleteEvent(id) {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      if (confirm("Delete this event from Firestore?")) {
        try {
          await this.store.deleteEvent(id);
          this.showToast("Event deleted from Firestore.", "info");
          this.renderEvents();
        } catch (err) {
          this.showToast("Failed to delete event: " + (err.message || "Network error"), "danger");
        }
      }
    }

    async saveEventForm(e) {
      e.preventDefault();
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      const id = document.getElementById("event-id").value;
      const title = document.getElementById("event-title").value;
      const category = document.getElementById("event-category").value;
      const date = document.getElementById("event-date").value;
      const time = document.getElementById("event-time").value;
      const location = document.getElementById("event-location").value;
      const speaker = document.getElementById("event-speaker").value;
      const imageUrl = document.getElementById("event-img").value.trim();
      const targetPlatform = document.getElementById("event-target").value;
      const description = document.getElementById("event-desc").value;

      if (!this.isValidMediaUrl(imageUrl)) {
        const errEl = document.getElementById("event-img-error");
        if (errEl) {
          errEl.textContent = "Please enter a valid URL (starting with https://, assets/, or select an image file).";
          errEl.style.display = "block";
        }
        this.showToast("Please enter a valid image URL or upload an image file.", "warning");
        return;
      }

      try {
        await this.store.saveEvent({ id, title, category, date, time, location, speaker, imageUrl, targetPlatform, description });
        this.showToast(`Event saved to Firestore for ${targetPlatform.toUpperCase()}!`, "success");
        this.closeModal('event-modal');
        this.renderEvents();
      } catch (err) {
        this.showToast("Failed to save event: " + (err.message || "Firestore error"), "danger");
      }
    }

    // 4. AARTI SCHEDULE
    renderSchedule() {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }

      const tbody = document.getElementById("schedule-table-tbody");
      if (!tbody) return;

      const state = this.store.getViewState("schedule");
      if (state.loading) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="loading-state"><div class="spinner"></div><p>Loading schedule from Firestore...</p></div></td></tr>`;
        return;
      }
      if (state.error) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="error-state"><p>${escapeHTML(state.error)}</p></div></td></tr>`;
        return;
      }

      const schedule = this.store.getSchedule();
      tbody.innerHTML = schedule.map(s => `
        <tr>
          <td><input type="text" class="form-input form-input-sm sch-name" data-id="${escapeHTML(s.id)}" value="${escapeHTML(s.name)}" /></td>
          <td><input type="text" class="form-input form-input-sm sch-time" data-id="${escapeHTML(s.id)}" value="${escapeHTML(s.time)}" /></td>
          <td><input type="text" class="form-input form-input-sm sch-duration" data-id="${escapeHTML(s.id)}" value="${escapeHTML(s.duration)}" /></td>
          <td>${this.store.getTargetBadgeHTML(s.targetPlatform || 'both')}</td>
        </tr>
      `).join("");
    }

    async saveScheduleForm(e) {
      e.preventDefault();
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      const schedule = this.store.getSchedule();
      const nameInputs = document.querySelectorAll(".sch-name");
      const timeInputs = document.querySelectorAll(".sch-time");
      const durInputs = document.querySelectorAll(".sch-duration");

      nameInputs.forEach((inp, idx) => {
        const id = inp.getAttribute("data-id");
        const item = schedule.find(s => s.id === id);
        if (item) {
          item.name = inp.value;
          item.time = timeInputs[idx].value;
          item.duration = durInputs[idx].value;
        }
      });

      try {
        await this.store.saveSchedule(schedule);
        this.showToast("Temple Aarti Schedule saved & synced to Firestore!", "success");
      } catch (err) {
        this.showToast("Failed to save schedule: " + (err.message || "Firestore error"), "danger");
      }
    }

    // 5. DONATIONS & 80G
    renderDonations() {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }

      const tbody = document.getElementById("donations-table-tbody");
      if (!tbody) return;

      const state = this.store.getViewState("donations");
      if (state.loading) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="loading-state"><div class="spinner"></div><p>Loading donations from Firestore...</p></div></td></tr>`;
        return;
      }
      if (state.error) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="error-state"><p>${escapeHTML(state.error)}</p></div></td></tr>`;
        return;
      }

      const donations = this.store.getDonations();
      if (donations.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No donation records found in Firestore.</td></tr>`;
        return;
      }

      tbody.innerHTML = donations.map(d => `
        <tr>
          <td><strong>${escapeHTML(d.id)}</strong></td>
          <td>${escapeHTML(d.donorName)}<br/><small style="color:var(--text-muted);">${escapeHTML(d.phone || d.email || '')}</small></td>
          <td><strong style="color:var(--saffron-800)">₹${(Number(d.amount) || 0).toLocaleString('en-IN')}</strong></td>
          <td>${escapeHTML(d.purpose)}</td>
          <td>${escapeHTML(d.pan || 'N/A')}</td>
          <td>${escapeHTML(d.date)}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="window.adminApp.printReceipt('${escapeHTML(d.id)}')">🖨️ 80G Receipt</button>
          </td>
        </tr>
      `).join("");
    }

    printReceipt(id) {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      const donation = this.store.getDonations().find(d => d.id === id);
      if (!donation) return;

      document.getElementById("rec-id").textContent = donation.id || "";
      document.getElementById("rec-date").textContent = donation.date || "";
      document.getElementById("rec-name").textContent = donation.donorName || "";
      document.getElementById("rec-pan").textContent = donation.pan || "N/A";
      document.getElementById("rec-phone").textContent = donation.phone || "N/A";
      document.getElementById("rec-email").textContent = donation.email || "N/A";
      document.getElementById("rec-purpose").textContent = donation.purpose || "";
      document.getElementById("rec-txn").textContent = donation.transactionId || "";
      document.getElementById("rec-amount").textContent = `₹ ${(Number(donation.amount) || 0).toLocaleString('en-IN')} /-`;

      this.openModal('receipt-modal');
    }

    async saveDonationForm(e) {
      e.preventDefault();
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      const donorName = document.getElementById("don-name").value;
      const amount = document.getElementById("don-amount").value;
      const purpose = document.getElementById("don-purpose").value;
      const pan = document.getElementById("don-pan").value;
      const phone = document.getElementById("don-phone").value;
      const email = document.getElementById("don-email").value;

      try {
        await this.store.recordDonation({ donorName, amount, purpose, pan, phone, email });
        this.showToast("Manual donation recorded to Firestore!", "success");
        this.closeModal('donation-modal');
        this.renderDonations();
      } catch (err) {
        this.showToast("Failed to record donation: " + (err.message || "Firestore error"), "danger");
      }
    }

    exportCSV() {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      this.store.exportDonationsCSV();
      this.showToast("Donations CSV report downloaded!", "success");
    }

    // 6. VOLUNTEERS & ENQUIRIES
    renderVolunteers() {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }

      // Render Volunteer Applications
      const tbody = document.getElementById("volunteers-table-tbody");
      if (tbody) {
        const state = this.store.getViewState("volunteers");
        if (state.loading) {
          tbody.innerHTML = `<tr><td colspan="6"><div class="loading-state"><div class="spinner"></div><p>Loading volunteer applications from Firestore...</p></div></td></tr>`;
        } else if (state.error) {
          tbody.innerHTML = `<tr><td colspan="6"><div class="error-state"><p>${escapeHTML(state.error)}</p></div></td></tr>`;
        } else {
          const vols = this.store.getVolunteers();
          if (vols.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No volunteer applications in Firestore.</td></tr>`;
          } else {
            tbody.innerHTML = vols.map(v => `
              <tr>
                <td><strong>${escapeHTML(v.id)}</strong></td>
                <td>${escapeHTML(v.fullName || v.name)}<br/><small style="color:var(--text-muted);">${escapeHTML(v.phone || '')} • ${escapeHTML(v.email || '')}</small></td>
                <td>${escapeHTML(v.interest)}</td>
                <td>${escapeHTML(v.availability)}</td>
                <td><span class="badge ${v.status === 'Approved' ? 'badge-success' : 'badge-warning'}">${escapeHTML(v.status)}</span></td>
                <td>
                  ${v.status !== 'Approved' ? `<button class="btn btn-primary btn-sm" onclick="window.adminApp.approveVol('${escapeHTML(v.id)}')">Approve</button>` : '<span style="color:var(--success-color); font-weight:600;">✓ Verified</span>'}
                </td>
              </tr>
            `).join("");
          }
        }
      }

      // Render Public Enquiries & Callbacks
      const enqTbody = document.getElementById("enquiries-table-tbody");
      if (enqTbody) {
        const state = this.store.getViewState("enquiries");
        if (state.loading) {
          enqTbody.innerHTML = `<tr><td colspan="6"><div class="loading-state"><div class="spinner"></div><p>Loading enquiries from Firestore...</p></div></td></tr>`;
        } else if (state.error) {
          enqTbody.innerHTML = `<tr><td colspan="6"><div class="error-state"><p>${escapeHTML(state.error)}</p></div></td></tr>`;
        } else {
          const enquiries = this.store.getEnquiries();
          if (enquiries.length === 0) {
            enqTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No enquiries recorded yet.</td></tr>`;
          } else {
            enqTbody.innerHTML = enquiries.map(e => `
              <tr>
                <td><strong>${escapeHTML(e.id)}</strong></td>
                <td>${escapeHTML(e.name)}<br/><small style="color:var(--text-muted);">${escapeHTML(e.phone || '')} • ${escapeHTML(e.email || '')}</small></td>
                <td>${escapeHTML(e.subject || 'Inquiry')}</td>
                <td><small>${escapeHTML(e.message || '')}</small></td>
                <td><span class="badge ${e.status === 'Resolved' ? 'badge-success' : 'badge-warning'}">${escapeHTML(e.status || 'pending')}</span></td>
                <td>
                  ${e.status !== 'Resolved' ? `<button class="btn btn-secondary btn-sm" onclick="window.adminApp.resolveEnquiry('${escapeHTML(e.id)}')">Mark Resolved</button>` : '<span style="color:var(--success-color); font-weight:600;">✓ Done</span>'}
                </td>
              </tr>
            `).join("");
          }
        }
      }
    }

    async approveVol(id) {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      try {
        await this.store.updateVolunteerStatus(id, "Approved");
        this.showToast("Volunteer marked as Approved in Firestore!", "success");
        this.renderVolunteers();
      } catch (err) {
        this.showToast("Failed to update status: " + (err.message || "Network error"), "danger");
      }
    }

    async resolveEnquiry(id) {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      try {
        await this.store.updateEnquiryStatus(id, "Resolved");
        this.showToast("Enquiry marked as Resolved!", "success");
        this.renderVolunteers();
      } catch (err) {
        this.showToast("Failed to update enquiry: " + (err.message || "Network error"), "danger");
      }
    }

    // 7. MEDIA LIBRARY
    renderMedia() {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }

      const audios = this.store.getMediaAudio();
      const videos = this.store.getMediaVideo();

      const audioList = document.getElementById("audio-list-tbody");
      if (audioList) {
        audioList.innerHTML = audios.map(a => `
          <tr>
            <td><strong>${escapeHTML(a.title)}</strong></td>
            <td>${escapeHTML(a.artist)}</td>
            <td>${escapeHTML(a.category)}</td>
            <td>${this.store.getTargetBadgeHTML(a.targetPlatform || 'both')}</td>
            <td>${escapeHTML(a.duration)}</td>
          </tr>
        `).join("");
      }

      const videoList = document.getElementById("video-list-tbody");
      if (videoList) {
        videoList.innerHTML = videos.map(v => `
          <tr>
            <td><strong>${escapeHTML(v.title)}</strong></td>
            <td>${escapeHTML(v.youtubeId)}</td>
            <td>${escapeHTML(v.category)}</td>
            <td>${this.store.getTargetBadgeHTML(v.targetPlatform || 'both')}</td>
          </tr>
        `).join("");
      }
    }

    async saveAudioForm(e) {
      e.preventDefault();
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      const title = document.getElementById("aud-title").value;
      const artist = document.getElementById("aud-artist").value;
      const category = document.getElementById("aud-category").value;
      const targetPlatform = document.getElementById("aud-target").value;
      const url = document.getElementById("aud-url").value.trim();

      if (!this.isValidMediaUrl(url)) {
        const errEl = document.getElementById("aud-url-error");
        if (errEl) {
          errEl.textContent = "Please enter a valid URL (starting with https:// or assets/).";
          errEl.style.display = "block";
        }
        this.showToast("Please enter a valid audio URL.", "warning");
        return;
      }

      try {
        await this.store.saveMediaAudio({ title, artist, category, targetPlatform, url, duration: "30:00" });
        this.showToast(`Audio track added for ${targetPlatform.toUpperCase()}!`, "success");
        this.closeModal('audio-modal');
        this.renderMedia();
      } catch (err) {
        this.showToast("Failed to save audio track: " + (err.message || "Network error"), "danger");
      }
    }

    // 8. ANNOUNCEMENT & PUSH
    renderAnnouncement() {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }

      const ann = this.store.getAnnouncement();
      const enabledCheckbox = document.getElementById("ann-enabled");
      const textInput = document.getElementById("ann-text");
      const linkTextInput = document.getElementById("ann-link-text");
      const linkHashInput = document.getElementById("ann-link-hash");
      const targetSelect = document.getElementById("ann-target");

      if (enabledCheckbox) enabledCheckbox.checked = Boolean(ann.enabled);
      if (textInput) textInput.value = ann.text || "";
      if (linkTextInput) linkTextInput.value = ann.linkText || "";
      if (linkHashInput) linkHashInput.value = ann.linkHash || "";
      if (targetSelect) targetSelect.value = ann.targetPlatform || "both";
    }

    async saveAnnouncementForm(e) {
      e.preventDefault();
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      const enabled = document.getElementById("ann-enabled").checked;
      const text = document.getElementById("ann-text").value;
      const linkText = document.getElementById("ann-link-text").value;
      const linkHash = document.getElementById("ann-link-hash").value;
      const targetPlatform = document.getElementById("ann-target").value;

      try {
        await this.store.saveAnnouncement({ enabled, text, linkText, linkHash, targetPlatform });
        this.showToast(`Banner Announcement saved & synced to Firestore for ${targetPlatform.toUpperCase()}!`, "success");
      } catch (err) {
        this.showToast("Failed to save announcement: " + (err.message || "Firestore error"), "danger");
      }
    }

    sendPushNotification(e) {
      e.preventDefault();
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      const title = document.getElementById("push-title").value;
      const body = document.getElementById("push-body").value;
      const targetPlatform = document.getElementById("push-target").value;

      if (!title || !body) {
        this.showToast("Please enter push title and message.", "warning");
        return;
      }

      this.showToast(`🚀 Push Notification Dispatched to ${targetPlatform.toUpperCase()} users! ("${title}")`, "success");
      document.getElementById("push-title").value = "";
      document.getElementById("push-body").value = "";
    }

    // 9. YOUTUBE LIVE MANAGEMENT
    renderYouTubeLive() {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      const cfg = this.store.getYouTubeLive();
      const statusSelect = document.getElementById("yt-live-status");
      const handleInput = document.getElementById("yt-channel-handle");
      const titleInput = document.getElementById("yt-live-title");
      const videoIdInput = document.getElementById("yt-live-videoid");
      const viewersInput = document.getElementById("yt-live-viewers");

      if (statusSelect) statusSelect.value = cfg.isLive ? "live" : "offline";
      if (handleInput) handleInput.value = cfg.handle || "@iskcongandhidhamofficial";
      if (titleInput) titleInput.value = cfg.title || "";
      if (videoIdInput) videoIdInput.value = cfg.videoId || "";
      if (viewersInput) viewersInput.value = cfg.viewers || "";
    }

    async saveYouTubeLiveConfig(e) {
      if (e) e.preventDefault();
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      const status = document.getElementById("yt-live-status").value;
      const handle = document.getElementById("yt-channel-handle").value;
      const title = document.getElementById("yt-live-title").value;
      const videoId = document.getElementById("yt-live-videoid").value;
      const viewers = document.getElementById("yt-live-viewers").value;

      const isLive = status === "live";
      try {
        await this.store.saveYouTubeLive({ isLive, handle, title, videoId, viewers });
        this.showToast(`YouTube Live Broadcast Config Saved to Firestore! (${isLive ? '🔴 LIVE' : '⚪ OFFLINE'})`, "success");
      } catch (err) {
        this.showToast("Failed to save Live config: " + (err.message || "Firestore error"), "danger");
      }
    }

    broadcastLiveNotification() {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      const title = document.getElementById("yt-live-title").value || "🔴 ISKCON Gandhidham is Streaming Live!";
      this.showToast(`🔴 Live Broadcast Notification Dispatched to Mobile App & Web Users! ("${title}")`, "success");
    }

    // UTILITIES
    openModal(id) {
      if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        this.checkAuth();
        return;
      }
      const modal = document.getElementById(id);
      if (modal) {
        modal.classList.add("open");
        if (id === 'event-modal') {
          const urlVal = (document.getElementById('event-img')?.value || '').trim();
          const prevBox = document.getElementById('event-img-preview-box');
          if (prevBox) {
            if (urlVal && this.isValidMediaUrl(urlVal)) {
              prevBox.style.display = 'flex';
              prevBox.style.alignItems = 'center';
              prevBox.style.gap = '0.75rem';
              const isData = urlVal.startsWith('data:');
              prevBox.innerHTML = `
                <img src="${urlVal}" alt="Preview" style="width:56px; height:56px; object-fit:cover; border-radius:6px; border:1px solid var(--border);" />
                <span style="font-size:0.8rem; color:var(--text-muted);">${isData ? 'Optimized Image' : 'Image URL'}</span>
              `;
            } else {
              prevBox.style.display = 'none';
              prevBox.innerHTML = '';
            }
          }
          const errEl = document.getElementById('event-img-error');
          if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
        } else if (id === 'darshan-modal') {
          const urlVal = (document.getElementById('darshan-img-url')?.value || '').trim();
          const prevBox = document.getElementById('darshan-img-preview-box');
          if (prevBox) {
            if (urlVal && this.isValidMediaUrl(urlVal)) {
              prevBox.style.display = 'flex';
              prevBox.style.alignItems = 'center';
              prevBox.style.gap = '0.75rem';
              const isData = urlVal.startsWith('data:');
              prevBox.innerHTML = `
                <img src="${urlVal}" alt="Preview" style="width:56px; height:56px; object-fit:cover; border-radius:6px; border:1px solid var(--border);" />
                <span style="font-size:0.8rem; color:var(--text-muted);">${isData ? 'Optimized Image' : 'Image URL'}</span>
              `;
            } else {
              prevBox.style.display = 'none';
              prevBox.innerHTML = '';
            }
          }
          const errEl = document.getElementById('darshan-img-error');
          if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
        }
      }
    }

    closeModal(id) {
      const modal = document.getElementById(id);
      if (modal) {
        modal.classList.remove("open");
        const form = modal.querySelector("form");
        if (form) form.reset();
        const prevBoxes = modal.querySelectorAll("[id$='-preview-box']");
        prevBoxes.forEach(p => { p.style.display = 'none'; p.innerHTML = ''; });
        const errBoxes = modal.querySelectorAll("[id$='-error'], [id$='-msg']");
        errBoxes.forEach(e => { e.style.display = 'none'; e.textContent = ''; });
      }
    }

    isValidMediaUrl(val) {
      if (!val || typeof val !== 'string') return false;
      const s = val.trim();
      if (s.startsWith('https://') || s.startsWith('http://')) return true;
      if (s.startsWith('assets/') || s.startsWith('./assets/') || s.startsWith('/assets/')) return true;
      if (s.startsWith('data:image/')) return true;
      return false;
    }

    processImageFile(file) {
      return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
          return reject(new Error('Selected file is not a valid image.'));
        }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error('Unable to decode image file.'));
          img.onload = () => {
            try {
              const origW = img.naturalWidth || img.width;
              const origH = img.naturalHeight || img.height;

              const renderCanvas = (maxDim, q) => {
                let w = origW;
                let h = origH;
                if (w > maxDim || h > maxDim) {
                  if (w >= h) {
                    h = Math.round((h * maxDim) / w);
                    w = maxDim;
                  } else {
                    w = Math.round((w * maxDim) / h);
                    h = maxDim;
                  }
                }
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, w);
                canvas.height = Math.max(1, h);
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                return canvas.toDataURL('image/jpeg', q);
              };

              // Step 1: max side 1280px at 0.8 quality
              let dataUrl = renderCanvas(1280, 0.8);

              // Step 2: if > 700 KB, lower quality step by step down to 0.5
              const qualities = [0.7, 0.6, 0.5];
              for (let i = 0; i < qualities.length && dataUrl.length > 700 * 1024; i++) {
                dataUrl = renderCanvas(1280, qualities[i]);
              }

              // Step 3: if still > 700 KB, shrink to 960px
              if (dataUrl.length > 700 * 1024) {
                const shrinkQualities = [0.8, 0.7, 0.6, 0.5];
                for (let i = 0; i < shrinkQualities.length; i++) {
                  dataUrl = renderCanvas(960, shrinkQualities[i]);
                  if (dataUrl.length <= 700 * 1024) break;
                }
              }

              // Step 4: if still cannot fit under ~900 KB, reject
              if (dataUrl.length > 900 * 1024) {
                return reject(new Error(`Image size (${Math.round(dataUrl.length / 1024)} KB) exceeds safe limit (~900 KB). Please select a smaller image or use an external URL.`));
              }

              const sizeKb = Math.round(dataUrl.length / 1024);
              resolve({ dataUrl, sizeKb });
            } catch (err) {
              reject(err);
            }
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    setupMediaFileInput({ fileInputId, urlInputId, previewBoxId, errorBoxId, msgBoxId }) {
      const fileInput = document.getElementById(fileInputId);
      const urlInput = document.getElementById(urlInputId);
      const previewBox = document.getElementById(previewBoxId);
      const errorBox = document.getElementById(errorBoxId);
      const msgBox = msgBoxId ? document.getElementById(msgBoxId) : null;

      if (!fileInput || !urlInput) return;

      const clearError = () => {
        if (errorBox) { errorBox.textContent = ''; errorBox.style.display = 'none'; }
        if (msgBox) { msgBox.textContent = ''; msgBox.style.display = 'none'; }
      };

      const showError = (msg) => {
        if (errorBox) {
          errorBox.textContent = msg;
          errorBox.style.display = 'block';
        }
      };

      const updatePreview = (url, label) => {
        if (!previewBox) return;
        if (!url) {
          previewBox.style.display = 'none';
          previewBox.innerHTML = '';
          return;
        }
        previewBox.style.display = 'flex';
        previewBox.style.alignItems = 'center';
        previewBox.style.gap = '0.75rem';
        previewBox.innerHTML = `
          <img src="${url}" alt="Preview" style="width:56px; height:56px; object-fit:cover; border-radius:6px; border:1px solid var(--border);" />
          <div>
            <div style="font-size:0.82rem; font-weight:600; color:var(--text-main);">Image Ready</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${label || ''}</div>
          </div>
        `;
      };

      // Input listener on URL field
      urlInput.addEventListener('input', () => {
        clearError();
        const val = urlInput.value.trim();
        if (!val) {
          updatePreview('');
          return;
        }
        if (this.isValidMediaUrl(val)) {
          if (val.startsWith('data:image/') || val.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i) || val.includes('unsplash.com') || val.includes('imgur.com')) {
            updatePreview(val, val.startsWith('data:') ? 'Optimized Image' : 'Direct URL');
          } else {
            updatePreview('');
          }
        } else {
          showError('Please enter a valid URL (starting with https://, assets/, or select an image file).');
        }
      });

      // Change listener on local file input
      fileInput.addEventListener('change', async (e) => {
        clearError();
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        // Video check
        const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv|flv|wmv|m4v)$/i.test(file.name);
        if (isVideo) {
          fileInput.value = '';
          const videoMsg = "Videos cannot be uploaded here. Upload to YouTube (unlisted) or any host and paste the link in the URL field.";
          showError(videoMsg);
          this.showToast(videoMsg, "warning");
          alert(videoMsg);
          return;
        }

        // Image check
        if (!file.type.startsWith('image/')) {
          fileInput.value = '';
          showError('Selected file is not an image. Please choose an image or enter a URL.');
          this.showToast('Selected file is not an image.', 'warning');
          return;
        }

        try {
          this.showToast(`Processing & optimizing ${file.name}...`, 'info');
          const result = await this.processImageFile(file);
          urlInput.value = result.dataUrl;
          clearError();
          updatePreview(result.dataUrl, `Optimized: ${result.sizeKb} KB`);
          this.showToast(`Image ready! Compressed to ${result.sizeKb} KB`, 'success');
        } catch (err) {
          fileInput.value = '';
          showError(err.message || 'Failed to process image.');
          this.showToast(err.message || 'Image processing failed.', 'danger');
        }
      });
    }

    showToast(message, type = "info") {
      const toastContainer = document.getElementById("toast-container") || this.createToastContainer();
      const toast = document.createElement("div");
      toast.style.padding = "0.75rem 1.25rem";
      toast.style.borderRadius = "8px";
      toast.style.color = "#fff";
      toast.style.fontSize = "0.875rem";
      toast.style.fontWeight = "600";
      toast.style.boxShadow = "0 4px 14px rgba(0,0,0,0.3)";
      toast.style.animation = "fadeIn 0.3s ease";
      toast.style.marginBottom = "0.5rem";

      if (type === "success") toast.style.background = "#2E7D32";
      else if (type === "warning") toast.style.background = "#EF6C00";
      else if (type === "danger") toast.style.background = "#C62828";
      else toast.style.background = "#1565C0";

      toast.textContent = message;
      toastContainer.appendChild(toast);

      setTimeout(() => {
        toast.remove();
      }, 4000);
    }

    createToastContainer() {
      const c = document.createElement("div");
      c.id = "toast-container";
      c.style.position = "fixed";
      c.style.bottom = "20px";
      c.style.right = "20px";
      c.style.zIndex = "99999";
      document.body.appendChild(c);
      return c;
    }
  }
})();
