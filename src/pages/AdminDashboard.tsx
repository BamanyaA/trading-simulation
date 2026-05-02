import { useState, useEffect } from "react";
import { db } from "../firebase";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  getDocs, 
  setDoc,
  where
} from "firebase/firestore";
import { UserProfile, Transaction, PlatformSettings } from "../types";
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
  TrendingUp
} from "lucide-react";
import { toast } from "react-hot-toast";
import { formatCurrency, cn } from "../lib/utils";
import { motion } from "motion/react";

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [withdrawals, setWithdrawals] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>({
    btc_address: "",
    eth_address: "",
    xrp_address: ""
  });
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "withdrawals" | "settings">("users");

  useEffect(() => {
    // Listen to users
    const usersUnsub = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
    });

    // Listen to pending withdrawals
    const q = query(
      collection(db, "transactions"),
      where("type", "==", "withdraw"),
      where("status", "==", "pending")
    );
    const txUnsub = onSnapshot(q, (snapshot) => {
      setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });

    // Fetch settings
    const fetchSettings = async () => {
      const docSnap = await getDocs(collection(db, "settings"));
      const addrDoc = docSnap.docs.find(d => d.id === "addresses");
      if (addrDoc) {
        setSettings(addrDoc.data() as PlatformSettings);
      }
    };

    fetchSettings();
    return () => {
      usersUnsub();
      txUnsub();
    };
  }, []);

  const handleUpdateBalance = async (userId: string, currentBalance: number, delta: number) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        balance: currentBalance + delta
      });
      toast.success("Balance updated");
    } catch (error: any) {
      toast.error(error.message);
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

  const handleProcessWithdrawal = async (txId: string, status: "completed" | "failed") => {
    try {
      await updateDoc(doc(db, "transactions", txId), { status });
      toast.success(`Withdrawal ${status}`);
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
          {(["users", "withdrawals", "settings"] as const).map((tab) => (
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
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleUpdateBalance(u.id, u.balance, 100)}
                              className="p-2 bg-green-600/10 hover:bg-green-600 text-green-500 hover:text-white rounded-lg transition-all"
                              title="Add $100"
                            >
                              <ArrowDownLeft className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleUpdateBalance(u.id, u.balance, -100)}
                              className="p-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-lg transition-all"
                              title="Subtract $100"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const newRole = u.role === "admin" ? "user" : "admin";
                                updateDoc(doc(db, "users", u.id), { role: newRole });
                                toast.success(`Changed role to ${newRole}`);
                              }}
                              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
                              title="Toggle Admin"
                            >
                              <ShieldCheck className="w-4 h-4" />
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

        {activeTab === "withdrawals" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-8">
              <Wallet className="w-6 h-6 text-orange-500" />
              <h3 className="text-xl font-bold text-white">Pending Withdrawals</h3>
            </div>
            {withdrawals.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No pending withdrawal requests.</div>
            ) : (
              <div className="space-y-4">
                {withdrawals.map((tx) => (
                  <div key={tx.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-950 border border-slate-800 rounded-2xl gap-4">
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-white">{formatCurrency(tx.amount)}</div>
                      <div className="text-sm text-slate-400 font-mono">{tx.details}</div>
                      <div className="text-xs text-slate-500">{tx.createdAt?.toDate?.().toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleProcessWithdrawal(tx.id, "completed")}
                        className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleProcessWithdrawal(tx.id, "failed")}
                        className="px-6 py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-bold rounded-xl border border-red-600/20 transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
    </div>
  );
}
