import type { DemoBooking, DemoPayment } from '@/lib/types';

export const customerBookings: DemoBooking[] = [
  { id: 'bkg-1', bookingRef: 'BST-2026-84213', type: 'Hotel', title: 'Royal Orchid Suites', subtitle: 'Goa · 2 Rooms · 3 Nights', status: 'Upcoming', date: '2026-08-14', amountPaid: 21500, totalAmount: 21500, image: 'ocean:🏨' },
  { id: 'bkg-2', bookingRef: 'BST-2026-73310', type: 'Flight', title: 'Mumbai → Delhi · 6E-204', subtitle: 'IndiGo · Economy · 1 Adult', status: 'Upcoming', date: '2026-08-02', amountPaid: 4899, totalAmount: 4899, image: 'royal:✈️' },
  { id: 'bkg-3', bookingRef: 'BST-2026-65120', type: 'Package', title: 'Kerala Backwaters', subtitle: '4N/5D · 2 Travellers', status: 'Completed', date: '2026-05-10', amountPaid: 36998, totalAmount: 36998, image: 'forest:🌴' },
  { id: 'bkg-4', bookingRef: 'BST-2026-59981', type: 'Bus', title: 'Mumbai → Goa', subtitle: 'Konkan Coastal Travels · Sleeper', status: 'Completed', date: '2026-04-22', amountPaid: 1299, totalAmount: 1299, image: 'saffron:🚌' },
  { id: 'bkg-5', bookingRef: 'BST-2026-51772', type: 'Hotel', title: 'Shimla Pinewood Hotel', subtitle: 'Shimla · 1 Room · 2 Nights', status: 'Cancelled', date: '2026-03-18', amountPaid: 0, totalAmount: 9800, image: 'mountain:🏨' },
  { id: 'bkg-6', bookingRef: 'BST-2026-84902', type: 'Cab', title: 'Airport Transfer — Delhi', subtitle: 'Sedan · Pickup 6:00 AM', status: 'Pending Payment', date: '2026-07-30', amountPaid: 0, totalAmount: 1450, image: 'royal:🚕' },
];

export const customerPayments: DemoPayment[] = [
  { id: 'pay-1', transactionId: 'TXN80234561', bookingRef: 'BST-2026-84213', method: 'UPI', status: 'Success', amount: 21500, date: '2026-07-01T10:22:00+05:30' },
  { id: 'pay-2', transactionId: 'TXN80234497', bookingRef: 'BST-2026-73310', method: 'Credit Card', status: 'Success', amount: 4899, date: '2026-06-28T18:05:00+05:30' },
  { id: 'pay-3', transactionId: 'TXN79981022', bookingRef: 'BST-2026-65120', method: 'Net Banking', status: 'Success', amount: 36998, date: '2026-04-30T09:40:00+05:30' },
  { id: 'pay-4', transactionId: 'TXN79812654', bookingRef: 'BST-2026-51772', method: 'UPI', status: 'Refunded', amount: 9800, date: '2026-03-15T14:12:00+05:30' },
  { id: 'pay-5', transactionId: 'TXN80299871', bookingRef: 'BST-2026-84902', method: 'Wallet', status: 'Pending', amount: 1450, date: '2026-07-24T21:00:00+05:30' },
];

export interface PartnerBookingRow {
  id: string;
  bookingRef: string;
  guestName: string;
  property: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  status: 'Confirmed' | 'Checked In' | 'Checked Out' | 'Cancelled';
  amount: number;
}

export const partnerBookings: PartnerBookingRow[] = [
  { id: 'pb-1', bookingRef: 'BST-2026-84213', guestName: 'Ananya Sharma', property: 'Royal Orchid Suites', roomType: 'Deluxe Sea View', checkIn: '2026-08-14', checkOut: '2026-08-17', status: 'Confirmed', amount: 21500 },
  { id: 'pb-2', bookingRef: 'BST-2026-84009', guestName: 'Rohan Mehta', property: 'Royal Orchid Suites', roomType: 'Deluxe Sea View', checkIn: '2026-07-20', checkOut: '2026-07-22', status: 'Checked Out', amount: 14300 },
  { id: 'pb-3', bookingRef: 'BST-2026-83920', guestName: 'Priya Nair', property: 'Royal Orchid Suites', roomType: 'Sea View Suite', checkIn: '2026-07-26', checkOut: '2026-07-29', status: 'Checked In', amount: 25800 },
  { id: 'pb-4', bookingRef: 'BST-2026-83651', guestName: 'Vikram Rathore', property: 'Royal Orchid Suites', roomType: 'Deluxe Sea View', checkIn: '2026-06-05', checkOut: '2026-06-06', status: 'Cancelled', amount: 7200 },
];

