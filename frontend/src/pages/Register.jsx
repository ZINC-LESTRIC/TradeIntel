import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";
import api from "@/lib/api";
import { toast } from "sonner";
import { Mail, Lock, User } from "lucide-react";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error("Password must be ≥ 6 chars"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      login(data.token, data.user);
      toast.success("Account created — welcome");
      navigate("/");
    } catch (err) {
      const d = err?.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="register-page" style={{ background: "var(--ti-bg)" }}>
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1768746350424-ee28a364dcf5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzR8MHwxfHNlYXJjaHwxfHxjbG90aGluZyUyMGZhY3RvcnklMjB0ZXh0aWxlfGVufDB8fHx8MTc3Njk3MzcwOHww&ixlib=rb-4.1.0&q=85)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(11,20,38,0.88) 0%, rgba(15,31,53,0.78) 100%)" }} />
        <div className="relative z-10 p-12 flex flex-col justify-between w-full">
          <Logo variant="full" live height={56} />
          <div className="max-w-lg">
            <div className="label-tracked mb-4" style={{ color: "var(--ti-gold)" }}>FREE VIEWER ACCESS</div>
            <h1 className="heading-display text-5xl leading-[0.95] mb-6 text-white">
              Open the<br/><span className="text-gold-gradient">terminal</span>.
            </h1>
            <p className="text-base text-white/80 leading-relaxed max-w-md">
              Make an account in 10 seconds to search every Pakistani export shipment indexed in this workspace. Viewers can analyse and search — uploads stay under the admin's control.
            </p>
          </div>
          <div className="text-[10px] mono tracking-[0.2em] uppercase" style={{ color: "rgba(212,175,55,0.7)" }}>
            Feedback · azulmax990@gmail.com · +92 339 0112545
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 terminal-grid" style={{ background: "var(--ti-bg-alt)" }}>
        <form onSubmit={submit} className="w-full max-w-sm space-y-6 animate-in" data-testid="register-form">
          <div className="lg:hidden mb-2"><Logo variant="full" live height={44} /></div>
          <div>
            <div className="label-tracked mb-3" style={{ color: "var(--ti-gold)" }}>CREATE ACCOUNT</div>
            <h2 className="heading-display text-3xl mb-2 text-white">Get viewer access</h2>
            <p className="text-sm" style={{ color: "var(--ti-text-muted)" }}>Read-only. Search shipments, analyse buyers, prices and destinations.</p>
          </div>

          <Field label="Full name" icon={User}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="pl-9 h-11 rounded-sm" placeholder="Jane Doe" data-testid="register-name-input" />
          </Field>
          <Field label="Email" icon={Mail}>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="pl-9 h-11 rounded-sm" placeholder="you@example.com" data-testid="register-email-input" />
          </Field>
          <Field label="Password" icon={Lock}>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} className="pl-9 h-11 rounded-sm" placeholder="At least 6 characters" data-testid="register-password-input" />
          </Field>

          <Button type="submit" disabled={loading} className="w-full h-11 rounded-sm bg-[#002FA7] hover-lift font-bold" data-testid="register-submit-button">
            {loading ? "Creating..." : "Create account →"}
          </Button>

          <div className="text-sm text-center" style={{ color: "var(--ti-text-muted)" }}>
            Already have one?{" "}
            <Link to="/login" className="font-bold hover:underline" style={{ color: "var(--ti-gold)" }} data-testid="goto-login">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div className="space-y-2">
      <Label className="label-tracked">{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 z-10" style={{ color: "var(--ti-text-dim)" }} />
        {children}
      </div>
    </div>
  );
}
