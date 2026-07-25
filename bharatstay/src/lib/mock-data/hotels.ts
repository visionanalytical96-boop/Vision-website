import type { Hotel, PropertyType } from '@/lib/types';

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

interface HotelSeed {
  name: string;
  type: PropertyType;
  city: string;
  state: string;
  starRating: number;
  basePrice: number;
  image: string;
  amenities: string[];
  roomType: string;
  mealPlan: string;
}

const AMENITY_POOL = ['Free Wi-Fi', 'Swimming Pool', 'Air Conditioning', 'Parking', 'Restaurant', 'Spa', 'Gym', 'Room Service', 'Power Backup', 'Pet Friendly'];

function buildHotel(seed: HotelSeed, index: number): Hotel {
  const discountPercent = 10 + ((index * 7) % 35);
  const finalPrice = Math.round(seed.basePrice * (1 - discountPercent / 100));
  const taxesAndFees = Math.round(finalPrice * 0.12);

  return {
    id: nextId('htl'),
    name: seed.name,
    type: seed.type,
    city: seed.city,
    state: seed.state,
    address: `${seed.name}, ${seed.city}, ${seed.state}`,
    starRating: seed.starRating,
    customerRating: Number((3.7 + ((index * 3) % 13) / 10).toFixed(1)),
    reviewCount: 40 + ((index * 37) % 900),
    images: [seed.image, seed.image, seed.image],
    amenities: [seed.amenities[0], seed.amenities[1], seed.amenities[2], AMENITY_POOL[index % AMENITY_POOL.length]].filter(
      (a): a is string => Boolean(a),
    ),
    mealPlan: seed.mealPlan,
    roomType: seed.roomType,
    originalPrice: seed.basePrice,
    discountPercent,
    finalPrice,
    taxesAndFees,
    freeCancellation: index % 3 !== 0,
    payAtHotel: index % 4 === 0,
    distanceFromCentreKm: Number((0.8 + ((index * 1.3) % 12)).toFixed(1)),
    isVerified: true,
    isCoupleFriendly: index % 2 === 0,
    isFamilyFriendly: index % 3 !== 1,
    description: `${seed.name} is a ${seed.starRating}-star ${seed.type.toLowerCase()} in ${seed.city}, offering ${seed.mealPlan.toLowerCase()} stays with easy access to the city's top attractions.`,
    nearbyAttractions: [
      { name: `${seed.city} City Centre`, distanceKm: Number((1 + (index % 5)).toFixed(1)) },
      { name: `${seed.city} Local Market`, distanceKm: Number((0.5 + (index % 3)).toFixed(1)) },
    ],
    policies: {
      checkIn: '2:00 PM',
      checkOut: '11:00 AM',
      childPolicy: 'Children of all ages are welcome. Kids below 5 stay free using existing bedding.',
      extraBedCharge: '₹1,200 per night per extra bed',
      couplePolicy: index % 2 === 0 ? 'Unmarried couples are welcome with valid photo ID.' : 'Local ID proof required at check-in for all guests.',
    },
  };
}

