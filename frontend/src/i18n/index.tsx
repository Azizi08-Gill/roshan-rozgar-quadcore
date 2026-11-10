import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useStore, type Lang } from '../app/store';
import { Icon } from '../ui/Icon';
import { DICT, RULES } from './ur';

/* ---------------- Engine ---------------- */
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const KEYS = Object.keys(DICT).map((k) => k.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
const NORMAL = new Map<string, string>(Object.entries(DICT).map(([k, v]) => [norm(k), v]));
const PHRASES = new RegExp(`(?<![A-Za-z0-9])(?:${KEYS.map(esc).join('|')})(?![A-Za-z0-9])`, 'g');

function norm(s: string) {
  return s.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
}

const cache = new Map<string, string>();

/** Translates an English UI string into Urdu. Unknown words are left as they are. */
export function tr(input: string): string {
  if (!input || !/[A-Za-z]/.test(input)) return input;
  const hit = cache.get(input);
  if (hit !== undefined) return hit;
  const m = input.match(/^(\s*)([“"‘']?)([\s\S]*?)([”"’']?)(\s*)$/)!;
  const core0 = m[3];
  let out: string;
  // keep quotes around spoken text
  const quoted = (m[2] === '“' || m[2] === '"') && (m[4] === '”' || m[4] === '"');
  const core = quoted ? core0 : input.trim();
  const lead = quoted ? m[1] : input.match(/^\s*/)![0];
  const trail = quoted ? m[5] : input.match(/\s*$/)![0];
  out = translateCore(core);
  out = lead + (quoted ? '«' + out + '»' : out) + trail;
  cache.set(input, out);
  return out;
}

function translateCore(core: string): string {
  const n = norm(core);
  const exact = NORMAL.get(n);
  if (exact) return exact;
  for (const [re, fn] of RULES) {
    const m = n.match(re);
    if (m) return fn(m, tr);
  }
  let out = n.replace(PHRASES, (w) => NORMAL.get(norm(w)) ?? w);
  out = out
    .replace(/Rs\.?\s?([\d,]+)/g, '$1 روپے')
    .replace(/(\d+(?:\.\d+)?)\s?km\b/g, '$1 کلومیٹر')
    .replace(/(\d+)\s?(?:yrs?|years)\b/g, '$1 سال')
    .replace(/(\d+)\s?min\b/g, '$1 منٹ')
    .replace(/(\d+)\s?sec\b/g, '$1 سیکنڈ');
  return out;
}

/* ---------------- DOM translator ---------------- */
type Rec = { orig: string; out: string };
const textRecs = new WeakMap<Text, Rec>();
const attrRecs = new WeakMap<Element, Record<string, Rec>>();
const ATTRS = ['placeholder', 'aria-label', 'title'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT', 'INPUT']);

/** Translates a run of adjacent text nodes as one sentence (React splits `Hello {name}` into several). */
function applyRun(run: Text[], lang: Lang) {
  const origs = run.map((n) => {
    const rec = textRecs.get(n);
    const val = n.nodeValue ?? '';
    return rec && val === rec.out ? rec.orig : val;
  });
  const joined = origs.join('');
  if (lang === 'ur') {
    if (!joined.trim()) return;
    const out = tr(joined);
    run.forEach((n, i) => {
      const o = i === 0 ? out : '';
      if (n.nodeValue !== o) n.nodeValue = o;
      textRecs.set(n, { orig: origs[i], out: o });
    });
  } else {
    run.forEach((n, i) => {
      const rec = textRecs.get(n);
      if (rec && n.nodeValue === rec.out && rec.orig !== n.nodeValue) n.nodeValue = rec.orig;
      textRecs.delete(n);
    });
  }
}

function applyParent(p: Element, lang: Lang) {
  if (SKIP.has(p.tagName) || p.closest('[data-notr]')) return;
  let run: Text[] = [];
  const flush = () => { if (run.length) applyRun(run, lang); run = []; };
  p.childNodes.forEach((c) => {
    if (c.nodeType === 3) run.push(c as Text);
    else flush();
  });
  flush();
}

function applyAttrs(el: Element, lang: Lang) {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v === null) continue;
    const recs = attrRecs.get(el) ?? {};
    const rec = recs[a];
    if (lang === 'ur') {
      const orig = rec && v === rec.out ? rec.orig : v;
      const out = tr(orig);
      if (out !== v) { recs[a] = { orig, out }; attrRecs.set(el, recs); el.setAttribute(a, out); }
    } else if (rec && v === rec.out) {
      el.setAttribute(a, rec.orig);
      delete recs[a];
    }
  }
}

function applyTree(root: Node, lang: Lang) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const parents = new Set<Element>();
  let n: Node | null;
  while ((n = w.nextNode())) if (n.parentElement) parents.add(n.parentElement);
  parents.forEach((p) => applyParent(p, lang));
  if (root instanceof Element) {
    applyAttrs(root, lang);
    root.querySelectorAll('[placeholder],[aria-label],[title]').forEach((e) => applyAttrs(e, lang));
  }
}

/** Mount once. Applies the language to the whole page and keeps it applied as React re-renders. */
export function Translator() {
  const { lang } = useStore();
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'ur' ? 'rtl' : 'ltr';
    let t = 0;
    const run = () => { t = 0; applyTree(document.body, lang); };
    run();
    const mo = new MutationObserver(() => { if (!t) t = window.setTimeout(run, 16); });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    return () => { mo.disconnect(); clearTimeout(t); };
  }, [lang]);
  return null;
}

/* ---------------- Language dropdown ---------------- */
const LANGS: { id: Lang; label: string; sub: string }[] = [
  { id: 'en', label: 'English', sub: 'English' },
  { id: 'ur', label: 'اردو', sub: 'Urdu' },
];

export function LangMenu({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', off);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', key); };
  }, [open]);
  const cur = LANGS.find((l) => l.id === lang)!;
  return (
    <div className="lang" ref={ref} data-notr>
      <button className={`lang-btn ${compact ? 'compact' : ''}`} aria-haspopup="listbox" aria-expanded={open} aria-label="Language" onClick={() => setOpen((v) => !v)}>
        <Icon name="lang" size={17} />
        <span className={lang === 'ur' ? 'ur' : ''}>{cur.label}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ display: 'grid' }}><Icon name="chevD" size={15} /></motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul className="lang-menu" role="listbox" initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}>
            {LANGS.map((l) => (
              <li key={l.id} role="option" aria-selected={lang === l.id}>
                <button className={`lang-opt ${lang === l.id ? 'on' : ''}`} onClick={() => { setLang(l.id); setOpen(false); }}>
                  <span className={`lang-flag ${l.id === 'ur' ? 'ur' : ''}`}>{l.id === 'ur' ? 'اُ' : 'En'}</span>
                  <span className="stack grow" style={{ alignItems: 'flex-start' }}>
                    <b className={l.id === 'ur' ? 'ur' : ''} style={{ fontSize: 15 }}>{l.label}</b>
                    <span className="tiny muted">{l.id === 'ur' ? 'Urdu · اردو' : 'Default'}</span>
                  </span>
                  {lang === l.id && <motion.span className="check" initial={{ scale: 0 }} animate={{ scale: 1 }}><Icon name="check" size={13} stroke={3} /></motion.span>}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
