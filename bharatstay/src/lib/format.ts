export const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

/**
 * Outbound Google Maps links. We deliberately link out rather than embedding a
 * map or listing a phone number: the address is verifiable, an invented number
 * would send real calls to whoever owns it.
 */
export const mapSearchUrl = (query: string) =>
  'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${query}, Maharashtra, India`);

export const mapDirectionsUrl = (query: string) =>
  'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(`${query}, Maharashtra, India`);

export const STAY_TYPE_LABEL: Record<string, string> = {
  HOTEL: 'Hotel',
  RESORT: 'Resort',
  VILLA: 'Villa',
  HOMESTAY: 'Homestay',
  FARM_STAY: 'Farmhouse',
};

export const stayTypeLabel = (t: string) => STAY_TYPE_LABEL[t] ?? t;

export const nightsBetween = (from: Date, to: Date) =>
  Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
