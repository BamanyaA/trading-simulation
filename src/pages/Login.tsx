import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { TrendingUp, Mail, Lock, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { isAdminEmail } from "../lib/utils";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedEmail = email.trim();
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      let isAdmin = isAdminEmail(userCredential.user.email || normalizedEmail);

      if (!isAdmin) {
        try {
          const deletedSnap = await getDoc(doc(db, "deleted_users", userCredential.user.uid));
          if (deletedSnap.exists()) {
            await auth.signOut();
            toast.error("This account has been permanently deleted by an administrator.");
            return;
          }
        } catch (delErr) {
          console.warn("Unable to check deleted_users status during login:", delErr);
        }

        try {
          const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
          if (userDoc.exists() && userDoc.data()?.role === "admin") {
            isAdmin = true;
          }
        } catch (roleErr) {
          console.warn("Unable to check Firestore role during login:", roleErr);
        }
      }

      toast.success("Welcome back!");
      navigate(isAdmin ? "/admin" : "/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-20 flex justify-center min-h-[calc(100vh-10rem)] items-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#131B2E] border border-white/[0.08] rounded-[2rem] p-10 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="p-4 bg-[#0D2524] border border-[#22C58B]/30 rounded-2xl mb-6">
            <TrendingUp className="w-8 h-8 text-[#22C58B]" />
          </div>
          <h2 className="text-3xl font-display font-black text-white tracking-tight">Welcome Back</h2>
          <p className="text-slate-400 mt-2 font-medium">Continue your trading journey</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#22C58B] transition-colors" />
              <input 
                type="email"
                required
                className="w-full bg-[#0B101D] border border-white/10 rounded-2xl py-4 pl-12 pr-5 text-white focus:border-[#22C58B] focus:ring-2 focus:ring-[#22C58B]/20 transition-all outline-none font-medium placeholder:text-slate-600"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#22C58B] transition-colors" />
              <input 
                type="password"
                required
                className="w-full bg-[#0B101D] border border-white/10 rounded-2xl py-4 pl-12 pr-5 text-white focus:border-[#22C58B] focus:ring-2 focus:ring-[#22C58B]/20 transition-all outline-none font-medium placeholder:text-slate-600"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-110 disabled:opacity-50 text-[#0B101D] font-extrabold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 group shadow-[0_6px_20px_rgba(245,158,11,0.28)] active:scale-95 text-sm uppercase tracking-wider"
          >
            {loading ? "Authorizing..." : "Log In"}
            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <p className="mt-8 text-center text-slate-400 font-medium text-sm">
          New to the platform?{" "}
          <Link to="/register" className="text-[#22C58B] hover:text-emerald-300 font-bold">Register</Link>
        </p>
      </motion.div>
    </div>
  );
}
