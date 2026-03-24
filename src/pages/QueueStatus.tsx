import { useEffect, useState, useRef } from "react";
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

  const [notifications, setNotifications] = useState<string[]>([]);

  const prevNextNumberRef = useRef<number | null>(null);
  const prevUserStatusRef = useRef<string | null>(null);
  const prevTicketNumberRef = useRef<number | null>(null);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault(); // stop auto popup
      setDeferredPrompt(e);
      console.log("Install prompt ready ✅");
    };

    window.addEventListener("beforeinstallprompt", handler);

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
    if (!("Notification" in window)) return;

    // 🔔 Request notification permission
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      alert("Please allow notifications first.");
      return;
    }

    try {
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });

      console.log("FCM Token:", token);

      if (token) {
        await supabase
          .from("Queue_Tickets")
          .update({ fcm_token: token })
          .eq("guest_id", guestId);
      }
    } catch (err) {
      console.error("FCM error:", err);
    }

    // 📲 Show install prompt AFTER permission
    if (deferredPrompt) {
      deferredPrompt.prompt();

      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        console.log("App installed ✅");
      } else {
        console.log("Install dismissed ❌");
      }

      setDeferredPrompt(null);
    } else {
      console.log("Install not ready yet");
    }
  };

  /*   useEffect(() => {
    const setupFCM = async () => {
      if (!("Notification" in window)) return;

      const permission = await Notification.requestPermission();

      if (permission !== "granted") return;

      try {
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
        });

        console.log("FCM Token:", token);

        if (token) {
          await supabase
            .from("Queue_Tickets")
            .update({ fcm_token: token })
            .eq("guest_id", guestId);
        }
      } catch (err) {
        console.error("FCM error:", err);
      }
    };

    setupFCM();
  }, [guestId]); */

  const fetchStatus = async () => {
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

      const existingUserTicket = (tickets || []).find(
        (t) =>
          t.guest_id === guestId &&
          t.status !== "done" &&
          t.status !== "skipped",
      );

      setUserTicket(existingUserTicket || null);
    } catch (err) {
      setError("Unexpected error loading queue status.");
    }

    setLoading(false);
  };

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
      fetchStatus();
    } catch (err: any) {
      console.error("Cancel ticket error:", err);
      alert(err.message || "Error cancelling ticket");
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [queueId]);

  useEffect(() => {
    if (!queueId) return;

    const previousNext = prevNextNumberRef.current;
    const previousStatus = prevUserStatusRef.current;
    const previousTicketNumber = prevTicketNumberRef.current;

    if (userTicket && nextNumber !== null) {
      if (
        userTicket.status === "waiting" &&
        userTicket.ticket_number === nextNumber &&
        (previousNext === null || previousNext !== nextNumber)
      ) {
        addNotification(
          `Get ready! You're next (#${userTicket.ticket_number}).`,
        );
      }

      if (
        userTicket.status === "serving" &&
        (previousStatus !== "serving" ||
          previousTicketNumber !== userTicket.ticket_number)
      ) {
        addNotification(`It's your turn: ticket #${userTicket.ticket_number}.`);
      }
    }

    prevNextNumberRef.current = nextNumber;
    prevUserStatusRef.current = userTicket?.status || null;
    prevTicketNumberRef.current = userTicket?.ticket_number || null;
  }, [queueId, nextNumber, userTicket]);

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
        () => {
          fetchStatus();
        },
      )
      .subscribe();

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
        () => {
          fetchStatus();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(queueChannel);
      supabase.removeChannel(ticketChannel);
    };
  }, [queueId, guestId]);

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
            <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 space-y-8 border border-primary/20">
              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center mb-6">
                  <button
                    onClick={handleEnableAll}
                    className="px-6 py-3 bg-linear-to-r from-primary via-orange-600 to-primary text-white rounded-xl font-semibold shadow-lg hover:scale-105 transition-all"
                  >
                    🔔 Enable Notifications & Install App
                  </button>
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

                {/* Your Ticket Section */}
                <div className="bg-white rounded-2xl p-8 border-2 border-primary text-center shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary via-orange-600 to-primary"></div>
                  <p className="uppercase tracking-wide text-gray-500 font-semibold text-sm mb-3">
                    Your Ticket
                  </p>
                  <h3 className="text-5xl font-extrabold text-primary mb-4">
                    {userTicket ? `#${userTicket.ticket_number}` : "-"}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    {userStatusText()}
                  </p>
                  {userTicket &&
                    userTicket.status !== "done" &&
                    userTicket.status !== "cancelled" && (
                      <button
                        onClick={handleCancelTicket}
                        className="mt-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        Cancel Ticket
                      </button>
                    )}
                </div>
              </div>

              {/* Notifications */}
              {!!notifications.length && (
                <div className="rounded-2xl border-2 border-primary/20 p-6 bg-linear-to-br from-blue-50/50 to-cyan-50/50">
                  <div className="flex justify-between items-center mb-4">
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
                      className="px-4 py-2 bg-white hover:bg-gray-50 text-primary rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg"
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
