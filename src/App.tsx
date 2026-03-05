import { Routes, Route, BrowserRouter } from "react-router-dom";

// Pages
import LoginPage from "./pages/LoginPage";
import CompleteProfile from "./pages/CompleteProfile";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import ManageQueue from "./pages/ManageQueue";
import QueueQR from "./pages/QueueQRDisplay";
import CreateTicket from "./pages/CreateTicket";

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
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