const hotelSeeds: HotelSeed[] = [
  { name: 'Royal Orchid Suites', type: 'Hotel', city: 'Goa', state: 'Goa', starRating: 5, basePrice: 8500, image: 'ocean:🏨', amenities: ['Free Wi-Fi', 'Swimming Pool', 'Spa'], roomType: 'Deluxe Sea View', mealPlan: 'Breakfast Included' },
  { name: 'Taj Heritage Palace', type: 'Hotel', city: 'Jaipur', state: 'Rajasthan', starRating: 5, basePrice: 9200, image: 'heritage:🏨', amenities: ['Free Wi-Fi', 'Restaurant', 'Spa'], roomType: 'Heritage Room', mealPlan: 'Breakfast & Dinner' },
  { name: 'BharatStay Grand Central', type: 'Hotel', city: 'Mumbai', state: 'Maharashtra', starRating: 4, basePrice: 6800, image: 'royal:🏨', amenities: ['Free Wi-Fi', 'Gym', 'Restaurant'], roomType: 'Executive Room', mealPlan: 'Breakfast Included' },
  { name: 'Lakeview Residency', type: 'Hotel', city: 'Udaipur', state: 'Rajasthan', starRating: 4, basePrice: 5400, image: 'lake:🏨', amenities: ['Free Wi-Fi', 'Restaurant', 'Room Service'], roomType: 'Lake Facing Room', mealPlan: 'Breakfast Included' },
  { name: 'Capital Inn Delhi', type: 'Hotel', city: 'Delhi', state: 'Delhi', starRating: 3, basePrice: 3200, image: 'royal:🏨', amenities: ['Free Wi-Fi', 'Air Conditioning', 'Parking'], roomType: 'Standard Room', mealPlan: 'Room Only' },
  { name: 'Shimla Pinewood Hotel', type: 'Hotel', city: 'Shimla', state: 'Himachal Pradesh', starRating: 4, basePrice: 4900, image: 'mountain:🏨', amenities: ['Free Wi-Fi', 'Restaurant', 'Room Service'], roomType: 'Mountain View Room', mealPlan: 'Breakfast Included' },
  { name: 'Manali Snow Crest', type: 'Hotel', city: 'Manali', state: 'Himachal Pradesh', starRating: 4, basePrice: 5100, image: 'snow:🏨', amenities: ['Free Wi-Fi', 'Restaurant', 'Parking'], roomType: 'Valley View Room', mealPlan: 'Breakfast Included' },
  { name: 'Kashmir Dal View Hotel', type: 'Hotel', city: 'Srinagar', state: 'Jammu & Kashmir', starRating: 5, basePrice: 7600, image: 'snow:🏨', amenities: ['Free Wi-Fi', 'Restaurant', 'Spa'], roomType: 'Premium Lake View', mealPlan: 'All Meals Included' },
  { name: 'Agra Taj Gateway', type: 'Hotel', city: 'Agra', state: 'Uttar Pradesh', starRating: 4, basePrice: 4700, image: 'gold:🏨', amenities: ['Free Wi-Fi', 'Restaurant', 'Air Conditioning'], roomType: 'Taj View Room', mealPlan: 'Breakfast Included' },
  { name: 'Kerala Backwater Suites', type: 'Hotel', city: 'Alleppey', state: 'Kerala', starRating: 4, basePrice: 6200, image: 'forest:🏨', amenities: ['Free Wi-Fi', 'Swimming Pool', 'Restaurant'], roomType: 'Backwater View Suite', mealPlan: 'Breakfast Included' },
  { name: 'Andaman Coral Bay Hotel', type: 'Hotel', city: 'Port Blair', state: 'Andaman & Nicobar', starRating: 4, basePrice: 7100, image: 'ocean:🏨', amenities: ['Free Wi-Fi', 'Swimming Pool', 'Restaurant'], roomType: 'Sea Facing Room', mealPlan: 'Breakfast Included' },
  { name: 'Ladakh Highland Inn', type: 'Hotel', city: 'Leh', state: 'Ladakh', starRating: 3, basePrice: 3800, image: 'mountain:🏨', amenities: ['Free Wi-Fi', 'Restaurant', 'Power Backup'], roomType: 'Mountain Room', mealPlan: 'Breakfast Included' },
  { name: 'Rishikesh Ganga Retreat', type: 'Hotel', city: 'Rishikesh', state: 'Uttarakhand', starRating: 3, basePrice: 3100, image: 'forest:🏨', amenities: ['Free Wi-Fi', 'Restaurant', 'Parking'], roomType: 'River View Room', mealPlan: 'Breakfast Included' },
  { name: 'Lonavala Hillcrest Hotel', type: 'Hotel', city: 'Lonavala', state: 'Maharashtra', starRating: 3, basePrice: 3600, image: 'forest:🏨', amenities: ['Free Wi-Fi', 'Swimming Pool', 'Parking'], roomType: 'Deluxe Room', mealPlan: 'Breakfast Included' },
  { name: 'Mahabaleshwar Valley Hotel', type: 'Hotel', city: 'Mahabaleshwar', state: 'Maharashtra', starRating: 3, basePrice: 3300, image: 'forest:🏨', amenities: ['Free Wi-Fi', 'Restaurant', 'Parking'], roomType: 'Valley View Room', mealPlan: 'Breakfast Included' },
  { name: 'BharatStay Business Suites', type: 'Hotel', city: 'Bengaluru', state: 'Karnataka', starRating: 4, basePrice: 5600, image: 'royal:🏨', amenities: ['Free Wi-Fi', 'Gym', 'Restaurant'], roomType: 'Business Room', mealPlan: 'Breakfast Included' },
  { name: 'Chennai Marina Hotel', type: 'Hotel', city: 'Chennai', state: 'Tamil Nadu', starRating: 4, basePrice: 4800, image: 'ocean:🏨', amenities: ['Free Wi-Fi', 'Restaurant', 'Air Conditioning'], roomType: 'Sea View Room', mealPlan: 'Breakfast Included' },
  { name: 'Kolkata Heritage Grand', type: 'Hotel', city: 'Kolkata', state: 'West Bengal', starRating: 4, basePrice: 4400, image: 'heritage:🏨', amenities: ['Free Wi-Fi', 'Restaurant', 'Room Service'], roomType: 'Heritage Room', mealPlan: 'Breakfast Included' },
  { name: 'Hyderabad Pearl Residency', type: 'Hotel', city: 'Hyderabad', state: 'Telangana', starRating: 3, basePrice: 3400, image: 'royal:🏨', amenities: ['Free Wi-Fi', 'Air Conditioning', 'Parking'], roomType: 'Standard Room', mealPlan: 'Room Only' },
  { name: 'Pune Cityscape Hotel', type: 'Hotel', city: 'Pune', state: 'Maharashtra', starRating: 3, basePrice: 3000, image: 'royal:🏨', amenities: ['Free Wi-Fi', 'Gym', 'Parking'], roomType: 'Standard Room', mealPlan: 'Breakfast Included' },
];

