import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, Vote, Clock, Lock } from "lucide-react";
import { useSettings, votingStatus } from "@/lib/settings";

export const Route = createFileRoute("/vote")({
  component: VotePage,
});

interface Candidate {
  id: string;
  name: string;
  party: string;
  symbol_url: string | null;
}

function VotePage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const status = votingStatus(settings);
  const [voter, setVoter] = useState<any>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Candidate | null>(null);

  useEffect(() => {
    const v = sessionStorage.getItem("voter");
    if (!v) {
      navigate({ to: "/" });
      return;
    }
    setVoter(JSON.parse(v));
    supabase
      .from("candidates")
      .select("*")
      .order("created_at")
      .then(({ data }) => setCandidates(data ?? []));
  }, [navigate]);

  const castVote = async (c: Candidate) => {
    if (!voter) return;
    if (!status.open) {
      toast.error("Voting is currently closed");
      return;
    }
    setSubmitting(c.id);
    const { error } = await supabase.from("votes").insert({
      voter_id: voter.id,
      candidate_id: c.id,
    });
    if (error) {
      toast.error("Failed to cast vote");
      setSubmitting(null);
      return;
    }
    await supabase.from("voters").update({ has_voted: true }).eq("id", voter.id);
    setConfirmed(c);
    sessionStorage.removeItem("voter");
  };

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-gradient-card shadow-elegant space-y-4">
          <div className="mx-auto h-20 w-20 rounded-full bg-success/15 flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-success" />
          </div>
          <h2 className="text-2xl font-bold">Vote Cast Successfully!</h2>
          <p className="text-muted-foreground">You voted for:</p>
          <Card className="p-4 bg-accent/40">
            {confirmed.symbol_url && (
              <img src={confirmed.symbol_url} alt={confirmed.party} className="w-16 h-16 mx-auto mb-2 object-contain" />
            )}
            <div className="font-bold text-lg">{confirmed.name}</div>
            <div className="text-sm text-muted-foreground">{confirmed.party}</div>
          </Card>
          <Button onClick={() => navigate({ to: "/" })} className="w-full">Done</Button>
        </Card>
      </div>
    );
  }

  if (!status.open) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-gradient-card shadow-elegant space-y-4">
          <div className="mx-auto h-20 w-20 rounded-full bg-destructive/15 flex items-center justify-center">
            <Lock className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold">
            {status.reason === "not-started" ? "Voting hasn't started yet" : "Voting has ended"}
          </h2>
          {status.start && status.reason === "not-started" && (
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" /> Opens at {status.start.toLocaleString()}
            </p>
          )}
          {status.end && status.reason === "ended" && (
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" /> Closed at {status.end.toLocaleString()}
            </p>
          )}
          <Link to="/" className="text-sm text-primary underline">Back to home</Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2"><Vote className="h-7 w-7 text-primary" /> Cast Your Vote</h1>
          <p className="text-muted-foreground">Tap a candidate to cast your vote. This action cannot be undone.</p>
          {status.end && (
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Voting closes at {status.end.toLocaleString()}</p>
          )}
        </div>

        {candidates.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No candidates available yet.</Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((c) => (
              <Card key={c.id} className="p-6 bg-gradient-card hover:shadow-elegant transition-all flex flex-col items-center text-center space-y-3">
                {c.symbol_url ? (
                  <img src={c.symbol_url} alt={c.party} className="w-24 h-24 object-contain" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
                    {c.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="font-bold text-lg">{c.name}</div>
                  <div className="text-sm text-muted-foreground">{c.party}</div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => castVote(c)}
                  disabled={!!submitting}
                >
                  {submitting === c.id ? "Casting..." : "Vote"}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
