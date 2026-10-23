import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from "firebase/auth";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

// Firebase Configuration: Prefers production environment variables, with safe fallbacks
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDgqW-qu4H1hqTu2OcRoD_BaHjWmC25gsY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "coursebuddy-8ff70.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "coursebuddy-8ff70",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "coursebuddy-8ff70.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "592076758398",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:592076758398:web:209ef11931c8e93b94672f",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-G6MZMXZYNX"
};

// Singleton Firebase App Initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Authentication setup
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

export const signOutFirebase = async () => {
  try {
    await fbSignOut(auth);
  } catch (err) {
    console.warn("[Firebase] Sign-out non-critical error:", err?.message || err);
  }
};

// Monitor Firebase Auth state to handle stale/expired refresh tokens cleanly
// Prevents recurring HTTP 400 errors to securetoken.googleapis.com
auth.onIdTokenChanged(async (currentUser) => {
  if (currentUser) {
    try {
      // Proactively test ID token refresh without forcing
      await currentUser.getIdToken(false);
    } catch (err) {
      const msg = err?.message || '';
      if (
        err?.code === 'auth/user-token-expired' ||
        msg.includes('INVALID_REFRESH_TOKEN') ||
        msg.includes('TOKEN_EXPIRED') ||
        err?.code === 'auth/invalid-user-token'
      ) {
        console.warn("[Firebase] Expired auth session detected, clearing stale tokens:", msg);
        await signOutFirebase();
      }
    }
  }
});

// Lazy-initialized messaging singleton
let messagingInstance = null;
let messagingSupportedPromise = null;

const checkMessagingSupport = () => {
  if (!messagingSupportedPromise) {
    messagingSupportedPromise = (async () => {
      try {
        if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
          return false;
        }
        return await isSupported();
      } catch {
        return false;
      }
    })();
  }
  return messagingSupportedPromise;
};

const initMessaging = async () => {
  if (messagingInstance) return messagingInstance;
  try {
    const supported = await checkMessagingSupport();
    if (!supported) return null;
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.warn("[Firebase] Messaging initialization error (non-fatal):", err?.message || err);
    return null;
  }
};

/**
 * Generates an FCM push token safely.
 * Returns null if unsupported, permission is denied, or initialization fails,
 * ensuring the rest of the application remains fully functional.
 */
export const requestForToken = async () => {
  try {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      return null;
    }

    if (Notification.permission === "denied") {
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return null;
    }

    // Register or find service worker
    let registration = null;
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      registration = registrations.find(
        (r) =>
          r.active?.scriptURL?.includes("firebase-messaging-sw") ||
          r.installing?.scriptURL?.includes("firebase-messaging-sw") ||
          r.waiting?.scriptURL?.includes("firebase-messaging-sw")
      );

      if (!registration) {
        registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
          scope: "/"
        });
      } else {
        try {
          await registration.update();
        } catch {
          // Ignore offline/network update error
        }
      }
    } catch (swErr) {
      console.warn("[Firebase] Service Worker registration note:", swErr?.message || swErr);
    }

    const msg = await initMessaging();
    if (!msg) return null;

    const vapidKey =
      import.meta.env.VITE_FIREBASE_VAPID_KEY ||
      "BDdb3-Hu3HaoQvfms_Jcx1r2Wm_Gv5HexHz9mI4BZnHhOHSVckJ33AqUm1hPqIsrxnXMTwS80XxRgh2MlI6cb4M";

    const tokenOptions = { vapidKey };
    if (registration) {
      tokenOptions.serviceWorkerRegistration = registration;
    }

    const currentToken = await getToken(msg, tokenOptions);
    return currentToken || null;
  } catch (err) {
    console.warn("[Firebase] Push notification setup handled gracefully:", err?.message || err);
    return null;
  }
};

/**
 * Listens for foreground FCM messages without throwing unhandled exceptions.
 */
export const onMessageListener = () =>
  new Promise((resolve) => {
    initMessaging()
      .then((msg) => {
        if (!msg) return;
        onMessage(msg, (payload) => {
          resolve(payload);
        });
      })
      .catch((err) => {
        console.warn("[Firebase] Foreground notification listener note:", err?.message || err);
      });
  });