const resortSeeds: HotelSeed[] = [
  { name: 'Palm Grove Beach Resort', type: 'Resort', city: 'Goa', state: 'Goa', starRating: 5, basePrice: 11500, image: 'ocean:🏝️', amenities: ['Swimming Pool', 'Spa', 'Restaurant'], roomType: 'Beach Villa', mealPlan: 'All Meals Included' },
  { name: 'Kerala Coconut Lagoon Resort', type: 'Resort', city: 'Kumarakom', state: 'Kerala', starRating: 5, basePrice: 13200, image: 'forest:🏝️', amenities: ['Swimming Pool', 'Spa', 'Restaurant'], roomType: 'Lagoon Cottage', mealPlan: 'All Meals Included' },
  { name: 'Manali Pine Valley Resort', type: 'Resort', city: 'Manali', state: 'Himachal Pradesh', starRating: 4, basePrice: 7800, image: 'snow:🏝️', amenities: ['Restaurant', 'Room Service', 'Parking'], roomType: 'Cottage Room', mealPlan: 'Breakfast & Dinner' },
  { name: 'Rishikesh Riverside Resort', type: 'Resort', city: 'Rishikesh', state: 'Uttarakhand', starRating: 4, basePrice: 6900, image: 'forest:🏝️', amenities: ['Swimming Pool', 'Restaurant', 'Spa'], roomType: 'River View Cottage', mealPlan: 'Breakfast Included' },
  { name: 'Lonavala Hilltop Resort', type: 'Resort', city: 'Lonavala', state: 'Maharashtra', starRating: 4, basePrice: 8100, image: 'forest:🏝️', amenities: ['Swimming Pool', 'Restaurant', 'Parking'], roomType: 'Hill View Room', mealPlan: 'All Meals Included' },
  { name: 'Andaman Blue Water Resort', type: 'Resort', city: 'Havelock Island', state: 'Andaman & Nicobar', starRating: 5, basePrice: 15400, image: 'ocean:🏝️', amenities: ['Swimming Pool', 'Spa', 'Restaurant'], roomType: 'Beachfront Villa', mealPlan: 'All Meals Included' },
  { name: 'Udaipur Lake Palace Resort', type: 'Resort', city: 'Udaipur', state: 'Rajasthan', starRating: 5, basePrice: 14800, image: 'lake:🏝️', amenities: ['Swimming Pool', 'Spa', 'Restaurant'], roomType: 'Royal Lake Villa', mealPlan: 'All Meals Included' },
  { name: 'Mahabaleshwar Strawberry Resort', type: 'Resort', city: 'Mahabaleshwar', state: 'Maharashtra', starRating: 4, basePrice: 6700, image: 'forest:🏝️', amenities: ['Swimming Pool', 'Restaurant', 'Parking'], roomType: 'Garden Cottage', mealPlan: 'Breakfast & Dinner' },
  { name: 'Coorg Misty Hills Resort', type: 'Resort', city: 'Coorg', state: 'Karnataka', starRating: 4, basePrice: 7400, image: 'forest:🏝️', amenities: ['Swimming Pool', 'Spa', 'Restaurant'], roomType: 'Plantation View Cottage', mealPlan: 'All Meals Included' },
  { name: 'Alibaug Seaside Resort', type: 'Resort', city: 'Alibaug', state: 'Maharashtra', starRating: 4, basePrice: 9600, image: 'ocean:🏝️', amenities: ['Swimming Pool', 'Restaurant', 'Spa'], roomType: 'Sea View Suite', mealPlan: 'Breakfast Included' },
];

