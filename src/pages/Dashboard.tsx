import React, { useState, useEffect } from "react";
import { User, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { UserProfile, Transaction, PlatformSettings, News, SupportMessage, FirestoreErrorInfo } from "../types";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  setDoc,
  doc, 
  serverTimestamp, 
  getDoc,
  increment 
} from "firebase/firestore";
import { 
  TrendingUp,
  TrendingDown,
  Trophy,
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
  ShieldCheck,
  LogOut
} from "lucide-react";
import { toast } from "react-hot-toast";
import { formatCurrency, cn, compressImage, uploadOrFallback, handleFileUploadFlow } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { TradingViewWidget } from "../components/TradingViewWidget";

const CRYPTO_ASSETS = [
  { symbol: "BINANCE:BTCUSDT", name: "Bitcoin", short: "BTC", color: "bg-orange-500", icon: "₿", imageUrl: "https://assets.coincap.io/assets/icons/btc@2x.png" },
  { symbol: "BINANCE:ETHUSDT", name: "Ethereum", short: "ETH", color: "bg-blue-500", icon: "Ξ", imageUrl: "https://assets.coincap.io/assets/icons/eth@2x.png" },
  { symbol: "BINANCE:SOLUSDT", name: "Solana", short: "SOL", color: "bg-purple-500", icon: "S", imageUrl: "https://assets.coincap.io/assets/icons/sol@2x.png" },
  { symbol: "BINANCE:XRPUSDT", name: "XRP", short: "XRP", color: "bg-slate-400", icon: "X", imageUrl: "https://assets.coincap.io/assets/icons/xrp@2x.png" },
  { symbol: "BINANCE:BNBUSDT", name: "BNB", short: "BNB", color: "bg-yellow-400", icon: "B", imageUrl: "https://assets.coincap.io/assets/icons/bnb@2x.png" },
  { symbol: "BINANCE:ADAUSDT", name: "Cardano", short: "ADA", color: "bg-blue-700", icon: "₳", imageUrl: "https://assets.coincap.io/assets/icons/ada@2x.png" },
  { symbol: "BINANCE:DOGEUSDT", name: "Dogecoin", short: "DOGE", color: "bg-yellow-600", icon: "Ð", imageUrl: "https://assets.coincap.io/assets/icons/doge@2x.png" },
  { symbol: "BINANCE:TRXUSDT", name: "Tron", short: "TRX", color: "bg-red-500", icon: "T", imageUrl: "https://assets.coincap.io/assets/icons/trx@2x.png" },
  { symbol: "BINANCE:AVAXUSDT", name: "Avalanche", short: "AVAX", color: "bg-red-600", icon: "A", imageUrl: "https://assets.coincap.io/assets/icons/avax@2x.png" },
  { symbol: "BINANCE:SHIBUSDT", name: "Shiba Inu", short: "SHIB", color: "bg-orange-600", icon: "S", imageUrl: "https://assets.coincap.io/assets/icons/shib@2x.png" },
  { symbol: "BINANCE:DOTUSDT", name: "Polkadot", short: "DOT", color: "bg-pink-500", icon: "P", imageUrl: "https://assets.coincap.io/assets/icons/dot@2x.png" },
  { symbol: "BINANCE:LINKUSDT", name: "Chainlink", short: "LINK", color: "bg-blue-400", icon: "L", imageUrl: "https://assets.coincap.io/assets/icons/link@2x.png" },
  { symbol: "BINANCE:MATICUSDT", name: "Polygon", short: "MATIC", color: "bg-purple-600", icon: "M", imageUrl: "https://assets.coincap.io/assets/icons/matic@2x.png" },
  { symbol: "BINANCE:LTCUSDT", name: "Litecoin", short: "LTC", color: "bg-slate-300", icon: "Ł", imageUrl: "https://assets.coincap.io/assets/icons/ltc@2x.png" },
  { symbol: "BINANCE:NEARUSDT", name: "Near", short: "NEAR", color: "bg-slate-900", icon: "N", imageUrl: "https://assets.coincap.io/assets/icons/near@2x.png" },
  { symbol: "BINANCE:UNIUSDT", name: "Uniswap", short: "UNI", color: "bg-pink-400", icon: "U", imageUrl: "https://assets.coincap.io/assets/icons/uni@2x.png" },
  { symbol: "BINANCE:APTUSDT", name: "Aptos", short: "APT", color: "bg-teal-500", icon: "A", imageUrl: "https://assets.coincap.io/assets/icons/apt@2x.png" },
  { symbol: "BINANCE:PEPEUSDT", name: "Pepe", short: "PEPE", color: "bg-green-500", icon: "P", imageUrl: "https://assets.coincap.io/assets/icons/pepe@2x.png" },
  { symbol: "BINANCE:ARBUSDT", name: "Arbitrum", short: "ARB", color: "bg-blue-300", icon: "A", imageUrl: "https://assets.coincap.io/assets/icons/arb@2x.png" },
  { symbol: "BINANCE:OPUSDT", name: "Optimism", short: "OP", color: "bg-red-400", icon: "O", imageUrl: "https://assets.coincap.io/assets/icons/op@2x.png" },
];

const FOREX_ASSETS = [
  { symbol: "FX:EURUSD", name: "EUR/USD", short: "EURUSD", color: "bg-blue-600", icon: "€", imageUrl: "https://flagcdn.com/w80/eu.png" },
  { symbol: "FX:GBPUSD", name: "GBP/USD", short: "GBPUSD", color: "bg-indigo-600", icon: "£", imageUrl: "https://flagcdn.com/w80/gb.png" },
  { symbol: "FX:USDJPY", name: "USD/JPY", short: "USDJPY", color: "bg-red-600", icon: "¥", imageUrl: "https://flagcdn.com/w80/jp.png" },
  { symbol: "FX:AUDUSD", name: "AUD/USD", short: "AUDUSD", color: "bg-green-600", icon: "A", imageUrl: "https://flagcdn.com/w80/au.png" },
  { symbol: "FX:USDCAD", name: "USD/CAD", short: "USDCAD", color: "bg-rose-600", icon: "C", imageUrl: "https://flagcdn.com/w80/ca.png" },
  { symbol: "FX:USDCHF", name: "USD/CHF", short: "USDCHF", color: "bg-slate-600", icon: "F", imageUrl: "https://flagcdn.com/w80/ch.png" },
  { symbol: "FX:NZDUSD", name: "NZD/USD", short: "NZDUSD", color: "bg-emerald-600", icon: "N", imageUrl: "https://flagcdn.com/w80/nz.png" },
  { symbol: "FX:EURGBP", name: "EUR/GBP", short: "EURGBP", color: "bg-sky-600", icon: "£", imageUrl: "https://flagcdn.com/w80/eu.png" },
  { symbol: "FX:EURJPY", name: "EUR/JPY", short: "EURJPY", color: "bg-violet-600", icon: "¥", imageUrl: "https://flagcdn.com/w80/eu.png" },
  { symbol: "FX:GBPJPY", name: "GBP/JPY", short: "GBPJPY", color: "bg-fuchsia-600", icon: "¥", imageUrl: "https://flagcdn.com/w80/gb.png" },
  { symbol: "FX:AUDJPY", name: "AUD/JPY", short: "AUDJPY", color: "bg-cyan-600", icon: "¥", imageUrl: "https://flagcdn.com/w80/au.png" },
];

const COMMODITY_ASSETS = [
  { symbol: "OANDA:XAUUSD", name: "Gold", short: "XAU", color: "bg-yellow-600", icon: "G" },
  { symbol: "OANDA:XAGUSD", name: "Silver", short: "XAG", color: "bg-gray-300", icon: "S" },
  { symbol: "OANDA:UK100GBP", name: "UK 100", short: "UK100", color: "bg-blue-800", icon: "U" },
  { symbol: "OANDA:US30USD", name: "US Wall St 30", short: "US30", color: "bg-blue-900", icon: "A" },
  { symbol: "OANDA:XCUUSD", name: "Copper", short: "COPPER", color: "bg-orange-700", icon: "C" },
  { symbol: "OANDA:XPTUSD", name: "Platinum", short: "PLAT", color: "bg-slate-400", icon: "P" },
  { symbol: "OANDA:BCOUSD", name: "Brent Crude", short: "BRENT", color: "bg-slate-800", icon: "B" },
];

const STOCK_ASSETS = [
  { symbol: "NASDAQ:AAPL", name: "Apple Inc.", short: "AAPL", color: "bg-slate-900", icon: "", imageUrl: "https://logo.clearbit.com/apple.com" },
  { symbol: "NASDAQ:TSLA", name: "Tesla Inc.", short: "TSLA", color: "bg-red-600", icon: "T", imageUrl: "https://logo.clearbit.com/tesla.com" },
  { symbol: "NASDAQ:NVDA", name: "Nvidia Corp.", short: "NVDA", color: "bg-emerald-500", icon: "N", imageUrl: "https://logo.clearbit.com/nvidia.com" },
  { symbol: "NASDAQ:AMZN", name: "Amazon.com", short: "AMZN", color: "bg-orange-400", icon: "A", imageUrl: "https://logo.clearbit.com/amazon.com" },
  { symbol: "NASDAQ:MSFT", name: "Microsoft", short: "MSFT", color: "bg-blue-500", icon: "M", imageUrl: "https://logo.clearbit.com/microsoft.com" },
  { symbol: "NASDAQ:GOOGL", name: "Alphabet (Google)", short: "GOOGL", color: "bg-red-500", icon: "G", imageUrl: "https://logo.clearbit.com/google.com" },
  { symbol: "NASDAQ:META", name: "Meta Platforms", short: "META", color: "bg-blue-600", icon: "M", imageUrl: "https://logo.clearbit.com/facebook.com" },
  { symbol: "NYSE:BRK.B", name: "Berkshire Hathaway", short: "BRK.B", color: "bg-slate-700", icon: "B", imageUrl: "https://logo.clearbit.com/berkshirehathaway.com" },
  { symbol: "NYSE:V", name: "Visa Inc.", short: "VISA", color: "bg-blue-800", icon: "V", imageUrl: "https://logo.clearbit.com/visa.com" },
  { symbol: "NYSE:JPM", name: "J.P. Morgan", short: "JPM", color: "bg-blue-900", icon: "J", imageUrl: "https://logo.clearbit.com/jpmorganchase.com" },
  { symbol: "NYSE:WMT", name: "Walmart Inc.", short: "WMT", color: "bg-blue-400", icon: "W", imageUrl: "https://logo.clearbit.com/walmart.com" },
  { symbol: "NASDAQ:NFLX", name: "Netflix Inc.", short: "NFLX", color: "bg-red-700", icon: "N", imageUrl: "https://logo.clearbit.com/netflix.com" },
];

