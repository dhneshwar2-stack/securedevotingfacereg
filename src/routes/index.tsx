import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, UserPlus, Vote } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const [voterId, setVoterId] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterId.trim()) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("voters")
      .select("*")
      .eq("voter_id", voterId.trim())
      .maybeSingle();
    setLoading(false);
    if (error) {
      toast.error("Login failed");
      return;
    }
    if (!data) {
      toast.error("Voter ID not found. Please register first.");
      return;
    }
    if (data.has_voted) {
      toast.error("You have already voted.");
      return;
    }
    sessionStorage.setItem("voter", JSON.stringify(data));
    navigate({ to: "/verify" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-hero shadow-glow mb-2">
            <Vote className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">SecureVote</h1>
          <p className="text-muted-foreground">Face-verified digital voting</p>
        </div>

        <Card className="p-6 bg-gradient-card shadow-elegant border-border/50">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voterId">Voter ID Number</Label>
              <Input
                id="voterId"
                placeholder="Enter your voter ID"
                value={voterId}
                onChange={(e) => setVoterId(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Login to Vote"}
            </Button>
          </form>
        </Card>

        <Link to="/register">
          <Card className="p-4 hover:shadow-elegant transition-all cursor-pointer border-border/50 bg-card/80 backdrop-blur flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <div className="font-semibold">New Voter Registration</div>
              <div className="text-sm text-muted-foreground">
                Register and capture your face
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/admin">
          <Card className="mt-3 p-4 hover:shadow-elegant transition-all cursor-pointer border-border/50 bg-card/80 backdrop-blur flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold">Admin Login</div>
              <div className="text-sm text-muted-foreground">View results & manage candidates</div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
