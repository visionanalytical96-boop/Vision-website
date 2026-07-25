// Shared domain types used across mock data and UI components.
// Prices are stored in whole rupees here (demo data), not paise — see prisma/schema.prisma
// for the paise-based storage convention intended for the real data layer.

export type PropertyType =
  | 'Hotel'
  | 'Resort'
  | 'Villa'
  | 'Homestay'
  | 'Farm Stay'
  | 'Beach Stay'
  | 'Mountain Stay'
  | 'Heritage'
  | 'Budget'
  | 'Luxury';

export interface Hotel {
  id: string;
  name: string;
  type: PropertyType;
  city: string;
  state: string;
  address: string;
  starRating: number;
  customerRating: number;
  reviewCount: number;
  images: string[];
  amenities: string[];
  mealPlan: string;
  roomType: string;
  originalPrice: number;
  discountPercent: number;
  finalPrice: number;
  taxesAndFees: number;
  freeCancellation: boolean;
  payAtHotel: boolean;
  distanceFromCentreKm: number;
  isVerified: boolean;
  isCoupleFriendly: boolean;
  isFamilyFriendly: boolean;
  description: string;
  nearbyAttractions: { name: string; distanceKm: number }[];
  policies: {
    checkIn: string;
    checkOut: string;
    childPolicy: string;
    extraBedCharge: string;
    couplePolicy: string;
  };
}

export interface Destination {
  id: string;
  name: string;
  state: string;
  image: string;
  startingPrice: number;
  hotelCount: number;
  description: string;
}

export interface Offer {
  id: string;
  title: string;
  category: 'Hotels' | 'Flights' | 'Buses' | 'Packages' | 'Bank/UPI';
  description: string;
  couponCode: string;
  discountLabel: string;
  expiryDate: string;
  image: string;
}

export interface HolidayPackage {
  id: string;
  title: string;
  destination: string;
  image: string;
  nights: number;
  days: number;
  hotelCategory: string;
  mealPlan: string;
  transport: string;
  sightseeing: string[];
  pricePerPerson: number;
}

export interface Review {
  id: string;
  customerName: string;
  location: string;
  rating: number;
  bookingType: string;
  review: string;
  photo: string;
  isVerified: boolean;
}

export interface Flight {
  id: string;
  airline: string;
  airlineLogo: string;
  flightNumber: string;
  fromCity: string;
  fromCode: string;
  toCity: string;
  toCode: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
  cabinClass: string;
  refundable: boolean;
  baggageKg: number;
  cabinBaggageKg: number;
  price: number;
}

export interface BusRoute {
  id: string;
  operator: string;
  fromCity: string;
  toCity: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  busType: string;
  isAc: boolean;
  seatType: string;
  amenities: string[];
  rating: number;
  seatsAvailable: number;
  price: number;
}

export interface CabOption {
  id: string;
  vehicleType: string;
  image: string;
  seatingCapacity: number;
  luggageCapacity: number;
  perKmRate: number;
  driverAllowance: number;
  category: 'Hatchback' | 'Sedan' | 'SUV' | 'Luxury' | 'Tempo Traveller';
}

export type BookingType = 'Hotel' | 'Flight' | 'Bus' | 'Cab' | 'Package' | 'Activity';
export type BookingStatus = 'Upcoming' | 'Completed' | 'Cancelled' | 'Pending Payment';

export interface DemoBooking {
  id: string;
  bookingRef: string;
  type: BookingType;
  title: string;
  subtitle: string;
  status: BookingStatus;
  date: string;
  amountPaid: number;
  totalAmount: number;
  image: string;
}

export interface DemoPayment {
  id: string;
  transactionId: string;
  bookingRef: string;
  method: string;
  status: 'Success' | 'Pending' | 'Failed' | 'Refunded';
  amount: number;
  date: string;
}