const INDICES_ASSETS = [
  { symbol: "CURRENCYCOM:US500", name: "S&P 500", short: "SPX", color: "bg-blue-600", icon: "S" },
  { symbol: "CURRENCYCOM:US100", name: "Nasdaq 100", short: "NDX", color: "bg-indigo-600", icon: "N" },
  { symbol: "CURRENCYCOM:US30", name: "Dow Jones 30", short: "DJI", color: "bg-blue-800", icon: "D" },
  { symbol: "CURRENCYCOM:DE40", name: "DAX 40", short: "DAX", color: "bg-yellow-600", icon: "D" },
  { symbol: "CURRENCYCOM:UK100", name: "FTSE 100", short: "FTSE", color: "bg-blue-900", icon: "F" },
  { symbol: "CURRENCYCOM:FR40", name: "CAC 40", short: "CAC", color: "bg-blue-500", icon: "C" },
  { symbol: "CURRENCYCOM:JP225", name: "Nikkei 225", short: "NKY", color: "bg-red-600", icon: "N" },
  { symbol: "CURRENCYCOM:HK50", name: "Hang Seng", short: "HSI", color: "bg-red-700", icon: "H" },
  { symbol: "CURRENCYCOM:AU200", name: "ASX 200", short: "XJO", color: "bg-indigo-700", icon: "A" },
  { symbol: "CURRENCYCOM:EU50", name: "Euro Stoxx 50", short: "SX5E", color: "bg-blue-400", icon: "E" },
  { symbol: "CURRENCYCOM:ES35", name: "IBEX 35", short: "IBEX", color: "bg-red-400", icon: "I" },
];

const BOND_ASSETS = [
  { symbol: "TVC:US10Y", name: "US 10Y Yield", short: "US10Y", color: "bg-blue-900", icon: "U" },
  { symbol: "TVC:US02Y", name: "US 2Y Yield", short: "US02Y", color: "bg-blue-700", icon: "U" },
  { symbol: "TVC:DE10Y", name: "Bund 10Y Yield", short: "DE10Y", color: "bg-yellow-600", icon: "B" },
  { symbol: "TVC:UK10Y", name: "Gilt 10Y Yield", short: "UK10Y", color: "bg-indigo-900", icon: "G" },
  { symbol: "TVC:JP10Y", name: "JGB 10Y Yield", short: "JP10Y", color: "bg-red-600", icon: "J" },
  { symbol: "TVC:IT10Y", name: "BTP 10Y Yield", short: "IT10Y", color: "bg-green-600", icon: "I" },
  { symbol: "TVC:US30Y", name: "US 30Y Yield", short: "US30Y", color: "bg-blue-400", icon: "U" },
];

const FUTURE_ASSETS = [
  { symbol: "CME:ES1!", name: "E-mini S&P 500", short: "ES", color: "bg-blue-600", icon: "F" },
  { symbol: "CME:NQ1!", name: "E-mini Nasdaq 100", short: "NQ", color: "bg-indigo-600", icon: "F" },
  { symbol: "CME:CL1!", name: "Crude Oil Futures", short: "CL", color: "bg-slate-800", icon: "F" },
  { symbol: "CME:GC1!", name: "Gold Futures", short: "GC", color: "bg-yellow-600", icon: "F" },
  { symbol: "CME:SI1!", name: "Silver Futures", short: "SI", color: "bg-slate-400", icon: "F" },
  { symbol: "CME:HG1!", name: "Copper Futures", short: "HG", color: "bg-orange-700", icon: "F" },
  { symbol: "CME:NG1!", name: "Nat Gas Futures", short: "NG", color: "bg-blue-400", icon: "F" },
];

const FUND_ASSETS = [
  { symbol: "AMEX:SPY", name: "SPDR S&P 500 ETF", short: "SPY", color: "bg-blue-600", icon: "F" },
  { symbol: "NASDAQ:QQQ", name: "Invesco QQQ Trust", short: "QQQ", color: "bg-indigo-600", icon: "F" },
  { symbol: "AMEX:IVV", name: "iShares Core S&P 500", short: "IVV", color: "bg-blue-800", icon: "F" },
  { symbol: "AMEX:VOO", name: "Vanguard S&P 500", short: "VOO", color: "bg-red-600", icon: "F" },
  { symbol: "AMEX:VTI", name: "Vanguard Total Stock", short: "VTI", color: "bg-slate-700", icon: "F" },
  { symbol: "AMEX:ARKK", name: "ARK Innovation ETF", short: "ARKK", color: "bg-purple-600", icon: "F" },
  { symbol: "AMEX:GLD", name: "SPDR Gold Shares", short: "GLD", color: "bg-yellow-600", icon: "F" },
];

const OPTION_ASSETS = [
  { symbol: "SPY260619C00500000", name: "SPY Call Jun 2026", short: "SPYC", color: "bg-emerald-500", icon: "O" },
  { symbol: "SPY260619P00500000", name: "SPY Put Jun 2026", short: "SPYP", color: "bg-rose-500", icon: "O" },
  { symbol: "QQQ260116C00450000", name: "QQQ Call Jan 2026", short: "QQQC", color: "bg-emerald-600", icon: "O" },
  { symbol: "TSLA260116C00200000", name: "TSLA Call Jan 2026", short: "TSLAC", color: "bg-emerald-400", icon: "O" },
  { symbol: "AAPL260116C00200000", name: "AAPL Call Jan 2026", short: "AAPLC", color: "bg-emerald-700", icon: "O" },
  { symbol: "NVDA260116C00100000", name: "NVDA Call Jan 2026", short: "NVDAC", color: "bg-emerald-300", icon: "O" },
  { symbol: "BTC251226C100000", name: "BTC Call Dec 2025", short: "BTCC", color: "bg-orange-500", icon: "O" },
];

const ECONOMY_ASSETS = [
  { symbol: "ECONOMY:US_CPI", name: "US Inflation (CPI)", short: "CPI", color: "bg-red-600", icon: "E" },
  { symbol: "ECONOMY:US_GDP", name: "US GDP Growth", short: "GDP", color: "bg-blue-600", icon: "E" },
  { symbol: "ECONOMY:US_UE", name: "US Unemployment", short: "UNR", color: "bg-orange-600", icon: "E" },
  { symbol: "ECONOMY:EU_CPI", name: "Eurozone Inflation", short: "ECPI", color: "bg-indigo-600", icon: "E" },
  { symbol: "ECONOMY:UK_GDP", name: "UK GDP Growth", short: "UGDP", color: "bg-blue-900", icon: "E" },
  { symbol: "ECONOMY:CN_GDP", name: "China GDP Growth", short: "CGDP", color: "bg-red-700", icon: "E" },
  { symbol: "ECONOMY:JP_CPI", name: "Japan Inflation", short: "JCPI", color: "bg-red-500", icon: "E" },
];

const ALL_ASSETS = [...CRYPTO_ASSETS, ...FOREX_ASSETS, ...COMMODITY_ASSETS, ...STOCK_ASSETS, ...INDICES_ASSETS, ...BOND_ASSETS, ...FUTURE_ASSETS, ...FUND_ASSETS, ...OPTION_ASSETS, ...ECONOMY_ASSETS];

interface DashboardProps {
  user: User;
  profile: UserProfile | null;
  refreshProfile: () => void;
}

const ASSET_DURATIONS = [
  {
    s: 30,
    r: 5,
    idleClass: "bg-amber-500/10 border-amber-500/25 text-amber-300/90 hover:border-amber-400/50",
    activeClass: "bg-[#272010] border-[#F5B400] text-[#F5B400] shadow-[0_0_16px_rgba(245,180,0,0.22)]",
    subIdleClass: "text-amber-200/70",
    subActiveClass: "text-[#F5B400]"
  },
  {
    s: 60,
    r: 10,
    idleClass: "bg-emerald-500/10 border-emerald-500/25 text-emerald-300/90 hover:border-emerald-400/50",
    activeClass: "bg-[#0D2524] border-[#22C58B] text-[#22C58B] shadow-[0_0_16px_rgba(34,197,139,0.22)]",
    subIdleClass: "text-emerald-200/70",
    subActiveClass: "text-[#22C58B]"
  },
  {
    s: 90,
    r: 15,
    idleClass: "bg-cyan-500/10 border-cyan-500/25 text-cyan-300/90 hover:border-cyan-400/50",
    activeClass: "bg-[#0B2230] border-cyan-400 text-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.22)]",
    subIdleClass: "text-cyan-200/70",
    subActiveClass: "text-cyan-300"
  },
  {
    s: 120,
    r: 22,
    idleClass: "bg-indigo-500/10 border-indigo-500/25 text-indigo-300/90 hover:border-indigo-400/50",
    activeClass: "bg-[#161D3B] border-indigo-400 text-indigo-300 shadow-[0_0_16px_rgba(129,140,248,0.22)]",
    subIdleClass: "text-indigo-200/70",
    subActiveClass: "text-indigo-300"
  },
  {
    s: 180,
    r: 30,
    idleClass: "bg-violet-500/10 border-violet-500/25 text-violet-300/90 hover:border-violet-400/50",
    activeClass: "bg-[#1F1538] border-violet-400 text-violet-300 shadow-[0_0_16px_rgba(167,139,250,0.22)]",
    subIdleClass: "text-violet-200/70",
    subActiveClass: "text-violet-300"
  },
  {
    s: 300,
    r: 40,
    idleClass: "bg-rose-500/10 border-rose-500/25 text-rose-300/90 hover:border-rose-400/50",
    activeClass: "bg-[#26131C] border-[#FB7185] text-[#FB7185] shadow-[0_0_16px_rgba(251,113,133,0.22)]",
    subIdleClass: "text-rose-200/70",
    subActiveClass: "text-[#FB7185]"
  }
];

