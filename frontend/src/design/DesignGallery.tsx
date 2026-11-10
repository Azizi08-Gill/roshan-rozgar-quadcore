import { Link, Route, Routes } from 'react-router-dom';
import FlowLayer from '../components/FlowLayer';
import Page from '../components/Page';
import { mobileFlows, webFlows } from '../flows';
import { routes } from '../routes';

/** Reference viewer for the original design screens (static, generated from the design files). */
export default function DesignGallery() {
  return (
    <div style={{ background: '#E9E7DD', minHeight: '100vh' }}>
      <Routes>
        <Route index element={<Index />} />
        {routes.map((r) => (
          <Route key={r.slug} path={r.path.replace(/^\/design\/?/, '')} element={
            <Page platform={r.platform}>
              <FlowLayer flow={(r.platform === 'web' ? webFlows : mobileFlows)[r.slug]}><r.Component /></FlowLayer>
            </Page>
          } />
        ))}
      </Routes>
    </div>
  );
}

function Index() {
  return (
    <div className="wrap page stack g20">
      <h1 className="h1">Design reference</h1>
      <p className="muted">The original design boards, rendered as static screens. The live app is at <Link className="link" to="/">/</Link>.</p>
      {(['web', 'mobile'] as const).map((p) => (
        <div key={p} className="row g8 wrapflex">
          {routes.filter((r) => r.platform === p).map((r) => <Link key={r.slug} className="chip" to={r.path}>{r.label}</Link>)}
        </div>
      ))}
    </div>
  );
}
