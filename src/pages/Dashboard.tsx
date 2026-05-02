import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { UserProfile, Transaction, PlatformSettings } from "../types";
import { db, auth } from "../firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  getDoc 
} from "firebase/firestore";
import { 
  Wallet, 
  TrendingUp, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Copy, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Plus
} from "lucide-react";
import { toast } from "react-hot-toast";
import { formatCurrency, cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface DashboardProps {
  user: User;
  profile: UserProfile | null;
  refreshProfile: () => void;
}

export default function Dashboard({ user, profile, refreshProfile }: DashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [tradeAmount, setTradeAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isTrading, setIsTrading] = useState(false);

  useEffect(() => {
    // Auto-promote bootstrapped admin if needed
    if (user.email === "habeshatilaye@gmail.com" && profile && profile.role !== "admin") {
      const promote = async () => {
        try {
          await updateDoc(doc(db, "users", user.uid), { role: "admin" });
          toast.success("Admin rights granted!");
          refreshProfile();
        } catch (e) {
          console.error("Auto-promotion failed", e);
        }
      };
      promote();
    }

    // Listen to transactions
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(txs);
    });

    // Fetch settings
    const fetchSettings = async () => {
      const docRef = doc(db, "settings", "addresses");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as PlatformSettings);
      }
    };

    fetchSettings();
    return () => unsubscribe();
  }, [user.uid]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied!");
  };

  const handleTrade = async (seconds: number) => {
    const amount = parseFloat(tradeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid trade amount");
      return;
    }
    if (amount > (profile?.balance || 0)) {
      toast.error("Insufficient balance");
      return;
    }

    setIsTrading(true);
    toast.loading(`Trading for ${seconds} seconds...`, { id: "trade" });

    // Simulation delay
    setTimeout(async () => {
      const isWin = Math.random() > 0.5;
      const resultAmount = isWin ? amount : -amount;

      try {
        // 1. Create Transaction record
        await addDoc(collection(db, "transactions"), {
          userId: user.uid,
          type: "trade",
          amount: amount,
          status: "completed",
          details: `${isWin ? "WIN" : "LOSS"} | ${seconds}s Duration`,
          createdAt: serverTimestamp(),
        });

        // 2. Update Balance
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          balance: (profile?.balance || 0) + resultAmount
        });

        toast.dismiss("trade");
        if (isWin) {
          toast.success(`You Won ${formatCurrency(amount)}!`);
        } else {
          toast.error(`You Lost ${formatCurrency(amount)}`);
        }
        refreshProfile();
      } catch (error: any) {
        toast.error("Trade execution failed: " + error.message);
      } finally {
        setIsTrading(false);
      }
    }, 2000); // Shorter delay for better UX in demo
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (amount > (profile?.balance || 0)) {
      toast.error("Insufficient balance");
      return;
    }

    try {
      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        type: "withdraw",
        amount: amount,
        status: "pending",
        details: `Wallet: ${withdrawAddress}`,
        createdAt: serverTimestamp(),
      });

      // Deduction on withdrawal request or once processed? Usually handled by admin.
      // Instruction says "submit request". Let's deduct immediately to be safe.
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        balance: (profile?.balance || 0) - amount
      });

      setWithdrawAmount("");
      setWithdrawAddress("");
      toast.success("Withdrawal request submitted");
      refreshProfile();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Demo Demo button
  const handleDemoDeposit = async () => {
    try {
      const amount = 1000;
      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        type: "deposit",
        amount: amount,
        status: "completed",
        createdAt: serverTimestamp(),
      });

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        balance: (profile?.balance || 0) + amount
      });

      toast.success("Demo deposit of $1000 successful!");
      refreshProfile();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Balance & Trade */}
        <div className="lg:col-span-2 space-y-8">
          {/* Balance Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-blue-100 font-medium">Total Balance</span>
                <Wallet className="w-6 h-6 text-blue-100/50" />
              </div>
              <div className="text-5xl font-bold text-white mb-6">
                {formatCurrency(profile?.balance || 0)}
              </div>
              <button 
                onClick={handleDemoDeposit}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all backdrop-blur-md"
              >
                <Plus className="w-4 h-4" /> Add Demo Funds
              </button>
            </div>
            <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 p-20 bg-white/10 rounded-full blur-3xl" />
          </motion.div>

          {/* Trading Section */}
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-500" />
              Quick Trade
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Trade Amount (USD)</label>
                <input 
                  type="number"
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 px-6 text-2xl font-bold text-white outline-none focus:border-blue-500 transition-all"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[30, 60, 90, 150].map((s) => (
                  <button
                    key={s}
                    disabled={isTrading}
                    onClick={() => handleTrade(s)}
                    className="p-4 rounded-xl bg-slate-800 hover:bg-blue-600 border border-slate-700 hover:border-blue-400 text-white font-bold transition-all disabled:opacity-50"
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Clock className="w-6 h-6 text-slate-400" />
              Recent Activity
            </h3>
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No transactions found.</div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-xl",
                        tx.type === "deposit" && "bg-green-600/10 text-green-500",
                        tx.type === "withdraw" && "bg-orange-600/10 text-orange-500",
                        tx.type === "trade" && "bg-blue-600/10 text-blue-500"
                      )}>
                        {tx.type === "deposit" && <ArrowDownCircle className="w-5 h-5" />}
                        {tx.type === "withdraw" && <ArrowUpCircle className="w-5 h-5" />}
                        {tx.type === "trade" && <TrendingUp className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-bold text-white capitalize">{tx.type}</div>
                        <div className="text-xs text-slate-500">{tx.createdAt?.toDate?.().toLocaleString() || "Pending..."}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        "font-bold",
                        tx.type === "deposit" || (tx.type === "trade" && tx.details?.includes("WIN")) ? "text-green-500" : "text-white",
                        tx.type === "withdraw" || (tx.type === "trade" && tx.details?.includes("LOSS")) ? "text-red-500" : ""
                      )}>
                        {tx.type === "withdraw" || (tx.type === "trade" && tx.details?.includes("LOSS")) ? "-" : "+"}
                        {formatCurrency(tx.amount)}
                      </div>
                      <div className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full inline-block uppercase font-bold",
                        tx.status === "completed" && "bg-green-600/20 text-green-500",
                        tx.status === "pending" && "bg-yellow-600/20 text-yellow-500",
                        tx.status === "failed" && "bg-red-600/20 text-red-500"
                      )}>
                        {tx.status}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Deposit & Withdraw */}
        <div className="space-y-8">
          {/* Deposit Section */}
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6">Deposit Crypto</h3>
            <div className="space-y-4">
              {[
                { name: "BTC", address: settings?.btc_address || "Click to copy" },
                { name: "ETH", address: settings?.eth_address || "Click to copy" },
                { name: "XRP", address: settings?.xrp_address || "Click to copy" }
              ].map((coin) => (
                <div key={coin.name} className="space-y-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{coin.name} Address</div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 truncate font-mono">
                      {coin.address}
                    </div>
                    <button 
                      onClick={() => copyToClipboard(coin.address)}
                      className="p-3 bg-slate-800 hover:bg-blue-600 rounded-xl text-slate-400 hover:text-white transition-all"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Withdraw Section */}
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6">Withdraw</h3>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Wallet Address</label>
                <input 
                  type="text"
                  required
                  placeholder="Enter crypto address"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-blue-500 transition-all font-mono"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Amount (USD)</label>
                <input 
                  type="number"
                  required
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-blue-500 transition-all"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Withdraw Funds
              </button>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-slate-500 mt-0.5" />
                <p className="text-[10px] text-slate-500 leading-tight">
                  Withdrawal requests are processed within 24 hours. Make sure your destination wallet address is correct.
                </p>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
