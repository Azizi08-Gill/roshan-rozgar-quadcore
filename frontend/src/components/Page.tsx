import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { DESIGN } from '../routes';

/** Strips the design-board chrome (fake browser bar / phone status bar, card corners, shadow). */
function useStripChrome(ref: React.RefObject<HTMLDivElement>, platform: 'web' | 'mobile', framed: boolean) {
  useLayoutEffect(() => {
    const root = ref.current?.querySelector<HTMLElement>('[data-screen-label]');
    if (!root) return;
    const first = root.firstElementChild as HTMLElement | null;
    const t = (first?.textContent ?? '').trim();
    if (first && ((platform === 'web' && t.startsWith('roshanrozgar.pk')) || (platform === 'mobile' && !framed && t.startsWith('9:41')))) {
      first.style.display = 'none';
    }
    if (!framed) {
      root.style.borderRadius = '0';
      root.style.boxShadow = 'none';
    }
    root.style.height = '100%';
  });
}

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useLayoutEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

/**
 * Renders a design screen as a real page.
 * - Web: full-bleed, scaled to the browser width, filling the window height.
 * - Mobile on a phone: full-bleed, scaled to the phone width.
 * - Mobile on a desktop: shown as a centred phone.
 */
export default function Page({ platform, children }: { platform: 'web' | 'mobile'; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const vp = useViewport();
  const d = DESIGN[platform];
  const framed = platform === 'mobile' && vp.w >= 600;
  useStripChrome(ref, platform, framed);

  if (framed) {
    const scale = Math.min(1, (vp.h - 48) / d.h);
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E9E7DD' }}>
        <div style={{ width: d.w * scale, height: d.h * scale }}>
          <div ref={ref} style={{ width: d.w, height: d.h, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
        </div>
      </div>
    );
  }

  const scale = vp.w / d.w;
  // Fill the window; never shorter than the design (minus the stripped chrome) so nothing gets clipped.
  const minH = platform === 'web' ? d.h - 44 : d.h - 50;
  const h = Math.max(vp.h / scale, minH);
  return (
    <div style={{ width: vp.w, height: h * scale, overflow: 'hidden', background: '#FCFAF3' }}>
      <div ref={ref} style={{ width: d.w, height: h, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
    </div>
  );
}
