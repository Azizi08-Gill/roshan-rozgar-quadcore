import { useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Matcher, ScreenFlow } from '../flows';

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const hit = (m: Matcher, text: string) => (typeof m === 'string' ? m === text : m.test(text));

/**
 * Makes a static design screen clickable: elements whose text (or aria-label) matches the
 * screen's flow map become links to the target screen. Also runs timed auto-advances.
 */
export default function FlowLayer({ flow, basePath, children }: { flow?: ScreenFlow; basePath: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();

  useEffect(() => {
    const root = ref.current;
    if (!root || !flow?.links) return;
    const marked: HTMLElement[] = [];
    for (const el of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
      if (el.closest('[data-flow]')) continue;
      const text = norm(el.getAttribute('aria-label')) || norm(el.textContent);
      if (!text || text.length > 60) continue;
      const link = flow.links.find(([ms]) => ms.some((m) => hit(m, text)));
      if (!link) continue;
      // Climb to the outermost ancestor that still has the same text — the actual button/chip.
      let target = el;
      while (target.parentElement && target.parentElement !== root && norm(target.parentElement.textContent) === norm(el.textContent) && !el.getAttribute('aria-label')) {
        target = target.parentElement;
      }
      if (target.closest('[data-flow]')) continue;
      target.dataset.flow = link[1];
      target.style.cursor = 'pointer';
      target.setAttribute('role', target.getAttribute('role') ?? 'link');
      target.tabIndex = 0;
      marked.push(target);
    }
    const go = (e: Event) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-flow]');
      if (!t || !root.contains(t)) return;
      if (e instanceof KeyboardEvent && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      nav(`${basePath}/${t.dataset.flow}`);
    };
    root.addEventListener('click', go);
    root.addEventListener('keydown', go);
    return () => {
      root.removeEventListener('click', go);
      root.removeEventListener('keydown', go);
      for (const m of marked) delete m.dataset.flow;
    };
  }, [flow, basePath, nav]);

  useEffect(() => {
    if (!flow?.auto) return;
    const id = setTimeout(() => nav(`${basePath}/${flow.auto!.to}`), flow.auto.ms);
    return () => clearTimeout(id);
  }, [flow, basePath, nav]);

  return <div ref={ref}>{children}</div>;
}
