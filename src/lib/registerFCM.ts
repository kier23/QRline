import { getMessaging, getToken } from "firebase/messaging";
import { firebaseApp } from "./firebase";

let isFCMInitialized = false;

export async function registerFCM() {
  if (isFCMInitialized) return; // ✅ prevent multiple runs
  isFCMInitialized = true;

  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" }
    );

    console.log("SW registered:", registration);

    const messaging = getMessaging(firebaseApp);
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log("FCM Token:", token);
      // save to Supabase here if needed
    }
  } catch (error) {
    console.error("FCM registration failed:", error);
  }
}