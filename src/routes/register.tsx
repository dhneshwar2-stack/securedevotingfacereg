import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Webcam, captureFrame } from "@/components/Webcam";
import { loadFaceModels, getFaceDescriptor } from "@/lib/faceapi";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "male",
    voter_id: "",
  });

  useEffect(() => {
    loadFaceModels()
      .then(() => setModelsLoading(false))
      .catch((e) => {
        console.error(e);
        toast.error("Failed to load face recognition models");
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoRef.current) {
      toast.error("Camera not ready");
      return;
    }
    setSubmitting(true);
    try {
      const descriptor = await getFaceDescriptor(videoRef.current);
      if (!descriptor) {
        toast.error("No face detected. Please look at the camera.");
        setSubmitting(false);
        return;
      }
      const { dataUrl } = captureFrame(videoRef.current);
      const blob = await (await fetch(dataUrl)).blob();
      const fileName = `voters/${form.voter_id}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("voting")
        .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("voting").getPublicUrl(fileName);

      const { error } = await supabase.from("voters").insert({
        voter_id: form.voter_id.trim(),
        name: form.name.trim(),
        age: parseInt(form.age),
        gender: form.gender,
        photo_url: pub.publicUrl,
        face_descriptor: Array.from(descriptor) as unknown as never,
      });
      if (error) {
        if (error.code === "23505") {
          toast.error("Voter ID already registered");
        } else {
          toast.error(error.message);
        }
        setSubmitting(false);
        return;
      }
      toast.success("Registration successful! Please login.");
      navigate({ to: "/" });
    } catch (err) {
      console.error(err);
      toast.error("Registration failed");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="space-y-1">
          <h1 className="text-3xl font-bold">New Voter Registration</h1>
          <p className="text-muted-foreground">Fill in your details and capture your face for verification</p>
        </div>

        <Card className="p-6 bg-gradient-card shadow-elegant">
          <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Age</Label>
                <Input type="number" min={18} max={120} required value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Voter ID Number</Label>
                <Input required value={form.voter_id} onChange={(e) => setForm({ ...form, voter_id: e.target.value })} />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2"><Camera className="h-4 w-4" /> Face Capture</Label>
              <div className="rounded-lg overflow-hidden border-2 border-primary/30 bg-muted aspect-[4/3]">
                <Webcam onReady={(v) => (videoRef.current = v)} className="w-full h-full object-cover" />
              </div>
              <p className="text-xs text-muted-foreground">
                {modelsLoading ? "Loading face models..." : "Look directly at the camera"}
              </p>
            </div>

            <div className="md:col-span-2">
              <Button type="submit" className="w-full" disabled={submitting || modelsLoading}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Register Voter
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
