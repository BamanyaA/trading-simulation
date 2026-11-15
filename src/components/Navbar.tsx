import { Link, useNavigate } from "react-router-dom";
import { User } from "firebase/auth";
import { auth } from "../firebase";
import { UserProfile } from "../types";
import { LogOut, LayoutDashboard, Settings, TrendingUp } from "lucide-react";
import { cn, isAdminEmail } from "../lib/utils";

interface NavbarProps {
  user: User | null;
  profile: UserProfile | null;
}

export default function Navbar({ user, profile }: NavbarProps) {
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin" || isAdminEmail(user?.email);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#0F1629]/90 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-8">
        <Link to={user ? (isAdmin ? "/admin" : "/dashboard") : "/"} className="flex items-center gap-2.5 group whitespace-nowrap shrink-0">
          <div className="p-2 bg-[#1A233A] border border-[#22C58B]/40 rounded-xl group-hover:border-[#22C58B] transition-colors">
            <TrendingUp className="w-5 h-5 text-[#22C58B]" />
          </div>
          <span className="text-xl font-display font-bold tracking-tight text-white italic">GAMMIX<span className="text-[#22C58B]">TRADE</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {!user && (
            <>
              <Link to="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0">Home</Link>
              <Link to="/about" className="text-sm font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0">About</Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isAdminEmail(user?.email) && !profile?.role && (
            <span className="text-[11px] bg-amber-500/10 text-[#F5B400] px-2.5 py-1 rounded-lg border border-amber-500/20">Syncing Admin...</span>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              <Link 
                to={isAdmin ? "/admin" : "/dashboard"} 
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#1A233A] hover:bg-[#222E4A] border-2 border-[#22C58B]/70 rounded-full transition-colors whitespace-nowrap shrink-0"
              >
                <LayoutDashboard className="w-4 h-4 text-[#22C58B]" />
                {isAdmin ? "Admin Panel" : "Dashboard"}
              </Link>
              <button 
                onClick={handleLogout}
                title="Sign Out"
                className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-white bg-[#1A233A] hover:bg-[#222E4A] border border-white/10 rounded-full transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0">
                Login
              </Link>
              <Link to="/register" className="px-5 py-2 text-sm font-bold text-[#0B101D] bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-110 rounded-xl transition-all shadow-[0_4px_16px_rgba(245,158,11,0.28)] whitespace-nowrap shrink-0">
                Start Trading
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