const farmStaySeeds: HotelSeed[] = [
  { name: 'Green Valley Organic Farm Stay', type: 'Farm Stay', city: 'Lonavala', state: 'Maharashtra', starRating: 3, basePrice: 4200, image: 'farm:🌾', amenities: ['Restaurant', 'Parking', 'Pet Friendly'], roomType: 'Farmhouse Room', mealPlan: 'All Meals Included' },
  { name: 'Wayanad Spice Farm Retreat', type: 'Farm Stay', city: 'Wayanad', state: 'Kerala', starRating: 3, basePrice: 4800, image: 'farm:🌾', amenities: ['Restaurant', 'Room Service', 'Pet Friendly'], roomType: 'Plantation Cottage', mealPlan: 'All Meals Included' },
  { name: 'Nashik Vineyard Farm Stay', type: 'Farm Stay', city: 'Nashik', state: 'Maharashtra', starRating: 3, basePrice: 4500, image: 'farm:🍇', amenities: ['Restaurant', 'Parking', 'Air Conditioning'], roomType: 'Vineyard View Room', mealPlan: 'Breakfast Included' },
  { name: 'Coorg Coffee Estate Stay', type: 'Farm Stay', city: 'Coorg', state: 'Karnataka', starRating: 3, basePrice: 4300, image: 'farm:☕', amenities: ['Restaurant', 'Parking', 'Pet Friendly'], roomType: 'Estate Bungalow', mealPlan: 'All Meals Included' },
  { name: 'Mahabaleshwar Strawberry Farm Stay', type: 'Farm Stay', city: 'Mahabaleshwar', state: 'Maharashtra', starRating: 3, basePrice: 3900, image: 'farm:🍓', amenities: ['Restaurant', 'Parking', 'Room Service'], roomType: 'Farm Cottage', mealPlan: 'Breakfast Included' },
  { name: 'Pune Countryside Farm Stay', type: 'Farm Stay', city: 'Pune', state: 'Maharashtra', starRating: 3, basePrice: 3600, image: 'farm:🌾', amenities: ['Restaurant', 'Parking', 'Pet Friendly'], roomType: 'Farmhouse Room', mealPlan: 'All Meals Included' },
  { name: 'Kodaikanal Organic Farm Stay', type: 'Farm Stay', city: 'Kodaikanal', state: 'Tamil Nadu', starRating: 3, basePrice: 4100, image: 'farm:🌾', amenities: ['Restaurant', 'Room Service', 'Parking'], roomType: 'Hill Farm Cottage', mealPlan: 'Breakfast Included' },
  { name: 'Munnar Tea Estate Farm Stay', type: 'Farm Stay', city: 'Munnar', state: 'Kerala', starRating: 3, basePrice: 4600, image: 'farm:🍃', amenities: ['Restaurant', 'Parking', 'Room Service'], roomType: 'Tea Estate Cottage', mealPlan: 'All Meals Included' },
  { name: 'Rishikesh Riverside Farm Stay', type: 'Farm Stay', city: 'Rishikesh', state: 'Uttarakhand', starRating: 3, basePrice: 3800, image: 'farm:🌾', amenities: ['Restaurant', 'Pet Friendly', 'Parking'], roomType: 'Riverside Farm Room', mealPlan: 'Breakfast Included' },
  { name: 'Panchgani Orchard Farm Stay', type: 'Farm Stay', city: 'Panchgani', state: 'Maharashtra', starRating: 3, basePrice: 3700, image: 'farm:🍎', amenities: ['Restaurant', 'Parking', 'Room Service'], roomType: 'Orchard View Room', mealPlan: 'All Meals Included' },
];

