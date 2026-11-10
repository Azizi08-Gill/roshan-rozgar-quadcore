import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { mobileScreens, webScreens, type Screen } from './screens/registry';
import ScreenFrame from './components/ScreenFrame';
import FlowLayer from './components/FlowLayer';
import { mobileFlows, webFlows } from './flows';

const SETS = {
  web: { screens: webScreens, flows: webFlows, w: 1440, h: 900, title: 'Web App' },
  mobile: { screens: mobileScreens, flows: mobileFlows, w: 390, h: 844, title: 'Mobile App' },
} as const;
type Platform = keyof typeof SETS;

const pill = (active = false): React.CSSProperties => ({
  height: 36, padding: '0 14px', borderRadius: 999, display: 'inline-flex', alignItems: 'center',
  font: '600 13px Montserrat', textDecoration: 'none', whiteSpace: 'nowrap',
  background: active ? '#17201B' : '#FFFEFA', color: active ? '#FFFEFA' : '#17201B',
  border: active ? 'none' : '1px solid #DCE6DB',
});

function Logo() {
  return (
    <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,#278761 0%,#176B4D 60%,#104A38 100%)', position: 'relative', overflow: 'hidden', flex: 'none' }}>
      <div style={{ position: 'absolute', left: 8, right: 8, bottom: 9, height: 10, borderRadius: '10px 10px 0 0', background: '#F7F4E9' }} />
      <div style={{ position: 'absolute', left: 6, right: 6, bottom: 6, height: 2, borderRadius: 2, background: '#D6EBDD' }} />
    </div>
  );
}

function Home() {
  return (
    <div style={{ padding: '40px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Logo />
        <div style={{ font: "700 26px 'Plus Jakarta Sans',sans-serif" }}>Roshan Rozgar</div>
        <div dir="rtl" style={{ font: "600 18px 'Noto Sans Arabic',sans-serif", color: '#176B4D' }}>روشن روزگار</div>
      </div>
      {(Object.keys(SETS) as Platform[]).map((p) => (
        <section key={p} style={{ marginBottom: 32 }}>
          <h2 style={{ font: "700 20px 'Plus Jakarta Sans',sans-serif", margin: '0 0 12px' }}>{SETS[p].title}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SETS[p].screens.map((s) => (
              <Link key={s.slug} to={`/${p}/${s.slug}`} style={pill()}>{s.label}</Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ScreenPage({ platform }: { platform: Platform }) {
  const { slug } = useParams();
  const nav = useNavigate();
  const set = SETS[platform];
  const i = set.screens.findIndex((s: Screen) => s.slug === slug);
  if (i < 0) return <Navigate to={`/${platform}/${set.screens[0].slug}`} replace />;
  const { Component, label } = set.screens[i];
  const prev = set.screens[i - 1];
  const next = set.screens[i + 1];
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#17201B', font: "700 15px 'Plus Jakarta Sans'" }}><Logo /> All screens</Link>
        <select value={slug} onChange={(e) => nav(`/${platform}/${e.target.value}`)} style={{ ...pill(), marginLeft: 'auto' }}>
          {set.screens.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
        </select>
        <button disabled={!prev} onClick={() => prev && nav(`/${platform}/${prev.slug}`)} style={{ ...pill(), cursor: 'pointer', opacity: prev ? 1 : .4 }}>‹ Prev</button>
        <button disabled={!next} onClick={() => next && nav(`/${platform}/${next.slug}`)} style={{ ...pill(true), cursor: 'pointer', opacity: next ? 1 : .4 }}>Next ›</button>
      </div>
      <ScreenFrame width={set.w} height={set.h} key={label}>
        <FlowLayer key={slug} flow={set.flows[slug!]} basePath={`/${platform}`}><Component /></FlowLayer>
      </ScreenFrame>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/web/:slug?" element={<ScreenPage platform="web" />} />
      <Route path="/mobile/:slug?" element={<ScreenPage platform="mobile" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
