import { Routes, Route, BrowserRouter } from "react-router-dom";

// Pages
import LoginPage from "./pages/LoginPage";
import CompleteProfile from "./pages/CompleteProfile";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import ManageQueue from "./pages/ManageQueue";
import QueueQR from "./pages/QueueQRDisplay";
import CreateTicket from "./pages/CreateTicket";
import QueueStatus from "./pages/QueueStatus";

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/" element={<LoginPage />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/admin/queue/:queueId" element={<ManageQueue />} />
          <Route path="/admin/queue/:queueId/qr" element={<QueueQR />} />
          <Route path="/queue/:queueId" element={<CreateTicket />} />
          <Route path="/queue/:queueId/status" element={<QueueStatus />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
