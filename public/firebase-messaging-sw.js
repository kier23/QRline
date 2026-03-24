// firebase-messaging-sw.js

// 1️⃣ Import Firebase modular SDK scripts
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getMessaging, onBackgroundMessage } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-sw.js";

// 2️⃣ Initialize Firebase
const firebaseApp = initializeApp({
  apiKey: "AIzaSyAx7qbBDkGb9wLkp8AcH8PG8ofy9S5moKY",
  authDomain: "payflow-e3a44.firebaseapp.com",
  projectId: "payflow-e3a44",
  messagingSenderId: "575188235068",
  appId: "1:575188235068:web:10ed57fd3f56a4f76a2439",
});

// 3️⃣ Get messaging instance
const messaging = getMessaging(firebaseApp);

// 4️⃣ Handle background messages (data-only FCM)
onBackgroundMessage(messaging, (payload) => {
  console.log("Background message received:", payload);

  const title = payload.data?.title || "Queue Update";
  const body = payload.data?.body || "You have a new update.";
  const url = payload.data?.url || "/";

  const options = {
    body,
    icon: "/PayFlow-Logo_192.png",
    badge: "/PayFlow-Logo_192.png",
    image: "/screenshot1.jpg",       // optional preview
    tag: `queue-${Date.now()}`,      // unique to prevent stacking
    renotify: true,
    requireInteraction: true,        // stay until user interacts
    vibrate: [200, 100, 200],
    data: { url },
    actions: [
      { action: "view", title: "View Queue" },
      { action: "dismiss", title: "Dismiss" }
    ]
  };

  self.registration.showNotification(title, options);
});

// 5️⃣ Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";
  const action = event.action;

  if (action === "dismiss") return; // just close notification

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// 6️⃣ Service Worker lifecycle
self.addEventListener("install", (event) => {
  console.log("Service worker installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service worker activated");
  event.waitUntil(self.clients.claim());
});