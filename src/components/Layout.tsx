import React from "react";
import { Link, useLocation } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showNavigation = true }) => {
  const location = useLocation();

  // Define navigation items
  const navItems = [
    { path: "/", label: "Login" },
    { path: "/complete-profile", label: "Complete Profile" },
    { path: "/admin-dashboard", label: "Dashboard" },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link
            to="/"
            className="text-2xl font-bold text-indigo-600 flex items-center"
          >
            <span className="mr-2">📋</span>
            QRline
          </Link>

          {showNavigation && (
            <nav>
              <ul className="flex space-x-6">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`font-medium ${
                        location.pathname === item.path
                          ? "text-indigo-600 border-b-2 border-indigo-600"
                          : "text-gray-600 hover:text-indigo-500"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© {new Date().getFullYear()} QRline - Queue Management System</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
