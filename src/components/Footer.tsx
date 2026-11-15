import React from "react";
import { Shield, Globe, Award, Mail } from "lucide-react";
import { cn } from "../lib/utils";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/[0.08] bg-[#0F1629]">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1A233A] border border-[#22C58B]/40 rounded-xl flex items-center justify-center">
                <Globe className="w-6 h-6 text-[#22C58B]" />
              </div>
              <span className="text-2xl font-display font-black text-white tracking-tighter italic">
                GAMMIX<span className="text-[#22C58B]">TRADE</span>
              </span>
            </div>
            <p className="text-slate-400 text-base max-w-sm leading-relaxed font-medium">
              Experience professional-grade trading with our advanced binary options platform. 
              Secure, fast, and built for modern traders who demand the best in execution and support.
            </p>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2 text-slate-400 hover:text-[#22C58B] transition-colors cursor-pointer group">
                <Shield className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold uppercase tracking-wider">Secure SSL</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 hover:text-[#22C58B] transition-colors cursor-pointer group">
                <Award className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold uppercase tracking-wider">Licensed</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-white font-bold text-xs uppercase tracking-widest">Platform</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">Trade History</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">Deposit Methods</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">Withdrawal Policy</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">VIP Program</a></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="text-white font-bold text-xs uppercase tracking-widest">Support</h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:support@gammixtrade.com" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium transition-colors">
                  <Mail className="w-4 h-4 text-[#22C58B]" />
                  Help Center
                </a>
              </li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">FAQ</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/[0.08] flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
            © {new Date().getFullYear()} GAMMIXTRADE GLOBAL LTD. ALL RIGHTS RESERVED.
          </p>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
            <span className="text-[#22C58B]">SSL Encrypted</span>
            <span aria-hidden="true">·</span>
            <span>24/7 Liquidity</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
