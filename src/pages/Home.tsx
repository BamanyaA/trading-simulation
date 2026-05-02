import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { TrendingUp, Shield, Zap, Globe, ArrowRight, BarChart3, PieChart, Activity } from "lucide-react";

export default function Home() {
  const stats = [
    { label: "Active Traders", value: "24k+", icon: Globe },
    { label: "Uptime", value: "99.9%", icon: Zap },
    { label: "Daily Volume", value: "$2.4M", icon: BarChart3 },
    { label: "Markets", value: "50+", icon: Activity }
  ];

  const features = [
    {
      title: "Real-time Simulation",
      desc: "Experience the thrill of trading with our advanced real-time simulation engine.",
      icon: TrendingUp
    },
    {
      title: "Enterprise Grade",
      desc: "Your simulated assets are protected by industry-leading security protocols.",
      icon: Shield
    },
    {
      title: "Detailed Analytics",
      desc: "Track your performance with professional-grade charts and history.",
      icon: PieChart
    }
  ];

  return (
    <div className="flex flex-col min-h-[calc(100-4rem)]">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
                Master the Art of <span className="text-blue-500">Crypto Trading</span>
              </h1>
              <p className="text-xl text-slate-400 mb-10 leading-relaxed">
                Risk-free cryptocurrency trading simulation. Test your strategies, compete with others, and learn the markets without losing a cent.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link 
                  to="/register" 
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full transition-all flex items-center justify-center gap-2"
                >
                  Start Simulation <ArrowRight className="w-5 h-5" />
                </Link>
                <Link 
                  to="/about" 
                  className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-full transition-all"
                >
                  Learn More
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-slate-900/50 border-y border-slate-800 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex p-3 rounded-2xl bg-blue-600/10 text-blue-500 mb-4">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-500 uppercase tracking-wider font-semibold">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-12">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-colors group"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-12 border-t border-slate-800">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            © 2026 CryptoSim Simulation Platform. Not a real financial service.
          </p>
        </div>
      </footer>
    </div>
  );
}
