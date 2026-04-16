import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDgqW-qu4H1hqTu2OcRoD_BaHjWmC25gsY",
  authDomain: "coursebuddy-8ff70.firebaseapp.com",
  projectId: "coursebuddy-8ff70",
  storageBucket: "coursebuddy-8ff70.firebasestorage.app",
  messagingSenderId: "592076758398",
  appId: "1:592076758398:web:209ef11931c8e93b94672f",
  measurementId: "G-G6MZMXZYNX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const messaging = getMessaging(app);

export const requestForToken = async () => {
  try {
    const currentToken = await getToken(messaging, { 
      vapidKey: 'BDdb3-Hu3HaoQvfms_Jcx1r2Wm_Gv5HexHz9ml4BZnHhOHSVckJ33AqUm1hPqlsrxnXMTwS80XxRgh2MlI6cb4M' 
    });
    if (currentToken) {
      console.log('Target FCM Token:', currentToken);
      return currentToken;
    } else {
      console.log('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (err) {
    console.log('An error occurred while retrieving token. ', err);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
