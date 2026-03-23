import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, Camera, Info, CheckCircle } from "lucide-react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLightbulb } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";

const EndUserPage: React.FC = () => {
  const navigate = useNavigate();
  const [queueId, setQueueId] = useState("");
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReader = useRef<BrowserQRCodeReader | null>(null);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    codeReader.current = new BrowserQRCodeReader();

    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  const startScanning = async () => {
    if (!codeReader.current) return;

    setScanning(true);

    setTimeout(async () => {
      if (!videoRef.current || !codeReader.current) return;

      try {
        const reader = codeReader.current;

        controlsRef.current = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (result) {
              setQueueId(result.getText());
              stopScanning();
            }
          },
        );
      } catch (error) {
        console.error(error);
        alert("Camera failed to start");
        setScanning(false);
      }
    });
  };

  const stopScanning = () => {
    controlsRef.current?.stop();
    setScanning(false);
  };

  const handleSubmit = () => {
    if (!queueId) return alert("Please enter or scan a Queue ID");
    navigate(`/queue/${queueId}`);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-orange-50/30 to-background">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl shadow-lg sticky top-0 z-50 border-b border-primary/20">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-xl from-primary flex items-center justify-center shadow-md">
              <img
                src="/PayFlow-Logo_transparent.png"
                alt="PayFlow Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold bg-linear-to-r from-primary via-orange-600 to-black bg-clip-text text-transparent">
              PayFlow PSU
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content - Responsive Layout */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto">
          {/* Right Column - QR Scanner & Input Combined (Full width on mobile, 1/3 on PC) - Moved to top on mobile */}
          <div className="lg:col-span-1 order-first lg:order-last">
            <Card className="border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 bg-linear-to-br from-white via-orange-50/50 to-white backdrop-blur-sm rounded-3xl overflow-hidden sticky top-24">
              <CardContent className="p-8 flex flex-col gap-8">
                {/* QR Scanner Section */}
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-3 text-xl font-bold text-gray-800">
                    <div className="p-2 bg-linear-to-br from-primary/20 to-primary/10 rounded-xl">
                      <Camera className="w-6 h-6 text-primary" />
                    </div>
                    <span>Scan QR Code</span>
                  </div>

                  {scanning ? (
                    <>
                      <div className="relative rounded-2xl overflow-hidden border-4 border-primary/30 shadow-lg">
                        <video
                          ref={videoRef}
                          className="w-full aspect-square object-cover"
                          autoPlay
                          playsInline
                          muted
                        />
                        <div className="absolute inset-0 border-4 border-primary rounded-2xl animate-pulse"></div>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-3/4 h-3/4 border-2 border-white/50 rounded-lg"></div>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={stopScanning}
                        className="w-full font-bold py-6 text-base shadow-lg hover:shadow-xl transition-all"
                        size="lg"
                      >
                        Stop Scanning
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={startScanning}
                        className="w-full font-bold py-6 text-base bg-linear-to-r from-primary via-orange-600 to-primary hover:from-orange-700 hover:via-orange-700 hover:to-orange-700 shadow-xl hover:shadow-2xl transition-all transform hover:scale-[1.02]"
                        size="lg"
                      >
                        <Camera className="w-5 h-5 mr-2" />
                        Scan Queue QR
                      </Button>
                    </>
                  )}
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-linear-to-r from-transparent via-white px-4 text-gray-500 font-semibold">
                      or
                    </span>
                  </div>
                </div>

                {/* Queue ID Input Section */}
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-3 text-xl font-bold text-gray-800">
                    <div className="p-2 bg-linear-to-br from-primary/20 to-primary/10 rounded-xl">
                      <QrCode className="w-6 h-6 text-primary" />
                    </div>
                    <span>Enter Queue ID</span>
                  </div>

                  <Input
                    placeholder="Type your Queue ID here..."
                    value={queueId}
                    onChange={(e) => setQueueId(e.target.value)}
                    className="h-14 text-base border-3 border-primary/30 focus:border-primary focus:ring-4 focus:ring-primary/20 rounded-xl font-medium shadow-sm"
                  />

                  <Button
                    onClick={handleSubmit}
                    className="w-full font-bold py-6 text-base bg-linear-to-r from-primary via-orange-600 to-primary hover:from-orange-700 hover:via-orange-700 hover:to-orange-700 shadow-xl hover:shadow-2xl transition-all transform hover:scale-[1.02]"
                    size="lg"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Join Queue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Left Column - Introduction & Rules (Full width on mobile, 2/3 on PC) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Introduction Card */}
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-linear-to-br from-white to-orange-50/30 backdrop-blur-sm rounded-3xl overflow-hidden">
              <CardContent className="p-8 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-linear-to-br from-primary/10 to-primary/20 rounded-2xl shadow-inner">
                    <Info className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-800">
                    Introduction
                  </h2>
                </div>

                <p className="text-gray-700 leading-relaxed text-base md:text-lg">
                  PayFlow PSU is a digital queuing system designed to reduce
                  long lines and improve the payment experience at Palawan State
                  University by allowing users to join queues through QR
                  scanning or queue ID input. Simply scan the QR code displayed
                  at the payment counter or manually enter your queue ID to get
                  started.
                </p>

                <div className="bg-linear-to-r from-primary/10 via-orange-100/50 to-primary/10 rounded-2xl p-5 border border-primary/20 shadow-sm">
                  <p className="text-sm text-gray-800 font-semibold flex items-center gap-2">
                    <FontAwesomeIcon
                      icon={faLightbulb}
                      className="text-yellow-600"
                    />{" "}
                    Quick Tip: Scanning the QR code is faster and reduces
                    errors!
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Rules Card */}
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-linear-to-br from-white to-green-50/30 backdrop-blur-sm rounded-3xl overflow-hidden">
              <CardContent className="p-8 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-linear-to-br from-primary/10 to-primary/20 rounded-2xl shadow-inner">
                    <CheckCircle className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-800">
                    Rules & Guidelines
                  </h2>
                </div>

                <ul className="space-y-4">
                  {[
                    "Follow the queue order displayed in the system.",
                    "Keep your queue ID or QR code ready when called.",
                    "Do not skip your turn or you may lose your position.",
                    "Wait for your number to be called before approaching the counter.",
                    "Be patient and respectful to staff and other queue members.",
                  ].map((rule, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-2xl bg-white/80 hover:bg-white transition-all shadow-sm hover:shadow-md"
                    >
                      <span className="shrink-0 w-8 h-8 bg-linear-to-br from-primary to-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                        {index + 1}
                      </span>
                      <span className="leading-relaxed text-gray-700 font-medium">
                        {rule}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/90 backdrop-blur-xl border-t border-primary/20 mt-16 py-8 shadow-lg">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600 text-sm font-medium">
            © {new Date().getFullYear()} PayFlow - Queue Management System
          </p>
          <p className="text-gray-500 text-xs mt-2 font-medium">
            Palawan State University
          </p>
        </div>
      </footer>
    </div>
  );
};

export default EndUserPage;
