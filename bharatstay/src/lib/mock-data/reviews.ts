import type { Review } from '@/lib/types';

export const reviews: Review[] = [
  { id: 'rev-1', customerName: 'Ananya Sharma', location: 'Delhi', rating: 5, bookingType: 'Hotel Booking', review: 'Seamless booking experience and the hotel in Udaipur was exactly as shown. Check-in was instant with the digital voucher.', photo: 'royal:👩', isVerified: true },
  { id: 'rev-2', customerName: 'Rohan Mehta', location: 'Mumbai', rating: 4, bookingType: 'Flight Booking', review: 'Got a great fare on my Mumbai–Goa flight and the e-ticket + reminders were super convenient.', photo: 'ocean:👨', isVerified: true },
  { id: 'rev-3', customerName: 'Priya Nair', location: 'Kochi', rating: 5, bookingType: 'Package Booking', review: 'The Kerala backwaters package was perfectly planned — houseboat, transfers, everything on time.', photo: 'forest:👩', isVerified: true },
  { id: 'rev-4', customerName: 'Arjun Singh', location: 'Jaipur', rating: 5, bookingType: 'Bus Booking', review: 'Comfortable AC sleeper bus, live tracking worked well and boarding point was accurate.', photo: 'saffron:👨', isVerified: true },
  { id: 'rev-5', customerName: 'Sneha Kulkarni', location: 'Pune', rating: 4, bookingType: 'Cab Booking', review: 'Booked an outstation cab to Lonavala — driver was on time and the fare matched the quote exactly.', photo: 'royal:👩', isVerified: true },
  { id: 'rev-6', customerName: 'Vikram Rathore', location: 'Ahmedabad', rating: 5, bookingType: 'Hotel Booking', review: 'Free cancellation saved me when my plans changed. Refund was processed within 3 days.', photo: 'heritage:👨', isVerified: true },
  { id: 'rev-7', customerName: 'Meera Iyer', location: 'Bengaluru', rating: 4, bookingType: 'Homestay Booking', review: 'Loved the Coorg homestay we found here — cozy, verified, and great value for a family trip.', photo: 'forest:👩', isVerified: true },
  { id: 'rev-8', customerName: 'Karan Malhotra', location: 'Chandigarh', rating: 5, bookingType: 'Package Booking', review: 'The Manali snow package was hassle-free end to end — from booking to the printed itinerary voucher.', photo: 'snow:👨', isVerified: true },
];
