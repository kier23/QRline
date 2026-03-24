importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAx7qbBDkGb9wLkp8AcH8PG8ofy9S5moKY",
  authDomain: "payflow-e3a44.firebaseapp.com",
  projectId: "payflow-e3a44",
  messagingSenderId: "575188235068",
  appId: "1:575188235068:web:10ed57fd3f56a4f76a2439",
});

const messaging = firebase.messaging();

// 🔔 Handle background messages safely
messaging.onBackgroundMessage((payload) => {
  console.log("Background message received:", payload);

  const title = payload?.notification?.title || "Queue Update";
  const body = payload?.notification?.body || "You have a new update.";
  
  // Extract URL from payload or use default
  const url = payload?.data?.url || "/";

  self.registration.showNotification(title, {
    body,
    icon: "/PayFlow-Logo_192.png", // Use your actual icon
    badge: "/PayFlow-Logo_192.png", // Badge for Android
    image: "/screenshot1.jpg", // Optional preview image
    tag: `queue-${Date.now()}`, // Unique tag to prevent stacking
    renotify: true, // Vibrate on duplicate notifications
    requireInteraction: true, // Keep notification until user interacts
    data: {
      url: url,
      timestamp: Date.now(),
    },
    vibrate: [200, 100, 200], // Vibration pattern
    actions: [
      { action: "view", title: "View Queue" },
      { action: "dismiss", title: "Dismiss" }
    ],
  });
});

// 🖱️ Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || "/";
  const action = event.action;

  // Handle custom actions
  if (action === "dismiss") {
    return; // Just close notification
  }

  // Default action: open the app
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      // Try to find existing window with matching URL
      for (const client of clientsArr) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      // No matching window, open new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// ✅ Service worker lifecycle management
self.addEventListener("activate", (event) => {
  console.log("Service worker activated");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("install", (event) => {
  console.log("Service worker installed");
  self.skipWaiting(); // Force activation
});