import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type QueueItem = {
  id: string;
  name: string;
  status: string;
  date: string;
  managed_by: string;
  qr: string;
  latest_number: number;
};

const AdminDashboard = () => {
  const [admin, setAdmin] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [creatingQueue, setCreatingQueue] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        setError(userError.message);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("Profiles")
        .select("*")
        .eq("id", user?.id)
        .single();
      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }
      if (profile.role !== "admin") {
        setError("Unauthorized access");
        setLoading(false);
        return;
      }
      setAdmin(profile);

      // Fetch queues managed by the current user
      // Use profile.id instead of user?.id for consistency
      const { data: queueData, error: queueError } = await supabase
        .from("Queue")
        .select("*")
        .eq("managed_by", profile.id);

      if (queueError) {
        setError(queueError.message || "Error fetching queues");
        setLoading(false);
        return;
      } else {
        setQueue(queueData || []);
      }

      setLoading(false);
    };
    fetchProfiles();
  }, []);

  const handleCreateQueue = async () => {
    if (!admin) {
      setError("Admin profile not loaded");
      return;
    }

    setCreatingQueue(true);
    setError(null);
    setShowConfirmDialog(false);

    try {
      // Use Supabase functions.invoke with the admin ID
      const { data, error } = await supabase.functions.invoke(
        "create-qr-and-queue",
        {
          body: {},
        },
      );

      if (error) {
        throw new Error(error.message || "Failed to invoke function");
      }

      console.log("Queue created successfully:", data);

      // Refresh the queue list to show the new queue
      const { data: updatedQueueData, error: updatedQueueError } =
        await supabase.from("Queue").select("*").eq("managed_by", admin.id);

      if (updatedQueueError) {
        throw updatedQueueError;
      }

      setQueue(updatedQueueData || []);
    } catch (err: any) {
      setError(err.message || "Failed to create queue");
      console.error("Error creating queue:", err);
    } finally {
      setCreatingQueue(false);
    }
  };

  const handleDeleteQueue = async (queueId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this queue? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.from("Queue").delete().eq("id", queueId);

      if (error) {
        setError(error.message);
        return;
      }

      // Refresh the queue list
      if (admin) {
        const { data: updatedQueueData, error: updatedQueueError } =
          await supabase.from("Queue").select("*").eq("managed_by", admin.id);

        if (updatedQueueError) {
          setError(updatedQueueError.message);
        } else {
          setQueue(updatedQueueData || []);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete queue");
      console.error("Error deleting queue:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <Layout showNavigation={false}>
      <div className="min-h-screen bg-gray-100 py-10 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* MAIN CONTENT CARD */}
          <div className="bg-white rounded-3xl shadow-md p-8">
            {/* Display loading indicator */}
            {loading && (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              </div>
            )}

            {/* Display error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-red-400 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                  <span className="text-red-700 font-medium">
                    Error: {error}
                  </span>
                </div>
              </div>
            )}

            {/* Top Section - Only show if not loading and no error */}
            {!loading && !error && (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800">
                    Your Queues
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Welcome back, {admin?.name}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleLogout}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition font-medium"
                  >
                    Logout
                  </button>
                  <button
                    onClick={() => setShowConfirmDialog(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-sm"
                  >
                    New Queue
                  </button>
                </div>
              </div>
            )}

            {/* QUEUE LIST - Only show if not loading and no error */}
            {!loading && !error && (
              <>
                {queue.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 mx-auto rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                      📋
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      No queues yet
                    </h3>
                    <p className="text-gray-500 mt-2">
                      Start by creating your first queue.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {queue.map((item) => (
                      <div
                        key={item.id}
                        className="group bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            Queue #{item.id}
                          </h3>

                          <span
                            className={`text-xs px-3 py-1 rounded-full font-medium ${
                              item.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        <p className="text-sm text-gray-500 mt-4">
                          Created on {new Date(item.date).toLocaleDateString()}
                        </p>

                        <div className="mt-6 flex gap-2">
                          <button
                            onClick={() => navigate(`/admin/queue/${item.id}`)}
                            className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 transition text-sm font-medium"
                          >
                            Manage Queue
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteQueue(item.id);
                            }}
                            className="flex-1 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <span className="text-xl">📋</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Create New Queue
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to create a new queue? A unique ID and QR
                code will be generated automatically.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateQueue}
                  disabled={creatingQueue}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-medium disabled:opacity-50"
                >
                  {creatingQueue ? "Creating..." : "Create Queue"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminDashboard;
