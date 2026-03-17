import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getGuestId } from "../lib/getGuestId";
import Layout from "../components/Layout";

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

const QueueStatus = () => {
  const { queueId } = useParams();
  const navigate = useNavigate();
  const guestId = getGuestId();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [nextNumber, setNextNumber] = useState<number | null>(null);
  const [userTicket, setUserTicket] = useState<QueueTicket | null>(null);

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

  useEffect(() => {
    fetchStatus();
  }, [queueId]);

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

    return `Your ticket: #${userTicket.ticket_number} (status: ${userTicket.status}).`;
  };

  return (
    <Layout showNavigation={false}>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold">Queue Status</h2>
            <button
              onClick={() => navigate(`/queue/${queueId}`)}
              className="px-4 py-2 bg-gray-200 rounded-lg"
            >
              Back to Ticket
            </button>
          </div>

          {loading && <p>Loading...</p>}
          {error && <p className="text-red-600">{error}</p>}

          {!loading && !error && (
            <div className="bg-white rounded-3xl shadow-xl p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-indigo-600 text-white rounded-2xl p-6 text-center">
                  <p className="uppercase tracking-wide opacity-70">
                    Now Serving
                  </p>
                  <h3 className="text-5xl font-bold">
                    {queue?.latest_number ?? "--"}
                  </h3>
                </div>

                <div className="bg-indigo-500 text-white rounded-2xl p-6 text-center">
                  <p className="uppercase tracking-wide opacity-70">
                    Next Number
                  </p>
                  <h3 className="text-5xl font-bold">{nextNumber ?? "--"}</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border text-center">
                  <p className="uppercase tracking-wide text-gray-500">
                    Your Ticket
                  </p>
                  <h3 className="text-4xl font-bold">
                    {userTicket ? `#${userTicket.ticket_number}` : "-"}
                  </h3>
                  <p className="mt-2 text-gray-600">{userStatusText()}</p>
                </div>
              </div>

              {!userTicket && (
                <div className="text-center">
                  <button
                    onClick={() => navigate(`/queue/${queueId}`)}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl"
                  >
                    Create a Ticket
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
