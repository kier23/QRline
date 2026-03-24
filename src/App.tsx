import { Routes, Route, BrowserRouter } from "react-router-dom";
import ProtectedRoute from "./lib/ProtectedRoute";
import { useEffect } from "react";
import { getMessaging, getToken } from "firebase/messaging";
import { firebaseApp } from "./lib/firebase";
import { onMessage } from "firebase/messaging";

// Pages
import LoginPage from "./pages/LoginPage";
import CompleteProfile from "./pages/CompleteProfile";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdmin from "./pages/SuperAdmin";
import NotFound from "./pages/NotFound";
import ManageQueue from "./pages/ManageQueue";
import QueueQR from "./pages/QueueQRDisplay";
import CreateTicket from "./pages/CreateTicket";
import QueueStatus from "./pages/QueueStatus";
import EndUserPage from "./pages/EndUserPage";

function App() {
  useEffect(() => {
    async function registerFCM() {
      if (!("serviceWorker" in navigator)) return;

      try {
        // 1️⃣ Register SW
        const registration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js",
          { scope: "/" },
        );
        console.log("SW registered:", registration);

        // 2️⃣ Get messaging
        const messaging = getMessaging(firebaseApp);

        // ✅ ADD THIS (foreground listener)
        onMessage(messaging, (payload) => {
          console.log("🔥 Foreground message:", payload);

          const title =
            payload.notification?.title ||
            payload.data?.title ||
            "Queue Update";
          const body = payload.notification?.body || payload.data?.body || "";

          new Notification(title, {
            body,
            icon: "/PayFlow-Logo_192.png",
          });
        });

        // 3️⃣ Get token
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (token) {
          console.log("FCM Token:", token);
        }
      } catch (error) {
        console.error("FCM registration failed:", error);
      }
    }

    registerFCM();
  }, []);

  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          {/* 🔓 PUBLIC (END USER UI) */}
          <Route path="/" element={<EndUserPage />} />
          <Route path="/queue/:queueId" element={<CreateTicket />} />
          <Route path="/queue/:queueId/status" element={<QueueStatus />} />

          {/* 🔐 ADMIN LOGIN */}
          <Route path="/admin" element={<LoginPage />} />

          {/* 🔐 ADMIN ROUTES */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/queue/:queueId"
            element={
              <ProtectedRoute role="admin">
                <ManageQueue />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/queue/:queueId/qr"
            element={
              <ProtectedRoute role="admin">
                <QueueQR />
              </ProtectedRoute>
            }
          />

          {/* 🔐 SUPER ADMIN */}
          <Route
            path="/superadmin"
            element={
              <ProtectedRoute role="superadmin">
                <SuperAdmin />
              </ProtectedRoute>
            }
          />

          {/* 🔐 PROFILE */}
          <Route
            path="/complete-profile"
            element={
              <ProtectedRoute>
                <CompleteProfile />
              </ProtectedRoute>
            }
          />

          {/* ❌ NOT FOUND */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
