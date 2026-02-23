import React from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout showNavigation={true}>
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
          <div className="text-6xl font-bold text-gray-300 mb-4">404</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Page Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            Sorry, we couldn't find the page you're looking for.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
