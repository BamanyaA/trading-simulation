import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  getDoc, 
  setDoc,
  where,
  increment,
  serverTimestamp,
  addDoc
} from "firebase/firestore";
import { UserProfile, Transaction, PlatformSettings, SupportMessage } from "../types";
import { 
  Users, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Bitcoin, 
  ShieldCheck, 
  Clock, 
  Save, 
  Search,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  MessageSquare,
  Send,
  User,
  FileText,
  X,
  MapPin,
  Phone
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
    xrp_address: ""
  });
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "transactions" | "settings" | "support">("users");
  const [txFilter, setTxFilter] = useState<"pending" | "all">("pending");
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [selectedUserKYC, setSelectedUserKYC] = useState<UserProfile | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  // Chat states
  const [allMessages, setAllMessages] = useState<SupportMessage[]>([]);
  const [selectedUserChat, setSelectedUserChat] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);

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

    return () => {
      usersUnsub();
      txUnsub();
      chatUnsub();
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

  const handleToggleRole = async (user: UserProfile) => {
    try {
      const newRole = user.role === "admin" ? "user" : "admin";
      await updateDoc(doc(db, "users", user.id), { role: newRole });
      toast.success(`User role updated to ${newRole}`);
    } catch (error: any) {
      toast.error("Failed to update role: " + error.message);
    }
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

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-blue-500" />
            Admin Panel
          </h1>
          <p className="text-slate-400">Manage users, transactions, and platform settings.</p>
        </div>
        
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl">
          {(["users", "transactions", "support", "settings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all",
                activeTab === tab ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text"
                placeholder="Search users by email..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-blue-500 outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-800/50 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">User</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Balance</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Role</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Update Amount</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500">
                                <Users className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-bold text-white">{u.email}</div>
                                <div className="text-xs text-slate-500">ID: {u.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-lg font-bold text-white">{formatCurrency(u.balance)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[10px] px-2 py-1 rounded-full font-bold uppercase",
                              u.role === "admin" ? "bg-purple-600/20 text-purple-400" : "bg-slate-800 text-slate-400"
                            )}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <input 
                              type="number"
                              placeholder="0.00"
                              className="w-24 bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-white focus:border-blue-500 outline-none text-sm"
                              value={customAmounts[u.id] || ""}
                              onChange={(e) => setCustomAmounts({ ...customAmounts, [u.id]: e.target.value })}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  const amt = parseFloat(customAmounts[u.id] || "0");
                                  if (amt >= 0) handleUpdateBalance(u.id, amt);
                                  else toast.error("Enter valid positive amount");
                                }}
                                className="p-2 bg-green-600/10 hover:bg-green-600 text-green-500 hover:text-white rounded-lg transition-all"
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
                                className="p-2 bg-orange-600/10 hover:bg-orange-600 text-orange-500 hover:text-white rounded-lg transition-all"
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
                                className="p-2 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white rounded-lg transition-all"
                                title="Set Exact Balance"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleRole(u)}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
                                title="Toggle Admin"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setSelectedUserKYC(u)}
                                className="p-2 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white rounded-lg transition-all"
                                title="View User Info"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            </div>
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-blue-500" />
                <h3 className="text-xl font-bold text-white">Transactions Management</h3>
              </div>
              <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl">
                <button 
                  onClick={() => setTxFilter("pending")}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                    txFilter === "pending" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"
                  )}
                >
                  Pending
                </button>
                <button 
                  onClick={() => setTxFilter("all")}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                    txFilter === "all" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"
                  )}
                >
                  All History
                </button>
              </div>
            </div>
            {pendingTxs.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No transactions found in this category.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingTxs.map((tx) => (
                  <div key={tx.id} className="p-6 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full inline-block uppercase font-bold",
                          tx.type === "deposit" && "bg-green-600/20 text-green-500",
                          tx.type === "withdraw" && "bg-orange-600/20 text-orange-500",
                          tx.type === "trade" && "bg-blue-600/20 text-blue-500"
                        )}>
                          {tx.type}
                        </div>
                        <div className="text-2xl font-bold text-white">{formatCurrency(tx.amount)}</div>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        {tx.createdAt?.toDate?.().toLocaleString()}
                        <div className="text-[10px] mt-1 text-slate-600 truncate max-w-[150px]">UID: {tx.userId}</div>
                      </div>
                    </div>
                    
                    {tx.details && <div className="text-sm text-slate-400 italic">{tx.details}</div>}

                    {tx.receipt && (
                      <div className="mt-4 space-y-2">
                        <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                          <FileText className="w-3 h-3" />
                          Deposit Proof:
                        </div>
                        <div 
                          onClick={() => setSelectedReceipt(tx.receipt!)}
                          className="rounded-xl overflow-hidden border border-slate-800 bg-black/40 group cursor-pointer relative h-20"
                        >
                          <img src={tx.receipt} alt="Deposit Receipt" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-60 group-hover:opacity-100" />
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-600/0 group-hover:bg-blue-600/20 transition-all">
                            <Search className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0" />
                          </div>
                        </div>
                      </div>
                    )}

                    {tx.status === "pending" && (
                      <div className="flex gap-3 pt-2">
                        <button 
                          onClick={() => handleProcessTransaction(tx, "completed")}
                          className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-600/10"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleProcessTransaction(tx, "failed")}
                          className="flex-1 py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-bold rounded-xl border border-red-600/20 transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {tx.status !== "pending" && (
                      <div className="pt-2">
                        <div className={cn(
                          "w-full py-2 text-center rounded-xl font-bold text-xs uppercase tracking-widest",
                          tx.status === "completed" ? "bg-green-600/10 text-green-500" : "bg-red-600/10 text-red-500"
                        )}>
                          Transaction {tx.status}
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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-[600px]">
            {/* User List */}
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-xl">
              <div className="p-6 border-b border-white/5 bg-slate-800/50">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Active Chats
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {Array.from(new Set(allMessages.map(m => m.userId))).length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">No active support chats.</div>
                ) : (
                  Array.from(new Set(allMessages.map(m => m.userId))).map(uId => {
                    const userProfile = users.find(u => u.id === uId);
                    const lastMsg = allMessages.filter(m => m.userId === uId).pop();
                    return (
                      <button
                        key={uId}
                        onClick={() => setSelectedUserChat(uId)}
                        className={cn(
                          "w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-all text-left",
                          selectedUserChat === uId ? "bg-blue-600/10 border-r-2 border-blue-500" : "border-b border-white/5"
                        )}
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">{userProfile?.email || uId}</div>
                          <div className="text-[10px] text-slate-500 truncate">{lastMsg?.text}</div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat Window */}
            <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-xl">
              {selectedUserChat ? (
                <>
                  <div className="p-6 border-b border-white/5 bg-slate-800/50 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white">Chat with {users.find(u => u.id === selectedUserChat)?.email}</h3>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">User ID: {selectedUserChat}</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-950/20">
                    {allMessages.filter(m => m.userId === selectedUserChat).map((msg) => (
                      <div key={msg.id} className={cn(
                        "flex flex-col max-w-[70%]",
                        msg.isAdmin ? "ml-auto items-end" : "mr-auto"
                      )}>
                        <div className={cn(
                          "p-4 rounded-2xl text-sm",
                          msg.isAdmin 
                            ? "bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-600/10" 
                            : "bg-slate-800 text-slate-200 rounded-bl-none"
                        )}>
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-2 font-mono">
                          {msg.createdAt?.toDate?.().toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 bg-slate-800/30 border-t border-white/5">
                    <form onSubmit={handleSendMessage} className="flex gap-4">
                      <input 
                        type="text"
                        placeholder="Type a reply..."
                        className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-6 py-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      <button 
                        type="submit"
                        disabled={isSending || !replyText.trim()}
                        className="px-8 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-xl shadow-blue-600/20 flex items-center gap-2"
                      >
                        <Send className="w-5 h-5" />
                        Reply
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4 opacity-50">
                  <div className="p-6 bg-slate-800/50 rounded-3xl">
                    <MessageSquare className="w-12 h-12 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Select a User</h3>
                    <p className="text-slate-500 max-w-xs">Select an active chat from the sidebar to view messages and reply to users.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-8">
              <Bitcoin className="w-6 h-6 text-yellow-500" />
              <h3 className="text-xl font-bold text-white">Deposit Addresses</h3>
            </div>
            <div className="space-y-6">
              {(["btc", "eth", "xrp"] as const).map((coin) => (
                <div key={coin}>
                  <label className="block text-sm font-bold text-slate-400 uppercase mb-2">{coin} Address</label>
                  <input 
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500 outline-none font-mono"
                    value={(settings as any)[`${coin}_address`]}
                    onChange={(e) => setSettings({ ...settings, [`${coin}_address`]: e.target.value })}
                  />
                </div>
              ))}
              <button 
                onClick={handleUpdateSettings}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" /> Save All Addresses
              </button>
            </div>
          </div>
        )}

      </div>

      <AnimatePresence>
        {selectedUserKYC && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUserKYC(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm shadow-2xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/5 bg-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600/20 text-blue-500 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">User Verification Records</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold font-mono">{selectedUserKYC.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUserKYC(null)}
                  className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all shadow-xl"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1 bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xl">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Legal Full Name</label>
                    <p className="text-white font-medium">{selectedUserKYC.fullName || "Not provided"}</p>
                  </div>
                  <div className="space-y-1 bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xl">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Phone Number</label>
                    <div className="flex items-start gap-2">
                       <Phone className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                       <p className="text-white font-medium text-sm">{selectedUserKYC.phoneNumber || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="space-y-1 bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xl">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Residential Address</label>
                    <div className="flex items-start gap-2">
                       <MapPin className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                       <p className="text-white font-medium text-sm">{selectedUserKYC.address || "Not provided"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    ID / Passport / License
                  </label>
                  {selectedUserKYC.verificationDoc ? (
                    <div className="rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl relative group">
                      <img 
                        src={selectedUserKYC.verificationDoc} 
                        alt="KYC Document" 
                        className="w-full h-auto object-contain cursor-zoom-in group-hover:scale-[1.02] transition-transform duration-500"
                        onClick={() => window.open(selectedUserKYC.verificationDoc, "_blank")}
                      />
                      <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors pointer-events-none" />
                    </div>
                  ) : (
                    <div className="p-12 text-center bg-slate-950 rounded-3xl border border-slate-800 text-slate-500 italic">
                      No verification document found for this user.
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6 bg-slate-800/30 border-t border-white/5 flex justify-end">
                <button 
                  onClick={() => setSelectedUserKYC(null)}
                  className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all shadow-xl"
                >
                  Close Records
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedReceipt && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReceipt(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm shadow-2xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/5 bg-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600/20 text-green-500 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Deposit Receipt Proof</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Verification Visual</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedReceipt(null)}
                  className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all shadow-xl"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl relative group">
                  <img 
                    src={selectedReceipt} 
                    alt="Transaction Receipt" 
                    className="w-full h-auto object-contain cursor-zoom-in group-hover:scale-[1.02] transition-transform duration-500"
                    onClick={() => window.open(selectedReceipt, "_blank")}
                  />
                  <div className="absolute inset-0 bg-green-600/0 group-hover:bg-green-600/5 transition-colors pointer-events-none" />
                </div>
                <p className="mt-4 text-center text-slate-500 text-xs italic">
                  Click the image to view the full-size original document.
                </p>
              </div>
              
              <div className="p-6 bg-slate-800/30 border-t border-white/5 flex justify-end">
                <button 
                  onClick={() => setSelectedReceipt(null)}
                  className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all shadow-xl"
                >
                  Close Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
