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

## 🔐 Admin Panel Access

- **Public Website URL**: `index.html` (or `/#/`)
- **Admin Panel URL**: `admin/index.html` (or `/#/admin`)
- **Default Credentials**:
  - Username / Ref ID: `iskcongim`
  - Password: `iskconrmm2023` (or `krishna108`)

---

## 🛠️ Features Included

- **Daily Divine Darshan Gallery** & High-Res Zoom Modal
- **Aarti & Temple Timings** with real-time countdown
- **Online Seva & 80G Tax Exemption** Booking System
- **Bhagavad Gita As It Is** Reader & Verse Finder
- **Upcoming Festivals & Events** Calendar
- **Full Admin CMS** for Darshan updates, Seva management, and 80G Tax Receipt Printing.
