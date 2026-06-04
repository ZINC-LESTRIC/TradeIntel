import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { toast } from "sonner";
import { Lock, Mail, Anchor } from "lucide-react";

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
    <div className="min-h-screen flex" data-testid="login-page">
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1769144256181-698b8f807066?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHwxfHxjb250YWluZXIlMjBzaGlwJTIwcG9ydCUyMGFlcmlhbHxlbnwwfHx8fDE3NzY5NzM3MDh8MA&ixlib=rb-4.1.0&q=85)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-slate-900/55" />
        <div className="relative z-10 p-12 flex flex-col justify-between text-white w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white text-[#002FA7] flex items-center justify-center font-black text-lg">PK</div>
            <span className="text-xs tracking-[0.3em] uppercase font-bold">Trade Intelligence</span>
          </div>
          <div className="max-w-lg">
            <h1 className="heading-display text-5xl xl:text-6xl leading-[0.95] mb-6">
              Every shipment.<br/>Every buyer.<br/>One search box.
            </h1>
            <p className="text-base text-white/80 leading-relaxed max-w-md">
              A live index of Pakistani exports — search by product and see who's buying, at what price, in which city.
            </p>
          </div>
          <div className="text-xs tracking-[0.2em] uppercase text-white/60">
            Pakistan → World
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <form onSubmit={submit} className="w-full max-w-sm space-y-7 animate-in" data-testid="login-form">
          <div>
            <div className="label-tracked mb-3">SIGN IN</div>
            <h2 className="heading-display text-3xl mb-2">Welcome back</h2>
            <p className="text-sm text-slate-500">Sign in with your email to view and search shipments.</p>
          </div>

          <div className="space-y-3">
            <Label className="label-tracked">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="pl-9 h-11 rounded-sm border-slate-300"
                data-testid="login-email-input"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="label-tracked">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pl-9 h-11 rounded-sm border-slate-300"
                data-testid="login-password-input"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-sm bg-[#002FA7] hover:bg-[#00227A] text-white font-bold tracking-wide"
            data-testid="login-submit-button"
          >
            {loading ? "Signing in..." : "Sign in →"}
          </Button>

          <div className="text-sm text-slate-500 text-center">
            New here?{" "}
            <Link to="/register" className="text-[#002FA7] font-bold hover:underline" data-testid="goto-register">
              Create a free account
            </Link>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2 pt-4 border-t border-slate-200">
            <Anchor className="h-3 w-3" />
            <span>Viewer accounts can search & analyse. Only admin can add data.</span>
          </div>
        </form>
      </div>
    </div>
  );
}
