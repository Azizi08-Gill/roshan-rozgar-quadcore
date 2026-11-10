import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../ui/Icon';
import { Logo } from '../ui/kit';
import LanguageToggle from '../ui/LanguageToggle';
import { ease } from '../ui/motion';
import { useStore, type Role } from './store';

/* ---------------- Public site ---------------- */
const urLabels: Record<string, string> = { 'How it works': 'یہ کیسے کام کرتا ہے', Services: 'خدمات', 'For workers': 'کاریگروں کے لیے', Help: 'مدد', Home: 'ہوم', 'Find workers': 'کاریگر تلاش کریں', Bookings: 'بکنگز', Saved: 'محفوظ', Jobs: 'کام', Reviews: 'ریویوز', Profile: 'پروفائل' };
const PUBLIC_LINKS = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/services', label: 'Services' },
  { to: '/for-workers', label: 'For workers' },
  { to: '/help', label: 'Help' },
];

export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { user, lang } = useStore();
  useEffect(() => setOpen(false), [pathname]);
  const home = user ? (user.role === 'worker' ? '/work' : '/app') : null;
  return (
    <>
      <header className="topbar">
        <div className="wrap row between" style={{ height: 72 }}>
          <Logo />
          <nav className="row g4 hide-md">
            {PUBLIC_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `navlink ${isActive ? 'on' : ''}`}>{lang === 'ur' ? urLabels[l.label] : l.label}</NavLink>
            ))}
          </nav>
          <div className="row g8">
            <LanguageToggle />
            {home ? (
              <Link to={home} className="btn btn-dark btn-sm">Open app</Link>
            ) : (
              <>
                <Link to="/sign-in" className="btn btn-ghost btn-sm hide-sm">Sign in</Link>
                <Link to="/sign-in?role=customer" className="btn btn-dark btn-sm hide-sm">Get started</Link>
              </>
            )}
            <button className="icon-btn only-md" aria-label="Menu" onClick={() => setOpen(true)}><Icon name="list" size={20} /></button>
          </div>
        </div>
      </header>
      <AnimatePresence>
        {open && (
          <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <motion.nav className="sheet" initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }} transition={{ ease, duration: 0.45 }} onClick={(e) => e.stopPropagation()}>
              <div className="row between" style={{ marginBottom: 18 }}>
                <Logo />
                <button className="icon-btn" aria-label="Close menu" onClick={() => setOpen(false)}><Icon name="x" size={20} /></button>
              </div>
              {PUBLIC_LINKS.map((l, i) => (
                <motion.div key={l.to} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 + i * 0.05, ease }}>
                  <Link to={l.to} className="sheet-link">{lang === 'ur' ? urLabels[l.label] : l.label}<Icon name="arrowR" size={18} /></Link>
                </motion.div>
              ))}
              <Link to="/sign-in" className="btn btn-ghost btn-block" style={{ marginTop: 16 }}>Sign in</Link>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
      <Outlet />
      <Footer />
    </>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--line)', marginTop: 40 }}>
      <div className="wrap row between wrapflex g16" style={{ padding: '28px 24px' }}>
        <Logo />
        <div className="row g20 small muted wrapflex">
          {PUBLIC_LINKS.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
        </div>
        <span className="tiny faint">Islamabad &amp; Rawalpindi · Demo build</span>
      </div>
    </footer>
  );
}

/* ---------------- Signed-in apps ---------------- */
type Tab = { to: string; label: string; icon: IconName; end?: boolean };

const CUSTOMER_TABS: Tab[] = [
  { to: '/app', label: 'Home', icon: 'home', end: true },
  { to: '/app/workers', label: 'Find workers', icon: 'search' },
  { to: '/app/bookings', label: 'Bookings', icon: 'cal' },
  { to: '/app/saved', label: 'Saved', icon: 'heart' },
  { to: '/app/help', label: 'Help', icon: 'msg' },
];

const WORKER_TABS: Tab[] = [
  { to: '/work', label: 'Home', icon: 'home', end: true },
  { to: '/work/jobs', label: 'Jobs', icon: 'brief' },
  { to: '/work/reviews', label: 'Reviews', icon: 'star' },
  { to: '/work/profile', label: 'Profile', icon: 'user' },
];

