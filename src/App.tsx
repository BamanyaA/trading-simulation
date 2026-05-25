import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect, useState, lazy, Suspense } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { UserProfile } from "./types";

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
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          await fetchProfile(firebaseUser.uid);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = profile?.role === "admin" || user?.email === "habeshatilaye@gmail.com";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const hideFooter = location.pathname === "/dashboard" || location.pathname === "/admin";

  const defaultRedirect = isAdmin ? "/admin" : "/dashboard";

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-500 flex flex-col">
      <Navbar user={user} profile={profile} />
      <main className="flex-1">
        <Suspense fallback={
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
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
          background: '#ffffff',
          color: '#1e293b',
          border: '1px solid #e2e8f0',
          fontWeight: '600',
          fontSize: '14px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
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
