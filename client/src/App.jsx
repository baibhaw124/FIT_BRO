import { useEffect } from 'react';
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Sessions from './pages/Sessions.jsx';
import MyBookings from './pages/MyBookings.jsx';
import Admin from './pages/Admin.jsx';
import Auth from './pages/Auth.jsx';

function RequireAuth({ children, admin = false }) {
  const token = localStorage.getItem('fitbro_token');
  let user = null;
  try { user = JSON.parse(localStorage.getItem('fitbro_user') || 'null'); } catch { user = null; }
  if (!token) return <Navigate to="/login" replace />;
  if (admin && user?.role !== 'ADMIN') return <Navigate to="/sessions" replace />;
  return children;
}

export default function App() {
  const location = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [location.pathname]);
  const appRoute = ['/sessions', '/my-bookings', '/admin', '/login', '/register'].includes(location.pathname);
  const authRoute = ['/login', '/register'].includes(location.pathname);
  return <>{!authRoute && <Navbar />}<main className={authRoute ? 'auth-route-main' : undefined}><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/sessions" element={<RequireAuth><Sessions /></RequireAuth>} />
    <Route path="/my-bookings" element={<RequireAuth><MyBookings /></RequireAuth>} />
    <Route path="/admin" element={<RequireAuth admin><Admin /></RequireAuth>} />
    <Route path="/login" element={<Auth mode="login" />} />
    <Route path="/register" element={<Auth mode="register" />} />
    <Route path="*" element={<Home />} />
  </Routes></main>{!appRoute && <Footer />}</>;
}
