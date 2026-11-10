import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Renders a fixed-size design screen, scaled down to fit the viewport when needed. */
export default function ScreenFrame({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => {
      const el = ref.current;
      if (!el) return;
      const availW = el.clientWidth;
      const availH = window.innerHeight - 96;
      setScale(Math.min(1, availW / width, availH / height));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [width, height]);
  return (
    <div ref={ref} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: width * scale, height: height * scale }}>
        <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
      </div>
    </div>
  );
}
