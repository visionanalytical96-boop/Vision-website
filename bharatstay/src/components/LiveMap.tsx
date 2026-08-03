'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { BeltMap, type MapPin } from './BeltMap';

/**
 * Real street map from OpenStreetMap, drawn with Leaflet.
 *
 * OSM needs no API key and no billing account, which is why it is the map the
 * whole site uses. Tiles come from openstreetmap.org, so attribution is
 * mandatory (ODbL) and Leaflet renders it in the corner — do not remove it.
 * If tiles cannot be reached at all we fall back to our own drawn map rather
 * than leaving the visitor staring at a grey box.
 *
 * OSM's tile servers are donated and their usage policy covers low-volume apps
 * only. The tile source is therefore configurable: if this site ever outgrows
 * that (or gets blocked), point NEXT_PUBLIC_MAP_TILE_URL at a paid provider
 * and nothing else has to change.
 */

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export type { MapPin };

const MARKER: Record<MapPin['kind'], { fill: string; radius: number }> = {
  pickup: { fill: '#1f6f5c', radius: 9 },
  drop: { fill: '#b4472b', radius: 9 },
  rider: { fill: '#e0a426', radius: 11 },
  me: { fill: '#1f6f5c', radius: 8 },
  place: { fill: '#b4472b', radius: 8 },
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Popups take an HTML string, so anything from the database has to be escaped. */
function popupHtml(pin: MapPin): string {
  const label = `<strong>${escapeHtml(pin.label)}</strong>`;
  if (!pin.href) return label;
  return `${label}<br><a href="${escapeHtml(pin.href)}">Kholo &rarr;</a>`;
}

export function LiveMap({
  pins,
  /** Draws a line between the first pickup and drop pins. */
  route = false,
  height = 380,
  className = '',
}: {
  pins: MapPin[];
  route?: boolean;
  height?: number;
  className?: string;
}) {
  const holder = useRef<HTMLDivElement>(null);
  // Leaflet objects are imperative and must survive re-renders, so they live in
  // refs rather than state — setting state here would loop.
  const map = useRef<import('leaflet').Map | null>(null);
  const layer = useRef<import('leaflet').LayerGroup | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (pins.length === 0 || failed) {
      // Switching to the fallback detaches the container, so drop the map with
      // it — otherwise a stale instance is left pointing at removed DOM.
      map.current?.remove();
      map.current = null;
      layer.current = null;
      return;
    }
    let cancelled = false;

    // Leaflet touches `window` on import, so it can only be loaded in the browser.
    void import('leaflet').then((L) => {
      if (cancelled || !holder.current) return;

      if (!map.current) {
        map.current = L.map(holder.current, {
          zoomControl: true,
          scrollWheelZoom: false, // page scroll should not get captured by the map
          attributionControl: true,
        });

        const tiles = L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION });
        // A few failed tiles are normal at the edges of coverage. Only give up
        // when several have failed and not one has come back — that is the
        // difference between a patchy map and no tile server at all.
        let loaded = 0;
        let errors = 0;
        tiles.on('tileload', () => { loaded += 1; });
        tiles.on('tileerror', () => {
          errors += 1;
          if (loaded === 0 && errors >= 4 && !cancelled) setFailed(true);
        });
        tiles.addTo(map.current);

        layer.current = L.layerGroup().addTo(map.current);
      }

      const m = map.current;
      layer.current?.clearLayers();

      for (const p of pins) {
        const style = MARKER[p.kind];
        if (p.kind === 'rider') {
          // Soft halo so a moving rider reads at a glance.
          L.circleMarker([p.lat, p.lng], {
            radius: style.radius + 9,
            color: 'transparent',
            fillColor: style.fill,
            fillOpacity: 0.25,
          }).addTo(layer.current!);
        }
        L.circleMarker([p.lat, p.lng], {
          // A pin standing for many listings is drawn bigger, capped so one
          // busy city cannot swallow the map.
          radius: p.weight ? Math.min(20, style.radius + Math.sqrt(p.weight) * 2.2) : style.radius,
          color: '#ffffff',
          weight: 3,
          fillColor: style.fill,
          fillOpacity: 1,
        })
          .bindPopup(popupHtml(p))
          .addTo(layer.current!);
      }

      if (route) {
        const from = pins.find((p) => p.kind === 'pickup');
        const to = pins.find((p) => p.kind === 'drop');
        if (from && to) {
          L.polyline(
            [
              [from.lat, from.lng],
              [to.lat, to.lng],
            ],
            { color: '#b4472b', weight: 4, opacity: 0.85 },
          ).addTo(layer.current!);
        }
      }

      // No pan animation: the first view should just be there. Animating it
      // also means pins slide under the cursor for a second after load.
      const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
      if (pins.length === 1) m.setView(bounds.getCenter(), 15, { animate: false });
      else m.fitBounds(bounds, { padding: [48, 48], animate: false });

      // The container is often sized by CSS after mount; without this the map
      // renders into a stale size and half the tiles stay blank.
      setTimeout(() => !cancelled && m.invalidateSize(), 0);
    });

    return () => {
      cancelled = true;
    };
  }, [pins, route, failed]);

  // Tear the map down only when the component itself goes away.
  useEffect(
    () => () => {
      map.current?.remove();
      map.current = null;
      layer.current = null;
    },
    [],
  );

  // The `key` matters: without it React reuses this div for both branches and
  // the fallback would render *inside* the container Leaflet already owns,
  // stacking a drawn map on top of a broken one.
  if (failed || pins.length === 0) {
    return (
      <div key="fallback" className={className}>
        <BeltMap pins={pins} />
        {failed && (
          <p className="mt-2 text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
            OpenStreetMap load nahi hua — apna naksha dikha rahe hain.
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      key="map"
      ref={holder}
      className={className}
      style={{ height, borderRadius: 'var(--glass-radius)', overflow: 'hidden', zIndex: 0 }}
    />
  );
}
