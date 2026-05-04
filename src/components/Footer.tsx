import React from "react";
import { Shield, Globe, Award, Mail } from "lucide-react";
import { cn } from "../lib/utils";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-slate-950/50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight italic">
                QUANTUM<span className="text-blue-500">TRADE</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              Experience professional-grade trading with our advanced binary options platform. 
              Secure, fast, and built for modern traders who demand the best in execution and support.
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-colors cursor-pointer">
                <Shield className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Secure SSL</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-colors cursor-pointer">
                <Award className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Licensed</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-white font-bold text-sm uppercase tracking-widest">Platform</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Trade History</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Deposit Methods</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Withdrawal Policy</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">VIP Program</a></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="text-white font-bold text-sm uppercase tracking-widest">Support</h4>
            <ul className="space-y-4">
              <li>
                <a href="mailto:support@quantumtrade.com" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
                  <Mail className="w-4 h-4" />
                  Help Center
                </a>
              </li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">FAQ</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-500 text-[10px] font-medium tracking-wide">
            © {new Date().getFullYear()} QUANTUMTRADE GLOBAL LTD. ALL RIGHTS RESERVED.
          </p>
          <div className="flex items-center gap-4">
            <span className="px-2 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold rounded uppercase tracking-tighter">Server Online</span>
            <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded uppercase tracking-tighter">Fast Connect</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
