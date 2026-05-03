/* eslint-disable */
importScripts("https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js");
importScripts(
  "https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js"
);

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
firebase.initializeApp({
  apiKey: "ignored-in-sw-but-needed",
  authDomain: "ignored",
  projectId: "ignored",
  storageBucket: "ignored",
  messagingSenderId: "items-tracker-65369", // TODO: Replace with env or user config if possible, but SW doesn't access .env easily.
  // Ideally, user should hardcode this or we use a workaround.
  // For now, using a placeholder.
  appId: "ignored",
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/logo192.png", // Ensure this exists or use default
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
