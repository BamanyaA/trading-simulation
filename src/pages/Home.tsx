import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { TrendingUp, Shield, Zap, Globe, ArrowRight, BarChart3, PieChart, Activity } from "lucide-react";

export default function Home() {
  const stats = [
    { label: "Active Traders", value: "24k+", icon: Globe, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Platform Uptime", value: "99.9%", icon: Zap, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Daily Volume", value: "$2.4M", icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Global Markets", value: "50+", icon: Activity, color: "text-rose-600", bg: "bg-rose-50" }
  ];

  const features = [
    {
      title: "Real-time Execution",
      desc: "Experience the thrill of ultra-low latency trading with our proprietary matching engine.",
      icon: TrendingUp,
      accent: "bg-indigo-500"
    },
    {
      title: "Secure Custody",
      desc: "Your assets are protected by multiple layers of cold storage and MPC wallet infrastructure.",
      icon: Shield,
      accent: "bg-emerald-500"
    },
    {
      title: "Advanced Analytics",
      desc: "Institutional-grade technical indicators and on-chain metrics at your fingertips.",
      icon: PieChart,
      accent: "bg-blue-500"
    }
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-[#0B101D] text-slate-100 selection:bg-[#22C58B]/30">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(34,197,139,0.12),transparent_55%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(245,158,11,0.08),transparent_45%)] pointer-events-none" />
        
        <div className="container mx-auto px-4 relative">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="max-w-3xl text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              >
                <div className="inline-flex items-center gap-2.5 text-[#22C58B] text-xs font-semibold uppercase tracking-widest mb-8 mx-auto lg:mx-0">
                  Institutional Grade Trading Platform
                </div>
                <h1 className="text-5xl md:text-7xl font-display font-black tracking-tight text-white mb-6 leading-[1.02]">
                  Master the <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22C58B] via-emerald-300 to-[#FBBF24]">Digital</span> Markets
                </h1>
                <p className="text-lg md:text-xl text-slate-400 mb-10 leading-relaxed max-w-xl lg:mx-0 mx-auto font-medium">
                  The most advanced trading ecosystem for crypto and global markets. 
                  <span className="hidden md:inline"> Lightning execution meets cryptographic security for the modern trader.</span>
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <Link 
                    to="/register" 
                    className="group relative w-full sm:w-auto overflow-hidden px-10 py-4 bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-110 rounded-2xl transition-all active:scale-95 shadow-[0_8px_28px_rgba(245,158,11,0.3)]"
                  >
                    <span className="relative flex items-center justify-center gap-3 text-[#0B101D] font-extrabold text-base">
                      Start Trading <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Link>
                  <Link 
                    to="/login" 
                    className="w-full sm:w-auto px-10 py-4 bg-[#131B2E] hover:bg-[#1A233A] border border-white/10 text-white font-semibold rounded-2xl transition-all text-base"
                  >
                    Client Login
                  </Link>
                </div>

                {/* Key Metrics */}
                <div className="mt-14 flex flex-wrap items-center justify-center lg:justify-start gap-12 border-t border-white/[0.08] pt-8">
                  <div>
                    <div className="text-2xl font-black text-white font-mono tabular-nums">$2.4B+</div>
                    <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mt-1">Trading Volume</div>
                  </div>
                  <div className="w-[1px] h-8 bg-white/10" />
                  <div>
                    <div className="text-2xl font-black text-[#22C58B] font-mono tabular-nums">1.2M+</div>
                    <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mt-1">Active Users</div>
                  </div>
                </div>
              </motion.div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative flex-1 w-full"
            >
              <div className="absolute -inset-2 bg-gradient-to-r from-[#22C58B]/20 via-indigo-500/10 to-[#F59E0B]/20 rounded-[2.5rem] blur-2xl" />
              <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden border border-white/10 bg-[#131B2E] shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=1200" 
                  alt="Blockchain Technology Visualization"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B101D]/80 via-transparent to-transparent pointer-events-none" />
                
                {/* Floating Market Cards */}
                <motion.div 
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute top-6 right-6 bg-[#0D2524]/95 border border-[#22C58B]/30 px-4 py-3 rounded-2xl shadow-xl"
                >
                  <span className="text-xs font-mono font-bold text-[#22C58B] tabular-nums">BTC +4.21%</span>
                </motion.div>

                <motion.div 
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute bottom-6 left-6 bg-[#26131C]/95 border border-[#F43F5E]/30 px-4 py-3 rounded-2xl shadow-xl"
                >
                  <span className="text-xs font-mono font-bold text-[#FB7185] tabular-nums">ETH -1.32%</span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bento Grid Stats/Features */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-[#131B2E] border border-white/[0.08] rounded-[2rem] p-10 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8">
                <Activity className="w-12 h-12 text-[#22C58B]/15 group-hover:text-[#22C58B]/30 transition-colors" />
              </div>
              <h3 className="text-3xl font-display font-bold text-white mb-4">Real-time Global Liquidity</h3>
              <p className="text-slate-400 max-w-md leading-relaxed mb-8">
                Access deep liquidity pools across major exchanges with zero-spread execution and instant settlements.
              </p>
              <div className="flex items-end gap-2 h-20">
                {[40, 70, 45, 90, 65, 80, 50, 85, 60, 95].map((h, i) => (
                  <motion.div 
                    key={i}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    transition={{ delay: i * 0.05, duration: 1 }}
                    className="flex-1 bg-[#22C58B]/20 rounded-t-lg group-hover:bg-[#22C58B]/35 transition-all"
                  />
                ))}
              </div>
            </div>

            <div className="bg-[#131B2E] border border-white/[0.08] rounded-[2rem] p-10 flex flex-col justify-between group">
              <div className="w-14 h-14 rounded-2xl bg-[#0D2524] flex items-center justify-center text-[#22C58B] mb-8 border border-[#22C58B]/20 group-hover:scale-105 transition-transform">
                <Shield className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-display font-bold text-white mb-3 tracking-tight">Vault Security</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Multi-signature cold storage and FIPS 140-2 Level 3 hardware security modules protect every asset.
                </p>
              </div>
            </div>

            <div className="bg-[#131B2E] border border-white/[0.08] rounded-[2rem] p-10 flex flex-col justify-between group">
              <div className="w-14 h-14 rounded-2xl bg-[#272010] flex items-center justify-center text-[#F5B400] mb-8 border border-[#F5B400]/20 group-hover:scale-105 transition-transform">
                <Zap className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-display font-bold text-white mb-3 tracking-tight">Hyper-Speed</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Our core matching engine processes over 1.2M transactions per second with sub-millisecond latency.
                </p>
              </div>
            </div>

            <div className="md:col-span-2 bg-[#131B2E] border border-white/[0.08] rounded-[2rem] p-10 flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1">
                <h3 className="text-3xl font-display font-bold text-white mb-4">Built for the Modern Era</h3>
                <p className="text-slate-400 leading-relaxed">
                  Whether you are a retail enthusiast or an institutional powerhouse, our API and interface provide the tools you need to succeed.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                <div className="p-6 bg-[#1A233A] rounded-2xl border border-white/[0.06]">
                  <div className="text-2xl font-black text-[#22C58B] font-mono tabular-nums">0.0%</div>
                  <div className="text-xs uppercase text-slate-400 mt-1">Maker Fee</div>
                </div>
                <div className="p-6 bg-[#1A233A] rounded-2xl border border-white/[0.06]">
                  <div className="text-2xl font-black text-[#F5B400] font-mono tabular-nums">1.2ms</div>
                  <div className="text-xs uppercase text-slate-400 mt-1">Avg. Execution</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