export default function Dashboard({ user, profile, refreshProfile }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"home" | "trading" | "news" | "personal">("home");
  const [activeMarketTab, setActiveMarketTab] = useState<"crypto" | "forex" | "gold" | "stock" | "indices" | "future" | "fund" | "option" | "economy" | "bond">("crypto");
  const [activeTradeSubTab, setActiveTradeSubTab] = useState<"positions" | "history">("positions");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [selectedAsset, setSelectedAsset] = useState(CRYPTO_ASSETS[0]);
  const [marketData, setMarketData] = useState<Record<string, { price: string, change: string, isUp: boolean }>>({});
  const [marketSearch, setMarketSearch] = useState("");
  const [tradeAmount, setTradeAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawName, setWithdrawName] = useState(profile?.fullName || "");
  const [isTrading, setIsTrading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [tradeSide, setTradeSide] = useState<"BUY" | "SELL">("BUY");
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
      handleFileUploadFlow(file, setVerificationDoc, "optDoc", "Document uploaded and optimized!");
    }
  };

  useEffect(() => {
    if (profile?.fullName) {
      setWithdrawName(profile.fullName);
    }
  }, [profile]);

  // Initialize and update market data for "Live" accuracy
  useEffect(() => {
    // 1. WebSocket for Crypto (Real-time)
    const cryptoPairs = CRYPTO_ASSETS.map(a => (a.short + "USDT").toLowerCase());
    const streams = cryptoPairs.map(p => `${p}@ticker`).join("/");
    let ws: WebSocket | null = null;
    let isWsActive = false;

    const connectWS = () => {
      try {
        ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
        
        ws.onmessage = (event) => {
          isWsActive = true;
          const data = JSON.parse(event.data);
          const stream = data.stream;
          const ticker = data.data;
          
          const asset = CRYPTO_ASSETS.find(a => (a.short + "USDT").toLowerCase() === ticker.s.toLowerCase());
          if (asset) {
            const price = parseFloat(ticker.c);
            const change = parseFloat(ticker.P);
            
            setMarketData(prev => ({
              ...prev,
              [asset.symbol]: {
                price: price.toLocaleString("en-US", { 
                  minimumFractionDigits: price < 1 ? 4 : 2, 
                  maximumFractionDigits: price < 1 ? 4 : 2 
                }),
                change: change.toFixed(2),
                isUp: change >= 0
              }
            }));
          }
        };

        ws.onerror = (e) => {
          isWsActive = false;
          // Silent fallback to avoid throwing loud console exceptions in structured sandbox frames
          console.warn("Binance WS offline or blocked in current environment. Local backup price feed simulation activated.");
        };

        ws.onclose = () => {
          isWsActive = false;
          console.warn("Binance WS Closed, reconnecting with simulation fallback active...");
          setTimeout(connectWS, 5000);
        };
      } catch (err) {
        isWsActive = false;
        console.warn("Failed to connect to Binance WebSocket, active Local backup loop.", err);
      }
    };

    connectWS();

    // 2. Fetcher for Non-Crypto (Poll/Simulation)
    const fetchMarketData = async () => {
      // Update with simulation for commodities/stocks/etc
      const updateWithSimulation = (currentData: Record<string, { price: string, change: string, isUp: boolean }>) => {
        const newData = { ...currentData };
        
        ALL_ASSETS.forEach(asset => {
          // SKIP simulation for crypto if we have active WS data
          const isCrypto = CRYPTO_ASSETS.some(ca => ca.symbol === asset.symbol);
          
          if (!newData[asset.symbol]) {
            let basePrice = 1.0;
            if (asset.short === "BTC") basePrice = 81469.34;
            else if (asset.short === "ETH") basePrice = 3120.50;
            else if (asset.short === "SOL") basePrice = 148.20;
            else if (asset.short === "XAU") basePrice = 4681.25;
            else if (asset.short === "XAG") basePrice = 54.20;
            else if (asset.short === "UK100") basePrice = 8415.50;
            else if (asset.short === "US30") basePrice = 39120.00;
            else if (asset.short === "BRENT") basePrice = 84.15;
            else if (asset.short === "COPPER") basePrice = 4.85;
            else if (asset.short === "PLAT") basePrice = 1045.20;
            else if (asset.short === "AAPL") basePrice = 184.20;
            else if (asset.short === "TSLA") basePrice = 172.50;
            else if (asset.short === "NVDA") basePrice = 902.50;
            else if (asset.short === "SPX") basePrice = 5180.20;
            else if (asset.short === "NDX") basePrice = 18120.40;
            else if (asset.short === "US10Y") basePrice = 4.45;
            else if (asset.short === "CPI") basePrice = 3.4;
            else if (asset.short === "ES") basePrice = 5210.50;
            else if (asset.short === "SPY") basePrice = 515.40;
            else if (asset.short === "QQQ") basePrice = 442.80;
            else if (asset.short === "BNB") basePrice = 585.00;
            else if (asset.short === "LINK") basePrice = 14.50;
            else if (asset.short === "EURUSD") basePrice = 1.0765;
            else if (asset.short === "GBPUSD") basePrice = 1.2520;
            else if (asset.short === "USDJPY") basePrice = 154.40;
            
            const randomChange = ((Math.random() * 2) - 0.5).toFixed(2);
            newData[asset.symbol] = { 
              price: basePrice.toLocaleString("en-US", { minimumFractionDigits: 2 }), 
              change: randomChange, 
              isUp: parseFloat(randomChange) >= 0 
            };
          }
          
          // Simulation of live price movement for NON-CRYPTO, or CRYPTO when WS is offline
          if (!isCrypto || !isWsActive) {
            const priceObj = newData[asset.symbol];
            const priceStr = priceObj.price.replace(/,/g, '');
            const currentPrice = parseFloat(priceStr);
            
            if (!isNaN(currentPrice)) {
              let volatility = 0.0002;
              if (asset.short.includes("USD") || asset.short.includes("EUR")) volatility = 0.00005;
              if (asset.short === "NVDA") volatility = 0.0008;
              if (isCrypto) volatility = 0.0005; // Crypto is extra volatile!

              const jitter = (Math.random() - 0.498) * (currentPrice * volatility);
              const nextPrice = currentPrice + jitter;
              const decimals = (asset.short.length > 3 && !asset.short.includes("US") && !asset.short.includes("SPY")) ? 4 : 2;
              
              newData[asset.symbol] = {
                ...priceObj,
                price: nextPrice.toLocaleString("en-US", { 
                  minimumFractionDigits: decimals, 
                  maximumFractionDigits: decimals 
                }),
                change: (parseFloat(priceObj.change) + (Math.random() - 0.5) * 0.01).toFixed(2),
                isUp: parseFloat(priceObj.change) >= 0
              };
            }
          }
        });
        return newData;
      };

      setMarketData(prev => {
        let newData = { ...prev };
        
        // Fetch Forex (Free API fallback)
        const fetchForex = async () => {
          try {
            const response = await fetch('https://open.er-api.com/v6/latest/USD');
            if (response.ok) {
              const data = await response.json();
              const rates = data.rates;
              FOREX_ASSETS.forEach(asset => {
                if (asset.short.startsWith("USD")) {
                  const target = asset.short.slice(3);
                  if (rates[target]) {
                    newData[asset.symbol] = {
                      price: rates[target].toLocaleString("en-US", { minimumFractionDigits: 4 }),
                      change: (Math.random() * 0.8).toFixed(2),
                      isUp: Math.random() > 0.5
                    };
                  }
                } else if (asset.short.endsWith("USD")) {
                  const source = asset.short.slice(0, 3);
                  if (rates[source]) {
                    const price = 1 / rates[source];
                    newData[asset.symbol] = {
                      price: price.toLocaleString("en-US", { minimumFractionDigits: 4 }),
                      change: (Math.random() * 0.8).toFixed(2),
                      isUp: Math.random() > 0.5
                    };
                  }
                }
              });
            }
          } catch (e) { console.warn("Forex fetch failed", e); }
        };

        fetchForex();
        return updateWithSimulation(newData);
      });
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 2000);
    
    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, []);
  const [depositAmount, setDepositAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [showTradeConfirm, setShowTradeConfirm] = useState(false);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [showTradeSuccess, setShowTradeSuccess] = useState(false);
  const [tradeResult, setTradeResult] = useState<{
    isWin: boolean;
    amount: number;
    profit: number;
    side: "BUY" | "SELL";
    entryPrice: number;
    exitPrice: number;
    duration: number;
    percentage: number;
    assetShort: string;
    assetName: string;
    timestamp: string;
  } | null>(null);
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
  const tradeDetailsRef = React.useRef<{
    amount: number;
    seconds: number;
    symbol: string;
    side: "BUY" | "SELL";
    entryPrice: number;
    assetShort: string;
    assetName: string;
  } | null>(null);

  const finalizeTrade = async () => {
    if (!tradeDetailsRef.current || !user) return;
    const { amount, seconds, symbol, side, entryPrice, assetShort, assetName } = tradeDetailsRef.current;
    
    // Determine win state based on admin control. Fetch freshest settings directly to bypass any lag
    let isWin = Math.random() > 0.5;
    try {
      const freshDoc = await getDoc(doc(db, "users", user.uid));
      if (freshDoc.exists()) {
        const freshData = freshDoc.data();
        if (freshData.tradeAction !== undefined) {
          isWin = freshData.tradeAction;
        }
      } else if (profile?.tradeAction !== undefined) {
        isWin = profile.tradeAction;
      }
    } catch (e) {
      console.warn("Failed to retrieve fresher tradeAction control, falling back to cached profile.", e);
      if (profile?.tradeAction !== undefined) {
        isWin = profile.tradeAction;
      }
    }

    // Get return percentage based on duration
    const durationObj = ASSET_DURATIONS.find(d => d.s === seconds);
    const returnPercent = durationObj ? durationObj.r / 100 : 0.05;
    
    // Loss percentage: 5% per 30s as requested
    const lossPercent = (seconds / 30) * 0.05;

    try {
      // Deduct the initial amount first (the investment)
      await updateDoc(doc(db, "users", user.uid), {
        balance: increment(-amount)
      });

      const finalAmount = isWin 
        ? (amount * (1 + returnPercent)) 
        : (amount * (1 - lossPercent));

      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        userEmail: user.email || "",
        type: "trade",
        amount: isWin ? finalAmount : amount * lossPercent,
        status: isWin ? "completed" : "failed",
        symbol: symbol,
        details: `${isWin ? "WIN" : "LOSS"} | Asset: ${symbol.split(":").pop()} | ${seconds}s Duration | ${isWin ? "Profit: " + (returnPercent * 100).toFixed(0) + "%" : "Loss: " + (lossPercent * 100).toFixed(0) + "%"}`,
        createdAt: serverTimestamp(),
      });

      // Return the finalAmount (Capital + Profit if Win, Capital - Partial Loss if Loss)
      await updateDoc(doc(db, "users", user.uid), {
        balance: increment(finalAmount)
      });

      const livePriceNum = parseFloat((marketData[symbol]?.price || "0").replace(/,/g, "")) || entryPrice;
      const basePrice = entryPrice > 0 ? entryPrice : livePriceNum;
      const moveFactor = 0.002 + Math.random() * 0.0025;
      const favorableUp = (side === "BUY" && isWin) || (side === "SELL" && !isWin);
      const computedExitPrice = basePrice > 0
        ? (favorableUp ? basePrice * (1 + moveFactor) : basePrice * (1 - moveFactor))
        : 0;
      const now = new Date();
      const formattedTimestamp = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}, ${now.toTimeString().slice(0, 8)}`;

      toast.dismiss("trade");
      setTradeResult({ 
        isWin, 
        amount, 
        profit: isWin ? (amount * returnPercent) : (amount * lossPercent),
        side,
        entryPrice: basePrice,
        exitPrice: computedExitPrice,
        duration: seconds,
        percentage: (isWin ? returnPercent : lossPercent) * 100,
        assetShort,
        assetName,
        timestamp: formattedTimestamp,
      });
      setShowTradeSuccess(true);
      
      if (isWin) {
        toast.success(
          <span className="text-slate-100">Congratulations! 🚀💰🎉 <span className="font-bold text-[#22C58B]">WIN</span></span>, 
          { 
            icon: <Trophy className="w-5 h-5 text-[#F5B400]" />,
            duration: 6000 
          }
        );
      } else {
        toast.error(
          <span className="text-slate-100">Sorry 📉😟⚠️ <span className="font-bold text-[#FB7185]">Loss</span></span>, 
          { 
            icon: <TrendingDown className="w-5 h-5 text-[#FB7185]" />,
            duration: 6000 
          }
        );
      }
      refreshProfile();
      setIsTrading(false);
      setTimeLeft(null);
      tradeDetailsRef.current = null;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "trade-sync");
      toast.dismiss("trade");
      toast.error("Trade synchronization failed");
      setIsTrading(false);
      setTimeLeft(null);
      tradeDetailsRef.current = null;
    } finally {
      setIsTrading(false);
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
    }, (error) => handleFirestoreError(error, OperationType.GET, "transactions"));

    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "addresses");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as PlatformSettings);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "settings/addresses");
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
    }, (error) => handleFirestoreError(error, OperationType.GET, "support_messages"));

    const newsQ = query(collection(db, "news"), orderBy("createdAt", "desc"));
    const newsUnsub = onSnapshot(newsQ, (snapshot) => {
      setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as News)));
    }, (error) => handleFirestoreError(error, OperationType.GET, "news"));

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
    const currentMarketPrice = parseFloat((marketData[selectedAsset.symbol]?.price || "0").replace(/,/g, "")) || 0;
    tradeDetailsRef.current = {
      amount,
      seconds: selectedDuration,
      symbol: selectedAsset.symbol,
      side: tradeSide,
      entryPrice: currentMarketPrice,
      assetShort: selectedAsset.short,
      assetName: selectedAsset.name,
    };
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
    } catch (error) {
      toast.error("Failed to send message: " + (error instanceof Error ? error.message : "Unknown error"));
      try {
        handleFirestoreError(error, OperationType.WRITE, "support_messages");
      } catch (e) {
        console.error("Support message sync error:", e);
      }
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
       const userRef = doc(db, "users", user.uid);
       const isNewProfile = !profile;
 
       if (isNewProfile) {
         // If user record doesn't exist, create it with all mandatory initial fields expected by the create rule
         const isAdminEmail = user.email === "habeshatilaye@gmail.com";
         await setDoc(userRef, {
           email: user.email || "",
           fullName: full_name,
           address: address_val,
           phoneNumber: phone_number,
           verificationDoc: verificationDoc,
           balance: 0,
           role: isAdminEmail ? "admin" : "user",
           createdAt: serverTimestamp(),
           verificationStatus: "pending",
           isVerified: false
         });
       } else {
         // Existing profile update
         await updateDoc(userRef, {
           fullName: full_name,
           phoneNumber: phone_number,
           address: address_val,
           verificationDoc: verificationDoc,
           verificationStatus: "pending"
         });
       }
       toast.success("Verification submitted for review!");
       setShowVerificationForm(false);
       refreshProfile();
     } catch (error) {
       toast.error("Failed to submit: " + (error instanceof Error ? error.message : "Unknown error"));
       try {
         handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
       } catch (e) {
         console.error("Verification submit sync error:", e);
       }
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

    if (!withdrawName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!withdrawAddress.trim()) {
      toast.error("Please enter a withdrawal address");
      return;
    }

    try {
      // Create the withdrawal transaction
      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        userEmail: user.email || "",
        userName: withdrawName.trim(),
        type: "withdraw",
        amount: amount,
        status: "pending",
        details: `Name: ${withdrawName.trim()} | Wallet: ${withdrawAddress.trim()} | Network: ${withdrawType}`,
        createdAt: serverTimestamp(),
      });

      // Automatically update the user profile fullName if it was not previously set
      if (profile && !profile.fullName) {
        await updateDoc(doc(db, "users", user.uid), {
          fullName: withdrawName.trim()
        });
      }

      setWithdrawAmount("");
      setWithdrawAddress("");
      setShowWithdrawModal(false);
      toast.success("Withdrawal request submitted");
      refreshProfile();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Withdrawal failed");
      try {
        handleFirestoreError(error, OperationType.WRITE, "transactions");
      } catch (e) {
        console.error("Withdrawal sync error:", e);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUploadFlow(file, setReceiptFile, "optRec", "Receipt uploaded successfully!");
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
        userEmail: user.email || "",
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
    } catch (error) {
      toast.error("Failed to submit: " + (error instanceof Error ? error.message : "Unknown error"));
      try {
        handleFirestoreError(error, OperationType.WRITE, "transactions");
      } catch (e) {
        console.error("Deposit submit sync error:", e);
      }
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  const getMarketAssets = () => {
    let assets: any[] = CRYPTO_ASSETS;
    switch (activeMarketTab) {
      case "forex": assets = FOREX_ASSETS; break;
      case "gold": assets = COMMODITY_ASSETS; break;
      case "stock": assets = STOCK_ASSETS; break;
      case "indices": assets = INDICES_ASSETS; break;
      case "future": assets = FUTURE_ASSETS; break;
      case "fund": assets = FUND_ASSETS; break;
      case "option": assets = OPTION_ASSETS; break;
      case "economy": assets = ECONOMY_ASSETS; break;
      case "bond": assets = BOND_ASSETS; break;
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
    } catch (error) {
      console.error(error);
      const errMessage = error instanceof Error ? error.message : "Password change failed";
      if ((error as any).code === 'auth/wrong-password') {
        toast.error("Incorrect current password");
      } else {
        toast.error("Password change failed: " + errMessage);
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const renderHome = () => (
    <div className="space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="px-2 sm:px-6 py-2 flex gap-4">
        <div className="flex-1 bg-[#131B2E] border border-white/[0.08] rounded-2xl flex items-center px-5 focus-within:ring-2 focus-within:ring-[#22C58B]/40 focus-within:border-[#22C58B]/60 transition-all shadow-lg">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input 
            type="text" 
            placeholder="Search all assets..." 
            className="bg-transparent border-none outline-none w-full py-4 text-sm font-medium text-white placeholder:text-slate-500" 
            value={marketSearch}
            onChange={(e) => setMarketSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Hero Banner */}
      <div className="mx-2 sm:mx-6 group relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#22C58B]/20 via-indigo-500/10 to-[#F59E0B]/20 rounded-[2rem] blur opacity-35 group-hover:opacity-55 transition duration-1000" />
        <div className="relative bg-[#131B2E] border border-white/[0.08] rounded-[2rem] p-8 sm:p-10 overflow-hidden min-h-[340px] flex flex-col justify-center shadow-2xl">
          <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
             <BarChart2 className="w-60 h-60 text-[#22C58B]" />
          </div>
          
          <div className="relative z-10 max-w-lg">
             <div className="inline-flex items-center gap-2 text-[#22C58B] text-xs font-bold uppercase tracking-widest mb-4">
                Live Market Analysis
             </div>
             <h2 className="text-4xl sm:text-5xl font-display font-black text-white mb-5 leading-tight tracking-tight">
                Global Financial <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22C58B] to-[#FBBF24] italic">Ecosystem</span>
             </h2>
             <p className="text-slate-400 font-medium mb-8 leading-relaxed">
                Connect to institutional liquidity pools with real-time analytics and lightning-fast execution on over 200+ instruments.
             </p>
             <button 
                onClick={() => setActiveTab("trading")}
                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-[#0B101D] font-extrabold rounded-2xl hover:brightness-110 transition-all active:scale-95 shadow-[0_6px_22px_rgba(245,158,11,0.3)]"
             >
                Launch Terminal <ChevronRight className="w-5 h-5" />
             </button>
          </div>

          <div className="absolute right-10 bottom-10 hidden lg:block">
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div 
                  key={i}
                  animate={{ height: [20, Math.random() * 55 + 35, 20] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                  className="w-1.5 bg-[#22C58B]/30 rounded-full"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-2 sm:mx-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <h3 className="text-xl font-display font-bold text-white flex items-center gap-3">
              <TrendingDown className="w-6 h-6 text-[#22C58B]" />
              Market Overview
           </h3>
           <div className="flex p-1 bg-[#131B2E] border border-white/[0.08] rounded-xl gap-1">
              {["crypto", "forex", "gold", "stock"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveMarketTab(tab as any)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                    activeMarketTab === tab ? "bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-[#0B101D] shadow-lg" : "text-slate-400 hover:text-white"
                  )}
                >
                  {tab}
                </button>
              ))}
           </div>
        </div>

        <div className="bg-[#131B2E] border border-white/[0.08] rounded-[1.75rem] overflow-hidden shadow-2xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#161F34]">
                <th className="text-left py-4 px-6 sm:px-8 text-xs font-semibold text-slate-400 uppercase tracking-wider">Instrument</th>
                <th className="text-right py-4 px-6 sm:px-8 text-xs font-semibold text-slate-400 uppercase tracking-wider">Price / 24h Change</th>
              </tr>
            </thead>
            <tbody>
              {getMarketAssets().slice(0, 15).map((asset) => (
                <tr 
                  key={asset.symbol} 
                  onClick={() => {
                    setSelectedAsset(asset);
                    setActiveTab("trading");
                  }}
                  className="border-b border-white/[0.06] last:border-0 hover:bg-[#1A233A] cursor-pointer transition-colors group"
                >
                  <td className="py-4 px-6 sm:px-8">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 overflow-hidden relative shadow-lg group-hover:scale-105 transition-transform", asset.color)}>
                        <span className="absolute inset-0 flex items-center justify-center text-sm">{asset.icon}</span>
                        {(asset as any).imageUrl && (
                          <img 
                            src={(asset as any).imageUrl} 
                            alt={asset.name} 
                            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.opacity = '0';
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-white text-base tracking-tight">{asset.name}</div>
                        <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{asset.short}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 sm:px-8 text-right">
                    <div className="flex flex-col items-end tabular-nums">
                      <div className="text-base font-mono font-bold text-white tracking-tight">
                        {marketData[asset.symbol]?.price || "0.00"}
                      </div>
                      <div className={cn(
                        "text-xs font-mono font-bold flex items-center gap-1 mt-0.5",
                        marketData[asset.symbol]?.isUp ? "text-[#22C58B]" : "text-[#FB7185]"
                      )}>
                        {marketData[asset.symbol]?.isUp ? "+" : ""}{marketData[asset.symbol]?.change || "0.00"}%
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 border-t border-white/[0.06] bg-[#101727]">
             <button 
                onClick={() => setActiveMarketTab("crypto")}
                className="w-full py-3 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-[#F5B400] transition-colors"
             >
                Explore Full Market Directory
             </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTrading = () => (
    <div className="space-y-6 pb-64 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div className="bg-[#131B2E] border border-white/[0.08] rounded-[1.75rem] p-6 sm:p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#22C58B]/10 rounded-full blur-3xl opacity-60 pointer-events-none" />
            <div className="relative z-10 flex justify-between items-center mb-6">
              <div className="space-y-1">
                <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Trading Balance</div>
                <div className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight tabular-nums">{formatCurrency(profile?.balance || 0)}</div>
              </div>
              <div className="text-right space-y-1">
                <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Account Status</div>
                <div className="text-xs font-bold text-[#22C58B] bg-[#0D2524] px-3.5 py-1.5 rounded-xl border border-[#22C58B]/30 inline-block">Active</div>
              </div>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab("personal")}
                className="flex-1 py-3.5 bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-110 text-[#0B101D] font-extrabold rounded-xl shadow-[0_6px_18px_rgba(245,158,11,0.28)] active:scale-95 transition-all uppercase tracking-wider text-xs"
              >
                Top Up Funds
              </button>
              <button 
                onClick={() => setActiveTradeSubTab(activeTradeSubTab === "positions" ? "history" : "positions")}
                className="px-6 py-3.5 bg-[#1A233A] hover:bg-[#222E4A] border border-white/10 rounded-xl text-white font-bold transition-all active:scale-95 text-xs uppercase tracking-wider"
              >
                {activeTradeSubTab === "positions" ? "View History" : "Back to Terminal"}
              </button>
            </div>
          </div>

          <div className="bg-[#131B2E] border border-white/[0.08] rounded-[1.75rem] overflow-hidden shadow-2xl">
            <div className="min-h-[500px]">
              {activeTradeSubTab === "positions" ? (
                <div className="p-6 sm:p-8">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg overflow-hidden relative", selectedAsset.color)}>
                        <span className="absolute inset-0 flex items-center justify-center text-lg">{(selectedAsset as any).icon}</span>
                        {(selectedAsset as any).imageUrl && (
                          <img 
                            src={(selectedAsset as any).imageUrl} 
                            alt={selectedAsset.name} 
                            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300" 
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.opacity = '0';
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <div className="font-display font-black text-white text-xl tracking-tight uppercase">{selectedAsset.short}/USDT</div>
                        <div className="text-xs text-[#22C58B] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-[#22C58B] rounded-full animate-pulse" />
                          Live Stream
                        </div>
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      <div className="text-2xl sm:text-3xl font-mono font-black text-white tracking-tight">
                        {marketData[selectedAsset.symbol]?.price || "0.00"}
                      </div>
                      <div className={cn(
                        "text-xs font-mono font-bold uppercase mt-1",
                        marketData[selectedAsset.symbol]?.isUp ? "text-[#22C58B]" : "text-[#FB7185]"
                      )}>
                        {marketData[selectedAsset.symbol]?.isUp ? "▲ +" : "▼ "}{marketData[selectedAsset.symbol]?.change || "0.00"}%
                      </div>
                    </div>
                  </div>
                  <div className="h-[400px] mb-6 rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0B101D]">
                    <TradingViewWidget symbol={selectedAsset.symbol} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setShowOptionModal(true)}
                      className="py-4 bg-[#0D2524] hover:bg-[#123331] border border-[#22C58B]/40 text-[#22C58B] font-extrabold rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-wider text-xs"
                    >
                      Instant Buy
                    </button>
                    <button 
                      onClick={() => setShowOptionModal(true)}
                      className="py-4 bg-[#26131C] hover:bg-[#331926] border border-[#F43F5E]/40 text-[#FB7185] font-extrabold rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-wider text-xs"
                    >
                      Instant Sell
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-3">
                  {transactions.filter(t => t.type === "trade").length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-28 text-slate-400">
                      <FileText className="w-14 h-14 mb-4 opacity-30" />
                      <span className="text-xs font-bold uppercase tracking-widest">No Trade History Yet</span>
                    </div>
                  ) : (
                    transactions.filter(t => t.type === "trade").map((tx) => (
                      <div key={tx.id} className="bg-[#1A233A]/80 p-5 rounded-2xl border border-white/[0.07] flex items-center justify-between group hover:bg-[#1E2942] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-11 h-11 rounded-xl flex items-center justify-center font-bold border",
                            tx.details?.includes("WIN") ? "bg-[#0D2524] border-[#22C58B]/25 text-[#22C58B]" : "bg-[#26131C] border-[#F43F5E]/25 text-[#FB7185]"
                          )}>
                            {tx.details?.includes("WIN") ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="font-display font-bold text-white text-base">{tx.symbol?.split(":").pop() || "Trade"}</div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5">
                              {tx.createdAt?.toDate?.()?.toLocaleString() || "Pending..." }
                            </div>
                          </div>
                        </div>
                        <div className="text-right tabular-nums">
                          <div className={cn(
                            "font-mono font-bold text-base",
                            tx.details?.includes("WIN") ? "text-[#22C58B]" : "text-[#FB7185]"
                          )}>
                            {tx.details?.includes("WIN") ? "+" : "-"}{formatCurrency(tx.amount)}
                          </div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
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

        <div className="lg:w-96 space-y-6">
          <div className="bg-[#131B2E] border border-white/[0.08] rounded-[1.75rem] p-6 h-full shadow-2xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Live Assets</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto no-scrollbar">
               {getMarketAssets().map(asset => (
                 <div 
                  key={asset.symbol}
                  onClick={() => setSelectedAsset(asset)}
                  className={cn(
                    "p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group",
                    selectedAsset.symbol === asset.symbol ? "bg-[#1A233A] border-[#F5B400]/50 shadow-md" : "bg-[#0F1629] border-white/[0.05] hover:bg-[#1A233A]"
                  )}
                 >
                    <div className="flex items-center gap-3">
                       <div className={cn("w-10 h-10 rounded-xl overflow-hidden relative", asset.color)}>
                          <span className="absolute inset-0 flex items-center justify-center font-bold text-white text-xs">{asset.icon}</span>
                       </div>
                       <div>
                          <div className="text-sm font-bold text-white">{asset.short}</div>
                          <div className="text-xs text-slate-400">{asset.name}</div>
                       </div>
                    </div>
                    <div className="text-right tabular-nums">
                       <div className="text-sm font-mono font-bold text-white">{marketData[asset.symbol]?.price || "0.00"}</div>
                       <div className={cn("text-xs font-mono font-semibold", marketData[asset.symbol]?.isUp ? "text-[#22C58B]" : "text-[#FB7185]")}>
                          {marketData[asset.symbol]?.change || "0.00"}%
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNews = () => (
    <div className="space-y-8 pb-64 animate-in fade-in duration-500">
       <div className="mx-2 sm:mx-4">
          <div className="bg-[#131B2E] border border-[#22C58B]/20 p-4 rounded-2xl text-[#22C58B] font-display font-bold uppercase tracking-[0.25em] text-xs text-center mb-8">
            Financial Intelligence Hub
          </div>
          
          <div className="space-y-8">
            {news.length > 0 && (
              <div className="relative aspect-[21/9] rounded-[2rem] overflow-hidden group shadow-2xl border border-white/[0.08] bg-[#131B2E]">
                <img 
                  src={news[0].imageUrl || "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=70&w=800"} 
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-[3s]" 
                  alt="Main News"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B101D] via-[#0B101D]/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-10">
                  <div className="flex items-center gap-3 mb-3 text-xs font-semibold">
                    <span className="text-[#F5B400] uppercase tracking-wider">Top Analysis</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300 font-mono">{news[0].createdAt?.toDate?.()?.toLocaleDateString()}</span>
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-display font-black text-white leading-tight mb-3 line-clamp-2">{news[0].title}</h2>
                  <p className="text-slate-300 font-medium line-clamp-2 max-w-2xl">{news[0].summary}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.length === 0 ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="bg-[#131B2E] border border-white/[0.08] p-6 rounded-3xl flex gap-4 animate-pulse">
                    <div className="w-20 h-20 bg-[#1A233A] rounded-2xl shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-[#1A233A] rounded w-3/4" />
                      <div className="h-3 bg-[#1A233A] rounded w-full" />
                    </div>
                  </div>
                ))
              ) : (
                news.slice(1).map((item) => (
                  <div key={item.id} className="bg-[#131B2E] border border-white/[0.08] p-6 rounded-3xl flex gap-4 group hover:bg-[#1A233A] transition-all overflow-hidden">
                    {item.imageUrl && (
                      <div className="w-20 h-20 bg-[#0B101D] rounded-2xl shrink-0 overflow-hidden relative">
                        <img src={item.imageUrl} referrerPolicy="no-referrer" alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      </div>
                    )}
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      <h3 className="font-display font-bold text-white line-clamp-2 leading-snug text-sm group-hover:text-[#22C58B] transition-colors">{item.title}</h3>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/[0.06] text-slate-400 font-mono text-xs">
                        <span>{item.createdAt?.toDate?.()?.toLocaleDateString()}</span>
                        <ChevronRight className="w-4 h-4 group-hover:text-[#22C58B] group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
       </div>
    </div>
  );

  const renderPersonal = () => (
    <div className="space-y-8 pb-64 animate-in fade-in duration-500">
      <div className="relative bg-[#131B2E] border border-white/[0.08] rounded-[2rem] overflow-hidden p-8 sm:p-10 mx-2 sm:mx-4 shadow-2xl">
        <div className="absolute top-0 right-0 p-20 opacity-10 blur-3xl rounded-full bg-[#22C58B] -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="w-24 h-24 rounded-full border-2 border-[#22C58B] p-1 bg-[#1A233A] shadow-[0_0_24px_rgba(34,197,139,0.2)]">
            <div className="w-full h-full rounded-full bg-[#0F1629] flex items-center justify-center font-display font-black text-3xl text-white">
              {profile?.fullName?.slice(0, 1).toUpperCase() || user.email?.slice(0, 1).toUpperCase()}
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl sm:text-4xl font-display font-black text-white mb-2 tracking-tight">{profile?.fullName || "Gammix Trader"}</h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs font-semibold">
               <span className="text-slate-400 font-mono">Node ID: {user?.uid.slice(0, 12)}</span>
               <span className="text-slate-600">·</span>
               <span className={cn(
                  "uppercase tracking-wider",
                  profile?.verificationStatus === "verified" ? "text-[#22C58B]" :
                  profile?.verificationStatus === "pending" ? "text-[#F5B400]" :
                  "text-slate-400"
               )}>
                  {profile?.verificationStatus || "Unverified"}
               </span>
            </div>
          </div>

          <div className="text-center md:text-right">
             <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1 font-mono">Portfolio Value</div>
             <div className="text-4xl sm:text-5xl font-display font-black text-[#22C58B] tracking-tight tabular-nums">{formatCurrency(profile?.balance || 0)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-10 pt-8 border-t border-white/[0.08] relative z-10">
          <button 
            onClick={() => setShowWithdrawModal(true)}
            className="flex items-center justify-center gap-3 py-4 bg-[#1A233A] hover:bg-[#222E4A] border border-white/10 text-white font-bold uppercase tracking-wider text-xs rounded-2xl transition-all active:scale-95"
          >
            <ArrowUpCircle className="w-5 h-5 text-[#FB7185]" /> Withdraw Capital
          </button>
          <button 
            onClick={() => setShowDepositModal(true)}
            className="flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-110 text-[#0B101D] font-extrabold uppercase tracking-wider text-xs rounded-2xl shadow-[0_6px_20px_rgba(245,158,11,0.28)] active:scale-95 transition-all"
          >
            <ArrowDownCircle className="w-5 h-5" /> Deposit Funds
          </button>
        </div>
      </div>

      <div className="mx-2 sm:mx-4 space-y-6">
        {profile?.verificationStatus === "pending" && (
          <div className="p-6 rounded-2xl border border-[#F5B400]/30 bg-[#272010]/60">
            <div className="flex items-center gap-3 text-[#F5B400]">
              <Clock className="w-5 h-5" />
              <p className="text-xs font-bold uppercase tracking-wider">Verification Pending</p>
            </div>
            <p className="text-xs text-slate-300 mt-2 font-medium">Your credentials have been submitted for review. This typically takes 24-48 business hours.</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#131B2E] border border-white/[0.08] rounded-[1.75rem] p-6 sm:p-8 shadow-xl">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Security & Identity</h3>
             <div className="space-y-3">
                {(!profile?.verificationStatus || profile?.verificationStatus === "rejected" || profile?.verificationStatus === "unsubmitted") && (
                  <button 
                    onClick={() => {
                      setFullName(profile?.fullName || "");
                      setPhoneNumber(profile?.phoneNumber || "");
                      setAddressVal(profile?.address || "");
                      setVerificationDoc(profile?.verificationDoc || null);
                      setShowVerificationForm(true);
                    }}
                    className="w-full p-5 bg-[#1A233A] rounded-2xl flex items-center justify-between group hover:bg-[#222E4A] transition-all text-left border border-white/[0.06]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-[#272010] border border-[#F5B400]/25 flex items-center justify-center text-[#F5B400]">
                         <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                         <div className="font-bold text-white text-sm">Verify Identity</div>
                         <div className="text-xs text-slate-400 font-medium">Unlock full platform capabilities</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
                
                <button 
                  onClick={() => setShowChangePasswordModal(true)}
                  className="w-full p-5 bg-[#1A233A] rounded-2xl flex items-center justify-between group hover:bg-[#222E4A] transition-all text-left border border-white/[0.06]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[#0D2524] border border-[#22C58B]/25 flex items-center justify-center text-[#22C58B]">
                       <Lock className="w-5 h-5" />
                    </div>
                    <div>
                       <div className="font-bold text-white text-sm">Change Password</div>
                       <div className="text-xs text-slate-400 font-medium">Update account security credentials</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </button>
             </div>
          </div>

          <div className="bg-[#131B2E] border border-white/[0.08] rounded-[1.75rem] p-6 sm:p-8 shadow-xl">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Account Terminal</h3>
             <div className="space-y-3">
                <button 
                  onClick={() => { setActiveTab("trading"); setActiveTradeSubTab("history"); }}
                  className="w-full p-5 bg-[#1A233A] rounded-2xl flex items-center justify-between group hover:bg-[#222E4A] transition-all text-left border border-white/[0.06]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[#1E2942] border border-white/10 flex items-center justify-center text-[#F5B400]">
                       <Clock className="w-5 h-5" />
                    </div>
                    <div>
                       <div className="font-bold text-white text-sm">Execution Logs</div>
                       <div className="text-xs text-slate-400 font-medium">Review your historical data</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  onClick={() => setShowChat(true)}
                  className="w-full p-5 bg-[#1A233A] rounded-2xl flex items-center justify-between group hover:bg-[#222E4A] transition-all text-left border border-white/[0.06]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[#0D2524] border border-[#22C58B]/25 flex items-center justify-center text-[#22C58B]">
                       <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                       <div className="font-bold text-white text-sm">Direct Protocol Support</div>
                       <div className="text-xs text-slate-400 font-medium">Instant 24/7 priority pipeline</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  onClick={() => auth.signOut()}
                  className="w-full p-4 bg-[#26131C] rounded-2xl flex items-center justify-center gap-2 group hover:bg-[#331926] transition-all border border-[#F43F5E]/25 mt-2"
                >
                  <LogOut className="w-5 h-5 text-[#FB7185]" />
                  <span className="text-xs font-bold text-[#FB7185] uppercase tracking-wider">Sign Out</span>
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B101D] text-slate-100 font-sans selection:bg-[#22C58B]/30 overflow-x-hidden relative">
      <div className="flex-1 flex flex-col pb-40">
        <main className="max-w-[1400px] mx-auto w-full px-3 sm:px-6 lg:px-8 py-6 sm:py-10">
          {activeTab === "home" && renderHome()}
          {activeTab === "trading" && renderTrading()}
          {activeTab === "news" && renderNews()}
          {activeTab === "personal" && renderPersonal()}
        </main>
      </div>

      {/* Bottom Navigation (Reference-matched Midnight Dock with Coral-Purple Active Glow) */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0F1629]/95 backdrop-blur-2xl border-t border-white/[0.08] z-[40] pb-safe">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 py-2.5">
          {[
            { id: "home", icon: Home, label: "Home" },
            { id: "trading", icon: BarChart2, label: "Market" },
            { id: "news", icon: Bell, label: "News" },
            { id: "personal", icon: UserIcon, label: "You" },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-1 px-3 transition-all duration-200 active:scale-90 min-w-[60px]",
                  isActive ? "text-[#FB7185]" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <div className={cn(
                  "w-11 h-10 rounded-2xl flex items-center justify-center transition-all duration-200",
                  isActive ? "nav-active-gradient text-white" : "bg-[#182238]/75 text-slate-400"
                )}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className={cn("text-[11px] font-semibold tracking-tight", isActive ? "text-[#FB7185]" : "text-slate-400")}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showChangePasswordModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowChangePasswordModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.92, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[#131B2E] border border-white/[0.1] rounded-3xl overflow-hidden shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-display font-bold text-white tracking-tight">Change Password</h3>
                <button onClick={() => setShowChangePasswordModal(false)} className="p-1.5 hover:bg-[#1A233A] rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-5">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 ml-1">Current Password</label>
                  <input 
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#0B101D] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-[#22C58B]/30 focus:border-[#22C58B] outline-none transition-all placeholder:text-slate-600 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 ml-1">New Password</label>
                  <input 
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full bg-[#0B101D] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-[#22C58B]/30 focus:border-[#22C58B] outline-none transition-all placeholder:text-slate-600 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 ml-1">Confirm New Password</label>
                  <input 
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full bg-[#0B101D] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-[#22C58B]/30 focus:border-[#22C58B] outline-none transition-all placeholder:text-slate-600 font-medium"
                  />
                </div>

                <div className="flex justify-end pt-3">
                  <button 
                    type="submit"
                    disabled={isChangingPassword}
                    className="w-full py-3.5 bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-110 disabled:opacity-50 text-[#0B101D] font-extrabold rounded-xl shadow-lg active:scale-95 transition-all text-xs uppercase tracking-wider"
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
              className="absolute inset-0 bg-[#0B101D]/92 backdrop-blur-md"
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
                    className="text-[#F5B400]"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl font-mono font-black text-white tabular-nums">{timeLeft}</span>
                </div>
              </div>
              <h2 className="text-2xl font-display font-black text-white uppercase tracking-[0.2em] mb-2">Trade in Progress</h2>
              <p className="text-slate-400 font-semibold uppercase tracking-widest text-xs">Waiting for market result...</p>
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
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0 }}
              className="relative w-full max-w-lg bg-[#131B2E] border border-white/[0.1] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 overflow-y-auto max-h-[85vh]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-display font-bold text-white">Deposit</h3>
                  <button onClick={() => setShowDepositModal(false)} className="p-1.5 hover:bg-[#1A233A] rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">Choice of Token</label>
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
                            "py-2.5 px-2 rounded-xl text-xs font-bold transition-all border",
                            selectedDepositCoin === coin.id 
                              ? "bg-[#0D2524] border-[#22C58B] text-[#22C58B] shadow-sm" 
                              : "bg-[#1A233A] border-white/[0.06] text-slate-400 hover:text-white"
                          )}
                        >
                          {coin.name}
                        </button>
                      ))}
                    </div>

                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Deposit Address</label>
                    <div className="bg-[#0B101D] border border-white/10 rounded-2xl p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-bold text-white uppercase">
                          {selectedDepositCoin.replace("_address", "").toUpperCase()} Address
                        </span>
                        <div className="flex items-center gap-1 text-slate-400">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-xs text-slate-200 break-all leading-relaxed font-mono bg-[#131B2E] p-3 rounded-xl border border-white/[0.06] mb-3 select-all">
                        {settings?.[selectedDepositCoin] || `No ${selectedDepositCoin.replace("_address", "").toUpperCase()} address set`}
                      </div>
                      <button 
                        onClick={() => copyToClipboard(settings?.[selectedDepositCoin] || "")}
                        className="w-full py-2.5 bg-[#0D2524] border border-[#22C58B]/30 text-[#22C58B] font-bold text-xs rounded-xl hover:bg-[#123331] transition-colors flex items-center justify-center gap-2"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy Address
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Quantity</label>
                    <input 
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-[#0B101D] border border-white/10 rounded-xl px-4 py-3 text-base text-white focus:ring-2 focus:ring-[#22C58B]/30 focus:border-[#22C58B] outline-none transition-all placeholder:text-slate-600 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Deposit Receipt Upload</label>
                    <div className="relative">
                      <input 
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className={cn(
                        "w-full border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all min-h-[150px]",
                        receiptFile ? "border-[#22C58B]/50 bg-[#0D2524]" : "border-white/15 bg-[#0B101D] hover:border-white/30"
                      )}>
                        {receiptFile ? (
                          <img src={receiptFile} referrerPolicy="no-referrer" className="max-h-24 rounded object-contain" alt="Preview" />
                        ) : (
                          <>
                            <Upload className="w-9 h-9 text-slate-500 mb-3" />
                            <div className="text-sm font-bold text-white mb-1">
                              Upload a file <span className="font-normal text-slate-400">or drag and drop</span>
                            </div>
                            <span className="text-xs text-slate-500">PNG, JPG, PDF up to 15MB</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSubmitDeposit}
                className="w-full py-4 bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-110 text-[#0B101D] font-extrabold text-sm active:opacity-90 transition-all uppercase tracking-wider"
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
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0 }}
              className="relative w-full max-w-lg bg-[#131B2E] border border-white/[0.1] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 pb-10 overflow-y-auto max-h-[85vh]">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#272010] border border-[#F5B400]/30 rounded-xl flex items-center justify-center text-[#F5B400]">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-white">Personal Information</h3>
                  </div>
                  <button onClick={() => setShowVerificationForm(false)} className="p-1.5 hover:bg-[#1A233A] rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Full Name</label>
                    <input 
                      type="text"
                      value={full_name}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full bg-[#0B101D] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-[#22C58B]/30 focus:border-[#22C58B] outline-none transition-all placeholder:text-slate-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Phone Number</label>
                    <input 
                      type="tel"
                      value={phone_number}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Enter your phone number"
                      className="w-full bg-[#0B101D] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-[#22C58B]/30 focus:border-[#22C58B] outline-none transition-all placeholder:text-slate-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Residential Address</label>
                    <textarea 
                      value={address_val}
                      onChange={(e) => setAddressVal(e.target.value)}
                      placeholder="Enter your full address"
                      rows={2}
                      className="w-full bg-[#0B101D] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-[#22C58B]/30 focus:border-[#22C58B] outline-none transition-all placeholder:text-slate-600 font-medium resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">ID / Passport / Driving License</label>
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
                            ? "bg-[#0D2524] border-[#22C58B]/50 text-[#22C58B]" 
                            : "bg-[#0B101D] border-white/15 text-slate-400 hover:border-white/30"
                        )}
                      >
                        {verificationDoc ? (
                          <div className="flex flex-col items-center gap-2">
                            <ShieldCheck className="w-8 h-8 text-[#22C58B]" />
                            <span className="text-sm font-bold">Document Selected</span>
                            <span className="text-[11px] uppercase font-semibold tracking-wider opacity-75">Click to change</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-8 h-8 text-slate-500" />
                            <span className="text-sm font-bold text-white">Upload Document</span>
                            <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-500">JPG, PNG or PDF (Max 15MB)</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <button 
                    onClick={handleSubmitVerification}
                    disabled={isSubmittingVerification}
                    className="w-full py-4 bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-110 disabled:opacity-50 text-[#0B101D] font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-lg active:scale-[0.98] transition-all mt-2"
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
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0 }}
              className="relative w-full max-w-lg bg-[#131B2E] border border-white/[0.1] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 pb-10 overflow-y-auto max-h-[85vh]">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#26131C] border border-[#F43F5E]/30 rounded-xl flex items-center justify-center text-[#FB7185]">
                      <ArrowUpCircle className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-white">Withdraw Funds</h3>
                  </div>
                  <button onClick={() => setShowWithdrawModal(false)} className="p-1.5 hover:bg-[#1A233A] rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Full Name</label>
                    <input 
                      type="text"
                      value={withdrawName}
                      onChange={(e) => setWithdrawName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full bg-[#0B101D] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-[#22C58B]/30 focus:border-[#22C58B] outline-none transition-all placeholder:text-slate-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Withdraw Type</label>
                    <div className="relative">
                      <select
                        value={withdrawType}
                        onChange={(e) => setWithdrawType(e.target.value)}
                        className="w-full bg-[#0B101D] border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-[#22C58B]/30 focus:border-[#22C58B] outline-none appearance-none transition-all font-medium text-white pr-12"
                      >
                        <option value="USDT (ERC20)">USDT (ERC20)</option>
                        <option value="USDT (TRC20)">USDT (TRC20)</option>
                        <option value="Bitcoin (BTC)">Bitcoin (BTC)</option>
                        <option value="Ethereum (ETH)">Ethereum (ETH)</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Withdrawal Address</label>
                    <input 
                      type="text"
                      value={withdrawAddress}
                      onChange={(e) => setWithdrawAddress(e.target.value)}
                      placeholder="Enter your wallet address"
                      className="w-full bg-[#0B101D] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white font-mono focus:ring-2 focus:ring-[#22C58B]/30 focus:border-[#22C58B] outline-none transition-all placeholder:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Amount</label>
                    <input 
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-[#0B101D] border border-white/10 rounded-xl px-4 py-3.5 text-base text-white font-mono font-bold focus:ring-2 focus:ring-[#22C58B]/30 focus:border-[#22C58B] outline-none transition-all placeholder:text-slate-600"
                    />
                  </div>

                  <button 
                    onClick={handleWithdraw}
                    className="w-full py-4 bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-110 text-[#0B101D] font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-lg active:scale-[0.98] transition-all mt-2"
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
        {showOptionModal && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowOptionModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-[#131B2E] border-t border-x border-white/[0.1] rounded-t-3xl overflow-hidden shadow-2xl p-6"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold", selectedAsset.color)}>
                  {selectedAsset.icon}
                </div>
                <button onClick={() => setShowOptionModal(false)} className="p-1.5 hover:bg-[#1A233A] rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="mb-6 text-center tabular-nums">
                <div className={cn(
                  "text-4xl font-mono font-black flex items-baseline justify-center gap-1",
                  marketData[selectedAsset.symbol]?.isUp ? "text-[#22C58B]" : "text-[#FB7185]"
                )}>
                   {marketData[selectedAsset.symbol]?.price?.split(".")[0] || "0"}
                   <span className="text-xl font-medium">
                     {marketData[selectedAsset.symbol]?.price?.includes(".") ? "." + marketData[selectedAsset.symbol].price.split(".")[1] : ""}
                   </span>
                   <span className="text-sm font-bold text-slate-400 ml-1">
                     {Math.floor(Math.random() * 9)}
                   </span>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Time</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {ASSET_DURATIONS.map((dur) => {
                      const isSelected = selectedDuration === dur.s;
                      return (
                        <button
                          key={dur.s}
                          onClick={() => setSelectedDuration(dur.s)}
                          className={cn(
                            "py-3 rounded-xl border transition-all text-center",
                            isSelected
                              ? `${dur.activeClass} scale-[1.02]`
                              : dur.idleClass
                          )}
                        >
                          <div className="text-sm font-mono font-black">{dur.s}s</div>
                          <div className={cn("text-[11px] font-semibold", isSelected ? dur.subActiveClass : dur.subIdleClass)}>
                            Return {dur.r}%
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trade Value (USDT)</label>
                      <span className="text-[11px] font-bold text-[#F5B400]">LIMIT: 100 - 100K</span>
                    </div>
                    <span className="text-xs font-bold text-slate-400 tabular-nums">
                      Expected Profit: <span className="text-[#22C58B] font-mono">
                        +{(
                          (parseFloat(tradeAmount) || 0) * 
                          ((ASSET_DURATIONS.find(d => d.s === selectedDuration)?.r || 5) / 100)
                        ).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                      </span>
                    </span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[#0B101D] border border-white/10 rounded-xl px-5 py-4 text-white font-black text-lg focus:ring-2 focus:ring-[#22C58B]/30 focus:border-[#22C58B] outline-none transition-all font-mono placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-400 tabular-nums">
                  <div className="flex items-center gap-2">
                    <span className="text-[#22C58B] font-black">$</span>
                    Portfolio: {formatCurrency(profile?.balance || 0)} 
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-20">
                  <button 
                    onClick={() => { setTradeSide("BUY"); setShowOptionModal(false); setShowTradeConfirm(true); }}
                    className="py-4 bg-[#22C58B] hover:brightness-110 text-[#0B101D] font-extrabold rounded-2xl shadow-lg active:scale-95 transition-all text-sm uppercase tracking-wider"
                  >
                    Buy / Long
                  </button>
                  <button 
                    onClick={() => { setTradeSide("SELL"); setShowOptionModal(false); setShowTradeConfirm(true); }}
                    className="py-4 bg-[#F43F5E] hover:brightness-110 text-white font-extrabold rounded-2xl shadow-lg active:scale-95 transition-all text-sm uppercase tracking-wider"
                  >
                    Sell / Short
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
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[#131B2E] border border-white/[0.1] rounded-3xl overflow-hidden shadow-2xl p-8"
            >
              <h3 className="text-2xl font-display font-bold text-white mb-2">Confirm Order</h3>
              <p className="text-slate-400 mb-6 font-medium text-sm">Are you sure you want to execute this trade on {selectedAsset.short}?</p>
              
              <div className="space-y-3 mb-8 bg-[#0B101D] border border-white/[0.06] p-5 rounded-2xl tabular-nums">
                 <div className="flex justify-between font-bold text-sm">
                    <span className="text-slate-400">Amount</span>
                    <span className="text-white font-mono">{formatCurrency(parseFloat(tradeAmount) || 0)}</span>
                 </div>
                 <div className="flex justify-between font-bold text-sm">
                    <span className="text-slate-400">Duration</span>
                    <span className="text-[#F5B400] font-mono">{selectedDuration}s</span>
                 </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowTradeConfirm(false)}
                  className="flex-1 py-3.5 bg-[#1A233A] hover:bg-[#222E4A] text-slate-200 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  onClick={handlePlaceTrade}
                  className="flex-1 py-3.5 bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-110 text-[#0B101D] font-extrabold rounded-xl shadow-lg active:scale-95 transition-all text-xs uppercase tracking-wider"
                >
                  Execute Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Trade Result Modal — Modeled on the reference Trade Details popup */}
      <AnimatePresence>
        {showTradeSuccess && tradeResult && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowTradeSuccess(false)}
              className="absolute inset-0 bg-[#0B101D]/85 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.92, opacity: 0, y: 30 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.92, opacity: 0, y: 30 }}
              className="relative w-full max-w-[360px] max-h-[90vh] overflow-y-auto bg-[#131B2E] border border-white/[0.08] rounded-3xl shadow-2xl p-5"
            >
              {/* Top Asset & Timestamp Row */}
              <div className="flex items-center gap-3.5 mb-5">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0",
                  tradeResult.isWin
                    ? "bg-[#0D2524] border-[#22C58B]/20 text-[#22C58B]"
                    : "bg-[#26131C] border-[#F43F5E]/20 text-[#FB7185]"
                )}>
                  {tradeResult.isWin ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {tradeResult.assetShort}USDT • {tradeResult.side}
                  </div>
                  <div className="text-sm font-medium text-white tabular-nums mt-0.5">
                    {tradeResult.timestamp}
                  </div>
                </div>
              </div>

              {/* Inner Profit / Loss Summary Pill Card */}
              <div className={cn(
                "rounded-2xl py-4 px-5 mb-5 text-center tabular-nums border",
                tradeResult.isWin ? "bg-[#0D2524] border-[#22C58B]/15" : "bg-[#26131C] border-[#F43F5E]/15"
              )}>
                <div className="text-xl font-bold tracking-tight">
                  <span className={tradeResult.isWin ? "text-[#22C58B]" : "text-[#FB7185]"}>
                    {tradeResult.isWin ? "+" : "-"}{tradeResult.profit.toFixed(2)}
                  </span>{" "}
                  <span className="text-white">USDT</span>
                </div>
                <div className={cn("text-sm font-bold mt-1", tradeResult.isWin ? "text-[#22C58B]" : "text-[#FB7185]")}>
                  {tradeResult.isWin ? "+" : "-"}{tradeResult.percentage.toFixed(2)}%
                </div>
              </div>

              {/* Structured Trade Details Card */}
              <div className="bg-[#161F34] border border-white/[0.06] rounded-2xl p-5 mb-5 space-y-3.5 tabular-nums">
                <div className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                  {tradeResult.assetName.toUpperCase()} TRADE DETAILS
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Trade Amount</span>
                  <span className="text-white font-semibold">${tradeResult.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">{tradeResult.isWin ? "Profit" : "Loss"}</span>
                  <span className={cn("font-semibold", tradeResult.isWin ? "text-[#22C58B]" : "text-[#FB7185]")}>
                    {tradeResult.isWin ? "+$" : "-$"}{tradeResult.profit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Entry Price</span>
                  <span className="text-white font-semibold">
                    ${tradeResult.entryPrice < 1 && tradeResult.entryPrice > 0 ? tradeResult.entryPrice.toFixed(6) : tradeResult.entryPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Exit Price</span>
                  <span className="text-white font-semibold">
                    ${tradeResult.exitPrice < 1 && tradeResult.exitPrice > 0 ? tradeResult.exitPrice.toFixed(6) : tradeResult.exitPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Duration</span>
                  <span className="text-[#F5B400] font-semibold">{tradeResult.duration}s</span>
                </div>
                <div className="pt-3.5 border-t border-white/[0.08] flex justify-between items-center">
                  <span className="text-white font-bold text-sm">Total Return</span>
                  <span className={cn("font-bold text-base", tradeResult.isWin ? "text-[#22C58B]" : "text-[#FB7185]")}>
                    ${(
                      tradeResult.isWin
                        ? tradeResult.amount + tradeResult.profit
                        : Math.max(0, tradeResult.amount - tradeResult.profit)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setShowTradeSuccess(false)}
                className="w-full py-3.5 bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-110 text-[#0B101D] font-extrabold rounded-2xl shadow-[0_6px_20px_rgba(245,158,11,0.3)] active:scale-95 transition-all text-sm uppercase tracking-wider"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChat && (
          <div className="fixed inset-0 z-[60] flex flex-col bg-[#0B101D]">
            <div className="p-5 border-b border-white/[0.08] bg-[#0F1629] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-[#0D2524] border border-[#22C58B]/30 rounded-2xl flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-[#22C58B]" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-white tracking-tight">VIP Portal</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-2 h-2 bg-[#22C58B] rounded-full animate-pulse" />
                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Gammix Agent Online</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowChat(false)} className="p-2 text-slate-400 hover:text-white hover:bg-[#1A233A] rounded-full transition-all"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 bg-[#0B101D]">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex flex-col max-w-[85%]", msg.senderId === user.uid ? "ml-auto items-end" : "mr-auto items-start")}>
                  <div className={cn("p-4 rounded-2xl text-sm font-medium shadow-sm", msg.senderId === user.uid ? "bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-[#0B101D] font-semibold rounded-br-none" : "bg-[#131B2E] text-white border border-white/[0.08] rounded-bl-none")}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-white/[0.08] bg-[#0F1629]">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Message support..." 
                  className="flex-1 bg-[#0B101D] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-medium focus:ring-2 focus:ring-[#22C58B]/30 focus:border-[#22C58B] outline-none transition-all placeholder:text-slate-600" 
                />
                <button 
                  type="button"
                  onClick={handleSendMessage}
                  disabled={isSending || !newMessage.trim()}
                  className="bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-110 disabled:opacity-50 text-[#0B101D] p-4 rounded-2xl transform active:scale-95 transition-all shadow-lg"
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
