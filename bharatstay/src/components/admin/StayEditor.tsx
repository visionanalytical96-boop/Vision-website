'use client';

import { resizeFormPhotos } from '@/lib/resize-image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export type StayRow = {
  id: string;
  name: string;
  type: string;
  city: string;
  area: string;
  room: string;
  meal: string;
  tone: string;
  star: number;
  price: number;
  basePrice: number;
  rating: number;
  visible: boolean;
  amenities: string[];
  photoCount: number;
};

const TYPES = ['FARM_STAY', 'VILLA', 'HOMESTAY', 'RESORT', 'HOTEL'] as const;
const TYPE_LABEL: Record<string, string> = {
  FARM_STAY: 'Farmhouse', VILLA: 'Villa', HOMESTAY: 'Homestay', RESORT: 'Resort', HOTEL: 'Hotel',
};
const TONES = ['forest', 'ocean', 'mountain', 'farm', 'lake', 'heritage', 'royal', 'gold', 'desert'];
const AMENITIES = [
  'Free Wi-Fi', 'Swimming Pool', 'Air Conditioning', 'Parking', 'Restaurant',
  'Power Backup', 'Room Service', 'Pet Friendly', 'Kitchen', 'Bonfire', 'Garden / Lawn', 'Caretaker',
];

export function StayEditor({ stay, onClose }: { stay: StayRow | null; onClose: () => void }) {
  const router = useRouter();
  const [amenities, setAmenities] = useState<string[]>(stay?.amenities ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="card mt-4 p-5">
      <h3 className="text-[16px] font-semibold">{stay ? `${stay.name} edit karo` : 'Naya stay add karo'}</h3>

      <form
        className="mt-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const data = new FormData(e.currentTarget);
          if (stay) data.set('id', stay.id);
          data.delete('amenities');
          amenities.forEach((a) => data.append('amenities', a));

          await resizeFormPhotos(data);
          const res = await fetch('/api/admin/stays', { method: 'POST', body: data });
          const json = await res.json().catch(() => ({}));
          setBusy(false);
          if (!res.ok) return setError(json.error ?? 'Save nahi hua');
          router.refresh();
          onClose();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="field">
            <label htmlFor="name">Naam</label>
            <input id="name" name="name" defaultValue={stay?.name} required />
          </div>
          <div className="field">
            <label htmlFor="type">Type</label>
            <select id="type" name="type" defaultValue={stay?.type ?? 'FARM_STAY'}>
              {TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="city">Sheher</label>
            <input id="city" name="city" defaultValue={stay?.city} required />
          </div>
          <div className="field">
            <label htmlFor="area">Area / road</label>
            <input id="area" name="area" defaultValue={stay?.area} required />
          </div>
          <div className="field">
            <label htmlFor="room">Room ka naam</label>
            <input id="room" name="room" defaultValue={stay?.room ?? 'Standard Room'} required />
          </div>
          <div className="field">
            <label htmlFor="meal">Khana</label>
            <input id="meal" name="meal" defaultValue={stay?.meal ?? 'Breakfast'} required />
          </div>
          <div className="field">
            <label htmlFor="price">Price per night (₹)</label>
            <input id="price" name="price" type="number" defaultValue={stay?.price} required />
          </div>
          <div className="field">
            <label htmlFor="basePrice">Strike-through price (₹)</label>
            <input id="basePrice" name="basePrice" type="number" defaultValue={stay?.basePrice} placeholder="khaali chhodo to apne aap" />
          </div>
          <div className="field">
            <label htmlFor="star">Stars</label>
            <input id="star" name="star" type="number" min={1} max={5} defaultValue={stay?.star ?? 3} />
          </div>
          <div className="field">
            <label htmlFor="rating">Rating</label>
            <input id="rating" name="rating" type="number" step="0.1" min={1} max={5} defaultValue={stay?.rating ?? 4} />
          </div>
          <div className="field">
            <label htmlFor="tone">Scene colour</label>
            <select id="tone" name="tone" defaultValue={stay?.tone ?? 'forest'}>
              {TONES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="photos">Photos jodo</label>
            <input id="photos" name="photos" type="file" accept="image/*" multiple />
          </div>
        </div>

        <div className="mt-4">
          <p className="eyebrow mb-2">Suvidha</p>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => (
              <button
                key={a}
                type="button"
                className={`chip ${amenities.includes(a) ? 'chip-on' : ''}`}
                onClick={() => setAmenities((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]))}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-[14px]">
          <input type="checkbox" name="visible" defaultChecked={stay?.visible ?? true} />
          Site par dikhao
        </label>

        {error && (
          <p className="mt-3 text-[13px]" style={{ color: 'var(--laterite)' }} role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button className="btn btn-primary btn-sm" disabled={busy}>
            {busy ? 'Save ho raha hai…' : 'Save karo'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
