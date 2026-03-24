import { useState } from "react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const guestId = getGuestId();
    if (!queueId) return;

    setLoading(true);

    try {
      // 🔥 1. Get NEXT NUMBER from DB (atomic)
      const { data: nextNumber, error: rpcError } = await supabase.rpc(
        "get_next_ticket_number",
        { q_id: Number(queueId) },
      );

      if (rpcError) throw rpcError;

      // 🔔 2. Get FCM token (same as your code)
      let fcmToken: string | null = null;

      try {
        fcmToken = await Promise.race([
          getToken(messaging, {
            vapidKey: import.meta.env.VITE_VAPID_KEY,
          }),
          new Promise<string | null>((_, reject) =>
            setTimeout(() => reject(new Error("FCM timeout")), 5000),
          ),
        ]);
      } catch (err) {
        console.warn("FCM token failed:", err);
        fcmToken = null;
      }

      // 🚫 3. Check active tickets
      const { data: existingTickets, error: checkError } = await supabase
        .from("Queue_Tickets")
        .select("id")
        .eq("queue_id", queueId)
        .eq("guest_id", guestId)
        .in("status", ["waiting", "serving"]);

      if (checkError) throw checkError;

      if (existingTickets && existingTickets.length > 0) {
        alert("You already have an active ticket.");
        setLoading(false);
        return;
      }

      // ✅ 4. Insert using DB-generated number
      const { error } = await supabase.from("Queue_Tickets").insert([
        {
          queue_id: Number(queueId),
          guest_id: guestId,
          ticket_number: nextNumber, // 🔥 from RPC
          client_name: clientName,
          email,
          payment,
          status: "waiting",
          fcm_token: fcmToken,
        },
      ]);

      if (error) throw error;

      alert(`Ticket #${nextNumber} created!`);
      navigate(`/queue/${queueId}/status`);
    } catch (err: any) {
      console.error("Create ticket error:", err);
      alert(err.message || "Error creating ticket");
      setLoading(false);
    }
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
              <div className="bg-linear-to-br from-primary/10 via-orange-100/50 to-primary/10 rounded-2xl p-6 border-2 border-primary/30 shadow-inner relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-100/20 to-transparent rounded-full -ml-12 -mb-12"></div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-linear-to-br from-primary/20 to-primary/10 rounded-xl">
                      <FontAwesomeIcon
                        icon={faTicket}
                        className="text-lg text-primary"
                      />
                    </div>
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                      Your Ticket Number
                    </label>
                  </div>

                  <div className="text-center py-4">
                    <div className="inline-flex items-center justify-center px-8 py-4 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-primary/20 shadow-sm">
                      <span className="text-4xl md:text-5xl font-black bg-linear-to-r from-primary via-orange-600 to-black bg-clip-text text-transparent">
                        Will be assigned
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-3 font-medium flex items-center justify-center gap-1">
                      <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                      Auto-generated upon submission
                    </p>
                  </div>
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
