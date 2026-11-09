/**
 * ISKCON Admin Panel — Data Store & Firestore Data Sync Engine
 * 
 * Replaces localStorage with Firestore (Modular SDK v10+).
 * Synchronizes real-time admin state with Firestore collections:
 * events, darshan, aartiSchedule, announcements, liveStream, sevas, donations, volunteers, enquiries.
 */

import {
  db,
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "../../js/firebase-init.js";

(function () {
  'use strict';

  const DEFAULT_YOUTUBE_LIVE = {
    handle: "@iskcongandhidhamofficial",
    isLive: true,
    title: "🔴 Mangala Aarti & Srimad Bhagavatam Discourse — Live from ISKCON Gandhidham",
    videoId: "live_gandhidham_01",
    viewers: "1,420 watching"
  };

  const DEFAULT_DARSHAN = [
    {
      id: "darshan-yugal-altar",
      title: "Sri Sri Radha Madanmohanji Daily Darshan",
      deity: "Sri Sri Radha Madanmohanji",
      date: "August 17, 2026",
      tag: "Today's Maha Darshan",
      image: "assets/images/darshan_yugal_altar.jpg",
      imageUrl: "assets/images/darshan_yugal_altar.jpg",
      attire: "Royal Cyan & Gold Brocade Zari Poshak",
      message: "May the divine mercy and loving glance of Sri Sri Radha Madanmohanji protect, purify, and elevate your entire household.",
      quote: "May the divine mercy and loving glance of Sri Sri Radha Madanmohanji protect, purify, and elevate your entire household.",
      alankara: "Adorned with gold embroidered parasols, fresh rose-marigold garlands, and handcrafted altar shringar.",
      active: true,
      targetPlatform: "both"
    },
    {
      id: "darshan-krishna-face",
      title: "Sri Krishna Mukharavinda (Lotus Face Darshan)",
      deity: "Sri Krishna",
      date: "August 17, 2026",
      tag: "Divine Lotus Face",
      image: "assets/images/darshan_krishna_closeup.jpg",
      imageUrl: "assets/images/darshan_krishna_closeup.jpg",
      attire: "Floral Mukut with Natural Peacock Feather & Gem-Studded Flute",
      message: "Worship the primeval Lord Govinda, whose smiling lotus eyes enchant the hearts of all living entities.",
      quote: "Worship the primeval Lord Govinda, whose smiling lotus eyes enchant the hearts of all living entities.",
      alankara: "Vedic Tilak, intricate kundan earrings, pearl choker, and fragrant floral wristlets.",
      active: false,
      targetPlatform: "both"
    },
    {
      id: "darshan-radharani",
      title: "Srimati Radharani Resplendent Darshan",
      deity: "Srimati Radharani",
      date: "August 17, 2026",
      tag: "Radha Rani Darshan",
      image: "assets/images/darshan_radharani.jpg",
      imageUrl: "assets/images/darshan_radharani.jpg",
      attire: "Intricately Embroidered Cyan Silk Lehenga & Ornate Crown",
      message: "Radhe Radhe! Seeking the unconditional maternal compassion and devotional shelter of the Supreme Goddess of Fortune.",
      quote: "Radhe Radhe! Seeking the unconditional maternal compassion and devotional shelter of the Supreme Goddess of Fortune.",
      alankara: "Pearl nath (nose ring), long braided hair adorned with flowers, and golden bajuband.",
      active: false,
      targetPlatform: "both"
    },
    {
      id: "darshan-krishna-tribhanga",
      title: "Sri Krishna Tribhanga Posture with Surabhi Cow",
      deity: "Sri Krishna & Surabhi Cow",
      date: "August 17, 2026",
      tag: "Tribhanga Posture",
      image: "assets/images/darshan_krishna_tribhanga.jpg",
      imageUrl: "assets/images/darshan_krishna_tribhanga.jpg",
      attire: "Vibrant Cyan Silk Dhoti with Golden Kasav & Lotus Pedestal",
      message: "Lord Krishna standing gracefully in His threefold bending posture playing the celestial flute surrounded by sacred cows.",
      quote: "Lord Krishna standing gracefully in His threefold bending posture playing the celestial flute surrounded by sacred cows.",
      alankara: "Floral mala cascading down to lotus feet, silver anklets, and ornate peacock waistbelt.",
      active: false,
      targetPlatform: "both"
    },
    {
      id: "darshan-krishna-flute",
      title: "Sri Krishna Venu Vadan Darshan",
      deity: "Sri Krishna",
      date: "August 17, 2026",
      tag: "Flute Melody",
      image: "assets/images/darshan_krishna_flute.jpg",
      imageUrl: "assets/images/darshan_krishna_flute.jpg",
      attire: "Royal Multi-Colored Turban & Gem-Studded Garland",
      message: "The transcendental vibration of Krishna's flute awakens dormant spiritual love within every living being.",
      quote: "The transcendental vibration of Krishna's flute awakens dormant spiritual love within every living being.",
      alankara: "Adorned with gold armlets, emerald pendant, and divine sweet smile.",
      active: false,
      targetPlatform: "both"
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
      id: "janmashtami-2026",
      title: "Sri Krishna Janmashtami Mahotsav 2026",
      category: "Grand Festival",
      date: "September 04, 2026",
      time: "05:00 AM - 12:30 AM Midnight",
      location: "Main Temple Hall & Cultural Ground",
      description: "Celebrate the divine appearance day of Lord Sri Krishna with 108 Kalash Maha Abhishek, Midnight Maha Aarti, Akhand Kirtan & Grand Prasadam Feast for 25,000+ devotees.",
      shortDesc: "Celebrate the divine appearance day of Lord Sri Krishna with 108 Kalash Maha Abhishek, Midnight Maha Aarti, Akhand Kirtan & Grand Prasadam Feast for 25,000+ devotees.",
      fullDesc: "Celebrate the divine appearance day of Lord Sri Krishna with 108 Kalash Maha Abhishek, Midnight Maha Aarti, Akhand Kirtan & Grand Prasadam Feast for 25,000+ devotees.",
      imageUrl: "assets/images/janmashtami_banner.jpg",
      image: "assets/images/janmashtami_banner.jpg",
      highlights: ["108 Kalash Abhishek", "Maha Chappan Bhog", "Midnight Aarti", "Cultural Programs"],
      speaker: "His Holiness Radhanath Swami Maharaj",
      registrationRequired: true,
      freeEntry: true,
      targetPlatform: "both"
    },
    {
      id: "radhashtami-2026",
      title: "Srimati Radharani Appearance Day",
      category: "Festival",
      date: "September 19, 2026",
      time: "07:30 AM - 02:00 PM",
      location: "Temple Sanctuary",
      description: "Divine Pushpa Abhishek of Srimati Radharani with over 500 kg of fresh scented flowers and special Katha.",
      shortDesc: "Divine Pushpa Abhishek of Srimati Radharani with over 500 kg of fresh scented flowers and special Katha.",
      fullDesc: "Divine Pushpa Abhishek of Srimati Radharani with over 500 kg of fresh scented flowers and special Katha.",
      imageUrl: "https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?q=80&w=1000&auto=format&fit=crop",
      image: "https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?q=80&w=1000&auto=format&fit=crop",
      highlights: ["500kg Flower Abhishek", "Special Radharani Katha", "Royal Feast"],
      speaker: "Temple President & Senior Vaisnavas",
      registrationRequired: false,
      freeEntry: true,
      targetPlatform: "app"
    }
  ];

  const DEFAULT_SCHEDULE = [
    { id: "sch-1", name: "Mangala Aarti (Awakening & Sri Gurvashtaka)", time: "05:00 AM", duration: "45 mins", active: true, targetPlatform: "both" },
    { id: "sch-2", name: "Darshan Aarti (Morning Shringar Darshan & Govindam)", time: "07:45 AM", duration: "5 mins", active: true, targetPlatform: "both" },
    { id: "sch-3", name: "Guru Puja (Srila Prabhupada Pushpanjali)", time: "07:50 AM", duration: "10 mins", active: true, targetPlatform: "both" },
    { id: "sch-4", name: "Srimad Bhagavatam Class (Daily Scripture Lecture)", time: "08:00 AM", duration: "1 hr", active: true, targetPlatform: "both" },
    { id: "sch-5", name: "Rajbhog Aarti (Grand Midday Offering)", time: "12:00 PM", duration: "30 mins", active: true, targetPlatform: "both" },
    { id: "sch-6", name: "Temple Closes (Afternoon Rest / Sayana)", time: "01:00 PM", duration: "Rest", active: true, targetPlatform: "both" },
    { id: "sch-7", name: "Dhoop Aarti (Temple Reopens & Incense Offering)", time: "04:45 PM", duration: "30 mins", active: true, targetPlatform: "both" },
    { id: "sch-8", name: "Sandhya Aarti (Evening Gaura Aarti & Kirtan)", time: "07:00 PM", duration: "30 mins", active: true, targetPlatform: "both" },
    { id: "sch-9", name: "Bhagavad Gita Class (Evening Discourse)", time: "07:30 PM", duration: "45 mins", active: true, targetPlatform: "both" },
    { id: "sch-10", name: "Shayan Aarti (Final Night Aarti & Temple Closes)", time: "08:45 PM", duration: "15 mins", active: true, targetPlatform: "both" }
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
      address: "Gandhidham, Gujarat",
      status: "SUCCESS"
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
      address: "Adipur, Kutch",
      status: "SUCCESS"
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
      address: "Ahmedabad, Gujarat",
      status: "SUCCESS"
    }
  ];

  const DEFAULT_VOLUNTEERS = [
    {
      id: "VOL-101",
      fullName: "Amitabh Shah",
      name: "Amitabh Shah",
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
      name: "Sneha Trivedi",
      phone: "+91 97234 55667",
      email: "sneha.trivedi@example.com",
      interest: "Prasadam Serving & Kitchen Assistance",
      availability: "Sunday Mornings",
      status: "pending",
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
      this.darshans = [...DEFAULT_DARSHAN];
      this.quotes = [...DEFAULT_QUOTES];
      this.events = [...DEFAULT_EVENTS];
      this.schedule = [...DEFAULT_SCHEDULE];
      this.donations = [...DEFAULT_DONATIONS];
      this.volunteers = [...DEFAULT_VOLUNTEERS];
      this.enquiries = [];
      this.announcement = { ...DEFAULT_ANNOUNCEMENT };
      this.liveStream = { ...DEFAULT_YOUTUBE_LIVE };
      this.mediaAudio = [...DEFAULT_MEDIA_AUDIO];
      this.mediaVideo = [...DEFAULT_MEDIA_VIDEO];

      // Loading and error state registry
      this.loadingStates = {};
      this.errorStates = {};
      this.listenersActive = false;

      // Start listeners when admin authenticates
      window.addEventListener("admin:auth-changed", (e) => {
        if (e.detail && e.detail.authenticated) {
          this.initFirestoreSync();
        }
      });
    }

    initFirestoreSync() {
      if (this.listenersActive) return;
      this.listenersActive = true;

      try {
        // 1. Darshan
        this._setLoading("darshan", true);
        onSnapshot(collection(db, "darshan"), (snapshot) => {
          this._setLoading("darshan", false);
          this._setError("darshan", null);
          if (!snapshot.empty) {
            this.darshans = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          }
          this._triggerViewRefresh("darshan");
        }, (err) => {
          this._setLoading("darshan", false);
          this._setError("darshan", err);
          this._triggerViewRefresh("darshan");
        });

        // 2. Events
        this._setLoading("events", true);
        onSnapshot(collection(db, "events"), (snapshot) => {
          this._setLoading("events", false);
          this._setError("events", null);
          if (!snapshot.empty) {
            this.events = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          }
          this._triggerViewRefresh("events");
        }, (err) => {
          this._setLoading("events", false);
          this._setError("events", err);
          this._triggerViewRefresh("events");
        });

        // 3. Aarti Schedule
        this._setLoading("schedule", true);
        onSnapshot(collection(db, "aartiSchedule"), (snapshot) => {
          this._setLoading("schedule", false);
          this._setError("schedule", null);
          if (!snapshot.empty) {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const hasLegacyStaleData = list.some(item =>
              (item.time && (item.time.includes("4:30") || item.time.includes("04:30"))) ||
              (item.name && item.name.includes("4:30"))
            );
            if (hasLegacyStaleData) {
              this.schedule = [...DEFAULT_SCHEDULE];
            } else {
              this.schedule = list;
            }
          } else {
            this.schedule = [...DEFAULT_SCHEDULE];
          }
          this._triggerViewRefresh("schedule");
        }, (err) => {
          this._setLoading("schedule", false);
          this._setError("schedule", err);
          this._triggerViewRefresh("schedule");
        });

        // 4. Donations (Admin only)
        this._setLoading("donations", true);
        onSnapshot(collection(db, "donations"), (snapshot) => {
          this._setLoading("donations", false);
          this._setError("donations", null);
          if (!snapshot.empty) {
            this.donations = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          }
          this._triggerViewRefresh("donations");
        }, (err) => {
          this._setLoading("donations", false);
          this._setError("donations", err);
          this._triggerViewRefresh("donations");
        });

        // 5. Volunteers (Admin only)
        this._setLoading("volunteers", true);
        onSnapshot(collection(db, "volunteers"), (snapshot) => {
          this._setLoading("volunteers", false);
          this._setError("volunteers", null);
          if (!snapshot.empty) {
            this.volunteers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          }
          this._triggerViewRefresh("volunteers");
        }, (err) => {
          this._setLoading("volunteers", false);
          this._setError("volunteers", err);
          this._triggerViewRefresh("volunteers");
        });

        // 6. Enquiries (Admin only)
        this._setLoading("enquiries", true);
        onSnapshot(collection(db, "enquiries"), (snapshot) => {
          this._setLoading("enquiries", false);
          this._setError("enquiries", null);
          if (!snapshot.empty) {
            this.enquiries = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          }
          this._triggerViewRefresh("enquiries");
        }, (err) => {
          this._setLoading("enquiries", false);
          this._setError("enquiries", err);
          this._triggerViewRefresh("enquiries");
        });

        // 7. Announcement
        this._setLoading("announcement", true);
        onSnapshot(doc(db, "announcements", "current"), (docSnap) => {
          this._setLoading("announcement", false);
          this._setError("announcement", null);
          if (docSnap.exists()) {
            this.announcement = { ...DEFAULT_ANNOUNCEMENT, ...docSnap.data() };
          }
          this._triggerViewRefresh("announcement");
        }, (err) => {
          this._setLoading("announcement", false);
          this._setError("announcement", err);
          this._triggerViewRefresh("announcement");
        });

        // 8. LiveStream
        this._setLoading("youtube", true);
        onSnapshot(doc(db, "liveStream", "status"), (docSnap) => {
          this._setLoading("youtube", false);
          this._setError("youtube", null);
          if (docSnap.exists()) {
            this.liveStream = { ...DEFAULT_YOUTUBE_LIVE, ...docSnap.data() };
          }
          this._triggerViewRefresh("youtube");
        }, (err) => {
          this._setLoading("youtube", false);
          this._setError("youtube", err);
          this._triggerViewRefresh("youtube");
        });

        // 9. Quotes
        this._setLoading("quotes", true);
        onSnapshot(collection(db, "quotes"), (snapshot) => {
          this._setLoading("quotes", false);
          this._setError("quotes", null);
          if (!snapshot.empty) {
            this.quotes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          }
          this._triggerViewRefresh("darshan");
        }, (err) => {
          this._setLoading("quotes", false);
          this._setError("quotes", err);
          this._triggerViewRefresh("darshan");
        });

        // 10. Media Audio
        this._setLoading("mediaAudio", true);
        onSnapshot(collection(db, "mediaAudio"), (snapshot) => {
          this._setLoading("mediaAudio", false);
          this._setError("mediaAudio", null);
          if (!snapshot.empty) {
            this.mediaAudio = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          }
          this._triggerViewRefresh("media");
        }, (err) => {
          this._setLoading("mediaAudio", false);
          this._setError("mediaAudio", err);
          this._triggerViewRefresh("media");
        });

        // 11. Media Video
        this._setLoading("mediaVideo", true);
        onSnapshot(collection(db, "mediaVideo"), (snapshot) => {
          this._setLoading("mediaVideo", false);
          this._setError("mediaVideo", null);
          if (!snapshot.empty) {
            this.mediaVideo = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          }
          this._triggerViewRefresh("media");
        }, (err) => {
          this._setLoading("mediaVideo", false);
          this._setError("mediaVideo", err);
          this._triggerViewRefresh("media");
        });

      } catch (err) {
        console.warn("[AdminStore] Error initializing Firestore sync:", err);
      }
    }

    _setLoading(viewKey, isLoading) {
      this.loadingStates[viewKey] = isLoading;
    }

    _setError(viewKey, err) {
      if (!err) {
        delete this.errorStates[viewKey];
        return;
      }
      let userFriendly = err.message || "Failed to load data from Firestore.";
      if (err.code === "permission-denied") {
        userFriendly = "Permission Denied: Your admin credentials do not have access to this collection. Check firestore.rules and your admins document.";
      } else if (err.code === "unavailable" || err.message?.includes("offline")) {
        userFriendly = "Firestore is currently offline or unreachable. Please check your internet connection.";
      }
      this.errorStates[viewKey] = userFriendly;
    }

    getViewState(viewKey) {
      return {
        loading: Boolean(this.loadingStates[viewKey]),
        error: this.errorStates[viewKey] || null
      };
    }

    _triggerViewRefresh(viewKey) {
      window.dispatchEvent(new CustomEvent("admin:data-updated", { detail: { view: viewKey } }));
    }

    // Platform Target Badge Helper
    getTargetBadgeHTML(target) {
      if (target === 'website') return `<span class="badge badge-target-website">🌐 Website Only</span>`;
      if (target === 'app') return `<span class="badge badge-target-app">📱 Mobile App Only</span>`;
      return `<span class="badge badge-target-both">🌐+📱 Both (Website & App)</span>`;
    }

    // --- 1. DARSHAN CRUD ---
    getDarshans() {
      return this.darshans;
    }

    getTodayDarshan() {
      return this.darshans.find(d => d.active) || this.darshans[0] || null;
    }

    async addOrUpdateDarshan(darshanData) {
      const docId = darshanData.id || `darshan-${Date.now()}`;
      const payload = {
        id: docId,
        date: darshanData.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        title: darshanData.title || (darshanData.deity ? `${darshanData.deity} Darshan` : "Daily Darshan"),
        deity: darshanData.deity || "Sri Sri Radha Madanmohanji",
        tag: darshanData.tag || "Daily Sacred Darshan",
        imageUrl: darshanData.imageUrl || darshanData.image || "assets/images/darshan_today.jpg",
        image: darshanData.imageUrl || darshanData.image || "assets/images/darshan_today.jpg",
        attire: darshanData.attire || "",
        message: darshanData.message || darshanData.quote || "",
        quote: darshanData.quote || darshanData.message || "",
        alankara: darshanData.alankara || "",
        active: Boolean(darshanData.active),
        contentType: darshanData.contentType || "image",
        targetPlatform: darshanData.targetPlatform || "both",
        updatedAt: serverTimestamp()
      };

      // If making active, deactivate others in memory immediately
      if (payload.active) {
        this.darshans.forEach(d => { if (d.id !== docId) d.active = false; });
      }

      // Update in local memory
      const idx = this.darshans.findIndex(d => d.id === docId);
      if (idx !== -1) {
        this.darshans[idx] = { ...this.darshans[idx], ...payload };
      } else {
        this.darshans.unshift(payload);
      }

      // Write to Firestore collection "darshan"
      await setDoc(doc(db, "darshan", docId), payload);
      return payload;
    }

    async deleteDarshan(id) {
      this.darshans = this.darshans.filter(d => d.id !== id);
      await deleteDoc(doc(db, "darshan", id));
      return true;
    }

    async setDarshanActive(id) {
      const batch = writeBatch(db);
      this.darshans.forEach(d => {
        const isTarget = (d.id === id);
        d.active = isTarget;
        batch.update(doc(db, "darshan", d.id), {
          active: isTarget,
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
      return this.darshans;
    }

    // --- 2. QUOTES CRUD ---
    getQuotes() {
      return this.quotes;
    }

    async saveQuote(quoteData) {
      const docId = quoteData.id || `quote-${Date.now()}`;
      const payload = {
        id: docId,
        date: quoteData.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        contentType: "quote",
        text: quoteData.text || "",
        author: quoteData.author || "Srila Prabhupada",
        category: quoteData.category || "Vedic Wisdom",
        bgStyle: quoteData.bgStyle || "saffron-gradient",
        targetPlatform: quoteData.targetPlatform || "both",
        active: true,
        updatedAt: serverTimestamp()
      };
      const idx = this.quotes.findIndex(q => q.id === docId);
      if (idx !== -1) {
        this.quotes[idx] = payload;
      } else {
        this.quotes.unshift(payload);
      }
      await setDoc(doc(db, "quotes", docId), payload);
      return payload;
    }

    async deleteQuote(id) {
      this.quotes = this.quotes.filter(q => q.id !== id);
      await deleteDoc(doc(db, "quotes", id));
      return this.quotes;
    }

    // --- 3. EVENTS CRUD ---
    getEvents() {
      return this.events;
    }

    async saveEvent(eventData) {
      const docId = eventData.id || `evt-${Date.now()}`;
      const descText = eventData.description || eventData.shortDesc || eventData.fullDesc || "";
      const imgPath = eventData.imageUrl || eventData.image || "assets/images/darshan_today.jpg";
      const payload = {
        id: docId,
        title: (eventData.title || "Temple Event").trim(),
        category: eventData.category || "Festival",
        date: eventData.date || "",
        time: eventData.time || "",
        location: eventData.location || "Temple Hall",
        description: descText,
        shortDesc: descText,
        fullDesc: descText,
        speaker: eventData.speaker || "",
        imageUrl: imgPath,
        image: imgPath,
        highlights: Array.isArray(eventData.highlights) ? eventData.highlights : [],
        registrationRequired: Boolean(eventData.registrationRequired),
        freeEntry: eventData.freeEntry !== false,
        targetPlatform: eventData.targetPlatform || "both",
        updatedAt: serverTimestamp()
      };

      const idx = this.events.findIndex(e => e.id === docId);
      if (idx !== -1) {
        this.events[idx] = { ...this.events[idx], ...payload };
      } else {
        this.events.unshift(payload);
      }

      await setDoc(doc(db, "events", docId), payload);
      return payload;
    }

    async deleteEvent(id) {
      this.events = this.events.filter(e => e.id !== id);
      await deleteDoc(doc(db, "events", id));
      return true;
    }

    // --- 4. AARTI SCHEDULE CRUD ---
    getSchedule() {
      return this.schedule;
    }

    async saveSchedule(scheduleList) {
      this.schedule = [...scheduleList];
      // Save each item to Firestore "aartiSchedule"
      for (const item of scheduleList) {
        const docId = item.id || `sch-${Date.now()}`;
        await setDoc(doc(db, "aartiSchedule", docId), {
          ...item,
          id: docId,
          updatedAt: serverTimestamp()
        });
      }
      return this.schedule;
    }

    // --- 5. DONATIONS & 80G LEDGER ---
    getDonations() {
      return this.donations;
    }

    async recordDonation(donation) {
      const refNumber = donation.id || `ISK-GD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const now = new Date();
      const payload = {
        id: refNumber,
        transactionId: donation.transactionId || `TXN-${Date.now()}`,
        date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timestamp: now.getTime(),
        donorName: (donation.donorName || "Devotee").trim().slice(0, 100),
        email: (donation.email || "").trim().slice(0, 100),
        phone: (donation.phone || "").trim().slice(0, 30),
        pan: (donation.pan || "").trim().toUpperCase().slice(0, 10) || null,
        address: (donation.address || "Gandhidham, India").trim().slice(0, 500),
        amount: Number(donation.amount) || 501,
        purpose: (donation.purpose || "General Temple Seva").slice(0, 200),
        paymentMethod: donation.paymentMethod || "UPI / QR Code",
        taxExempt: true,
        status: donation.status || "SUCCESS",
        updatedAt: serverTimestamp()
      };

      this.donations.unshift(payload);
      await setDoc(doc(db, "donations", refNumber), payload);
      return payload;
    }

    // Export Donations Ledger CSV
    exportDonationsCSV() {
      const donations = this.getDonations();
      let csv = "Donation ID,Donor Name,Amount (INR),Purpose,Payment Method,Transaction ID,PAN Number,Date,Status,Tax Exempt\n";
      donations.forEach(d => {
        const idSafe = String(d.id || '').replace(/"/g, '""');
        const nameSafe = String(d.donorName || '').replace(/"/g, '""');
        const purposeSafe = String(d.purpose || '').replace(/"/g, '""');
        const panSafe = String(d.pan || 'N/A').replace(/"/g, '""');
        const methodSafe = String(d.paymentMethod || '').replace(/"/g, '""');
        const txnSafe = String(d.transactionId || '').replace(/"/g, '""');
        const dateSafe = String(d.date || '').replace(/"/g, '""');
        const statusSafe = String(d.status || '').replace(/"/g, '""');
        csv += `"${idSafe}","${nameSafe}","${d.amount}","${purposeSafe}","${methodSafe}","${txnSafe}","${panSafe}","${dateSafe}","${statusSafe}","${d.taxExempt ? 'Yes (80G)' : 'No'}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ISKCON_Gandhidham_Donations_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // --- 6. VOLUNTEERS CRUD ---
    getVolunteers() {
      return this.volunteers;
    }

    async updateVolunteerStatus(id, newStatus) {
      const vol = this.volunteers.find(v => v.id === id);
      if (vol) {
        vol.status = newStatus;
      }
      await updateDoc(doc(db, "volunteers", id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      return this.volunteers;
    }

    // --- 7. ENQUIRIES CRUD ---
    getEnquiries() {
      return this.enquiries;
    }

    async updateEnquiryStatus(id, newStatus) {
      const inq = this.enquiries.find(e => e.id === id);
      if (inq) {
        inq.status = newStatus;
      }
      await updateDoc(doc(db, "enquiries", id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      return this.enquiries;
    }

    // --- 8. ANNOUNCEMENT CRUD ---
    getAnnouncement() {
      return this.announcement;
    }

    async saveAnnouncement(ann) {
      this.announcement = { ...ann };
      await setDoc(doc(db, "announcements", "current"), {
        ...ann,
        updatedAt: serverTimestamp()
      });
      return this.announcement;
    }

    // --- 9. YOUTUBE LIVE CRUD ---
    getYouTubeLive() {
      return this.liveStream;
    }

    async saveYouTubeLive(cfg) {
      this.liveStream = { ...cfg };
      await setDoc(doc(db, "liveStream", "status"), {
        ...cfg,
        updatedAt: serverTimestamp()
      });
      return this.liveStream;
    }

    // --- 10. MEDIA (AUDIO / VIDEO) ---
    getMediaAudio() { return this.mediaAudio; }
    getMediaVideo() { return this.mediaVideo; }

    async saveMediaAudio(audio) {
      const docId = audio.id || `aud-${Date.now()}`;
      const payload = {
        id: docId,
        title: audio.title || "Kirtan",
        artist: audio.artist || "Devotee",
        category: audio.category || "Kirtan",
        url: audio.url || "",
        duration: audio.duration || "30:00",
        targetPlatform: audio.targetPlatform || "both",
        updatedAt: serverTimestamp()
      };
      const idx = this.mediaAudio.findIndex(a => a.id === docId);
      if (idx !== -1) {
        this.mediaAudio[idx] = payload;
      } else {
        this.mediaAudio.unshift(payload);
      }
      await setDoc(doc(db, "mediaAudio", docId), payload);
      return this.mediaAudio;
    }

    async deleteMediaAudio(id) {
      this.mediaAudio = this.mediaAudio.filter(a => a.id !== id);
      await deleteDoc(doc(db, "mediaAudio", id));
      return this.mediaAudio;
    }

    async saveMediaVideo(video) {
      const docId = video.id || `vid-${Date.now()}`;
      const payload = {
        id: docId,
        title: video.title || "Discourse",
        youtubeId: video.youtubeId || "",
        category: video.category || "Discourse",
        targetPlatform: video.targetPlatform || "both",
        updatedAt: serverTimestamp()
      };
      const idx = this.mediaVideo.findIndex(v => v.id === docId);
      if (idx !== -1) {
        this.mediaVideo[idx] = payload;
      } else {
        this.mediaVideo.unshift(payload);
      }
      await setDoc(doc(db, "mediaVideo", docId), payload);
      return this.mediaVideo;
    }

    async deleteMediaVideo(id) {
      this.mediaVideo = this.mediaVideo.filter(v => v.id !== id);
      await deleteDoc(doc(db, "mediaVideo", id));
      return this.mediaVideo;
    }

    // --- 11. ONE-TIME SEED FIRESTORE FROM DEFAULTS ---
    /**
     * Seeds Firestore from static data.js and default records.
     * Note: Leaves Gita, Brahma Samhita, and mantras in static files!
     * Idempotent: Uses fixed document IDs with setDoc(..., { merge: true }).
     */
    async seedFirestoreDefaults() {
      const data = window.TEMPLE_DATA || {};

      const safeSet = async (colName, docId, docData) => {
        try {
          await setDoc(doc(db, colName, docId), docData, { merge: true });
        } catch (err) {
          console.error(`[AdminStore] Firestore write denied or failed for collection "${colName}" (docId: "${docId}"):`, err.code || err.message, err);
          const error = new Error(`Write denied for collection "${colName}": ${err.message || err.code || "Permission Denied"}`);
          error.collection = colName;
          error.code = err.code;
          throw error;
        }
      };

      // 1. Events
      const eventsList = (Array.isArray(data.events) && data.events.length > 0)
        ? data.events
        : DEFAULT_EVENTS;
      for (const evt of eventsList) {
        const descText = evt.description || evt.shortDesc || evt.fullDesc || "";
        const imgPath = evt.imageUrl || evt.image || "assets/images/darshan_today.jpg";
        await safeSet("events", evt.id, {
          ...evt,
          imageUrl: imgPath,
          image: imgPath,
          description: descText,
          shortDesc: descText,
          fullDesc: descText,
          updatedAt: serverTimestamp()
        });
      }

      // 2. Darshan
      const darshanList = (Array.isArray(data.darshanGallery) && data.darshanGallery.length > 0)
        ? data.darshanGallery
        : DEFAULT_DARSHAN;
      for (const d of darshanList) {
        const imgPath = d.imageUrl || d.image || "assets/images/darshan_today.jpg";
        const msgText = d.message || d.quote || "";
        await safeSet("darshan", d.id, {
          ...d,
          imageUrl: imgPath,
          image: imgPath,
          message: msgText,
          quote: msgText,
          updatedAt: serverTimestamp()
        });
      }

      // 3. Aarti Schedule
      const schedList = DEFAULT_SCHEDULE;
      for (const s of schedList) {
        await safeSet("aartiSchedule", s.id, {
          ...s,
          desc: s.desc || s.description || "",
          description: s.description || s.desc || "",
          updatedAt: serverTimestamp()
        });
      }

      // 4. Sevas
      const sevaList = (Array.isArray(data.sevaCategories) && data.sevaCategories.length > 0)
        ? data.sevaCategories
        : [];
      for (const seva of sevaList) {
        await safeSet("sevas", seva.id, {
          ...seva,
          updatedAt: serverTimestamp()
        });
      }

      // 5. Announcements (single doc 'current')
      await safeSet("announcements", "current", {
        ...DEFAULT_ANNOUNCEMENT,
        updatedAt: serverTimestamp()
      });

      // 6. LiveStream (single doc 'status')
      await safeSet("liveStream", "status", {
        ...DEFAULT_YOUTUBE_LIVE,
        updatedAt: serverTimestamp()
      });

      // 7. Seed Initial Donations
      for (const d of DEFAULT_DONATIONS) {
        await safeSet("donations", d.id, {
          ...d,
          createdAt: serverTimestamp()
        });
      }

      // 8. Seed Initial Volunteers
      for (const v of DEFAULT_VOLUNTEERS) {
        await safeSet("volunteers", v.id, {
          ...v,
          createdAt: serverTimestamp()
        });
      }

      // 9. Seed Quotes
      for (const q of DEFAULT_QUOTES) {
        await safeSet("quotes", q.id, {
          ...q,
          updatedAt: serverTimestamp()
        });
      }

      // 10. Seed Media Audio
      for (const a of DEFAULT_MEDIA_AUDIO) {
        await safeSet("mediaAudio", a.id, {
          ...a,
          updatedAt: serverTimestamp()
        });
      }

      // 11. Seed Media Video
      for (const v of DEFAULT_MEDIA_VIDEO) {
        await safeSet("mediaVideo", v.id, {
          ...v,
          updatedAt: serverTimestamp()
        });
      }

      return true;
    }
  }

  // Expose global instance
  window.adminStore = new AdminStore();
})();
