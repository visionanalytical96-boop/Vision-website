'use client';

export interface HotelFilters {
  maxPrice: number;
  starRatings: number[];
  minCustomerRating: number;
  propertyTypes: string[];
  amenities: string[];
  freeCancellation: boolean;
  payAtHotel: boolean;
  coupleFriendly: boolean;
  familyFriendly: boolean;
}

export const DEFAULT_FILTERS: HotelFilters = {
  maxPrice: 20000,
  starRatings: [],
  minCustomerRating: 0,
  propertyTypes: [],
  amenities: [],
  freeCancellation: false,
  payAtHotel: false,
  coupleFriendly: false,
  familyFriendly: false,
};

const PROPERTY_TYPES = ['Hotel', 'Resort', 'Villa', 'Homestay', 'Farm Stay'];
const AMENITIES = ['Free Wi-Fi', 'Swimming Pool', 'Air Conditioning', 'Parking', 'Spa', 'Gym', 'Pet Friendly'];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FilterSidebar({
  filters,
  onChange,
}: {
  filters: HotelFilters;
  onChange: (filters: HotelFilters) => void;
}) {
  return (
    <aside className="card h-fit space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-royal-900">Filters</h3>
        <button type="button" onClick={() => onChange(DEFAULT_FILTERS)} className="text-xs font-medium text-saffron-600 hover:underline">
          Clear all
        </button>
      </div>

      <div>
        <p className="field-label">Price per night (up to)</p>
        <input
          type="range"
          min={1500}
          max={20000}
          step={500}
          value={filters.maxPrice}
          onChange={(e) => onChange({ ...filters, maxPrice: Number(e.target.value) })}
          className="w-full accent-royal-700"
        />
        <p className="text-xs text-royal-500">Up to ₹{filters.maxPrice.toLocaleString('en-IN')}</p>
      </div>

      <div>
        <p className="field-label">Star rating</p>
        <div className="flex flex-wrap gap-2">
          {[5, 4, 3].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange({ ...filters, starRatings: toggle(filters.starRatings, star) })}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                filters.starRatings.includes(star) ? 'border-royal-700 bg-royal-700 text-white' : 'border-surface-border text-royal-600'
              }`}
            >
              {star}★
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="field-label">Customer rating</p>
        <div className="flex flex-wrap gap-2">
          {[4.5, 4, 3.5, 3].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onChange({ ...filters, minCustomerRating: filters.minCustomerRating === r ? 0 : r })}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                filters.minCustomerRating === r ? 'border-royal-700 bg-royal-700 text-white' : 'border-surface-border text-royal-600'
              }`}
            >
              {r}+
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="field-label">Property type</p>
        <div className="space-y-1.5">
          {PROPERTY_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm text-royal-700">
              <input
                type="checkbox"
                checked={filters.propertyTypes.includes(type)}
                onChange={() => onChange({ ...filters, propertyTypes: toggle(filters.propertyTypes, type) })}
                className="h-4 w-4 rounded border-surface-border text-royal-700"
              />
              {type}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="field-label">Amenities</p>
        <div className="space-y-1.5">
          {AMENITIES.map((amenity) => (
            <label key={amenity} className="flex items-center gap-2 text-sm text-royal-700">
              <input
                type="checkbox"
                checked={filters.amenities.includes(amenity)}
                onChange={() => onChange({ ...filters, amenities: toggle(filters.amenities, amenity) })}
                className="h-4 w-4 rounded border-surface-border text-royal-700"
              />
              {amenity}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="field-label">Booking preferences</p>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm text-royal-700">
            <input type="checkbox" checked={filters.freeCancellation} onChange={(e) => onChange({ ...filters, freeCancellation: e.target.checked })} className="h-4 w-4 rounded border-surface-border text-royal-700" />
            Free cancellation
          </label>
          <label className="flex items-center gap-2 text-sm text-royal-700">
            <input type="checkbox" checked={filters.payAtHotel} onChange={(e) => onChange({ ...filters, payAtHotel: e.target.checked })} className="h-4 w-4 rounded border-surface-border text-royal-700" />
            Pay at hotel
          </label>
          <label className="flex items-center gap-2 text-sm text-royal-700">
            <input type="checkbox" checked={filters.coupleFriendly} onChange={(e) => onChange({ ...filters, coupleFriendly: e.target.checked })} className="h-4 w-4 rounded border-surface-border text-royal-700" />
            Couple-friendly
          </label>
          <label className="flex items-center gap-2 text-sm text-royal-700">
            <input type="checkbox" checked={filters.familyFriendly} onChange={(e) => onChange({ ...filters, familyFriendly: e.target.checked })} className="h-4 w-4 rounded border-surface-border text-royal-700" />
            Family-friendly
          </label>
        </div>
      </div>
    </aside>
  );
}
