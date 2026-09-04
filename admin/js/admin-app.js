/**
 * ISKCON Admin Panel - Main Application & Controller Logic
 * Support targeted destination uploading & Multi-Format Content (Image, Video, Text Quotes).
 */

(function () {
  document.addEventListener("DOMContentLoaded", () => {
    window.adminApp = new AdminApp();
  });

  class AdminApp {
    constructor() {
      this.store = window.adminStore;
      this.init();
    }

    init() {
      this.checkAuth();
      this.bindEvents();
      this.renderCurrentView();
    }

    checkAuth() {
      const authWrapper = document.getElementById("auth-wrapper");
      const appContainer = document.getElementById("app-container");
      
      if (this.store.isAuthenticated()) {
        if (authWrapper) authWrapper.style.display = "none";
        if (appContainer) appContainer.style.display = "flex";
        this.renderDashboard();
      } else {
        if (authWrapper) authWrapper.style.display = "flex";
        if (appContainer) appContainer.style.display = "none";
      }
    }

    bindEvents() {
      // Login Form Submit
      const loginForm = document.getElementById("login-form");
      if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
          e.preventDefault();
          const user = document.getElementById("login-user").value.trim();
          const pass = document.getElementById("login-pass").value.trim();
          const errorMsg = document.getElementById("login-error");

          if (this.store.login(user, pass)) {
            if (errorMsg) errorMsg.style.display = "none";
            this.showToast("Login Successful Prabhu! Welcome to ISKCON Admin Panel.", "success");
            this.checkAuth();
          } else {
            if (errorMsg) {
              errorMsg.textContent = "Login failed Prabhu! Please enter correct Admin ID and Password.";
              errorMsg.style.display = "block";
            }
            this.showToast("Login failed Prabhu!", "error");
          }
        });
      }

      // Sidebar Navigation
      const navItems = document.querySelectorAll(".nav-item[data-view]");
      navItems.forEach(item => {
        item.addEventListener("click", (e) => {
          e.preventDefault();
          const viewTarget = item.getAttribute("data-view");
          
          navItems.forEach(nav => nav.classList.remove("active"));
          item.classList.add("active");

          this.switchView(viewTarget);
        });
      });

      // Global Logout
      const logoutBtn = document.getElementById("btn-logout");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
          this.store.logout();
          this.showToast("Logged out successfully.", "info");
          this.checkAuth();
        });
      }

      // Reset Defaults
      const resetBtn = document.getElementById("btn-reset-data");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          if (confirm("Are you sure you want to reset all demo data back to seeds?")) {
            this.store.resetDefaults();
            this.showToast("Seed data reset successfully!", "success");
            this.renderCurrentView();
          }
        });
      }

      // File Input Change Handlers (Image & Video)
      const fileImgInp = document.getElementById("darshan-file-input");
      if (fileImgInp) {
        fileImgInp.addEventListener("change", (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              document.getElementById("darshan-img-url").value = evt.target.result;
              this.showToast(`Selected file: ${file.name}`, "info");
            };
            reader.readAsDataURL(file);
          }
        });
      }
    }

    switchView(viewName) {
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
            announcement: "📢 Banner & Push Broadcast"
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
        }
      }
    }

    renderCurrentView() {
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

    // 1. DASHBOARD OVERVIEW
    renderDashboard() {
      const darshans = this.store.getDarshans();
      const events = this.store.getEvents();
      const donations = this.store.getDonations();
      const volunteers = this.store.getVolunteers();

      // Stats
      const todayDarshan = this.store.getTodayDarshan();
      document.getElementById("stat-darshan-status").textContent = todayDarshan ? "Uploaded & Live" : "Pending Today";
      document.getElementById("stat-events-count").textContent = events.length;
      
      const totalAmount = donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      document.getElementById("stat-donations-total").textContent = `₹${totalAmount.toLocaleString('en-IN')}`;
      document.getElementById("stat-volunteers-count").textContent = volunteers.length;

      // Recent Donations Table Preview
      const tbody = document.getElementById("dashboard-donations-tbody");
      if (tbody) {
        tbody.innerHTML = donations.slice(0, 4).map(d => `
          <tr>
            <td><strong>${d.id}</strong></td>
            <td>${d.donorName}</td>
            <td><strong style="color:var(--saffron-700)">₹${d.amount.toLocaleString('en-IN')}</strong></td>
            <td>${d.purpose}</td>
            <td><span class="badge badge-success">${d.paymentMethod}</span></td>
            <td>${d.date}</td>
          </tr>
        `).join("");
      }
    }

    // 2. DARSHAN & SPIRITUAL POSTS MANAGER
    renderDarshan() {
      const darshans = this.store.getDarshans();
      const quotes = this.store.getQuotes();

      const grid = document.getElementById("darshan-cards-grid");
      if (grid) {
        grid.innerHTML = darshans.map(d => `
          <div class="darshan-card ${d.active ? 'active' : ''}">
            <img src="${d.imageUrl || d.image}" class="darshan-img" alt="${d.deity}" />
            <div class="darshan-body">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                <div class="darshan-date">${d.date} ${d.active ? '• <span class="badge badge-success">Live Today</span>' : ''}</div>
                ${this.store.getTargetBadgeHTML(d.targetPlatform || 'both')}
              </div>
              <div class="darshan-deity">${d.deity || d.title}</div>
              <div class="darshan-quote">"${d.quote || d.message}"</div>
              <div style="display:flex; gap:0.5rem; margin-top:1rem;">
                ${!d.active ? `<button class="btn btn-primary btn-sm" onclick="window.adminApp.setDarshanActive('${d.id}')">Make Active</button>` : ''}
                <button class="btn btn-danger btn-sm" onclick="window.adminApp.deleteDarshan('${d.id}')">Delete</button>
              </div>
            </div>
          </div>
        `).join("");
      }

      // Render Text Quotes Grid
      const quotesGrid = document.getElementById("quotes-cards-grid");
      if (quotesGrid) {
        quotesGrid.innerHTML = quotes.map(q => `
          <div class="quote-card ${q.bgStyle || 'saffron-gradient'}">
            <div class="quote-card-header">
              <span class="quote-category">${q.category}</span>
              ${this.store.getTargetBadgeHTML(q.targetPlatform || 'both')}
            </div>
            <div class="quote-text">"${q.text}"</div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="quote-author">— ${q.author}</div>
              <button class="btn btn-danger btn-sm" style="background:rgba(0,0,0,0.3); color:#fff; border:none;" onclick="window.adminApp.deleteQuote('${q.id}')">Delete</button>
            </div>
          </div>
        `).join("");
      }
    }

    setDarshanActive(id) {
      const list = this.store.getDarshans();
      list.forEach(d => d.active = (d.id === id));
      this.store.set("iskcon_gd_darshan", list);
      this.showToast("Today's Active Darshan updated!", "success");
      this.renderDarshan();
    }

    deleteDarshan(id) {
      if (confirm("Delete this darshan record?")) {
        this.store.deleteDarshan(id);
        this.showToast("Darshan record deleted.", "info");
        this.renderDarshan();
      }
    }

    deleteQuote(id) {
      if (confirm("Delete this text quote post?")) {
        this.store.deleteQuote(id);
        this.showToast("Quote post deleted.", "info");
        this.renderDarshan();
      }
    }

    saveDarshanForm(e) {
      e.preventDefault();
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

        this.store.saveQuote({ text, author, category, bgStyle, targetPlatform });
        this.showToast(`Text Quote published for ${targetPlatform.toUpperCase()}!`, "success");
      } else {
        const imageUrl = document.getElementById("darshan-img-url").value.trim();
        const deity = document.getElementById("darshan-deity").value.trim();
        const quote = document.getElementById("darshan-quote").value.trim();

        if (!imageUrl || !deity) {
          this.showToast("Please provide image file/URL and deity name.", "warning");
          return;
        }

        this.store.addOrUpdateDarshan({ imageUrl, deity, quote, contentType, active: true, targetPlatform });
        this.showToast(`Media post published successfully for ${targetPlatform.toUpperCase()}!`, "success");
      }

      this.closeModal('darshan-modal');
      this.renderDarshan();
    }

    // 3. EVENTS & FESTIVALS
    renderEvents() {
      const events = this.store.getEvents();
      const tbody = document.getElementById("events-table-tbody");
      if (!tbody) return;

      tbody.innerHTML = events.map(e => `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <img src="${e.imageUrl}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;" />
              <div>
                <strong>${e.title}</strong><br/>
                <small style="color:var(--gold-700); font-weight:600;">${e.category}</small>
              </div>
            </div>
          </td>
          <td>${e.date}<br/><small style="color:var(--text-muted);">${e.time}</small></td>
          <td>${e.location}</td>
          <td>${this.store.getTargetBadgeHTML(e.targetPlatform || 'both')}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="window.adminApp.editEvent('${e.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="window.adminApp.deleteEvent('${e.id}')">Delete</button>
          </td>
        </tr>
      `).join("");
    }

    editEvent(id) {
      const event = this.store.getEvents().find(e => e.id === id);
      if (!event) return;

      document.getElementById("event-id").value = event.id;
      document.getElementById("event-title").value = event.title;
      document.getElementById("event-category").value = event.category;
      document.getElementById("event-date").value = event.date;
      document.getElementById("event-time").value = event.time;
      document.getElementById("event-location").value = event.location;
      document.getElementById("event-speaker").value = event.speaker || "";
      document.getElementById("event-img").value = event.imageUrl;
      document.getElementById("event-target").value = event.targetPlatform || "both";
      document.getElementById("event-desc").value = event.description;

      this.openModal('event-modal');
    }

    deleteEvent(id) {
      if (confirm("Delete this event?")) {
        this.store.deleteEvent(id);
        this.showToast("Event deleted.", "info");
        this.renderEvents();
      }
    }

    saveEventForm(e) {
      e.preventDefault();
      const id = document.getElementById("event-id").value;
      const title = document.getElementById("event-title").value;
      const category = document.getElementById("event-category").value;
      const date = document.getElementById("event-date").value;
      const time = document.getElementById("event-time").value;
      const location = document.getElementById("event-location").value;
      const speaker = document.getElementById("event-speaker").value;
      const imageUrl = document.getElementById("event-img").value;
      const targetPlatform = document.getElementById("event-target").value;
      const description = document.getElementById("event-desc").value;

      this.store.saveEvent({ id, title, category, date, time, location, speaker, imageUrl, targetPlatform, description });
      this.showToast(`Event saved for ${targetPlatform.toUpperCase()}!`, "success");
      this.closeModal('event-modal');
      this.renderEvents();
    }

    // 4. AARTI SCHEDULE
    renderSchedule() {
      const schedule = this.store.getSchedule();
      const tbody = document.getElementById("schedule-table-tbody");
      if (!tbody) return;

      tbody.innerHTML = schedule.map(s => `
        <tr>
          <td><input type="text" class="form-input form-input-sm sch-name" data-id="${s.id}" value="${s.name}" /></td>
          <td><input type="text" class="form-input form-input-sm sch-time" data-id="${s.id}" value="${s.time}" /></td>
          <td><input type="text" class="form-input form-input-sm sch-duration" data-id="${s.id}" value="${s.duration}" /></td>
          <td>${this.store.getTargetBadgeHTML(s.targetPlatform || 'both')}</td>
        </tr>
      `).join("");
    }

    saveScheduleForm(e) {
      e.preventDefault();
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

      this.store.saveSchedule(schedule);
      this.showToast("Temple Aarti Schedule saved & synced!", "success");
    }

    // 5. DONATIONS & 80G
    renderDonations() {
      const donations = this.store.getDonations();
      const tbody = document.getElementById("donations-table-tbody");
      if (!tbody) return;

      tbody.innerHTML = donations.map(d => `
        <tr>
          <td><strong>${d.id}</strong></td>
          <td>${d.donorName}<br/><small style="color:var(--text-muted);">${d.phone || d.email}</small></td>
          <td><strong style="color:var(--saffron-800)">₹${d.amount.toLocaleString('en-IN')}</strong></td>
          <td>${d.purpose}</td>
          <td>${d.pan || 'N/A'}</td>
          <td>${d.date}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="window.adminApp.printReceipt('${d.id}')">🖨️ 80G Receipt</button>
          </td>
        </tr>
      `).join("");
    }

    printReceipt(id) {
      const donation = this.store.getDonations().find(d => d.id === id);
      if (!donation) return;

      document.getElementById("rec-id").textContent = donation.id;
      document.getElementById("rec-date").textContent = donation.date;
      document.getElementById("rec-name").textContent = donation.donorName;
      document.getElementById("rec-pan").textContent = donation.pan || "N/A";
      document.getElementById("rec-phone").textContent = donation.phone || "N/A";
      document.getElementById("rec-email").textContent = donation.email || "N/A";
      document.getElementById("rec-purpose").textContent = donation.purpose;
      document.getElementById("rec-txn").textContent = donation.transactionId;
      document.getElementById("rec-amount").textContent = `₹ ${donation.amount.toLocaleString('en-IN')} /-`;

      this.openModal('receipt-modal');
    }

    saveDonationForm(e) {
      e.preventDefault();
      const donorName = document.getElementById("don-name").value;
      const amount = document.getElementById("don-amount").value;
      const purpose = document.getElementById("don-purpose").value;
      const pan = document.getElementById("don-pan").value;
      const phone = document.getElementById("don-phone").value;
      const email = document.getElementById("don-email").value;

      this.store.recordDonation({ donorName, amount, purpose, pan, phone, email });
      this.showToast("Manual donation recorded!", "success");
      this.closeModal('donation-modal');
      this.renderDonations();
    }

    exportCSV() {
      this.store.exportDonationsCSV();
      this.showToast("Donations CSV report downloaded!", "success");
    }

    // 6. VOLUNTEERS
    renderVolunteers() {
      const vols = this.store.getVolunteers();
      const tbody = document.getElementById("volunteers-table-tbody");
      if (!tbody) return;

      tbody.innerHTML = vols.map(v => `
        <tr>
          <td><strong>${v.id}</strong></td>
          <td>${v.fullName}<br/><small style="color:var(--text-muted);">${v.phone} • ${v.email}</small></td>
          <td>${v.interest}</td>
          <td>${v.availability}</td>
          <td><span class="badge ${v.status === 'Approved' ? 'badge-success' : 'badge-warning'}">${v.status}</span></td>
          <td>
            ${v.status !== 'Approved' ? `<button class="btn btn-primary btn-sm" onclick="window.adminApp.approveVol('${v.id}')">Approve</button>` : ''}
          </td>
        </tr>
      `).join("");
    }

    approveVol(id) {
      this.store.updateVolunteerStatus(id, "Approved");
      this.showToast("Volunteer approved!", "success");
      this.renderVolunteers();
    }

    // 7. MEDIA LIBRARY
    renderMedia() {
      const audios = this.store.getMediaAudio();
      const videos = this.store.getMediaVideo();

      const audioList = document.getElementById("audio-list-tbody");
      if (audioList) {
        audioList.innerHTML = audios.map(a => `
          <tr>
            <td><strong>${a.title}</strong></td>
            <td>${a.artist}</td>
            <td>${a.category}</td>
            <td>${this.store.getTargetBadgeHTML(a.targetPlatform || 'both')}</td>
            <td>${a.duration}</td>
          </tr>
        `).join("");
      }

      const videoList = document.getElementById("video-list-tbody");
      if (videoList) {
        videoList.innerHTML = videos.map(v => `
          <tr>
            <td><strong>${v.title}</strong></td>
            <td>${v.youtubeId}</td>
            <td>${v.category}</td>
            <td>${this.store.getTargetBadgeHTML(v.targetPlatform || 'both')}</td>
          </tr>
        `).join("");
      }
    }

    saveAudioForm(e) {
      e.preventDefault();
      const title = document.getElementById("aud-title").value;
      const artist = document.getElementById("aud-artist").value;
      const category = document.getElementById("aud-category").value;
      const targetPlatform = document.getElementById("aud-target").value;
      const url = document.getElementById("aud-url").value;

      this.store.saveMediaAudio({ title, artist, category, targetPlatform, url, duration: "30:00" });
      this.showToast(`Audio track added for ${targetPlatform.toUpperCase()}!`, "success");
      this.closeModal('audio-modal');
      this.renderMedia();
    }

    // 8. ANNOUNCEMENT & PUSH
    renderAnnouncement() {
      const ann = this.store.getAnnouncement();
      document.getElementById("ann-enabled").checked = ann.enabled;
      document.getElementById("ann-text").value = ann.text;
      document.getElementById("ann-link-text").value = ann.linkText || "";
      document.getElementById("ann-link-hash").value = ann.linkHash || "";
      document.getElementById("ann-target").value = ann.targetPlatform || "both";
    }

    saveAnnouncementForm(e) {
      e.preventDefault();
      const enabled = document.getElementById("ann-enabled").checked;
      const text = document.getElementById("ann-text").value;
      const linkText = document.getElementById("ann-link-text").value;
      const linkHash = document.getElementById("ann-link-hash").value;
      const targetPlatform = document.getElementById("ann-target").value;

      this.store.saveAnnouncement({ enabled, text, linkText, linkHash, targetPlatform });
      this.showToast(`Banner Announcement updated for ${targetPlatform.toUpperCase()}!`, "success");
    }

    sendPushNotification(e) {
      e.preventDefault();
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
    saveYouTubeLiveConfig(e) {
      if (e) e.preventDefault();
      const status = document.getElementById("yt-live-status").value;
      const handle = document.getElementById("yt-channel-handle").value;
      const title = document.getElementById("yt-live-title").value;
      const videoId = document.getElementById("yt-live-videoid").value;
      const viewers = document.getElementById("yt-live-viewers").value;

      const isLive = status === "live";
      this.store.saveYouTubeLive({ isLive, handle, title, videoId, viewers });
      this.showToast(`YouTube Live Broadcast Config Saved! (${isLive ? '🔴 LIVE' : '⚪ OFFLINE'})`, "success");
    }

    broadcastLiveNotification() {
      const title = document.getElementById("yt-live-title").value || "🔴 ISKCON Gandhidham is Streaming Live!";
      this.showToast(`🔴 Live Broadcast Notification Dispatched to Mobile App & Web Users! ("${title}")`, "success");
    }

    // UTILITIES
    openModal(id) {
      const modal = document.getElementById(id);
      if (modal) modal.classList.add("open");
    }

    closeModal(id) {
      const modal = document.getElementById(id);
      if (modal) modal.classList.remove("open");
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
