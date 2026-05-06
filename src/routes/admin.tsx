import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, Trash2, Plus, Trophy, Clock, Palette, Mail, KeyRound } from "lucide-react";
import { useSettings, votingStatus } from "@/lib/settings";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function rgbToHex(r: number, g: number, b: number) {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
// store theme tokens as oklch strings; use simple approximations via CSS color-mix is overkill.
// We'll just store hex; faceapi-free: CSS variables accept any color.
function hexToOklch(hex: string) { return hex; }
function oklchToHexSafe(val: string, fallback: string) {
  return val.startsWith("#") ? val : fallback;
}

interface Candidate { id: string; name: string; party: string; symbol_url: string | null }
interface ResultRow { candidate: Candidate; votes: number }

function AdminPage() {
  const navigate = useNavigate();
  const { settings, reload } = useSettings();
  const [authed, setAuthed] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [newC, setNewC] = useState({ name: "", party: "" });
  const [symbolFile, setSymbolFile] = useState<File | null>(null);
  const [startStr, setStartStr] = useState("");
  const [endStr, setEndStr] = useState("");
  const [primary, setPrimary] = useState("#6366f1");
  const [accent, setAccent] = useState("#a78bfa");
  const [durationMin, setDurationMin] = useState(60);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    return !!data;
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (session?.user) {
        const isAdmin = await checkAdmin(session.user.id);
        setAuthed(isAdmin);
        if (!isAdmin) toast.error("This account is not an admin");
      } else {
        setAuthed(false);
      }
      setCheckingAuth(false);
    });
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        setAuthed(await checkAdmin(data.session.user.id));
      }
      setCheckingAuth(false);
    });
    return () => sub.subscription.unsubscribe();
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

  useEffect(() => {
    if (!settings) return;
    const toLocal = (iso: string | null) => {
      if (!iso) return "";
      const d = new Date(iso);
      const off = d.getTimezoneOffset();
      return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
    };
    setStartStr(toLocal(settings.voting_start));
    setEndStr(toLocal(settings.voting_end));
    if (settings.theme_primary) setPrimary(oklchToHexSafe(settings.theme_primary, primary));
    if (settings.theme_accent) setAccent(oklchToHexSafe(settings.theme_accent, accent));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.voting_start, settings?.voting_end, settings?.theme_primary, settings?.theme_accent]);

  const updateSettings = async (patch: Record<string, any>) => {
    const { error } = await supabase.from("settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", "global");
    if (error) { toast.error(error.message); return false; }
    reload();
    return true;
  };

  const saveWindow = async () => {
    if (await updateSettings({
      voting_start: startStr ? new Date(startStr).toISOString() : null,
      voting_end: endStr ? new Date(endStr).toISOString() : null,
    })) toast.success("Voting window saved");
  };
  const startNow = async () => {
    const start = new Date();
    const end = new Date(start.getTime() + durationMin * 60000);
    if (await updateSettings({ voting_start: start.toISOString(), voting_end: end.toISOString() }))
      toast.success(`Voting open for ${durationMin} min`);
  };
  const closeNow = async () => {
    if (await updateSettings({ voting_end: new Date().toISOString() })) toast.success("Voting closed");
  };
  const clearWindow = async () => {
    if (await updateSettings({ voting_start: null, voting_end: null })) toast.success("Window cleared (always open)");
  };
  const saveTheme = async () => {
    if (await updateSettings({ theme_primary: hexToOklch(primary), theme_accent: hexToOklch(accent) }))
      toast.success("Theme updated");
  };
  const resetTheme = async () => {
    if (await updateSettings({ theme_primary: null, theme_accent: null })) toast.success("Theme reset");
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/admin` },
      });
      if (error) throw error;
      toast.success("OTP code sent to your email");
      setOtpStep("verify");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send OTP");
    } finally {
      setAuthLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message ?? "Invalid OTP");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
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

  if (checkingAuth) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <Card className="p-6 bg-gradient-card shadow-elegant space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-hero flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Admin Login</h1>
                <p className="text-sm text-muted-foreground">Authenticated access only</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => { setAuthMode("password"); setOtpStep("request"); }}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${authMode === "password" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                <KeyRound className="h-4 w-4" /> Password
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("otp"); setOtpStep("request"); }}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${authMode === "otp" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                <Mail className="h-4 w-4" /> Email OTP
              </button>
            </div>

            {authMode === "password" ? (
              <form onSubmit={handlePasswordAuth} className="space-y-3">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={authLoading}>
                  {authLoading ? "Please wait…" : isSignup ? "Create admin account" : "Login"}
                </Button>
                <button type="button" onClick={() => setIsSignup((s) => !s)} className="w-full text-xs text-muted-foreground hover:text-foreground">
                  {isSignup ? "Have an account? Sign in" : "First time? Create account"}
                </button>
                <p className="text-[11px] text-muted-foreground text-center">
                  The first registered account becomes admin.
                </p>
              </form>
            ) : otpStep === "request" ? (
              <form onSubmit={sendOtp} className="space-y-3">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" />
                </div>
                <Button type="submit" className="w-full" disabled={authLoading}>
                  {authLoading ? "Sending…" : "Send OTP"}
                </Button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="space-y-3">
                <div className="space-y-2">
                  <Label>Enter the 6-digit code sent to {email}</Label>
                  <Input inputMode="numeric" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="123456" />
                </div>
                <Button type="submit" className="w-full" disabled={authLoading}>
                  {authLoading ? "Verifying…" : "Verify & Login"}
                </Button>
                <button type="button" onClick={() => setOtpStep("request")} className="w-full text-xs text-muted-foreground hover:text-foreground">
                  Use a different email
                </button>
              </form>
            )}
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
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Total votes cast: <span className="font-semibold text-foreground">{totalVotes}</span></p>
        </div>

        {(() => {
          const st = votingStatus(settings);
          const label = st.reason === "open" || st.reason === "no-window" ? "OPEN" : st.reason === "not-started" ? "SCHEDULED" : "CLOSED";
          const cls = st.open ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive";
          return (
            <Card className="p-6 bg-gradient-card shadow-elegant space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-xl font-bold flex items-center gap-2"><Clock className="h-5 w-5" /> Voting Window</h2>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${cls}`}>{label}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input type="datetime-local" value={startStr} onChange={(e) => setStartStr(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Input type="datetime-local" value={endStr} onChange={(e) => setEndStr(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={saveWindow}>Save window</Button>
                <Button variant="outline" onClick={clearWindow}>Clear (always open)</Button>
                <Button variant="destructive" onClick={closeNow}>Close voting now</Button>
              </div>
              <div className="flex items-end gap-2 pt-2 border-t border-border/50">
                <div className="space-y-2">
                  <Label>Quick start (minutes)</Label>
                  <Input type="number" min={1} value={durationMin} onChange={(e) => setDurationMin(Math.max(1, Number(e.target.value) || 1))} className="w-32" />
                </div>
                <Button onClick={startNow}>Start voting now</Button>
              </div>
              {settings?.voting_end && (
                <p className="text-xs text-muted-foreground">
                  {st.open ? "Closes" : "Closed"} at {new Date(settings.voting_end).toLocaleString()}
                </p>
              )}
            </Card>
          );
        })()}

        <Card className="p-6 bg-gradient-card shadow-elegant space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Palette className="h-5 w-5" /> Theme Colors</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Primary</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-10 w-14 rounded border border-border bg-background cursor-pointer" />
                <Input value={primary} onChange={(e) => setPrimary(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accent</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-10 w-14 rounded border border-border bg-background cursor-pointer" />
                <Input value={accent} onChange={(e) => setAccent(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveTheme}>Apply theme</Button>
            <Button variant="outline" onClick={resetTheme}>Reset to default</Button>
          </div>
        </Card>

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
