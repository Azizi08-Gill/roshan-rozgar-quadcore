import { mobileScreens, webScreens, type Screen } from './screens/registry';

/** Public URL for each design screen. Web lives at /, Urdu web at /ur, the mobile app at /m. */
function pathFor(platform: 'web' | 'mobile', s: Screen): string {
  const [code, ...rest] = s.label.split(' ');
  const name = rest.join(' ').replace(/\bUrdu\b/, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (platform === 'mobile') return code === 'S01' ? '/design/m' : `/design/m/${name}`;
  if (code.startsWith('U')) return code === 'U01' ? '/design/ur' : `/design/ur/${name}`;
  return code === 'W01' ? '/design/web' : `/design/${name}`;
}

export type RouteEntry = Screen & { platform: 'web' | 'mobile'; path: string };

export const routes: RouteEntry[] = [
  ...webScreens.map((s) => ({ ...s, platform: 'web' as const, path: pathFor('web', s) })),
  ...mobileScreens.map((s) => ({ ...s, platform: 'mobile' as const, path: pathFor('mobile', s) })),
];

const bySlug = new Map(routes.map((r) => [r.slug, r]));
export const pathOfSlug = (slug: string) => bySlug.get(slug)?.path ?? '/';

export const DESIGN = { web: { w: 1440, h: 900 }, mobile: { w: 390, h: 844 } } as const;
export const MOBILE_BREAKPOINT = 768;
