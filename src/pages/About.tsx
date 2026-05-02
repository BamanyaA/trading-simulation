import { motion } from "motion/react";
import { Shield, Target, Lightbulb, Users, CheckCircle2 } from "lucide-react";

export default function About() {
  const values = [
    {
      title: "Transparency",
      desc: "Every simulation is backed by clear algorithms and verifiable results. We believe in open trading environments.",
      icon: Shield
    },
    {
      title: "Innovation First",
      desc: "Our platform uses the latest web technologies to deliver a lag-free, real-time trading experience.",
      icon: Lightbulb
    },
    {
      title: "Customer Success",
      desc: "Your growth as a trader is our primary metric. We provide tools to help you succeed in real markets.",
      icon: Target
    }
  ];

  return (
    <div className="container mx-auto px-4 py-20 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-20"
      >
        <span className="text-blue-500 font-bold uppercase tracking-widest text-sm mb-4 block underline decoration-blue-500 underline-offset-8">Our Mission</span>
        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-8">
          Democratizing Financial <br /> Education Through Simulation
        </h1>
        <p className="text-xl text-slate-400 leading-relaxed max-w-3xl mx-auto">
          CryptoSim was founded with a simple goal: to provide a safe, engaging, and realistic environment for anyone to learn the complexities of cryptocurrency trading without financial risk.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-12 mb-32">
        {values.map((value, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center mx-auto mb-6">
              <value.icon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-4">{value.title}</h3>
            <p className="text-slate-400 leading-relaxed">{value.desc}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="bg-blue-600 rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden"
      >
        <div className="relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-8 italic">Ready to start your journey?</h2>
          <p className="text-blue-100 text-lg mb-12 max-w-2xl mx-auto">
            Join over 24,000 traders who have already started practicing their strategies on our platform.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Free Forever</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Zero Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">24/7 Support</span>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-black/10 rounded-full blur-3xl" />
      </motion.div>
    </div>
  );
}