function RequireRole({ role }: { role: Role }) {
  const { user } = useStore();
  const { pathname } = useLocation();
  if (!user) return <Navigate to={`/sign-in?role=${role}&next=${encodeURIComponent(pathname)}`} replace />;
  if (user.role !== role) return <Navigate to={user.role === 'worker' ? '/work' : '/app'} replace />;
  return null;
}

function AppChrome({ tabs, sub, mic }: { tabs: Tab[]; sub: string; mic?: boolean }) {
  const { user, signOut, lang } = useStore();
  const nav = useNavigate();
  const initials = (user?.name || 'You').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const [menu, setMenu] = useState(false);
  return (
    <>
      <header className="topbar">
        <div className="wrap row between g16" style={{ height: 72 }}>
          <Logo to={tabs[0].to} sub={sub} />
          <nav className="row g4 hide-md">
            {tabs.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `navlink ${isActive ? 'on' : ''}`}>
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId={`pill-${sub}`} className="navpill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    <span style={{ position: 'relative' }}>{lang === 'ur' ? urLabels[t.label] || t.label : t.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="row g8" style={{ position: 'relative' }}>
            <LanguageToggle />
            <button className="icon-btn" aria-label="Notifications" style={{ position: 'relative' }}>
              <Icon name="bell" size={19} />
              <span style={{ position: 'absolute', top: 10, right: 11, width: 8, height: 8, borderRadius: 4, background: '#E0593F', border: '2px solid var(--paper)' }} />
            </button>
            <button className="avatar sm" aria-label="Account" onClick={() => setMenu((v) => !v)}>{initials}</button>
            <AnimatePresence>
              {menu && (
                <motion.div className="card" style={{ position: 'absolute', right: 0, top: 54, width: 230, padding: 8, zIndex: 40, boxShadow: 'var(--shadow-lg)' }}
                  initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.96 }} transition={{ ease, duration: 0.25 }}>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 700 }}>{user?.name}</div>
                    <div className="tiny muted">+92 {user?.phone} · {user?.area}</div>
                  </div>
                  <hr className="hr" />
                  <button className="menu-item" onClick={() => { setMenu(false); nav('/'); }}><Icon name="home" size={16} />Public site</button>
                  <button className="menu-item" onClick={() => { signOut(); nav('/'); }}><Icon name="redo" size={16} />Sign out</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <nav className="tabbar only-md" aria-label="Main">
        {tabs.map((t, i) => (
          <NavFragment key={t.to} t={t} mic={mic && i === 2} />
        ))}
      </nav>
    </>
  );
}

function NavFragment({ t, mic }: { t: Tab; mic?: boolean }) {
  const { lang } = useStore();
  return (
    <>
      {mic && (
        <Link to="/app/voice" className="tab-mic" aria-label="Speak your request">
          <Icon name="mic" size={24} />
        </Link>
      )}
      <NavLink to={t.to} end={t.end} className={({ isActive }) => `tab ${isActive ? 'on' : ''}`}>
        <Icon name={t.icon} size={21} />
        <span>{lang === 'ur' ? urLabels[t.label] || t.label : t.label === 'Find workers' ? 'Find' : t.label}</span>
      </NavLink>
    </>
  );
}

export function CustomerLayout() {
  const { user } = useStore();
  if (!user || user.role !== 'customer') return <RequireRole role="customer" />;
  return (
    <>
      <AppChrome tabs={CUSTOMER_TABS} sub="Customer" mic />
      <Outlet />
    </>
  );
}

export function WorkerLayout() {
  const { user, workerProfile } = useStore();
  const { pathname } = useLocation();
  if (pathname === '/work/setup') return <Outlet />;
  if (!user || user.role !== 'worker') return <RequireRole role="worker" />;
  if (!workerProfile && pathname !== '/work/setup') return <Navigate to="/work/setup" replace />;
  return (
    <>
      <AppChrome tabs={WORKER_TABS} sub="Worker" />
      <Outlet />
    </>
  );
}
