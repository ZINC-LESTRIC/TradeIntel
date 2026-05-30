import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="min-h-screen flex" data-testid="register-page">
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1768746350424-ee28a364dcf5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzR8MHwxfHNlYXJjaHwxfHxjbG90aGluZyUyMGZhY3RvcnklMjB0ZXh0aWxlfGVufDB8fHx8MTc3Njk3MzcwOHww&ixlib=rb-4.1.0&q=85)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-slate-900/65" />
        <div className="relative z-10 p-12 flex flex-col justify-between text-white w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white text-[#002FA7] flex items-center justify-center font-black text-lg">PK</div>
            <span className="text-xs tracking-[0.3em] uppercase font-bold">Trade Intelligence</span>
          </div>
          <div className="max-w-lg">
            <h1 className="heading-display text-5xl leading-[0.95] mb-6">
              Free viewer<br/>access.
            </h1>
            <p className="text-base text-white/80 leading-relaxed max-w-md">
              Make an account in 10 seconds to search every Pakistani export shipment indexed in this workspace.
              Viewers can analyse and search. Uploads stay under the admin's control.
            </p>
          </div>
          <div className="text-xs tracking-[0.2em] uppercase text-white/60">
            Feedback: azulmax990@gmail.com · +92 339 0112545
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6 animate-in" data-testid="register-form">
          <div>
            <div className="label-tracked mb-3">CREATE ACCOUNT</div>
            <h2 className="heading-display text-3xl mb-2">Get viewer access</h2>
            <p className="text-sm text-slate-500">Read-only. Search shipments, analyse buyers, prices and destinations.</p>
          </div>

          <Field label="Full name" icon={User} testid="register-name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="pl-9 h-11 rounded-sm" placeholder="Jane Doe" data-testid="register-name-input" />
          </Field>
          <Field label="Email" icon={Mail} testid="register-email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="pl-9 h-11 rounded-sm" placeholder="you@example.com" data-testid="register-email-input" />
          </Field>
          <Field label="Password" icon={Lock} testid="register-password">
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} className="pl-9 h-11 rounded-sm" placeholder="At least 6 characters" data-testid="register-password-input" />
          </Field>

          <Button type="submit" disabled={loading} className="w-full h-11 rounded-sm bg-[#002FA7] hover:bg-[#00227A] font-bold" data-testid="register-submit-button">
            {loading ? "Creating..." : "Create account →"}
          </Button>

          <div className="text-sm text-slate-500 text-center">
            Already have one?{" "}
            <Link to="/login" className="text-[#002FA7] font-bold hover:underline" data-testid="goto-login">
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
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
        {children}
      </div>
    </div>
  );
}
