import { animate, motion, useInView, useMotionValue, useTransform, type Variants } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../app/store';
import { tr } from '../i18n';

export const ease = [0.2, 0.8, 0.2, 1] as const;

/** Route-level page transition. */
export function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.main
      className={className}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease }}
    >
      {children}
    </motion.main>
  );
}

/** Fades + lifts children in when they scroll into view. */
export function Reveal({ children, delay = 0, y = 22, className, style }: { children: ReactNode; delay?: number; y?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

const staggerParent: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease } },
};

/** Staggers direct <motion.* variants={staggerItem}> children. */
export function Stagger({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <motion.div className={className} style={style} variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-30px' }}>
      {children}
    </motion.div>
  );
}

/** Headline that rises in word by word. */
export function Words({ text: source, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const { lang } = useStore();
  const text = lang === 'ur' ? tr(source) : source;
  return (
    <span className={className} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span key={i} aria-hidden style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', paddingBottom: '0.08em' }}>
          <motion.span
            style={{ display: 'inline-block' }}
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: delay + i * 0.06, ease }}
          >
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** Number that counts up when visible. */
export function CountUp({ to, decimals = 0, prefix = '', suffix = '' }: { to: number; decimals?: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => prefix + v.toLocaleString('en-PK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix);
  useEffect(() => {
    if (!inView) return;
    const c = animate(mv, to, { duration: 1.4, ease });
    return () => c.stop();
  }, [inView, to, mv]);
  return <motion.span ref={ref} className="num">{text}</motion.span>;
}

/** Types text out character by character (used for live voice transcripts). */
export function Typewriter({ text: source, speed = 28, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const { lang } = useStore();
  const text = lang === 'ur' ? tr(source) : source;
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = setInterval(() => setN((v) => {
      if (v >= text.length) { clearInterval(id); onDone?.(); return v; }
      return v + 1;
    }), speed);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed]);
  return <>{text.slice(0, n)}<span className="caret" style={{ opacity: n < text.length ? 1 : 0 }}>|</span></>;
}

/** Cycles through phrases with a vertical slide. */
export function Rotator({ items, interval = 2600, className }: { items: string[]; interval?: number; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % items.length), interval);
    return () => clearInterval(id);
  }, [items.length, interval]);
  return (
    <span className={className} style={{ display: 'inline-grid', overflow: 'hidden', verticalAlign: 'bottom' }}>
      <motion.span key={i} initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease }} style={{ gridArea: '1/1' }}>
        {items[i]}
      </motion.span>
    </span>
  );
}
