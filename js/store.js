/**
 * ISKCON Gandhidham - Store & LocalStorage Persistence Layer
 */

(function() {
  const STORAGE_KEYS = {
    DARSHAN: "iskcon_gd_darshan",
    EVENTS: "iskcon_gd_events",
    SCHEDULE: "iskcon_gd_schedule",
    SEVAS: "iskcon_gd_sevas",
    DONATIONS: "iskcon_gd_donations",
    REGISTRATIONS: "iskcon_gd_registrations",
    VOLUNTEERS: "iskcon_gd_volunteers",
    INQUIRIES: "iskcon_gd_inquiries",
    ANNOUNCEMENT: "iskcon_gd_announcement",
    MEDIA_AUDIO: "iskcon_gd_media_audio",
    MEDIA_VIDEO: "iskcon_gd_media_video",
    QUOTES: "iskcon_gd_quotes",
    YOUTUBE_LIVE: "iskcon_gd_youtube_live",
    INITIALIZED: "iskcon_gd_init_v2"
  };

  const DEFAULT_ANNOUNCEMENT = {
    enabled: true,
    text: "🌸 Sri Krishna Janmashtami Mahotsav 2026 Celebrations from Sept 04! Join 108 Kalash Maha Abhishek & Akhand Kirtan.",
    linkText: "View Schedule",
    linkHash: "#/events/janmashtami-2026"
  };

  const DEFAULT_DONATIONS = [
    {
      id: "ISK-GD-2026-88102",
      donorName: "Gaurav Sharma",
      email: "gaurav.sharma@example.com",
      phone: "+91 98250 12345",
      pan: "ABCPS1234F",
      amount: 5100,
      purpose: "Anna Daan — Food For Life Free Prasadam Seva",
      paymentMethod: "UPI / QR Code",
      transactionId: "UPI-904820194821",
      date: "2026-08-15 11:32 AM",
      taxExempt: true,
      address: "Gandhidham, Gujarat"
    },
    {
      id: "ISK-GD-2026-88094",
      donorName: "Pooja Patel",
      email: "pooja.patel@example.com",
      phone: "+91 94280 67890",
      pan: "PATPL5678K",
      amount: 2501,
      purpose: "Deity Shringar & Royal Poshak Seva",
      paymentMethod: "Net Banking",
      transactionId: "NET-551920391200",
      date: "2026-08-14 06:15 PM",
      taxExempt: true,
      address: "Adipur, Kutch"
    },
    {
      id: "ISK-GD-2026-88042",
      donorName: "Ramesh & Meena Jha",
      email: "ramesh.jha@example.com",
      phone: "+91 97120 44321",
      pan: "JHARM9988M",
      amount: 11000,
      purpose: "Gau Seva — Sacred Cow Protection & Fodder",
      paymentMethod: "Credit Card",
      transactionId: "CC-847291048271",
      date: "2026-08-12 09:40 AM",
      taxExempt: true,
      address: "Ahmedabad, Gujarat"
    }
  ];

  const STORE_VERSION = "iskcon_gd_v6_sync_fix";

  class TempleStore {
    constructor() {
      this.init();
    }

    init() {
      if (localStorage.getItem(STORAGE_KEYS.INITIALIZED) !== STORE_VERSION) {
        this.resetToDefaults();
      }
    }

    resetToDefaults() {
      const data = window.TEMPLE_DATA || {};
      if (!localStorage.getItem(STORAGE_KEYS.DARSHAN)) this._set(STORAGE_KEYS.DARSHAN, data.darshanGallery || []);
      if (!localStorage.getItem(STORAGE_KEYS.EVENTS)) this._set(STORAGE_KEYS.EVENTS, data.events || []);
      if (!localStorage.getItem(STORAGE_KEYS.SCHEDULE)) this._set(STORAGE_KEYS.SCHEDULE, data.schedule || []);
      if (!localStorage.getItem(STORAGE_KEYS.SEVAS)) this._set(STORAGE_KEYS.SEVAS, data.sevaCategories || []);
      if (!localStorage.getItem(STORAGE_KEYS.DONATIONS)) this._set(STORAGE_KEYS.DONATIONS, DEFAULT_DONATIONS);
      if (!localStorage.getItem(STORAGE_KEYS.REGISTRATIONS)) this._set(STORAGE_KEYS.REGISTRATIONS, []);
      if (!localStorage.getItem(STORAGE_KEYS.VOLUNTEERS)) this._set(STORAGE_KEYS.VOLUNTEERS, []);
      if (!localStorage.getItem(STORAGE_KEYS.INQUIRIES)) this._set(STORAGE_KEYS.INQUIRIES, []);
      if (!localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENT)) this._set(STORAGE_KEYS.ANNOUNCEMENT, DEFAULT_ANNOUNCEMENT);
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, STORE_VERSION);
    }

    _get(key, fallback = []) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      } catch (e) {
        console.error(`Error reading ${key} from storage:`, e);
        return fallback;
      }
    }

    _set(key, val) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {
        console.error(`Error saving ${key} to storage:`, e);
      }
    }

    // Darshan
    getDarshan() {
      const defaults = window.TEMPLE_DATA?.darshanGallery || [];
      const stored = this._get(STORAGE_KEYS.DARSHAN, null);
      if (!stored || !Array.isArray(stored) || stored.length === 0) {
        this._set(STORAGE_KEYS.DARSHAN, defaults);
        return defaults;
      }
      return stored;
    }

    getTodayDarshan() {
      const list = this.getDarshan();
      return list.length > 0 ? list[0] : null;
    }

    updateTodayDarshan(updatedData) {
      const list = this.getDarshan();
      if (list.length > 0) {
        list[0] = { ...list[0], ...updatedData, date: updatedData.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) };
      } else {
        list.unshift({ id: `darshan-${Date.now()}`, ...updatedData });
      }
      this._set(STORAGE_KEYS.DARSHAN, list);
      return list[0];
    }

    addDarshanImage(darshan) {
      const list = this.getDarshan();
      const newEntry = {
        id: `darshan-${Date.now()}`,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        ...darshan
      };
      list.unshift(newEntry);
      this._set(STORAGE_KEYS.DARSHAN, list);
      return newEntry;
    }

    // Schedule
    getSchedule() {
      return this._get(STORAGE_KEYS.SCHEDULE, window.TEMPLE_DATA?.schedule || []);
    }

    updateSchedule(newSchedule) {
      this._set(STORAGE_KEYS.SCHEDULE, newSchedule);
      return newSchedule;
    }

    // Events
    getEvents() {
      return this._get(STORAGE_KEYS.EVENTS, window.TEMPLE_DATA?.events || []);
    }

    getEventById(id) {
      return this.getEvents().find(e => e.id === id);
    }

    saveEvent(eventData) {
      const events = this.getEvents();
      if (eventData.id) {
        const idx = events.findIndex(e => e.id === eventData.id);
        if (idx !== -1) {
          events[idx] = { ...events[idx], ...eventData };
          this._set(STORAGE_KEYS.EVENTS, events);
          return events[idx];
        }
      }
      const newEvent = {
        id: `evt-${Date.now()}`,
        highlights: [],
        registrationRequired: false,
        freeEntry: true,
        ...eventData
      };
      events.unshift(newEvent);
      this._set(STORAGE_KEYS.EVENTS, events);
      return newEvent;
    }

    deleteEvent(id) {
      const events = this.getEvents().filter(e => e.id !== id);
      this._set(STORAGE_KEYS.EVENTS, events);
      return true;
    }

    // Sevas
    getSevas() {
      return this._get(STORAGE_KEYS.SEVAS, window.TEMPLE_DATA?.sevaCategories || []);
    }

    getSevaById(id) {
      return this.getSevas().find(s => s.id === id);
    }

    // Donations & 80G Tax Exemption Receipts
    getDonations() {
      return this._get(STORAGE_KEYS.DONATIONS, DEFAULT_DONATIONS);
    }

    recordDonation(donation) {
      const donations = this.getDonations();
      const refNumber = `ISK-GD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const now = new Date();
      const dateString = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      const newRecord = {
        id: refNumber,
        transactionId: donation.transactionId || `TXN-${Date.now()}`,
        date: dateString,
        timestamp: now.getTime(),
        donorName: donation.donorName || "Anonymous Devotee",
        email: donation.email || "",
        phone: donation.phone || "",
        pan: (donation.pan || "").toUpperCase(),
        address: donation.address || "Gandhidham, India",
        amount: Number(donation.amount) || 501,
        purpose: donation.purpose || "General Temple Seva",
        paymentMethod: donation.paymentMethod || "UPI / QR Code",
        taxExempt: true,
        status: "SUCCESS"
      };

      donations.unshift(newRecord);
      this._set(STORAGE_KEYS.DONATIONS, donations);
      return newRecord;
    }

    getDonationById(id) {
      return this.getDonations().find(d => d.id === id);
    }

    // Registrations
    getRegistrations() {
      return this._get(STORAGE_KEYS.REGISTRATIONS, []);
    }

    registerForEvent(reg) {
      const registrations = this.getRegistrations();
      const newReg = {
        id: `REG-${Date.now()}`,
        date: new Date().toLocaleString(),
        ...reg
      };
      registrations.unshift(newReg);
      this._set(STORAGE_KEYS.REGISTRATIONS, registrations);
      return newReg;
    }

    // Volunteers
    getVolunteers() {
      return this._get(STORAGE_KEYS.VOLUNTEERS, []);
    }

    submitVolunteer(vol) {
      const volunteers = this.getVolunteers();
      const newVol = {
        id: `VOL-${Date.now()}`,
        date: new Date().toLocaleString(),
        status: "Pending Review",
        ...vol
      };
      volunteers.unshift(newVol);
      this._set(STORAGE_KEYS.VOLUNTEERS, volunteers);
      return newVol;
    }

    // Inquiries
    getInquiries() {
      return this._get(STORAGE_KEYS.INQUIRIES, []);
    }

    submitInquiry(inq) {
      const inquiries = this.getInquiries();
      const newInq = {
        id: `INQ-${Date.now()}`,
        date: new Date().toLocaleString(),
        status: "New",
        ...inq
      };
      inquiries.unshift(newInq);
      this._set(STORAGE_KEYS.INQUIRIES, inquiries);
      return newInq;
    }

    // Announcements
    getAnnouncement() {
      return this._get(STORAGE_KEYS.ANNOUNCEMENT, DEFAULT_ANNOUNCEMENT);
    }

    updateAnnouncement(announcement) {
      this._set(STORAGE_KEYS.ANNOUNCEMENT, announcement);
      return announcement;
    }

    // Media & Quotes Dynamic Synchronization
    getMediaVideo() {
      const defaults = window.TEMPLE_DATA?.youtubeChannel?.videos || [];
      const stored = this._get(STORAGE_KEYS.MEDIA_VIDEO, null);
      if (!stored || !Array.isArray(stored)) {
        return defaults;
      }
      return stored;
    }

    getMediaAudio() {
      const defaults = window.TEMPLE_DATA?.kirtans || [];
      const stored = this._get(STORAGE_KEYS.MEDIA_AUDIO, null);
      if (!stored || !Array.isArray(stored)) {
        return defaults;
      }
      return stored;
    }

    getQuotes() {
      const defaults = window.TEMPLE_DATA?.quotes || [];
      const stored = this._get(STORAGE_KEYS.QUOTES, null);
      if (!stored || !Array.isArray(stored)) {
        return defaults;
      }
      return stored;
    }

    getYouTubeLive() {
      const defaults = window.TEMPLE_DATA?.youtubeChannel?.liveStream || {};
      const stored = this._get(STORAGE_KEYS.YOUTUBE_LIVE, null);
      return stored ? stored : defaults;
    }
  }

  window.templeStore = new TempleStore();
})();
