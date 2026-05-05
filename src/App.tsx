import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { UserProfile } from "./types";

// Pages
import Home from "./pages/Home";
import About from "./pages/About";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";

// Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 transition-colors duration-500 flex flex-col">
        <Navbar user={user} profile={profile} />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={!user ? <Home /> : <Navigate to="/dashboard" />} />
            <Route path="/about" element={!user ? <About /> : <Navigate to="/dashboard" />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
            
            <Route 
              path="/dashboard" 
              element={user ? <Dashboard user={user} profile={profile} refreshProfile={() => fetchProfile(user.uid)} /> : <Navigate to="/login" />} 
            />
            
            <Route 
              path="/admin" 
              element={(profile?.role === "admin" || user?.email === "habeshatilaye@gmail.com") ? <AdminDashboard /> : <Navigate to="/dashboard" />} 
            />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
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
    </Router>
  );
}
