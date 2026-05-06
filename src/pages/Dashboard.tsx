import React, { useState, useEffect } from "react";
import { User, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { UserProfile, Transaction, PlatformSettings, News, SupportMessage } from "../types";
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
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Copy,
  Clock, 
  FileText,
  Upload,
  MessageSquare,
  Send,
  X,
  Search,
  ChevronRight,
  ChevronDown,
  BarChart2,
  Home,
  Bell,
  Lock,
  User as UserIcon,
  ShieldCheck
} from "lucide-react";
import { toast } from "react-hot-toast";
import { formatCurrency, cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { TradingViewWidget } from "../components/TradingViewWidget";

const CRYPTO_ASSETS = [
  { symbol: "BINANCE:BTCUSDT", name: "Bitcoin", short: "BTC", color: "bg-orange-500", icon: "₿" },
  { symbol: "BINANCE:ETHUSDT", name: "Ethereum", short: "ETH", color: "bg-blue-500", icon: "Ξ" },
  { symbol: "BINANCE:SOLUSDT", name: "Solana", short: "SOL", color: "bg-purple-500", icon: "S" },
  { symbol: "BINANCE:XRPUSDT", name: "XRP", short: "XRP", color: "bg-slate-400", icon: "X" },
  { symbol: "BINANCE:BNBUSDT", name: "BNB", short: "BNB", color: "bg-yellow-400", icon: "B" },
];

const FOREX_ASSETS = [
  { symbol: "FX:EURUSD", name: "EUR/USD", short: "EURUSD", color: "bg-blue-600", icon: "€" },
  { symbol: "FX:GBPUSD", name: "GBP/USD", short: "GBPUSD", color: "bg-indigo-600", icon: "£" },
  { symbol: "FX:USDJPY", name: "USD/JPY", short: "USDJPY", color: "bg-red-600", icon: "¥" },
  { symbol: "FX:AUDUSD", name: "AUD/USD", short: "AUDUSD", color: "bg-green-600", icon: "A" },
];

const COMMODITY_ASSETS = [
  { symbol: "OANDA:XAUUSD", name: "Gold", short: "XAU", color: "bg-yellow-600", icon: "G" },
  { symbol: "OANDA:XAGUSD", name: "Silver", short: "XAG", color: "bg-gray-300", icon: "S" },
];

const ALL_ASSETS = [...CRYPTO_ASSETS, ...FOREX_ASSETS, ...COMMODITY_ASSETS];

interface DashboardProps {
  user: User;
  profile: UserProfile | null;
  refreshProfile: () => void;
}

export default function Dashboard({ user, profile, refreshProfile }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"home" | "trading" | "news" | "personal">("home");
  const [activeMarketTab, setActiveMarketTab] = useState<"crypto" | "forex" | "gold">("crypto");
  const [activeTradeSubTab, setActiveTradeSubTab] = useState<"positions" | "history">("positions");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [selectedAsset, setSelectedAsset] = useState(CRYPTO_ASSETS[0]);
  const [marketData, setMarketData] = useState<Record<string, { price: string, change: string, isUp: boolean }>>({});
  const [marketSearch, setMarketSearch] = useState("");
  const [tradeAmount, setTradeAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isTrading, setIsTrading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawType, setWithdrawType] = useState("USDT (ERC20)");
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [full_name, setFullName] = useState(profile?.fullName || "");
  const [phone_number, setPhoneNumber] = useState(profile?.phoneNumber || "");
  const [address_val, setAddressVal] = useState(profile?.address || "");
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);
  const [verificationDoc, setVerificationDoc] = useState<string | null>(profile?.verificationDoc || null);

  const handleVerificationFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File is too large. Maximum size is 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setVerificationDoc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Initialize and update market data for "Live" accuracy
  useEffect(() => {
    const fetchMarketData = async () => {
      const cryptoPairs = CRYPTO_ASSETS.map(a => a.short + "USDT");
      
      setMarketData(prev => {
        const newData = { ...prev };
        
        const updateWithSimulation = () => {
          ALL_ASSETS.forEach(asset => {
            if (!newData[asset.symbol]) {
              const basePrice = asset.short === "BTC" ? 80804 : 
                               asset.short === "ETH" ? 3482 : 
                               asset.short === "SOL" ? 145 : 
                               asset.short === "XAU" ? 2341.20 : 1.0825;
              newData[asset.symbol] = { price: basePrice.toLocaleString(), change: "2.30", isUp: true };
            }
            const currentPrice = parseFloat(newData[asset.symbol].price.replace(/,/g, ''));
            const jitter = (Math.random() - 0.49) * (currentPrice * 0.00015);
            newData[asset.symbol].price = (currentPrice + jitter).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            newData[asset.symbol].change = (parseFloat(newData[asset.symbol].change) + (Math.random() - 0.5) * 0.01).toFixed(2);
            newData[asset.symbol].isUp = parseFloat(newData[asset.symbol].change) >= 0;
          });
        };

        // Attempt real fetch
        const runFetch = async () => {
          try {
            const symbolsParam = encodeURIComponent(JSON.stringify(cryptoPairs));
            const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`);
            if (response.ok) {
              const data = await response.json();
              data.forEach((item: any) => {
                const asset = CRYPTO_ASSETS.find(a => a.short + "USDT" === item.symbol);
                if (asset) {
                  newData[asset.symbol] = {
                    price: parseFloat(item.lastPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                    change: parseFloat(item.priceChangePercent).toFixed(2),
                    isUp: parseFloat(item.priceChangePercent) >= 0
                  };
                }
              });
            } else {
              updateWithSimulation();
            }
          } catch {
            updateWithSimulation();
          }
        };

        runFetch();
        return newData;
      });
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 2000);
    return () => clearInterval(interval);
  }, []);
  const [depositAmount, setDepositAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [showTradeConfirm, setShowTradeConfirm] = useState(false);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [showTradeSuccess, setShowTradeSuccess] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedDepositCoin, setSelectedDepositCoin] = useState<keyof PlatformSettings>("btc_address");
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [news, setNews] = useState<News[]>([]);

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
  const tradeDetailsRef = React.useRef<{ amount: number; seconds: number; symbol: string } | null>(null);

  const finalizeTrade = async () => {
    if (!tradeDetailsRef.current || !user) return;
    const { amount, seconds, symbol } = tradeDetailsRef.current;
    
    const isWin = Math.random() > 0.5;

    try {
      // Deduct the initial amount first (the investment)
      await updateDoc(doc(db, "users", user.uid), {
        balance: increment(-amount)
      });

      const finalAmount = isWin ? (amount * (1 + 0.03)) : 0; // Simplified 3% win calculation for demo

      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        type: "trade",
        amount: isWin ? finalAmount : amount,
        status: isWin ? "completed" : "failed",
        symbol: symbol,
        details: `${isWin ? "WIN" : "LOSS"} | Asset: ${symbol.split(":")[1]} | ${seconds}s Duration`,
        createdAt: serverTimestamp(),
      });

      if (isWin) {
        await updateDoc(doc(db, "users", user.uid), {
          balance: increment(finalAmount)
        });
      }

      toast.dismiss("trade");
      setShowTradeSuccess(true);
      
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
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(txs);
    });

    const fetchSettings = async () => {
      const docRef = doc(db, "settings", "addresses");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as PlatformSettings);
      }
    };

    fetchSettings();
    
    const chatQ = query(
      collection(db, "support_messages"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "asc")
    );
    const chatUnsub = onSnapshot(chatQ, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportMessage)));
    });

    const newsQ = query(collection(db, "news"), orderBy("createdAt", "desc"));
    const newsUnsub = onSnapshot(newsQ, (snapshot) => {
      setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as News)));
    });

    return () => {
      unsubscribe();
      chatUnsub();
      newsUnsub();
    };
  }, [user.uid]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied!");
  };

  const handlePlaceTrade = async () => {
    const amount = parseFloat(tradeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount < 100) {
      toast.error("Minimum trade amount is $100");
      return;
    }

    if (!profile || profile.balance < amount) {
      toast.error("Insufficient balance");
      return;
    }
    
    setShowTradeConfirm(false);
    setIsTrading(true);
    setTimeLeft(selectedDuration);
    tradeDetailsRef.current = { amount, seconds: selectedDuration, symbol: selectedAsset.symbol };
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

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!full_name.trim() || !phone_number.trim() || !address_val.trim() || !verificationDoc) {
      toast.error("Please fill in all fields and upload a document");
      return;
    }

    setIsSubmittingVerification(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        fullName: full_name,
        phoneNumber: phone_number,
        address: address_val,
        verificationDoc: verificationDoc,
        verificationStatus: "pending"
      });
      toast.success("Verification submitted for review!");
      setShowVerificationForm(false);
      refreshProfile();
    } catch (error: any) {
      toast.error("Failed to submit: " + error.message);
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!profile || profile.balance < amount) {
      toast.error("Insufficient balance");
      return;
    }

    if (!withdrawAddress.trim()) {
      toast.error("Please enter a withdrawal address");
      return;
    }

    try {
      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        type: "withdraw",
        amount: amount,
        status: "pending",
        details: `Wallet: ${withdrawAddress} | Network: ${withdrawType}`,
        createdAt: serverTimestamp(),
      });

      setWithdrawAmount("");
      setWithdrawAddress("");
      setShowWithdrawModal(false);
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
    if (isNaN(amount) || amount <= 0 || !receiptFile) return;

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
      setShowDepositModal(false);
      toast.success("Deposit proof submitted!");
    } catch (error: any) {
      toast.error("Failed to submit: " + error.message);
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  const getMarketAssets = () => {
    let assets = CRYPTO_ASSETS;
    switch (activeMarketTab) {
      case "forex": assets = FOREX_ASSETS; break;
      case "gold": assets = COMMODITY_ASSETS; break;
      default: assets = CRYPTO_ASSETS; break;
    }
    
    if (marketSearch.trim()) {
      const search = marketSearch.toLowerCase();
      return assets.filter(a => 
        a.name.toLowerCase().includes(search) || 
        a.short.toLowerCase().includes(search)
      );
    }
    return assets;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsChangingPassword(true);
    try {
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      toast.success("Password changed successfully!");
      setShowChangePasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/wrong-password') {
        toast.error("Incorrect current password");
      } else {
        toast.error("Password change failed: " + error.message);
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const renderHome = () => (
    <div className="space-y-6 pb-24">
      <div className="bg-white p-6 shadow-sm flex gap-3 border-b border-gray-100">
        <div className="flex-1 bg-gray-50 rounded-xl flex items-center px-4 border border-gray-200 transition-all focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50">
          <Search className="w-5 h-5 text-gray-400 mr-2" />
          <input 
            type="text" 
            placeholder="Search markets..." 
            className="bg-transparent border-none outline-none w-full py-3 text-sm font-medium" 
            value={marketSearch}
            onChange={(e) => setMarketSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="mx-4 bg-white rounded-[2rem] shadow-sm overflow-hidden p-8 border border-gray-100 group relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 transition-transform group-hover:scale-110" />
        <div className="relative z-10 w-full mb-6">
          <h2 className="text-3xl font-black text-gray-900 mb-2 leading-tight">QuantumTrade <br/><span className="text-indigo-600">Global Markets</span></h2>
          <p className="text-gray-500 text-sm font-medium max-w-[200px]">Trusted by 10M+ traders worldwide since 2018.</p>
        </div>
        <div className="rounded-2xl overflow-hidden aspect-[16/9] relative shadow-2xl">
          <img 
            src="https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&q=80&w=1000" 
            alt="QuantumTrade Crypto Trading" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      </div>

      <div className="mx-4 bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex p-1.5 bg-gray-50 m-2 rounded-2xl gap-1">
          {["crypto", "forex", "gold"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveMarketTab(tab as any)}
              className={cn(
                "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeMarketTab === tab ? "bg-white text-indigo-600 shadow-xl shadow-indigo-100/50" : "text-gray-400 hover:text-gray-600"
              )}
            >
              {tab === "gold" ? "Commodities" : tab}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name</th>
                <th className="text-left py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden sm:table-cell">Symbol</th>
                <th className="text-right py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Change %</th>
              </tr>
            </thead>
            <tbody>
              {getMarketAssets().map((asset) => (
                <tr 
                  key={asset.symbol} 
                  onClick={() => {
                    setSelectedAsset(asset);
                    setActiveTab("trading");
                  }}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shrink-0", asset.color)}>
                        {asset.icon}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm whitespace-nowrap">{asset.name}</div>
                        <div className="text-[10px] text-gray-400 uppercase sm:hidden">{asset.short}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 hidden sm:table-cell">
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded uppercase">{asset.short}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex flex-col items-end">
                      <div className="text-sm font-black text-gray-900">
                        {marketData[asset.symbol]?.price || "0.00"}
                      </div>
                      <div className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded",
                        marketData[asset.symbol]?.isUp ? "text-green-500 bg-green-50" : "text-red-500 bg-red-50"
                      )}>
                        {marketData[asset.symbol]?.isUp ? "+" : ""}{marketData[asset.symbol]?.change || "0.00"}%
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTrading = () => (
    <div className="space-y-6 pb-24">
      <div className="bg-indigo-600 p-5 text-white font-black uppercase tracking-[0.3em] text-xs text-center shadow-lg">Live Binary Options</div>
      
      <div className="mx-4 bg-white rounded-[2rem] shadow-sm p-8 border border-gray-100 relative overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-60" />
        <div className="relative z-10 flex justify-between items-center mb-8">
          <div className="space-y-2">
            <div className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Live Portfolio</div>
            <div className="text-4xl font-black text-gray-900 tracking-tight">{formatCurrency(profile?.balance || 0)}</div>
          </div>
          <div className="text-right space-y-1">
            <div className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Margin Level</div>
            <div className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">100%</div>
          </div>
        </div>
        <button 
          onClick={() => setActiveTradeSubTab("positions")}
          className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 active:scale-95 transition-all uppercase tracking-[0.2em] text-xs"
        >
          Open Marketplace
        </button>
      </div>

      <div className="mx-4 bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex p-1.5 bg-gray-50 m-3 rounded-2xl">
          <button 
            onClick={() => setActiveTradeSubTab("positions")}
            className={cn(
              "flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTradeSubTab === "positions" ? "bg-white text-indigo-600 shadow-xl shadow-indigo-100/50 outline-1 outline-indigo-50" : "text-gray-400"
            )}
          >
            Terminal
          </button>
          <button 
            onClick={() => setActiveTradeSubTab("history")}
            className={cn(
              "flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTradeSubTab === "history" ? "bg-white text-indigo-600 shadow-xl shadow-indigo-100/50 outline-1 outline-indigo-50" : "text-gray-400"
            )}
          >
            History
          </button>
        </div>

        <div className="min-h-[400px]">
          {activeTradeSubTab === "positions" ? (
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg", selectedAsset.color)}>{selectedAsset.icon}</div>
                  <div>
                    <div className="font-black text-gray-900 uppercase tracking-tight">{selectedAsset.short}/USDT</div>
                    <div className="text-[10px] text-indigo-600 font-black animate-pulse uppercase tracking-[0.2em] flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                      Live Feed
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-gray-900 tracking-tight">
                    {marketData[selectedAsset.symbol]?.price || "0.00"}
                  </div>
                  <div className={cn(
                    "text-xs font-black uppercase mt-1",
                    marketData[selectedAsset.symbol]?.isUp ? "text-green-500" : "text-red-500"
                  )}>
                    {marketData[selectedAsset.symbol]?.isUp ? "▲" : "▼"}{marketData[selectedAsset.symbol]?.change || "0.00"}%
                  </div>
                </div>
              </div>
              <div className="h-[320px] mb-8 rounded-[2rem] border border-gray-100 overflow-hidden shadow-inner bg-gray-50">
                <TradingViewWidget symbol={selectedAsset.symbol} />
              </div>
              <button 
                onClick={() => setShowOptionModal(true)}
                className="w-full py-5 bg-gray-900 hover:bg-black text-white font-black rounded-2xl shadow-2xl active:scale-95 transition-all uppercase tracking-[0.3em] text-xs"
              >
                Place Order
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {transactions.filter(t => t.type === "trade").length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                  <FileText className="w-12 h-12 mb-4 opacity-20" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">No order history</span>
                </div>
              ) : (
                transactions.filter(t => t.type === "trade").map((tx) => (
                  <div key={tx.id} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold",
                        tx.details?.includes("WIN") ? "bg-green-500" : "bg-red-500"
                      )}>
                        {tx.details?.includes("WIN") ? "W" : "L"}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{tx.symbol?.split(":")[1] || "Trade"}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                          {tx.createdAt?.toDate?.()?.toLocaleString() || "Pending..."}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        "font-black text-sm",
                        tx.details?.includes("WIN") ? "text-green-600" : "text-red-600"
                      )}>
                        {tx.details?.includes("WIN") ? "+" : "-"}{formatCurrency(tx.amount)}
                      </div>
                      <div className="text-[8px] font-black uppercase tracking-widest text-gray-400 mt-1">
                        {tx.status}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderNews = () => (
    <div className="space-y-4 pb-24">
      <div className="bg-indigo-600 p-5 text-white font-black uppercase tracking-[0.3em] text-xs text-center shadow-lg">Financial Intelligence</div>
      
      <div className="mx-4 space-y-6 pt-4">
        {news.length > 0 && (
          <div className="relative rounded-[2.5rem] overflow-hidden group shadow-2xl">
            <div className="aspect-[16/9] relative">
              <img 
                src={news[0].imageUrl || "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=1000"} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="flex items-center gap-2 mb-3">
                <div className="px-3 py-1 bg-indigo-600 text-[10px] font-black uppercase tracking-widest text-white rounded-full">Editorial</div>
                <div className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{news[0].createdAt?.toDate?.()?.toLocaleDateString()}</div>
              </div>
              <h2 className="text-2xl font-black text-white leading-tight mb-3 line-clamp-2 md:text-3xl">{news[0].title}</h2>
              <p className="text-white/70 text-sm font-medium line-clamp-2">{news[0].summary}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {news.length === 0 ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 opacity-50 animate-pulse">
                <div className="w-24 h-24 bg-gray-100 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))
          ) : (
            news.slice(1).map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex gap-4 group hover:shadow-xl hover:border-indigo-100 transition-all">
                {item.imageUrl && (
                  <div className="w-24 h-24 bg-gray-100 rounded-2xl shrink-0 overflow-hidden relative">
                    <img src={item.imageUrl} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <h3 className="font-black text-gray-900 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors uppercase tracking-tight text-sm">{item.title}</h3>
                  <p className="text-xs text-gray-400 mt-2 line-clamp-1 font-medium italic">{item.summary}</p>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                    <span className="text-[10px] text-gray-300 font-black uppercase tracking-widest">{item.createdAt?.toDate?.()?.toLocaleDateString()}</span>
                    <div className="p-1.5 bg-gray-50 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderPersonal = () => (
    <div className="space-y-6 pb-24">
      <div className="bg-indigo-600 px-8 py-16 flex items-center gap-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-2xl relative z-10">
          <UserIcon className="w-10 h-10" />
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black tracking-tight">{profile?.fullName || "Quantum Trader"}</h2>
          <div className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.2em] mt-2 bg-white/10 w-fit px-3 py-1 rounded-full border border-white/5">ID: {user?.uid.slice(0, 12)}</div>
        </div>
      </div>

      <div className="mx-4 -mt-12 bg-white rounded-[2.5rem] shadow-2xl p-8 border border-white relative z-20">
        <div className="flex justify-between items-end mb-8">
          <div>
            <div className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Available Funds</div>
            <div className="text-5xl font-black text-gray-900 tracking-tighter">{formatCurrency(profile?.balance || 0)}</div>
          </div>
          <div className="text-right">
             <div className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Account</div>
             <div className={cn(
               "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm inline-block",
               profile?.verificationStatus === "verified" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
               profile?.verificationStatus === "pending" ? "bg-amber-50 text-amber-600 border-amber-100" :
               profile?.verificationStatus === "rejected" ? "bg-red-50 text-red-600 border-red-100" :
               "bg-slate-100 text-slate-500 border-slate-200"
             )}>
               {profile?.verificationStatus || "Unverified"}
             </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-50">
          <button 
            onClick={() => setShowWithdrawModal(true)}
            className="flex items-center justify-center gap-2 py-4 bg-gray-50 hover:bg-gray-100 text-gray-600 font-black uppercase tracking-widest text-[10px] rounded-2xl active:scale-95 transition-all shadow-sm"
          >
            <ArrowUpCircle className="w-4 h-4" /> Withdraw
          </button>
          <button 
            onClick={() => setShowDepositModal(true)}
            className="flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-indigo-100 active:scale-95 transition-all"
          >
            <ArrowDownCircle className="w-4 h-4" /> Deposit
          </button>
        </div>
      </div>

      <div className="mx-4 space-y-2 mt-4">
        {profile?.verificationStatus === "pending" && (
          <div className="mb-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <div className="flex items-center gap-3 text-amber-700">
              <Clock className="w-5 h-5" />
              <p className="text-xs font-bold uppercase tracking-tight">Identity Verification Pending</p>
            </div>
            <p className="text-[10px] text-amber-600 mt-2 font-medium">Your documents have been submitted. Our compliance team is currently reviewing your application.</p>
          </div>
        )}
        
        {(!profile?.verificationStatus || profile?.verificationStatus === "rejected" || profile?.verificationStatus === "unsubmitted") && (
          <button 
            onClick={() => {
              setFullName(profile?.fullName || "");
              setPhoneNumber(profile?.phoneNumber || "");
              setAddressVal(profile?.address || "");
              setVerificationDoc(profile?.verificationDoc || null);
              setShowVerificationForm(true);
            }}
            className="w-full mb-4 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-indigo-100 active:scale-95 transition-all text-center flex items-center justify-center gap-3"
          >
            <UserIcon className="w-4 h-4" /> Personal Information
          </button>
        )}

        {[
          { icon: <Clock />, label: "Trade History", color: "text-blue-500", action: () => { setActiveTab("trading"); setActiveTradeSubTab("history"); } },
          { icon: <Bell />, label: "Security Notifications", color: "text-orange-500" },
          { icon: <MessageSquare />, label: "Live Support", color: "text-green-500", action: () => setShowChat(true) },
          { icon: <ShieldCheck />, label: "Security Center", color: "text-red-500" },
          { icon: <Lock />, label: "Change Password", color: "text-indigo-500", action: () => setShowChangePasswordModal(true) },
        ].map((item, idx) => (
          <button 
            key={idx}
            onClick={item.action}
            className="w-full flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-50 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className={cn("p-2 rounded-xl bg-gray-100", item.color)}>{item.icon}</div>
              <span className="font-bold text-gray-900 text-sm">{item.label}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
        ))}
        <button 
          onClick={() => auth.signOut()}
          className="w-full py-5 text-red-500 font-bold bg-red-50 rounded-2xl mt-4 border border-red-100 transition-colors shadow-sm"
        >
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {activeTab === "home" && renderHome()}
        {activeTab === "trading" && renderTrading()}
        {activeTab === "news" && renderNews()}
        {activeTab === "personal" && renderPersonal()}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-6 py-4 flex items-center justify-around z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
        <button 
          onClick={() => setActiveTab("home")}
          className={cn(
            "flex flex-col items-center gap-2 p-1 w-16 transition-all active:scale-75",
            activeTab === "home" ? "text-indigo-600" : "text-gray-400"
          )}
        >
          <Home className={cn("w-6 h-6 transition-all", activeTab === "home" ? "fill-indigo-600/20 scale-110" : "")} />
          <span className="text-[10px] font-black uppercase tracking-[0.1em]">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab("trading")}
          className={cn(
            "flex flex-col items-center gap-2 p-1 w-16 transition-all active:scale-75",
            activeTab === "trading" ? "text-indigo-600" : "text-gray-400"
          )}
        >
          <BarChart2 className={cn("w-6 h-6 transition-all", activeTab === "trading" ? "fill-indigo-600/20 scale-110" : "")} />
          <span className="text-[10px] font-black uppercase tracking-[0.1em]">Trade</span>
        </button>
        <button 
          onClick={() => setActiveTab("news")}
          className={cn(
            "flex flex-col items-center gap-2 p-1 w-16 transition-all active:scale-75",
            activeTab === "news" ? "text-indigo-600" : "text-gray-400"
          )}
        >
          <Bell className={cn("w-6 h-6 transition-all", activeTab === "news" ? "fill-indigo-600/20 scale-110" : "")} />
          <span className="text-[10px] font-black uppercase tracking-[0.1em]">News</span>
        </button>
        <button 
          onClick={() => setActiveTab("personal")}
          className={cn(
            "flex flex-col items-center gap-2 p-1 w-16 transition-all active:scale-75",
            activeTab === "personal" ? "text-indigo-600" : "text-gray-400"
          )}
        >
          <UserIcon className={cn("w-6 h-6 transition-all", activeTab === "personal" ? "fill-indigo-600/20 scale-110" : "")} />
          <span className="text-[10px] font-black uppercase tracking-[0.1em]">Me</span>
        </button>
      </div>

      <AnimatePresence>
        {showChangePasswordModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowChangePasswordModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2rem] overflow-hidden shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Change Password</h3>
                <button onClick={() => setShowChangePasswordModal(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-5">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-[0.15em] block mb-2 ml-1">Current Password</label>
                  <input 
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-slate-200 rounded-xl px-5 py-4 text-sm focus:bg-white focus:ring-4 focus:ring-slate-50 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-[0.15em] block mb-2 ml-1">New Password</label>
                  <input 
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-5 py-4 text-sm focus:bg-white focus:ring-4 focus:ring-slate-50 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-[0.15em] block mb-2 ml-1">Confirm New Password</label>
                  <input 
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-5 py-4 text-sm focus:bg-white focus:ring-4 focus:ring-slate-50 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300 font-medium"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-8 py-4 bg-[#1a1a1a] hover:bg-black disabled:opacity-50 text-white font-black rounded-xl shadow-xl active:scale-95 transition-all text-xs uppercase tracking-widest"
                  >
                    {isChangingPassword ? "Processing..." : "Change Password"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTrading && timeLeft !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
              className="relative flex flex-col items-center"
            >
              <div className="relative w-48 h-48 mb-8">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96" cy="96" r="88"
                    stroke="currentColor" strokeWidth="8"
                    fill="transparent"
                    className="text-white/10"
                  />
                  <motion.circle
                    cx="96" cy="96" r="88"
                    stroke="currentColor" strokeWidth="8"
                    fill="transparent"
                    strokeDasharray="553"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: 553 - (553 * (timeLeft / (tradeDetailsRef.current?.seconds || 1))) }}
                    className="text-indigo-600"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl font-black text-white">{timeLeft}</span>
                </div>
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-[0.2em] mb-2">Trade in Progress</h2>
              <p className="text-white/60 font-bold uppercase tracking-widest text-xs">Waiting for market result...</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDepositModal && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowDepositModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-t-[24px] sm:rounded-xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 overflow-y-auto max-h-[85vh]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Deposit</h3>
                  <button onClick={() => setShowDepositModal(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-3">Choice of Token</label>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {([
                        { id: "btc_address", name: "BTC" },
                        { id: "eth_address", name: "ETH" },
                        { id: "sol_address", name: "SOL" },
                        { id: "bnb_address", name: "BNB" },
                        { id: "xrp_address", name: "XRP" },
                        { id: "usdt_address", name: "USDT" }
                      ] as const).map((coin) => (
                        <button
                          key={coin.id}
                          onClick={() => setSelectedDepositCoin(coin.id)}
                          className={cn(
                            "py-2 px-1 rounded-lg text-xs font-bold transition-all border",
                            selectedDepositCoin === coin.id 
                              ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm" 
                              : "bg-white border-gray-100 text-gray-400 hover:bg-gray-50"
                          )}
                        >
                          {coin.name}
                        </button>
                      ))}
                    </div>

                    <label className="text-sm font-medium text-gray-700 block mb-2">Deposit Address</label>
                    <div className="bg-[#f9fafb] border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-black text-gray-900 uppercase">
                          {selectedDepositCoin.replace("_address", "").toUpperCase()} Address
                        </span>
                        <div className="flex items-center gap-1 text-gray-400">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-[12px] text-gray-600 break-all leading-relaxed font-mono bg-white p-3 rounded-lg border border-gray-100 mb-3 select-all">
                        {settings?.[selectedDepositCoin] || `No ${selectedDepositCoin.replace("_address", "").toUpperCase()} address set`}
                      </div>
                      <button 
                        onClick={() => copyToClipboard(settings?.[selectedDepositCoin] || "")}
                        className="w-full py-2.5 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy Address
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Quantity</label>
                    <input 
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-white border border-indigo-100 rounded-lg px-4 py-3 text-base focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 outline-none transition-all placeholder:text-gray-300 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Deposit Receipt Upload</label>
                    <div className="relative">
                      <input 
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className={cn(
                        "w-full border border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-all min-h-[160px]",
                        receiptFile ? "border-green-300 bg-green-50" : "border-gray-300 bg-white hover:border-gray-400"
                      )}>
                        {receiptFile ? (
                          <img src={receiptFile} referrerPolicy="no-referrer" className="max-h-24 rounded object-contain" alt="Preview" />
                        ) : (
                          <>
                            <Upload className="w-10 h-10 text-gray-300 mb-4" />
                            <div className="text-sm font-bold text-gray-900 mb-1">
                              Upload a file <span className="font-normal text-gray-500">or drag and drop</span>
                            </div>
                            <span className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSubmitDeposit}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base active:opacity-90 transition-opacity uppercase tracking-widest"
              >
                {isSubmittingDeposit ? "Synchronizing..." : "Submit Deposit"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVerificationForm && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowVerificationForm(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-t-[24px] sm:rounded-xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 pb-10 overflow-y-auto max-h-[85vh]">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-10 h-10 bg-[#f44336] rounded-lg flex items-center justify-center text-white">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-medium text-gray-900">Personal Information</h3>
                </div>

                <div className="space-y-8">
                  <div>
                    <label className="text-sm font-medium text-gray-800 block mb-3">Full Name</label>
                    <input 
                      type="text"
                      value={full_name}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 text-base focus:ring-4 focus:ring-red-50 focus:border-red-400 outline-none transition-all placeholder:text-gray-400 font-medium shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-800 block mb-3">Phone Number</label>
                    <input 
                      type="tel"
                      value={phone_number}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Enter your phone number"
                      className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 text-base focus:ring-4 focus:ring-red-50 focus:border-red-400 outline-none transition-all placeholder:text-gray-400 font-medium shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-800 block mb-3">Residential Address</label>
                    <textarea 
                      value={address_val}
                      onChange={(e) => setAddressVal(e.target.value)}
                      placeholder="Enter your full address"
                      rows={2}
                      className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 text-base focus:ring-4 focus:ring-red-50 focus:border-red-400 outline-none transition-all placeholder:text-gray-400 font-medium shadow-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-800 block mb-3">ID / Passport / Driving License</label>
                    <div className="relative group">
                      <input 
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleVerificationFileChange}
                        className="hidden"
                        id="verification-doc-upload"
                      />
                      <label 
                        htmlFor="verification-doc-upload"
                        className={cn(
                          "flex flex-col items-center justify-center gap-3 w-full border-2 border-dashed rounded-2xl py-8 px-4 transition-all cursor-pointer",
                          verificationDoc 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-600" 
                            : "bg-gray-50 border-gray-200 text-gray-400 hover:border-red-300 hover:bg-red-50/50"
                        )}
                      >
                        {verificationDoc ? (
                          <div className="flex flex-col items-center gap-2">
                            <ShieldCheck className="w-8 h-8 text-emerald-500" />
                            <span className="text-sm font-bold">Document Selected</span>
                            <span className="text-[10px] uppercase font-black tracking-widest opacity-60">Click to change</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-8 h-8 text-gray-300" />
                            <span className="text-sm font-bold">Upload Document</span>
                            <span className="text-[10px] uppercase font-black tracking-widest opacity-60">JPG, PNG or PDF (Max 2MB)</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <button 
                    onClick={handleSubmitVerification}
                    disabled={isSubmittingVerification}
                    className="w-full py-5 bg-[#f44336] hover:bg-[#d32f2f] disabled:opacity-50 text-white font-bold text-lg rounded-xl shadow-xl shadow-red-100 active:scale-[0.98] transition-all mt-4"
                  >
                    {isSubmittingVerification ? "Submitting..." : "Submit for Verification"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowWithdrawModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-t-[24px] sm:rounded-xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 pb-10 overflow-y-auto max-h-[85vh]">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-10 h-10 bg-[#f44336] rounded-lg"></div>
                  <h3 className="text-2xl font-medium text-gray-900">Withdraw Funds</h3>
                </div>

                <div className="space-y-8">
                  <div>
                    <label className="text-sm font-medium text-gray-800 block mb-3">Withdraw Type</label>
                    <div className="relative">
                      <select
                        value={withdrawType}
                        onChange={(e) => setWithdrawType(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 text-base focus:ring-4 focus:ring-red-50 focus:border-red-400 outline-none appearance-none transition-all font-medium text-gray-700 pr-12 shadow-sm"
                      >
                        <option value="USDT (ERC20)">USDT (ERC20)</option>
                        <option value="USDT (TRC20)">USDT (TRC20)</option>
                        <option value="Bitcoin (BTC)">Bitcoin (BTC)</option>
                        <option value="Ethereum (ETH)">Ethereum (ETH)</option>
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-800 block mb-3">Withdrawal Address</label>
                    <input 
                      type="text"
                      value={withdrawAddress}
                      onChange={(e) => setWithdrawAddress(e.target.value)}
                      placeholder="Enter your wallet address"
                      className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 text-base focus:ring-4 focus:ring-red-50 focus:border-red-400 outline-none transition-all placeholder:text-gray-400 font-medium shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-800 block mb-3">Amount</label>
                    <input 
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 text-base focus:ring-4 focus:ring-red-50 focus:border-red-400 outline-none transition-all placeholder:text-gray-400 font-medium shadow-sm"
                    />
                  </div>

                  <button 
                    onClick={handleWithdraw}
                    className="w-full py-5 bg-[#f44336] hover:bg-[#d32f2f] text-white font-bold text-lg rounded-xl shadow-xl shadow-red-100 active:scale-[0.98] transition-all mt-4"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTradeSuccess && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowTradeSuccess(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl p-8 text-center"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                <TrendingUp className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Trading Successful</h3>
              <p className="text-gray-500 mb-8 font-medium">Your trade has been executed and is now under verification by the network.</p>
              
              <button 
                onClick={() => setShowTradeSuccess(false)}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                Return to Terminal
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOptionModal && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowOptionModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-white rounded-t-[32px] overflow-hidden shadow-2xl p-6"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold", selectedAsset.color)}>
                  {selectedAsset.icon}
                </div>
                <button onClick={() => setShowOptionModal(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="mb-6 text-center">
                <div className={cn(
                  "text-4xl font-black flex items-baseline justify-center gap-1",
                  marketData[selectedAsset.symbol]?.isUp ? "text-green-500" : "text-red-500"
                )}>
                   {marketData[selectedAsset.symbol]?.price.split(".")[0] || "0"}
                   <span className="text-xl font-medium">.{marketData[selectedAsset.symbol]?.price.split(".")[1] || "00"}</span>
                   <span className="text-sm font-bold text-gray-400 ml-1">
                     {Math.floor(Math.random() * 9)}
                   </span>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-3">Time</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { s: 30, r: 3 },
                      { s: 60, r: 10 },
                      { s: 90, r: 15 },
                      { s: 120, r: 22 },
                      { s: 180, r: 30 },
                      { s: 300, r: 40 }
                    ].map((dur) => (
                      <button
                        key={dur.s}
                        onClick={() => setSelectedDuration(dur.s)}
                        className={cn(
                          "py-3 rounded-xl border-2 transition-all text-center",
                          selectedDuration === dur.s 
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md scale-[1.02]" 
                            : "bg-white border-gray-100 text-gray-900 hover:border-gray-200"
                        )}
                      >
                        <div className="text-sm font-black">{dur.s}s</div>
                        <div className={cn("text-[10px] font-bold opacity-80", selectedDuration === dur.s ? "text-white" : "text-gray-400")}>
                          Return {dur.r}%
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Trade Value (USDT)</label>
                    <span className="text-xs font-black text-gray-400">Yield: <span className="text-indigo-600">{(parseFloat(tradeAmount) || 0).toFixed(2)}</span></span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-50 border-2 border-slate-50 rounded-xl px-5 py-4 font-black text-lg focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-600 font-black">$</span>
                    Portfolio: {formatCurrency(profile?.balance || 0)} 
                  </div>
                  <div>Limit: 100 - 100k</div>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-4">
                  <button 
                    onClick={() => { setShowOptionModal(false); setShowTradeConfirm(true); }}
                    className="py-5 bg-green-500 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-sm uppercase tracking-[0.1em]"
                  >
                    Buy Long
                  </button>
                  <button 
                    onClick={() => { setShowOptionModal(false); setShowTradeConfirm(true); }}
                    className="py-5 bg-red-500 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-sm uppercase tracking-[0.1em]"
                  >
                    Sell Short
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTradeConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowTradeConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl p-8"
            >
              <h3 className="text-2xl font-black text-gray-900 mb-2">Confirm Order</h3>
              <p className="text-gray-500 mb-8 font-medium">Are you sure you want to execute this trade on {selectedAsset.short}?</p>
              
              <div className="space-y-4 mb-8 bg-gray-50 p-6 rounded-2xl">
                 <div className="flex justify-between font-bold">
                    <span className="text-gray-400">Amount</span>
                    <span className="text-gray-900">{formatCurrency(parseFloat(tradeAmount) || 0)}</span>
                 </div>
                 <div className="flex justify-between font-bold">
                    <span className="text-gray-400">Duration</span>
                    <span className="text-gray-900">{selectedDuration}s</span>
                 </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowTradeConfirm(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl"
                >
                  Cancel
                </button>
                <button 
                  onClick={handlePlaceTrade}
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest"
                >
                  Execute Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChat && (
          <div className="fixed inset-0 z-[60] flex flex-col bg-white">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 tracking-tight">VIP Portal</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Quantum Agent Online</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowChat(false)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-all"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex flex-col max-w-[85%]", msg.senderId === user.uid ? "ml-auto items-end" : "mr-auto items-start")}>
                  <div className={cn("p-5 rounded-3xl text-sm font-medium shadow-sm transition-all hover:shadow-md", msg.senderId === user.uid ? "bg-indigo-600 text-white rounded-br-none" : "bg-white text-gray-900 border border-slate-100 rounded-bl-none")}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-100 bg-white">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Message support..." 
                  className="flex-1 bg-gray-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 outline-none transition-all placeholder:text-gray-300" 
                />
                <button 
                  type="button"
                  onClick={handleSendMessage}
                  disabled={isSending || !newMessage.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-4 rounded-2xl transform active:scale-95 transition-all shadow-lg shadow-indigo-100"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
