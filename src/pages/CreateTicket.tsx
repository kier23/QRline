import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getGuestId } from "../lib/getGuestId";
import Layout from "../components/Layout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTicket,
  faMoneyBill,
  faClipboardList,
} from "@fortawesome/free-solid-svg-icons";
import { getToken } from "firebase/messaging";
import { messaging } from "../lib/firebase";

const CreateTicket = () => {
  const { queueId } = useParams();
  const navigate = useNavigate();
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [payment, setPayment] = useState<"cashier" | "assessment">("cashier");
  const [loading, setLoading] = useState(false);
  const [nextNumber, setNextNumber] = useState<number | null>(null);

  // 🔢 Get next ticket number
  useEffect(() => {
    const fetchNextNumber = async () => {
      const { data } = await supabase
        .from("Queue_Tickets")
        .select("ticket_number")
        .eq("queue_id", queueId)
        .order("ticket_number", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setNextNumber(data[0].ticket_number + 1);
      } else {
        setNextNumber(1);
      }
    };

    fetchNextNumber();
  }, [queueId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const guestId = getGuestId();
    if (!queueId || !nextNumber) return;

    setLoading(true);

    try {
      // 🔔 Get FCM token FIRST
      let fcmToken: string | null = null;

      try {
        fcmToken = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_VAPID_KEY,
        });

        console.log("FCM Token:", fcmToken);
      } catch (err) {
        console.warn("FCM token failed, continuing without it:", err);
      }

      // 🚫 Check duplicate (exclude skipped tickets)
      const { data: existingTickets, error: checkError } = await supabase
        .from("Queue_Tickets")
        .select("id, status")
        .eq("queue_id", queueId)
        .eq("guest_id", guestId)
        .in("status", ["waiting", "serving"]);

      if (checkError) throw checkError;

      if (existingTickets && existingTickets.length > 0) {
        alert("You already have an active ticket.");
        setLoading(false);
        return;
      }

      // ✅ Allow creating new ticket if user has skipped tickets

      // ✅ Insert WITH token
      const { error } = await supabase.from("Queue_Tickets").insert([
        {
          queue_id: Number(queueId),
          guest_id: guestId,
          ticket_number: nextNumber,
          client_name: clientName,
          email: email,
          payment: payment,
          status: "waiting",
          fcm_token: fcmToken, // ✅ real token
        },
      ]);

      if (error) throw error;

      alert(`Ticket #${nextNumber} created!`);
      navigate(`/queue/${queueId}/status`);
    } catch (err: any) {
      console.error("Create ticket error:", err);
      alert(err.message || "Error creating ticket");
    }

    setLoading(false);
  };

  const handleRecreateTicket = async () => {
    const guestId = getGuestId();

    if (!queueId) return;

    try {
      // Find all active tickets for this user in this queue
      const { data: existingTickets } = await supabase
        .from("Queue_Tickets")
        .select("id, status")
        .eq("queue_id", queueId)
        .eq("guest_id", guestId)
        .in("status", ["waiting", "serving"]);

      if (existingTickets && existingTickets.length > 0) {
        const confirmCancel = confirm(
          `You have ${existingTickets.length} active ticket(s). This will cancel all of them and create a new ticket. Continue?`,
        );

        if (!confirmCancel) return;

        // Cancel all existing tickets
        const ticketIds = existingTickets.map((t) => t.id);
        await supabase
          .from("Queue_Tickets")
          .update({ status: "cancelled" })
          .in("id", ticketIds);
      }

      // Navigate to recreate ticket (form will reset)
      window.location.reload();
    } catch (err: any) {
      console.error("Recreate ticket error:", err);
      alert(err.message || "Error recreating ticket");
    }
  };

  return (
    <Layout showNavigation={false}>
      <div className="min-h-screen bg-linear-to-br from-background via-orange-50/30 to-background py-12 px-4">
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-primary/20">
            {/* Header with Home Button */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all border border-gray-200 flex items-center gap-2"
              >
                ← Home
              </button>
            </div>

            {/* Main Header */}
            <div className="text-center space-y-3 mb-8">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-linear-to-br from-primary to-orange-700 flex items-center justify-center shadow-lg">
                <FontAwesomeIcon
                  icon={faTicket}
                  className="text-4xl text-white"
                />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-primary via-orange-600 to-black bg-clip-text text-transparent">
                Create New Ticket
              </h2>
              <p className="text-gray-600 text-sm">
                Fill in your details to join the queue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Ticket Number Preview */}
              <div className="bg-linear-to-br from-primary/10 via-orange-100/50 to-primary/10 rounded-2xl p-6 border border-primary/20 shadow-inner">
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Your Ticket Number
                </label>
                <div className="text-center">
                  <div className="text-6xl font-extrabold bg-linear-to-r from-primary via-orange-600 to-black bg-clip-text text-transparent">
                    #{nextNumber ?? "..."}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Remember this number
                  </p>
                </div>
              </div>

              {/* Client Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">
                  Client Name
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all bg-white text-gray-900 placeholder:text-gray-400"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all bg-white text-gray-900 placeholder:text-gray-400"
                  placeholder="your.email@example.com"
                />
              </div>

              {/* Payment Type */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">
                  Payment Type
                </label>
                <select
                  value={payment}
                  onChange={(e) =>
                    setPayment(e.target.value as "cashier" | "assessment")
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all bg-white text-gray-900 cursor-pointer"
                >
                  <option value="cashier">
                    <FontAwesomeIcon icon={faMoneyBill} className="mr-2" />{" "}
                    Cashier
                  </option>
                  <option value="assessment">
                    <FontAwesomeIcon icon={faClipboardList} className="mr-2" />{" "}
                    Assessment
                  </option>
                </select>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-linear-to-r from-primary via-orange-600 to-primary text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Creating Ticket...
                  </span>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faTicket} className="mr-2" /> Create
                    Ticket
                  </>
                )}
              </button>

              {/* Recreate Ticket */}
              <button
                type="button"
                onClick={handleRecreateTicket}
                disabled={loading}
                className="w-full py-4 bg-linear-to-r from-red-600 via-orange-600 to-red-600 text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all focus:outline-none focus:ring-4 focus:ring-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <FontAwesomeIcon icon={faTicket} className="mr-2" /> Recreate
                Ticket (Cancel Old)
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateTicket;
