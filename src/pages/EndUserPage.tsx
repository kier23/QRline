import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, Camera } from "lucide-react";
import { BrowserQRCodeReader } from "@zxing/browser";

const EndUserPage: React.FC = () => {
  const [queueId, setQueueId] = useState("");
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReader = useRef<BrowserQRCodeReader | null>(null);

  useEffect(() => {
    codeReader.current = new BrowserQRCodeReader();

    return () => {
      codeReader.current?.reset();
    };
  }, []);

  const startScanning = async () => {
    if (!videoRef.current || !codeReader.current) return;

    setScanning(true);

    try {
      await codeReader.current.decodeFromVideoDevice(
        null,
        videoRef.current,
        (result, err) => {
          if (result) {
            const text = result.getText();
            setQueueId(text);
            stopScanning();
          }
        },
      );
    } catch (error: any) {
      console.error(error);
      alert("Camera error or permission denied");
      setScanning(false);
    }
  };

  const stopScanning = () => {
    codeReader.current?.reset();
    setScanning(false);
  };

  const handleSubmit = () => {
    if (!queueId) return alert("Please enter or scan a Queue ID");

    // TODO: connect to your queue logic
    console.log("Joining queue:", queueId);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6 gap-6">
      {/* Title */}
      <h1 className="text-3xl font-bold">PayFlow PSU</h1>

      {/* QR Scanner Section */}
      <Card className="w-full max-w-md">
        <CardContent className="p-4 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Camera /> Scan QR Code
          </div>

          {scanning ? (
            <>
              <video ref={videoRef} className="w-full rounded-xl" />
              <Button
                variant="destructive"
                onClick={stopScanning}
                className="w-full"
              >
                Stop Scanning
              </Button>
            </>
          ) : (
            <Button onClick={startScanning} className="w-full">
              Start Scanning
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Queue ID Input */}
      <Card className="w-full max-w-md">
        <CardContent className="p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <QrCode /> Enter Queue ID
          </div>

          <Input
            placeholder="Enter Queue ID"
            value={queueId}
            onChange={(e) => setQueueId(e.target.value)}
          />

          <Button onClick={handleSubmit}>Join Queue</Button>
        </CardContent>
      </Card>

      {/* Introduction + Rules */}
      <Card className="w-full max-w-2xl">
        <CardContent className="p-6 flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Introduction</h2>
          <p className="text-gray-600">
            PayFlow PSU is a digital queuing system designed to reduce long
            lines and improve the payment experience at Palawan State University
            by allowing users to join queues through QR scanning or queue ID
            input.
          </p>

          <h2 className="text-xl font-semibold">Rules</h2>
          <ul className="list-disc pl-5 text-gray-600">
            <li>Follow the queue order displayed in the system.</li>
            <li>Keep your queue ID or QR code ready when called.</li>
            <li>Additional rules can be added here.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default EndUserPage;
