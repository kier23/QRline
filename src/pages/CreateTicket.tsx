import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getGuestId } from "../lib/getGuestId";
import Layout from "../components/Layout";

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

    // prevent duplicates: same queue + same guest with active status
    const { data: existingTickets, error: checkError } = await supabase
      .from("Queue_Tickets")
      .select("id")
      .eq("queue_id", queueId)
      .eq("guest_id", guestId)
      .in("status", ["waiting", "in_service"]);

    if (checkError) {
      alert("Error checking existing tickets. Please try again.");
      setLoading(false);
      return;
    }

    if (existingTickets && existingTickets.length > 0) {
      alert(
        "You already have an active ticket in this queue. Please finish or cancel that ticket before creating a new one.",
      );
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("Queue_Tickets").insert([
      {
        queue_id: queueId,
        guest_id: guestId,
        ticket_number: nextNumber,
        client_name: clientName,
        email: email,
        payment: payment,
        status: "waiting",
      },
    ]);

    if (!error) {
      alert(`Ticket #${nextNumber} created!`);
      navigate(`/queue/${queueId}/status`);
    } else {
      alert("Error creating ticket");
    }

    setLoading(false);
  };

  return (
    <Layout showNavigation={false}>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-lg">
          <h2 className="text-2xl font-bold mb-6 text-center">
            🎫 Create New Ticket
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Ticket Number Preview */}
            <div>
              <label className="block text-gray-600 mb-1">Ticket Number</label>
              <div className="bg-gray-100 p-3 rounded-xl text-xl font-bold">
                #{nextNumber ?? "..."}
              </div>
            </div>

            {/* Client Name */}
            <div>
              <label className="block text-gray-600 mb-1">Client Name</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full p-3 border rounded-xl"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-600 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border rounded-xl"
              />
            </div>

            {/* Payment Type */}
            <div>
              <label className="block text-gray-600 mb-1">Payment Type</label>
              <select
                value={payment}
                onChange={(e) =>
                  setPayment(e.target.value as "cashier" | "assessment")
                }
                className="w-full p-3 border rounded-xl"
              >
                <option value="cashier">Cashier</option>
                <option value="assessment">Assessment</option>
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-semibold hover:bg-indigo-700"
            >
              {loading ? "Creating..." : "Create Ticket"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateTicket;
