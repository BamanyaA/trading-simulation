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
  getDoc,
  increment 
} from "firebase/firestore";
import { 
  Wallet, 
  TrendingUp, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Copy, 
  Clock, 
  AlertCircle,
  FileText,
  Upload,
  MessageSquare,
  Send,
  X
} from "lucide-react";
import { toast } from "react-hot-toast";
import { SupportMessage } from "../types";
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
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [depositAmount, setDepositAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [showTradeConfirm, setShowTradeConfirm] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Countdown timer logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTrading && timeLeft !== null && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (isTrading && timeLeft === 0) {
      finalizeTrade();
    }
    return () => clearInterval(timer);
  }, [isTrading, timeLeft]);

  // Store trade details for finalization
  const tradeDetailsRef = React.useRef<{ amount: number; seconds: number } | null>(null);

  const finalizeTrade = async () => {
    if (!tradeDetailsRef.current || !user) return;
    const { amount, seconds } = tradeDetailsRef.current;
    
    let multiplier = 0;
    if (seconds === 30) multiplier = 0.05;
    else if (seconds === 60) multiplier = 0.10;
    else if (seconds === 90) multiplier = 0.15;
    else if (seconds === 150) multiplier = 0.25;
    else multiplier = 0.05;

    const isWin = Math.random() > 0.5;

    try {
      // 2. Create Transaction record
      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        type: "trade",
        amount: amount,
        status: "pending",
        details: `${isWin ? "WIN" : "LOSS"} | ${seconds}s Duration`,
        createdAt: serverTimestamp(),
      });

      toast.dismiss("trade");
      toast.success("Traded successfully");
      
      if (isWin) {
        toast.success(`Result: WIN! (Pending Admin Verification)`, { duration: 5000 });
      } else {
        toast.error(`Result: LOSS`, { duration: 5000 });
      }
      refreshProfile();
    } catch (error: any) {
      toast.error("Trade finalization failed: " + error.message);
    } finally {
      setIsTrading(false);
      setTimeLeft(null);
      tradeDetailsRef.current = null;
    }
  };

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
  }, [user.email, user.uid, profile, refreshProfile]);

  useEffect(() => {
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
    
    // Listen to chat messages
    const chatQ = query(
      collection(db, "support_messages"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "asc")
    );
    const chatUnsub = onSnapshot(chatQ, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportMessage)));
    });

    return () => {
      unsubscribe();
      chatUnsub();
    };
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
    setTimeLeft(seconds);
    tradeDetailsRef.current = { amount, seconds };
    toast.loading(`Trading in progress...`, { id: "trade" });

    try {
      // Trade started - we just refresh profile to ensure state consistency
      refreshProfile();
    } catch (error: any) {
      toast.dismiss("trade");
      toast.error("Trade failed to start: " + error.message);
      setIsTrading(false);
      setTimeLeft(null);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
    try {
      await addDoc(collection(db, "support_messages"), {
        userId: user.uid,
        senderId: user.uid,
        senderEmail: user.email,
        text: newMessage,
        isAdmin: false,
        createdAt: serverTimestamp(),
      });
      setNewMessage("");
    } catch (error: any) {
      toast.error("Failed to send message: " + error.message);
    } finally {
      setIsSending(false);
    }
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

      // Deduction on withdrawal request
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        balance: increment(-amount)
      });

      setWithdrawAmount("");
      setWithdrawAddress("");
      toast.success("Withdrawal request submitted");
      refreshProfile();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!receiptFile) {
      toast.error("Please upload a receipt image");
      return;
    }

    setIsSubmittingDeposit(true);
    try {
      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        type: "deposit",
        amount: amount,
        status: "pending",
        receipt: receiptFile,
        details: "Deposit via crypto (Pending Verification)",
        createdAt: serverTimestamp(),
      });

      setDepositAmount("");
      setReceiptFile(null);
      toast.success("Deposit proof submitted! Verification in progress.");
    } catch (error: any) {
      toast.error("Failed to submit: " + error.message);
    } finally {
      setIsSubmittingDeposit(false);
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
                {[
                  { s: 30, p: 5 },
                  { s: 60, p: 10 },
                  { s: 90, p: 15 },
                  { s: 150, p: 25 }
                ].map(({ s, p }) => (
                  <button
                    key={s}
                    type="button"
                    disabled={isTrading}
                    onClick={() => setSelectedDuration(s)}
                    className={cn(
                      "p-4 rounded-xl border font-bold transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-1",
                      selectedDuration === s 
                        ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20" 
                        : "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                    )}
                  >
                    <span className="text-lg">{s}s</span>
                  </button>
                ))}
              </div>
              
              <button
                disabled={isTrading}
                onClick={() => {
                  const amount = parseFloat(tradeAmount);
                  if (isNaN(amount) || amount <= 0) {
                    toast.error("Enter a valid trade amount");
                    return;
                  }
                  if (amount > (profile?.balance || 0)) {
                    toast.error("Insufficient balance");
                    return;
                  }
                  setShowTradeConfirm(true);
                }}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-xl shadow-blue-600/10 flex items-center justify-center gap-2 text-lg"
              >
                {isTrading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Trading ({timeLeft}s)</span>
                  </div>
                ) : "Place Trade"}
              </button>
            </div>
          </div>

          {/* Transaction History */}
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-6 h-6 text-slate-400" />
                Recent Activity
              </h3>
              
              <div className="flex flex-wrap items-center gap-2">
                <select 
                  className="bg-slate-950 border border-slate-800 text-slate-400 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 transition-all"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="deposit">Deposit</option>
                  <option value="trade">Trade</option>
                  <option value="withdraw">Withdraw</option>
                </select>

                <select 
                  className="bg-slate-950 border border-slate-800 text-slate-400 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 transition-all"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {transactions
                .filter(tx => (filterType === "all" || tx.type === filterType))
                .filter(tx => (filterStatus === "all" || tx.status === filterStatus))
                .length === 0 ? (
                <div className="text-center py-8 text-slate-500">No transactions found.</div>
              ) : (
                transactions
                  .filter(tx => (filterType === "all" || tx.type === filterType))
                  .filter(tx => (filterStatus === "all" || tx.status === filterStatus))
                  .map((tx) => (
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
                        tx.type === "deposit" || (tx.type === "trade" && tx.details?.includes("WIN")) ? "text-green-500" : "text-white"
                      )}>
                        {tx.type === "deposit" || (tx.type === "trade" && tx.details?.includes("WIN")) ? "+" : ""}
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

          {/* Submit Deposit Proof */}
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-500" />
              Submit Deposit Proof
            </h3>
            <form onSubmit={handleSubmitDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Amount Sent (USD)</label>
                <input 
                  type="number"
                  required
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-blue-500 transition-all font-mono"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Upload Receipt</label>
                <div className="relative group cursor-pointer">
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={cn(
                    "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all",
                    receiptFile ? "border-green-500/50 bg-green-500/5" : "border-slate-800 group-hover:border-blue-500/50 group-hover:bg-blue-500/5"
                  )}>
                    {receiptFile ? (
                      <>
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-green-500/20">
                          <img src={receiptFile} alt="Receipt Preview" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs text-green-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-full">Receipt Selected</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-600 group-hover:text-blue-500 transition-colors" />
                        <span className="text-xs text-slate-500">Tap to upload receipt image</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button 
                type="submit"
                disabled={isSubmittingDeposit}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {isSubmittingDeposit ? "Submitting..." : "Submit Proof"}
              </button>
            </form>
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

      {/* Trade Confirmation Modal */}
      <AnimatePresence>
        {showTradeConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTradeConfirm(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-12 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative z-10 space-y-6 text-center">
                <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <TrendingUp className="w-8 h-8" />
                </div>
                
                <h3 className="text-2xl font-bold text-white">Confirm Your Trade</h3>
                
                <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Amount</span>
                    <span className="text-white font-bold text-lg">{formatCurrency(parseFloat(tradeAmount))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Duration</span>
                    <span className="text-white font-bold text-lg">{selectedDuration} Seconds</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                    <span className="text-slate-400 text-sm">Potential Return</span>
                    <span className="text-green-500 font-bold text-lg">
                      {formatCurrency(parseFloat(tradeAmount) * 1.85)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowTradeConfirm(false)}
                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      setShowTradeConfirm(false);
                      handleTrade(selectedDuration);
                    }}
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all"
                  >
                    Confirm Trade
                  </button>
                </div>
                
                <p className="text-[10px] text-slate-500 italic">
                  By confirming, you agree to the trade terms.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Chat Button */}
      <motion.button 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setShowChat(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-blue-500 transition-all z-40 group"
      >
        <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-950 animate-pulse" />
      </motion.button>

      {/* Support Chat Modal */}
      <AnimatePresence>
        {showChat && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-end p-4 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChat(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 100, x: 0 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col h-[80vh] sm:h-[600px] pointer-events-auto overflow-hidden"
            >
              {/* Chat Header */}
              <div className="p-6 border-b border-white/5 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600/20 text-blue-500 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Live Support</h3>
                    <div className="flex items-center gap-1.5 ">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Agents Online</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowChat(false)}
                  className="p-3 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-50">
                    <div className="p-4 bg-slate-800/50 rounded-2xl">
                      <MessageSquare className="w-8 h-8 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">No messages yet</p>
                      <p className="text-xs text-slate-500">Send a message to start chatting with support.</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={msg.id} className={cn(
                      "flex flex-col max-w-[80%]",
                      msg.isAdmin ? "mr-auto" : "ml-auto items-end"
                    )}>
                      <div className={cn(
                        "p-4 rounded-2xl text-sm",
                        msg.isAdmin 
                          ? "bg-slate-800 text-slate-200 rounded-bl-none" 
                          : "bg-blue-600 text-white rounded-br-none"
                      )}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 font-medium font-mono">
                        {msg.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input */}
              <div className="p-6 border-t border-white/5 bg-slate-900/50">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input 
                    type="text"
                    placeholder="Type your message..."
                    className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50 transition-all"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button 
                    type="submit"
                    disabled={isSending || !newMessage.trim()}
                    className="p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-xl transition-all shadow-lg shadow-blue-600/20"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
