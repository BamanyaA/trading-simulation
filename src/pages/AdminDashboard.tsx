import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  getDoc, 
  setDoc,
  deleteDoc,
  where,
  increment,
  serverTimestamp,
  addDoc
} from "firebase/firestore";
import { UserProfile, Transaction, PlatformSettings, SupportMessage, News } from "../types";
import { 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Bitcoin, 
  ShieldCheck, 
  Save, 
  Search,
  TrendingUp,
  CheckCircle2,
  MessageSquare,
  Send,
  User,
  FileText,
  X,
  MapPin,
  Phone,
  Trash2
} from "lucide-react";
import { toast } from "react-hot-toast";
import { formatCurrency, cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [pendingTxs, setPendingTxs] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>({
    btc_address: "",
    eth_address: "",
    sol_address: "",
    bnb_address: "",
    xrp_address: "",
    usdt_address: ""
  });
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "transactions" | "settings" | "support" | "news">("users");
  const [txFilter, setTxFilter] = useState<"pending" | "all">("pending");
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [selectedUserKYC, setSelectedUserKYC] = useState<UserProfile | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "user" | "news", id: string, name: string } | null>(null);

  // Chat states
  const [allMessages, setAllMessages] = useState<SupportMessage[]>([]);
  const [selectedUserChat, setSelectedUserChat] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);

  // News states
  const [newsList, setNewsList] = useState<News[]>([]);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsSummary, setNewsSummary] = useState("");
  const [newsContent, setNewsContent] = useState("");
  const [newsImageUrl, setNewsImageUrl] = useState<string | null>(null);
  const [isPostingNews, setIsPostingNews] = useState(false);

  useEffect(() => {
    // Listen to users
    const usersUnsub = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
    });

    // Listen to transactions
    const txQuery = txFilter === "pending" 
      ? query(collection(db, "transactions"), where("status", "==", "pending"))
      : query(collection(db, "transactions"), orderBy("createdAt", "desc"));
      
    const txUnsub = onSnapshot(txQuery, (snapshot) => {
      setPendingTxs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });

    // Fetch settings
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, "settings", "addresses"));
        if (docSnap.exists()) {
          setSettings(docSnap.data() as PlatformSettings);
        }
      } catch (e) {
        console.error("Settings fetch failed", e);
      }
    };

    fetchSettings();

    // Listen to ALL support messages
    const chatQ = query(collection(db, "support_messages"), orderBy("createdAt", "asc"));
    const chatUnsub = onSnapshot(chatQ, (snapshot) => {
      setAllMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportMessage)));
    });

    // Listen to news
    const newsQ = query(collection(db, "news"), orderBy("createdAt", "desc"));
    const newsUnsub = onSnapshot(newsQ, (snapshot) => {
      setNewsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as News)));
    });

    return () => {
      usersUnsub();
      txUnsub();
      chatUnsub();
      newsUnsub();
    };
  }, [txFilter]);

  const handleUpdateBalance = async (userId: string, delta: number) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        balance: increment(delta)
      });
      toast.success("Balance updated");
      // Clear custom amount field
      setCustomAmounts(prev => ({ ...prev, [userId]: "" }));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSetBalance = async (userId: string, amount: number) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        balance: amount
      });
      toast.success(`Balance set to ${formatCurrency(amount)}`);
      setCustomAmounts(prev => ({ ...prev, [userId]: "" }));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleVerifyUser = async (userId: string, status: "verified" | "rejected") => {
    try {
      await updateDoc(doc(db, "users", userId), {
        verificationStatus: status,
        isVerified: status === "verified"
      });
      toast.success(`User verification status: ${status}`);
    } catch (error: any) {
      toast.error("Failed to update verification status: " + error.message);
    }
  };

  const handleToggleRole = async (user: UserProfile) => {
    try {
      const newRole = user.role === "admin" ? "user" : "admin";
      await updateDoc(doc(db, "users", user.id), { role: newRole });
      toast.success(`User role updated to ${newRole}`);
    } catch (error: any) {
      toast.error("Failed to update role: " + error.message);
    }
  };

  const handleFirestoreError = (error: unknown, operation: string, path: string) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      operation,
      path,
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email
    };
    console.error("Firestore Error:", JSON.stringify(errInfo));
    return error instanceof Error ? error.message : String(error);
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;

    const { type, id } = confirmDelete;
    const path = type === "user" ? `users/${id}` : `news/${id}`;

    try {
      await deleteDoc(doc(db, type === "user" ? "users" : "news", id));
      toast.success(`${type === "user" ? "User" : "News"} deleted successfully`);
      setConfirmDelete(null);
    } catch (error: any) {
      const msg = handleFirestoreError(error, "delete", path);
      toast.error(`Failed to delete: ${msg}`);
    }
  };

  const handleDeleteUser = (user: UserProfile) => {
    setConfirmDelete({ type: "user", id: user.id, name: user.email });
  };

  const handleUpdateSettings = async () => {
    try {
      await setDoc(doc(db, "settings", "addresses"), settings);
      toast.success("Settings updated");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedUserChat) return;

    setIsSending(true);
    try {
      await addDoc(collection(db, "support_messages"), {
        userId: selectedUserChat,
        senderId: "admin",
        text: replyText,
        isAdmin: true,
        createdAt: serverTimestamp(),
      });
      setReplyText("");
    } catch (error: any) {
      toast.error("Failed to send reply: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleProcessTransaction = async (tx: Transaction, status: "completed" | "failed") => {
    try {
      await updateDoc(doc(db, "transactions", tx.id), { status });
      
      // If it's a deposit and being completed, add the balance
      if (tx.type === "deposit" && status === "completed") {
        await updateDoc(doc(db, "users", tx.userId), {
          balance: increment(tx.amount)
        });
      }
      
      // If it's a withdrawal and being failed/rejected, return the balance
      if (tx.type === "withdraw" && status === "failed") {
        await updateDoc(doc(db, "users", tx.userId), {
          balance: increment(tx.amount)
        });
      }

      toast.success(`Transaction ${status}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleNewsImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        toast.error("Image too large. Max 1MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewsImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePostNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim() || !newsContent.trim()) {
      toast.error("Title and content required");
      return;
    }

    setIsPostingNews(true);
    try {
      await addDoc(collection(db, "news"), {
        title: newsTitle,
        summary: newsSummary,
        content: newsContent,
        imageUrl: newsImageUrl,
        createdAt: serverTimestamp(),
        author: "Admin"
      });
      toast.success("News posted successfully");
      setNewsTitle("");
      setNewsSummary("");
      setNewsContent("");
      setNewsImageUrl(null);
    } catch (error: any) {
      toast.error("Failed to post news: " + error.message);
    } finally {
      setIsPostingNews(false);
    }
  };

  const handleDeleteNews = (newsId: string, title: string) => {
    setConfirmDelete({ type: "news", id: newsId, name: title });
  };

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-12">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-xl shadow-indigo-200">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Quantum <span className="text-indigo-600">Admin</span>
            </h1>
            <p className="text-slate-500 font-medium">Platform control and synchronization hub.</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
          {(["users", "transactions", "support", "news", "settings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-8 py-3 rounded-[1.25rem] text-sm font-black capitalize transition-all",
                activeTab === tab ? "bg-white text-indigo-600 shadow-xl" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {activeTab === "users" && (
          <div className="space-y-8">
            <div className="relative max-w-md group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text"
                placeholder="Search operators by email..."
                className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all outline-none font-medium shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="bg-white border border-slate-50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">User Profile</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Verification</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Balance</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Authorization</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Financial Adjust</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Management</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-indigo-50/30 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 transition-transform group-hover:scale-110">
                                <Users className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="font-black text-slate-900">{u.email}</div>
                                <div className="text-[10px] text-slate-400 font-mono tracking-tighter">UID: {u.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={cn(
                              "text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest",
                              u.verificationStatus === "verified" ? "bg-emerald-100 text-emerald-700" :
                              u.verificationStatus === "pending" ? "bg-amber-100 text-amber-700 animate-pulse" :
                              u.verificationStatus === "rejected" ? "bg-rose-100 text-rose-700" :
                              "bg-slate-100 text-slate-500"
                            )}>
                              {u.verificationStatus || "unsubmitted"}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-xl font-black text-slate-900 tracking-tighter font-mono">{formatCurrency(u.balance)}</div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={cn(
                              "text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest",
                              u.role === "admin" ? "bg-amber-100 text-amber-700 shadow-sm" : "bg-slate-100 text-slate-500"
                            )}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <input 
                              type="number"
                              placeholder="0.00"
                              className="w-28 bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none text-sm font-bold shadow-inner transition-all"
                              value={customAmounts[u.id] || ""}
                              onChange={(e) => setCustomAmounts({ ...customAmounts, [u.id]: e.target.value })}
                            />
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex gap-3">
                              <button 
                                onClick={() => {
                                  const amt = parseFloat(customAmounts[u.id] || "0");
                                  if (amt >= 0) handleUpdateBalance(u.id, amt);
                                  else toast.error("Enter valid positive amount");
                                }}
                                className="p-3 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-emerald-200"
                                title="Add Amount"
                              >
                                <ArrowDownLeft className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  const amt = parseFloat(customAmounts[u.id] || "0");
                                  if (amt > 0) handleUpdateBalance(u.id, -amt);
                                  else toast.error("Enter valid positive amount");
                                }}
                                className="p-3 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-rose-200"
                                title="Subtract Amount"
                              >
                                <ArrowUpRight className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  if (customAmounts[u.id] !== undefined && customAmounts[u.id] !== "") {
                                    handleSetBalance(u.id, parseFloat(customAmounts[u.id]));
                                  } else {
                                    toast.error("Enter an amount to set");
                                  }
                                }}
                                className="p-3 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-indigo-200"
                                title="Set Exact Balance"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleRole(u)}
                                className="p-3 bg-slate-50 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition-all"
                                title="Toggle Admin"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setSelectedUserKYC(u)}
                                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                title="View User Info"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-3 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-rose-200"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-2xl">
                  <TrendingUp className="w-8 h-8 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Audit Log</h3>
                  <p className="text-slate-500 font-medium text-sm">Monitor and verify all system movements.</p>
                </div>
              </div>
              <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
                <button 
                  onClick={() => setTxFilter("pending")}
                  className={cn(
                    "px-6 py-2.5 rounded-[1.15rem] text-xs font-black uppercase tracking-widest transition-all",
                    txFilter === "pending" ? "bg-white text-indigo-600 shadow-xl" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Pending Action
                </button>
                <button 
                  onClick={() => setTxFilter("all")}
                  className={cn(
                    "px-6 py-2.5 rounded-[1.15rem] text-xs font-black uppercase tracking-widest transition-all",
                    txFilter === "all" ? "bg-white text-indigo-600 shadow-xl" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Full History
                </button>
              </div>
            </div>
            {pendingTxs.length === 0 ? (
              <div className="text-center py-24 text-slate-400 italic font-medium">No system entries found in this vector.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {pendingTxs.map((tx) => (
                  <div key={tx.id} className="p-8 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-6 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 transition-all group">
                    <div className="flex justify-between items-start">
                      <div className="space-y-3">
                        <div className={cn(
                          "text-[10px] px-3 py-1.5 rounded-full inline-block uppercase font-black tracking-[0.2em] shadow-sm",
                          tx.type === "deposit" && "bg-emerald-100 text-emerald-700",
                          tx.type === "withdraw" && "bg-rose-100 text-rose-700",
                          tx.type === "trade" && "bg-indigo-100 text-indigo-700"
                        )}>
                          {tx.type} Instance
                        </div>
                        <div className="text-3xl font-black text-slate-900 tracking-tighter font-mono">{formatCurrency(tx.amount)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{tx.createdAt?.toDate?.()?.toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-300 font-mono break-all max-w-[120px]">REF: {tx.id.toUpperCase()}</div>
                      </div>
                    </div>
                    
                    {tx.details && <div className="text-sm text-slate-500 font-medium bg-white/50 p-4 rounded-2xl border border-slate-100">{tx.details}</div>}

                    {tx.receipt && (
                      <div className="mt-6 space-y-3">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5" />
                          Verification Object
                        </div>
                        <div 
                          onClick={() => setSelectedReceipt(tx.receipt!)}
                          className="rounded-[1.5rem] overflow-hidden border border-slate-200 bg-white group cursor-pointer relative h-32 shadow-sm"
                        >
                          <img src={tx.receipt} alt="Deposit Receipt" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          <div className="absolute inset-0 flex items-center justify-center bg-indigo-600/0 group-hover:bg-indigo-600/20 transition-all">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-xl opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all">
                              <Search className="w-5 h-5 text-indigo-600" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {tx.status === "pending" && (
                      <div className="flex gap-4 pt-4">
                        <button 
                          onClick={() => handleProcessTransaction(tx, "completed")}
                          className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-100 uppercase tracking-widest text-xs"
                        >
                          Authorize
                        </button>
                        <button 
                          onClick={() => handleProcessTransaction(tx, "failed")}
                          className="flex-1 py-4 bg-white hover:bg-rose-50 text-rose-600 border border-rose-100 font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {tx.status !== "pending" && (
                      <div className="pt-4">
                        <div className={cn(
                          "w-full py-3 text-center rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-inner",
                          tx.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          Transmission {tx.status}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "support" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-[700px]">
            {/* User List */}
            <div className="lg:col-span-1 bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl shadow-slate-200/50">
              <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                <h3 className="font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <MessageSquare className="w-6 h-6 text-indigo-600" />
                  Terminal Chats
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {Array.from(new Set(allMessages.map(m => m.userId))).length === 0 ? (
                  <div className="p-12 text-center text-slate-400 italic">No incoming transmissions.</div>
                ) : (
                  Array.from(new Set(allMessages.map(m => m.userId))).map(uId => {
                    const userProfile = users.find(u => u.id === uId);
                    const lastMsg = allMessages.filter(m => m.userId === uId).pop();
                    return (
                      <button
                        key={uId}
                        onClick={() => setSelectedUserChat(uId)}
                        className={cn(
                          "w-full p-6 flex items-center gap-4 hover:bg-slate-50 transition-all text-left",
                          selectedUserChat === uId ? "bg-indigo-50/50 border-r-4 border-indigo-600" : "border-b border-slate-50"
                        )}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-indigo-600">
                          <User className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-black text-slate-900 truncate">{userProfile?.email || uId}</div>
                          <div className="text-[10px] text-slate-500 truncate font-medium">{lastMsg?.text}</div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat Window */}
            <div className="lg:col-span-3 bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl shadow-slate-200/50">
              {selectedUserChat ? (
                <>
                  <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-slate-900 tracking-tight text-xl">{users.find(u => u.id === selectedUserChat)?.email}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Established Uplink</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-slate-50/30">
                    {allMessages.filter(m => m.userId === selectedUserChat).map((msg) => (
                      <div key={msg.id} className={cn(
                        "flex flex-col max-w-[75%]",
                        msg.isAdmin ? "ml-auto items-end" : "mr-auto"
                      )}>
                        <div className={cn(
                          "p-5 rounded-3xl text-sm font-medium shadow-sm transition-all hover:shadow-md",
                          msg.isAdmin 
                            ? "bg-indigo-600 text-white rounded-br-none" 
                            : "bg-white text-slate-900 border border-slate-100 rounded-bl-none"
                        )}>
                          {msg.text}
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-300 mt-3 mx-2 tracking-widest font-mono">
                          {msg.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="p-10 bg-white border-t border-slate-50">
                    <form onSubmit={handleSendMessage} className="flex gap-4">
                      <input 
                        type="text"
                        placeholder="Transmit response..."
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all font-medium shadow-inner"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      <button 
                        type="submit"
                        disabled={isSending || !replyText.trim()}
                        className="px-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-100 flex items-center gap-3 uppercase tracking-widest text-xs"
                      >
                        <Send className="w-5 h-5" />
                        Transmit
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-24 space-y-8 opacity-50">
                  <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center shadow-inner">
                    <MessageSquare className="w-12 h-12 text-slate-300" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Access Terminal</h3>
                    <p className="text-slate-500 font-medium max-w-sm mx-auto mt-4 leading-relaxed">Select specialized vector to initiate secure direct communication protocols.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "news" && (
          <div className="space-y-8">
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-8">Post Global News</h3>
              <form onSubmit={handlePostNews} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Headline</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 outline-none font-medium"
                      placeholder="e.g. Bitcoin Hits New All-Time High"
                      value={newsTitle}
                      onChange={(e) => setNewsTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Summary (Short)</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 outline-none font-medium"
                      placeholder="Brief overview of the news"
                      value={newsSummary}
                      onChange={(e) => setNewsSummary(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Article Content</label>
                  <textarea 
                    required
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 outline-none font-medium resize-none"
                    placeholder="Full news content..."
                    value={newsContent}
                    onChange={(e) => setNewsContent(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Featured Image</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={handleNewsImageChange}
                      className="hidden"
                      id="news-img-upload"
                    />
                    <label 
                      htmlFor="news-img-upload"
                      className="flex items-center justify-center gap-3 bg-slate-50 border-2 border-dashed border-slate-100 rounded-xl py-4 px-6 text-slate-400 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer flex-1"
                    >
                      {newsImageUrl ? (
                        <div className="flex items-center gap-3 text-indigo-600">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-xs font-bold uppercase">Image Loaded</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-xs font-bold">Upload Banner (Max 1MB)</span>
                        </div>
                      )}
                    </label>
                    {newsImageUrl && (
                      <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-100">
                        <img src={newsImageUrl} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isPostingNews}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-indigo-100 active:scale-95 uppercase tracking-widest text-xs"
                >
                  {isPostingNews ? "Propagating News..." : "Release Article"}
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {newsList.map((news) => (
                <div key={news.id} className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                  {news.imageUrl && (
                    <div className="h-48 overflow-hidden">
                      <img src={news.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    </div>
                  )}
                  <div className="p-6">
                    <h4 className="font-black text-slate-900 leading-tight mb-2 line-clamp-2">{news.title}</h4>
                    <p className="text-xs text-slate-500 font-medium line-clamp-3 mb-4">{news.summary}</p>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                      <span className="text-[10px] font-bold text-slate-300 uppercase">{news.createdAt?.toDate?.()?.toLocaleDateString()}</span>
                      <button 
                        onClick={() => handleDeleteNews(news.id, news.title)}
                        className="text-rose-500 hover:text-rose-700 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="max-w-4xl bg-white border border-slate-100 rounded-[2.5rem] p-12 shadow-2xl shadow-slate-200/50">
            <div className="flex items-center gap-6 mb-12">
              <div className="p-4 bg-amber-50 rounded-[1.5rem]">
                <Bitcoin className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Protocol Gateways</h3>
                <p className="text-slate-500 font-medium">Update institutional receiving handles.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {(["btc", "eth", "sol", "bnb", "xrp", "usdt"] as const).map((coin) => (
                <div key={coin} className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{coin} Secure Handle</label>
                  <input 
                    type="text"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 outline-none font-mono text-sm shadow-inner transition-all"
                    value={(settings as any)[`${coin}_address`] || ""}
                    onChange={(e) => setSettings({ ...settings, [`${coin}_address`]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <div className="mt-12 pt-12 border-t border-slate-100">
              <button 
                onClick={handleUpdateSettings}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-2xl transition-all flex items-center justify-center gap-4 shadow-2xl shadow-indigo-200 active:scale-95 uppercase tracking-widest"
              >
                <Save className="w-6 h-6" /> Commit Protocol Changes
              </button>
            </div>
          </div>
        )}

      </div>

      <AnimatePresence>
        {selectedUserKYC && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUserKYC(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-4xl bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-50 bg-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                    <User className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Identity Dossier</h3>
                    <p className="text-[10px] text-indigo-600 uppercase tracking-[0.3em] font-black">{selectedUserKYC.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUserKYC(null)}
                  className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal Identity</label>
                    <p className="text-slate-900 font-black text-lg leading-tight">{selectedUserKYC.fullName || "UNREGISTERED"}</p>
                  </div>
                  <div className="space-y-3 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Comm Vector</label>
                    <div className="flex items-start gap-3">
                       <Phone className="w-5 h-5 text-indigo-400 shrink-0" />
                       <p className="text-slate-900 font-black tracking-tight">{selectedUserKYC.phoneNumber || "UNLINKED"}</p>
                    </div>
                  </div>
                  <div className="space-y-3 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Coordinates</label>
                    <div className="flex items-start gap-3">
                       <MapPin className="w-5 h-5 text-indigo-400 shrink-0" />
                       <p className="text-slate-900 font-black tracking-tight leading-snug">{selectedUserKYC.address || "OFF-GRID"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    Proof of Identity Objective
                  </label>
                  {selectedUserKYC.verificationDoc ? (
                    <div className="rounded-[2.5rem] border-4 border-slate-100 bg-white overflow-hidden shadow-2xl relative group ring-1 ring-slate-100">
                      <img 
                        src={selectedUserKYC.verificationDoc} 
                        alt="KYC Document" 
                        className="w-full h-auto object-contain cursor-zoom-in group-hover:scale-[1.03] transition-transform duration-700"
                        onClick={() => window.open(selectedUserKYC.verificationDoc, "_blank")}
                      />
                      <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors pointer-events-none" />
                    </div>
                  ) : (
                    <div className="p-24 text-center bg-slate-50 rounded-[2.5rem] border border-slate-100 text-slate-400 font-black italic uppercase tracking-widest text-xs">
                      No visual confirmation object available.
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <div className="flex gap-4">
                  {selectedUserKYC.verificationStatus === "pending" && (
                    <>
                      <button 
                        onClick={() => {
                          handleVerifyUser(selectedUserKYC.id, "verified");
                          setSelectedUserKYC(null);
                        }}
                        className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all shadow-xl uppercase tracking-widest text-xs"
                      >
                        Verify User
                      </button>
                      <button 
                        onClick={() => {
                          handleVerifyUser(selectedUserKYC.id, "rejected");
                          setSelectedUserKYC(null);
                        }}
                        className="px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl transition-all shadow-xl uppercase tracking-widest text-xs"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedUserKYC(null)}
                  className="px-12 py-4 bg-slate-900 hover:bg-black text-white font-black rounded-2xl transition-all shadow-xl uppercase tracking-widest text-xs"
                >
                  Close Archive
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedReceipt && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReceipt(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-4xl bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-50 bg-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Transmission Proof</h3>
                    <p className="text-[10px] text-emerald-600 uppercase tracking-[0.3em] font-black">Financial Object</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedReceipt(null)}
                  className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-white transition-all shadow-xl"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-12">
                <div className="rounded-[2.5rem] border-4 border-slate-100 bg-white overflow-hidden shadow-2xl relative group ring-1 ring-slate-100">
                  <img 
                    src={selectedReceipt} 
                    alt="Transaction Receipt" 
                    className="w-full h-auto object-contain cursor-zoom-in group-hover:scale-[1.03] transition-transform duration-700"
                    onClick={() => window.open(selectedReceipt, "_blank")}
                  />
                  <div className="absolute inset-0 bg-emerald-600/0 group-hover:bg-emerald-600/5 transition-colors pointer-events-none" />
                </div>
                <p className="mt-8 text-center text-slate-400 text-xs font-black uppercase tracking-[0.2em]">
                  Audit verified visual documentation.
                </p>
              </div>
              
              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setSelectedReceipt(null)}
                  className="px-12 py-4 bg-slate-900 hover:bg-black text-white font-black rounded-2xl transition-all shadow-xl uppercase tracking-widest text-xs"
                >
                  Exit Review
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {confirmDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100"
            >
              <div className="bg-rose-50 p-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-rose-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-rose-200 mb-6">
                  <Trash2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-3">Permanent Deletion</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">
                  Are you sure you want to delete <span className="font-black text-slate-900 break-all">{confirmDelete.name}</span>? 
                  This operation is irreversible.
                </p>
              </div>
              <div className="p-8 flex gap-4">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-rose-100 uppercase tracking-widest text-xs"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
