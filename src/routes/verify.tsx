import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Webcam } from "@/components/Webcam";
import { loadFaceModels, getFaceDescriptor, compareDescriptors, FACE_MATCH_THRESHOLD } from "@/lib/faceapi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, ScanFace, Loader2 } from "lucide-react";

export const Route = createFileRoute("/verify")({
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [voter, setVoter] = useState<any>(null);

  useEffect(() => {
    const v = sessionStorage.getItem("voter");
    if (!v) {
      navigate({ to: "/" });
      return;
    }
    setVoter(JSON.parse(v));
    loadFaceModels().then(() => setModelsLoading(false));
  }, [navigate]);

  const handleVerify = async () => {
    if (!videoRef.current || !voter?.face_descriptor) {
      toast.error("Camera or stored face data missing");
      return;
    }
    setVerifying(true);
    try {
      const descriptor = await getFaceDescriptor(videoRef.current);
      if (!descriptor) {
        toast.error("No face detected. Try again.");
        setVerifying(false);
        return;
      }
      const distance = compareDescriptors(descriptor, voter.face_descriptor as number[]);
      if (distance < FACE_MATCH_THRESHOLD) {
        toast.success(`Face verified (match: ${(1 - distance).toFixed(2)})`);
        navigate({ to: "/vote" });
      } else {
        toast.error(`Face does not match (distance: ${distance.toFixed(2)})`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  if (!voter) return null;

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-xl mx-auto space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Cancel
        </Link>

        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Face Verification</h1>
          <p className="text-muted-foreground">Welcome, <span className="font-semibold text-foreground">{voter.name}</span>. Verify your identity to continue.</p>
        </div>

        <Card className="p-6 bg-gradient-card shadow-elegant space-y-4">
          <div className="rounded-lg overflow-hidden border-2 border-primary/30 bg-muted aspect-[4/3]">
            <Webcam onReady={(v) => (videoRef.current = v)} className="w-full h-full object-cover" />
          </div>
          <Button onClick={handleVerify} disabled={verifying || modelsLoading} className="w-full" size="lg">
            {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanFace className="mr-2 h-4 w-4" />}
            {modelsLoading ? "Loading models..." : "Verify Face"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
