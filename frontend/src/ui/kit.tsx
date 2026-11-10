import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { serviceById, type Worker } from '../data/seed';
import { useStore } from '../app/store';
import { Icon, type IconName } from './Icon';
import { ease, staggerItem } from './motion';

export function Logo({ to = '/', sub }: { to?: string; sub?: string }) {
  return (
    <Link to={to} className="brand-logo" aria-label={`Roshan Rozgar${sub ? ` · ${sub}` : ''} home`}>
      <img
        className="brand-logo-image"
        src="/brand/roshan-rozgar-logo.png"
        alt="Roshan Rozgar — روشن روزگار"
        width={2149}
        height={732}
        decoding="async"
      />
      {sub && <span className="brand-role">{sub}</span>}
    </Link>
  );
}

export function Orb({ size = 320, listening = false, rings = false }: { size?: number; listening?: boolean; rings?: boolean }) {
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {rings && (<><span className="orb-ring" /><span className="orb-ring d2" /><span className="orb-ring d3" /></>)}
      <div className={`orb ${listening ? 'listening' : ''}`} style={{ ['--s' as string]: `${size}px` }} />
    </div>
  );
}

export function Wave({ bars = 28, idle = false }: { bars?: number; idle?: boolean }) {
  return (
    <div className={`wave ${idle ? 'idle' : ''}`} aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <i key={i} style={{ animationDelay: `${(i * 0.07) % 1}s`, height: `${40 + ((i * 37) % 60)}%` }} />
      ))}
    </div>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="row g4 small" style={{ fontWeight: 700 }}>
      <Icon name="star" size={15} style={{ color: '#D69A1F', fill: '#E8B23A' }} />
      <span className="num">{value.toFixed(1)}</span>
    </span>
  );
}

export function SectionHead({ title, action, to }: { title: string; action?: string; to?: string }) {
  return (
    <div className="row between g12" style={{ marginBottom: 14 }}>
      <h2 className="h2">{title}</h2>
      {action && to && <Link to={to} className="row g4 small" style={{ color: 'var(--green)', fontWeight: 700 }}>{action}<Icon name="chevR" size={16} /></Link>}
    </div>
  );
}

export function Empty({ icon, title, text, cta, to }: { icon: IconName; title: string; text: string; cta?: string; to?: string }) {
  return (
    <motion.div className="card stack g12" style={{ alignItems: 'center', textAlign: 'center', padding: '48px 24px' }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease }}>
      <span className="tile-icon float" style={{ width: 64, height: 64, borderRadius: 22 }}><Icon name={icon} size={28} /></span>
      <h3 className="h3">{title}</h3>
      <p className="muted" style={{ margin: 0, maxWidth: 360 }}>{text}</p>
      {cta && to && <Link to={to} className="btn btn-primary btn-sm" style={{ marginTop: 6 }}>{cta}</Link>}
    </motion.div>
  );
}

/** Worker summary card used on home, discovery and saved. */
export function WorkerCard({ w, compact = false }: { w: Worker; compact?: boolean }) {
  const { isBusy, saved, toggleSaved } = useStore();
  const busy = isBusy(w.id);
  const svc = serviceById(w.service);
  const isSaved = saved.includes(w.id);
  return (
    <motion.div variants={staggerItem} className="card lift" style={{ padding: compact ? 16 : 20 }}>
      <Link to={`/app/workers/${w.id}`} className="row g16" style={{ alignItems: 'flex-start' }}>
        <span className="avatar">{w.initials}</span>
        <span className="stack g4 grow">
          <span className="row g8 wrapflex">
            <span className="h3">{w.name}</span>
            {busy ? <span className="badge warn"><span className="dot" />On a job</span> : <span className="badge ok"><span className="dot live" />Available</span>}
          </span>
          <span className="small muted">{svc.name} · {w.km} km · {w.area}</span>
          {!compact && (
            <span className="row g16 small" style={{ marginTop: 6 }}>
              {w.jobs > 0 ? <Stars value={w.rating} /> : <span className="badge ok" style={{ background: 'var(--sand)', color: 'var(--muted)' }}>New</span>}
              <span className="muted"><b className="num" style={{ color: 'var(--ink)' }}>{w.jobs}</b> jobs</span>
              <span className="muted"><b className="num" style={{ color: 'var(--ink)' }}>{w.years}</b> yrs</span>
            </span>
          )}
        </span>
      </Link>
      {!compact && (
        <button
          className="icon-btn"
          aria-label={isSaved ? 'Remove from saved' : 'Save worker'}
          onClick={() => toggleSaved(w.id)}
          style={{ position: 'absolute', top: 16, right: 16, width: 38, height: 38, color: isSaved ? '#C2412D' : 'var(--muted)' }}
        >
          <motion.span key={String(isSaved)} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }} style={{ display: 'grid' }}>
            <Icon name="heart" size={18} style={{ fill: isSaved ? '#E0593F' : 'none' }} />
          </motion.span>
        </button>
      )}
    </motion.div>
  );
}

/* ---------- Toasts ---------- */
type Toast = { id: number; text: string; icon: IconName };
const ToastCtx = createContext<(text: string, icon?: IconName) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, icon: IconName = 'check') => {
    const id = Date.now() + Math.random();
    setItems((v) => [...v, { id, text, icon }]);
    setTimeout(() => setItems((v) => v.filter((t) => t.id !== id)), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 92, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 100, pointerEvents: 'none' }}>
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ ease, duration: 0.4 }}
              className="row g8" style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '12px 18px', borderRadius: 999, boxShadow: 'var(--shadow-lg)', font: '600 14px var(--body)' }}>
              <Icon name={t.icon} size={16} style={{ color: '#7DD3A6' }} />{t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/** Full-card loading state with a calm, branded feel. */
export function Thinking({ title, steps }: { title: string; steps: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => Math.min(v + 1, steps.length - 1)), 900);
    return () => clearInterval(id);
  }, [steps.length]);
  return (
    <div className="stack g16" style={{ alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
      <Orb size={120} listening rings />
      <h3 className="h3" style={{ marginTop: 18 }}>{title}</h3>
      <AnimatePresence mode="wait">
        <motion.p key={i} className="muted small" style={{ margin: 0 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
          {steps[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
