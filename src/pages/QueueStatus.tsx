import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getGuestId } from "../lib/getGuestId";
import Layout from "../components/Layout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartBar,
  faBullseye,
  faBell,
  faTicket,
  faForward,
  faHourglassHalf,
  faCheckCircle,
  faCheck,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import { getToken } from "firebase/messaging";
import { messaging } from "../lib/firebase";

type Queue = {
  id: string;
  latest_number: number | null;
};

type QueueTicket = {
  id: string;
  ticket_number: number;
  status: string;
  guest_id: string;
};

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;

const QueueStatus = () => {
  const { queueId } = useParams();
  const navigate = useNavigate();
  const guestId = getGuestId();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [nextNumber, setNextNumber] = useState<number | null>(null);
  const [userTicket, setUserTicket] = useState<QueueTicket | null>(null);
  const [lastUserTicket, setLastUserTicket] = useState<QueueTicket | null>(
    null,
  ); // For showing done/skipped/cancelled
  const [notifications, setNotifications] = useState<string[]>([]);

  const prevNextNumberRef = useRef<number | null>(null);
  const prevUserStatusRef = useRef<string | null>(null);
  const prevTicketNumberRef = useRef<number | null>(null);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [notificationPermissionGranted, setNotificationPermissionGranted] =
    useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault(); // stop auto popup
      setDeferredPrompt(e);
      console.log("Install prompt ready ✅");

      // Store in localStorage as backup
      localStorage.setItem("deferredPrompt", "available");
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Also check if PWA is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      console.log("Already running as PWA");
      localStorage.setItem("pwaInstalled", "true");
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    window.onerror = (msg, error) => {
      console.error("Global error:", msg, error);
    };
  }, []);

  const addNotification = (message: string) => {
    setNotifications((prev) => [message, ...prev].slice(0, 6));

    if (
      "Notification" in window &&
      Notification.permission === "granted" &&
      typeof Notification === "function"
    ) {
      try {
        new Notification(message);
      } catch (e) {
        console.warn("Notification failed:", e);
      }
    }
  };

  const handleEnableAll = async () => {
    if (!("Notification" in window)) {
      alert("Your browser doesn't support notifications.");
      return;
    }

    try {
      // 📲 Show install prompt FIRST (before notification permission)
      if (deferredPrompt) {
        try {
          deferredPrompt.prompt();

          const choice = await deferredPrompt.userChoice;

          if (choice.outcome === "accepted") {
            console.log("App installed ✅");
            alert(
              "App installed successfully! You can now receive notifications.",
            );
          } else {
            console.log("Install dismissed ❌");
          }

          setDeferredPrompt(null);

          // Small delay after install prompt
          await new Promise((resolve) => setTimeout(resolve, 800));
        } catch (promptError) {
          console.error("Install prompt error:", promptError);
          // Continue to notification permission even if install fails
        }
      } else {
        // Install prompt not ready yet - show message but continue
        console.log(
          "Install prompt not ready, continuing with notifications...",
        );
      }

      // 🔔 Request notification permission AFTER install prompt
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        if (permission === "denied") {
          alert(
            "Notifications are blocked. Please enable them in your browser settings.",
          );
        } else {
          alert("Please allow notifications to receive queue updates.");
        }
        return;
      }

      // Get FCM token for push notifications
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });

      console.log("FCM Token:", token);

      if (token) {
        await supabase
          .from("Queue_Tickets")
          .update({ fcm_token: token })
          .eq("guest_id", guestId);

        alert(
          "Notifications enabled successfully! ✅\nYou'll receive updates when your number is called.",
        );
      } else {
        alert(
          "Failed to get notification token. Please try again or check your internet connection.",
        );
      }
    } catch (err: any) {
      console.error("Enable notifications error:", err);
      alert(
        "Failed to enable notifications. Please try again.\n\nError: " +
          (err.message || "Unknown error"),
      );
    }
  };

  const fetchStatus = useCallback(async () => {
    if (!queueId) return;

    setLoading(true);
    setError(null);

    try {
      const { data: queueData, error: queueError } = await supabase
        .from("Queue")
        .select("id, latest_number")
        .eq("id", queueId)
        .single();

      if (queueError || !queueData) {
        setError("Queue not found.");
        setLoading(false);
        return;
      }

      setQueue(queueData);

      const { data: tickets, error: ticketError } = await supabase
        .from("Queue_Tickets")
        .select("id, ticket_number, status, guest_id")
        .eq("queue_id", queueId)
        .order("ticket_number", { ascending: true });

      if (ticketError) {
        setError("Failed to fetch tickets.");
        setLoading(false);
        return;
      }

      const waitingTicket = (tickets || []).find((t) => t.status === "waiting");
      setNextNumber(
        waitingTicket
          ? waitingTicket.ticket_number
          : (queueData.latest_number || 0) + 1,
      );

      // Get user's active ticket (not done/skipped/cancelled)
      const activeUserTicket = (tickets || [])
        .filter(
          (t) =>
            t.guest_id === guestId && !["done", "cancelled"].includes(t.status),
        )
        .pop();

      // Get user's most recent ticket (including done/skipped/cancelled)
      const allUserTickets = (tickets || [])
        .filter((t) => t.guest_id === guestId)
        .sort((a, b) => b.ticket_number - a.ticket_number);

      const mostRecentTicket =
        allUserTickets.length > 0 ? allUserTickets[0] : null;

      setUserTicket(activeUserTicket || null);
      setLastUserTicket(mostRecentTicket);
    } catch (err) {
      setError("Unexpected error loading queue status.");
    }

    setLoading(false);
  }, [queueId, guestId]);

  const handleResubmitTicket = async () => {
    if (!userTicket || userTicket.status !== "skipped") return;

    const confirmResubmit = confirm(
      "This will create a new ticket with the next available number. Your skipped ticket will remain in the system. Continue?",
    );

    if (!confirmResubmit) return;

    // Navigate to create ticket page (no database change needed)
    navigate(`/queue/${queueId}`);
  };

  const handleCancelTicket = async () => {
    if (!userTicket) return;

    const confirmCancel = confirm(
      `Are you sure you want to cancel ticket #${userTicket.ticket_number}?`,
    );

    if (!confirmCancel) return;

    try {
      await supabase
        .from("Queue_Tickets")
        .update({ status: "cancelled" })
        .eq("id", userTicket.id);

      alert("Ticket cancelled successfully");

      // Redirect to CreateTicket page
      navigate(`/queue/${queueId}`);
    } catch (err: any) {
      console.error("Cancel ticket error:", err);
      alert(err.message || "Error cancelling ticket");
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!queueId) return;

    const queueChannel = supabase
      .channel(`queue-status-${queueId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Queue",
          filter: `id=eq.${queueId}`,
        },
        (payload) => {
          console.log("Queue changed:", payload);
          fetchStatus();
        },
      )
      .subscribe((status) => {
        console.log("Queue channel status:", status);
      });

    const ticketChannel = supabase
      .channel(`queue-status-tickets-${queueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Queue_Tickets",
          filter: `queue_id=eq.${queueId}`,
        },
        (payload) => {
          console.log("Ticket changed:", payload);
          fetchStatus();
        },
      )
      .subscribe((status) => {
        console.log("Ticket channel status:", status);
      });

    return () => {
      supabase.removeChannel(queueChannel);
      supabase.removeChannel(ticketChannel);
    };
  }, [queueId, fetchStatus]);

  const userStatusText = () => {
    if (!userTicket) {
      return "You do not have an active ticket for this queue.";
    }

    if (userTicket.status === "serving") {
      return `You are being served now with ticket #${userTicket.ticket_number}.`;
    }

    if (userTicket.status === "skipped") {
      return `Your ticket #${userTicket.ticket_number} was skipped. Please resubmit to get a new ticket.`;
    }

    return `Your ticket: #${userTicket.ticket_number} (status: ${userTicket.status}).`;
  };

  return (
    <Layout showNavigation={false}>
      <div className="min-h-screen bg-linear-to-br from-background via-orange-50/30 to-background py-12 px-4">
        <div className="w-full max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-primary to-orange-700 flex items-center justify-center shadow-lg">
                <FontAwesomeIcon
                  icon={faChartBar}
                  className="text-2xl text-white"
                />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-linear-to-r from-primary via-orange-600 to-black bg-clip-text text-transparent">
                  Queue Status
                </h2>
                <p className="text-gray-500 text-sm">
                  Real-time queue information
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate("/")}
                className="px-4 py-3 bg-white hover:bg-gray-50 text-gray-800 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all border border-gray-200"
              >
                ← Home
              </button>
              <button
                onClick={() => navigate(`/queue/${queueId}`)}
                className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-800 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all border border-gray-200"
              >
                ← Back to Ticket
              </button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="bg-white rounded-3xl shadow-2xl p-4 md:p-8 lg:p-10 space-y-4 md:space-y-6 lg:space-y-8 border border-primary/20">
              {/* Status Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="text-center mb-6">
                  <button
                    onClick={handleEnableAll}
                    disabled={
                      !deferredPrompt &&
                      window.matchMedia?.("(display-mode: standalone)")
                        .matches === false
                    }
                    className="px-6 py-4 bg-linear-to-r from-primary via-orange-600 to-primary text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    🔔 Enable Notifications & Install App
                  </button>
                  {!deferredPrompt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Install prompt will appear after visiting the site a few
                      times
                    </p>
                  )}
                </div>
                <div className="bg-linear-to-br from-primary via-orange-600 to-primary text-white rounded-2xl p-8 text-center shadow-xl hover:shadow-2xl transition-all transform hover:scale-105">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <FontAwesomeIcon icon={faBullseye} className="text-3xl" />
                    <p className="uppercase tracking-wide opacity-90 font-semibold text-sm">
                      Now Serving
                    </p>
                  </div>
                  <h3 className="text-6xl font-extrabold drop-shadow-lg">
                    {queue?.latest_number ?? "--"}
                  </h3>
                </div>

                <div className="bg-linear-to-br from-primary/90 via-orange-500 to-primary/90 text-white rounded-2xl p-8 text-center shadow-xl hover:shadow-2xl transition-all transform hover:scale-105">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <FontAwesomeIcon icon={faForward} className="text-3xl" />
                    <p className="uppercase tracking-wide opacity-90 font-semibold text-sm">
                      Next Number
                    </p>
                  </div>
                  <h3 className="text-6xl font-extrabold drop-shadow-lg">
                    {nextNumber ?? "--"}
                  </h3>
                </div>

                {/* Your Ticket Card - Merged with Status Banner */}
                <div
                  className={`rounded-2xl border-2 shadow-xl transition-all transform hover:scale-105 relative overflow-hidden ${
                    lastUserTicket?.status === "waiting"
                      ? "bg-linear-to-br from-yellow-50 to-orange-50 border-yellow-300"
                      : lastUserTicket?.status === "serving"
                        ? "bg-linear-to-br from-green-50 to-emerald-50 border-green-300"
                        : lastUserTicket?.status === "done"
                          ? "bg-linear-to-br from-blue-50 to-cyan-50 border-blue-300"
                          : lastUserTicket?.status === "skipped"
                            ? "bg-linear-to-br from-red-50 to-pink-50 border-red-300"
                            : lastUserTicket?.status === "cancelled"
                              ? "bg-linear-to-br from-gray-50 to-slate-50 border-gray-300"
                              : "bg-white border-primary"
                  }`}
                >
                  {lastUserTicket && (
                    <>
                      {/* Top Status Bar */}
                      <div
                        className={`absolute top-0 left-0 w-full h-1 ${
                          lastUserTicket.status === "waiting"
                            ? "bg-yellow-500"
                            : lastUserTicket.status === "serving"
                              ? "bg-green-500"
                              : lastUserTicket.status === "done"
                                ? "bg-blue-500"
                                : lastUserTicket.status === "skipped"
                                  ? "bg-red-500"
                                  : lastUserTicket.status === "cancelled"
                                    ? "bg-gray-500"
                                    : "bg-primary"
                        }`}
                      ></div>

                      {/* Status Badge */}
                      <div className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full shadow-md">
                        <span
                          className={`text-xs font-bold uppercase ${
                            lastUserTicket.status === "waiting"
                              ? "text-yellow-700"
                              : lastUserTicket.status === "serving"
                                ? "text-green-700"
                                : lastUserTicket.status === "done"
                                  ? "text-blue-700"
                                  : lastUserTicket.status === "skipped"
                                    ? "text-red-700"
                                    : lastUserTicket.status === "cancelled"
                                      ? "text-gray-700"
                                      : "text-gray-700"
                          }`}
                        >
                          {lastUserTicket.status === "waiting" && (
                            <>
                              <FontAwesomeIcon
                                icon={faHourglassHalf}
                                className="mr-1"
                              />{" "}
                              Waiting
                            </>
                          )}
                          {lastUserTicket.status === "serving" && (
                            <>
                              <FontAwesomeIcon
                                icon={faCheckCircle}
                                className="mr-1"
                              />{" "}
                              Serving
                            </>
                          )}
                          {lastUserTicket.status === "done" && (
                            <>
                              <FontAwesomeIcon
                                icon={faCheck}
                                className="mr-1"
                              />{" "}
                              Done
                            </>
                          )}
                          {lastUserTicket.status === "skipped" && (
                            <>
                              <FontAwesomeIcon
                                icon={faForward}
                                className="mr-1"
                              />{" "}
                              Skipped
                            </>
                          )}
                          {lastUserTicket.status === "cancelled" && (
                            <>
                              <FontAwesomeIcon
                                icon={faTimesCircle}
                                className="mr-1"
                              />{" "}
                              Cancelled
                            </>
                          )}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Main Content */}
                  <div className="p-6 md:p-8">
                    <p className="uppercase tracking-wide text-gray-500 font-semibold text-sm mb-4">
                      Your Ticket
                    </p>

                    {userTicket ? (
                      <>
                        <h3 className="text-5xl font-extrabold text-primary mb-4">
                          #{userTicket.ticket_number}
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed mb-4">
                          {userStatusText()}
                        </p>
                        {userTicket.status !== "done" &&
                          userTicket.status !== "cancelled" && (
                            <button
                              onClick={handleCancelTicket}
                              className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all text-sm md:text-base"
                            >
                              Cancel Ticket
                            </button>
                          )}
                      </>
                    ) : lastUserTicket ? (
                      <>
                        <div className="flex items-center justify-center gap-3 mb-4">
                          <div
                            className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center ${
                              lastUserTicket.status === "waiting"
                                ? "bg-yellow-500"
                                : lastUserTicket.status === "serving"
                                  ? "bg-green-500"
                                  : lastUserTicket.status === "done"
                                    ? "bg-blue-500"
                                    : lastUserTicket.status === "skipped"
                                      ? "bg-red-500"
                                      : "bg-gray-500"
                            }`}
                          >
                            <span className="text-white font-bold text-xl md:text-2xl">
                              #{lastUserTicket.ticket_number}
                            </span>
                          </div>
                        </div>
                        <p className="font-bold text-gray-800 text-base md:text-lg uppercase tracking-wide mb-2">
                          {lastUserTicket.status === "waiting" && (
                            <>
                              <FontAwesomeIcon
                                icon={faHourglassHalf}
                                className="mr-2"
                              />{" "}
                              Waiting in Line
                            </>
                          )}
                          {lastUserTicket.status === "serving" && (
                            <>
                              <FontAwesomeIcon
                                icon={faCheckCircle}
                                className="mr-2"
                              />{" "}
                              Being Served Now
                            </>
                          )}
                          {lastUserTicket.status === "done" && (
                            <>
                              <FontAwesomeIcon
                                icon={faCheck}
                                className="mr-2"
                              />{" "}
                              Completed
                            </>
                          )}
                          {lastUserTicket.status === "skipped" && (
                            <>
                              <FontAwesomeIcon
                                icon={faForward}
                                className="mr-2"
                              />{" "}
                              Skipped
                            </>
                          )}
                          {lastUserTicket.status === "cancelled" && (
                            <>
                              <FontAwesomeIcon
                                icon={faTimesCircle}
                                className="mr-2"
                              />{" "}
                              Cancelled
                            </>
                          )}
                        </p>
                        <p className="text-xs md:text-sm text-gray-600 mb-4">
                          {lastUserTicket.status === "waiting" &&
                            `You're in line for queue ${queueId}`}
                          {lastUserTicket.status === "serving" &&
                            "Please proceed to the counter"}
                          {lastUserTicket.status === "done" &&
                            "Your transaction has been completed"}
                          {lastUserTicket.status === "skipped" &&
                            "You missed your turn. Please resubmit."}
                          {lastUserTicket.status === "cancelled" &&
                            "You cancelled this ticket"}
                        </p>
                        {lastUserTicket.status === "skipped" && (
                          <button
                            onClick={handleResubmitTicket}
                            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all text-sm md:text-base"
                          >
                            🔄 Resubmit Ticket
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <h3 className="text-4xl md:text-5xl font-extrabold text-gray-400 mb-4">
                          --
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          You do not have an active ticket for this queue.
                        </p>
                        <button
                          onClick={() => navigate(`/queue/${queueId}`)}
                          className="mt-4 w-full px-4 py-3 bg-linear-to-r from-primary via-orange-600 to-primary text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all text-sm md:text-base"
                        >
                          Create a Ticket
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Notifications */}
              {!!notifications.length && (
                <div className="rounded-2xl border-2 border-primary/20 p-4 md:p-6 bg-linear-to-br from-blue-50/50 to-cyan-50/50">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <FontAwesomeIcon
                        icon={faBell}
                        className="text-2xl text-primary"
                      />
                      <span className="font-bold text-gray-800 text-lg">
                        Recent Notifications
                      </span>
                    </div>
                    <button
                      className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-gray-50 text-primary rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg border border-gray-200"
                      onClick={() => setNotifications([])}
                    >
                      Clear All
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {notifications.map((msg, idx) => (
                      <li
                        key={`${idx}-${msg}`}
                        className="rounded-xl px-4 py-3 bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all flex items-center gap-3"
                      >
                        <span className="text-green-500">✓</span>
                        <span className="text-gray-800 font-medium">{msg}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* No Ticket Action */}
              {!userTicket && (
                <div className="text-center pt-6 border-t border-gray-100">
                  <div className="inline-flex items-center gap-2 mb-4 text-gray-600">
                    <FontAwesomeIcon
                      icon={faTicket}
                      className="text-3xl text-primary"
                    />
                    <p className="font-medium">
                      You don't have an active ticket for this queue
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/queue/${queueId}`)}
                    className="px-8 py-4 bg-linear-to-r from-primary via-orange-600 to-primary text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  >
                    <FontAwesomeIcon icon={faTicket} className="mr-2" /> Create
                    a Ticket
                  </button>
                </div>
              )}

              {/* Resubmit Skipped Ticket */}
              {userTicket && userTicket.status === "skipped" && (
                <div className="text-center pt-6 border-t border-gray-100">
                  <div className="inline-flex items-center gap-2 mb-4 text-red-600">
                    <FontAwesomeIcon icon={faForward} className="text-3xl" />
                    <p className="font-bold">
                      Your ticket was skipped. Resubmit to get a new number.
                    </p>
                  </div>
                  <button
                    onClick={handleResubmitTicket}
                    className="px-8 py-4 bg-linear-to-r from-red-600 via-orange-600 to-red-600 text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  >
                    <FontAwesomeIcon icon={faTicket} className="mr-2" />{" "}
                    Resubmit Ticket
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default QueueStatus;
