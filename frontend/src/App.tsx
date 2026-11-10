import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import FlowLayer from './components/FlowLayer';
import Page from './components/Page';
import { mobileFlows, webFlows } from './flows';
import { MOBILE_BREAKPOINT, routes, type RouteEntry } from './routes';

function ScreenRoute({ r }: { r: RouteEntry }) {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = `Roshan Rozgar · ${r.label.replace(/^\w+\s/, '')}`;
    window.scrollTo(0, 0);
  }, [r]);
  // Phones get the mobile app; web pages are designed for desktop/tablet widths.
  if (r.platform === 'web' && window.innerWidth < MOBILE_BREAKPOINT) return <Navigate to="/m" replace />;
  const flow = (r.platform === 'web' ? webFlows : mobileFlows)[r.slug];
  return (
    <Page platform={r.platform}>
      <FlowLayer key={pathname} flow={flow}>
        <r.Component />
      </FlowLayer>
    </Page>
  );
}

/** Index of every screen, for the team and for judges during the demo. */
function AllScreens() {
  const group = (p: 'web' | 'mobile') => routes.filter((r) => r.platform === p);
  return (
    <div style={{ padding: '40px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ font: "700 26px 'Plus Jakarta Sans',sans-serif" }}>All screens</h1>
      {(['web', 'mobile'] as const).map((p) => (
        <section key={p}>
          <h2 style={{ font: "700 18px 'Plus Jakarta Sans',sans-serif" }}>{p === 'web' ? 'Website' : 'Mobile app'}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {group(p).map((r) => (
              <Link key={r.slug} to={r.path} style={{ padding: '8px 14px', borderRadius: 999, background: '#FFFEFA', border: '1px solid #DCE6DB', color: '#17201B', font: '600 13px Montserrat', textDecoration: 'none' }}>
                {r.label} <span style={{ color: '#536158', fontWeight: 500 }}>{r.path}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {routes.map((r) => (
        <Route key={r.slug} path={r.path} element={<ScreenRoute r={r} />} />
      ))}
      <Route path="/screens" element={<AllScreens />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
