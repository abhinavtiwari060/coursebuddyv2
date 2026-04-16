import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// 🔥 Firebase Config (same rahega)
const firebaseConfig = {
  apiKey: "AIzaSyDgqW-qu4H1hqTu2OcRoD_BaHjWmC25gsY",
  authDomain: "coursebuddy-8ff70.firebaseapp.com",
  projectId: "coursebuddy-8ff70",
  storageBucket: "coursebuddy-8ff70.firebasestorage.app",
  messagingSenderId: "592076758398",
  appId: "1:592076758398:web:209ef11931c8e93b94672f",
  measurementId: "G-G6MZMXZYNX"
};

// 🔥 Initialize Firebase
const app = initializeApp(firebaseConfig);

// 🔐 Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

// 🔔 Messaging
export const messaging = getMessaging(app);

// 🚀 TOKEN GENERATE FUNCTION
export const requestForToken = async () => {
  try {
    // ✅ Step 1: Permission
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("❌ Notification permission denied");
      return null;
    }

    // ✅ Step 2: Service Worker register (safe way)
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

    // ✅ Step 3: Get Token (🔥 MAIN PART)
    const currentToken = await getToken(messaging, {
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
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("📩 Foreground Message:", payload);
      resolve(payload);
    });
  });