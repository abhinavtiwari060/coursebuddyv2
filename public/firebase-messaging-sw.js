importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDgqW-qu4H1hqTu2OcRoD_BaHjWmC25gsY",
  authDomain: "coursebuddy-8ff70.firebaseapp.com",
  projectId: "coursebuddy-8ff70",
  messagingSenderId: "592076758398",
  appId: "1:592076758398:web:209ef11931c8e93b94672f",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message:', payload);

  const title = payload.notification?.title || "New Notification";
  const options = {
    body: payload.notification?.body || "",
    icon: "/icon-192.png"
  };

  self.registration.showNotification(title, options);
});