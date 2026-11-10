import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { DESIGN } from '../routes';

/**
 * Layout widths. Between MIN and MAX the screen is laid out natively at the real viewport
 * width (flex/grid reflow, text stays the designed size). Outside that range it is scaled.
 */
const RANGE = {
  web: { min: 1440, max: 1680 },
  mobile: { min: 390, max: 480 },
} as const;

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useLayoutEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

/** Turns the fixed design-board frame into a fluid page: no fake chrome, fills its container. */
function useFluidRoot(ref: React.RefObject<HTMLDivElement>, platform: 'web' | 'mobile', framed: boolean) {
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
      root.style.width = '100%';
    }
    root.style.height = '100%';
  });
}

export default function Page({ platform, children }: { platform: 'web' | 'mobile'; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const vp = useViewport();
  const d = DESIGN[platform];
  // A phone design opened on a desktop-sized window is shown as a phone.
  const framed = platform === 'mobile' && vp.w >= 768;
  useFluidRoot(ref, platform, framed);

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

  const { min, max } = RANGE[platform];
  const layoutW = Math.min(Math.max(vp.w, min), max);
  const scale = vp.w / layoutW;
  // Fill the window; never shorter than the design content (minus stripped chrome) so nothing is clipped.
  const minH = platform === 'web' ? d.h - 44 : d.h - 50;
  const layoutH = Math.max(vp.h / scale, platform === 'web' ? minH : Math.min(minH, 760));
  return (
    <div style={{ width: vp.w, height: layoutH * scale, overflow: 'hidden', background: '#FCFAF3' }}>
      <div ref={ref} style={{ width: layoutW, height: layoutH, transform: scale === 1 ? undefined : `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
}
