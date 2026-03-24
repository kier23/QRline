// firebase.ts
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAx7qbBDkGb9wLkp8AcH8PG8ofy9S5moKY",
  authDomain: "payflow-e3a44.firebaseapp.com",
  projectId: "payflow-e3a44",
  messagingSenderId: "575188235068",
  appId: "1:575188235068:web:10ed57fd3f56a4f76a2439",
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);
export const messaging = getMessaging(firebaseApp);

/**
 * Request notification permission and get FCM token
 */
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission not granted");
      return null;
    }

    // Register service worker at root
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: "YOUR_VAPID_KEY_HERE",
      serviceWorkerRegistration: registration,
    });

    console.log("FCM Token:", token);
    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};