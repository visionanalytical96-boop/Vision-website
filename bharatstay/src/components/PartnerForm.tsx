'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { Rail } from './Rail';

const STAY_TYPES = [
  { value: 'FARM_STAY', label: 'Farmhouse' },
  { value: 'VILLA', label: 'Villa' },
  { value: 'HOMESTAY', label: 'Homestay' },
  { value: 'RESORT', label: 'Resort' },
  { value: 'HOTEL', label: 'Hotel' },
] as const;

const AMENITIES = [
  'Free Wi-Fi', 'Swimming Pool', 'Air Conditioning', 'Parking', 'Restaurant',
  'Power Backup', 'Room Service', 'Pet Friendly', 'Kitchen', 'Bonfire',
  'Garden / Lawn', 'Caretaker',
];

const VEG_TYPES = ['Pure Veg', 'Veg & Non-veg', 'Non-veg Special', 'Seafood Special'];

const STEPS = ['Type', 'Details', 'Address', 'Photos', 'Review'];
const MAX_PHOTOS = 8;

type Kind = 'STAY' | 'RESTAURANT';

export function PartnerForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<Kind | null>(null);
  const [stayType, setStayType] = useState<string>('FARM_STAY');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const previews = useMemo(() => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })), [files]);

  const stops = STEPS.map((label, i) => ({
    label,
    note: `0${i + 1}`,
    done: i < step,
    current: i === step,
  }));

  function readField(name: string): string {
    const el = formRef.current?.elements.namedItem(name);
    return el && 'value' in el && typeof el.value === 'string' ? el.value.trim() : '';
  }

  /** Validates only the fields on the current step, so people aren't told
      about problems on a screen they haven't reached yet. */
  function validateStep(): string | null {
    if (step === 0 && !kind) return 'Pehle chuniye — stay ya restaurant';
    if (step === 1) {
      if (readField('businessName').length < 2) return 'Business ka naam daaliye';
      if (readField('ownerName').length < 2) return 'Aapka naam daaliye';
      if (!/^\S+@\S+\.\S+$/.test(readField('email'))) return 'Sahi email daaliye';
      if (readField('phone').replace(/\D/g, '').length < 10) return '10 digit ka phone number daaliye';
      if (readField('description').length < 20) return 'Thoda vivaran likhiye (kam se kam 20 akshar)';
      if (kind === 'STAY' && !readField('price')) return 'Per night price daaliye';
      if (kind === 'RESTAURANT' && !readField('costForTwo')) return 'Do logon ka kharcha daaliye';
    }
    if (step === 2) {
      if (readField('city').length < 2) return 'Sheher daaliye';
      if (readField('area').length < 2) return 'Area ya road daaliye';
      if (readField('address').length < 5) return 'Poora address daaliye';
    }
    return null;
  }

  function next() {
    const problem = validateStep();
    setError(problem);
    if (!problem) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...incoming].slice(0, MAX_PHOTOS));
    setError(null);
  }

  async function submit() {
    const form = formRef.current;
    if (!form) return;
    setSubmitting(true);
    setError(null);

    const data = new FormData(form);
    data.set('kind', kind ?? 'STAY');
    if (kind === 'STAY') data.set('stayType', stayType);
    data.delete('amenities');
    amenities.forEach((a) => data.append('amenities', a));
    data.delete('photos');
    files.forEach((f) => data.append('photos', f));

    try {
      const res = await fetch('/api/partner/apply', { method: 'POST', body: data });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Kuch galat ho gaya — dobara koshish karein');
        setSubmitting(false);
        return;
      }
      router.push(`/partner/status/${json.token}?new=1`);
    } catch {
      setError('Network problem — dobara koshish karein');
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="card p-5 sm:p-6">
        <Rail stops={stops} />
      </div>

      <form ref={formRef} className="mt-6" onSubmit={(e) => e.preventDefault()}>
        {/* ---------------------------------------------------- step 1 */}
        <div hidden={step !== 0}>
          <StepHead
            title="Aap kya list kar rahe hain?"
            blurb="Isse aage ke sawaal badal jaate hain — sirf wahi poochenge jo aapke liye zaroori hai."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <KindCard
              on={kind === 'STAY'}
              onClick={() => { setKind('STAY'); setError(null); }}
              title="Rehne ki jagah"
              body="Farmhouse, villa, homestay, resort ya hotel — jahan log raat rukte hain."
            />
            <KindCard
              on={kind === 'RESTAURANT'}
              onClick={() => { setKind('RESTAURANT'); setError(null); }}
              title="Khane ki jagah"
              body="Restaurant, dhaba, cafe, misal house ya thali ghar."
            />
          </div>

          {kind === 'STAY' && (
            <div className="mt-6">
              <p className="eyebrow mb-3">Property ka type</p>
              <div className="flex flex-wrap gap-2">
                {STAY_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={`chip ${stayType === t.value ? 'chip-on' : ''}`}
                    onClick={() => setStayType(t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- step 2 */}
        <div hidden={step !== 1}>
          <StepHead title="Business aur aapki jaankari" blurb="Yeh admin ko dikhega. Approve hone par naam site par aayega." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="businessName" label="Business ka naam" placeholder="Jaise: Kondeshwar Greens Farm Stay" required />
            <Field name="ownerName" label="Aapka naam" placeholder="Jaise: Ravi Patil" required />
            <Field name="email" label="Email" type="email" placeholder="aap@example.com" required />
            <Field name="phone" label="Phone" type="tel" placeholder="98765 43210" required />

            {kind === 'STAY' ? (
              <>
                <Field name="price" label="Per night price (₹)" type="number" placeholder="3500" required />
                <Field name="rooms" label="Kitne rooms/units" type="number" placeholder="4" />
                <Field name="maxGuests" label="Max guests" type="number" placeholder="12" />
                <Field name="roomName" label="Room ka naam" placeholder="Jaise: 3BHK Pool Villa" />
                <Field name="mealPlan" label="Khana" placeholder="Jaise: All Meals Included" />
              </>
            ) : (
              <>
                <Field name="costForTwo" label="Do logon ka kharcha (₹)" type="number" placeholder="500" required />
                <Field name="cuisine" label="Cuisine" placeholder="Jaise: Maharashtrian · Misal Pav" />
                <Field name="hours" label="Timings" placeholder="11:00 AM – 11:00 PM" />
                <div className="field">
                  <label htmlFor="vegType">Veg / Non-veg</label>
                  <select id="vegType" name="vegType" defaultValue={VEG_TYPES[0]}>
                    {VEG_TYPES.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="field mt-4">
            <label htmlFor="description">Apni jagah ke baare mein likhiye</label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Kya khaas hai, aas-paas kya hai, log kyun aayein…"
              required
            />
          </div>

          {kind === 'STAY' && (
            <div className="mt-5">
              <p className="eyebrow mb-3">Kya-kya suvidha hai</p>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={`chip ${amenities.includes(a) ? 'chip-on' : ''}`}
                    onClick={() =>
                      setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]))
                    }
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- step 3 */}
        <div hidden={step !== 2}>
          <StepHead
            title="Jagah kahan hai?"
            blurb="Address se Google Maps ka link banta hai. Phone number site par kabhi nahi dikhega — log email ya form se hi contact karenge."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="city" label="Sheher / gaon" placeholder="Badlapur" required />
            <Field name="area" label="Area, road ya naka" placeholder="Katrap, Badlapur East" required />
          </div>
          <div className="field mt-4">
            <label htmlFor="address">Poora address</label>
            <textarea id="address" name="address" rows={3} placeholder="Building, road, landmark, pin code" required />
          </div>
        </div>

        {/* ---------------------------------------------------- step 4 */}
        <div hidden={step !== 3}>
          <StepHead
            title="Photos daaliye"
            blurb={`Zyada se zyada ${MAX_PHOTOS}. Pehli photo listing ka cover banegi. Photo na ho to bhi aage badh sakte hain.`}
          />

          <label
            className="card flex cursor-pointer flex-col items-center justify-center gap-2 border-dashed p-10 text-center"
            style={{ borderStyle: 'dashed' }}
          >
            <span className="text-[15px] font-semibold">Photos chuniye</span>
            <span className="text-[13px]" style={{ color: 'var(--basalt-soft)' }}>
              JPG, PNG ya HEIC · ek photo 12 MB tak
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => addFiles(e.target.files)}
            />
          </label>

          {previews.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {previews.map((p, i) => (
                <div key={p.name + i} className="card relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="aspect-square w-full object-cover" />
                  {i === 0 && (
                    <span
                      className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                      style={{ background: 'var(--laterite)', color: '#fff' }}
                    >
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: 'var(--surface)', color: 'var(--surface-ink)' }}
                    onClick={() => setFiles((prev) => prev.filter((_, x) => x !== i))}
                  >
                    Hatao
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- step 5 */}
        <div hidden={step !== 4}>
          <StepHead
            title="Ek baar dekh lijiye"
            blurb="Bhejne ke baad yeh admin ke paas review ke liye jayega. Approve hone par listing site par live ho jaayegi."
          />
          {step === 4 && <ReviewSummary read={readField} kind={kind} stayType={stayType} amenities={amenities} photoCount={files.length} />}
        </div>

        {error && (
          <p
            className="mt-5 rounded-lg px-4 py-3 text-[13.5px]"
            style={{ background: 'color-mix(in srgb, var(--laterite) 12%, transparent)', color: 'var(--laterite)' }}
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mt-7 flex items-center gap-3">
          {step > 0 && (
            <button type="button" className="btn btn-secondary" onClick={() => { setStep((s) => s - 1); setError(null); }}>
              Peeche
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={next}>
              Aage badhein
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? 'Bheja ja raha hai…' : 'Application bhejein'}
            </button>
          )}
          <span className="data ml-auto text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
            {step + 1} / {STEPS.length}
          </span>
        </div>
      </form>
    </div>
  );
}

function StepHead({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="mb-6">
      <h2 className="display text-[clamp(22px,3.5vw,30px)]">{title}</h2>
      <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed" style={{ color: 'var(--basalt)' }}>
        {blurb}
      </p>
    </div>
  );
}

function KindCard({ on, onClick, title, body }: { on: boolean; onClick: () => void; title: string; body: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="card card-hover p-6 text-left"
      style={on ? { borderColor: 'var(--laterite)', boxShadow: '0 0 0 2px var(--laterite)' } : undefined}
    >
      <div className="text-[17px] font-semibold">{title}</div>
      <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--basalt)' }}>
        {body}
      </p>
    </button>
  );
}

function Field({
  name,
  label,
  placeholder,
  type = 'text',
  required = false,
}: {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="field">
      <label htmlFor={name}>
        {label}
        {required && <span style={{ color: 'var(--laterite)' }}> *</span>}
      </label>
      <input id={name} name={name} type={type} placeholder={placeholder} />
    </div>
  );
}

function ReviewSummary({
  read,
  kind,
  stayType,
  amenities,
  photoCount,
}: {
  read: (n: string) => string;
  kind: Kind | null;
  stayType: string;
  amenities: string[];
  photoCount: number;
}) {
  const rows: [string, string][] = [
    ['Type', kind === 'STAY' ? STAY_TYPES.find((t) => t.value === stayType)?.label ?? 'Stay' : 'Restaurant'],
    ['Business', read('businessName')],
    ['Owner', read('ownerName')],
    ['Email', read('email')],
    ['Phone', read('phone')],
    ['City', read('city')],
    ['Area', read('area')],
    ['Address', read('address')],
    kind === 'STAY' ? ['Per night', read('price') ? `₹${read('price')}` : '—'] : ['Cost for two', read('costForTwo') ? `₹${read('costForTwo')}` : '—'],
    ['Photos', photoCount ? `${photoCount} added` : 'Koi nahi — baad mein bhi add kar sakte hain'],
  ];
  if (kind === 'STAY' && amenities.length) rows.push(['Suvidha', amenities.join(', ')]);

  return (
    <div className="card divide-y overflow-hidden">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[110px_1fr] gap-3 px-5 py-3 text-[14px]">
          <span style={{ color: 'var(--basalt-soft)' }}>{k}</span>
          <span className="break-words">{v || '—'}</span>
        </div>
      ))}
    </div>
  );
}
