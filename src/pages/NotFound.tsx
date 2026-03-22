import React from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faHouse } from "@fortawesome/free-solid-svg-icons";

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout showNavigation={true}>
      <div className="min-h-screen bg-linear-to-br from-background via-orange-50/30 to-background flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-3xl shadow-2xl p-10 md:p-12 border border-primary/20 text-center">
            {/* 404 Icon */}
            <div className="w-24 h-24 mx-auto rounded-2xl bg-linear-to-br from-primary to-orange-700 flex items-center justify-center shadow-xl mb-6">
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="text-5xl text-white"
              />
            </div>

            {/* 404 Text */}
            <div className="text-8xl font-extrabold bg-linear-to-r from-primary via-orange-600 to-black bg-clip-text text-transparent mb-4">
              404
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Page Not Found
            </h1>

            {/* Description */}
            <p className="text-gray-600 text-base mb-8 leading-relaxed">
              Oops! The page you're looking for seems to have wandered off.
              Let's get you back on track.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate("/")}
                className="px-8 py-4 bg-linear-to-r from-primary via-orange-600 to-primary text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              >
                <FontAwesomeIcon icon={faHouse} className="mr-2" /> Go Home
              </button>
              <button
                onClick={() => navigate(-1)}
                className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold shadow-md hover:shadow-lg hover:scale-105 transition-all"
              >
                ← Go Back
              </button>
            </div>

            {/* Decorative Element */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Don't worry, even the best maps have a few blank spots!
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
