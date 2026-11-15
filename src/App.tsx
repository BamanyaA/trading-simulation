import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { useEffect, useState, lazy, Suspense } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import { UserProfile } from "./types";
import { isAdminEmail } from "./lib/utils";

// Pages
import Home from "./pages/Home";
const About = lazy(() => import("./pages/About"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const fetchProfile = async (uid: string) => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
    } else if (auth.currentUser) {
      const user = auth.currentUser;
      const adminUser = isAdminEmail(user.email);

      if (!adminUser) {
        try {
          const deletedSnap = await getDoc(doc(db, "deleted_users", uid));
          if (deletedSnap.exists()) {
            setProfile(null);
            await auth.signOut();
            toast.error("This account has been permanently deleted.");
            return;
          }
        } catch (delCheckErr) {
          console.warn("Unable to check deleted_users tombstone:", delCheckErr);
        }
      }

      const newProfile = {
        email: user.email || "",
        fullName: user.displayName || "",
        address: "",
        phoneNumber: user.phoneNumber || "",
        verificationDoc: "",
        balance: 0,
        role: adminUser ? "admin" : "user",
        createdAt: new Date(),
        verificationStatus: "unsubmitted",
        isVerified: false,
        tradeAction: true
      };
      try {
        await setDoc(docRef, newProfile);
        setProfile({ id: uid, ...newProfile } as any);
        console.log("Missing Firestore profile repaired on login for:", user.email);
      } catch (err) {
        console.error("Failed to auto-repair missing Firestore profile:", err);
      }
    }
  };

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          const docRef = doc(db, "users", firebaseUser.uid);
          
          if (profileUnsub) {
            profileUnsub();
          }

          profileUnsub = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const adminUser = isAdminEmail(firebaseUser.email);
              if (adminUser && data.role !== "admin") {
                updateDoc(docRef, { role: "admin" }).catch((err) => {
                  console.warn("Failed to sync admin role:", err);
                });
              }
              setProfile({ id: docSnap.id, ...data, role: adminUser ? "admin" : data.role } as UserProfile);
              setLoading(false);
            } else {
              // Check tombstone before repairing a missing profile
              const adminUser = isAdminEmail(firebaseUser.email);
              (async () => {
                if (!adminUser) {
                  try {
                    const deletedSnap = await getDoc(doc(db, "deleted_users", firebaseUser.uid));
                    if (deletedSnap.exists()) {
                      setProfile(null);
                      setLoading(false);
                      await auth.signOut();
                      toast.error("This account has been permanently deleted.");
                      return;
                    }
                  } catch (delCheckErr) {
                    console.warn("Unable to check deleted_users tombstone on listener:", delCheckErr);
                  }
                }

                const newProfile = {
                  email: firebaseUser.email || "",
                  fullName: firebaseUser.displayName || "",
                  address: "",
                  phoneNumber: firebaseUser.phoneNumber || "",
                  verificationDoc: "",
                  balance: 0,
                  role: adminUser ? "admin" : "user",
                  createdAt: new Date(),
                  verificationStatus: "unsubmitted",
                  isVerified: false,
                  tradeAction: true
                };
                try {
                  await setDoc(docRef, newProfile);
                  setProfile({ id: firebaseUser.uid, ...newProfile } as any);
                } catch (err) {
                  console.error("Failed to auto-repair on listener:", err);
                } finally {
                  setLoading(false);
                }
              })();
            }
          }, (err) => {
            console.error("Profile onSnapshot error:", err);
            setLoading(false);
          });
        } else {
          if (profileUnsub) {
            profileUnsub();
            profileUnsub = null;
          }
          setProfile(null);
          setLoading(false);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const isAdmin = profile?.role === "admin" || isAdminEmail(user?.email);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B101D] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#22C58B]"></div>
      </div>
    );
  }

  const hideFooter = location.pathname === "/dashboard" || location.pathname === "/admin";

  const defaultRedirect = isAdmin ? "/admin" : "/dashboard";

  return (
    <div className="min-h-screen bg-[#0B101D] text-slate-100 transition-colors duration-500 flex flex-col">
      <Navbar user={user} profile={profile} />
      <main className="flex-1">
        <Suspense fallback={
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#22C58B]"></div>
          </div>
        }>
          <Routes>
            <Route path="/" element={!user ? <Home /> : <Navigate to={defaultRedirect} />} />
            <Route path="/about" element={!user ? <About /> : <Navigate to={defaultRedirect} />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to={defaultRedirect} />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to={defaultRedirect} />} />
            
            <Route 
              path="/dashboard" 
              element={
                user ? (
                  <Dashboard user={user} profile={profile} refreshProfile={() => fetchProfile(user.uid)} />
                ) : <Navigate to="/login" />
              } 
            />
            
            <Route 
              path="/admin" 
              element={isAdmin ? <AdminDashboard /> : <Navigate to="/dashboard" />} 
            />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </main>
      
      {!hideFooter && <Footer />}

      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: '#131B2E',
          color: '#F8FAFC',
          border: '1px solid rgba(255,255,255,0.1)',
          fontWeight: '600',
          fontSize: '14px',
          borderRadius: '14px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.45)'
        }
      }} />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
