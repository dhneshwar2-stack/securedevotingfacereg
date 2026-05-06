import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, Trash2, Plus, Trophy } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const ADMIN_PASSWORD = "admin123";

interface Candidate { id: string; name: string; party: string; symbol_url: string | null }
interface ResultRow { candidate: Candidate; votes: number }

function AdminPage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [newC, setNewC] = useState({ name: "", party: "" });
  const [symbolFile, setSymbolFile] = useState<File | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("admin") === "1") setAuthed(true);
  }, []);

  const loadData = async () => {
    const { data: cands } = await supabase.from("candidates").select("*").order("created_at");
    const { data: votes } = await supabase.from("votes").select("candidate_id");
    const counts = new Map<string, number>();
    (votes ?? []).forEach((v) => counts.set(v.candidate_id, (counts.get(v.candidate_id) ?? 0) + 1));
    const list = (cands ?? []) as Candidate[];
    setCandidates(list);
    setResults(list.map((c) => ({ candidate: c, votes: counts.get(c.id) ?? 0 })).sort((a, b) => b.votes - a.votes));
    setTotalVotes(votes?.length ?? 0);
  };

  useEffect(() => {
    if (!authed) return;
    loadData();
    const ch = supabase
      .channel("admin-votes")
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "candidates" }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [authed]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin", "1");
      setAuthed(true);
    } else {
      toast.error("Wrong password");
    }
  };

  const addCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    let symbol_url: string | null = null;
    if (symbolFile) {
      const fileName = `candidates/${Date.now()}-${symbolFile.name}`;
      const { error: upErr } = await supabase.storage.from("voting").upload(fileName, symbolFile);
      if (upErr) { toast.error("Symbol upload failed"); return; }
      symbol_url = supabase.storage.from("voting").getPublicUrl(fileName).data.publicUrl;
    }
    const { error } = await supabase.from("candidates").insert({
      name: newC.name, party: newC.party, symbol_url,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Candidate added");
    setNewC({ name: "", party: "" });
    setSymbolFile(null);
  };

  const deleteCandidate = async (id: string) => {
    const { error } = await supabase.from("candidates").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <Card className="p-6 bg-gradient-card shadow-elegant">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-hero flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Admin Login</h1>
                <p className="text-sm text-muted-foreground">Manage candidates & view results</p>
              </div>
            </div>
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="admin123" />
              </div>
              <Button type="submit" className="w-full">Login</Button>
              <p className="text-xs text-muted-foreground text-center">Default password: admin123</p>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  const max = Math.max(1, ...results.map((r) => r.votes));
  const winner = results[0];

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <Button variant="outline" size="sm" onClick={() => { sessionStorage.removeItem("admin"); navigate({ to: "/" }); }}>
            Logout
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Total votes cast: <span className="font-semibold text-foreground">{totalVotes}</span></p>
        </div>

        {winner && winner.votes > 0 && (
          <Card className="p-6 bg-gradient-hero text-primary-foreground shadow-glow flex items-center gap-4">
            <Trophy className="h-10 w-10" />
            <div>
              <div className="text-sm opacity-90">Currently leading</div>
              <div className="text-2xl font-bold">{winner.candidate.name} — {winner.candidate.party}</div>
              <div className="text-sm opacity-90">{winner.votes} vote{winner.votes !== 1 ? "s" : ""}</div>
            </div>
          </Card>
        )}

        <Card className="p-6 bg-gradient-card shadow-elegant">
          <h2 className="text-xl font-bold mb-4">Live Results</h2>
          {results.length === 0 ? (
            <p className="text-muted-foreground">No candidates yet.</p>
          ) : (
            <div className="space-y-3">
              {results.map((r) => {
                const pct = totalVotes ? (r.votes / totalVotes) * 100 : 0;
                return (
                  <div key={r.candidate.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {r.candidate.symbol_url && <img src={r.candidate.symbol_url} alt="" className="w-8 h-8 object-contain" />}
                        <div>
                          <div className="font-semibold">{r.candidate.name}</div>
                          <div className="text-xs text-muted-foreground">{r.candidate.party}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{r.votes}</div>
                        <div className="text-xs text-muted-foreground">{pct.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-hero transition-all" style={{ width: `${(r.votes / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-6 bg-gradient-card shadow-elegant">
          <h2 className="text-xl font-bold mb-4">Manage Candidates</h2>
          <form onSubmit={addCandidate} className="grid gap-3 md:grid-cols-4 items-end mb-6">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input required value={newC.name} onChange={(e) => setNewC({ ...newC, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Party</Label>
              <Input required value={newC.party} onChange={(e) => setNewC({ ...newC, party: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Symbol image</Label>
              <Input type="file" accept="image/*" onChange={(e) => setSymbolFile(e.target.files?.[0] ?? null)} />
            </div>
            <Button type="submit"><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </form>

          <div className="space-y-2">
            {candidates.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50">
                <div className="flex items-center gap-3">
                  {c.symbol_url && <img src={c.symbol_url} alt="" className="w-10 h-10 object-contain" />}
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.party}</div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteCandidate(c.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
