import type { Offer } from '@/lib/types';

export const offers: Offer[] = [
  { id: 'ofr-1', title: 'Flat 25% off on Hotels', category: 'Hotels', description: 'On bookings above ₹3,000 across 4,000+ properties.', couponCode: 'STAY25', discountLabel: '25% OFF', expiryDate: '2026-08-31', image: 'royal:🏨' },
  { id: 'ofr-2', title: '₹500 off Flight Bookings', category: 'Flights', description: 'On domestic flights, minimum fare ₹4,000.', couponCode: 'FLY500', discountLabel: '₹500 OFF', expiryDate: '2026-08-15', image: 'ocean:✈️' },
  { id: 'ofr-3', title: '15% off Bus Tickets', category: 'Buses', description: 'Valid on AC Sleeper and Volvo buses.', couponCode: 'BUS15', discountLabel: '15% OFF', expiryDate: '2026-08-20', image: 'saffron:🚌' },
  { id: 'ofr-4', title: 'Weekend Stays from ₹1,999', category: 'Hotels', description: 'Handpicked resorts near you for Friday–Sunday stays.', couponCode: 'WEEKEND', discountLabel: 'From ₹1,999', expiryDate: '2026-09-30', image: 'forest:🌿' },
  { id: 'ofr-5', title: 'First Booking — 30% off', category: 'Hotels', description: 'Exclusive for new BharatStay users.', couponCode: 'WELCOME30', discountLabel: '30% OFF', expiryDate: '2026-12-31', image: 'gold:🎉' },
  { id: 'ofr-6', title: '10% Instant Discount with UPI', category: 'Bank/UPI', description: 'On all bookings paid via UPI, up to ₹750.', couponCode: 'UPI10', discountLabel: '10% OFF', expiryDate: '2026-08-31', image: 'royal:📱' },
  { id: 'ofr-7', title: 'HDFC Bank Cards — Extra 12% off', category: 'Bank/UPI', description: 'On hotel bookings paid with HDFC credit cards.', couponCode: 'HDFC12', discountLabel: '12% OFF', expiryDate: '2026-09-15', image: 'heritage:💳' },
  { id: 'ofr-8', title: 'Diwali Holiday Packages', category: 'Packages', description: 'Curated festive packages across India, starting ₹8,999.', couponCode: 'DIWALI2026', discountLabel: 'From ₹8,999', expiryDate: '2026-10-25', image: 'sunset:🪔' },
  { id: 'ofr-9', title: 'Monsoon Getaways — 20% off', category: 'Packages', description: 'Lonavala, Munnar & Coorg packages at a flat discount.', couponCode: 'MONSOON20', discountLabel: '20% OFF', expiryDate: '2026-09-10', image: 'forest:🌧️' },
  { id: 'ofr-10', title: 'Cab Rides — Flat ₹150 off', category: 'Hotels', description: 'Outstation cab bookings above ₹2,000.', couponCode: 'CAB150', discountLabel: '₹150 OFF', expiryDate: '2026-08-25', image: 'royal:🚕' },
];
