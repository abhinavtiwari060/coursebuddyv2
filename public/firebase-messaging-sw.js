importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-messaging-compat.js');

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

try {
  if (!firebase.apps.length) {
    firebase.initializeApp({
      apiKey: "AIzaSyDgqW-qu4H1hqTu2OcRoD_BaHjWmC25gsY",
      authDomain: "coursebuddy-8ff70.firebaseapp.com",
      projectId: "coursebuddy-8ff70",
      messagingSenderId: "592076758398",
      appId: "1:592076758398:web:209ef11931c8e93b94672f",
    });
  }

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    const title = payload.notification?.title || payload.data?.title || "StudyMate Notification";
    const options = {
      body: payload.notification?.body || payload.data?.body || "",
      icon: "/icon-192.svg",
      badge: "/icon-192.svg",
      data: payload.data || {}
    };

    self.registration.showNotification(title, options);
  });
} catch (swInitErr) {
  console.warn('[SW] Firebase messaging background worker notice:', swInitErr?.message || swInitErr);
}