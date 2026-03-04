import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Layout from "../components/Layout";

type Queue = {
  id: string;
  qr: string;
  latest_number: number | null;
};

type Ticket = {
  id: string;
  ticket_number: number;
  status: string;
};

const QueueQRDisplay = () => {
  const { queueId } = useParams();

  const [queue, setQueue] = useState<Queue | null>(null);
  const [currentServing, setCurrentServing] = useState<number | null>(null);
  const [nextNumber, setNextNumber] = useState<number | null>(null);

  const isFirstLoad = useRef(true);

  // 🔊 Play sound when number changes
  const playSound = () => {
    const audio = new Audio("/notification.mp3");
    audio.play();
  };

  // Fetch queue info (including latest_number)
  useEffect(() => {
    if (!queueId) return;

    const fetchQueue = async () => {
      const { data } = await supabase
        .from("Queue")
        .select("id, qr, latest_number")
        .eq("id", queueId)
        .single();

      if (data) {
        setQueue(data);
        setCurrentServing(data.latest_number ?? null);
      }
    };

    fetchQueue();
  }, [queueId]);

  // Fetch tickets + subscribe to both tables
  useEffect(() => {
    if (!queueId) return;

    const fetchTickets = async () => {
      const { data } = await supabase
        .from("Queue_Tickets")
        .select("*")
        .eq("queue_id", queueId)
        .order("ticket_number", { ascending: true });

      updateNextNumber(data || []);
    };

    fetchTickets();

    // 🔴 Subscribe to Queue table (latest_number changes)
    const queueChannel = supabase
      .channel("queue-latest-number")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Queue",
          filter: `id=eq.${queueId}`,
        },
        (payload) => {
          const updated = payload.new as Queue;

          setCurrentServing(updated.latest_number ?? null);

          if (!isFirstLoad.current) {
            playSound();
          }
        },
      )
      .subscribe();

    // 🔴 Subscribe to Queue_Tickets (for next number updates)
    const ticketChannel = supabase
      .channel("queue-tickets")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Queue_Tickets",
          filter: `queue_id=eq.${queueId}`,
        },
        async () => {
          const { data } = await supabase
            .from("Queue_Tickets")
            .select("*")
            .eq("queue_id", queueId)
            .order("ticket_number", { ascending: true });

          updateNextNumber(data || []);
        },
      )
      .subscribe();

    isFirstLoad.current = false;

    return () => {
      supabase.removeChannel(queueChannel);
      supabase.removeChannel(ticketChannel);
    };
  }, [queueId]);

  const updateNextNumber = (tickets: Ticket[]) => {
    const waiting = tickets.find((t) => t.status === "waiting");
    setNextNumber(waiting?.ticket_number ?? null);
  };

  return (
    <Layout showNavigation={false}>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
        {queue && (
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-10">
            {/* QR */}
            <div className="text-center mb-10">
              <img
                src={queue.qr}
                alt="Queue QR"
                className="w-72 h-72 mx-auto"
              />
            </div>

            {/* Display Section */}
            <div className="grid grid-cols-2 gap-6 bg-indigo-600 text-white rounded-3xl p-10">
              {/* NOW SERVING */}
              <div className="text-center border-r border-indigo-400">
                <p className="text-xl opacity-80">NOW SERVING</p>
                <h1 className="text-7xl font-bold mt-4">
                  {currentServing ?? "--"}
                </h1>
              </div>

              {/* NEXT NUMBER */}
              <div className="text-center">
                <p className="text-xl opacity-80">NEXT NUMBER</p>
                <h1 className="text-7xl font-bold mt-4">
                  {nextNumber ?? "--"}
                </h1>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default QueueQRDisplay;
