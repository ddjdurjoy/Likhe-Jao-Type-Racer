import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGameStore } from "@/lib/stores/gameStore";
import { P2PConnection } from "@/lib/p2pConnection";
import { Users, Wifi, AlertCircle, CheckCircle2, Loader2, Globe, Lock, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateSimpleRoomCode } from "@/lib/roomCodeGenerator";
import { 
  createPublicRoom, 
  getPublicRooms, 
  getPublicRoom, 
  joinPublicRoom,
  addGuestSignal,
  getGuestSignals 
} from "@/lib/publicRoomManager";

type RoomMode = "select" | "public-host" | "public-join" | "custom-create" | "custom-join";

export default function LocalRace() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const language = useGameStore((state) => state.language);
  const username = useGameStore((state) => state.username) || "Guest";

  const [mode, setMode] = useState<RoomMode>("select");
  const [roomCode, setRoomCode] = useState("");
  const [inputRoomCode, setInputRoomCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [players, setPlayers] = useState<string[]>([]);
  const [p2pConnection, setP2PConnection] = useState<P2PConnection | null>(null);
  const [connected, setConnected] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (p2pConnection) {
        p2pConnection.disconnect();
      }
    };
  }, [p2pConnection]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: language === "bn" ? "কপি হয়েছে!" : "Copied!",
        description: language === "bn" ? "রুম কোড কপি হয়েছে" : "Room code copied",
      });
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // PUBLIC ROOM - Host
  const handleCreatePublicRoom = async () => {
    setLoading(true);
    setError("");
    
    try {
      const p2p = new P2PConnection();
      
      p2p.on("join", (data) => {
        setPlayers((prev) => [...prev, data.username]);
        toast({
          title: language === "bn" ? "প্লেয়ার যুক্ত হয়েছে" : "Player Joined",
          description: `${data.username}`,
        });
      });

      p2p.on("connected", () => {
        setConnected(true);
      });

      p2p.on("error", (err) => {
        setError(err.message || "Connection error");
      });

      const signal = await p2p.createRoom(username);
      const code = generateSimpleRoomCode();
      
      createPublicRoom(code, username, signal);
      
      setRoomCode(code);
      setMode("public-host");
      setPlayers([username]);
      setP2PConnection(p2p);
      
      // Poll for guests joining
      pollForGuests(code, p2p);
      
    } catch (err: any) {
      setError(err.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const pollForGuests = (code: string, p2p: P2PConnection) => {
    const interval = setInterval(() => {
      const guestSignals = getGuestSignals(code);
      if (guestSignals.length > 0) {
        guestSignals.forEach((guest) => {
          p2p.acceptPeer(guest.signal);
        });
        clearInterval(interval);
      }
    }, 1000);

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  };

  // PUBLIC ROOM - Join
  const handleJoinPublicRoom = async () => {
    if (!inputRoomCode.trim()) {
      setError(language === "bn" ? "রুম কোড লিখুন" : "Enter room code");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const room = getPublicRoom(inputRoomCode.toUpperCase());
      
      if (!room) {
        setError(language === "bn" ? "রুম পাওয়া যায়নি" : "Room not found");
        setLoading(false);
        return;
      }

      const p2p = new P2PConnection();
      
      p2p.on("connected", () => {
        setConnected(true);
        toast({
          title: language === "bn" ? "সংযুক্ত!" : "Connected!",
          description: language === "bn" ? "হোস্টের সাথে সংযুক্ত" : "Connected to host",
        });
      });

      p2p.on("race-start", (data) => {
        (window as any).__p2pConnection = p2p;
        (window as any).__p2pRaceData = data;
        setLocation("/race");
      });

      p2p.on("error", (err) => {
        setError(err.message || "Connection error");
      });

      const signal = await p2p.joinRoom(room.hostSignal, username);
      
      // Store guest signal for host to pick up
      addGuestSignal(inputRoomCode.toUpperCase(), username, signal);
      joinPublicRoom(inputRoomCode.toUpperCase(), username);
      
      setMode("public-join");
      setRoomCode(inputRoomCode.toUpperCase());
      setP2PConnection(p2p);
      
    } catch (err: any) {
      setError(err.message || "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  // CUSTOM ROOM - Create
  const handleCreateCustomRoom = async () => {
    setLoading(true);
    setError("");
    
    try {
      const p2p = new P2PConnection();
      
      p2p.on("join", (data) => {
        setPlayers((prev) => [...prev, data.username]);
      });

      p2p.on("connected", () => {
        setConnected(true);
      });

      p2p.on("error", (err) => {
        setError(err.message || "Connection error");
      });

      const signal = await p2p.createRoom(username);
      const code = generateSimpleRoomCode();
      
      // For custom rooms, store signal temporarily
      (window as any).__customRoomSignal = signal;
      
      setRoomCode(code);
      setMode("custom-create");
      setPlayers([username]);
      setP2PConnection(p2p);
      
    } catch (err: any) {
      setError(err.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  // CUSTOM ROOM - Join
  const handleJoinCustomRoom = () => {
    if (!inputRoomCode.trim()) {
      setError(language === "bn" ? "রুম কোড লিখুন" : "Enter room code");
      return;
    }
    
    setRoomCode(inputRoomCode.toUpperCase());
    setMode("custom-join");
  };

  const handleStartRace = () => {
    if (!p2pConnection || !connected) {
      toast({
        title: language === "bn" ? "ত্রুটি" : "Error",
        description: language === "bn" ? "সংযুক্ত নেই" : "Not connected",
        variant: "destructive",
      });
      return;
    }

    const raceText = "The quick brown fox jumps over the lazy dog and runs swiftly through the dense forest.";
    const raceData = { text: raceText, startTime: Date.now() };
    
    p2pConnection.send({ type: "race-start", data: raceData });
    
    (window as any).__p2pConnection = p2pConnection;
    (window as any).__p2pRaceData = raceData;
    setLocation("/race");
  };

  const handleBack = () => {
    if (p2pConnection) {
      p2pConnection.disconnect();
    }
    setP2PConnection(null);
    setMode("select");
    setRoomCode("");
    setInputRoomCode("");
    setError("");
    setPlayers([]);
    setConnected(false);
  };

  return (
    <div className="container max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Wifi className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">
            {language === "bn" ? "লোকাল রেসিং" : "Local Network Racing"}
          </h1>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground">
          {language === "bn"
            ? "একই WiFi নেটওয়ার্কে রেস করুন"
            : "Race on the same WiFi network"}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* MODE SELECT */}
      {mode === "select" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Public Room */}
          <Card className="p-6 hover:border-primary transition-colors cursor-pointer" onClick={handleCreatePublicRoom}>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Globe className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {language === "bn" ? "পাবলিক রুম" : "Public Room"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === "bn"
                    ? "একটি সাধারণ কোড দিয়ে দ্রুত যোগ দিন"
                    : "Quick join with simple code"}
                </p>
              </div>
              <Button className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {language === "bn" ? "তৈরি করছে..." : "Creating..."}</>
                ) : (
                  <>{language === "bn" ? "পাবলিক রুম তৈরি করুন" : "Create Public Room"}</>
                )}
              </Button>
            </div>
          </Card>

          {/* Custom Room */}
          <Card className="p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-secondary/10 rounded-full flex items-center justify-center">
                <Lock className="h-8 w-8 text-secondary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {language === "bn" ? "কাস্টম রুম" : "Custom Room"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === "bn"
                    ? "ম্যানুয়াল সংযোগ সেটআপ"
                    : "Manual connection setup"}
                </p>
              </div>
              <div className="space-y-2">
                <Button variant="outline" className="w-full" onClick={handleCreateCustomRoom}>
                  {language === "bn" ? "রুম তৈরি করুন" : "Create Room"}
                </Button>
                <div className="text-xs text-muted-foreground">{language === "bn" ? "অথবা" : "or"}</div>
                <div className="flex gap-2">
                  <Input
                    value={inputRoomCode}
                    onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                    placeholder={language === "bn" ? "রুম কোড..." : "Room code..."}
                    className="text-sm"
                  />
                  <Button onClick={handleJoinCustomRoom}>
                    {language === "bn" ? "যোগ দিন" : "Join"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* PUBLIC HOST - Waiting */}
      {mode === "public-host" && (
        <div className="space-y-4">
          <Card className="p-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-bold">{language === "bn" ? "আপনার রুম কোড" : "Your Room Code"}</h3>
              <div className="flex items-center justify-center gap-3">
                <div className="text-4xl font-bold text-primary tracking-wider">
                  {roomCode}
                </div>
                <Button variant="outline" size="icon" onClick={handleCopyCode}>
                  {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {language === "bn"
                  ? "আপনার বন্ধুদের এই কোডটি শেয়ার করুন"
                  : "Share this code with your friends"}
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              {language === "bn" ? "প্লেয়ারস" : "Players"} ({players.length})
            </h3>
            <div className="space-y-2">
              {players.map((player, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm font-medium">{player}</span>
                  {i === 0 && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                      {language === "bn" ? "হোস্ট" : "Host"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {connected && (
            <Alert className="border-green-500">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-600">
                {language === "bn" ? "সংযুক্ত! রেস শুরু করতে পারেন।" : "Connected! Ready to start race."}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={handleStartRace} size="lg" className="flex-1" disabled={!connected || players.length < 2}>
              {language === "bn" ? "রেস শুরু করুন" : "Start Race"}
            </Button>
            <Button onClick={handleBack} variant="outline" size="lg">
              {language === "bn" ? "বাতিল" : "Cancel"}
            </Button>
          </div>
        </div>
      )}

      {/* PUBLIC JOIN - Waiting or Join Input */}
      {mode === "public-join" && (
        <Card className="p-6 text-center">
          {connected ? (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {language === "bn" ? "সংযুক্ত!" : "Connected!"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {language === "bn"
                  ? "হোস্ট রেস শুরু করার জন্য অপেক্ষা করছে..."
                  : "Waiting for host to start the race..."}
              </p>
            </>
          ) : (
            <>
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-sm text-muted-foreground">
                {language === "bn"
                  ? "হোস্টের সাথে সংযোগ করছে..."
                  : "Connecting to host..."}
              </p>
            </>
          )}
          <Button onClick={handleBack} variant="outline" className="mt-4">
            {language === "bn" ? "বাতিল" : "Cancel"}
          </Button>
        </Card>
      )}

      {/* Join Public Room Input */}
      {mode === "select" && (
        <Card className="p-6 mt-4">
          <h3 className="text-lg font-semibold mb-4 text-center">
            {language === "bn" ? "পাবলিক রুমে যোগ দিন" : "Join Public Room"}
          </h3>
          <div className="flex gap-2">
            <Input
              value={inputRoomCode}
              onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
              placeholder={language === "bn" ? "রুম কোড লিখুন..." : "Enter room code..."}
              className="text-center text-lg font-mono"
              maxLength={20}
            />
            <Button onClick={handleJoinPublicRoom} disabled={loading || !inputRoomCode.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : language === "bn" ? "যোগ দিন" : "Join"}
            </Button>
          </div>
        </Card>
      )}

      {/* CUSTOM ROOM - Similar UI but note about manual setup */}
      {(mode === "custom-create" || mode === "custom-join") && (
        <Card className="p-6">
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {language === "bn"
                ? "কাস্টম রুম: আপনাকে ম্যানুয়ালি সিগনাল এক্সচেঞ্জ করতে হবে"
                : "Custom room: You need to manually exchange signals"}
            </AlertDescription>
          </Alert>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {language === "bn"
                ? "কাস্টম রুম ফিচার শীঘ্রই আসছে..."
                : "Custom room feature coming soon..."}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {language === "bn"
                ? "এখনের জন্য পাবলিক রুম ব্যবহার করুন"
                : "For now, use Public Room"}
            </p>
            <Button onClick={handleBack}>
              {language === "bn" ? "ফিরে যান" : "Go Back"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
