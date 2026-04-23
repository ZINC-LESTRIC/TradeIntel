import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Search, Database, Upload, PlusCircle, LogOut } from "lucide-react";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true, testid: "nav-overview" },
  { to: "/search", label: "Search", icon: Search, testid: "nav-search" },
  { to: "/records", label: "All Records", icon: Database, testid: "nav-records" },
  { to: "/upload", label: "Upload Document", icon: Upload, testid: "nav-upload" },
  { to: "/add", label: "Add Manually", icon: PlusCircle, testid: "nav-add" },
];

export default function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-white">
      {/* Sidebar */}
      <aside className="w-60 border-r border-slate-200 bg-white flex flex-col" data-testid="sidebar">
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#002FA7] text-white flex items-center justify-center font-black text-sm">PK</div>
            <div>
              <div className="heading-display text-sm leading-none">TradeIntel</div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-slate-400 mt-1">v1 · Private</div>
            </div>
          </div>
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

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