const homestaySeeds: HotelSeed[] = [
  { name: 'Fontainhas Heritage Homestay', type: 'Homestay', city: 'Goa', state: 'Goa', starRating: 3, basePrice: 3200, image: 'heritage:🏡', amenities: ['Free Wi-Fi', 'Room Service', 'Pet Friendly'], roomType: 'Heritage Room', mealPlan: 'Breakfast Included' },
  { name: 'Munnar Hilltop Homestay', type: 'Homestay', city: 'Munnar', state: 'Kerala', starRating: 3, basePrice: 3400, image: 'forest:🏡', amenities: ['Free Wi-Fi', 'Restaurant', 'Parking'], roomType: 'Family Room', mealPlan: 'All Meals Included' },
  { name: 'Jaipur Old City Homestay', type: 'Homestay', city: 'Jaipur', state: 'Rajasthan', starRating: 3, basePrice: 2800, image: 'desert:🏡', amenities: ['Free Wi-Fi', 'Room Service', 'Air Conditioning'], roomType: 'Traditional Room', mealPlan: 'Breakfast Included' },
  { name: 'Manali Apple Orchard Homestay', type: 'Homestay', city: 'Manali', state: 'Himachal Pradesh', starRating: 3, basePrice: 3100, image: 'snow:🏡', amenities: ['Free Wi-Fi', 'Restaurant', 'Parking'], roomType: 'Orchard Room', mealPlan: 'Breakfast Included' },
  { name: 'Coorg Homestay Bliss', type: 'Homestay', city: 'Coorg', state: 'Karnataka', starRating: 3, basePrice: 3300, image: 'forest:🏡', amenities: ['Free Wi-Fi', 'Restaurant', 'Pet Friendly'], roomType: 'Garden Room', mealPlan: 'All Meals Included' },
  { name: 'Varanasi Ghat View Homestay', type: 'Homestay', city: 'Varanasi', state: 'Uttar Pradesh', starRating: 3, basePrice: 2600, image: 'heritage:🏡', amenities: ['Free Wi-Fi', 'Room Service', 'Air Conditioning'], roomType: 'Ghat View Room', mealPlan: 'Breakfast Included' },
  { name: 'Udaipur Lakeside Homestay', type: 'Homestay', city: 'Udaipur', state: 'Rajasthan', starRating: 3, basePrice: 3000, image: 'lake:🏡', amenities: ['Free Wi-Fi', 'Restaurant', 'Room Service'], roomType: 'Lake View Room', mealPlan: 'Breakfast Included' },
  { name: 'Darjeeling Tea Garden Homestay', type: 'Homestay', city: 'Darjeeling', state: 'West Bengal', starRating: 3, basePrice: 2900, image: 'forest:🏡', amenities: ['Free Wi-Fi', 'Restaurant', 'Parking'], roomType: 'Garden View Room', mealPlan: 'All Meals Included' },
  { name: 'Pondicherry French Quarter Homestay', type: 'Homestay', city: 'Pondicherry', state: 'Puducherry', starRating: 3, basePrice: 3500, image: 'heritage:🏡', amenities: ['Free Wi-Fi', 'Air Conditioning', 'Room Service'], roomType: 'French Quarter Room', mealPlan: 'Breakfast Included' },
  { name: 'Shillong Hillside Homestay', type: 'Homestay', city: 'Shillong', state: 'Meghalaya', starRating: 3, basePrice: 2700, image: 'forest:🏡', amenities: ['Free Wi-Fi', 'Restaurant', 'Parking'], roomType: 'Hillside Room', mealPlan: 'Breakfast Included' },
];

export const hotels: Hotel[] = [
  ...hotelSeeds.map(buildHotel),
  ...resortSeeds.map(buildHotel),
  ...farmStaySeeds.map(buildHotel),
  ...homestaySeeds.map(buildHotel),
];

export const hotelById = (id: string): Hotel | undefined => hotels.find((h) => h.id === id);
