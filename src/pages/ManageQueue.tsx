import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Layout from "../components/Layout";

type Queue = {
  id: string;
  status: string;
  date: string;
  managed_by: string;
  latest_number: number;
};

type Ticket = {
  id: string;
  ticket_number: number;
  client_name: string;
  status: string;
};

const ManageQueue = () => {
  const { queueId } = useParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);

  const [queue, setQueue] = useState<Queue | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentServing, setCurrentServing] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔊 Sound
  const playSound = () => {
    const audio = new Audio("/notification.mp3"); // put file in public folder
    audio.play();
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      const { data: profile } = await supabase
        .from("Profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        setError("Unauthorized");
        setLoading(false);
        return;
      }

      // 🔐 Secure queue ownership
      const { data: queueData, error: queueError } = await supabase
        .from("Queue")
        .select("*")
        .eq("id", queueId)
        .eq("managed_by", profile.id)
        .single();

      if (queueError || !queueData) {
        setError("Queue not found");
        setLoading(false);
        return;
      }

      setQueue(queueData);

      await fetchTickets();

      setLoading(false);
    };

    fetchData();
  }, [queueId, navigate]);

  // 🔴 REALTIME SUBSCRIPTIONS
  useEffect(() => {
    if (!queueId) return;

    // Subscribe to Queue_Tickets changes
    const ticketsChannel = supabase
      .channel("manage-queue-tickets")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Queue_Tickets",
          filter: `queue_id=eq.${queueId}`,
        },
        async () => {
          await fetchTickets();
        },
      )
      .subscribe();

    // Subscribe to Queue updates (latest_number, status, etc.)
    const queueChannel = supabase
      .channel("manage-queue-main")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Queue",
          filter: `id=eq.${queueId}`,
        },
        (payload) => {
          setQueue(payload.new as Queue);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(queueChannel);
    };
  }, [queueId]);

  const fetchTickets = async () => {
    const { data } = await supabase
      .from("Queue_Tickets")
      .select("*")
      .eq("queue_id", queueId)
      .order("ticket_number", { ascending: true });

    const ticketList = data || [];
    setTickets(ticketList);

    const serving = ticketList.find((t) => t.status === "serving");
    setCurrentServing(serving || null);
  };

  const callNext = async () => {
    if (!queue || processing) return;
    setProcessing(true);

    const nextNumber = (queue.latest_number || 0) + 1;

    // find ticket with next number
    const nextTicket = tickets.find((t) => t.ticket_number === nextNumber);

    if (!nextTicket) {
      setProcessing(false);
      return;
    }

    // mark current serving as done
    if (currentServing) {
      await supabase
        .from("Queue_Tickets")
        .update({ status: "done" })
        .eq("id", currentServing.id);
    }

    // mark next ticket as serving
    await supabase
      .from("Queue_Tickets")
      .update({ status: "serving" })
      .eq("id", nextTicket.id);

    // increment latest_number
    await supabase
      .from("Queue")
      .update({ latest_number: nextNumber })
      .eq("id", queue.id);

    playSound();
    setProcessing(false);
  };

  const skipCurrent = async () => {
    if (!queue || !currentServing) return;

    const nextNumber = (queue.latest_number || 0) + 1;

    // mark current as skipped
    await supabase
      .from("Queue_Tickets")
      .update({ status: "skipped" })
      .eq("id", currentServing.id);

    const nextTicket = tickets.find((t) => t.ticket_number === nextNumber);

    if (nextTicket) {
      await supabase
        .from("Queue_Tickets")
        .update({ status: "serving" })
        .eq("id", nextTicket.id);

      await supabase
        .from("Queue")
        .update({ latest_number: nextNumber })
        .eq("id", queue.id);

      playSound();
    } else {
      await supabase
        .from("Queue")
        .update({ latest_number: null })
        .eq("id", queue.id);
    }
  };
  const waitingCount = tickets.filter((t) => t.status === "waiting").length;

  return (
    <Layout showNavigation={false}>
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {loading && <p>Loading...</p>}
          {error && <p className="text-red-600">{error}</p>}

          {queue && (
            <>
              {/* HEADER */}
              <div className="bg-white rounded-3xl shadow p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">🎛️ Queue Control Panel</h2>
                  <p className="text-gray-500">Queue ID: {queue.id}</p>
                </div>

                <button
                  onClick={() => navigate(-1)}
                  className="px-4 py-2 bg-gray-200 rounded-lg"
                >
                  Back
                </button>
              </div>

              {/* CURRENT NUMBER DISPLAY */}
              <div className="bg-indigo-600 text-white rounded-3xl shadow p-10 text-center">
                <p className="text-lg opacity-80">Now Serving</p>
                <h1 className="text-6xl font-bold mt-2">
                  {queue?.latest_number ?? "--"}
                </h1>
                <p className="mt-2">
                  {currentServing?.client_name || "Waiting..."}
                </p>
              </div>

              {/* STATS */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow">
                  <p className="text-gray-500">Waiting</p>
                  <h3 className="text-3xl font-bold">{waitingCount}</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow">
                  <p className="text-gray-500">Currently Serving</p>
                  <h3 className="text-3xl font-bold">
                    {currentServing ? currentServing.ticket_number : "-"}
                  </h3>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow">
                  <p className="text-gray-500">Total Tickets</p>
                  <h3 className="text-3xl font-bold">{tickets.length}</h3>
                </div>
              </div>

              {/* CONTROL BUTTONS */}
              <div className="bg-white rounded-3xl p-6 shadow flex gap-4 justify-center">
                <button
                  onClick={callNext}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-lg font-semibold shadow hover:bg-indigo-700"
                >
                  ▶ Next
                </button>

                <button
                  onClick={skipCurrent}
                  className="px-8 py-4 bg-red-500 text-white rounded-2xl text-lg font-semibold shadow hover:bg-red-600"
                >
                  ⏭ Skip
                </button>

                <button
                  onClick={playSound}
                  className="px-8 py-4 bg-yellow-500 text-white rounded-2xl text-lg font-semibold shadow hover:bg-yellow-600"
                >
                  🔊 Play Sound
                </button>
                <button
                  onClick={() =>
                    window.open(
                      `/admin/queue/${queue.id}/qr`,
                      "qrWindow",
                      "width=1200,height=800,left=200,top=100,resizable=yes,scrollbars=yes",
                    )
                  }
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                >
                  Show QR
                </button>
              </div>

              {/* WAITING LIST */}
              <div className="bg-white rounded-3xl shadow p-6">
                <h3 className="text-xl font-semibold mb-4">Waiting List</h3>

                <div className="space-y-2">
                  {tickets
                    .filter((t) => t.status === "waiting")
                    .map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex justify-between bg-gray-100 rounded-xl p-3"
                      >
                        <span>#{ticket.ticket_number}</span>
                        <span>{ticket.client_name}</span>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ManageQueue;
