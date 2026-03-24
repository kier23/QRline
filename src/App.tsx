import { Routes, Route, BrowserRouter } from "react-router-dom";
import ProtectedRoute from "./lib/ProtectedRoute";
import { useEffect } from "react";
import { getMessaging, getToken } from "firebase/messaging";
import { firebaseApp } from "./lib/firebase";

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
        // 1️⃣ Register the service worker manually
        const registration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js",
          {
            scope: "/",
          },
        );
        console.log("SW registered:", registration);

        // 2️⃣ Get FCM token
        const messaging = getMessaging(firebaseApp);
        const token = await getToken(messaging, {
          vapidKey: "YOUR_VAPID_KEY_HERE",
          serviceWorkerRegistration: registration,
        });

        if (token) {
          console.log("FCM Token:", token);
          // TODO: save this token to Supabase or your backend
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
