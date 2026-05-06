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
    <div className="flex flex-col min-h-[calc(100-4rem)] bg-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-44 overflow-hidden">
        <div className="absolute inset-0 bg-indigo-50/50 [mask-image:radial-gradient(ellipse_at_center,transparent_0%,black)]" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-200/20 blur-[120px] rounded-full pointer-events-none -mr-96 -mt-96" />
        <div className="container mx-auto px-4 relative">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="max-w-2xl text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "circOut" }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-[0.25em] mb-10 shadow-sm mx-auto lg:mx-0">
                  <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                  Global Trading Network
                </div>
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 mb-8 leading-[0.9]">
                  Trade the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 italic">Future</span> of Asset Classes
                </h1>
                <p className="text-xl text-slate-500 mb-12 leading-relaxed max-w-xl lg:mx-0 mx-auto font-medium">
                  Experience the pinnacle of binary options and cryptocurrency trading. Institutional-grade security meets lightning-fast execution.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6">
                  <Link 
                    to="/register" 
                    className="w-full sm:w-auto px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-3xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-indigo-200 active:scale-95 text-lg"
                  >
                    Get Started <ArrowRight className="w-6 h-6" />
                  </Link>
                  <Link 
                    to="/login" 
                    className="w-full sm:w-auto px-10 py-5 bg-white border-2 border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/50 text-slate-900 font-bold rounded-3xl transition-all shadow-xl shadow-slate-100/50 text-lg"
                  >
                    Client Login
                  </Link>
                </div>
              </motion.div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative flex-1 group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-[3rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
              <div className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white">
                <img 
                  src="https://images.unsplash.com/photo-1624996379697-f01d168b1a52?auto=format&fit=crop&q=80&w=1200" 
                  alt="Trading Interface"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/20 to-transparent" />
              </div>
              {/* Floating Badge */}
              <div className="absolute -bottom-10 -left-10 bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 hidden md:block">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                       <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                       <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Data</div>
                       <div className="text-lg font-black text-slate-900 tracking-tight">99.9% Precision</div>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-slate-50/50 py-24 border-y border-slate-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center group"
              >
                <div className={cn("inline-flex p-5 rounded-3xl mb-6 transition-transform group-hover:scale-110 duration-500", stat.bg, stat.color)}>
                  <stat.icon className="w-8 h-8" />
                </div>
                <div className="text-4xl font-black text-slate-900 mb-2 tracking-tighter">{stat.value}</div>
                <div className="text-xs text-slate-400 uppercase tracking-[0.2em] font-black">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 container mx-auto px-4">
        <div className="text-center mb-24">
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Built for Professionals</h2>
          <p className="text-slate-500 font-medium tracking-tight">Our ecosystem is designed for speed, safety, and scale.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-12">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="p-10 rounded-[2.5rem] bg-white border border-slate-50 shadow-2xl shadow-slate-100/50 hover:shadow-indigo-100/50 hover:border-indigo-100 transition-all group flex flex-col items-center text-center"
            >
              <div className={cn("w-16 h-16 rounded-3xl transition-all duration-700 group-hover:rotate-[10deg] flex items-center justify-center mb-8 shadow-lg", feature.accent, "text-white")}>
                <feature.icon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
