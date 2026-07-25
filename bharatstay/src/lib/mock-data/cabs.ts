import type { CabOption } from '@/lib/types';

export const cabOptions: CabOption[] = [
  { id: 'cab-1', vehicleType: 'Hatchback (Swift / i20 or similar)', image: 'royal:🚗', seatingCapacity: 4, luggageCapacity: 2, perKmRate: 12, driverAllowance: 250, category: 'Hatchback' },
  { id: 'cab-2', vehicleType: 'Sedan (Dzire / Etios or similar)', image: 'royal:🚙', seatingCapacity: 4, luggageCapacity: 3, perKmRate: 14, driverAllowance: 300, category: 'Sedan' },
  { id: 'cab-3', vehicleType: 'SUV (Ertiga / Innova or similar)', image: 'royal:🚐', seatingCapacity: 6, luggageCapacity: 4, perKmRate: 18, driverAllowance: 350, category: 'SUV' },
  { id: 'cab-4', vehicleType: 'Premium SUV (Innova Crysta or similar)', image: 'royal:🚙', seatingCapacity: 7, luggageCapacity: 5, perKmRate: 22, driverAllowance: 400, category: 'SUV' },
  { id: 'cab-5', vehicleType: 'Luxury Sedan (Camry / E-Class or similar)', image: 'gold:🚘', seatingCapacity: 4, luggageCapacity: 3, perKmRate: 35, driverAllowance: 500, category: 'Luxury' },
  { id: 'cab-6', vehicleType: 'Tempo Traveller (12-Seater)', image: 'royal:🚌', seatingCapacity: 12, luggageCapacity: 10, perKmRate: 28, driverAllowance: 500, category: 'Tempo Traveller' },
  { id: 'cab-7', vehicleType: 'Tempo Traveller (17-Seater)', image: 'royal:🚌', seatingCapacity: 17, luggageCapacity: 14, perKmRate: 34, driverAllowance: 600, category: 'Tempo Traveller' },
  { id: 'cab-8', vehicleType: 'Electric Hatchback (Tigor EV or similar)', image: 'forest:🔋', seatingCapacity: 4, luggageCapacity: 2, perKmRate: 11, driverAllowance: 250, category: 'Hatchback' },
];
