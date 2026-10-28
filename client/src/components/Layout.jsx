import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, ListTodo, Calendar, BarChart3, Sparkles, UserCircle, LogOut, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import MotivationalPopup from './MotivationalPopup';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/habits', label: 'My Habits', icon: ListTodo },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/coach', label: 'AI Coach', icon: Sparkles },
  { path: '/profile', label: 'Profile', icon: UserCircle },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggleRef = useRef(null);
  const navRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    navRef.current?.querySelector('a')?.focus();
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      menuToggleRef.current?.focus();
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'menu-open' : ''}`}>
        <div className="brand-wrap">
          <div className="brand-mark">H</div>
          <div>
            <div className="brand-name">HabitPulseAI</div>
            <small className="text-muted">Progress system</small>
          </div>
          <button
            type="button"
            className="mobile-menu-close"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav ref={navRef} id="main-navigation" className="nav-menu" aria-label="Main navigation">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink key={path} to={path} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="user-card">
          <div className="user-meta">
            <strong>{user?.name || 'User'}</strong>
            <span>{user?.email || 'guest@example.com'}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}><LogOut size={16} /> Logout</button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar d-flex justify-content-between align-items-center">
          <div>
            <button
              ref={menuToggleRef}
              type="button"
              className="mobile-menu-toggle"
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              aria-controls="main-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Menu size={21} />
            </button>
            <span className="eyebrow">Habit tracker</span>
            <h1 className="page-title mb-0">Your momentum</h1>
          </div>
          <Link to="/habits/new" className="btn btn-primary btn-sm rounded-pill">+ Add Habit</Link>
        </header>
        {children}
      </main>
      {menuOpen && <button type="button" className="mobile-nav-backdrop" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}
      {location.pathname === '/dashboard' && <MotivationalPopup />}
    </div>
  );
}
