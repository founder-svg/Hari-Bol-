# ISKCON Gandhidham — Official Website & Admin CMS

Welcome to the official web application for **ISKCON Gandhidham (Sri Sri Radha Madanmohanji Mandir)**.

This folder contains the complete, production-ready static web application and admin management system, ready for deployment on **GitHub Pages**, Vercel, Netlify, or any standard web server.

---

## 📁 Repository Structure

```
iskcon-gandhidham-website/
├── index.html                    # Main Public Website (Darshan, Seva, Aarti, Gita, Events)
├── .nojekyll                     # Ensures GitHub Pages serves all assets correctly
├── css/
│   └── style.css                 # Main Website Styling System
├── js/
│   ├── data.js                   # Temple Content & Master Data Store
│   ├── store.js                  # Dynamic LocalStorage & Cart Manager
│   └── app.js                    # SPA Hash Router & UI Controller
├── assets/
│   └── images/                   # Optimized High-Res Temple & Deity Images
│       └── gallery/              # Temple Photo Gallery (temple_photo_01 to 24)
└── admin/                        # Temple Admin CMS Control Center
    ├── index.html                # Admin Panel Main Interface
    ├── css/
    │   └── style.css             # Admin Custom Styling
    └── js/
        ├── admin-store.js        # Admin Data Store & 80G Receipt Generator
        └── admin-app.js          # Admin Authentication & CMS Management
```

---

## 🚀 How to Deploy on GitHub Pages

Follow these simple steps to host this website live on GitHub Pages:

### Method 1: Host as a New GitHub Repository (Recommended)

1. Open your terminal inside this folder (`iskcon-gandhidham-website`).
2. Initialize Git and commit all files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of ISKCON Gandhidham Website & Admin CMS"
   ```
3. Create a new repository on GitHub (e.g., `iskcon-gandhidham-website`).
4. Link your local repo to GitHub and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/iskcon-gandhidham-website.git
   git push -u origin main
   ```
5. On GitHub, navigate to:
   **Repository Settings** ➔ **Pages** ➔ under **Build and deployment / Source**, select `Deploy from a branch`.
6. Select branch `main` and folder `/ (root)` ➔ click **Save**.
7. Your live site will be published at:
   `https://YOUR_GITHUB_USERNAME.github.io/iskcon-gandhidham-website/`

---

## 🔐 Admin Panel Access & Authentication (Firebase Auth + Firestore)

- **Public Website URL**: `index.html` (or `/#/`)
- **Admin Panel URL**: `admin/index.html` (Direct URL; hidden from public site navigation)

Authentication and data storage are powered by **Firebase Authentication (Email + Password)** and **Cloud Firestore**, with zero build tools or npm dependencies.

---

## 🔥 Firebase Setup Guide (One-Time Setup)

### 1. Fill in Your Firebase Credentials
1. Go to the [Firebase Console](https://console.firebase.google.com/) and open (or create) your project.
2. In **Project Settings** ➔ **General** ➔ under **Your apps**, click the Web icon (`</>`) to register your web application.
3. Copy the `firebaseConfig` object and paste your credentials into `js/firebase-config.js`:
   ```javascript
   export const firebaseConfig = {
     apiKey: "YOUR_ACTUAL_API_KEY",
     authDomain: "your-project-id.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project-id.appspot.com",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

### 2. Enable Firebase Authentication
1. In the Firebase Console, go to **Build** ➔ **Authentication**.
2. Click **Get Started** (if first time), navigate to the **Sign-in method** tab.
3. Enable **Email/Password** provider and click **Save**.

### 3. Deploy Firestore Security Rules
1. In the Firebase Console, go to **Build** ➔ **Firestore Database**.
2. Create a database in **Production mode** and choose your nearest region (e.g. `asia-south1`).
3. Click on the **Rules** tab in the Firestore Database dashboard.
4. Copy the entire contents of the `firestore.rules` file located in the root of this repository.
5. Paste it into the Firebase Rules editor and click **Publish**.

### 4. Create the First Admin Account
For maximum security, admin privileges are gated strictly through Firestore document presence:
1. In **Authentication** ➔ **Users** tab, click **Add user**.
2. Enter your admin email (e.g. `admin@iskcongandhidham.com`) and choose a strong password.
3. Copy the generated **User UID** string (e.g. `dK91pLx4Yv...`).
4. Go to **Firestore Database** ➔ **Data** tab.
5. Click **Start collection**:
   - **Collection ID**: `admins`
   - **Document ID**: Paste the exact **User UID** copied in step 3
   - Add fields:
     - `email` (string): your admin email address
     - `role` (string): `Temple Administrator`
     - `createdAt` (timestamp): current date/time
6. Click **Save**.

> [!NOTE]
> Any authenticated user whose UID is NOT present in the `/admins` Firestore collection will be immediately rejected with "Access denied" and signed out automatically.

### 5. Import Default Data to Firestore (One-Click)
1. Open `admin/index.html` in your browser.
2. Log in using your admin email and password.
3. Click the **"📥 Import Default Data"** button in the top navigation bar.
4. Confirm the prompt. This automatically populates your Firestore collections (`events`, `darshan`, `aartiSchedule`, `sevas`, `announcements`, `liveStream`, initial donations, and volunteers) from the default temple data.
5. *Note*: Sacred static texts (the 700-verse Bhagavad Gita As It Is, Brahma Samhita, and Vaishnava prayers) remain served directly from fast static files (`js/data.js`).

### Built-in Safety Controls:
- **Zero LocalStorage for Shared Data**: All events, darshan, donations, volunteers, and schedules sync directly via Cloud Firestore.
- **Strict Firestore Security Rules**: Enforces admin-only writes; public forms (`donations`, `volunteers`, `enquiries`) can only `create` with validated fields and initial `"pending"` status.
- **Donor Privacy**: PAN and phone numbers are readable exclusively by authenticated admins. PAN is optional and designated specifically for 80G tax exemptions.
- **Session Auto-Logout**: Automatic session termination after 30 minutes of inactivity.
- **Search Engine Blocking**: `robots.txt` disallows `/admin/` and `admin/index.html` includes `<meta name="robots" content="noindex, nofollow">`.

---

## 🛠️ Features Included

- **Daily Divine Darshan Gallery** & High-Res Zoom Modal (Real-time Firestore sync)
- **Aarti & Temple Timings** with real-time countdown & admin sync
- **Online Seva & 80G Tax Exemption** Booking System with donor privacy protection
- **Bhagavad Gita As It Is** Complete 700-Verse Reader & Search
- **Upcoming Festivals & Events** Calendar
- **Full Admin Control Panel** with live sync, loading states, 80G Receipt Printing, and CSV export.
