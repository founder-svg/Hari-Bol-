/**
 * ISKCON Gandhidham — Admin Authentication Module
 * 
 * Production authentication backed by Firebase Authentication (Email/Password)
 * and Firestore role authorization via the "admins" collection.
 * 
 * Exposes strictly:
 * - window.adminAuth.login(email, password) -> Promise<boolean>
 * - window.adminAuth.logout() -> Promise<void>
 * - window.adminAuth.isAuthenticated() -> boolean
 * - window.adminAuth.getSessionInfo() -> object | null
 */

import {
  auth,
  db,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc
} from "../../js/firebase-init.js";

(function () {
  'use strict';

  const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  // In-memory authentication state (no sensitive credentials in localStorage)
  let currentUser = null;
  let sessionData = null;
  let lastActiveTimestamp = Date.now();
  let isCheckingAuth = true;

  // Touch session timestamp on user interaction
  function touchSession() {
    if (currentUser) {
      lastActiveTimestamp = Date.now();
      if (sessionData) {
        sessionData.lastActive = lastActiveTimestamp;
      }
    }
  }

  // Check if session has exceeded inactivity duration
  function isSessionExpired() {
    if (!currentUser) return true;
    return (Date.now() - lastActiveTimestamp) > INACTIVITY_TIMEOUT_MS;
  }

  // 1. isAuthenticated()
  function isAuthenticated() {
    if (!currentUser) return false;
    if (isSessionExpired()) {
      logout();
      return false;
    }
    return true;
  }

  // 2. getSessionInfo()
  function getSessionInfo() {
    if (!isAuthenticated()) return null;
    return {
      username: currentUser.email || "Admin",
      email: currentUser.email || "",
      uid: currentUser.uid,
      role: sessionData?.role || "Temple Administrator",
      loginTime: sessionData?.loginTime || lastActiveTimestamp,
      lastActive: lastActiveTimestamp
    };
  }

  // 3. logout()
  async function logout() {
    currentUser = null;
    sessionData = null;
    try {
      await signOut(auth);
    } catch (e) {
      // Ignore network errors on signout
    }
    window.dispatchEvent(new CustomEvent("admin:auth-changed", { detail: { authenticated: false } }));
  }

  // 4. login(email, password) -> Promise<boolean>
  async function login(email, password) {
    const cleanEmail = (email || "").trim();
    const cleanPass = password || "";

    if (!cleanEmail || !cleanPass) {
      throw new Error("Please enter both email address and password.");
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      const user = userCredential.user;

      // Admin authorization: verify user's UID exists in Firestore collection "admins"
      const adminDocRef = doc(db, "admins", user.uid);
      const adminSnap = await getDoc(adminDocRef);

      if (!adminSnap.exists()) {
        await signOut(auth);
        currentUser = null;
        sessionData = null;
        throw new Error("Access denied");
      }

      const adminData = adminSnap.data() || {};
      currentUser = user;
      lastActiveTimestamp = Date.now();
      sessionData = {
        uid: user.uid,
        email: user.email,
        role: adminData.role || "Temple Administrator",
        loginTime: Date.now(),
        lastActive: lastActiveTimestamp
      };

      window.dispatchEvent(new CustomEvent("admin:auth-changed", { detail: { authenticated: true, user } }));
      return true;
    } catch (err) {
      // Map error codes to friendly security-safe messages
      let friendlyMessage = "Invalid credentials";

      if (err.message === "Access denied" || (err.message && err.message.toLowerCase().includes("access denied"))) {
        friendlyMessage = "Access denied";
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        friendlyMessage = "Invalid email or password.";
      } else if (err.code === "auth/invalid-email") {
        friendlyMessage = "Please enter a valid email address.";
      } else if (err.code === "auth/too-many-requests") {
        friendlyMessage = "Too many failed attempts. Access temporarily restricted. Try again later.";
      } else if (err.code === "auth/network-request-failed") {
        friendlyMessage = "Network error. Please check your internet connection.";
      } else if (err.code === "permission-denied") {
        friendlyMessage = "Access denied";
      }

      throw new Error(friendlyMessage);
    }
  }

  // Listen to Firebase Auth state persistence (handles page refreshes)
  onAuthStateChanged(auth, async (user) => {
    isCheckingAuth = false;
    if (user) {
      try {
        const adminDocRef = doc(db, "admins", user.uid);
        const adminSnap = await getDoc(adminDocRef);

        if (adminSnap.exists()) {
          const adminData = adminSnap.data() || {};
          currentUser = user;
          lastActiveTimestamp = Date.now();
          sessionData = {
            uid: user.uid,
            email: user.email,
            role: adminData.role || "Temple Administrator",
            loginTime: sessionData?.loginTime || Date.now(),
            lastActive: lastActiveTimestamp
          };
          window.dispatchEvent(new CustomEvent("admin:auth-changed", { detail: { authenticated: true, user } }));
        } else {
          // UID not found in admins collection -> revoke access
          await signOut(auth);
          currentUser = null;
          sessionData = null;
          window.dispatchEvent(new CustomEvent("admin:auth-changed", { detail: { authenticated: false, error: "Access denied" } }));
        }
      } catch (err) {
        await signOut(auth);
        currentUser = null;
        sessionData = null;
        window.dispatchEvent(new CustomEvent("admin:auth-changed", { detail: { authenticated: false, error: "Access denied" } }));
      }
    } else {
      currentUser = null;
      sessionData = null;
      window.dispatchEvent(new CustomEvent("admin:auth-changed", { detail: { authenticated: false } }));
    }
  });

  // Track user interaction for 30-minute inactivity auto-logout
  let activityThrottleTimer = null;
  function onUserActivity() {
    if (activityThrottleTimer) return;
    activityThrottleTimer = setTimeout(() => {
      activityThrottleTimer = null;
      if (isAuthenticated()) {
        touchSession();
      }
    }, 5000);
  }

  ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
    window.addEventListener(evt, onUserActivity, { passive: true });
  });

  // Periodic inactivity check
  setInterval(() => {
    if (currentUser && isSessionExpired()) {
      logout();
    }
  }, 15000);

  // Expose module interface
  window.adminAuth = {
    login,
    logout,
    isAuthenticated,
    getSessionInfo
  };
})();
