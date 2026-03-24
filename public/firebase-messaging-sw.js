// firebase-messaging-sw.js

importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyAx7qbBDkGb9wLkp8AcH8PG8ofy9S5moKY",
  authDomain: "payflow-e3a44.firebaseapp.com",
  projectId: "payflow-e3a44",
  messagingSenderId: "575188235068",
  appId: "1:575188235068:web:10ed57fd3f56a4f76a2439",
});

const messaging = firebase.messaging();

// 🔔 Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("Background message received:", payload);

  const title = payload?.data?.title || "Queue Update";
  const body = payload?.data?.body || "You have a new update.";
  const url = payload?.data?.url || "/";

  self.registration.showNotification(title, {
    body,
    icon: "/PayFlow-Logo_192.png",
    badge: "/PayFlow-Logo_192.png",
    tag: `queue-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { url },
  });
});

// 🖱 Handle click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});