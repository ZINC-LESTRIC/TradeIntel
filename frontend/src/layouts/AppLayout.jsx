import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Search, Database, Upload, PlusCircle, LogOut, Shield, Mail, Phone } from "lucide-react";

export default function AppLayout() {
  const { logout, user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const NAV = [
    { to: "/", label: "Overview", icon: LayoutDashboard, end: true, testid: "nav-overview", show: true },
    { to: "/search", label: "Search", icon: Search, testid: "nav-search", show: true },
    { to: "/records", label: "All Records", icon: Database, testid: "nav-records", show: true },
    { to: "/upload", label: "Upload Document", icon: Upload, testid: "nav-upload", show: isAdmin },
    { to: "/add", label: "Add Manually", icon: PlusCircle, testid: "nav-add", show: isAdmin },
    { to: "/admin/users", label: "Users", icon: Shield, testid: "nav-users", show: isAdmin },
  ].filter(n => n.show);

  return (
    <div className="min-h-screen flex bg-white">
      <aside className="w-60 border-r border-slate-200 bg-white flex flex-col" data-testid="sidebar">
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#002FA7] text-white flex items-center justify-center font-black text-sm">PK</div>
            <div>
              <div className="heading-display text-sm leading-none">TradeIntel</div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-slate-400 mt-1">{isAdmin ? "ADMIN" : "VIEWER"}</div>
            </div>
          </div>
        </div>

        {/* User badge */}
        <div className="px-5 py-3 border-b border-slate-200">
          <div className="text-[10px] tracking-[0.2em] uppercase text-slate-400 font-bold">SIGNED IN AS</div>
          <div className="text-sm font-semibold text-slate-900 truncate mt-0.5" data-testid="user-name">{user?.name || "User"}</div>
          <div className="text-xs text-slate-500 truncate mono" data-testid="user-email">{user?.email}</div>
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

        {/* Feedback footer */}
        <div className="px-4 py-3 border-t border-slate-200 space-y-1.5">
          <div className="text-[10px] tracking-[0.2em] uppercase text-slate-400 font-bold mb-1">FEEDBACK</div>
          <a href="mailto:azulmax990@gmail.com" className="flex items-center gap-2 text-xs text-slate-600 hover:text-[#002FA7] transition mono truncate" data-testid="feedback-email">
            <Mail className="h-3 w-3 shrink-0" /> azulmax990@gmail.com
          </a>
          <a href="tel:+923390112545" className="flex items-center gap-2 text-xs text-slate-600 hover:text-[#002FA7] transition mono" data-testid="feedback-phone">
            <Phone className="h-3 w-3" /> +92 339 0112545
          </a>
        </div>

        <div className="p-3 border-t border-slate-200">
          <Button
            onClick={() => { logout(); navigate("/login"); }}
            variant="ghost"
            className="w-full justify-start gap-3 text-slate-500 hover:text-[#E53935] hover:bg-red-50 rounded-sm"
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
