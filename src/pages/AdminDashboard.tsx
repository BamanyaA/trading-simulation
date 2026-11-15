import React, { useState, useEffect } from "react";
import { db, auth, handleFirestoreError } from "../firebase";
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
  addDoc,
  getDocs
} from "firebase/firestore";
import { UserProfile, Transaction, PlatformSettings, SupportMessage, News, OperationType } from "../types";
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
  Trash2,
  RefreshCw,
  Plus
} from "lucide-react";
import { toast } from "react-hot-toast";
import { formatCurrency, cn, compressImage, uploadOrFallback, handleFileUploadFlow, isAdminEmail } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

// Helpers to parse withdrawal details
const getWithdrawalAddress = (details?: string) => {
  if (!details) return "";
  const match = details.match(/Wallet:\s*([^|]+)/i);
  return match ? match[1].trim() : details;
};

const getWithdrawalNetwork = (details?: string) => {
  if (!details) return "";
  const match = details.match(/Network:\s*([^|]+)/i);
  return match ? match[1].trim() : "";
};

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
  const [isCleaning, setIsCleaning] = useState(false);
  const [isSyncingUsers, setIsSyncingUsers] = useState(false);
  const [hasAutoSynced, setHasAutoSynced] = useState(false);
  const [hasLoadedUsers, setHasLoadedUsers] = useState(false);



  useEffect(() => {
    // Listen to users
    const usersUnsub = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
      setHasLoadedUsers(true);
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
    } catch (error) {
      toast.error("Failed to update balance: " + (error instanceof Error ? error.message : "Unknown error"));
      try {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      } catch (e) {
        console.error("Balance update sync error:", e);
      }
    }
  };

  const handleSetBalance = async (userId: string, amount: number) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        balance: amount
      });
      toast.success(`Balance set to ${formatCurrency(amount)}`);
      setCustomAmounts(prev => ({ ...prev, [userId]: "" }));
    } catch (error) {
      toast.error("Failed to set balance: " + (error instanceof Error ? error.message : "Unknown error"));
      try {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      } catch (e) {
        console.error("Balance set sync error:", e);
      }
    }
  };

  const handleVerifyUser = async (userId: string, status: "verified" | "rejected") => {
    try {
      await updateDoc(doc(db, "users", userId), {
        verificationStatus: status,
        isVerified: status === "verified"
      });
      toast.success(`User verification status: ${status}`);
    } catch (error) {
      toast.error("Failed to update verification status: " + (error instanceof Error ? error.message : "Unknown error"));
      try {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      } catch (e) {
        console.error("Verification update sync error:", e);
      }
    }
  };

  const handleToggleRole = async (user: UserProfile) => {
    try {
      const newRole = user.role === "admin" ? "user" : "admin";
      await updateDoc(doc(db, "users", user.id), { role: newRole });
      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      toast.error("Failed to update role: " + (error instanceof Error ? error.message : "Unknown error"));
      try {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
      } catch (e) {
        console.error("Role update sync error:", e);
      }
    }
  };

  const handleToggleTradeAction = async (user: UserProfile) => {
    try {
      const currentAction = user.tradeAction ?? true; // Default to true if not set
      const nextAction = !currentAction;
      await updateDoc(doc(db, "users", user.id), { tradeAction: nextAction });
      toast.success(`User trade outcome set to ${nextAction ? "PROFIT" : "LOSS"}`);
    } catch (error) {
      toast.error("Failed to update trade action: " + (error instanceof Error ? error.message : "Unknown error"));
      try {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
      } catch (e) {
        console.error("Trade action update sync error:", e);
      }
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;

    const { type, id, name } = confirmDelete;
    const path = type === "user" ? `users/${id}` : `news/${id}`;

    if (type === "user") {
      if (id === auth.currentUser?.uid || isAdminEmail(name)) {
        toast.error("Cannot delete an administrator account.");
        setConfirmDelete(null);
        return;
      }
      toast.loading("Permanently deleting user account, support chats, and transaction history...", { id: "cascadeDel" });
    }

    try {
      if (type === "user") {
        // 1. Write permanent deletion tombstone FIRST so active tabs / login / reconcile never recreate this user
        await setDoc(doc(db, "deleted_users", id), {
          uid: id,
          email: name || "",
          deletedAt: serverTimestamp(),
          deletedBy: auth.currentUser?.email || "admin",
        });

        // 2. Query support messages of the deleted user ID
        const chatQ = query(collection(db, "support_messages"), where("userId", "==", id));
        const chatSnap = await getDocs(chatQ);
        const chatDeletes = chatSnap.docs.map(docSnap => deleteDoc(docSnap.ref));
        
        // 3. Query transactions of the deleted user ID
        const txQ = query(collection(db, "transactions"), where("userId", "==", id));
        const txSnap = await getDocs(txQ);
        const txDeletes = txSnap.docs.map(docSnap => deleteDoc(docSnap.ref));

        // 4. Call the server API to revoke tokens and delete credentials from Firebase Auth
        try {
          const token = await auth.currentUser?.getIdToken();
          const authDelResponse = await fetch("/api/admin/delete-user", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ uid: id })
          });

          if (!authDelResponse.ok) {
            console.warn("Auth credential deletion endpoint returned status:", authDelResponse.status);
          }
        } catch (authErr) {
          console.error("Firebase Auth syncer error:", authErr);
        }

        // 5. Wait for all cascades to complete
        await Promise.all([...chatDeletes, ...txDeletes]);
      }

      await deleteDoc(doc(db, type === "user" ? "users" : "news", id));
      
      if (type === "user") {
        toast.success("User permanently deleted and blocked from returning", { id: "cascadeDel" });
      } else {
        toast.success("News deleted successfully");
      }
      setConfirmDelete(null);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      if (type === "user") {
        toast.error(`Purging failed: ${errorMsg}`, { id: "cascadeDel" });
      } else {
        toast.error(`Failed to delete news: ${errorMsg}`);
      }
      try {
        handleFirestoreError(error, OperationType.DELETE, path);
      } catch (e) {
        console.error("Delete sync error:", e);
      }
    }
  };

  const handleDeleteUser = (user: UserProfile) => {
    setConfirmDelete({ type: "user", id: user.id, name: user.email });
  };

  const purgeOrphanedData = async () => {
    setIsCleaning(true);
    const toastId = toast.loading("Executing query scans and Firebase Authentication sweep...");
    try {
      const existingUserIds = new Set(users.map(u => u.id));
      
      const messagesSnap = await getDocs(collection(db, "support_messages"));
      const txSnap = await getDocs(collection(db, "transactions"));
      
      let deletedMsgsCount = 0;
      let deletedTxsCount = 0;
      
      const deletePromises: Promise<void>[] = [];
      
      messagesSnap.docs.forEach(docSnap => {
        const msg = docSnap.data();
        if (msg.userId && !existingUserIds.has(msg.userId)) {
          deletePromises.push(deleteDoc(docSnap.ref));
          deletedMsgsCount++;
        }
      });
      
      txSnap.docs.forEach(docSnap => {
        const tx = docSnap.data();
        if (tx.userId && !existingUserIds.has(tx.userId)) {
          deletePromises.push(deleteDoc(docSnap.ref));
          deletedTxsCount++;
        }
      });

      // Synchronously purge all non-admin registration records inside Firebase Authentication too
      let authCleanedCount = 0;
      try {
        const token = await auth.currentUser?.getIdToken();
        const authPurgeRes = await fetch("/api/admin/purge-non-admins", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (authPurgeRes.ok) {
          const authData = await authPurgeRes.json();
          authCleanedCount = authData.deletedCount || 0;
        }
      } catch (authErr) {
        console.error("Auth bulk purger error:", authErr);
      }
      
      if (deletePromises.length > 0 || authCleanedCount > 0) {
        await Promise.all(deletePromises);
        toast.success(
          `Success! Safely purged ${deletedMsgsCount} support chats, ${deletedTxsCount} transactions, and ${authCleanedCount} Firebase Auth profiles.`, 
          { id: toastId, duration: 6000 }
        );
      } else {
        toast.success("Database is clean! No orphaned records or lingering registration emails found.", { id: toastId });
      }
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Database sweep failed: ${msg}`, { id: toastId });
    } finally {
      setIsCleaning(false);
    }
  };

  const purgeAllNonAdminUsers = async () => {
    setIsCleaning(true);
    const toastId = toast.loading("Executing deep purge on all user accounts and Auth registries...");
    try {
      const targets = users.filter(u => !isAdminEmail(u.email) && u.id !== auth.currentUser?.uid);
      
      let deletedUsers = 0;
      let deletedMsgsCount = 0;
      let deletedTxsCount = 0;
      
      const deletePromises: Promise<void>[] = [];
      
      for (const u of targets) {
        // Write permanent deletion tombstone first
        deletePromises.push(
          setDoc(doc(db, "deleted_users", u.id), {
            uid: u.id,
            email: u.email || "",
            deletedAt: serverTimestamp(),
            deletedBy: auth.currentUser?.email || "admin",
          })
        );

        // Query support messages of this user ID
        const chatQ = query(collection(db, "support_messages"), where("userId", "==", u.id));
        const chatSnap = await getDocs(chatQ);
        chatSnap.docs.forEach(docSnap => {
          deletePromises.push(deleteDoc(docSnap.ref));
          deletedMsgsCount++;
        });
        
        // Query transactions of this user ID
        const txQ = query(collection(db, "transactions"), where("userId", "==", u.id));
        const txSnap = await getDocs(txQ);
        txSnap.docs.forEach(docSnap => {
          deletePromises.push(deleteDoc(docSnap.ref));
          deletedTxsCount++;
        });

        // Delete user document
        deletePromises.push(deleteDoc(doc(db, "users", u.id)));
        deletedUsers++;
      }

      // Purge all other user profiles from the Firebase Authentication list
      let authCleanedCount = 0;
      try {
        const token = await auth.currentUser?.getIdToken();
        const authPurgeRes = await fetch("/api/admin/purge-non-admins", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (authPurgeRes.ok) {
          const authData = await authPurgeRes.json();
          authCleanedCount = authData.deletedCount || 0;
        }
      } catch (authErr) {
        console.error("Auth bulk purger error:", authErr);
      }

      if (deletePromises.length > 0 || authCleanedCount > 0) {
        await Promise.all(deletePromises);
        toast.success(
          `Success! Purged ${deletedUsers} Firestore users, ${deletedMsgsCount} support chats, ${deletedTxsCount} transactions, and ${authCleanedCount} Firebase Auth profiles.`, 
          { id: toastId, duration: 8000 }
        );
      } else {
        toast.success("Database is clean! No other user accounts found.", { id: toastId });
      }
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Database purge failed: ${msg}`, { id: toastId });
    } finally {
      setIsCleaning(false);
    }
  };

  const reconcileAuthUsers = async (showToast = false) => {
    setIsSyncingUsers(true);
    let toastId = null;
    if (showToast) {
      toastId = toast.loading("Checking registered Auth credentials and syncing to database...");
    }
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("Missing authentication token");
      }
      
      const response = await fetch("/api/admin/reconcile-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to reconcile accounts");
      }

      const data = await response.json();
      if (showToast) {
        if (data.apiRestricted) {
          toast.success("Database registry verified! Dynamic Client-Side Auto-Repair is active—when users login, their database records are instantly synced.", { id: toastId, duration: 8000 });
        } else if (data.createdCount > 0) {
          toast.success(`Success! Recovered ${data.createdCount} user profiles from the registration registry.`, { id: toastId, duration: 6000 });
        } else {
          toast.success("Database registry is complete and fully synchronized!", { id: toastId });
        }
      }
      return data;
    } catch (error) {
      console.error("Reconciliation error:", error);
      if (showToast) {
        toast.error("Reconciliation failed: " + (error instanceof Error ? error.message : "Unknown error"), { id: toastId });
      }
    } finally {
      setIsSyncingUsers(false);
    }
  };



  useEffect(() => {
    if (hasLoadedUsers && auth.currentUser && isAdminEmail(auth.currentUser.email)) {
      if (!hasAutoSynced) {
        setHasAutoSynced(true);
        reconcileAuthUsers(false);
      }
    }
  }, [hasLoadedUsers, auth.currentUser, hasAutoSynced]);

  const handleUpdateSettings = async () => {
    try {
      await setDoc(doc(db, "settings", "addresses"), settings);
      toast.success("Settings updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Settings update failed");
      try {
        handleFirestoreError(error, OperationType.WRITE, "settings/addresses");
      } catch (e) {
        console.error("Settings update sync error:", e);
      }
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
    } catch (error) {
      toast.error("Failed to send reply: " + (error instanceof Error ? error.message : "Unknown error"));
      try {
        handleFirestoreError(error, OperationType.WRITE, "support_messages");
      } catch (e) {
        console.error("Reply send sync error:", e);
      }
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transaction processing failed");
      try {
        handleFirestoreError(error, OperationType.UPDATE, `transactions/${tx.id}`);
      } catch (e) {
        console.error("Transaction process sync error:", e);
      }
    }
  };

  const handleNewsImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUploadFlow(file, setNewsImageUrl, "optNews", "News image uploaded successfully!");
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
    } catch (error) {
      toast.error("Failed to post news: " + (error instanceof Error ? error.message : "Unknown error"));
      try {
        handleFirestoreError(error, OperationType.WRITE, "news");
      } catch (e) {
        console.error("News post sync error:", e);
      }
    } finally {
      setIsPostingNews(false);
    }
  };

  const handleDeleteNews = (newsId: string, title: string) => {
    setConfirmDelete({ type: "news", id: newsId, name: title });
  };

  const filteredUsers = users.filter(u => (u.email || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl text-slate-100">
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-12">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-[#0D2524] border border-[#22C58B]/30 rounded-[1.5rem] shadow-xl">
            <ShieldCheck className="w-8 h-8 text-[#22C58B]" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
              Gammix <span className="text-[#22C58B]">Admin</span>
            </h1>
            <p className="text-slate-400 font-medium">Platform control and synchronization hub.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap bg-[#131B2E] border border-white/[0.08] p-1.5 rounded-2xl shadow-inner">
          {(["users", "transactions", "support", "news", "settings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 sm:px-8 py-3 rounded-[1.15rem] text-sm font-black capitalize transition-all",
                activeTab === tab
                  ? "bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-[#0B101D] shadow-lg"
                  : "text-slate-400 hover:text-white"
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
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
              <div className="relative max-w-md w-full group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#22C58B] transition-colors" />
                <input 
                  type="text"
                  placeholder="Search operators by email..."
                  className="w-full bg-[#131B2E] border border-white/[0.08] rounded-2xl py-4 pl-14 pr-6 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-[#22C58B]/20 focus:border-[#22C58B] transition-all outline-none font-medium"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => reconcileAuthUsers(true)}
                  disabled={isSyncingUsers}
                  className="bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-105 disabled:opacity-50 text-[#0B101D] font-black px-6 py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 text-xs uppercase tracking-widest min-w-[220px]"
                >
                  <RefreshCw className={cn("w-4 h-4", isSyncingUsers && "animate-spin")} />
                  {isSyncingUsers ? "Syncing Registry..." : "Reconcile Auth Users"}
                </button>
              </div>
            </div>

            <div className="bg-[#131B2E] border border-white/[0.08] rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#0F1629] border-b border-white/[0.08]">
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
                    <tbody className="divide-y divide-white/[0.06]">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-[#1A233A]/50 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-[#1A233A] border border-white/[0.08] flex items-center justify-center text-[#22C58B] transition-transform group-hover:scale-110">
                                <Users className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="font-black text-white">{u.email}</div>
                                <div className="text-[10px] text-slate-500 font-mono tracking-tighter">UID: {u.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={cn(
                              "text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest border",
                              u.verificationStatus === "verified" ? "bg-[#0D2524] text-[#22C58B] border-[#22C58B]/30" :
                              u.verificationStatus === "pending" ? "bg-amber-500/10 text-[#F5B400] border-[#F5B400]/30 animate-pulse" :
                              u.verificationStatus === "rejected" ? "bg-[#26131C] text-[#FB7185] border-[#F43F5E]/30" :
                              "bg-[#1A233A] text-slate-400 border-white/[0.08]"
                            )}>
                              {u.verificationStatus || "unsubmitted"}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-xl font-black text-white tracking-tighter font-mono tabular-nums">{formatCurrency(u.balance)}</div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={cn(
                              "text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest border",
                              u.role === "admin" ? "bg-amber-500/15 text-[#F5B400] border-[#F5B400]/30" : "bg-[#1A233A] text-slate-400 border-white/[0.08]"
                            )}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <input 
                              type="number"
                              placeholder="0.00"
                              className="w-28 bg-[#0B101D] border border-white/[0.1] rounded-xl py-2 px-3 text-white placeholder:text-slate-600 focus:border-[#22C58B] outline-none text-sm font-bold tabular-nums transition-all"
                              value={customAmounts[u.id] || ""}
                              onChange={(e) => setCustomAmounts({ ...customAmounts, [u.id]: e.target.value })}
                            />
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex gap-2.5">
                              <button 
                                onClick={() => {
                                  const amt = parseFloat(customAmounts[u.id] || "0");
                                  if (amt >= 0) handleUpdateBalance(u.id, amt);
                                  else toast.error("Enter valid positive amount");
                                }}
                                className="p-3 bg-[#0D2524] hover:bg-[#22C58B] text-[#22C58B] hover:text-[#0B101D] border border-[#22C58B]/20 rounded-xl transition-all"
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
                                className="p-3 bg-[#26131C] hover:bg-[#FB7185] text-[#FB7185] hover:text-[#0B101D] border border-[#F43F5E]/20 rounded-xl transition-all"
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
                                className="p-3 bg-[#1A233A] hover:bg-[#F5B400] text-[#F5B400] hover:text-[#0B101D] border border-white/[0.08] rounded-xl transition-all"
                                title="Set Exact Balance"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleToggleRole(u)}
                                className="p-3 bg-[#1A233A] hover:bg-white/10 text-slate-300 hover:text-white border border-white/[0.08] rounded-xl transition-all"
                                title="Toggle Admin"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setSelectedUserKYC(u)}
                                className="p-3 bg-[#F5B400] text-[#0B101D] rounded-xl hover:brightness-110 transition-all shadow-md"
                                title="View User Info"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedUserChat(u.id);
                                  setActiveTab("support");
                                }}
                                className="p-3 bg-[#1A233A] hover:bg-[#22C58B] text-[#22C58B] hover:text-[#0B101D] border border-white/[0.08] rounded-xl transition-all"
                                title="Contact User"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col items-center gap-1">
                                <button
                                  onClick={() => handleToggleTradeAction(u)}
                                  className={cn(
                                    "relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none shadow-inner",
                                    (u.tradeAction ?? true) ? "bg-[#22C58B]" : "bg-[#FB7185]"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                                      (u.tradeAction ?? true) ? "translate-x-6" : "translate-x-1"
                                    )}
                                  />
                                </button>
                                <span className={cn(
                                  "text-[8px] font-black uppercase tracking-[0.2em]",
                                  (u.tradeAction ?? true) ? "text-[#22C58B]" : "text-[#FB7185]"
                                )}>
                                  {(u.tradeAction ?? true) ? "On" : "Off"}
                                </span>
                              </div>
                              <button 
                                onClick={() => handleDeleteUser(u)}
                                className="p-3 bg-[#26131C] text-[#FB7185] hover:bg-[#FB7185] hover:text-[#0B101D] border border-[#F43F5E]/20 rounded-xl transition-all"
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
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
          <div className="bg-[#131B2E] border border-white/[0.08] rounded-[2.5rem] p-6 sm:p-10 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#0D2524] border border-[#22C58B]/20 rounded-2xl">
                  <TrendingUp className="w-8 h-8 text-[#22C58B]" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Audit Log</h3>
                  <p className="text-slate-400 font-medium text-sm">Monitor and verify all system movements.</p>
                </div>
              </div>
              <div className="flex bg-[#0B101D] border border-white/[0.08] p-1.5 rounded-2xl shadow-inner">
                <button 
                  onClick={() => setTxFilter("pending")}
                  className={cn(
                    "px-6 py-2.5 rounded-[1.15rem] text-xs font-black uppercase tracking-widest transition-all",
                    txFilter === "pending"
                      ? "bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-[#0B101D] shadow-lg"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  Pending Action
                </button>
                <button 
                  onClick={() => setTxFilter("all")}
                  className={cn(
                    "px-6 py-2.5 rounded-[1.15rem] text-xs font-black uppercase tracking-widest transition-all",
                    txFilter === "all"
                      ? "bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-[#0B101D] shadow-lg"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  Full History
                </button>
              </div>
            </div>
            {pendingTxs.length === 0 ? (
              <div className="text-center py-24 text-slate-500 italic font-medium">No system entries found in this vector.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {pendingTxs.map((tx) => {
                  const txUser = users.find(u => u.id === tx.userId);
                  const withdrawAddress = getWithdrawalAddress(tx.details);
                  const withdrawNetwork = getWithdrawalNetwork(tx.details);
                  const txName = tx.userName || txUser?.fullName || (tx.details?.match(/Name:\s*([^|]+)/i)?.[1]?.trim()) || "User";

                  return (
                    <div key={tx.id} className="p-8 bg-[#1A233A] border border-white/[0.08] rounded-[2rem] space-y-6 hover:border-white/[0.15] transition-all group">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                              "text-[10px] px-3 py-1.5 rounded-full inline-block uppercase font-black tracking-[0.2em] border",
                              tx.type === "deposit" && "bg-[#0D2524] text-[#22C58B] border-[#22C58B]/30",
                              tx.type === "withdraw" && "bg-[#26131C] text-[#FB7185] border-[#F43F5E]/30",
                              tx.type === "trade" && "bg-amber-500/10 text-[#F5B400] border-[#F5B400]/30"
                            )}>
                              {tx.type} Instance
                            </span>
                            {/* User name beside requested amount */}
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#22C58B] bg-[#0D2524] px-2.5 py-1.5 rounded-full border border-[#22C58B]/30 shrink-0">
                              {txName}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-3xl font-black text-white tracking-tighter font-mono tabular-nums">{formatCurrency(tx.amount)}</span>
                            <span className="text-xs font-semibold text-slate-400 mt-1">
                              Requester: <span className="text-white font-bold">{txName}</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{tx.createdAt?.toDate?.()?.toLocaleDateString()}</div>
                          <div className="text-[10px] text-slate-500 font-mono break-all max-w-[120px]">REF: {tx.id.toUpperCase()}</div>
                        </div>
                      </div>
                      
                      {/* Operator Information Section */}
                      <div className="bg-[#0B101D]/80 p-4 rounded-2xl border border-white/[0.08] space-y-2">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Operator Details</div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-[#22C58B] rounded-full animate-pulse shrink-0" />
                            <span className="text-xs font-black text-white break-all">{txUser?.email || tx.userEmail || "Unknown Email"}</span>
                          </div>
                          {txName && (
                            <span className="text-[10px] font-bold text-slate-300 bg-[#1A233A] px-2 py-0.5 rounded-md border border-white/[0.08] shrink-0">
                              {txName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Withdrawal Destination Section */}
                      {tx.type === "withdraw" && (
                        <div className="bg-[#26131C]/70 p-4 rounded-2xl border border-[#F43F5E]/25 space-y-2">
                          <div className="text-[10px] font-black text-[#FB7185] uppercase tracking-wider flex items-center gap-1.5">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Withdrawal Destination Address
                          </div>
                          <div className="bg-[#0B101D] p-3 rounded-xl border border-white/[0.08] font-mono text-xs text-slate-200 break-all select-all flex items-center justify-between gap-2">
                            <div className="flex flex-col gap-1 w-full">
                              <span className="font-semibold break-all selection:bg-[#FB7185]/30">{withdrawAddress || "N/A"}</span>
                              <span className="text-[10px] text-slate-400 font-sans font-bold">Payee: <span className="text-[#F5B400] uppercase font-black">{txName}</span></span>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(withdrawAddress || "");
                                toast.success("Withdrawal address copied!");
                              }}
                              className="text-[9px] bg-[#1A233A] hover:bg-[#22C58B] text-slate-200 hover:text-[#0B101D] px-2.5 py-1.5 rounded font-sans font-bold uppercase transition-all shrink-0 border border-white/[0.1]"
                            >
                              Copy
                            </button>
                          </div>
                          {withdrawNetwork && (
                            <div className="text-[10px] text-slate-400 font-bold">
                              Network: <span className="text-[#FB7185] uppercase font-black">{withdrawNetwork}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {tx.details && tx.type !== "withdraw" && (
                        <div className="text-sm text-slate-300 font-medium bg-[#0B101D]/60 p-4 rounded-2xl border border-white/[0.08]">{tx.details}</div>
                      )}

                      {tx.receipt && (
                        <div className="mt-6 space-y-3">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" />
                            Verification Object
                          </div>
                          <div 
                            onClick={() => setSelectedReceipt(tx.receipt!)}
                            className="rounded-[1.5rem] overflow-hidden border border-white/[0.1] bg-[#0B101D] group cursor-pointer relative h-32"
                          >
                            <img src={tx.receipt} referrerPolicy="no-referrer" alt="Deposit Receipt" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 flex items-center justify-center bg-[#0B101D]/0 group-hover:bg-[#0B101D]/40 transition-all">
                              <div className="w-10 h-10 bg-[#131B2E] border border-white/[0.15] rounded-full flex items-center justify-center shadow-xl opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all">
                                <Search className="w-5 h-5 text-[#22C58B]" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {tx.status === "pending" && (
                        <div className="flex gap-4 pt-4">
                          <button 
                            onClick={() => handleProcessTransaction(tx, "completed")}
                            className="flex-1 py-4 bg-[#22C58B] hover:brightness-110 text-[#0B101D] font-black rounded-2xl transition-all shadow-lg uppercase tracking-widest text-xs"
                          >
                            Authorize
                          </button>
                          <button 
                            onClick={() => handleProcessTransaction(tx, "failed")}
                            className="flex-1 py-4 bg-[#26131C] hover:bg-[#FB7185] text-[#FB7185] hover:text-[#0B101D] border border-[#F43F5E]/30 font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      {tx.status !== "pending" && (
                        <div className="pt-4">
                          <div className={cn(
                            "w-full py-3 text-center rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] border",
                            tx.status === "completed"
                              ? "bg-[#0D2524] text-[#22C58B] border-[#22C58B]/25"
                              : "bg-[#26131C] text-[#FB7185] border-[#F43F5E]/25"
                          )}>
                            Transmission {tx.status}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "support" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-[700px]">
            {/* User List */}
            <div className="lg:col-span-1 bg-[#131B2E] border border-white/[0.08] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-8 border-b border-white/[0.08] bg-[#0F1629] space-y-4">
                <h3 className="font-black text-white tracking-tight flex items-center gap-3">
                  <MessageSquare className="w-6 h-6 text-[#22C58B]" />
                  Terminal Chats
                </h3>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Start New Chat</label>
                  <select
                    value={selectedUserChat || ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedUserChat(e.target.value);
                      }
                    }}
                    className="w-full bg-[#0B101D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#22C58B]"
                  >
                    <option value="" className="bg-[#131B2E] text-white">-- Choose User --</option>
                    {users.filter(u => !isAdminEmail(u.email)).map(u => (
                      <option key={u.id} value={u.id} className="bg-[#131B2E] text-white">
                        {u.email} {u.fullName ? `(${u.fullName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {(() => {
                  const chatUserIds = Array.from(new Set(allMessages.map(m => m.userId)));
                  if (selectedUserChat && !chatUserIds.includes(selectedUserChat)) {
                    chatUserIds.unshift(selectedUserChat);
                  }

                  if (chatUserIds.length === 0) {
                    return (
                      <div className="p-12 text-center text-slate-500 italic">
                        No active support chats. Select a user above to begin.
                      </div>
                    );
                  }

                  return chatUserIds.map(uId => {
                    const userProfile = users.find(u => u.id === uId);
                    const lastMsg = allMessages.filter(m => m.userId === uId).pop();
                    return (
                      <button
                        key={uId}
                        onClick={() => setSelectedUserChat(uId)}
                        className={cn(
                          "w-full p-6 flex items-center gap-4 hover:bg-[#1A233A]/60 transition-all text-left",
                          selectedUserChat === uId ? "bg-[#1A233A] border-r-4 border-[#22C58B]" : "border-b border-white/[0.06]"
                        )}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-[#0B101D] border border-white/[0.08] flex items-center justify-center text-[#22C58B]">
                          <User className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-black text-white truncate">{userProfile?.email || uId}</div>
                          <div className="text-[10px] text-slate-400 truncate font-medium">{lastMsg?.text || "No transmissions yet"}</div>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Chat Window */}
            <div className="lg:col-span-3 bg-[#131B2E] border border-white/[0.08] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl">
              {selectedUserChat ? (
                <>
                  <div className="p-8 border-b border-white/[0.08] bg-[#0F1629] flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-white tracking-tight text-xl">{users.find(u => u.id === selectedUserChat)?.email}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 bg-[#22C58B] rounded-full animate-pulse" />
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Established Uplink</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-[#0B101D]/60">
                    {allMessages.filter(m => m.userId === selectedUserChat).map((msg) => (
                      <div key={msg.id} className={cn(
                        "flex flex-col max-w-[75%]",
                        msg.isAdmin ? "ml-auto items-end" : "mr-auto"
                      )}>
                        <div className={cn(
                          "p-5 rounded-3xl text-sm font-medium shadow-sm transition-all",
                          msg.isAdmin 
                            ? "bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-[#0B101D] font-semibold rounded-br-none" 
                            : "bg-[#1A233A] text-slate-100 border border-white/[0.08] rounded-bl-none"
                        )}>
                          {msg.text}
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-500 mt-3 mx-2 tracking-widest font-mono">
                          {msg.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="p-8 sm:p-10 bg-[#0F1629] border-t border-white/[0.08]">
                    <form onSubmit={handleSendMessage} className="flex gap-4">
                      <input 
                        type="text"
                        placeholder="Transmit response..."
                        className="flex-1 bg-[#0B101D] border border-white/[0.1] rounded-2xl px-6 py-5 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-[#22C58B]/20 focus:border-[#22C58B] transition-all font-medium"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      <button 
                        type="submit"
                        disabled={isSending || !replyText.trim()}
                        className="px-10 bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-105 disabled:opacity-50 text-[#0B101D] font-black rounded-2xl transition-all shadow-lg flex items-center gap-3 uppercase tracking-widest text-xs"
                      >
                        <Send className="w-5 h-5" />
                        Transmit
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-24 space-y-8 opacity-60">
                  <div className="w-24 h-24 bg-[#1A233A] border border-white/[0.08] rounded-[2rem] flex items-center justify-center">
                    <MessageSquare className="w-12 h-12 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white tracking-tight">Access Terminal</h3>
                    <p className="text-slate-400 font-medium max-w-sm mx-auto mt-4 leading-relaxed">Select specialized vector to initiate secure direct communication protocols.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "news" && (
          <div className="space-y-8">
            <div className="bg-[#131B2E] border border-white/[0.08] rounded-[2.5rem] p-8 sm:p-10 shadow-2xl">
              <h3 className="text-2xl font-black text-white tracking-tight mb-8">Post Global News</h3>
              <form onSubmit={handlePostNews} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Headline</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-[#0B101D] border border-white/[0.1] rounded-xl py-3 px-4 text-sm text-white placeholder:text-slate-600 focus:border-[#22C58B] outline-none font-medium"
                      placeholder="e.g. Bitcoin Hits New All-Time High"
                      value={newsTitle}
                      onChange={(e) => setNewsTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Summary (Short)</label>
                    <input 
                      type="text"
                      className="w-full bg-[#0B101D] border border-white/[0.1] rounded-xl py-3 px-4 text-sm text-white placeholder:text-slate-600 focus:border-[#22C58B] outline-none font-medium"
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
                    className="w-full bg-[#0B101D] border border-white/[0.1] rounded-xl py-3 px-4 text-sm text-white placeholder:text-slate-600 focus:border-[#22C58B] outline-none font-medium resize-none"
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
                      className="flex items-center justify-center gap-3 bg-[#0B101D] border-2 border-dashed border-white/[0.12] rounded-xl py-4 px-6 text-slate-400 hover:border-[#22C58B]/50 hover:bg-[#1A233A] transition-all cursor-pointer flex-1"
                    >
                      {newsImageUrl ? (
                        <div className="flex items-center gap-3 text-[#22C58B]">
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
                      <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/[0.1]">
                        <img src={newsImageUrl} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isPostingNews}
                  className="w-full bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-105 disabled:opacity-50 text-[#0B101D] font-black py-4 rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest text-xs"
                >
                  {isPostingNews ? "Propagating News..." : "Release Article"}
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {newsList.map((news) => (
                <div key={news.id} className="bg-[#131B2E] border border-white/[0.08] rounded-[2rem] overflow-hidden shadow-lg hover:border-white/[0.15] transition-all group">
                  {news.imageUrl && (
                    <div className="h-48 overflow-hidden">
                      <img src={news.imageUrl} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    </div>
                  )}
                  <div className="p-6">
                    <h4 className="font-black text-white leading-tight mb-2 line-clamp-2">{news.title}</h4>
                    <p className="text-xs text-slate-400 font-medium line-clamp-3 mb-4">{news.summary}</p>
                    <div className="flex justify-between items-center pt-4 border-t border-white/[0.06]">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{news.createdAt?.toDate?.()?.toLocaleDateString()}</span>
                      <button 
                        onClick={() => handleDeleteNews(news.id, news.title)}
                        className="text-[#FB7185] hover:text-rose-400 p-2"
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
          <div className="space-y-10 max-w-4xl">
            {/* Protocol Gateways Card */}
            <div className="bg-[#131B2E] border border-white/[0.08] rounded-[2.5rem] p-8 sm:p-12 shadow-2xl">
              <div className="flex items-center gap-6 mb-12">
                <div className="p-4 bg-amber-500/10 border border-[#F5B400]/25 rounded-[1.5rem]">
                  <Bitcoin className="w-8 h-8 text-[#F5B400]" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tight">Protocol Gateways</h3>
                  <p className="text-slate-400 font-medium">Update institutional receiving handles.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {(["btc", "eth", "sol", "bnb", "xrp", "usdt"] as const).map((coin) => (
                  <div key={coin} className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{coin} Secure Handle</label>
                    <input 
                      type="text"
                      className="w-full bg-[#0B101D] border border-white/[0.1] rounded-2xl py-5 px-6 text-white focus:ring-2 focus:ring-[#22C58B]/20 focus:border-[#22C58B] outline-none font-mono text-sm transition-all"
                      value={(settings as any)[`${coin}_address`] || ""}
                      onChange={(e) => setSettings({ ...settings, [`${coin}_address`]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-12 pt-12 border-t border-white/[0.08]">
                <button 
                  onClick={handleUpdateSettings}
                  className="w-full bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-105 text-[#0B101D] font-black py-6 rounded-2xl transition-all flex items-center justify-center gap-4 shadow-lg active:scale-95 uppercase tracking-widest"
                >
                  <Save className="w-6 h-6" /> Commit Protocol Changes
                </button>
              </div>
            </div>

            {/* Database Integrity & Privacy Sync Card */}
            <div className="bg-[#131B2E] border border-white/[0.08] rounded-[2.5rem] p-8 sm:p-12 shadow-2xl">
              <div className="flex items-center gap-6 mb-12">
                <div className="p-4 bg-[#26131C] border border-[#F43F5E]/30 rounded-[1.5rem]">
                  <ShieldCheck className="w-8 h-8 text-[#FB7185]" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tight">Data Integrity & Privacy</h3>
                  <p className="text-slate-400 font-medium">Synchronize database collections to enforce compliance and complete erasure requests.</p>
                </div>
              </div>

              <div className="bg-[#0B101D] border border-white/[0.08] rounded-3xl p-8 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-white/[0.08]">
                  <div>
                    <h4 className="font-black text-sm text-white uppercase tracking-widest">Leftover Support Chats</h4>
                    <p className="text-xs text-slate-400 font-medium mt-1">Chat documents containing deleted user emails or messages.</p>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border ${
                    allMessages.filter(m => m.userId && !new Set(users.map(u => u.id)).has(m.userId)).length > 0
                      ? "bg-amber-500/10 text-[#F5B400] border-[#F5B400]/30 animate-pulse" 
                      : "bg-[#0D2524] text-[#22C58B] border-[#22C58B]/30"
                  }`}>
                    {allMessages.filter(m => m.userId && !new Set(users.map(u => u.id)).has(m.userId)).length} Orphaned Messages
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h4 className="font-black text-sm text-white uppercase tracking-widest">Orphaned Transactions</h4>
                    <p className="text-xs text-slate-400 font-medium mt-1">Transaction entries with credentials from deleted operator accounts.</p>
                  </div>
                  <div className="text-slate-500 text-xs font-black uppercase tracking-wider italic">
                    Requires Deep Scan
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-12 border-t border-white/[0.08] flex flex-col md:flex-row gap-6">
                <button 
                  onClick={purgeOrphanedData}
                  disabled={isCleaning}
                  className="flex-1 bg-[#26131C] hover:bg-[#FB7185] text-[#FB7185] hover:text-[#0B101D] border border-[#F43F5E]/30 disabled:opacity-50 font-black py-6 rounded-2xl transition-all flex items-center justify-center gap-4 active:scale-95 uppercase tracking-widest text-xs"
                >
                  <Trash2 className="w-5 h-5" /> 
                  {isCleaning ? "Deep Sweeping..." : "Purge Orphaned Chats & Trades"}
                </button>
                <button 
                  onClick={() => reconcileAuthUsers(true)}
                  disabled={isSyncingUsers}
                  className="flex-1 bg-[#1A233A] hover:bg-[#22C58B] text-[#22C58B] hover:text-[#0B101D] border border-[#22C58B]/30 disabled:opacity-50 font-black py-6 rounded-2xl transition-all flex items-center justify-center gap-4 active:scale-95 uppercase tracking-widest text-xs"
                >
                  <RefreshCw className={cn("w-5 h-5", isSyncingUsers && "animate-spin")} />
                  {isSyncingUsers ? "Syncing..." : "Sync Registered Profiles"}
                </button>
                <button 
                  onClick={purgeAllNonAdminUsers}
                  disabled={isCleaning}
                  className="flex-1 bg-[#0B101D] hover:bg-[#26131C] disabled:opacity-50 text-white font-black py-6 rounded-2xl transition-all flex items-center justify-center gap-4 active:scale-95 uppercase tracking-widest text-xs border border-[#F43F5E]/30"
                >
                  <ShieldCheck className="w-5 h-5 text-[#FB7185]" />
                  {isCleaning ? "Purging Registry..." : "Wipe All Non-Admin Accounts"}
                </button>
              </div>
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
              className="absolute inset-0 bg-[#0B101D]/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-4xl bg-[#131B2E] border border-white/[0.1] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-white/[0.08] bg-[#0F1629] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#0D2524] border border-[#22C58B]/30 text-[#22C58B] rounded-2xl flex items-center justify-center">
                    <User className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Identity Dossier</h3>
                    <p className="text-[10px] text-[#22C58B] uppercase tracking-[0.3em] font-black">{selectedUserKYC.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUserKYC(null)}
                  className="p-3 hover:bg-[#1A233A] rounded-2xl text-slate-400 hover:text-white transition-all"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 sm:p-12 space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3 bg-[#1A233A] p-6 rounded-[2rem] border border-white/[0.08]">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal Identity</label>
                    <p className="text-white font-black text-lg leading-tight">{selectedUserKYC.fullName || "UNREGISTERED"}</p>
                  </div>
                  <div className="space-y-3 bg-[#1A233A] p-6 rounded-[2rem] border border-white/[0.08]">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Comm Vector</label>
                    <div className="flex items-start gap-3">
                       <Phone className="w-5 h-5 text-[#22C58B] shrink-0" />
                       <p className="text-white font-black tracking-tight">{selectedUserKYC.phoneNumber || "UNLINKED"}</p>
                    </div>
                  </div>
                  <div className="space-y-3 bg-[#1A233A] p-6 rounded-[2rem] border border-white/[0.08]">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Coordinates</label>
                    <div className="flex items-start gap-3">
                       <MapPin className="w-5 h-5 text-[#F5B400] shrink-0" />
                       <p className="text-white font-black tracking-tight leading-snug">{selectedUserKYC.address || "OFF-GRID"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#1A233A] border border-white/[0.08] text-[#22C58B] rounded-xl flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    Proof of Identity Objective
                  </label>
                  {selectedUserKYC.verificationDoc ? (
                    <div className="rounded-[2.5rem] border border-white/[0.1] bg-[#0B101D] overflow-hidden shadow-2xl relative group">
                      <img 
                        src={selectedUserKYC.verificationDoc} 
                        referrerPolicy="no-referrer"
                        alt="KYC Document" 
                        className="w-full h-auto object-contain cursor-zoom-in group-hover:scale-[1.03] transition-transform duration-700"
                        onClick={() => window.open(selectedUserKYC.verificationDoc, "_blank")}
                      />
                      <div className="absolute inset-0 bg-[#22C58B]/0 group-hover:bg-[#22C58B]/5 transition-colors pointer-events-none" />
                    </div>
                  ) : (
                    <div className="p-24 text-center bg-[#0B101D] rounded-[2.5rem] border border-white/[0.08] text-slate-500 font-black italic uppercase tracking-widest text-xs">
                      No visual confirmation object available.
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-8 bg-[#0F1629] border-t border-white/[0.08] flex justify-between items-center">
                <div className="flex gap-4">
                  {selectedUserKYC.verificationStatus === "pending" && (
                    <>
                      <button 
                        onClick={() => {
                          handleVerifyUser(selectedUserKYC.id, "verified");
                          setSelectedUserKYC(null);
                        }}
                        className="px-8 py-4 bg-[#22C58B] hover:brightness-110 text-[#0B101D] font-black rounded-2xl transition-all shadow-lg uppercase tracking-widest text-xs"
                      >
                        Verify User
                      </button>
                      <button 
                        onClick={() => {
                          handleVerifyUser(selectedUserKYC.id, "rejected");
                          setSelectedUserKYC(null);
                        }}
                        className="px-8 py-4 bg-[#26131C] hover:bg-[#FB7185] text-[#FB7185] hover:text-[#0B101D] border border-[#F43F5E]/30 font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedUserKYC(null)}
                  className="px-12 py-4 bg-[#1A233A] hover:bg-white/10 border border-white/[0.1] text-white font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
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
              className="absolute inset-0 bg-[#0B101D]/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-4xl bg-[#131B2E] border border-white/[0.1] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-white/[0.08] bg-[#0F1629] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#0D2524] border border-[#22C58B]/30 text-[#22C58B] rounded-2xl flex items-center justify-center">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Transmission Proof</h3>
                    <p className="text-[10px] text-[#22C58B] uppercase tracking-[0.3em] font-black">Financial Object</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedReceipt(null)}
                  className="p-3 hover:bg-[#1A233A] rounded-2xl text-slate-400 hover:text-white transition-all"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 sm:p-12">
                <div className="rounded-[2.5rem] border border-white/[0.1] bg-[#0B101D] overflow-hidden shadow-2xl relative group">
                  <img 
                    src={selectedReceipt} 
                    referrerPolicy="no-referrer"
                    alt="Transaction Receipt" 
                    className="w-full h-auto object-contain cursor-zoom-in group-hover:scale-[1.03] transition-transform duration-700"
                    onClick={() => window.open(selectedReceipt, "_blank")}
                  />
                  <div className="absolute inset-0 bg-[#22C58B]/0 group-hover:bg-[#22C58B]/5 transition-colors pointer-events-none" />
                </div>
                <p className="mt-8 text-center text-slate-400 text-xs font-black uppercase tracking-[0.2em]">
                  Audit verified visual documentation.
                </p>
              </div>
              
              <div className="p-8 bg-[#0F1629] border-t border-white/[0.08] flex justify-end">
                <button 
                  onClick={() => setSelectedReceipt(null)}
                  className="px-12 py-4 bg-[#1A233A] hover:bg-white/10 border border-white/[0.1] text-white font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
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
               className="absolute inset-0 bg-[#0B101D]/85 backdrop-blur-md"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative bg-[#131B2E] w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/[0.1]"
            >
              <div className="bg-[#26131C]/60 p-10 flex flex-col items-center text-center border-b border-white/[0.08]">
                <div className="w-20 h-20 bg-[#26131C] border border-[#F43F5E]/40 rounded-[1.5rem] flex items-center justify-center text-[#FB7185] shadow-xl mb-6">
                  <Trash2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight mb-3">Permanent Deletion</h3>
                <p className="text-slate-400 font-medium text-sm leading-relaxed">
                  Are you sure you want to delete <span className="font-black text-white break-all">{confirmDelete.name}</span>? 
                  This operation is irreversible.
                </p>
              </div>
              <div className="p-8 flex gap-4">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-4 bg-[#1A233A] hover:bg-white/10 text-white border border-white/[0.08] font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 py-4 bg-[#FB7185] hover:bg-rose-500 text-[#0B101D] font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
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
