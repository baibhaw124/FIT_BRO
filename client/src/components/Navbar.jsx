import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowUpRight, LogOut } from 'lucide-react';

function readUser() {
  try { return JSON.parse(localStorage.getItem('fitbro_user') || 'null'); } catch { return null; }
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(readUser);
  const navigate = useNavigate();
  const close = () => setOpen(false);

  useEffect(() => {
    const sync = () => setUser(readUser());
    window.addEventListener('storage', sync);
    window.addEventListener('fitbro-auth-change', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('fitbro-auth-change', sync);
    };
  }, []);

  function logout() {
    localStorage.removeItem('fitbro_token');
    localStorage.removeItem('fitbro_user');
    setUser(null);
    close();
    window.dispatchEvent(new Event('fitbro-auth-change'));
    navigate('/login');
  }

  return <header className="nav-shell">
    <div className="site-nav">
      <Link to="/" className="wordmark" onClick={close} aria-label="FIT_BRO home">
        <img
          src="/images/fitbro-logo-transparent.png"
          alt="FIT_BRO — Train with intent"
          className="nav-logo-image"
        />
      </Link>
      <nav className={open ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">
        <a href="/#programs" onClick={close}>Programs</a>
        <a href="/#equipment" onClick={close}>Equipment</a>
        <NavLink to="/sessions" onClick={close}>Sessions</NavLink>
        {user && <NavLink to="/my-bookings" onClick={close}>My bookings</NavLink>}
        {user?.role === 'ADMIN' && <NavLink to="/admin" onClick={close}>Admin</NavLink>}
        {user ? <button className="nav-login nav-logout" type="button" onClick={logout}>LOG OUT <LogOut size={15} /></button> : <Link className="nav-login" to="/login" onClick={close}>MEMBER LOGIN <ArrowUpRight size={15} /></Link>}
      </nav>
      <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>{open ? <X /> : <Menu />}</button>
    </div>
  </header>;
}
