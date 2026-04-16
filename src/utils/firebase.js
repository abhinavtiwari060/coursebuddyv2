

// new correct code
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

// 🔥 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDgqW-qu4H1hqTu2OcRoD_BaHjWmC25gsY",
  authDomain: "coursebuddy-8ff70.firebaseapp.com",
  projectId: "coursebuddy-8ff70",
  storageBucket: "coursebuddy-8ff70.firebasestorage.app",
  messagingSenderId: "592076758398",
  appId: "1:592076758398:web:209ef11931c8e93b94672f",
  measurementId: "G-G6MZMXZYNX"
};

// ✅ SAFE INIT (important)
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

// 🔐 Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

// 🔔 Messaging (lazy init)
let messaging = null;

const initMessaging = async () => {
  if (messaging) return messaging;

  const supported = await isSupported();
  if (!supported) {
    console.log("❌ Messaging not supported");
    return null;
  }

  messaging = getMessaging(app);
  return messaging;
};

// 🚀 TOKEN GENERATE FUNCTION
export const requestForToken = async () => {
  try {
    // ✅ Step 1: Permission
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("❌ Notification permission denied");
      return null;
    }

    // ✅ Step 2: Service Worker
    let registration;

    if ("serviceWorker" in navigator) {
      registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        registration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js"
        );
      }

      console.log("✅ Service Worker Ready:", registration.scope);
    }

    // ✅ Step 3: Init messaging
    const msg = await initMessaging();
    if (!msg) return null;

    // ✅ Step 4: Get Token
    const currentToken = await getToken(msg, {
      vapidKey: "BDdb3-Hu3HaoQvfms_Jcx1r2Wm_Gv5HexHz9mI4BZnHhOHSVckJ33AqUm1hPqIsrxnXMTwS80XxRgh2MlI6cb4M",
      serviceWorkerRegistration: registration,
    });

    if (currentToken) {
      console.log("✅ FCM TOKEN:", currentToken);
      return currentToken;
    } else {
      console.log("❌ No token generated");
      return null;
    }
  } catch (err) {
    console.error("🔥 FCM ERROR:", err);
    return null;
  }
};

// 🔔 Foreground Notification Listener
export const onMessageListener = () =>
  new Promise(async (resolve) => {
    const msg = await initMessaging();
    if (!msg) return;

    onMessage(msg, (payload) => {
      console.log("📩 Foreground Message:", payload);
      resolve(payload);
    });
  });