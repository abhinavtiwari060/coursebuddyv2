importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDgqW-qu4H1hqTu2OcRoD_BaHjWmC25gsY",
  authDomain: "coursebuddy-8ff70.firebaseapp.com",
  projectId: "coursebuddy-8ff70",
  storageBucket: "coursebuddy-8ff70.firebasestorage.app",
  messagingSenderId: "592076758398",
  appId: "1:592076758398:web:209ef11931c8e93b94672f",
  measurementId: "G-G6MZMXZYNX"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
