import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";
import api from "@/lib/api";
import { toast } from "sonner";
import { Lock, Mail, Activity } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      login(data.token, data.user);
      toast.success(`Welcome ${data.user.name}`);
      navigate("/");
    } catch (err) {
      const d = err?.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page" style={{ background: "var(--ti-bg)" }}>
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1769144256181-698b8f807066?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHwxfHxjb250YWluZXIlMjBzaGlwJTIwcG9ydCUyMGFlcmlhbHxlbnwwfHx8fDE3NzY5NzM3MDh8MA&ixlib=rb-4.1.0&q=85)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(11,20,38,0.85) 0%, rgba(15,31,53,0.75) 100%)" }} />
        <div className="relative z-10 p-12 flex flex-col justify-between w-full">
          <Logo variant="full" live height={56} />
          <div className="max-w-lg">
            <div className="label-tracked mb-4 flex items-center gap-2" style={{ color: "var(--ti-gold)" }}>
              <Activity className="h-3 w-3" /> PAKISTAN EXPORT INTELLIGENCE TERMINAL
            </div>
            <h1 className="heading-display text-5xl xl:text-6xl leading-[0.95] mb-6 text-white">
              Every shipment.<br/>Every buyer.<br/><span className="text-gold-gradient">One terminal.</span>
            </h1>
            <p className="text-base text-white/80 leading-relaxed max-w-md">
              A live index of Pakistani exports — search by product and instantly see who's buying, at what price, in which city, from which Pakistani exporter.
            </p>
          </div>
          <div className="text-[10px] mono tracking-[0.2em] uppercase" style={{ color: "rgba(212,175,55,0.7)" }}>
            Feedback · azulmax990@gmail.com · +92 339 0112545
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 terminal-grid" style={{ background: "var(--ti-bg-alt)" }}>
        <form onSubmit={submit} className="w-full max-w-sm space-y-7 animate-in" data-testid="login-form">
          <div className="lg:hidden mb-2"><Logo variant="full" live height={44} /></div>
          <div>
            <div className="label-tracked mb-3" style={{ color: "var(--ti-gold)" }}>SECURE ACCESS</div>
            <h2 className="heading-display text-3xl mb-2 text-white">Sign in to terminal</h2>
            <p className="text-sm" style={{ color: "var(--ti-text-muted)" }}>Sign in with your email to view and search shipments.</p>
          </div>

          <div className="space-y-3">
            <Label className="label-tracked">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 z-10" style={{ color: "var(--ti-text-dim)" }} />
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus className="pl-9 h-11 rounded-sm" data-testid="login-email-input" />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="label-tracked">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 z-10" style={{ color: "var(--ti-text-dim)" }} />
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="pl-9 h-11 rounded-sm" data-testid="login-password-input" />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 rounded-sm bg-[#002FA7] hover-lift font-bold tracking-wide" data-testid="login-submit-button">
            {loading ? "Authenticating..." : "Enter Terminal →"}
          </Button>

          <div className="text-sm text-center" style={{ color: "var(--ti-text-muted)" }}>
            New here?{" "}
            <Link to="/register" className="font-bold hover:underline" style={{ color: "var(--ti-gold)" }} data-testid="goto-register">
              Create a free account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
