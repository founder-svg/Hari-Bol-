/**
 * ISKCON Gandhidham — Public Site Store & Firestore Sync Layer
 * 
 * Works synchronously from bundled defaults in js/data.js first,
 * and updates from Firestore when data arrives (re-render on update).
 * The site never crashes if Firestore is empty, offline, or returns permission-denied.
 */

(function () {
  'use strict';

  const DEFAULT_ANNOUNCEMENT = {
    enabled: true,
    text: "🌸 Sri Krishna Janmashtami Mahotsav 2026 Celebrations from Sept 04! Join 108 Kalash Maha Abhishek & Akhand Kirtan.",
    linkText: "View Schedule",
    linkHash: "#/events/janmashtami-2026"
  };

  const DEFAULT_YOUTUBE_LIVE = {
    handle: "@iskcongandhidhamofficial",
    isLive: true,
    title: "🔴 Mangala Aarti & Srimad Bhagavatam Discourse — Live from ISKCON Gandhidham",
    videoId: "live_gandhidham_01",
    viewers: "1,420 watching"
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

  // Cached reference to dynamic Firebase module
  let firebaseModule = null;

  async function getFirebase() {
    if (!firebaseModule) {
      try {
        firebaseModule = await import("./firebase-init.js");
      } catch (err) {
        console.warn("[TempleStore] Failed to dynamically load Firebase:", err.message || err);
      }
    }
    return firebaseModule;
  }

  class TempleStore {
    constructor() {
      // Memory cache initialized synchronously with static defaults from js/data.js
      this.events = [];
      this.darshan = [];
      this.schedule = [];
      this.sevas = [];
      this.announcement = { ...DEFAULT_ANNOUNCEMENT };
      this.liveStream = { ...DEFAULT_YOUTUBE_LIVE };
      this.donations = [...DEFAULT_DONATIONS];
      this.quotes = [];
      this.mediaAudio = [];
      this.mediaVideo = [];

      this.initDataDefaults();
      this.initFirestoreSync();
    }

    // Populate in-memory fallback defaults synchronously from window.TEMPLE_DATA
    initDataDefaults() {
      const data = window.TEMPLE_DATA || {};
      if (Array.isArray(data.darshanGallery) && data.darshanGallery.length > 0) {
        this.darshan = [...data.darshanGallery];
      }
      if (Array.isArray(data.events) && data.events.length > 0) {
        this.events = [...data.events];
      }
      if (Array.isArray(data.schedule) && data.schedule.length > 0) {
        this.schedule = [...data.schedule];
      }
      if (Array.isArray(data.sevaCategories) && data.sevaCategories.length > 0) {
        this.sevas = [...data.sevaCategories];
      }
      if (data.youtubeChannel?.liveStream) {
        this.liveStream = { ...data.youtubeChannel.liveStream };
      }
      if (Array.isArray(data.articles) && data.articles.length > 0) {
        this.quotes = [...data.articles];
      }
      if (Array.isArray(data.kirtans) && data.kirtans.length > 0) {
        this.mediaAudio = [...data.kirtans];
      }
      if (Array.isArray(data.youtubeChannel?.videos) && data.youtubeChannel.videos.length > 0) {
        this.mediaVideo = [...data.youtubeChannel.videos];
      }
    }

    // Real-time Firestore synchronization in background
    async initFirestoreSync() {
      try {
        const fb = await getFirebase();
        if (!fb || !fb.db) return;

        const { db, collection, doc, onSnapshot } = fb;

        // 1. Events collection
        onSnapshot(collection(db, "events"), (snapshot) => {
          if (snapshot && !snapshot.empty) {
            this.events = snapshot.docs.map(d => {
              const data = d.data();
              const desc = data.shortDesc || data.description || data.fullDesc || "";
              const img = data.image || data.imageUrl || "assets/images/darshan_today.jpg";
              return {
                id: d.id,
                ...data,
                image: img,
                imageUrl: img,
                shortDesc: desc,
                description: desc,
                fullDesc: data.fullDesc || desc
              };
            });
            this._notifyChange("events");
          }
        }, (err) => {
          console.warn("[TempleStore] Events Firestore error; staying on static defaults:", err.code || err.message);
        });

        // 2. Darshan collection
        onSnapshot(collection(db, "darshan"), (snapshot) => {
          if (snapshot && !snapshot.empty) {
            this.darshan = snapshot.docs.map(d => {
              const data = d.data();
              const img = data.image || data.imageUrl || "assets/images/darshan_today.jpg";
              const msg = data.message || data.quote || "";
              return {
                id: d.id,
                ...data,
                image: img,
                imageUrl: img,
                message: msg,
                quote: msg
              };
            });
            this._notifyChange("darshan");
          }
        }, (err) => {
          console.warn("[TempleStore] Darshan Firestore error; staying on static defaults:", err.code || err.message);
        });

        // 3. Aarti Schedule collection
        onSnapshot(collection(db, "aartiSchedule"), (snapshot) => {
          if (snapshot && !snapshot.empty) {
            const list = snapshot.docs.map(d => {
              const data = d.data();
              return {
                id: d.id,
                ...data,
                desc: data.desc || data.description || "",
                description: data.description || data.desc || ""
              };
            });
            list.sort((a, b) => (a.order || 0) - (b.order || 0));
            this.schedule = list;
            this._notifyChange("schedule");
          }
        }, (err) => {
          console.warn("[TempleStore] Schedule Firestore error; staying on static defaults:", err.code || err.message);
        });

        // 4. Sevas collection
        onSnapshot(collection(db, "sevas"), (snapshot) => {
          if (snapshot && !snapshot.empty) {
            this.sevas = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            this._notifyChange("sevas");
          }
        }, (err) => {
          console.warn("[TempleStore] Sevas Firestore error; staying on static defaults:", err.code || err.message);
        });

        // 5. Announcements collection (single doc: 'current')
        onSnapshot(doc(db, "announcements", "current"), (docSnap) => {
          if (docSnap && docSnap.exists()) {
            this.announcement = { ...DEFAULT_ANNOUNCEMENT, ...docSnap.data() };
            this._notifyChange("announcements");
          }
        }, (err) => {
          console.warn("[TempleStore] Announcement Firestore error; staying on static defaults:", err.code || err.message);
        });

        // 6. Live Stream collection (single doc: 'status')
        onSnapshot(doc(db, "liveStream", "status"), (docSnap) => {
          if (docSnap && docSnap.exists()) {
            this.liveStream = { ...DEFAULT_YOUTUBE_LIVE, ...docSnap.data() };
            this._notifyChange("liveStream");
          }
        }, (err) => {
          console.warn("[TempleStore] LiveStream Firestore error; staying on static defaults:", err.code || err.message);
        });

        // 7. Quotes collection
        onSnapshot(collection(db, "quotes"), (snapshot) => {
          if (snapshot && !snapshot.empty) {
            this.quotes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            this._notifyChange("quotes");
          }
        }, (err) => {
          console.warn("[TempleStore] Quotes Firestore error; staying on static defaults:", err.code || err.message);
        });

        // 8. Media Audio collection
        onSnapshot(collection(db, "mediaAudio"), (snapshot) => {
          if (snapshot && !snapshot.empty) {
            this.mediaAudio = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            this._notifyChange("mediaAudio");
          }
        }, (err) => {
          console.warn("[TempleStore] MediaAudio Firestore error; staying on static defaults:", err.code || err.message);
        });

        // 9. Media Video collection
        onSnapshot(collection(db, "mediaVideo"), (snapshot) => {
          if (snapshot && !snapshot.empty) {
            this.mediaVideo = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            this._notifyChange("mediaVideo");
          }
        }, (err) => {
          console.warn("[TempleStore] MediaVideo Firestore error; staying on static defaults:", err.code || err.message);
        });

      } catch (err) {
        console.warn("[TempleStore] Background Firestore sync bypassed; operating on static defaults:", err);
      }
    }

    _notifyChange(collectionName) {
      window.dispatchEvent(new CustomEvent("temple-data-updated", { detail: { collection: collectionName } }));
    }

    // --- PUBLIC READ APIS (Synchronous access from memory cache) ---

    // Darshan
    getDarshan() {
      if (this.darshan && this.darshan.length > 0) return this.darshan;
      return window.TEMPLE_DATA?.darshanGallery || [];
    }

    getTodayDarshan() {
      const list = this.getDarshan();
      const active = list.find(d => d.active);
      return active || (list.length > 0 ? list[0] : null);
    }

    // Aarti Schedule
    getSchedule() {
      if (this.schedule && this.schedule.length > 0) return this.schedule;
      return window.TEMPLE_DATA?.schedule || [];
    }

    // Events
    getEvents() {
      if (this.events && this.events.length > 0) return this.events;
      return window.TEMPLE_DATA?.events || [];
    }

    getEventById(id) {
      return this.getEvents().find(e => e.id === id) || null;
    }

    // Sevas
    getSevas() {
      if (this.sevas && this.sevas.length > 0) return this.sevas;
      return window.TEMPLE_DATA?.sevaCategories || [];
    }

    getSevaById(id) {
      return this.getSevas().find(s => s.id === id) || null;
    }

    // Announcements & Live Stream
    getAnnouncement() {
      return this.announcement || DEFAULT_ANNOUNCEMENT;
    }

    getYouTubeLive() {
      return this.liveStream || DEFAULT_YOUTUBE_LIVE;
    }

    // Media & Quotes
    getMediaVideo() {
      if (this.mediaVideo && this.mediaVideo.length > 0) return this.mediaVideo;
      return window.TEMPLE_DATA?.youtubeChannel?.videos || [];
    }

    getMediaAudio() {
      if (this.mediaAudio && this.mediaAudio.length > 0) return this.mediaAudio;
      return window.TEMPLE_DATA?.kirtans || [];
    }

    getQuotes() {
      if (this.quotes && this.quotes.length > 0) return this.quotes;
      return window.TEMPLE_DATA?.articles || [];
    }

    // Donations (Local cache for receipt generation)
    getDonations() {
      return this.donations;
    }

    getDonationById(id) {
      return this.donations.find(d => d.id === id) || null;
    }

    // --- PUBLIC MUTATION APIS (Async write to Firestore with error resilience) ---

    /**
     * Record a new donation.
     * Writes to Firestore "donations" collection with status="pending" and serverTimestamp.
     */
    async recordDonation(donationData) {
      const safeAmount = Math.max(1, Math.min(Number(donationData.amount) || 1, 10000000));
      const cleanPan = (donationData.pan || "").trim().toUpperCase();
      const newRecord = {
        id: `ISK-GD-${Date.now().toString().slice(-6)}`,
        donorName: (donationData.donorName || "Anonymous Devotee").trim().slice(0, 100),
        email: (donationData.email || "").trim().slice(0, 100),
        phone: (donationData.phone || "").trim().slice(0, 30),
        pan: cleanPan.length > 0 ? cleanPan.slice(0, 10) : "",
        amount: safeAmount,
        purpose: (donationData.purpose || "General Temple Seva").slice(0, 200),
        paymentMethod: donationData.paymentMethod || "UPI / Online",
        transactionId: (donationData.transactionId || `TXN-${Date.now()}`).slice(0, 100),
        date: new Date().toISOString().replace('T', ' ').slice(0, 19),
        taxExempt: !!donationData.taxExempt,
        address: (donationData.address || "Gandhidham, Gujarat").slice(0, 300),
        status: "pending"
      };

      this.donations.unshift(newRecord);

      try {
        const fb = await getFirebase();
        if (fb && fb.db) {
          const docRef = await fb.addDoc(fb.collection(fb.db, "donations"), {
            ...newRecord,
            createdAt: fb.serverTimestamp()
          });
          newRecord.firestoreId = docRef.id;
        }
      } catch (err) {
        console.warn("[TempleStore] Firestore donation write error:", err.code || err.message);
      }

      return newRecord;
    }

    /**
     * Submit volunteer registration.
     * Writes to Firestore "volunteers" collection with status="pending" and serverTimestamp.
     */
    async submitVolunteer(vol) {
      const cleanName = (vol.name || vol.fullName || "").trim().slice(0, 100);
      const newVol = {
        name: cleanName,
        fullName: cleanName,
        phone: (vol.phone || "").trim().slice(0, 30),
        email: (vol.email || "").trim().slice(0, 100),
        age: vol.age ? String(vol.age).slice(0, 10) : "",
        interest: (vol.interest || "General Temple Service").slice(0, 200),
        availability: (vol.availability || "Weekends").slice(0, 100),
        message: (vol.message || "").trim().slice(0, 1000),
        status: "pending"
      };

      try {
        const fb = await getFirebase();
        if (fb && fb.db) {
          const docRef = await fb.addDoc(fb.collection(fb.db, "volunteers"), {
            ...newVol,
            createdAt: fb.serverTimestamp()
          });
          newVol.id = docRef.id;
        } else {
          newVol.id = `VOL-${Date.now()}`;
        }
      } catch (err) {
        console.warn("[TempleStore] Firestore volunteer write error:", err.code || err.message);
        newVol.id = `VOL-${Date.now()}`;
      }

      return newVol;
    }

    /**
     * Submit general inquiry or seva callback request.
     * Writes to Firestore "enquiries" collection with status="pending" and serverTimestamp.
     */
    async submitInquiry(inq) {
      const newInq = {
        name: (inq.name || "").trim().slice(0, 100),
        phone: (inq.phone || "").trim().slice(0, 30),
        email: (inq.email || "").trim().slice(0, 100),
        subject: (inq.subject || "General Inquiry").slice(0, 200),
        message: (inq.message || "").trim().slice(0, 1000),
        status: "pending"
      };

      try {
        const fb = await getFirebase();
        if (fb && fb.db) {
          const docRef = await fb.addDoc(fb.collection(fb.db, "enquiries"), {
            ...newInq,
            createdAt: fb.serverTimestamp()
          });
          newInq.id = docRef.id;
        } else {
          newInq.id = `INQ-${Date.now()}`;
        }
      } catch (err) {
        console.warn("[TempleStore] Firestore inquiry write error:", err.code || err.message);
        newInq.id = `INQ-${Date.now()}`;
      }

      return newInq;
    }

    /**
     * Event RSVP registration.
     * Saved to "enquiries" with type="event_rsvp" to comply with firestore.rules.
     */
    async registerForEvent(reg) {
      const newReg = {
        name: (reg.name || "").trim().slice(0, 100),
        phone: (reg.phone || "").trim().slice(0, 30),
        email: (reg.email || "").trim().slice(0, 100),
        subject: `Event RSVP: ${reg.eventId || "Temple Event"} (${reg.attendees || 1} attendees)`,
        message: `Event RSVP registration for ${reg.eventId || "Event"}. Attendees count: ${reg.attendees || 1}.`,
        type: "event_rsvp",
        eventId: String(reg.eventId || "general-event"),
        attendees: Number(reg.attendees) || 1,
        status: "pending"
      };

      try {
        const fb = await getFirebase();
        if (fb && fb.db) {
          const docRef = await fb.addDoc(fb.collection(fb.db, "enquiries"), {
            ...newReg,
            createdAt: fb.serverTimestamp()
          });
          newReg.id = docRef.id;
        } else {
          newReg.id = `REG-${Date.now()}`;
        }
      } catch (err) {
        console.warn("[TempleStore] Event RSVP write error:", err.code || err.message);
        newReg.id = `REG-${Date.now()}`;
      }

      return newReg;
    }
  }

  // Synchronously instantiate and expose global instance immediately
  window.templeStore = new TempleStore();
})();
