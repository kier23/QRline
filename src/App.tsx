import { Routes, Route, BrowserRouter } from "react-router-dom";

// Pages
import LoginPage from "./pages/LoginPage";
import CompleteProfile from "./pages/CompleteProfile";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/" element={<LoginPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
