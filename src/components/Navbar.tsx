import { Link, useNavigate } from "react-router-dom";
import { User } from "firebase/auth";
import { auth } from "../firebase";
import { UserProfile } from "../types";
import { LogOut, LayoutDashboard, Settings, User as UserIcon, TrendingUp } from "lucide-react";
import { cn } from "../lib/utils";

interface NavbarProps {
  user: User | null;
  profile: UserProfile | null;
}

export default function Navbar({ user, profile }: NavbarProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="p-2 bg-blue-600 rounded-lg group-hover:bg-blue-500 transition-colors">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white italic">QUANTUM<span className="text-blue-500">TRADE</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Home</Link>
          <Link to="/about" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">About</Link>
          {(profile?.role === "admin" || user?.email === "habeshatilaye@gmail.com") && (
            <Link to="/admin" className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
              <Settings className="w-4 h-4" /> Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user?.email === "habeshatilaye@gmail.com" && !profile?.role && (
            <span className="text-[10px] bg-yellow-600/20 text-yellow-500 px-2 py-1 rounded">Syncing Admin...</span>
          )}
          {user ? (
            <div className="flex items-center gap-4">
              <Link 
                to="/dashboard" 
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Login
              </Link>
              <Link to="/register" className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-full transition-all shadow-lg shadow-blue-900/20">
                Start Trading
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
