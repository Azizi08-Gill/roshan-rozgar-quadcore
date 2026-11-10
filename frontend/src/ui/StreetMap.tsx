import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type { LatLng } from '../app/api';

/**
 * Real street map (Leaflet + OpenStreetMap tiles: free, no API key, attribution required. Fine for development
 * and demos; for heavy production traffic switch the tile URL to a hosted provider).
 * Pins use the app's own pin style. When a pin's position changes (live location) it glides to the new spot.
 */
export type MapPin = { id: string; at: LatLng; label: string; initials?: string; tone?: 'free' | 'busy' | 'home' | 'live'; onClick?: () => void };

const ISLAMABAD: LatLng = { lat: 33.6844, lng: 73.0479 };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function pinIcon(p: MapPin, hot: boolean) {
  const html = p.tone === 'home'
    ? `<div class="pin home"><span class="pin-chip"><span class="pin-av">⌂</span>${esc(p.label)}</span></div>`
    : `<div class="pin ${p.tone === 'busy' ? 'busy' : ''} ${p.tone === 'live' ? 'live' : ''} ${hot ? 'hot' : ''}"><span class="pin-chip"><span class="pin-av">${esc(p.initials || '•')}</span>${esc(p.label)}</span></div>`;
  return L.divIcon({ html, className: 'rr-pin', iconSize: [0, 0] });
}
const meIcon = L.divIcon({ html: '<span class="me" title="You"><i></i></span>', className: 'rr-pin', iconSize: [0, 0] });

/** Smoothly move a marker to a new position (live updates). */
function glide(m: L.Marker, to: L.LatLng) {
  const from = m.getLatLng(); if (from.equals(to)) return;
  const t0 = performance.now(), dur = 900;
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - (1 - k) ** 3;
    m.setLatLng([from.lat + (to.lat - from.lat) * e, from.lng + (to.lng - from.lng) * e]);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function StreetMap({ pins, me, hover, className = 'map', note, fitKey }: { pins: MapPin[]; me?: LatLng | null; hover?: string | null; className?: string; note?: string; fitKey?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const meMarker = useRef<L.Marker | null>(null);
  const fitted = useRef<string | null>(null);

  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView([ISLAMABAD.lat, ISLAMABAD.lng], 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize()); ro.observe(box.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; markers.current.clear(); meMarker.current = null; fitted.current = null; };
  }, []);

  // Add / move / remove worker pins.
  useEffect(() => {
    const m = map.current; if (!m) return;
    const seen = new Set<string>();
    for (const p of pins) {
      seen.add(p.id);
      const at = L.latLng(p.at.lat, p.at.lng);
      let mk = markers.current.get(p.id);
      if (!mk) { mk = L.marker(at, { icon: pinIcon(p, hover === p.id), keyboard: false }).addTo(m); markers.current.set(p.id, mk); }
      else { glide(mk, at); mk.setIcon(pinIcon(p, hover === p.id)); }
      mk.off('click'); if (p.onClick) mk.on('click', p.onClick);
      mk.setZIndexOffset(hover === p.id ? 1000 : p.tone === 'live' ? 500 : 0);
    }
    for (const [id, mk] of markers.current) if (!seen.has(id)) { mk.remove(); markers.current.delete(id); }
  }, [pins, hover]);

  // Customer's own position.
  useEffect(() => {
    const m = map.current; if (!m) return;
    if (me && !meMarker.current) meMarker.current = L.marker([me.lat, me.lng], { icon: meIcon, keyboard: false, zIndexOffset: 2000 }).addTo(m);
    else if (me && meMarker.current) glide(meMarker.current, L.latLng(me.lat, me.lng));
    else if (!me && meMarker.current) { meMarker.current.remove(); meMarker.current = null; }
  }, [me?.lat, me?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fit everything in view once per data set (not on every live move, so the map doesn't jump around).
  useEffect(() => {
    const m = map.current; if (!m) return;
    const key = fitKey ?? pins.map((p) => p.id).sort().join(',') + (me ? 'me' : '');
    if (fitted.current === key) return;
    const pts = [...pins.map((p) => [p.at.lat, p.at.lng] as [number, number]), ...(me ? [[me.lat, me.lng] as [number, number]] : [])];
    if (!pts.length) return;
    fitted.current = key;
    if (pts.length === 1) m.setView(pts[0], 14); else m.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 15 });
  }, [pins, me, fitKey]);

  return (
    <div className={className} style={{ position: 'relative' }}>
      <div ref={box} style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', zIndex: 0 }} />
      {note && <span className="map-note tiny" style={{ zIndex: 1000 }}>{note}</span>}
    </div>
  );
}
