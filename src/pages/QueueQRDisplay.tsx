import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Layout from "../components/Layout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMobileAlt,
  faBullseye,
  faForward,
} from "@fortawesome/free-solid-svg-icons";

type Queue = {
  id: string;
  qr: string;
  latest_number: number | null;
  cutoff_number: number | null;
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
  const [cutoffNumber, setCutoffNumber] = useState<number | null>(null);

  const isFirstLoad = useRef(true);

  // 🔊 Play sound when number changes
  const playSound = () => {
    const audio = new Audio("/notification.mp3");
    audio.play().catch((err) => {
      console.warn("Audio playback failed", err);
      try {
      } catch (audioError) {}
    });
  };

  // Fetch queue info (including latest_number)
  useEffect(() => {
    if (!queueId) return;

    const fetchQueue = async () => {
      const { data } = await supabase
        .from("Queue")
        .select("id, qr, latest_number, cutoff_number")
        .eq("id", queueId)
        .single();

      if (data) {
        setQueue(data);
        setCurrentServing(data.latest_number ?? null);
        setCutoffNumber(data.cutoff_number ?? null);
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
          event: "*",
          schema: "public",
          table: "Queue",
          filter: `id=eq.${queueId}`,
        },
        (payload) => {
          const updated = payload.new as Queue;

          setCurrentServing(updated.latest_number ?? null);
          setCutoffNumber(updated.cutoff_number ?? null);

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

        async (payload) => {
          console.log("Ticket change detected:", payload);
          const { data } = await supabase
            .from("Queue_Tickets")
            .select("*")
            .eq("queue_id", queueId)
            .order("ticket_number", { ascending: true });

          updateNextNumber(data || []);
        },
      )
      .subscribe((status) => {
        console.log("TEST STATUS:", status);
      });

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
      <div className="min-h-screen bg-linear-to-br from-background via-orange-50/30 to-background flex flex-col items-center justify-center p-6">
        {queue && (
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl p-8 md:p-12 border border-primary/20">
            {/* QR Code Section */}
            <div className="text-center mb-10">
              {/* Queue ID Display - Large for TV/Distance */}
              <div className="mb-8">
                <div className="inline-flex flex-col items-center justify-center px-8 md:px-12 py-4 md:py-6 bg-linear-to-br from-purple-600 to-indigo-700 border-4 border-purple-300 rounded-3xl shadow-2xl min-w-70 md:min-w-100">
                  <span className="text-sm md:text-lg font-bold text-purple-200 uppercase tracking-widest mb-1 md:mb-2">
                    Queue ID
                  </span>
                  <span
                    className="text-3xl md:text-5xl lg:text-6xl font-mono font-black text-white select-all tracking-wider drop-shadow-lg"
                    style={{ fontFamily: "monospace" }}
                  >
                    {queue.id}
                  </span>
                </div>
              </div>

              <div className="inline-block p-6 bg-linear-to-br from-primary/10 via-orange-100/50 to-primary/10 rounded-3xl border-2 border-primary/20 shadow-xl mb-6">
                <img
                  src={queue.qr}
                  alt="Queue QR"
                  className="w-64 h-64 md:w-72 md:h-72 mx-auto rounded-2xl shadow-lg"
                />
              </div>
              <p className="text-lg text-gray-600 font-semibold">
                <FontAwesomeIcon icon={faMobileAlt} className="mr-2" /> Scan
                this QR code to join the queue
              </p>
            </div>

            {/* Display Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-linear-to-br from-primary via-orange-600 to-primary text-white rounded-3xl p-8 md:p-12 shadow-2xl border border-primary/30">
              {/* NOW SERVING */}
              <div className="text-center border-r-0 md:border-r border-primary/40">
                <p className="text-lg md:text-xl opacity-90 font-semibold tracking-wide mb-3">
                  NOW SERVING
                </p>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <FontAwesomeIcon icon={faBullseye} className="text-4xl" />
                  <h1 className="text-7xl md:text-8xl font-extrabold drop-shadow-lg">
                    {currentServing ?? "--"}
                  </h1>
                </div>
                <p className="text-sm md:text-base opacity-80 mt-3 font-medium">
                  Current ticket being served
                </p>
              </div>

              {/* NEXT NUMBER */}
              <div className="text-center">
                <p className="text-lg md:text-xl opacity-90 font-semibold tracking-wide mb-3">
                  NEXT IN LINE
                </p>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <FontAwesomeIcon icon={faForward} className="text-4xl" />
                  <h1 className="text-7xl md:text-8xl font-extrabold drop-shadow-lg">
                    {nextNumber ?? "--"}
                  </h1>
                </div>
                <p className="text-sm md:text-base opacity-80 mt-3 font-medium">
                  Upcoming ticket number
                </p>
              </div>
            </div>

            {/* Footer Info */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Please wait for your number to be called
              </p>
              {cutoffNumber !== null && (
                <div className="mt-4 p-4 bg-linear-to-r from-purple-100 to-indigo-100 border-2 border-purple-300 rounded-2xl inline-block">
                  <p className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                    <span className="text-lg">✂</span> End-of-Day Cutoff at
                    Ticket
                    <span className="text-xl font-bold">#{cutoffNumber}</span>
                  </p>
                  {currentServing && (
                    <p className="text-xs text-purple-700 mt-1">
                      {cutoffNumber - currentServing} ticket
                      {cutoffNumber - currentServing !== 1 ? "s" : ""} remaining
                      • Remaining tickets will be served tomorrow or next
                      working day
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default QueueQRDisplay;