export interface AdminPropertyRow {
  id: string;
  name: string;
  partner: string;
  city: string;
  type: string;
  submittedOn: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export const adminPropertyQueue: AdminPropertyRow[] = [
  { id: 'ap-1', name: 'Coastal Breeze Villas', partner: 'Sunrise Hospitality Pvt Ltd', city: 'Alibaug', type: 'Villa', submittedOn: '2026-07-20', status: 'Pending' },
  { id: 'ap-2', name: 'Blue Mountain Homestay', partner: 'Himalayan Retreats', city: 'Kasol', type: 'Homestay', submittedOn: '2026-07-18', status: 'Pending' },
  { id: 'ap-3', name: 'Emerald Farms Resort', partner: 'Greenfield Estates', city: 'Coorg', type: 'Farm Stay', submittedOn: '2026-07-15', status: 'Approved' },
  { id: 'ap-4', name: 'Desert Rose Camp', partner: 'Rajasthan Getaways', city: 'Jaisalmer', type: 'Resort', submittedOn: '2026-07-10', status: 'Rejected' },
];

export interface AdminPaymentProofRow {
  id: string;
  bookingRef: string;
  customerName: string;
  bankName: string;
  referenceNumber: string;
  amount: number;
  submittedOn: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export const adminPaymentProofs: AdminPaymentProofRow[] = [
  { id: 'pp-1', bookingRef: 'BST-2026-84902', customerName: 'Karan Malhotra', bankName: 'HDFC Bank', referenceNumber: 'REF9928134', amount: 1450, submittedOn: '2026-07-24', status: 'Pending' },
  { id: 'pp-2', bookingRef: 'BST-2026-84781', customerName: 'Meera Iyer', bankName: 'ICICI Bank', referenceNumber: 'REF9911872', amount: 8200, submittedOn: '2026-07-22', status: 'Pending' },
  { id: 'pp-3', bookingRef: 'BST-2026-84650', customerName: 'Arjun Singh', bankName: 'SBI', referenceNumber: 'REF9902341', amount: 3600, submittedOn: '2026-07-19', status: 'Approved' },
];

export interface AdminRefundRow {
  id: string;
  bookingRef: string;
  customerName: string;
  reason: string;
  amount: number;
  requestedOn: string;
  status: 'Requested' | 'Under Review' | 'Approved' | 'Refund Initiated' | 'Completed' | 'Rejected';
}

export const adminRefundQueue: AdminRefundRow[] = [
  { id: 'rf-1', bookingRef: 'BST-2026-51772', customerName: 'Ananya Sharma', reason: 'Change of travel plans', amount: 9800, requestedOn: '2026-03-14', status: 'Completed' },
  { id: 'rf-2', bookingRef: 'BST-2026-84470', customerName: 'Sneha Kulkarni', reason: 'Hotel overbooked by property', amount: 12400, requestedOn: '2026-07-21', status: 'Under Review' },
  { id: 'rf-3', bookingRef: 'BST-2026-84512', customerName: 'Vikram Rathore', reason: 'Flight rescheduled by airline', amount: 6299, requestedOn: '2026-07-23', status: 'Requested' },
];

export interface AdminAnalytics {
  totalBookings: number;
  totalRevenue: number;
  netProfit: number;
  pendingPayments: number;
  pendingRefunds: number;
  cancellationRate: number;
  conversionRate: number;
  topDestinations: { name: string; bookings: number }[];
}

export const adminAnalytics: AdminAnalytics = {
  totalBookings: 18420,
  totalRevenue: 284500000,
  netProfit: 41200000,
  pendingPayments: 128000,
  pendingRefunds: 96400,
  cancellationRate: 6.2,
  conversionRate: 3.8,
  topDestinations: [
    { name: 'Goa', bookings: 3120 },
    { name: 'Manali', bookings: 2210 },
    { name: 'Jaipur', bookings: 1980 },
    { name: 'Kerala', bookings: 1750 },
    { name: 'Udaipur', bookings: 1340 },
  ],
};
