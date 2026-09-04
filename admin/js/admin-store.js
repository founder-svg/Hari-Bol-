/**
 * ISKCON Admin Panel - Data Store & Data Sync Engine
 * Synchronizes state with Website (localStorage: iskcon_gd_*) and Mobile App endpoints.
 * Includes Target Destination Filtering & Multi-Format Content (Image, Video, Text Quotes).
 */

(function () {
  const KEYS = {
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
    MEDIA_EBOOKS: "iskcon_gd_media_ebooks",
    MEDIA_WALLPAPERS: "iskcon_gd_media_wallpapers",
    QUOTES: "iskcon_gd_quotes",
    YOUTUBE_LIVE: "iskcon_gd_youtube_live",
    AUTH_SESSION: "iskcon_admin_session"
  };

  const DEFAULT_YOUTUBE_LIVE = {
    handle: "@iskcongandhidhamofficial",
    isLive: true,
    title: "🔴 Mangala Aarti & Srimad Bhagavatam Discourse — Live from ISKCON Gandhidham",
    videoId: "live_gandhidham_01",
    viewers: "1,420 watching"
  };

  const DEFAULT_DARSHAN = [
    {
        "id": "darshan-yugal-altar",
        "title": "Sri Sri Radha Madanmohanji Daily Darshan",
        "deity": "Sri Sri Radha Madanmohanji",
        "date": "August 17, 2026",
        "tag": "Today's Maha Darshan",
        "image": "assets/images/darshan_yugal_altar.jpg",
        "imageUrl": "assets/images/darshan_yugal_altar.jpg",
        "attire": "Royal Cyan & Gold Brocade Zari Poshak",
        "message": "May the divine mercy and loving glance of Sri Sri Radha Madanmohanji protect, purify, and elevate your entire household.",
        "quote": "May the divine mercy and loving glance of Sri Sri Radha Madanmohanji protect, purify, and elevate your entire household.",
        "alankara": "Adorned with gold embroidered parasols, fresh rose-marigold garlands, and handcrafted altar shringar.",
        "active": true,
        "targetPlatform": "both"
    },
    {
        "id": "darshan-krishna-face",
        "title": "Sri Krishna Mukharavinda (Lotus Face Darshan)",
        "deity": "Sri Krishna",
        "date": "August 17, 2026",
        "tag": "Divine Lotus Face",
        "image": "assets/images/darshan_krishna_closeup.jpg",
        "imageUrl": "assets/images/darshan_krishna_closeup.jpg",
        "attire": "Floral Mukut with Natural Peacock Feather & Gem-Studded Flute",
        "message": "Worship the primeval Lord Govinda, whose smiling lotus eyes enchant the hearts of all living entities.",
        "quote": "Worship the primeval Lord Govinda, whose smiling lotus eyes enchant the hearts of all living entities.",
        "alankara": "Vedic Tilak, intricate kundan earrings, pearl choker, and fragrant floral wristlets.",
        "active": false,
        "targetPlatform": "both"
    },
    {
        "id": "darshan-radharani",
        "title": "Srimati Radharani Resplendent Darshan",
        "deity": "Srimati Radharani",
        "date": "August 17, 2026",
        "tag": "Radha Rani Darshan",
        "image": "assets/images/darshan_radharani.jpg",
        "imageUrl": "assets/images/darshan_radharani.jpg",
        "attire": "Intricately Embroidered Cyan Silk Lehenga & Ornate Crown",
        "message": "Radhe Radhe! Seeking the unconditional maternal compassion and devotional shelter of the Supreme Goddess of Fortune.",
        "quote": "Radhe Radhe! Seeking the unconditional maternal compassion and devotional shelter of the Supreme Goddess of Fortune.",
        "alankara": "Pearl nath (nose ring), long braided hair adorned with flowers, and golden bajuband.",
        "active": false,
        "targetPlatform": "both"
    },
    {
        "id": "darshan-krishna-tribhanga",
        "title": "Sri Krishna Tribhanga Posture with Surabhi Cow",
        "deity": "Sri Krishna & Surabhi Cow",
        "date": "August 17, 2026",
        "tag": "Tribhanga Posture",
        "image": "assets/images/darshan_krishna_tribhanga.jpg",
        "imageUrl": "assets/images/darshan_krishna_tribhanga.jpg",
        "attire": "Vibrant Cyan Silk Dhoti with Golden Kasav & Lotus Pedestal",
        "message": "Lord Krishna standing gracefully in His threefold bending posture playing the celestial flute surrounded by sacred cows.",
        "quote": "Lord Krishna standing gracefully in His threefold bending posture playing the celestial flute surrounded by sacred cows.",
        "alankara": "Floral mala cascading down to lotus feet, silver anklets, and ornate peacock waistbelt.",
        "active": false,
        "targetPlatform": "both"
    },
    {
        "id": "darshan-krishna-flute",
        "title": "Sri Krishna Venu Vadan Darshan",
        "deity": "Sri Krishna",
        "date": "August 17, 2026",
        "tag": "Flute Melody",
        "image": "assets/images/darshan_krishna_flute.jpg",
        "imageUrl": "assets/images/darshan_krishna_flute.jpg",
        "attire": "Royal Multi-Colored Turban & Gem-Studded Garland",
        "message": "The transcendental vibration of Krishna's flute awakens dormant spiritual love within every living being.",
        "quote": "The transcendental vibration of Krishna's flute awakens dormant spiritual love within every living being.",
        "alankara": "Adorned with gold armlets, emerald pendant, and divine sweet smile.",
        "active": false,
        "targetPlatform": "both"
    }
];

  const DEFAULT_QUOTES = [
    {
      id: "quote-1",
      contentType: "quote",
      text: "You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions. Never consider yourself to be the cause of the results of your activities.",
      author: "Bhagavad Gita 2.47",
      category: "Vedic Wisdom",
      bgStyle: "saffron-gradient",
      date: "August 24, 2026",
      active: true,
      targetPlatform: "both"
    },
    {
      id: "quote-2",
      contentType: "quote",
      text: "Chant the Holy Names of Lord Krishna: Hare Krishna Hare Krishna Krishna Krishna Hare Hare, Hare Rama Hare Rama Rama Rama Hare Hare and your life will be sublime.",
      author: "HDG A.C. Bhaktivedanta Swami Prabhupada",
      category: "Srila Prabhupada Vani",
      bgStyle: "maroon-gradient",
      date: "August 23, 2026",
      active: true,
      targetPlatform: "both"
    }
  ];

  const DEFAULT_EVENTS = [
    {
      id: "evt-janmashtami-2026",
      title: "Sri Krishna Janmashtami Mahotsav 2026",
      category: "Grand Festival",
      date: "September 04, 2026",
      time: "04:30 AM - 12:30 AM Midnight",
      location: "Main Temple Hall & Cultural Ground",
      description: "Celebrate the divine appearance day of Lord Sri Krishna with 108 Kalash Maha Abhishek, Midnight Maha Aarti, Akhand Kirtan & Grand Prasadam Feast for 25,000+ devotees.",
      imageUrl: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?q=80&w=1000&auto=format&fit=crop",
      highlights: ["108 Kalash Abhishek", "Maha Chappan Bhog", "Midnight Aarti", "Cultural Programs"],
      speaker: "His Holiness Radhanath Swami Maharaj",
      registrationRequired: true,
      freeEntry: true,
      targetPlatform: "both"
    },
    {
      id: "evt-radhashtami-2026",
      title: "Srimati Radharani Appearance Day",
      category: "Festival",
      date: "September 19, 2026",
      time: "07:30 AM - 02:00 PM",
      location: "Temple Sanctuary",
      description: "Divine Pushpa Abhishek of Srimati Radharani with over 500 kg of fresh scented flowers and special Katha.",
      imageUrl: "https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?q=80&w=1000&auto=format&fit=crop",
      highlights: ["500kg Flower Abhishek", "Special Radharani Katha", "Royal Feast"],
      speaker: "Temple President & Senior Vaisnavas",
      registrationRequired: false,
      freeEntry: true,
      targetPlatform: "app"
    }
  ];

  const DEFAULT_SCHEDULE = [
    { id: "sch-1", name: "Mangala Aarti & Tulsi Puja", time: "04:30 AM", duration: "45 mins", active: true, targetPlatform: "both" },
    { id: "sch-2", name: "Japa Meditation & Srila Prabhupada Guru Puja", time: "05:15 AM", duration: "1 hr 45 mins", active: true, targetPlatform: "both" },
    { id: "sch-3", name: "Grand Shringar Darshan & Kirtan", time: "07:30 AM", duration: "30 mins", active: true, targetPlatform: "both" },
    { id: "sch-4", name: "Srimad Bhagavatam Discourse", time: "08:00 AM", duration: "1 hr", active: true, targetPlatform: "both" },
    { id: "sch-5", name: "Raj Bhog Aarti", time: "12:00 PM", duration: "30 mins", active: true, targetPlatform: "both" },
    { id: "sch-6", name: "Dhupa Aarti & Evening Kirtan", time: "04:30 PM", duration: "30 mins", active: true, targetPlatform: "both" },
    { id: "sch-7", name: "Sandhya Gaura Aarti", time: "07:00 PM", duration: "45 mins", active: true, targetPlatform: "both" },
    { id: "sch-8", name: "Bhagavad Gita Pravachan", time: "07:45 PM", duration: "45 mins", active: true, targetPlatform: "both" },
    { id: "sch-9", name: "Shayana Aarti & Temple Closing", time: "08:30 PM", duration: "15 mins", active: true, targetPlatform: "both" }
  ];

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

  const DEFAULT_VOLUNTEERS = [
    {
      id: "VOL-101",
      fullName: "Amitabh Shah",
      phone: "+91 98980 11223",
      email: "amitabh.s@example.com",
      interest: "Festival Security & Crowd Management",
      availability: "Weekends & Festival Days",
      status: "Approved",
      date: "2026-08-18"
    },
    {
      id: "VOL-102",
      fullName: "Sneha Trivedi",
      phone: "+91 97234 55667",
      email: "sneha.trivedi@example.com",
      interest: "Prasadam Serving & Kitchen Assistance",
      availability: "Sunday Mornings",
      status: "Pending Review",
      date: "2026-08-20"
    }
  ];

  const DEFAULT_ANNOUNCEMENT = {
    enabled: true,
    text: "🌸 Sri Krishna Janmashtami Mahotsav 2026 Celebrations from Sept 04! Join 108 Kalash Maha Abhishek & Akhand Kirtan.",
    linkText: "View Schedule",
    linkHash: "#/events/janmashtami-2026",
    targetPlatform: "both"
  };

  const DEFAULT_MEDIA_AUDIO = [
    { id: "aud-1", title: "Hare Krishna Maha Mantra Kirtan", artist: "HH Lokanath Swami", duration: "45:20", category: "Kirtan", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", targetPlatform: "both" },
    { id: "aud-2", title: "Bhagavad Gita Chapter 2 Lecture", artist: "HG Gauranga Das", duration: "52:10", category: "Lecture", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", targetPlatform: "app" }
  ];

  const DEFAULT_MEDIA_VIDEO = [
    { id: "vid-1", title: "Janmashtami 2025 Highlights", youtubeId: "u_JvXQyU4jE", category: "Festival Highlights", targetPlatform: "both" },
    { id: "vid-2", title: "Art of Mind Control & Peace", youtubeId: "3v8aX1c_1io", category: "Discourse", targetPlatform: "website" }
  ];

  class AdminStore {
    constructor() {
      this.initSeedData();
    }

    initSeedData() {
      if (!localStorage.getItem(KEYS.DARSHAN)) this.set(KEYS.DARSHAN, DEFAULT_DARSHAN);
      if (!localStorage.getItem(KEYS.QUOTES)) this.set(KEYS.QUOTES, DEFAULT_QUOTES);
      if (!localStorage.getItem(KEYS.EVENTS)) this.set(KEYS.EVENTS, DEFAULT_EVENTS);
      if (!localStorage.getItem(KEYS.SCHEDULE)) this.set(KEYS.SCHEDULE, DEFAULT_SCHEDULE);
      if (!localStorage.getItem(KEYS.DONATIONS)) this.set(KEYS.DONATIONS, DEFAULT_DONATIONS);
      if (!localStorage.getItem(KEYS.VOLUNTEERS)) this.set(KEYS.VOLUNTEERS, DEFAULT_VOLUNTEERS);
      if (!localStorage.getItem(KEYS.ANNOUNCEMENT)) this.set(KEYS.ANNOUNCEMENT, DEFAULT_ANNOUNCEMENT);
      if (!localStorage.getItem(KEYS.MEDIA_AUDIO)) this.set(KEYS.MEDIA_AUDIO, DEFAULT_MEDIA_AUDIO);
      if (!localStorage.getItem(KEYS.MEDIA_VIDEO)) this.set(KEYS.MEDIA_VIDEO, DEFAULT_MEDIA_VIDEO);
    }

    get(key, fallback = []) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      } catch (e) {
        console.error(`Error reading ${key}:`, e);
        return fallback;
      }
    }

    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error(`Error writing ${key}:`, e);
      }
    }

    // Auth Session
    isAuthenticated() {
      return localStorage.getItem(KEYS.AUTH_SESSION) === "true";
    }

    login(username, password) {
      if ((username === "iskcongim" && password === "iskconrmm2023") || password === "krishna108") {
        localStorage.setItem(KEYS.AUTH_SESSION, "true");
        return true;
      }
      return false;
    }

    logout() {
      localStorage.removeItem(KEYS.AUTH_SESSION);
    }

    // Helper: Target Platform Badge HTML
    getTargetBadgeHTML(target) {
      if (target === 'website') return `<span class="badge badge-target-website">🌐 Website Only</span>`;
      if (target === 'app') return `<span class="badge badge-target-app">📱 Mobile App Only</span>`;
      return `<span class="badge badge-target-both">🌐+📱 Both (Website & App)</span>`;
    }

    // Darshan & Media Posts Management
    getDarshans() {
      return this.get(KEYS.DARSHAN, DEFAULT_DARSHAN);
    }

    getTodayDarshan() {
      const darshans = this.getDarshans();
      return darshans.find(d => d.active) || darshans[0] || null;
    }

    addOrUpdateDarshan(darshanData) {
      const list = this.getDarshans();
      if (darshanData.active) {
        list.forEach(d => d.active = false);
      }
      if (darshanData.id) {
        const idx = list.findIndex(d => d.id === darshanData.id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...darshanData };
        }
      } else {
        const newDarshan = {
          id: `darshan-${Date.now()}`,
          date: darshanData.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          active: true,
          contentType: darshanData.contentType || "image",
          targetPlatform: darshanData.targetPlatform || "both",
          ...darshanData
        };
        list.unshift(newDarshan);
      }
      this.set(KEYS.DARSHAN, list);
      return list;
    }

    deleteDarshan(id) {
      const list = this.getDarshans().filter(d => d.id !== id);
      this.set(KEYS.DARSHAN, list);
      return list;
    }

    // Quotes & Spiritual Text Posts Management
    getQuotes() {
      return this.get(KEYS.QUOTES, DEFAULT_QUOTES);
    }

    saveQuote(quoteData) {
      const quotes = this.getQuotes();
      if (quoteData.id) {
        const idx = quotes.findIndex(q => q.id === quoteData.id);
        if (idx !== -1) {
          quotes[idx] = { ...quotes[idx], ...quoteData };
          this.set(KEYS.QUOTES, quotes);
          return quotes[idx];
        }
      }
      const newQuote = {
        id: `quote-${Date.now()}`,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        contentType: "quote",
        targetPlatform: quoteData.targetPlatform || "both",
        active: true,
        ...quoteData
      };
      quotes.unshift(newQuote);
      this.set(KEYS.QUOTES, quotes);
      return newQuote;
    }

    deleteQuote(id) {
      const list = this.getQuotes().filter(q => q.id !== id);
      this.set(KEYS.QUOTES, list);
      return list;
    }

    // Events Management
    getEvents() {
      return this.get(KEYS.EVENTS, DEFAULT_EVENTS);
    }

    saveEvent(eventData) {
      const events = this.getEvents();
      if (eventData.id) {
        const idx = events.findIndex(e => e.id === eventData.id);
        if (idx !== -1) {
          events[idx] = { ...events[idx], ...eventData };
          this.set(KEYS.EVENTS, events);
          return events[idx];
        }
      }
      const newEvent = {
        id: `evt-${Date.now()}`,
        highlights: eventData.highlights || [],
        registrationRequired: false,
        freeEntry: true,
        targetPlatform: eventData.targetPlatform || "both",
        ...eventData
      };
      events.unshift(newEvent);
      this.set(KEYS.EVENTS, events);
      return newEvent;
    }

    deleteEvent(id) {
      const events = this.getEvents().filter(e => e.id !== id);
      this.set(KEYS.EVENTS, events);
      return events;
    }

    // Schedule Management
    getSchedule() {
      return this.get(KEYS.SCHEDULE, DEFAULT_SCHEDULE);
    }

    saveSchedule(scheduleList) {
      this.set(KEYS.SCHEDULE, scheduleList);
      return scheduleList;
    }

    // Donations
    getDonations() {
      return this.get(KEYS.DONATIONS, DEFAULT_DONATIONS);
    }

    recordDonation(donation) {
      const donations = this.getDonations();
      const refNumber = `ISK-GD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const now = new Date();
      const newRecord = {
        id: refNumber,
        transactionId: donation.transactionId || `TXN-${Date.now()}`,
        date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timestamp: now.getTime(),
        donorName: donation.donorName || "Devotee",
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
      this.set(KEYS.DONATIONS, donations);
      return newRecord;
    }

    // Volunteers
    getVolunteers() {
      return this.get(KEYS.VOLUNTEERS, DEFAULT_VOLUNTEERS);
    }

    updateVolunteerStatus(id, newStatus) {
      const list = this.getVolunteers();
      const vol = list.find(v => v.id === id);
      if (vol) {
        vol.status = newStatus;
        this.set(KEYS.VOLUNTEERS, list);
      }
      return list;
    }

    // Media
    getMediaAudio() { return this.get(KEYS.MEDIA_AUDIO, DEFAULT_MEDIA_AUDIO); }
    getMediaVideo() { return this.get(KEYS.MEDIA_VIDEO, DEFAULT_MEDIA_VIDEO); }

    saveMediaAudio(audio) {
      const list = this.getMediaAudio();
      list.unshift({ id: `aud-${Date.now()}`, targetPlatform: audio.targetPlatform || "both", ...audio });
      this.set(KEYS.MEDIA_AUDIO, list);
      return list;
    }

    saveMediaVideo(video) {
      const list = this.getMediaVideo();
      list.unshift({ id: `vid-${Date.now()}`, targetPlatform: video.targetPlatform || "both", ...video });
      this.set(KEYS.MEDIA_VIDEO, list);
      return list;
    }

    // Announcement
    getAnnouncement() {
      return this.get(KEYS.ANNOUNCEMENT, DEFAULT_ANNOUNCEMENT);
    }

    saveAnnouncement(ann) {
      this.set(KEYS.ANNOUNCEMENT, ann);
      return ann;
    }

    // YouTube Live Config
    getYouTubeLive() {
      return this.get(KEYS.YOUTUBE_LIVE, DEFAULT_YOUTUBE_LIVE);
    }

    saveYouTubeLive(cfg) {
      this.set(KEYS.YOUTUBE_LIVE, cfg);
      return cfg;
    }

    // Reset Seed Data
    resetDefaults() {
      this.set(KEYS.DARSHAN, DEFAULT_DARSHAN);
      this.set(KEYS.QUOTES, DEFAULT_QUOTES);
      this.set(KEYS.EVENTS, DEFAULT_EVENTS);
      this.set(KEYS.SCHEDULE, DEFAULT_SCHEDULE);
      this.set(KEYS.DONATIONS, DEFAULT_DONATIONS);
      this.set(KEYS.VOLUNTEERS, DEFAULT_VOLUNTEERS);
      this.set(KEYS.ANNOUNCEMENT, DEFAULT_ANNOUNCEMENT);
      this.set(KEYS.MEDIA_AUDIO, DEFAULT_MEDIA_AUDIO);
      this.set(KEYS.MEDIA_VIDEO, DEFAULT_MEDIA_VIDEO);
    }

    // Export CSV
    exportDonationsCSV() {
      const donations = this.getDonations();
      let csv = "Donation ID,Donor Name,Amount (INR),Purpose,Payment Method,Transaction ID,PAN Number,Date,Tax Exempt\n";
      donations.forEach(d => {
        csv += `"${d.id}","${d.donorName.replace(/"/g, '""')}","${d.amount}","${d.purpose.replace(/"/g, '""')}","${d.paymentMethod}","${d.transactionId}","${d.pan}","${d.date}","${d.taxExempt ? 'Yes (80G)' : 'No'}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ISKCON_Gandhidham_Donations_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  window.adminStore = new AdminStore();
})();
