import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { LayoutDashboard, Search, Database, Upload, PlusCircle, LogOut, Shield, Mail, Phone, UserPlus } from "lucide-react";

export default function AppLayout() {
  const { logout, user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const NAV = [
    { to: "/", label: "Terminal", icon: LayoutDashboard, end: true, testid: "nav-overview", show: true },
    { to: "/search", label: "Search", icon: Search, testid: "nav-search", show: true },
    { to: "/records", label: "All Records", icon: Database, testid: "nav-records", show: true },
    { to: "/potential-buyers", label: "Potential Buyers", icon: UserPlus, testid: "nav-leads", show: isAdmin },
    { to: "/upload", label: "Upload Document", icon: Upload, testid: "nav-upload", show: isAdmin },
    { to: "/add", label: "Add Manually", icon: PlusCircle, testid: "nav-add", show: isAdmin },
    { to: "/admin/users", label: "Users", icon: Shield, testid: "nav-users", show: isAdmin },
  ].filter(n => n.show);

  return (
    <div className="min-h-screen flex bg-[#0B1426]">
      <aside className="w-60 border-r bg-[#0F1F35] flex flex-col sidebar-slide-in" style={{ borderColor: "var(--ti-border)" }} data-testid="sidebar">
        <div className="p-5 border-b" style={{ borderColor: "var(--ti-border)" }}>
          <div className="flex items-center gap-3" data-testid="sidebar-logo">
            <Logo variant="icon" live height={42} />
            <div>
              <div className="heading-display text-base leading-none text-white tracking-tight">
                TRADE<span className="text-[#60A5FA]">INTEL</span>
              </div>
              <div className="text-[9px] mono tracking-[0.18em] uppercase mt-1" style={{ color: "var(--ti-gold)" }}>
                {isAdmin ? "ADMIN TERMINAL" : "VIEWER TERMINAL"}
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-b" style={{ borderColor: "var(--ti-border)" }}>
          <div className="text-[10px] tracking-[0.2em] uppercase font-bold mono" style={{ color: "var(--ti-text-dim)" }}>SIGNED IN</div>
          <div className="text-sm font-semibold truncate mt-0.5" style={{ color: "var(--ti-text)" }} data-testid="user-name">{user?.name || "User"}</div>
          <div className="text-xs truncate mono" style={{ color: "var(--ti-text-muted)" }} data-testid="user-email">{user?.email}</div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={item.testid}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t space-y-1.5" style={{ borderColor: "var(--ti-border)" }}>
          <div className="text-[10px] tracking-[0.2em] uppercase font-bold mono mb-1" style={{ color: "var(--ti-text-dim)" }}>FEEDBACK</div>
          <a href="mailto:azulmax990@gmail.com" className="flex items-center gap-2 text-xs hover:text-[var(--ti-gold)] transition mono truncate" style={{ color: "var(--ti-text-muted)" }} data-testid="feedback-email">
            <Mail className="h-3 w-3 shrink-0" /> azulmax990@gmail.com
          </a>
          <a href="tel:+923390112545" className="flex items-center gap-2 text-xs hover:text-[var(--ti-gold)] transition mono" style={{ color: "var(--ti-text-muted)" }} data-testid="feedback-phone">
            <Phone className="h-3 w-3" /> +92 339 0112545
          </a>
        </div>

        <div className="p-3 border-t" style={{ borderColor: "var(--ti-border)" }}>
          <Button
            onClick={() => { logout(); navigate("/login"); }}
            variant="ghost"
            className="w-full justify-start gap-3 hover:bg-red-900/20 hover:text-[var(--ti-red)] rounded-sm"
            style={{ color: "var(--ti-text-muted)" }}
            data-testid="logout-button"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
