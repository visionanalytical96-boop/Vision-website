'use client';

import { useEffect, useRef, useState } from 'react';
import { BeltMap, type MapPin } from './BeltMap';

/**
 * Real Google Maps when a key is configured, our own drawn belt map when it
 * is not. Callers use this one component and never branch — the site works
 * with or without a Google billing account, and turning the key on is the
 * only step needed to upgrade every map at once.
 */

declare global {
  interface Window {
    google?: typeof google;
    __bsMapsPromise?: Promise<void>;
  }
}

const MARKER_COLOUR: Record<MapPin['kind'], string> = {
  pickup: '#1f6f5c',
  drop: '#b4472b',
  rider: '#e0a426',
  me: '#1f6f5c',
};

function loadMaps(key: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  // One shared loader — several maps on a page must not inject the script twice.
  window.__bsMapsPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=marker&loading=async&v=weekly`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('maps failed to load'));
    document.head.appendChild(script);
  });
  return window.__bsMapsPromise;
}

export function GoogleMap({
  apiKey,
  pins,
  /** Draws a line between the first pickup and drop pins. */
  route = false,
  height = 380,
  className = '',
}: {
  apiKey?: string;
  pins: MapPin[];
  route?: boolean;
  height?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const lineRef = useRef<google.maps.Polyline | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!apiKey || pins.length === 0) return;
    let cancelled = false;

    loadMaps(apiKey)
      .then(() => {
        if (cancelled || !ref.current || !window.google?.maps) return;

        mapRef.current ??= new window.google.maps.Map(ref.current, {
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          gestureHandling: 'greedy',
        });
        const map = mapRef.current;

        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = pins.map(
          (p) =>
            new window.google!.maps.Marker({
              position: { lat: p.lat, lng: p.lng },
              map,
              title: p.label,
              icon: {
                path: window.google!.maps.SymbolPath.CIRCLE,
                scale: p.kind === 'rider' ? 11 : 9,
                fillColor: MARKER_COLOUR[p.kind],
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
              },
            }),
        );

        lineRef.current?.setMap(null);
        if (route) {
          const from = pins.find((p) => p.kind === 'pickup');
          const to = pins.find((p) => p.kind === 'drop');
          if (from && to) {
            lineRef.current = new window.google!.maps.Polyline({
              path: [
                { lat: from.lat, lng: from.lng },
                { lat: to.lat, lng: to.lng },
              ],
              map,
              strokeColor: '#b4472b',
              strokeOpacity: 0.85,
              strokeWeight: 4,
            });
          }
        }

        const bounds = new window.google.maps.LatLngBounds();
        pins.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
        if (pins.length === 1) {
          map.setCenter(bounds.getCenter());
          map.setZoom(15);
        } else {
          map.fitBounds(bounds, 64);
        }
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
    };
  }, [apiKey, pins, route]);

  if (!apiKey || failed) {
    return (
      <div className={className}>
        <BeltMap pins={pins} />
        {failed && (
          <p className="mt-2 text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
            Google Map load nahi hua — apna naksha dikha rahe hain.
          </p>
        )}
      </div>
    );
  }

  return <div ref={ref} className={className} style={{ height, borderRadius: 'var(--glass-radius)', overflow: 'hidden' }} />;
}
